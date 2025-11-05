import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { notifyQuoteApproved } from "@/lib/notification-service"
import { generateQuotePDF } from "@/lib/pdf-generator"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// POST /api/quotes/[id]/approve - אישור הצעת מחיר
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { signature } = body

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lead: true,
        company: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // בדיקה אם ההצעה כבר מאושרת
    if (quote.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Quote already approved" },
        { status: 400 }
      )
    }

    // בדיקת תוקף
    if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
      return NextResponse.json(
        { error: "Quote has expired" },
        { status: 400 }
      )
    }

    // הפיכת ליד ללקוח אם יש ליד
    let clientId: string | null = null
    if (quote.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: quote.leadId },
        include: {
          client: true,
        },
      })

      if (lead) {
        if (lead.clientId) {
          clientId = lead.clientId
          // עדכון החתימה של הלקוח
          await prisma.client.update({
            where: { id: clientId },
            data: {
              signature: signature || undefined,
            },
          })
        } else {
          // מחפש לקוח קיים לפי email
          if (lead.email) {
            const existingClient = await prisma.client.findFirst({
              where: {
                companyId: quote.companyId,
                email: lead.email,
              },
            })

            if (existingClient) {
              clientId = existingClient.id
              // עדכון החתימה והליד
              await prisma.client.update({
                where: { id: clientId },
                data: {
                  signature: signature || undefined,
                },
              })
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  clientId: existingClient.id,
                  status: "WON",
                },
              })
            } else {
              // יצירת לקוח חדש מהליד
              const newClient = await prisma.client.create({
                data: {
                  companyId: quote.companyId,
                  name: lead.name,
                  email: lead.email,
                  phone: lead.phone,
                  status: "ACTIVE",
                  signature: signature || undefined,
                },
              })
              clientId = newClient.id
              // עדכון הליד
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  clientId: newClient.id,
                  status: "WON",
                },
              })
            }
          }
        }
      }
    }

    // עדכון ההצעה עם החתימה
    await prisma.quote.update({
      where: { id: params.id },
      data: {
        status: "VIEWED",
        viewedAt: new Date(),
        signature: signature || undefined,
        signedAt: signature ? new Date() : undefined,
      },
    })

    // קריאה מחדש של ההצעה עם החתימה
    const updatedQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lead: {
          include: {
            client: true,
          },
        },
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

    if (!updatedQuote) {
      return NextResponse.json({ error: "Quote not found after update" }, { status: 404 })
    }

    // מציאת הבעלים של הליד או של החברה לשליחת התראה
    let notificationUserId: string | null = null
    if (quote.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: quote.leadId },
        select: { ownerId: true },
      })
      if (lead?.ownerId) {
        notificationUserId = lead.ownerId
      }
    }
    
    // אם אין בעלים לליד, נשלח למנהל הראשון בחברה
    if (!notificationUserId) {
      const firstManager = await prisma.user.findFirst({
        where: {
          companyId: quote.companyId,
          role: {
            in: ['ADMIN', 'MANAGER'],
          },
        },
        select: { id: true },
      })
      if (firstManager) {
        notificationUserId = firstManager.id
      }
    }

    // שליחת התראה על אישור הצעה
    if (notificationUserId && quote.lead) {
      try {
        await notifyQuoteApproved({
          userId: notificationUserId,
          companyId: quote.companyId,
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          leadName: quote.lead.name,
          total: quote.total,
        })
      } catch (error) {
        console.error("Error sending quote approved notification:", error)
        // לא נכשל את התהליך אם ההתראה נכשלה
      }
    }

    // שמירת PDF עם החתימה כקובץ (אם יש חתימה)
    if (signature && clientId && updatedQuote) {
      try {
        // יצירת PDF עם החתימה
        const pdfBuffer = await generateQuotePDF(updatedQuote)

        // שמירת הקובץ
        const uploadsDir = join(process.cwd(), "uploads", "quotes")
        
        // יצירת תיקייה אם היא לא קיימת
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true })
        }

        const fileName = `quote-${quote.quoteNumber}-${Date.now()}.pdf`
        const filePath = join(uploadsDir, fileName)
        
        await writeFile(filePath, pdfBuffer)

        // שמירת הקובץ במסד הנתונים
        await prisma.file.create({
          data: {
            companyId: quote.companyId,
            entityType: "quote",
            entityId: quote.id,
            path: `/uploads/quotes/${fileName}`,
            name: `הצעת מחיר ${updatedQuote.quoteNumber} - חתומה.pdf`,
            size: pdfBuffer.length,
            mimeType: "application/pdf",
            uploadedBy: null, // אישור הצעה יכול להיות ללא משתמש מחובר
            clientId: clientId,
          },
        })

        console.log("✅ Quote PDF saved as file")
      } catch (error) {
        console.error("Error saving quote PDF:", error)
        // לא נכשל את התהליך אם שמירת ה-PDF נכשלה
      }
    }

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      clientId,
    })
  } catch (error) {
    console.error("Error approving quote:", error)
    return NextResponse.json(
      { error: "Failed to approve quote" },
      { status: 500 }
    )
  }
}

// GET /api/quotes/[id]/approve - קבלת פרטי הצעה לאישור (ללא authentication)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lead: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // החזרת פרטי ההצעה (ללא מידע רגיש)
    return NextResponse.json({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      description: quote.description,
      total: quote.total,
      subtotal: quote.subtotal,
      tax: quote.tax,
      discount: quote.discount,
      lead: quote.lead,
      items: quote.items,
      status: quote.status,
      validUntil: quote.validUntil,
    })
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    )
  }
}

