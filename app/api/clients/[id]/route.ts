import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        projects: {
          include: {
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                method: true,
                transactionId: true,
                paymentReference: true,
                description: true,
                paidAt: true,
                createdAt: true,
                quote: {
                  select: {
                    id: true,
                    quoteNumber: true,
                    title: true,
                    total: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        budgets: {
          select: {
            id: true,
            name: true,
            amount: true,
            status: true,
          },
        },
        files: {
          select: {
            id: true,
            name: true,
            path: true,
            size: true,
            mimeType: true,
            createdAt: true,
            entityType: true,
            entityId: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            position: true,
            project: {
              select: {
                name: true,
              },
            },
            assignee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { position: "asc" },
            { createdAt: "desc" },
          ],
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // מציאת תשלומים נוספים שקשורים ללקוח דרך לידים שהומרו
    // תשלומים שקשורים להצעות של לידים שקשורים ללקוח הזה
    const leads = await prisma.lead.findMany({
      where: {
        clientId: client.id,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
      },
    })

    const leadIds = leads.map(l => l.id)

    // מציאת הצעות של הלידים האלה
    // גם הצעות של לידים עם אותו שם/אימייל/טלפון (למקרה שהליד לא הומר אבל יש אותו לקוח)
    const whereConditions: any[] = []
    
    if (leadIds.length > 0) {
      whereConditions.push({
        leadId: { in: leadIds },
        companyId: session.user.companyId,
      })
    }
    
    // גם הצעות של לידים עם פרטים זהים (גיבוי)
    if (client.email || client.phone || client.name) {
      const leadOrConditions: any[] = []
      if (client.email) leadOrConditions.push({ email: client.email })
      if (client.phone) leadOrConditions.push({ phone: client.phone })
      if (client.name) leadOrConditions.push({ name: client.name })
      
      if (leadOrConditions.length > 0) {
        whereConditions.push({
          lead: {
            OR: leadOrConditions,
          },
          companyId: session.user.companyId,
        })
      }
    }
    
    const quotes = whereConditions.length > 0 ? await prisma.quote.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
        quoteNumber: true,
        leadId: true,
      },
    }) : []

    const quoteIds = quotes.map(q => q.id)
    
    console.log(`[Client ${client.id}] Found ${leads.length} leads, ${quotes.length} quotes with IDs:`, quoteIds)
    
    // בדיקה ישירה - האם יש תשלומים במסד הנתונים עבור ההצעה הזו
    if (quoteIds.length > 0) {
      const directPaymentCheck = await prisma.payment.findFirst({
        where: {
          quoteId: { in: quoteIds },
          companyId: session.user.companyId,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          quoteId: true,
          projectId: true,
          transactionId: true,
        },
      })
      console.log(`[Client ${client.id}] Direct payment check for quotes:`, directPaymentCheck)
    }
    
    // מציאת תשלומים שקשורים להצעות האלה
    // נכלול את כל התשלומים, גם אם יש להם projectId
    const allPaymentsForQuotes = quoteIds.length > 0 ? await prisma.payment.findMany({
      where: {
        quoteId: { in: quoteIds },
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        transactionId: true,
        paymentReference: true,
        description: true,
        paidAt: true,
        createdAt: true,
        projectId: true,
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
    }) : []
    
    console.log(`[Client ${client.id}] Found ${allPaymentsForQuotes.length} payments for quotes`)

    // גם תשלומים שקשורים לפרויקטים של הלקוח (אפילו אם הם לא קשורים להצעות)
    const projectIds = client.projects.map(p => p.id)
    const paymentsForProjects = projectIds.length > 0 ? await prisma.payment.findMany({
      where: {
        projectId: { in: projectIds },
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        transactionId: true,
        paymentReference: true,
        description: true,
        paidAt: true,
        createdAt: true,
        projectId: true,
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
    }) : []
    
    console.log(`[Client ${client.id}] Found ${paymentsForProjects.length} payments for projects`)

    // איחוד כל התשלומים
    const allPaymentsMap = new Map()
    
    // הוספת תשלומים מפרויקטים
    paymentsForProjects.forEach(p => {
      allPaymentsMap.set(p.id, {
        ...p,
        project: {
          id: p.projectId,
          name: client.projects.find(pr => pr.id === p.projectId)?.name || "פרויקט",
        },
      })
    })
    
    // הוספת תשלומים מהצעות (שאינם כבר בפרויקטים)
    allPaymentsForQuotes.forEach(p => {
      if (!allPaymentsMap.has(p.id)) {
        // נבדוק אם יש פרויקט לתשלום הזה
        const projectForPayment = p.projectId 
          ? client.projects.find(pr => pr.id === p.projectId)
          : null
        
        allPaymentsMap.set(p.id, {
          ...p,
          project: {
            id: p.projectId,
            name: projectForPayment?.name || (p.projectId ? "פרויקט" : "תשלום ישיר"),
          },
        })
      }
    })
    
    const additionalPayments = Array.from(allPaymentsMap.values())

    // הוספת התשלומים הנוספים ישירות לאובייקט הלקוח
    // נכלול רק תשלומים שלא כבר כלולים בפרויקטים (למניעת כפילויות)
    const projectPaymentIds = new Set(
      client.projects.flatMap(p => (p.payments || []).map(pay => pay.id))
    )
    
    const uniqueAdditionalPayments = additionalPayments.filter(p => !projectPaymentIds.has(p.id))
    
    console.log(`[Client ${client.id}] Total unique additional payments: ${uniqueAdditionalPayments.length}`)
    console.log(`[Client ${client.id}] Payments from projects: ${client.projects.flatMap(p => p.payments || []).length}`)
    
    const clientWithPayments = {
      ...client,
      directPayments: uniqueAdditionalPayments,
    }

    return NextResponse.json(clientWithPayments)
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone, address, notes, status } = body

    const client = await prisma.client.update({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get client with related data counts
    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            projects: true,
            budgets: true,
            files: true,
            tasks: true,
            leads: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Delete all projects associated with this client (this will cascade delete project data)
    // First, delete all project-related data
    for (const project of client.projects) {
      // Delete files associated with the project
      await prisma.file.deleteMany({
        where: {
          projectId: project.id,
          companyId: session.user.companyId,
        },
      })

      // Delete payments associated with the project
      await prisma.payment.deleteMany({
        where: {
          projectId: project.id,
          companyId: session.user.companyId,
        },
      })

      // Delete budgets associated with the project
      await prisma.budget.deleteMany({
        where: {
          projectId: project.id,
          companyId: session.user.companyId,
        },
      })

      // Delete tasks associated with the project (will cascade delete task files)
      await prisma.task.deleteMany({
        where: {
          projectId: project.id,
          companyId: session.user.companyId,
        },
      })
    }

    // Delete all projects
    await prisma.project.deleteMany({
      where: {
        clientId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Delete budgets associated with the client (not through projects)
    await prisma.budget.deleteMany({
      where: {
        clientId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Delete files associated with the client
    await prisma.file.deleteMany({
      where: {
        clientId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Delete tasks associated with the client (not through projects)
    await prisma.task.deleteMany({
      where: {
        clientId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Finally, delete the client itself
    await prisma.client.delete({
      where: {
        id: params.id,
      },
    })

    console.log(`✅ Client ${params.id} deleted successfully with all related data`)

    return NextResponse.json({ 
      success: true,
      message: "Client deleted successfully",
      deletedData: {
        projects: client._count.projects,
        budgets: client._count.budgets,
        files: client._count.files,
        tasks: client._count.tasks,
        leads: client._count.leads,
      },
    })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

