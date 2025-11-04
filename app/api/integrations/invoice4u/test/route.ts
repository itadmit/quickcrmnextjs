import { NextRequest, NextResponse } from 'next/server';

// POST - בדיקת חיבור (לא שומר את הנתונים)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, useProduction } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('=== Invoice4U Connection Test ===');
    console.log('Email:', email);
    console.log('Use Production:', useProduction);
    console.log('WSDL:', useProduction 
      ? 'https://api.invoice4u.co.il/Services/ApiService.svc?singleWsdl'
      : 'https://apiqa.invoice4u.co.il/Services/ApiService.svc?singleWsdl'
    );

    try {
      const { createInvoice4UClient } = await import('@/lib/invoice4u');
      const client = createInvoice4UClient({ email, password, useProduction });
      
      console.log('Attempting to login...');
      const token = await client.login();
      
      console.log('Login successful! Token received');
      console.log('Token preview:', token.substring(0, 10) + '...');

      // בדיקת IsAuthenticated
      const isAuth = await client.isAuthenticated();
      console.log('IsAuthenticated result:', isAuth);

      return NextResponse.json({
        success: true,
        message: 'החיבור ל-Invoice4U תקין!',
        details: {
          authenticated: isAuth,
          tokenReceived: !!token,
          environment: useProduction ? 'Production' : 'Staging',
        },
      });
    } catch (error: any) {
      console.error('=== Invoice4U Connection Test Failed ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Parse SOAP errors if any
      let errorDetails = error.message || 'Unknown error';
      
      if (error.root && error.root.Envelope) {
        console.error('SOAP Envelope:', JSON.stringify(error.root.Envelope, null, 2));
        errorDetails = 'SOAP Error: ' + JSON.stringify(error.root.Envelope);
      }

      return NextResponse.json(
        {
          error: 'פרטי ההתחברות לא תקינים',
          details: errorDetails,
          suggestions: [
            'ודא שהאימייל והסיסמה נכונים',
            'בדוק שאתה מתחבר לסביבה הנכונה (Production/Staging)',
            'נסה להתחבר ישירות לאתר Invoice4U',
            'אם הבעיה נמשכת, צור קשר עם תמיכת Invoice4U',
          ],
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

