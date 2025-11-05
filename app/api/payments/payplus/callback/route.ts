import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPayPlusClient } from "@/lib/payplus"
import { AutomationEngine } from "@/lib/automation-engine"
import { notifyPaymentReceived } from "@/lib/notification-service"
import crypto from "crypto"

/**
 * POST /api/payments/payplus/callback
 * PayPlus IPN (Instant Payment Notification) callback handler
 */
export async function POST(req: NextRequest) {
  try {
    // PayPlus שולח את הנתונים ב-GET או POST בהתאם להגדרות
    const body = await req.json().catch(() => ({}))
    const searchParams = req.nextUrl.searchParams

    // קבלת נתוני העסקה
    const transactionUid = body.transaction_uid || searchParams.get("transaction_uid")
    const paymentRequestUid = body.payment_request_uid || searchParams.get("payment_request_uid")
    const status = body.status || searchParams.get("status")
    const amount = body.amount ? parseFloat(body.amount) : parseFloat(searchParams.get("amount") || "0")
    const approvalNum = body.approval_num || searchParams.get("approval_num")
    const moreInfo = body.more_info || searchParams.get("more_info") // quoteNumber
    const moreInfo2 = body.more_info_2 || searchParams.get("more_info_2") // quoteId

    console.log("PayPlus callback received:", {
      transactionUid,
      paymentRequestUid,
      status,
      amount,
      approvalNum,
      moreInfo,
      moreInfo2,
    })

    if (!moreInfo2) {
      console.error("Missing quote ID in callback")
      return NextResponse.json({ error: "Missing quote ID" }, { status: 400 })
    }

    // מציאת הצעה
    const quote = await prisma.quote.findUnique({
      where: { id: moreInfo2 },
      include: {
        lead: true,
        company: true,
      },
    })

    if (!quote) {
      console.error("Quote not found:", moreInfo2)
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
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

    if (!integration) {
      console.error("PayPlus integration not found for company:", quote.companyId)
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // אם יש transaction_uid, נביא את פרטי העסקה המלאים מ-PayPlus
    let transactionDetails: any = null
    if (transactionUid || paymentRequestUid) {
      try {
        const config = integration.config as any
        const client = createPayPlusClient({
          apiKey: integration.apiKey!,
          secretKey: integration.apiSecret!,
          paymentPageUid: config.paymentPageUid,
          useProduction: config.useProduction || false,
        })
        transactionDetails = await client.getTransactionStatus(transactionUid, paymentRequestUid)
      } catch (error) {
        console.error("Error fetching transaction details:", error)
      }
    }

    const isSuccess = status === "000" || status === "success" || (transactionDetails?.results?.status === "success")

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

        // קודם כל נבדוק אם יש לקוח קשור לליד (כי נוצר ב-approve)
        if (lead.clientId) {
          clientId = lead.clientId
          console.log(`Lead ${lead.id} already linked to client ${clientId}`)
        } else if (lead.email) {
          const existingClient = await prisma.client.findFirst({
            where: {
              companyId: quote.companyId,
              email: lead.email,
            },
          })

          if (existingClient) {
            clientId = existingClient.id
            console.log(`Found existing client ${clientId} by email ${lead.email}, linking to lead`)
            await prisma.lead.update({
              where: { id: lead.id },
              data: { clientId: existingClient.id },
            })
          } else {
            // רק אם אין לקוח קיים - ניצור חדש (לא אמור לקרות אם approve עבד)
            console.log(`Creating new client for lead ${lead.id} - this should not happen if approve worked`)
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
            await prisma.lead.update({
              where: { id: lead.id },
              data: { clientId: newClient.id },
            })
          }
        }

        if (clientId) {
          // מחפש פרויקט קיים - אם יש פרויקט קיים ללקוח, נשתמש בו
          // אם אין, ניצור פרויקט חדש עם השם והתקציב מההצעה
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
            console.log(`Using existing project ${projectId} for client ${clientId}`)
            
            // עדכון הפרויקט הקיים אם צריך (תקציב, שם)
            // רק אם התקציב לא מוגדר או השם לא מוגדר
            const updateData: any = {}
            if (!existingProject.budget && quote.total) {
              updateData.budget = quote.total
            }
            if (!existingProject.name && quote.title) {
              updateData.name = quote.title || `פרויקט מ-${quote.quoteNumber}`
            }
            
            if (Object.keys(updateData).length > 0) {
              await prisma.project.update({
                where: { id: existingProject.id },
                data: updateData,
              })
              console.log(`Updated project ${projectId} with data:`, updateData)
            }
          } else {
            // יצירת פרויקט חדש - עם השם מההצעה והתקציב מההצעה
            const project = await prisma.project.create({
              data: {
                companyId: quote.companyId,
                clientId: clientId,
                name: quote.title || `פרויקט מ-${quote.quoteNumber}`,
                description: quote.description,
                status: "PLANNING",
                budget: quote.total,
              },
            })
            projectId = project.id
            console.log(`Created new project ${projectId} for client ${clientId} from quote ${quote.quoteNumber}`)
            console.log(`Project name: ${project.name}, budget: ${project.budget}`)
            
            // הפעלת אוטומציות עבור פרויקט חדש
            if (isSuccess) {
              try {
                await AutomationEngine.processTrigger({
                  type: "project_created",
                  entityId: project.id,
                  entityType: "project",
                  data: {
                    projectId: project.id,
                    projectName: project.name,
                    clientId: clientId,
                    budget: project.budget,
                    quoteId: quote.id,
                  },
                  userId: null,
                  companyId: quote.companyId,
                })
              } catch (error) {
                console.error("Error triggering project_created automations:", error)
              }
            }
          }
        }
      }
    }

    // ודא שיש projectId - אם לא, ננסה ליצור פרויקט
    if (!projectId && quote.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: quote.leadId },
        include: { client: true },
      })
      
      if (lead?.clientId) {
        // אם יש לקוח לליד, נבדוק אם יש פרויקט
        const existingProject = await prisma.project.findFirst({
          where: {
            companyId: quote.companyId,
            clientId: lead.clientId,
          },
          orderBy: { createdAt: "desc" },
        })
        
        if (existingProject) {
          projectId = existingProject.id
          console.log(`Found project ${projectId} for client ${lead.clientId} as fallback`)
        } else {
          // יצירת פרויקט חדש כגיבוי
          const fallbackProject = await prisma.project.create({
            data: {
              companyId: quote.companyId,
              clientId: lead.clientId,
              name: quote.title || `פרויקט מ-${quote.quoteNumber}`,
              description: quote.description,
              status: "PLANNING",
              budget: quote.total,
            },
          })
          projectId = fallbackProject.id
          console.log(`Created fallback project ${projectId} for client ${lead.clientId}`)
        }
      }
    }

    // יצירת transaction ID
    const transactionId = transactionUid || `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`

    // חיפוש תשלום קיים לפי transaction_uid או quoteId
    const whereConditions: any[] = []
    
    // חיפוש לפי transaction ID
    if (transactionUid) {
      whereConditions.push({
        transactionId: transactionUid,
        quoteId: quote.id,
      })
    }
    
    // חיפוש לפי quoteId בלבד (גם אם אין transactionId)
    whereConditions.push({
      quoteId: quote.id,
    })
    
    let payment = await prisma.payment.findFirst({
      where: {
        OR: whereConditions,
      },
    })
    
    console.log(`[PayPlus Callback] Payment lookup for quote ${quote.quoteNumber}:`, {
      transactionUid,
      found: !!payment,
      paymentId: payment?.id,
      paymentStatus: payment?.status,
      quoteId: quote.id,
    })

    // בדיקה אם התשלום כבר הושלם בעבר - רק אם יש payment קיים
    const isAlreadyCompleted = payment ? (payment.status === "COMPLETED" && payment.paidAt) : false

    if (payment) {
      // אם התשלום כבר הושלם, לא נעדכן אותו ולא נשלח מיילים
      if (isAlreadyCompleted) {
        console.log(`Payment ${payment.id} already completed, skipping update and notifications`)
        return NextResponse.json({ 
          success: true, 
          paymentId: payment.id,
          message: "Payment already processed",
          skipped: true 
        })
      }

      // עדכון תשלום קיים - מעדכן גם projectId אם נוצר
      console.log(`Updating existing payment ${payment.id}, setting projectId to ${projectId || payment.projectId}`)
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: isSuccess ? "COMPLETED" : "FAILED",
          paidAt: isSuccess ? new Date() : null,
          transactionId: transactionUid || transactionId,
          paymentReference: approvalNum || undefined,
          projectId: projectId || payment.projectId, // עדכון projectId אם נוצר פרויקט
          quoteId: quote.id, // ודא שהתשלום מקושר להצעה
        },
      })
    } else {
      // יצירת תשלום חדש
      // אם אין projectId, ניצור פרויקט חדש (לא אמור לקרות אבל נקודת בטיחות)
      if (!projectId && quote.leadId) {
        console.warn(`No projectId found for quote ${quote.quoteNumber}, attempting to create project`)
        const lead = await prisma.lead.findUnique({
          where: { id: quote.leadId },
          include: { client: true },
        })
        
        if (lead?.clientId) {
          const emergencyProject = await prisma.project.create({
            data: {
              companyId: quote.companyId,
              clientId: lead.clientId,
              name: quote.title || `פרויקט מ-${quote.quoteNumber}`,
              description: quote.description,
              status: "PLANNING",
              budget: quote.total,
            },
          })
          projectId = emergencyProject.id
          console.log(`Created emergency project ${projectId} for payment`)
        } else {
          console.error(`Cannot create payment without projectId - lead ${quote.leadId} has no client`)
        }
      }
      
      console.log(`Creating new payment for quote ${quote.quoteNumber}, projectId: ${projectId}, amount: ${amount}`)
      payment = await prisma.payment.create({
        data: {
          companyId: quote.companyId,
          projectId: projectId, // ודא שהתשלום מקושר לפרויקט
          quoteId: quote.id,
          amount,
          currency: "ILS",
          status: isSuccess ? "COMPLETED" : "FAILED",
          method: "CREDIT_CARD",
          transactionId: transactionUid || transactionId,
          paymentReference: approvalNum || undefined,
          description: `תשלום על הצעת מחיר ${quote.quoteNumber}`,
          paidAt: isSuccess ? new Date() : null,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientId: true,
            },
          },
        },
      })
      console.log(`Created payment ${payment.id}, linked to project ${payment.project?.id} (client: ${payment.project?.clientId})`)
    }

    // בדיקה אם זה תשלום חדש (לא כבר הושלם) - נשתמש בזה למניעת כפילות
    // אם התשלום כבר הושלם, לא נבצע פעולות נוספות
    const wasNewPayment = !isAlreadyCompleted

    // אם התשלום הושלם, מעדכן את ההצעה ומפעיל אוטומציות
    // רק אם זה תשלום חדש (לא כבר הושלם)
    if (isSuccess && wasNewPayment) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      })

      // הפעלת אוטומציות עבור הצעה שאושרה - רק פעם אחת
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
            projectId: projectId,
          },
          userId: null,
          companyId: quote.companyId,
        })
      } catch (error) {
        console.error("Error triggering quote_accepted automations:", error)
      }

      // הפעלת אוטומציות עבור תשלום חדש - רק פעם אחת
      try {
        await AutomationEngine.processTrigger({
          type: "payment_received",
          entityId: payment.id,
          entityType: "payment",
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            quoteId: quote.id,
            projectId: projectId,
            transactionId: payment.transactionId,
            approvalNum: approvalNum,
          },
          userId: null,
          companyId: quote.companyId,
        })
      } catch (error) {
        console.error("Error triggering payment_received automations:", error)
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

      // שליחת התראה על תשלום שהתקבל - רק אם זה תשלום חדש (לא קיים)
      // בדיקה אם התשלום כבר קיים - אם כן, לא נשלח מייל כדי למנוע כפילות
      // נשתמש ב-wasNewPayment שכבר חושב למעלה
      
      if (wasNewPayment && isSuccess) {
        try {
          // מציאת שם הלקוח
          let clientName: string | undefined
          if (payment.project?.clientId) {
            const client = await prisma.client.findUnique({
              where: { id: payment.project.clientId },
              select: { name: true },
            })
            clientName = client?.name
          } else if (quote.leadId) {
            const lead = await prisma.lead.findUnique({
              where: { id: quote.leadId },
              include: { client: true },
            })
            clientName = lead?.client?.name || lead?.name
          }

          // מציאת הבעלים של הליד או הפרויקט לשליחת התראה
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

          // שליחת התראה למשתמש הספציפי (אם יש) + לכל המנהלים
          // רק פעם אחת - לא נשלח אם התשלום כבר הושלם בעבר
          await notifyPaymentReceived({
            userId: notificationUserId,
            companyId: quote.companyId,
            paymentId: payment.id,
            amount: payment.amount,
            quoteNumber: quote.quoteNumber,
            clientName: clientName,
            transactionId: payment.transactionId || undefined,
            sendEmailToAllManagers: true, // שולח מייל לכל המנהלים
          })
          console.log(`✅ Payment notification sent for payment ${payment.id}`)
        } catch (error) {
          console.error("Error sending payment notification:", error)
          // לא נכשל את התהליך אם ההתראה נכשלה
        }
      } else {
        console.log(`⚠️ Skipping notification - payment ${payment.id} already processed`)
      }
    }

    return NextResponse.json({ success: true, paymentId: payment.id })
  } catch (error: any) {
    console.error("Error processing PayPlus callback:", error)
    return NextResponse.json(
      { error: "Failed to process callback", details: error.message },
      { status: 500 }
    )
  }
}

// GET handler - PayPlus לפעמים שולח callbacks גם ב-GET
export async function GET(req: NextRequest) {
  return POST(req)
}

