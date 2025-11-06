import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { triggerAutomation } from "@/lib/automation-engine"
import { notifyTaskAssigned, notifyTaskCompleted } from "@/lib/notification-service"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const myTasks = searchParams.get('my') === 'true'

    const tasks = await prisma.task.findMany({
      where: {
        companyId: session.user.companyId,
        ...(myTasks && { assigneeId: session.user.id }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, projectId, clientId, leadId, dueDate, priority, status, skipEmail } = body

    const task = await prisma.task.create({
      data: {
        companyId: session.user.companyId,
        title,
        description,
        projectId,
        clientId,
        leadId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "NORMAL",
        status: status || "TODO",
        assigneeId: session.user.id,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    })

    // Send notification (in-app + email) - רק אם לא מדלגים על מייל
    if (!skipEmail) {
      await notifyTaskAssigned({
        userId: task.assigneeId || session.user.id,
        companyId: session.user.companyId,
        taskId: task.id,
        taskTitle: task.title,
        assigneeName: task.assignee?.name || session.user.name || 'Unknown',
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('he-IL') : undefined,
      })
    } else {
      // רק התראה בתוך המערכת, ללא מייל
      await prisma.notification.create({
        data: {
          userId: task.assigneeId || session.user.id,
          companyId: session.user.companyId,
          type: 'task',
          title: 'משימה חדשה',
          message: task.title,
          entityType: 'task',
          entityId: task.id,
          isRead: false,
        },
      })
    }

    // Trigger automation for task creation
    await triggerAutomation(
      'task_created',
      task.id,
      'task',
      task,
      session.user.id,
      session.user.companyId
    )

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
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
    const { id, status, assigneeId, ...updateData } = body

    // Get old task data to check for status and assignee changes
    const oldTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!oldTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // בדיקה שהמשימה שייכת לחברה
    if (oldTask.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const task = await prisma.task.update({
      where: {
        id,
        companyId: session.user.companyId,
      },
      data: {
        ...updateData,
        ...(status && { status }),
        ...(assigneeId !== undefined && { assigneeId }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    })

    // אם המשימה הועברה למישהו אחר - שלח מייל
    if (assigneeId !== undefined && assigneeId !== oldTask.assigneeId && assigneeId) {
      // בדיקה שהמשתמש החדש שייך לחברה
      const newAssignee = await prisma.user.findFirst({
        where: {
          id: assigneeId,
          companyId: session.user.companyId,
        },
        select: {
          name: true,
          email: true,
        },
      })

      if (newAssignee) {
        // שלח מייל למקבל המשימה החדש
        await notifyTaskAssigned({
          userId: assigneeId,
          companyId: session.user.companyId,
          taskId: task.id,
          taskTitle: task.title,
          assigneeName: newAssignee.name,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('he-IL') : undefined,
        })
      }
    }

    // Trigger automation and notification if task was completed
    if (status && oldTask.status !== 'DONE' && status === 'DONE') {
      // Send notification
      await notifyTaskCompleted({
        userId: task.assigneeId || session.user.id,
        companyId: session.user.companyId,
        taskId: task.id,
        taskTitle: task.title,
      })

      // Trigger automation
      await triggerAutomation(
        'task_completed',
        task.id,
        'task',
        task,
        session.user.id,
        session.user.companyId
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

