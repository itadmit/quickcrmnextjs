import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - מחיקת משתמש
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // רק ADMIN יכול למחוק משתמשים
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // לא ניתן למחוק את עצמך
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // בדיקה שהמשתמש שייך לאותה חברה
    const userToDelete = await prisma.user.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: {
            ownedLeads: true,
            ownedClients: true,
            assignedTasks: true,
            createdAutomations: true,
            notifications: true,
            sentInvitations: true,
            permissions: true,
          },
        },
      },
    })

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // לא ניתן למחוק ADMIN אחר
    if (userToDelete.role === "ADMIN" || userToDelete.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 400 }
      )
    }

    // מחיקת כל הנתונים הקשורים למשתמש
    // 1. מחיקת הרשאות (UserPermission) - יש cascade delete
    // 2. עדכון לידים - הסרת owner
    await prisma.lead.updateMany({
      where: {
        ownerId: params.id,
        companyId: session.user.companyId,
      },
      data: {
        ownerId: null,
      },
    })

    // 3. עדכון לקוחות - הסרת owner
    await prisma.client.updateMany({
      where: {
        ownerId: params.id,
        companyId: session.user.companyId,
      },
      data: {
        ownerId: null,
      },
    })

    // 4. עדכון משימות - הסרת assignee
    await prisma.task.updateMany({
      where: {
        assigneeId: params.id,
        companyId: session.user.companyId,
      },
      data: {
        assigneeId: null,
      },
    })

    // 5. מחיקת אוטומציות שנוצרו על ידי המשתמש
    await prisma.automation.deleteMany({
      where: {
        createdBy: params.id,
        companyId: session.user.companyId,
      },
    })

    // 6. מחיקת התראות
    await prisma.notification.deleteMany({
      where: {
        userId: params.id,
        companyId: session.user.companyId,
      },
    })

    // 7. עדכון הזמנות שנשלחו על ידי המשתמש
    await prisma.invitation.updateMany({
      where: {
        invitedBy: params.id,
        companyId: session.user.companyId,
      },
      data: {
        invitedBy: session.user.id, // העברת הזמנות למנהל
      },
    })

    // 8. מחיקת הזמנה שקשורה למשתמש (אם יש)
    await prisma.invitation.deleteMany({
      where: {
        userId: params.id,
        companyId: session.user.companyId,
      },
    })

    // 9. מחיקת audit logs
    await prisma.auditLog.deleteMany({
      where: {
        userId: params.id,
        companyId: session.user.companyId,
      },
    })

    // 10. מחיקת המשתמש עצמו (UserPermission ימחק אוטומטית בגלל cascade)
    await prisma.user.delete({
      where: {
        id: params.id,
      },
    })

    console.log(`✅ User ${params.id} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
      deletedData: {
        ownedLeads: userToDelete._count.ownedLeads,
        ownedClients: userToDelete._count.ownedClients,
        assignedTasks: userToDelete._count.assignedTasks,
        createdAutomations: userToDelete._count.createdAutomations,
        notifications: userToDelete._count.notifications,
        sentInvitations: userToDelete._count.sentInvitations,
        permissions: userToDelete._count.permissions,
      },
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

