import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPayPlusClient } from '@/lib/payplus';

// GET - קבלת הגדרות אינטגרציה
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'PAYPLUS',
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        config: true,
        // לא שולחים apiKey ו-apiSecret לצד הלקוח
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error('Error fetching PayPlus integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - יצירת/עדכון אינטגרציה
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, secretKey, paymentPageUid, name, useProduction } = body;

    // ניקוי מרווחים ותווים מיותרים
    const cleanedApiKey = apiKey?.trim() || ''
    const cleanedSecretKey = secretKey?.trim() || ''
    const cleanedPaymentPageUid = paymentPageUid?.trim() || ''

    if (!cleanedApiKey || !cleanedSecretKey || !cleanedPaymentPageUid) {
      return NextResponse.json(
        { error: 'API Key, Secret Key, and Payment Page UID are required' },
        { status: 400 }
      );
    }

    // בדיקת תקינות הנתונים על ידי יצירת payment link בדיקה (1 שקל)
    try {
      const client = createPayPlusClient({
        apiKey: cleanedApiKey,
        secretKey: cleanedSecretKey,
        paymentPageUid: cleanedPaymentPageUid,
        useProduction: useProduction || false,
      });
      
      // בדיקה על ידי יצירת payment link בדיקה עם סכום מינימלי (1 שקל)
      // זה יאמת שהמפתחות תקינים ללא יצירת תשלום אמיתי
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
        throw new Error(testResponse.results.message || testResponse.results.description || 'Failed to validate credentials');
      }
    } catch (error: any) {
      console.error('PayPlus credential validation failed:', error);
      const errorMessage = error.message || 'Invalid PayPlus credentials'
      
      // הודעה מפורטת יותר
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
          error: detailedError,
          details: errorMessage
        },
        { status: 400 }
      );
    }

    // שמירה או עדכון
    const integration = await prisma.integration.upsert({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'PAYPLUS',
        },
      },
      update: {
        name: name || 'PayPlus',
        apiKey: cleanedApiKey,
        apiSecret: cleanedSecretKey,
        config: { 
          paymentPageUid: cleanedPaymentPageUid,
          useProduction: useProduction || false,
        },
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        companyId: session.user.companyId,
        type: 'PAYPLUS',
        name: name || 'PayPlus',
        apiKey: cleanedApiKey,
        apiSecret: cleanedSecretKey,
        config: { 
          paymentPageUid: cleanedPaymentPageUid,
          useProduction: useProduction || false,
        },
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        isActive: integration.isActive,
        lastSyncAt: integration.lastSyncAt,
      },
    });
  } catch (error: any) {
    console.error('Error saving PayPlus integration:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE - מחיקת אינטגרציה
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.integration.delete({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'PAYPLUS',
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PayPlus integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

