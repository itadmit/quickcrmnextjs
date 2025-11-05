import { prisma } from './prisma'
import { sendEmail as sendEmailViaGmail, emailTemplates, getEmailTemplate } from './email'

/**
 * Unified Notification Service
 * Sends both in-app notifications AND email notifications
 */

export interface NotificationData {
  userId: string
  companyId: string
  type: 'task' | 'lead' | 'client' | 'project' | 'meeting' | 'automation' | 'system' | 'reminder' | 'document' | 'quote' | 'payment'
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
    const htmlBody = data.emailBody || getEmailTemplate({
      title: data.title,
      content: `
        <p>${data.message}</p>
      `,
      footer: `התראה זו נשלחה מ-QuickCRM ב-${new Date().toLocaleString('he-IL')}`,
    })

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

export async function notifyQuoteApproved(params: {
  userId: string
  companyId: string
  quoteId: string
  quoteNumber: string
  leadName: string
  total: number
}) {
  await sendNotification({
    userId: params.userId,
    companyId: params.companyId,
    type: 'quote',
    title: 'הצעה אושרה',
    message: `הצעה ${params.quoteNumber} של ${params.leadName} אושרה. סכום: ₪${params.total.toLocaleString('he-IL')}`,
    entityType: 'quote',
    entityId: params.quoteId,
    sendEmail: true,
    emailSubject: `הצעה אושרה: ${params.quoteNumber}`,
    emailBody: emailTemplates.quoteApproved(params.quoteNumber, params.leadName, params.total).html,
  })
}

export async function notifyPaymentReceived(params: {
  userId: string | null // יכול להיות null אם זה callback
  companyId: string
  paymentId: string
  amount: number
  quoteNumber?: string
  clientName?: string
  transactionId?: string
  sendEmailToAllManagers?: boolean // שליחה לכל המנהלים
}) {
  // אם יש userId, נשלח התראה למשתמש הספציפי
  if (params.userId) {
    await sendNotification({
      userId: params.userId,
      companyId: params.companyId,
      type: 'payment',
      title: 'תשלום התקבל',
      message: `תשלום מקדמה בסך ₪${params.amount.toLocaleString('he-IL')} התקבל${params.quoteNumber ? ` עבור הצעה ${params.quoteNumber}` : ''}${params.transactionId ? `. מספר אישור: ${params.transactionId}` : ''}`,
      entityType: 'payment',
      entityId: params.paymentId,
      sendEmail: true,
      emailSubject: `תשלום מקדמה התקבל: ₪${params.amount.toLocaleString('he-IL')}`,
      emailBody: emailTemplates.paymentReceived(params.amount, params.quoteNumber, params.clientName, params.transactionId).html,
    })
  }

  // אם צריך לשלוח לכל המנהלים (תמיד נשלח גם אם אין userId)
  if (params.sendEmailToAllManagers || !params.userId) {
    await sendPaymentNotificationToManagers(params)
  }
}

/**
 * Send payment notification to all managers/admins in the company
 */
async function sendPaymentNotificationToManagers(params: {
  companyId: string
  amount: number
  quoteNumber?: string
  clientName?: string
  transactionId?: string
}) {
  try {
    // מציאת כל המנהלים והמנהלים בחברה
    const managers = await prisma.user.findMany({
      where: {
        companyId: params.companyId,
        role: {
          in: ['ADMIN', 'MANAGER'],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // שליחת התראה לכל המנהלים
    for (const manager of managers) {
      if (manager.email) {
        try {
          await sendEmailViaGmail({
            to: manager.email,
            subject: `💰 תשלום חדש התקבל: ₪${params.amount.toLocaleString('he-IL')}`,
            html: emailTemplates.paymentReceived(params.amount, params.quoteNumber, params.clientName, params.transactionId).html,
          })
          console.log(`📧 Payment notification email sent to manager ${manager.email}`)
        } catch (error) {
          console.error(`Error sending email to manager ${manager.email}:`, error)
        }
      }

      // יצירת התראה במערכת
      try {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            companyId: params.companyId,
            type: 'payment',
            title: 'תשלום התקבל',
            message: `תשלום מקדמה בסך ₪${params.amount.toLocaleString('he-IL')} התקבל${params.quoteNumber ? ` עבור הצעה ${params.quoteNumber}` : ''}${params.clientName ? ` מלקוח ${params.clientName}` : ''}${params.transactionId ? `. מספר אישור: ${params.transactionId}` : ''}`,
            entityType: 'payment',
            entityId: params.transactionId || undefined,
            isRead: false,
          },
        })
      } catch (error) {
        console.error(`Error creating notification for manager ${manager.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error sending payment notifications to managers:', error)
  }
}

