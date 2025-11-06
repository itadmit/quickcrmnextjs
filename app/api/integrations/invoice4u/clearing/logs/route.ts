import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createInvoice4UClearingClient } from '@/lib/invoice4u-clearing';

/**
 * GET - קבלת היסטוריית תשלומים (Clearing Logs)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const clearingLogId = searchParams.get('clearingLogId');

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
    const clearingEmail = config.clearingEmail || integration.apiKey;
    const clearingPassword = config.clearingPassword || integration.apiSecret;
    const useProduction = config.clearingUseProduction || config.useProduction || false;

    if (!clearingEmail || !clearingPassword) {
      return NextResponse.json(
        { error: 'Invoice4U Clearing credentials missing' },
        { status: 400 }
      );
    }

    // יצירת טוקן
    const clearingClient = createInvoice4UClearingClient({
      email: clearingEmail,
      password: clearingPassword,
      useProduction,
    });

    const token = await clearingClient.verifyLogin();

    // קבלת מידע על התשלום
    let log;
    if (clearingLogId) {
      log = await clearingClient.getClearingLogById(token, clearingLogId);
    } else if (paymentId) {
      // שימוש ב-GetClearingLogByParams עם searchParams
      log = await clearingClient.getClearingLogByParams(token, {
        PaymentId: paymentId,
      });
    } else {
      return NextResponse.json(
        { error: 'נדרש paymentId או clearingLogId' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error: any) {
    console.error('Error fetching Invoice4U Clearing logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clearing logs' },
      { status: 500 }
    );
  }
}

