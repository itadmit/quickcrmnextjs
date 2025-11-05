import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPayPlusClient } from "@/lib/payplus"

/**
 * POST /api/payments/payplus/generate-link
 * Generate PayPlus payment link
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { quoteId, currency = "ILS", customer } = body

    if (!quoteId) {
      return NextResponse.json(
        { error: "Quote ID is required" },
        { status: 400 }
      )
    }

    // קבלת פרטי ההצעה
    const quote = await prisma.quote.findFirst({
      where: {
        id: quoteId,
        companyId: session.user.companyId,
      },
      include: {
        lead: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // קבלת הגדרות PayPlus
    const integration = await prisma.integration.findUnique({
      where: {
        companyId_type: {
          companyId: session.user.companyId,
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
    const client = createPayPlusClient({
      apiKey: integration.apiKey!,
      secretKey: integration.apiSecret!,
      paymentPageUid: config.paymentPageUid,
      useProduction: config.useProduction || false,
    })

    // יצירת callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/api/payments/payplus/callback`
    const successUrl = `${baseUrl}/quotes/${quoteId}/payment/success`
    const failureUrl = `${baseUrl}/quotes/${quoteId}/approve?error=payment_failed`

    // חישוב מקדמה (40% מהסה"כ)
    const depositAmount = quote.total * 0.4

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
      more_info_2: quoteId,
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

    return NextResponse.json({
      success: true,
      paymentLink: paymentLinkResponse.data?.payment_page_link,
      pageRequestUid: paymentLinkResponse.data?.page_request_uid,
      qrCodeImage: paymentLinkResponse.data?.qr_code_image,
      hostedFieldsUuid: paymentLinkResponse.data?.hosted_fields_uuid,
    })
  } catch (error: any) {
    console.error("Error generating PayPlus payment link:", error)
    return NextResponse.json(
      { error: "Failed to generate payment link", details: error.message },
      { status: 500 }
    )
  }
}

