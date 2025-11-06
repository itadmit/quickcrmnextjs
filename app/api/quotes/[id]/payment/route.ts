import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AutomationEngine } from "@/lib/automation-engine"
import crypto from "crypto"

// POST /api/quotes/[id]/payment - תשלום על הצעת מחיר
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { token, amount } = body

    if (!token || !amount) {
      return NextResponse.json(
        { error: "Token and amount are required" },
        { status: 400 }
      )
    }

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

    // חיפוש פרויקט קיים או יצירת פרויקט חדש
    let projectId: string | null = null
    
    if (quote.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: quote.leadId },
        include: {
          client: true,
        },
      })

      if (lead) {
        let clientId: string | null = null

        // אם יש לקוח קיים לליד
        if (lead.clientId) {
          clientId = lead.clientId
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
              // עדכון הליד לקישור ללקוח
              await prisma.lead.update({
                where: { id: lead.id },
                data: { clientId: existingClient.id },
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
                },
              })
              clientId = newClient.id
              // עדכון הליד לקישור ללקוח
              await prisma.lead.update({
                where: { id: lead.id },
                data: { clientId: newClient.id },
              })
            }
          }
        }

        if (clientId) {
          // מחפש פרויקט קיים עם אותו לקוח
          const existingProject = await prisma.project.findFirst({
            where: {
              companyId: quote.companyId,
              clientId: clientId,
            },
            orderBy: {
              createdAt: "desc",
            },
          })

          if (existingProject) {
            projectId = existingProject.id
          } else {
            // יצירת פרויקט חדש
            // הסרת "הצעת מחיר - " מהתחלה אם קיים
            let projectName = quote.title || `פרויקט מ-${quote.quoteNumber}`
            if (projectName.startsWith('הצעת מחיר - ')) {
              projectName = projectName.replace(/^הצעת מחיר - /, '')
            } else if (projectName.startsWith('הצעת מחיר ')) {
              projectName = projectName.replace(/^הצעת מחיר /, '')
            }
            
            const project = await prisma.project.create({
              data: {
                companyId: quote.companyId,
                clientId: clientId,
                name: projectName,
                description: quote.description,
                status: "PLANNING",
                budget: quote.total,
              },
            })
            projectId = project.id
          }
        }
      }
    }

    // כאן תהיה אינטגרציה עם מערכת תשלום (PayPlus, Tranzila, וכו')
    // בינתיים נשמור תשלום במצב PENDING ואז נעדכן ל-COMPLETED

    // יצירת transaction ID
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`

    // יצירת תשלום במצב PROCESSING
    const payment = await prisma.payment.create({
      data: {
        companyId: quote.companyId,
        projectId: projectId,
        quoteId: quote.id,
        amount,
        currency: "ILS",
        status: "PROCESSING",
        method: "CREDIT_CARD",
        transactionId,
        description: `תשלום מקדמה על הצעת מחיר ${quote.quoteNumber}`,
      },
    })

    // סימולציה של תשלום - במקום אמיתי כאן תהיה קריאה למערכת התשלום
    // בינתיים נשמור את התשלום כ-COMPLETED
    await new Promise((resolve) => setTimeout(resolve, 1000)) // סימולציה של עיבוד

    // עדכון התשלום ל-COMPLETED
    const completedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
      },
    })

    // עדכון הצעה ל-ACCEPTED
    const updatedQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
    })

    // הפעלת אוטומציות לפרויקט מאושר
    try {
      await AutomationEngine.processTrigger({
        type: "quote_accepted",
        entityId: quote.id,
        entityType: "quote",
        data: {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          total: quote.total,
          leadId: quote.leadId,
        },
        userId: null,
        companyId: quote.companyId,
      })
    } catch (error) {
      console.error("Error triggering automations:", error)
      // לא נכשל את התשלום אם האוטומציות נכשלו
    }

    // המרה אוטומטית של הליד ללקוח אם עדיין לא הומר
    try {
      if (quote.leadId) {
        const lead = await prisma.lead.findUnique({
          where: { id: quote.leadId },
          select: { id: true, clientId: true, companyId: true, name: true, email: true, phone: true, notes: true, ownerId: true },
        })

        if (lead && !lead.clientId) {
          console.log(`Converting lead ${lead.id} to client after payment`)
          
          // יצירת לקוח חדש מהליד
          const client = await prisma.client.create({
            data: {
              companyId: lead.companyId,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              notes: lead.notes,
              status: "ACTIVE",
              ownerId: lead.ownerId,
            },
          })

          // עדכון סטטוס הליד ל-WON וקישור ללקוח
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              status: "WON",
              clientId: client.id,
            },
          })

          // העברת משימות מהליד ללקוח
          await prisma.task.updateMany({
            where: {
              leadId: lead.id,
              clientId: null,
            },
            data: {
              clientId: client.id,
            },
          })

          // העברת קבצים מהליד ללקוח
          await prisma.file.updateMany({
            where: {
              leadId: lead.id,
              clientId: null,
            },
            data: {
              clientId: client.id,
            },
          })

          // עדכון כל הפרויקטים שקשורים לליד דרך הצעות
          const quotes = await prisma.quote.findMany({
            where: { leadId: lead.id },
            select: { id: true },
          })
          
          const quoteIds = quotes.map(q => q.id)
          
          // בניית תנאי OR
          const orConditions: any[] = []
          if (projectId) {
            orConditions.push({ id: projectId })
          }
          if (quoteIds.length > 0) {
            orConditions.push({
              payments: {
                some: {
                  quoteId: { in: quoteIds },
                },
              },
            })
          }
          
          // עדכון כל הפרויקטים שקשורים להצעות של הליד
          if (orConditions.length > 0) {
            await prisma.project.updateMany({
              where: {
                companyId: lead.companyId,
                OR: orConditions,
              },
              data: { clientId: client.id },
            })
          }

          // רישום המרה ב-audit log
          await prisma.auditLog.create({
            data: {
              companyId: lead.companyId,
              userId: null, // המרה אוטומטית
              action: "LEAD_CONVERTED_AUTO",
              entityType: "Lead",
              entityId: lead.id,
              diff: {
                leadId: lead.id,
                leadName: lead.name,
                clientId: client.id,
                clientName: client.name,
                reason: "Payment received on accepted quote",
                quoteId: quote.id,
                quoteNumber: quote.quoteNumber,
                paymentId: completedPayment.id,
              },
            },
          })

          console.log(`Lead ${lead.id} automatically converted to client ${client.id}`)
        }
      }
    } catch (error) {
      console.error("Error auto-converting lead to client:", error)
      // לא נכשל את התהליך אם ההמרה נכשלה
    }

    return NextResponse.json({
      success: true,
      transactionId,
      paymentId: completedPayment.id,
      quoteId: quote.id,
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    )
  }
}

