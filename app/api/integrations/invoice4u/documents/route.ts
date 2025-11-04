import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createInvoice4UClient, DocumentType } from '@/lib/invoice4u';

// POST - יצירת מסמך (הצעת מחיר, חשבון עסקה, חשבונית מס)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId, // ID של הלקוח במערכת CRM שלנו
      documentType, // 'quote' | 'proforma' | 'invoice' | 'receipt'
      subject,
      items,
      customEmails,
    } = body;

    if (!clientId || !documentType || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        { error: 'Invoice4U integration not configured' },
        { status: 400 }
      );
    }

    if (!integration.apiKey || !integration.apiSecret) {
      return NextResponse.json(
        { error: 'Invoice4U credentials missing' },
        { status: 400 }
      );
    }

    // קבלת פרטי הלקוח מהמערכת
    const client = await prisma.client.findUnique({
      where: { id: clientId, companyId: session.user.companyId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // יצירת לקוח ב-Invoice4U
    const invoice4uClient = createInvoice4UClient({
      email: integration.apiKey,
      password: integration.apiSecret,
      useProduction: (integration.config as any)?.useProduction || false,
    });

    // חיפוש או יצירת לקוח ב-Invoice4U
    let invoice4uCustomerId: number;
    try {
      const existingCustomers = await invoice4uClient.getCustomers({
        Name: client.name,
        Email: client.email || undefined,
      });

      if (existingCustomers && existingCustomers.length > 0) {
        invoice4uCustomerId = existingCustomers[0].ID;
      } else {
        const newCustomer = await invoice4uClient.createCustomer({
          Name: client.name,
          Email: client.email || undefined,
          Phone: client.phone || undefined,
          Address: client.address || undefined,
        });
        invoice4uCustomerId = newCustomer.ID;
      }
    } catch (error: any) {
      console.error('Error creating customer in Invoice4U:', error);
      return NextResponse.json(
        { error: 'Failed to create customer in Invoice4U' },
        { status: 500 }
      );
    }

    // המרת סוג המסמך
    let invoice4uDocType: DocumentType;
    switch (documentType) {
      case 'quote':
        invoice4uDocType = DocumentType.InvoiceQuote;
        break;
      case 'proforma':
        invoice4uDocType = DocumentType.ProformaInvoice;
        break;
      case 'invoice':
        invoice4uDocType = DocumentType.Invoice;
        break;
      case 'receipt':
        invoice4uDocType = DocumentType.InvoiceReceipt;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid document type' },
          { status: 400 }
        );
    }

    // הכנת רשימת אימיילים
    const associatedEmails = [
      {
        Mail: session.user.email || '',
        IsUserMail: true,
      },
    ];

    if (client.email) {
      associatedEmails.push({
        Mail: client.email,
        IsUserMail: false,
      });
    }

    if (customEmails && Array.isArray(customEmails)) {
      customEmails.forEach((email: string) => {
        if (email) {
          associatedEmails.push({
            Mail: email,
            IsUserMail: false,
          });
        }
      });
    }

    // יצירת המסמך
    try {
      const document = await invoice4uClient.createDocument({
        ClientID: invoice4uCustomerId,
        DocumentType: invoice4uDocType,
        Subject: subject || `מסמך עבור ${client.name}`,
        Currency: 'ILS',
        TaxIncluded: true,
        TaxPercentage: 17,
        Items: items.map((item: any) => ({
          Code: item.code || '',
          Name: item.name || item.description,
          Price: parseFloat(item.price || item.unitPrice || 0),
          Quantity: parseInt(item.quantity || 1),
        })),
        AssociatedEmails: associatedEmails,
        ApiIdentifier: `crm_${clientId}_${Date.now()}`,
      });

      return NextResponse.json({
        success: true,
        document: {
          id: document.ID,
          documentNumber: document.DocumentNumber,
          total: document.Total,
          documentType: invoice4uDocType,
          createdAt: document.IssueDate,
        },
      });
    } catch (error: any) {
      console.error('Error creating document in Invoice4U:', error);
      return NextResponse.json(
        { error: `Failed to create document: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Invoice4U document creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - קבלת רשימת מסמכים
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType');

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
        { error: 'Invoice4U integration not configured' },
        { status: 400 }
      );
    }

    if (!integration.apiKey || !integration.apiSecret) {
      return NextResponse.json(
        { error: 'Invoice4U credentials missing' },
        { status: 400 }
      );
    }

    const invoice4uClient = createInvoice4UClient({
      email: integration.apiKey,
      password: integration.apiSecret,
      useProduction: (integration.config as any)?.useProduction || false,
    });

    const filters: any = {};
    if (documentType) {
      switch (documentType) {
        case 'quote':
          filters.Type = DocumentType.InvoiceQuote;
          break;
        case 'proforma':
          filters.Type = DocumentType.ProformaInvoice;
          break;
        case 'invoice':
          filters.Type = DocumentType.Invoice;
          break;
      }
    }

    const documents = await invoice4uClient.getDocuments(filters);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching Invoice4U documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

