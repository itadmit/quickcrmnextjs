import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת הרשאות של משתמש ספציפי
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // רק ADMIN יכול לראות הרשאות
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // בדיקה שהמשתמש שייך לאותה חברה
    const user = await prisma.user.findFirst({
      where: {
        id: params.userId,
        companyId: session.user.companyId,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // אם המשתמש הוא ADMIN או SUPER_ADMIN, יש לו כל ההרשאות
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
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
        userId: params.userId,
      },
      select: {
        permission: true,
        allowed: true,
      },
    })

    // המרה לאובייקט
    const permissionMap: Record<string, boolean> = {}
    permissions.forEach((perm) => {
      permissionMap[perm.permission] = perm.allowed
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

// PATCH - עדכון הרשאות של משתמש
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // רק ADMIN יכול לעדכן הרשאות
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { permissions } = body

    // בדיקה שהמשתמש שייך לאותה חברה
    const user = await prisma.user.findFirst({
      where: {
        id: params.userId,
        companyId: session.user.companyId,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // לא ניתן לשנות הרשאות של ADMIN
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot modify permissions for admin users" },
        { status: 400 }
      )
    }

    // עדכון או יצירת הרשאות
    const permissionEntries = Object.entries(permissions || {})
    
    await Promise.all(
      permissionEntries.map(([permission, allowed]) => {
        // לא מעדכנים הרשאות נדרשות
        if (permission === "dashboard" || permission === "notifications") {
          return Promise.resolve()
        }

        return prisma.userPermission.upsert({
          where: {
            userId_permission: {
              userId: params.userId,
              permission: permission,
            },
          },
          update: {
            allowed: allowed as boolean,
          },
          create: {
            userId: params.userId,
            permission: permission,
            allowed: allowed as boolean,
          },
        })
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user permissions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

