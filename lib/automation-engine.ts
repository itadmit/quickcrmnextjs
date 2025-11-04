import { prisma } from './prisma'
import { sendEmail as sendEmailViaGmail, parseEmailTemplate } from './email'

// Types for automation system
export type TriggerType = 
  | 'lead_created'
  | 'lead_status_changed'
  | 'task_completed'
  | 'task_created'
  | 'meeting_scheduled'
  | 'client_added'

export type ActionType =
  | 'send_email'
  | 'create_task'
  | 'send_notification'
  | 'update_status'
  | 'add_tag'

export interface TriggerData {
  type: TriggerType
  entityId: string
  entityType: string
  data: any
  userId: string
  companyId: string
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface AutomationAction {
  type: ActionType
  params: {
    emailTemplateId?: string
    taskTitle?: string
    taskDescription?: string
    taskPriority?: string
    notificationMessage?: string
    statusValue?: string
    tagName?: string
  }
}

/**
 * Main Automation Engine
 * Processes triggers and executes matching automations
 */
export class AutomationEngine {
  /**
   * Process a trigger event
   */
  static async processTrigger(triggerData: TriggerData): Promise<void> {
    try {
      console.log('🔔 Processing trigger:', triggerData.type, 'for entity:', triggerData.entityId)

      // Find all active automations that match this trigger
      const automations = await prisma.automation.findMany({
        where: {
          companyId: triggerData.companyId,
          isActive: true,
          trigger: {
            path: ['type'],
            equals: triggerData.type,
          },
        },
      })

      console.log(`Found ${automations.length} active automations for trigger: ${triggerData.type}`)

      // Process each automation
      for (const automation of automations) {
        await this.executeAutomation(automation, triggerData)
      }
    } catch (error) {
      console.error('Error processing trigger:', error)
      throw error
    }
  }

  /**
   * Execute a single automation
   */
  private static async executeAutomation(
    automation: any,
    triggerData: TriggerData
  ): Promise<void> {
    try {
      console.log(`🤖 Executing automation: ${automation.name} (${automation.id})`)

      // Check conditions
      const conditionsMet = await this.checkConditions(
        automation.conditions as AutomationCondition[] | null,
        triggerData
      )

      if (!conditionsMet) {
        console.log(`⏭️  Conditions not met for automation: ${automation.name}`)
        return
      }

      console.log(`✅ Conditions met for automation: ${automation.name}`)

      // Execute actions
      const actions = automation.actions as AutomationAction[]
      for (const action of actions) {
        await this.executeAction(action, triggerData, automation)
      }

      // Log successful execution
      await this.logExecution(automation.id, triggerData, 'success')

      console.log(`✨ Successfully executed automation: ${automation.name}`)
    } catch (error) {
      console.error(`Error executing automation ${automation.id}:`, error)
      
      // Log failed execution
      await this.logExecution(automation.id, triggerData, 'failed', error)
    }
  }

  /**
   * Check if conditions are met
   */
  private static async checkConditions(
    conditions: AutomationCondition[] | null,
    triggerData: TriggerData
  ): Promise<boolean> {
    // If no conditions, always proceed
    if (!conditions || conditions.length === 0) {
      return true
    }

    // Check each condition
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(triggerData.data, condition.field)
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value)

      if (!conditionMet) {
        return false
      }
    }

