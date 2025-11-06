import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET - קבלת הגדרות אינטגרציית Clearing
 * 
 * שונה מ-/api/integrations/invoice4u - זה רק למסמכים
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // נשתמש באותה אינטגרציה של INVOICE4U אבל נבדוק את ה-config
    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      return NextResponse.json({ integration: null });
    }

    // בדיקה אם יש API Key מוגדר (למסמכים משתמשים ב-email/password)
    const config = (integration.config as any) || {};
    const hasClearingApiKey = !!config.clearingApiKey;

    return NextResponse.json({
      integration: {
        ...integration,
        hasClearingApiKey,
        hasClearingConfig: hasClearingApiKey || (config.apiKey && config.useProduction !== undefined),
      },
    });
  } catch (error) {
    console.error('Error fetching Invoice4U Clearing integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - יצירת/עדכון אינטגרציית Clearing
 * 
 * שמירת API Key נפרד ל-Clearing (מומלץ)
 * או שימוש ב-Email+Password (אלטרנטיבה)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, email, password, useProduction } = body;

    // צריך API Key או Email+Password
    if (!apiKey && (!email || !password)) {
      return NextResponse.json(
        { error: 'נדרש API Key או Email + Password' },
        { status: 400 }
      );
    }

    // בדיקת תקינות - נבדוק את ה-API Key או Email+Password
    try {
      if (apiKey) {
        // בדיקה בסיסית של API Key (פורמט)
        if (typeof apiKey !== 'string' || apiKey.length < 10) {
          throw new Error('API Key לא תקין');
        }
        // TODO: ניתן להוסיף בדיקה אמיתית עם Invoice4U
      } else {
        // בדיקה עם Email+Password (משתמש באותה פונקציה כמו Documents)
        const { createInvoice4UClient } = await import('@/lib/invoice4u');
        const client = createInvoice4UClient({
          email,
          password,
          useProduction,
        });
        await client.login();
      }
    } catch (error: any) {
      console.error('Invoice4U Clearing credential validation failed:', error);
      return NextResponse.json(
        {
          error: 'פרטי ההתחברות לא תקינים',
          details: error.message || 'Invalid Invoice4U Clearing credentials',
        },
        { status: 400 }
      );
    }

    // קבלת האינטגרציה הקיימת (או יצירת חדשה)
    const existingIntegration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
    });

    // עדכון ה-config עם פרטי Clearing
    const currentConfig = (existingIntegration?.config as any) || {};
    const updatedConfig = {
      ...currentConfig,
      // Clearing specific config
      clearingApiKey: apiKey || null,
      clearingEmail: email || null,
      clearingPassword: password || null,
      clearingUseProduction: useProduction || false,
    };

    // שמירה או עדכון
    const integration = await prisma.integration.upsert({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
      update: {
        config: updatedConfig,
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        companyId: session.user.companyId,
        type: 'INVOICE4U',
        name: 'Invoice4U',
        // אם אין אינטגרציה קיימת - נצטרך גם את פרטי המסמכים
        apiKey: email || '',
        apiSecret: password || '',
        config: {
          ...updatedConfig,
          useProduction: useProduction || false,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      integration,
    });
  } catch (error) {
    console.error('Error saving Invoice4U Clearing integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - מחיקת הגדרות Clearing
 * 
 * לא מוחק את כל האינטגרציה - רק את פרטי Clearing
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // הסרת רק פרטי Clearing מה-config
    const config = (integration.config as any) || {};
    delete config.clearingApiKey;
    delete config.clearingEmail;
    delete config.clearingPassword;
    delete config.clearingUseProduction;

    await prisma.integration.update({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
      data: {
        config,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Invoice4U Clearing integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

