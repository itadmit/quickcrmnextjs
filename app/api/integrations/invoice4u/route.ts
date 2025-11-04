import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
          type: 'INVOICE4U',
        },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        // לא שולחים apiKey ו-apiSecret לצד הלקוח
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error('Error fetching Invoice4U integration:', error);
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
    const { email, password, name, useProduction } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // בדיקת תקינות הנתונים על ידי התחברות
    try {
      console.log('Testing Invoice4U credentials...', { email, useProduction });
      const { createInvoice4UClient } = await import('@/lib/invoice4u');
      const client = createInvoice4UClient({ email, password, useProduction });
      await client.login();
      console.log('Invoice4U credentials validated successfully');
    } catch (error: any) {
      console.error('Invoice4U credential validation failed:', error);
      return NextResponse.json(
        { 
          error: 'פרטי ההתחברות לא תקינים',
          details: error.message || 'Invalid Invoice4U credentials'
        },
        { status: 400 }
      );
    }

    // שמירה או עדכון
    const integration = await prisma.integration.upsert({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
          type: 'INVOICE4U',
        },
      },
      update: {
        name: name || 'Invoice4U',
        apiKey: email,
        apiSecret: password,
        config: { useProduction: useProduction || false },
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        companyId: session.user.companyId,
        type: 'INVOICE4U',
        name: name || 'Invoice4U',
        apiKey: email,
        apiSecret: password,
        config: { useProduction: useProduction || false },
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
    console.error('Error saving Invoice4U integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
          type: 'INVOICE4U',
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Invoice4U integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

