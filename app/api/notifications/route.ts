import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        companyId: session.user.companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent notifications
    })

    // הוספת פרטים נוספים על ה-entities
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const enriched: any = {
          ...notification,
          entityDetails: null,
        }

        // אם יש entityType ו-entityId, נטען פרטים נוספים
        if (notification.entityType && notification.entityId) {
          try {
            switch (notification.entityType) {
              case 'lead':
                const lead = await prisma.lead.findUnique({
                  where: { id: notification.entityId },
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    source: true,
                    status: true,
                  },
                })
                if (lead) {
                  enriched.entityDetails = lead
                }
                break
              case 'quote':
                const quote = await prisma.quote.findUnique({
                  where: { id: notification.entityId },
                  select: {
                    id: true,
                    quoteNumber: true,
                    title: true,
                    total: true,
                    status: true,
                  },
                })
                if (quote) {
                  enriched.entityDetails = quote
                }
                break
              case 'payment':
                const payment = await prisma.payment.findUnique({
                  where: { id: notification.entityId },
                  select: {
                    id: true,
                    amount: true,
                    status: true,
                    transactionId: true,
                  },
                })
                if (payment) {
                  enriched.entityDetails = payment
                }
                break
              case 'client':
                const client = await prisma.client.findUnique({
                  where: { id: notification.entityId },
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                })
                if (client) {
                  enriched.entityDetails = client
                }
                break
              case 'project':
                const project = await prisma.project.findUnique({
                where: { id: notification.entityId },
                select: {
                  id: true,
                  name: true,
                  status: true,
                  budget: true,
                },
              })
              if (project) {
                enriched.entityDetails = project
              }
              break
            }
          } catch (error) {
            console.error(`Error fetching entity details for ${notification.entityType}:`, error)
          }
        }

        return enriched
      })
    )

    return NextResponse.json(enrichedNotifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, isRead, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read for current user
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          companyId: session.user.companyId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      })
      
      return NextResponse.json({ success: true, message: "All notifications marked as read" })
    }

    // Update single notification
    if (id) {
      await prisma.notification.update({
        where: {
          id,
          userId: session.user.id,
          companyId: session.user.companyId,
        },
        data: {
          isRead,
        },
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all notifications for current user
    await prisma.notification.deleteMany({
      where: {
        userId: session.user.id,
        companyId: session.user.companyId,
      },
    })
    
    return NextResponse.json({ success: true, message: "All notifications deleted" })
  } catch (error) {
    console.error("Error deleting notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

