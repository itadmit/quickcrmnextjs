import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createInvoice4UClearingClient,
  ClearingType,
  CreditCardCompanyType,
  ClearingRequest,
} from '@/lib/invoice4u-clearing';

/**
 * POST - ביצוע תשלום דרך Invoice4U Clearing
 * 
 * מחזיר URL ל-clearing iframe
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId, // ID של הלקוח במערכת CRM שלנו
      quoteId, // ID של הצעת המחיר (אופציונלי)
      amount, // סכום התשלום
      description, // תיאור
      paymentType = 'regular', // 'regular' | 'tokenize' | 'charge_with_token' | 'standing_order'
      returnUrl, // URL להחזרה אחרי התשלום
      customerId, // ID הלקוח ב-Invoice4U (אם קיים)
      isAutoCreateCustomer = true, // יצירת לקוח אוטומטית
      createDocument = false, // יצירת מסמך עם התשלום
      documentHeadline, // כותרת המסמך
      standingOrderDuration, // מספר חודשים לתשלומים חוזרים
      standingOrderCallbackUrl, // URL ל-callback
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'נדרש סכום תשלום תקין' },
        { status: 400 }
      );
    }

    // קבלת פרטי האינטגרציה
    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
    });

    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Invoice4U Clearing integration not configured' },
        { status: 400 }
      );
    }

    const config = (integration.config as any) || {};
    const clearingApiKey = config.clearingApiKey;
    const clearingEmail = config.clearingEmail || integration.apiKey;
    const clearingPassword = config.clearingPassword || integration.apiSecret;
    const useProduction = config.clearingUseProduction || config.useProduction || false;

    if (!clearingApiKey && (!clearingEmail || !clearingPassword)) {
      return NextResponse.json(
        { error: 'Invoice4U Clearing credentials missing' },
        { status: 400 }
      );
    }

    // קבלת פרטי הלקוח
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';
    let finalClientId = clientId;

    // אם אין clientId אבל יש quoteId, ננסה לקבל את הלקוח מההצעה
    if (!finalClientId && quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId, companyId: session.user.companyId },
        include: {
          lead: {
            include: {
              client: true,
            },
          },
        },
      });

      if (quote?.lead?.clientId) {
        finalClientId = quote.lead.clientId;
      } else if (quote?.lead) {
        // אם יש lead אבל אין client, נשתמש בפרטי ה-lead
        customerName = quote.lead.name || '';
        customerEmail = quote.lead.email || '';
        customerPhone = quote.lead.phone || '';
      }
    }

    if (finalClientId) {
      const client = await prisma.client.findUnique({
        where: { id: finalClientId, companyId: session.user.companyId },
      });

      if (client) {
        customerName = client.name;
        customerEmail = client.email || '';
        customerPhone = client.phone || '';
      }
    }

    const finalCustomerName = customerName || body.fullName || '';
    const finalCustomerEmail = customerEmail || body.email || '';
    const finalCustomerPhone = customerPhone || body.phone || '';

    if (!finalCustomerName) {
      return NextResponse.json(
        { error: 'נדרש שם לקוח (clientId או fullName)' },
        { status: 400 }
      );
    }

    if (!finalCustomerEmail) {
      return NextResponse.json(
        { error: 'נדרש אימייל לקוח (clientId או email)' },
        { status: 400 }
      );
    }

    if (!finalCustomerPhone) {
      return NextResponse.json(
        { error: 'נדרש מספר טלפון לקוח (clientId או phone)' },
        { status: 400 }
      );
    }

    // הכנת בקשת Clearing
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'נדרש סכום תשלום תקין (מספר חיובי)' },
        { status: 400 }
      );
    }

    console.log('Creating clearing request:', {
      amount: amountNum,
      amountType: typeof amountNum,
      customerName: finalCustomerName,
      customerEmail: finalCustomerEmail,
      customerPhone: finalCustomerPhone,
      quoteId,
      clientId: finalClientId,
    });

    const clearingRequest: ClearingRequest = {
      Type: ClearingType.Regular,
      FullName: finalCustomerName,
      Phone: finalCustomerPhone,
      Email: finalCustomerEmail,
      Sum: amountNum,
      Description: description || `תשלום עבור ${finalCustomerName}`,
      Currency: 'ILS',
      OrderIdClientUsage: quoteId || body.orderId || `ORDER_${Date.now()}`,
      IsAutoCreateCustomer: isAutoCreateCustomer,
      CustomerId: customerId || undefined,
      ReturnUrl: returnUrl || (quoteId 
        ? `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/invoice4u/clearing/callback?quoteId=${quoteId}`
        : `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/quotes`),
      IsGeneralClient: false,
    };

    // יצירת מסמך עם התשלום (אופציונלי)
    if (createDocument) {
      clearingRequest.IsDocCreate = true;
      clearingRequest.DocHeadline = documentHeadline || description || 'תשלום';
    }

    // טיפול בסוגי תשלום שונים
    switch (paymentType) {
      case 'tokenize':
        clearingRequest.AddToken = true;
        break;
      case 'charge_with_token':
        clearingRequest.ChargeWithToken = true;
        break;
      case 'tokenize_and_charge':
        clearingRequest.AddTokenAndCharge = true;
        break;
      case 'standing_order':
        if (!standingOrderDuration) {
          return NextResponse.json(
            { error: 'נדרש מספר חודשים לתשלומים חוזרים' },
            { status: 400 }
          );
        }
        clearingRequest.IsStandingOrderClearance = true;
        clearingRequest.StandingOrderDuration = standingOrderDuration;
        if (standingOrderCallbackUrl) {
          clearingRequest.StandingOrderCallBackUrl = standingOrderCallbackUrl;
        }
        break;
    }

    // יצירת client והגשת הבקשה
    const clearingClient = createInvoice4UClearingClient({
      apiKey: clearingApiKey,
      email: clearingEmail,
      password: clearingPassword,
      useProduction,
    });

    let response;
    try {
      response = await clearingClient.processClearingRequest(clearingRequest);
    } catch (error: any) {
      console.error('Invoice4U Clearing request error:', error);
      
      // הודעה ברורה יותר למשתמש
      let errorMessage = error.message || 'Unknown error';
      let userFriendlyMessage = errorMessage;
      
      // אם הבעיה היא ערכי ברירת מחדל, נציע פתרונות
      if (errorMessage.includes('ערכים ברירת מחדל') || errorMessage.includes('לא עובדה נכון')) {
        userFriendlyMessage = 'הבקשה לא עובדה ב-Invoice4U. נסה:\n' +
          '1. להשתמש ב-Email + Password במקום API Key (אם יש לך)\n' +
          '2. לבדוק שהאינטגרציה מוגדרת נכון ב-Invoice4U\n' +
          '3. לנסות עם Production במקום QA (אם אתה משתמש ב-QA)\n' +
          '4. לוודא שה-API Key מורשה ל-Clearing APIs';
      }
      
      return NextResponse.json(
        { 
          error: 'שגיאה בעיבוד בקשת Clearing',
          details: userFriendlyMessage,
          technicalError: errorMessage, // למטרות דיבוג
        },
        { status: 500 }
      );
    }

    if (!response) {
      return NextResponse.json(
        { error: 'לא התקבל response מ-Invoice4U Clearing' },
        { status: 500 }
      );
    }

    if (!response.ClearingRedirectUrl) {
      console.error('Invoice4U Clearing response missing ClearingRedirectUrl:', JSON.stringify(response, null, 2));
      return NextResponse.json(
        { 
          error: 'לא התקבל URL ל-clearing',
          details: response.Errors ? `שגיאות: ${JSON.stringify(response.Errors)}` : 'לא ידוע',
          response: response,
        },
        { status: 500 }
      );
    }

    // שמירת תשלום במצב PROCESSING
    if (quoteId) {
      // שימוש ב-PaymentId או ClearingTraceId מה-response
      const transactionId = response.PaymentId || response.ClearingTraceId || `INV4U_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // בדיקה אם יש כבר תשלום עם אותו quoteId ו-transactionId במצב PROCESSING
      // אם כן, נעדכן אותו במקום ליצור חדש
      const existingPayment = await prisma.payment.findFirst({
        where: {
          quoteId: quoteId,
          transactionId: transactionId,
          status: 'PROCESSING',
          companyId: session.user.companyId,
        },
      });

      const paymentData = {
        companyId: session.user.companyId,
        quoteId: quoteId,
        clientId: finalClientId || undefined,
        amount: parseFloat(amount),
        currency: 'ILS',
        status: 'PROCESSING' as const,
        method: 'CREDIT_CARD' as const,
        transactionId,
        description: description || 'תשלום דרך Invoice4U Clearing',
        notes: JSON.stringify({
          clearingUrl: response.ClearingRedirectUrl,
          clearingTraceId: response.ClearingTraceId,
          paymentId: response.PaymentId,
          i4uClearingLogId: response.I4UClearingLogId,
          paymentType,
          invoice4uClearing: true,
        }),
      };

      if (existingPayment) {
        // עדכון תשלום קיים
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: paymentData,
        });
      } else {
        // יצירת תשלום חדש
        await prisma.payment.create({
          data: paymentData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      clearingUrl: response.ClearingRedirectUrl,
      clearingTraceId: response.ClearingTraceId,
      paymentId: response.PaymentId,
      i4uClearingLogId: response.I4UClearingLogId,
      transactionId: response.PaymentId || response.OrderIdClientUsage || `TXN_${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Error processing Invoice4U Clearing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process clearing request' },
      { status: 500 }
    );
  }
}

