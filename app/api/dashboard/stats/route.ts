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

    const companyId = session.user.companyId

    // Get stats
    const [
      totalLeads,
      newLeads7Days,
      totalClients,
      activeClients,
      totalProjects,
      openProjects,
      totalBudgets,
      pendingBudgets,
      myTasks,
      upcomingEvents,
      recentNotifications,
    ] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.client.count({ where: { companyId } }),
      prisma.client.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.project.count({ where: { companyId } }),
      prisma.project.count({
        where: {
          companyId,
          status: { in: ["PLANNING", "IN_PROGRESS"] },
        },
      }),
      prisma.budget.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      prisma.budget.aggregate({
        where: { companyId, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.task.findMany({
        where: {
          companyId,
          assigneeId: session.user.id,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true, email: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          companyId,
          startTime: { gte: new Date() },
        },
        take: 3,
        orderBy: { startTime: 'asc' },
      }),
      prisma.notification.findMany({
        where: {
          companyId,
          userId: session.user.id,
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      leads: {
        total: totalLeads,
        new7Days: newLeads7Days,
      },
      clients: {
        total: totalClients,
        active: activeClients,
      },
      projects: {
        total: totalProjects,
        open: openProjects,
      },
      budgets: {
        total: totalBudgets._sum.amount || 0,
        pending: pendingBudgets._sum.amount || 0,
      },
      myTasks,
      upcomingEvents,
      recentNotifications,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

