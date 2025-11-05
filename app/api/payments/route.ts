import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AutomationEngine } from "@/lib/automation-engine"
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

// GET /api/payments - קבלת כל התשלומים
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const projectId = searchParams.get("projectId")

    const where: any = {
      companyId: user.companyId,
    }

    if (status) {
      where.status = status
    }

    if (projectId) {
      where.projectId = projectId
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}

// POST /api/payments - יצירת תשלום חדש
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
      projectId,
      quoteId,
      amount,
      currency = "ILS",
      method = "CREDIT_CARD",
      status = "PENDING",
      transactionId,
      paymentReference,
      description,
      notes,
      paidAt,
    } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount is required and must be positive" },
        { status: 400 }
      )
    }

    // בדיקה שהפרויקט/הצעה שייכים לחברה
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId: user.companyId,
        },
      })
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }
    }

    let finalProjectId = projectId || null
    let quote: any = null

    if (quoteId) {
      quote = await prisma.quote.findFirst({
        where: {
          id: quoteId,
          companyId: user.companyId,
        },
        include: {
          lead: {
            include: {
              client: true,
            },
          },
        },
      })
      if (!quote) {
        return NextResponse.json(
          { error: "Quote not found" },
          { status: 404 }
        )
      }

      // אם יש גם projectId וגם quoteId, נבדוק שהם קשורים לאותו לקוח
      if (finalProjectId) {
        const selectedProject = await prisma.project.findFirst({
          where: {
            id: finalProjectId,
            companyId: user.companyId,
          },
        })
        if (!selectedProject) {
          return NextResponse.json(
            { error: "Project not found" },
            { status: 404 }
          )
        }

        // נבדוק שהפרויקט וההצעה קשורים לאותו לקוח
        if (quote.leadId) {
          const lead = quote.lead
          let quoteClientId: string | null = null

          if (lead?.clientId) {
            quoteClientId = lead.clientId
          } else if (lead?.email) {
            const existingClient = await prisma.client.findFirst({
              where: {
                companyId: user.companyId,
                email: lead.email,
              },
            })
            if (existingClient) {
              quoteClientId = existingClient.id
            }
          }

          // אם יש לקוח להצעה ולא תואם לפרויקט, נשתמש בפרויקט שנבחר
          if (quoteClientId && selectedProject.clientId !== quoteClientId) {
            // אפשר להמשיך עם הפרויקט שנבחר - זה בסדר
            // המשתמש בחר פרויקט ספציפי, נשתמש בו
          }
        }
      }

      // אם אין projectId והיוזר לא בחר פרויקט, ננסה למצוא או ליצור פרויקט מההצעה
      if (!finalProjectId && quote.leadId) {
        const lead = quote.lead
        let clientId: string | null = null

        // אם יש לקוח קיים לליד
        if (lead?.clientId) {
          clientId = lead.clientId
        } else if (lead?.email) {
          // מחפש לקוח קיים לפי email
          const existingClient = await prisma.client.findFirst({
            where: {
              companyId: user.companyId,
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
                companyId: user.companyId,
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

        if (clientId) {
          // מחפש פרויקט קיים עם אותו לקוח
          const existingProject = await prisma.project.findFirst({
            where: {
              companyId: user.companyId,
              clientId: clientId,
            },
            orderBy: {
              createdAt: "desc",
            },
          })

          if (existingProject) {
            finalProjectId = existingProject.id
          } else {
            // יצירת פרויקט חדש מההצעה
            const newProject = await prisma.project.create({
              data: {
                companyId: user.companyId,
                clientId: clientId,
                name: quote.title || `פרויקט מ-${quote.quoteNumber}`,
                description: quote.description,
                status: "PLANNING",
                budget: quote.total,
              },
            })
            finalProjectId = newProject.id

            // הפעלת אוטומציות עבור פרויקט חדש (אם התשלום הושלם)
            if (status === "COMPLETED") {
              try {
                await AutomationEngine.processTrigger({
                  type: "project_created",
                  entityId: newProject.id,
                  entityType: "project",
                  data: {
                    projectId: newProject.id,
                    projectName: newProject.name,
                    clientId: clientId,
                    budget: newProject.budget,
                    quoteId: quote.id,
                  },
                  userId: session.user.id,
                  companyId: user.companyId,
                })
              } catch (error) {
                console.error("Error triggering project_created automations:", error)
              }
            }
          }
        }
      }
    }

    const payment = await prisma.payment.create({
      data: {
        companyId: user.companyId,
        projectId: finalProjectId,
        quoteId: quoteId || null,
        amount,
        currency,
        status,
        method,
        transactionId: transactionId || null,
        paymentReference: paymentReference || null,
        description: description || null,
        notes: notes || null,
        processedBy: session.user.id,
        paidAt:
          paidAt
            ? new Date(paidAt)
            : status === "COMPLETED"
              ? new Date()
              : null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
    })

    // אם התשלום הושלם, מעדכן את ההצעה ל-ACCEPTED ומפעיל אוטומציות
    if (status === "COMPLETED") {
      if (quoteId && quote) {
        await prisma.quote.update({
          where: { id: quoteId },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        })

        // הפעלת אוטומציות עבור הצעה שאושרה
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
              projectId: finalProjectId,
            },
            userId: session.user.id,
            companyId: user.companyId,
          })
        } catch (error) {
          console.error("Error triggering quote_accepted automations:", error)
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
              if (finalProjectId) {
                orConditions.push({ id: finalProjectId })
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
                  userId: session.user.id,
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
                    paymentId: payment.id,
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
      }

      // הפעלת אוטומציות עבור תשלום חדש
      try {
        await AutomationEngine.processTrigger({
          type: "payment_received",
          entityId: payment.id,
          entityType: "payment",
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            quoteId: quoteId || undefined,
            projectId: finalProjectId || undefined,
            transactionId: payment.transactionId || undefined,
            paymentReference: payment.paymentReference || undefined,
          },
          userId: session.user.id,
          companyId: user.companyId,
        })
      } catch (error) {
        console.error("Error triggering payment_received automations:", error)
      }
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    )
  }
}

