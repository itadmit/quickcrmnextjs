import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPayPlusClient } from "@/lib/payplus"

/**
 * POST /api/quotes/[id]/generate-payment-link
 * Generate PayPlus payment link for quote approval (without requiring session)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { currency = "ILS", customer } = body

    // קבלת פרטי ההצעה
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lead: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // בדיקה שההצעה כבר אושרה (יש חתימה) - רק אם amount לא נשלח (מקדמה אוטומטית)
    // אם amount נשלח, זה אומר שמנסים לשלם תשלום ספציפי ולא מקדמה
    const bodyAmount = body.amount
    if (!bodyAmount && !quote.signature) {
      return NextResponse.json(
        { error: "Quote must be approved with signature first" },
        { status: 400 }
      )
    }

    // קבלת הגדרות PayPlus
    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: quote.companyId,
          type: "PAYPLUS",
        },
      },
    })

    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: "PayPlus integration not configured" },
        { status: 400 }
      )
    }

    const config = integration.config as any
    
    // ניקוי API keys מרווחים ותווים מיותרים
    const apiKey = integration.apiKey?.trim() || ''
    const secretKey = integration.apiSecret?.trim() || ''
    const paymentPageUid = config.paymentPageUid?.trim() || ''
    
    if (!apiKey || !secretKey || !paymentPageUid) {
      return NextResponse.json(
        { error: "PayPlus credentials are missing or incomplete" },
        { status: 400 }
      )
    }
    
    const client = createPayPlusClient({
      apiKey,
      secretKey,
      paymentPageUid,
      useProduction: config.useProduction || false,
    })

    // יצירת callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/api/payments/payplus/callback`
    const successUrl = `${baseUrl}/quotes/${params.id}/payment/success`
    const failureUrl = `${baseUrl}/quotes/${params.id}/approve?error=payment_failed`

    // חישוב סכום תשלום - אם נשלח amount, נשתמש בו, אחרת מקדמה 40%
    const depositAmount = bodyAmount ? parseFloat(bodyAmount) : quote.total * 0.4

    // יצירת payment link
    const paymentLinkResponse = await client.generatePaymentLink({
      amount: depositAmount,
      currency_code: currency,
      charge_method: 1, // Charge (J4) - תשלום מיידי
      refURL_success: successUrl,
      refURL_failure: failureUrl,
      refURL_callback: callbackUrl,
      send_failure_callback: true,
      sendEmailApproval: true,
      sendEmailFailure: false,
      language_code: "he",
      more_info: quote.quoteNumber,
      more_info_2: params.id,
      customer: customer || (quote.lead ? {
        customer_name: quote.lead.name,
        email: quote.lead.email || undefined,
        phone: quote.lead.phone || undefined,
      } : undefined),
    })

    if (paymentLinkResponse.results.status !== "success") {
      return NextResponse.json(
        {
          error: paymentLinkResponse.results.message || "Failed to generate payment link",
        },
        { status: 400 }
      )
    }

    if (!paymentLinkResponse.data?.payment_page_link) {
      console.error('No payment_page_link in response:', paymentLinkResponse)
      return NextResponse.json(
        {
          error: "Payment link not found in response",
          details: "PayPlus returned success but no payment_page_link. Response: " + JSON.stringify(paymentLinkResponse.data),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentLink: paymentLinkResponse.data.payment_page_link,
      pageRequestUid: paymentLinkResponse.data.page_request_uid,
      qrCodeImage: paymentLinkResponse.data.qr_code_image,
      hostedFieldsUuid: paymentLinkResponse.data.hosted_fields_uuid,
    })
  } catch (error: any) {
    console.error("Error generating PayPlus payment link:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to generate payment link", 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

