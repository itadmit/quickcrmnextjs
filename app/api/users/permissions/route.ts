import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת הרשאות המשתמש הנוכחי
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // אם המשתמש הוא ADMIN או SUPER_ADMIN, יש לו גישה לכל דבר
    if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
      // החזר כל ההרשאות כפעילות
      return NextResponse.json({
        permissions: {
          dashboard: true,
          tasks: true,
          calendar: true,
          notifications: true,
          reports: true,
          leads: true,
          clients: true,
          projects: true,
          quotes: true,
          payments: true,
          settings: true,
          integrations: true,
          automations: true,
        },
      })
    }

    // קבלת הרשאות המשתמש
    const permissions = await prisma.userPermission.findMany({
      where: {
        userId: session.user.id,
        allowed: true,
      },
      select: {
        permission: true,
      },
    })

    // המרה למערך של שמות הרשאות
    const permissionMap: Record<string, boolean> = {}
    permissions.forEach((perm) => {
      permissionMap[perm.permission] = true
    })

    // הרשאות נדרשות תמיד פעילות
    permissionMap.dashboard = true
    permissionMap.notifications = true

    return NextResponse.json({ permissions: permissionMap })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

