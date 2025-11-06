import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createInvoice4UClearingClient } from '@/lib/invoice4u-clearing';
import { AutomationEngine } from '@/lib/automation-engine';
import { notifyPaymentReceived } from '@/lib/notification-service';

/**
 * GET/POST - Callback handler לחזרה מ-Invoice4U/Meshulam לאחר תשלום
 * 
 * Meshulam מחזיר את המשתמש ל-ReturnUrl עם פרמטרים ב-query string
 * נשתמש ב-ClearingTraceId או PaymentId כדי לזהות את התשלום
 */
export async function GET(request: NextRequest) {
  return handleCallback(request);
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

async function handleCallback(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const body = await request.json().catch(() => ({}));
    
    // קבלת פרמטרים מה-URL או מה-body
    const clearingTraceId = searchParams.get('clearingTraceId') || body.clearingTraceId || searchParams.get('traceId') || body.traceId;
    const paymentId = searchParams.get('paymentId') || body.paymentId;
    const quoteId = searchParams.get('quoteId') || body.quoteId || searchParams.get('orderId') || body.orderId;
    const status = searchParams.get('status') || body.status || searchParams.get('result') || body.result;
    const amount = searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : (body.amount ? parseFloat(body.amount) : null);
    
    console.log('Invoice4U Clearing callback received:', {
      clearingTraceId,
      paymentId,
      quoteId,
      status,
      amount,
    });

    // אם אין quoteId, ננסה למצוא את התשלום לפי clearingTraceId או paymentId
    let finalQuoteId = quoteId;
    
    if (!finalQuoteId && (clearingTraceId || paymentId)) {
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { transactionId: clearingTraceId || undefined },
            { transactionId: paymentId || undefined },
          ],
        },
        select: { quoteId: true, companyId: true },
      });
      
      if (payment) {
        finalQuoteId = payment.quoteId || undefined;
      }
    }

    if (!finalQuoteId) {
      console.error('Missing quote ID in callback');
      // אם אין quoteId, נחזיר הודעה אבל לא נזרוק שגיאה - יכול להיות שהתשלום לא היה קשור להצעה
      return NextResponse.redirect(new URL('/quotes?error=missing_quote_id', request.url));
    }

    // מציאת הצעה
    const quote = await prisma.quote.findUnique({
      where: { id: finalQuoteId },
      include: {
        lead: {
          include: {
            client: true,
          },
        },
        company: true,
      },
    });

    if (!quote) {
      console.error('Quote not found:', finalQuoteId);
      return NextResponse.redirect(new URL('/quotes?error=quote_not_found', request.url));
    }

    // קבלת הגדרות Invoice4U Clearing
    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: quote.companyId,
          type: 'INVOICE4U',
        },
      },
    });

    if (!integration || !integration.isActive) {
      console.error('Invoice4U integration not found or inactive');
      return NextResponse.redirect(new URL(`/quotes/${finalQuoteId}?error=integration_not_found`, request.url));
    }

    // אם יש clearingTraceId או paymentId, נביא את פרטי העסקה המלאים מ-Invoice4U
    let clearingLog: any = null;
    if (clearingTraceId || paymentId) {
      try {
        const config = (integration.config as any) || {};
        const clearingEmail = config.clearingEmail || integration.apiKey;
        const clearingPassword = config.clearingPassword || integration.apiSecret;
        const useProduction = config.clearingUseProduction || config.useProduction || false;

        if (clearingEmail && clearingPassword) {
          const clearingClient = createInvoice4UClearingClient({
            email: clearingEmail,
            password: clearingPassword,
            useProduction,
          });

          // יצירת טוקן
          const token = await clearingClient.verifyLogin();

          // קבלת פרטי התשלום
          if (paymentId) {
            clearingLog = await clearingClient.getClearingLogByParams(token, { PaymentId: paymentId });
          } else if (clearingTraceId) {
            // ננסה למצוא לפי ClearingTraceId דרך PaymentId
            const payment = await prisma.payment.findFirst({
              where: {
                transactionId: clearingTraceId,
                quoteId: finalQuoteId,
              },
            });
            if (payment?.transactionId) {
              clearingLog = await clearingClient.getClearingLogByParams(token, { PaymentId: payment.transactionId });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching clearing log from Invoice4U:', error);
        // לא נזרוק שגיאה - נמשיך עם הנתונים שיש לנו
      }
    }

    // בדיקת סטטוס התשלום
    const isSuccess = clearingLog?.IsSuccess === true || 
                      status === 'success' || 
                      status === 'approved' ||
                      status === '1' ||
                      (clearingLog === null && status === null); // אם אין שגיאה, נניח שהתשלום הצליח

    // חיפוש תשלום קיים
    const transactionId = paymentId || clearingTraceId || clearingLog?.PaymentId;
    const existingPayment = await prisma.payment.findFirst({
      where: {
        quoteId: finalQuoteId,
        transactionId: transactionId || undefined,
      },
    });

    // חיפוש פרויקט קיים או יצירת פרויקט חדש
    let projectId: string | null = null;
    
    if (quote.leadId) {
      // חיפוש פרויקט קיים
      const existingProject = await prisma.project.findFirst({
        where: {
          companyId: quote.companyId,
          clientId: quote.lead.clientId || undefined,
          name: {
            contains: quote.title || quote.quoteNumber,
          },
        },
      });

      if (existingProject) {
        projectId = existingProject.id;
      } else if (quote.lead.clientId) {
        // יצירת פרויקט חדש אם יש לקוח
        const newProject = await prisma.project.create({
          data: {
            companyId: quote.companyId,
            clientId: quote.lead.clientId,
            name: `פרויקט - ${quote.title}`,
            description: `פרויקט שנוצר מהצעה ${quote.quoteNumber}`,
            status: 'IN_PROGRESS',
          },
        });
        projectId = newProject.id;
      }
    }

    // עדכון או יצירת תשלום
    let payment;
    if (existingPayment) {
      // עדכון תשלום קיים
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          paidAt: isSuccess ? new Date() : null,
          transactionId: transactionId || existingPayment.transactionId,
          notes: JSON.stringify({
            ...(existingPayment.notes ? JSON.parse(existingPayment.notes) : {}),
            callbackData: {
              clearingTraceId,
              paymentId,
              status,
              clearingLog,
            },
            callbackAt: new Date().toISOString(),
          }),
        },
      });
    } else {
      // יצירת תשלום חדש
      const paymentAmount = amount || clearingLog?.Amount || quote.total;
      payment = await prisma.payment.create({
        data: {
          companyId: quote.companyId,
          quoteId: finalQuoteId,
          clientId: quote.lead?.clientId || undefined,
          projectId: projectId || undefined,
          amount: paymentAmount,
          currency: 'ILS',
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          method: 'CREDIT_CARD',
          transactionId: transactionId || undefined,
          description: `תשלום עבור הצעה ${quote.quoteNumber}`,
          paidAt: isSuccess ? new Date() : null,
          notes: JSON.stringify({
            clearingTraceId,
            paymentId,
            status,
            clearingLog,
            invoice4uClearing: true,
            callbackAt: new Date().toISOString(),
          }),
        },
      });
    }

    const wasNewPayment = !existingPayment || existingPayment.status !== 'COMPLETED';

    // אם התשלום הושלם, מעדכן את ההצעה ומפעיל אוטומציות
    if (isSuccess && wasNewPayment) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      // הפעלת אוטומציות עבור הצעה שאושרה
      try {
        await AutomationEngine.processTrigger({
          type: 'quote_accepted',
          entityId: quote.id,
          entityType: 'quote',
          data: {
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            total: quote.total,
            leadId: quote.leadId,
            projectId: projectId,
          },
          userId: null,
          companyId: quote.companyId,
        });
      } catch (error) {
        console.error('Error triggering quote_accepted automations:', error);
      }

      // הפעלת אוטומציות עבור תשלום חדש
      try {
        await AutomationEngine.processTrigger({
          type: 'payment_received',
          entityId: payment.id,
          entityType: 'payment',
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            quoteId: quote.id,
            projectId: projectId,
            transactionId: payment.transactionId,
          },
          userId: null,
          companyId: quote.companyId,
        });
      } catch (error) {
        console.error('Error triggering payment_received automations:', error);
      }

      // המרה אוטומטית של הליד ללקוח אם עדיין לא הומר
      try {
        if (quote.leadId && !quote.lead.clientId) {
          const lead = await prisma.lead.findUnique({
            where: { id: quote.leadId },
          });

          if (lead) {
            const client = await prisma.client.create({
              data: {
                companyId: lead.companyId,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                notes: lead.notes,
                status: 'ACTIVE',
                ownerId: lead.ownerId,
              },
            });

            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                status: 'WON',
                clientId: client.id,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error converting lead to client:', error);
      }

      // שליחת התראה
      try {
        await notifyPaymentReceived({
          companyId: quote.companyId,
          paymentId: payment.id,
          amount: payment.amount,
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
        });
      } catch (error) {
        console.error('Error sending payment notification:', error);
      }
    }

    // החזרה לדף ההצעות עם הודעה על הצלחה או כישלון
    const redirectUrl = new URL(`/quotes/${finalQuoteId}`, request.url);
    if (isSuccess) {
      redirectUrl.searchParams.set('payment', 'success');
    } else {
      redirectUrl.searchParams.set('payment', 'failed');
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error processing Invoice4U Clearing callback:', error);
    const quoteId = request.nextUrl.searchParams.get('quoteId') || request.nextUrl.searchParams.get('orderId');
    
    if (quoteId) {
      return NextResponse.redirect(new URL(`/quotes/${quoteId}?error=callback_error`, request.url));
    }
    
    return NextResponse.redirect(new URL('/quotes?error=callback_error', request.url));
  }
}

