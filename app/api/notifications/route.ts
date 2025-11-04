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

    return NextResponse.json(notifications)
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

