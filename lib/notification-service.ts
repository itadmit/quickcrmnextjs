import { prisma } from './prisma'
import { sendEmail as sendEmailViaGmail, emailTemplates } from './email'

/**
 * Unified Notification Service
 * Sends both in-app notifications AND email notifications
 */

export interface NotificationData {
  userId: string
  companyId: string
  type: 'task' | 'lead' | 'client' | 'project' | 'meeting' | 'automation' | 'system' | 'reminder' | 'document'
  title: string
  message: string
  entityType?: string
  entityId?: string
  // Email specific
  sendEmail?: boolean // Should we also send an email?
  emailSubject?: string // Custom email subject (optional)
  emailBody?: string // Custom email HTML body (optional)
}

/**
 * Send a notification (in-app + optional email)
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  try {
    // 1. Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        isRead: false,
      },
    })

    console.log(`✅ In-app notification created: ${notification.id}`)

    // 2. Send email notification if requested
    if (data.sendEmail !== false) {
      await sendEmailNotification(data)
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    throw error
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(data: NotificationData): Promise<void> {
  try {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, name: true },
    })

    if (!user?.email) {
      console.warn(`User ${data.userId} has no email, skipping email notification`)
      return
    }

    // Prepare email content
    const subject = data.emailSubject || data.title
    const htmlBody = data.emailBody || `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>${data.title}</h2>
        <p>${data.message}</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          התראה זו נשלחה מ-QuickCRM ב-${new Date().toLocaleString('he-IL')}
        </p>
      </div>
    `

    await sendEmailViaGmail({
      to: user.email,
      subject,
      html: htmlBody,
    })

    console.log(`📧 Email notification sent to ${user.email}`)
  } catch (error) {
    console.error('Error sending email notification:', error)
    // Don't throw - we don't want to fail the whole notification if email fails
  }
}

/**
 * Pre-built notification functions for common events
 */

export async function notifyTaskAssigned(params: {
  userId: string
  companyId: string
  taskId: string
  taskTitle: string
  assigneeName: string
  dueDate?: string
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'task',
    title: 'משימה חדשה הוקצתה לך',
    message: `${params.taskTitle}${params.dueDate ? ` - תאריך יעד: ${params.dueDate}` : ''}`,
    entityType: 'task',
    entityId: params.taskId,
    sendEmail: true,
    emailSubject: `משימה חדשה: ${params.taskTitle}`,
    emailBody: emailTemplates.taskAssigned(params.taskTitle, params.assigneeName, params.dueDate).html,
  })
}

export async function notifyLeadCreated(params: {
  userId: string
  companyId: string
  leadId: string
  leadName: string
  leadEmail: string
  source: string
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'lead',
    title: 'ליד חדש נוצר',
    message: `${params.leadName} מ-${params.source}`,
    entityType: 'lead',
    entityId: params.leadId,
    sendEmail: true,
    emailSubject: `ליד חדש: ${params.leadName}`,
    emailBody: emailTemplates.leadCreated(params.leadName, params.leadEmail, params.source).html,
  })
}

export async function notifyMeetingScheduled(params: {
  userId: string
  companyId: string
  eventId: string
  title: string
  startTime: string
  location: string
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'meeting',
    title: 'פגישה חדשה נקבעה',
    message: `${params.title} ב-${params.startTime}`,
    entityType: 'event',
    entityId: params.eventId,
    sendEmail: true,
    emailSubject: `פגישה חדשה: ${params.title}`,
    emailBody: emailTemplates.meetingReminder(params.title, params.startTime, params.location).html,
  })
}

export async function notifyTaskCompleted(params: {
  userId: string
  companyId: string
  taskId: string
  taskTitle: string
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'task',
    title: 'משימה הושלמה',
    message: `${params.taskTitle} הושלמה בהצלחה`,
    entityType: 'task',
    entityId: params.taskId,
    sendEmail: false, // Usually don't need email for task completion
  })
}

export async function notifyClientAdded(params: {
  userId: string
  companyId: string
  clientId: string
  clientName: string
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'client',
    title: 'לקוח חדש נוסף',
    message: `${params.clientName} נוסף כלקוח חדש`,
    entityType: 'client',
    entityId: params.clientId,
    sendEmail: true,
  })
}

export async function notifyAutomationFailed(params: {
  userId: string
  companyId: string
  automationId: string
  automationName: string
  error: string
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'automation',
    title: 'אוטומציה נכשלה',
    message: `האוטומציה "${params.automationName}" נכשלה: ${params.error}`,
    entityType: 'automation',
    entityId: params.automationId,
    sendEmail: true,
  })
}

export async function notifySystemAlert(params: {
  userId: string
  companyId: string
  title: string
  message: string
  sendEmail?: boolean
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'system',
    title: params.title,
    message: params.message,
    sendEmail: params.sendEmail ?? true,
  })
}

