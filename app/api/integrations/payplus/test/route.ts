import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPayPlusClient } from '@/lib/payplus';

// POST - בדיקת חיבור PayPlus (לא שומר את הנתונים)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, secretKey, paymentPageUid, useProduction } = body;

    if (!apiKey || !secretKey || !paymentPageUid) {
      return NextResponse.json(
        { error: 'API Key, Secret Key, and Payment Page UID are required' },
        { status: 400 }
      );
    }

    // ניקוי מרווחים ותווים מיותרים
    const cleanedApiKey = apiKey?.trim() || ''
    const cleanedSecretKey = secretKey?.trim() || ''
    const cleanedPaymentPageUid = paymentPageUid?.trim() || ''

    try {
      const client = createPayPlusClient({
        apiKey: cleanedApiKey,
        secretKey: cleanedSecretKey,
        paymentPageUid: cleanedPaymentPageUid,
        useProduction: useProduction || false,
      });
      
      // בדיקה על ידי יצירת payment link בדיקה עם סכום מינימלי (1 שקל)
      const testResponse = await client.generatePaymentLink({
        amount: 1, // סכום מינימלי לבדיקה
        currency_code: 'ILS',
        charge_method: 1,
        refURL_success: 'https://example.com/success',
        refURL_failure: 'https://example.com/failure',
        sendEmailApproval: false,
        sendEmailFailure: false,
        language_code: 'he',
      });

      if (testResponse.results.status !== 'success') {
        throw new Error(testResponse.results.message || testResponse.results.description || 'Failed to generate test payment link');
      }

      return NextResponse.json({
        success: true,
        message: 'החיבור ל-PayPlus תקין!',
        details: {
          authenticated: true,
          paymentLinkGenerated: !!testResponse.data?.payment_page_link,
          paymentLink: testResponse.data?.payment_page_link,
          environment: useProduction ? 'Production' : 'Staging',
          status: testResponse.results.status,
        },
      });
    } catch (error: any) {
      console.error('PayPlus connection test failed:', error);
      
      const errorMessage = error.message || 'Failed to connect to PayPlus'
      let detailedError = 'פרטי ההתחברות לא תקינים'
      
      if (errorMessage.includes('API_KEY') || errorMessage.includes('SECRET_KEY') || errorMessage.includes('INCORRECT')) {
        detailedError = `פרטי ההתחברות לא תקינים. אנא בדוק:
1. שהמפתחות (API Key ו-Secret Key) נכונים
2. שאתה משתמש במפתחות המתאימים לסביבה (${useProduction ? 'Production' : 'Staging'})
3. שה-Payment Page UID שייך לאותו חשבון
4. אם יש לך מפתחות של Staging, בטל את הסימון "Production"`
      } else {
        detailedError = `פרטי ההתחברות לא תקינים: ${errorMessage}`
      }
      
      return NextResponse.json(
        {
          success: false,
          error: detailedError,
          details: errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error testing PayPlus connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'שגיאה בבדיקת החיבור',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