    return true
  }

  /**
   * Get field value from data object
   */
  private static getFieldValue(data: any, field: string): any {
    // Support nested fields with dot notation (e.g., "stage.name")
    const parts = field.split('.')
    let value = data

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Evaluate a condition
   */
  private static evaluateCondition(
    fieldValue: any,
    operator: string,
    expectedValue: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue
      
      case 'not_equals':
        return fieldValue !== expectedValue
      
      case 'contains':
        return String(fieldValue).includes(String(expectedValue))
      
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue)
      
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue)
      
      default:
        return false
    }
  }

  /**
   * Execute an action
   */
  private static async executeAction(
    action: AutomationAction,
    triggerData: TriggerData,
    automation: any
  ): Promise<void> {
    console.log(`🎬 Executing action: ${action.type}`)

    switch (action.type) {
      case 'send_email':
        await this.sendEmail(action, triggerData, automation)
        break
      
      case 'create_task':
        await this.createTask(action, triggerData, automation)
        break
      
      case 'send_notification':
        await this.sendNotification(action, triggerData, automation)
        break
      
      case 'update_status':
        await this.updateStatus(action, triggerData)
        break
      
      case 'add_tag':
        await this.addTag(action, triggerData)
        break
      
      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  /**
   * Action: Send Email
   */
  private static async sendEmail(
    action: AutomationAction,
    triggerData: TriggerData,
    automation: any
  ): Promise<void> {
    const { emailTemplateId } = action.params

    if (!emailTemplateId) {
      console.warn('Email action missing template ID')
      return
    }

    // Get email template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: emailTemplateId },
    })

    if (!template) {
      console.warn(`Email template not found: ${emailTemplateId}`)
      return
    }

    // Get recipient email from trigger data
    const recipientEmail = triggerData.data.email || triggerData.data.clientEmail
    
    if (!recipientEmail) {
      console.warn('No recipient email found in trigger data')
      return
    }

    try {
      // Parse template with variables
      const subject = parseEmailTemplate(template.subject, triggerData.data)
      const body = parseEmailTemplate(template.body, triggerData.data)

      // Send the email via Gmail SMTP
      await sendEmailViaGmail({
        to: recipientEmail,
        subject,
        html: body,
      })

      console.log(`📧 Email sent successfully to ${recipientEmail} using template: ${template.name}`)

      // Create notification for tracking
      await prisma.notification.create({
        data: {
          userId: triggerData.userId,
          title: 'אימייל נשלח',
          message: `Automation "${automation.name}" sent email to ${recipientEmail} using template: ${template.name}`,
          type: 'automation',
          companyId: triggerData.companyId,
        },
      })
    } catch (error) {
      console.error('Error sending email:', error)
      
      // Create notification about failure
      await prisma.notification.create({
        data: {
          userId: triggerData.userId,
          title: 'שגיאה בשליחת אימייל',
          message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'automation',
          companyId: triggerData.companyId,
        },
      })
      
      throw error
    }
  }

  /**
   * Action: Create Task
   */
  private static async createTask(
    action: AutomationAction,
    triggerData: TriggerData,
    automation: any
  ): Promise<void> {
    const { taskTitle, taskDescription, taskPriority } = action.params

    if (!taskTitle) {
      console.warn('Create task action missing title')
      return
    }

    // Parse variables in title and description
    const parsedTitle = this.parseVariables(taskTitle, triggerData.data)
    const parsedDescription = taskDescription 
      ? this.parseVariables(taskDescription, triggerData.data)
      : `Task created by automation: ${automation.name}`

    // Create the task
    const task = await prisma.task.create({
      data: {
        title: parsedTitle,
        description: parsedDescription,
        priority: taskPriority || 'medium',
        status: 'todo',
        assigneeId: triggerData.userId,
        companyId: triggerData.companyId,
        // Link to the entity that triggered this
        ...(triggerData.entityType === 'lead' && { leadId: triggerData.entityId }),
        ...(triggerData.entityType === 'client' && { clientId: triggerData.entityId }),
      },
    })

    console.log(`✅ Created task: ${task.title} (${task.id})`)

    // Create notification
    await prisma.notification.create({
      data: {
        userId: triggerData.userId,
        title: 'משימה חדשה נוצרה',
        message: `Automation "${automation.name}" created task: ${parsedTitle}`,
        type: 'automation',
        companyId: triggerData.companyId,
      },
    })
  }

  /**
   * Action: Send Notification
   */
  private static async sendNotification(
    action: AutomationAction,
    triggerData: TriggerData,
    automation: any
  ): Promise<void> {
    const { notificationMessage } = action.params

    if (!notificationMessage) {
      console.warn('Send notification action missing message')
      return
    }

    const parsedMessage = this.parseVariables(notificationMessage, triggerData.data)

    await prisma.notification.create({
      data: {
        userId: triggerData.userId,
        title: `Automation: ${automation.name}`,
        message: parsedMessage,
        type: 'automation',
        companyId: triggerData.companyId,
      },
    })

    console.log(`🔔 Sent notification: ${parsedMessage}`)
  }

  /**
   * Action: Update Status
   */
  private static async updateStatus(
    action: AutomationAction,
    triggerData: TriggerData
  ): Promise<void> {
    const { statusValue } = action.params

    if (!statusValue) {
      console.warn('Update status action missing status value')
      return
    }

    // Update based on entity type
    switch (triggerData.entityType) {
      case 'lead':
        await prisma.lead.update({
          where: { id: triggerData.entityId },
          data: { status: statusValue },
        })
        console.log(`📝 Updated lead status to: ${statusValue}`)
        break
      
      case 'task':
        await prisma.task.update({
          where: { id: triggerData.entityId },
          data: { status: statusValue },
        })
        console.log(`📝 Updated task status to: ${statusValue}`)
        break
      
      default:
        console.warn(`Cannot update status for entity type: ${triggerData.entityType}`)
    }
  }

  /**
   * Action: Add Tag
   */
  private static async addTag(
    action: AutomationAction,
    triggerData: TriggerData
  ): Promise<void> {
    const { tagName } = action.params

    if (!tagName) {
      console.warn('Add tag action missing tag name')
      return
    }

    // Update based on entity type
    switch (triggerData.entityType) {
      case 'lead':
        const lead = await prisma.lead.findUnique({
          where: { id: triggerData.entityId },
        })
        
        if (lead) {
          const currentTags = lead.tags as string[] || []
          if (!currentTags.includes(tagName)) {
            await prisma.lead.update({
              where: { id: triggerData.entityId },
              data: { tags: [...currentTags, tagName] },
            })
            console.log(`🏷️  Added tag "${tagName}" to lead`)
          }
        }
        break
      
      default:
        console.warn(`Cannot add tag to entity type: ${triggerData.entityType}`)
    }
  }

  /**
   * Parse variables in text (e.g., {{name}}, {{email}})
   */
  private static parseVariables(text: string, data: any): string {
    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, field) => {
      const value = this.getFieldValue(data, field)
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Log automation execution
   */
  private static async logExecution(
    automationId: string,
    triggerData: TriggerData,
    status: 'success' | 'failed',
    error?: any
  ): Promise<void> {
    try {
      await prisma.automationLog.create({
        data: {
          automationId,
          status,
          triggerData: triggerData as any,
          errorMessage: error ? String(error) : null,
        },
      })
    } catch (error) {
      console.error('Error logging automation execution:', error)
    }
  }
}

/**
 * Helper function to trigger an automation event
 * Use this throughout your application to trigger automations
 */
export async function triggerAutomation(
  type: TriggerType,
  entityId: string,
  entityType: string,
  data: any,
  userId: string,
  companyId: string
): Promise<void> {
  try {
    await AutomationEngine.processTrigger({
      type,
      entityId,
      entityType,
      data,
      userId,
      companyId,
    })
  } catch (error) {
    console.error('Error triggering automation:', error)
    // Don't throw - we don't want automation errors to break the main flow
  }
}

