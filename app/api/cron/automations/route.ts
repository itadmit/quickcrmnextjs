import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AutomationEngine } from "@/lib/automation-engine"

/**
 * Cron Job for running periodic automations
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, or external cron)
 * 
 * Add this to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/automations",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'change-this-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🤖 Starting automated automation checks...')

    // Get all active automations
    const automations = await prisma.automation.findMany({
      where: {
        isActive: true,
      },
      include: {
        company: true,
        creator: true,
      },
    })

    console.log(`Found ${automations.length} active automations`)

    // Process scheduled/periodic automations
    // For now, this is a placeholder for future scheduled automations
    // You can add time-based triggers here (e.g., daily digest, weekly reports)

    const processedAutomations: string[] = []

    // Example: Check for scheduled tasks that need notifications
    const overdueTasksResult = await checkOverdueTasks()
    if (overdueTasksResult.count > 0) {
      processedAutomations.push(`Notified ${overdueTasksResult.count} overdue tasks`)
    }

    // Example: Check for upcoming meetings that need reminders
    const upcomingMeetingsResult = await checkUpcomingMeetings()
    if (upcomingMeetingsResult.count > 0) {
      processedAutomations.push(`Sent ${upcomingMeetingsResult.count} meeting reminders`)
    }

    console.log('✅ Automation check completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      automationsChecked: automations.length,
      actionsPerformed: processedAutomations,
    })
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

/**
 * Check for overdue tasks and send notifications
 */
async function checkOverdueTasks() {
  try {
    const now = new Date()
    
    // Find tasks that are overdue and not completed
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: {
          not: 'DONE',
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      take: 50, // Limit to avoid overwhelming the system
    })

    console.log(`Found ${overdueTasks.length} overdue tasks`)

    // Send notifications for overdue tasks
    for (const task of overdueTasks) {
      if (task.assignee) {
        await prisma.notification.create({
          data: {
            userId: task.assignee.id,
            companyId: task.companyId,
            type: 'reminder',
            title: 'משימה באיחור',
            message: `המשימה "${task.title}" באיחור - תאריך יעד: ${task.dueDate?.toLocaleDateString('he-IL')}`,
            entityType: 'task',
            entityId: task.id,
            isRead: false,
          },
        })
      }
    }

    return { count: overdueTasks.length }
  } catch (error) {
    console.error('Error checking overdue tasks:', error)
    return { count: 0 }
  }
}

/**
 * Check for upcoming meetings and send reminders
 */
async function checkUpcomingMeetings() {
  try {
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    // Find meetings starting in the next hour
    const upcomingMeetings = await prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lte: oneHourFromNow,
        },
      },
      take: 50,
    })

    console.log(`Found ${upcomingMeetings.length} upcoming meetings`)

    // Send reminders for upcoming meetings
    for (const meeting of upcomingMeetings) {
      // Check if we already sent a reminder for this meeting
      const existingReminder = await prisma.notification.findFirst({
        where: {
          entityType: 'event',
          entityId: meeting.id,
          type: 'reminder',
          createdAt: {
            gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Within last 2 hours
          },
        },
      })

      if (!existingReminder) {
        await prisma.notification.create({
          data: {
            userId: meeting.createdBy,
            companyId: meeting.companyId,
            type: 'reminder',
            title: 'תזכורת: פגישה מתקרבת',
            message: `הפגישה "${meeting.title}" מתחילה בעוד שעה - ${meeting.startTime.toLocaleTimeString('he-IL')}`,
            entityType: 'event',
            entityId: meeting.id,
            isRead: false,
          },
        })
      }
    }

    return { count: upcomingMeetings.length }
  } catch (error) {
    console.error('Error checking upcoming meetings:', error)
    return { count: 0 }
  }
}

