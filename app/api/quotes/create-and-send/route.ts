import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getEmailTemplate } from "@/lib/email"
import { generateQuotePDF } from "@/lib/pdf-generator"
import { Session } from "next-auth"

interface ExtendedSession extends Session {
  user: {
    id: string
    email: string
    name: string
    role: string
    companyId: string
    companyName: string
  }
}

// POST /api/quotes/create-and-send - יצירת הצעת מחיר ושילוח במייל
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const {
      leadId,
      title,
      description,
      templateType = "simple",
      validUntil,
      notes,
      terms,
      items,
      discount = 0,
      tax = 18,
    } = body

    // בדיקה שיש leadId
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
    }

    // קבלת פרטי הלקוח
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        companyId: user.companyId,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead has no email address" },
        { status: 400 }
      )
    }

    // חישוב subtotal
    let subtotal = 0
    const processedItems = items.map((item: any, index: number) => {
      const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
      subtotal += itemTotal
      return {
        description: item.description,
        richDescription: item.richDescription || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: itemTotal,
        position: index,
      }
    })

    // חישוב סה"כ
    const discountAmount = subtotal * (discount / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (tax / 100)
    const total = afterDiscount + taxAmount

    // יצירת מספר הצעת מחיר ייחודי
    const allQuotes = await prisma.quote.findMany({
      where: {
        companyId: user.companyId,
        isTemplate: false,
      },
      select: { quoteNumber: true },
    })

    let quoteNumber = "Q-001"
    if (allQuotes.length > 0) {
      const numbers = allQuotes
        .map((q) => {
          const match = q.quoteNumber.match(/^Q-(\d+)$/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter((n) => n > 0)
      const maxNumber = Math.max(...numbers, 0)
      quoteNumber = `Q-${String(maxNumber + 1).padStart(3, "0")}`
    }

    // יצירת הצעת המחיר
    const quote = await prisma.quote.create({
      data: {
        companyId: user.companyId,
        leadId: leadId,
        quoteNumber,
        title,
        description: description || null,
        templateType,
        status: "SENT",
        subtotal,
        discount,
        tax,
        total,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        terms: terms || null,
        issuedAt: new Date(),
        createdBy: session.user.id,
        items: {
          create: processedItems,
        },
      },
      include: {
        lead: true,
        items: {
          orderBy: {
            position: "asc",
          },
        },
        company: {
          select: {
            name: true,
            settings: true,
          },
        },
      },
    })

    // יצירת PDF של הצעת המחיר
    const quotePDF = await generateQuotePDF(quote)

    // יצירת קישור להצעת המחיר
    const quoteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/quotes/${quote.id}/approve`

    // יצירת תוכן אימייל פשוט
    const emailContent = getEmailTemplate({
      title: "הצעת מחיר חדשה",
      content: `
        <div dir="rtl" style="text-align: center;">
          <p>שלום ${lead.name},</p>
          <p>אנו שמחים לשלוח לך את הצעת המחיר הבאה:</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="margin-top: 0;">${quote.title}</h3>
            <p><strong>מספר הצעה:</strong> ${quote.quoteNumber}</p>
            ${quote.validUntil ? `<p><strong>תוקף עד:</strong> ${new Date(quote.validUntil).toLocaleDateString('he-IL')}</p>` : ''}
            <p style="font-size: 28px; font-weight: bold; color: #059669; margin: 15px 0;">
              סה"כ: ₪${total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <p style="margin: 30px 0;">ההצעה המלאה מצורפת כקובץ PDF.</p>
          <p style="margin: 30px 0;">לאישור ההצעה ותשלום מקדמה, לחץ על הכפתור למטה:</p>
          <a href="${quoteUrl}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #6f65e2 0%, #b965e2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 16px;">
            לחץ כאן לאישור ותשלום מקדמה
          </a>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            או העתק את הקישור הבא לדפדפן שלך:<br>
            <span style="word-break: break-all;">${quoteUrl}</span>
          </p>
        </div>
      `,
      footer: "הצעה זו נשלחה אוטומטית מ-QuickCRM",
    })

    // שם הקובץ המצורף
    const pdfFileName = `הצעת_מחיר_${quote.quoteNumber.replace(/\s+/g, '_')}.pdf`

    // שליחת האימייל עם קובץ PDF מצורף
    await sendEmail({
      to: lead.email,
      subject: `הצעת מחיר חדשה - ${quote.quoteNumber}`,
      html: emailContent,
      attachments: [
        {
          filename: pdfFileName,
          content: quotePDF,
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json({
      success: true,
      quote,
      message: "הצעת המחיר נוצרה ונשלחה במייל בהצלחה",
    })
  } catch (error) {
    console.error("Error creating and sending quote:", error)
    return NextResponse.json(
      {
        error: "Failed to create and send quote",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

