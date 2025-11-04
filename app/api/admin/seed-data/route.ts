import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admins to seed data
    if (!session?.user?.companyId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 })
    }

    const companyId = session.user.companyId
    const userId = session.user.id

    console.log('🌱 Starting seed for company:', companyId)

    // Create demo pipeline
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'צינור מכירות ראשי',
        isDefault: true,
        companyId,
        stages: {
          create: [
            { name: 'ליד חדש', position: 1, winProbability: 10, color: '#3B82F6' },
            { name: 'יצירת קשר', position: 2, winProbability: 25, color: '#F59E0B' },
            { name: 'מתאים', position: 3, winProbability: 50, color: '#8B5CF6' },
            { name: 'הצעת מחיר', position: 4, winProbability: 75, color: '#F97316' },
            { name: 'משא ומתן', position: 5, winProbability: 90, color: '#10B981' },
          ],
        },
      },
    })

    // Create demo leads
    const leads = await Promise.all([
      prisma.lead.create({
        data: {
          name: 'יוסי כהן',
          email: 'yossi@example.com',
          phone: '050-1234567',
          source: 'Facebook',
          status: 'NEW',
          notes: 'מעוניין באתר חדש לעסק',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.lead.create({
        data: {
          name: 'שרה לוי',
          email: 'sara@example.com',
          phone: '052-9876543',
          source: 'Google',
          status: 'CONTACTED',
          notes: 'דיברנו בטלפון, מעוניינת במערכת CRM',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.lead.create({
        data: {
          name: 'דוד מזרחי',
          email: 'david@tech.co.il',
          phone: '054-5555555',
          source: 'המלצה',
          status: 'QUALIFIED',
          notes: 'חברת הייטק מתעניינת בפיתוח אפליקציה',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.lead.create({
        data: {
          name: 'רחל אברהם',
          email: 'rachel@store.com',
          phone: '053-7777777',
          source: 'אתר',
          status: 'PROPOSAL',
          notes: 'שלחנו הצעת מחיר למערכת ניהול מלאי',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.lead.create({
        data: {
          name: 'משה ישראלי',
          email: 'moshe@biz.co.il',
          phone: '050-8888888',
          source: 'טלפון',
          status: 'NEGOTIATION',
          notes: 'במשא ומתן על פרויקט גדול',
          companyId,
          ownerId: userId,
        },
      }),
    ])

    // Create demo clients
    const clients = await Promise.all([
      prisma.client.create({
        data: {
          name: 'חברת ABC בע"מ',
          email: 'info@abc.co.il',
          phone: '03-5551234',
          address: 'רחוב הרצל 1, תל אביב',
          status: 'ACTIVE',
          notes: 'לקוח VIP - תשומת לב מיוחדת',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.client.create({
        data: {
          name: 'XYZ Solutions',
          email: 'contact@xyz.com',
          phone: '09-9876543',
          address: 'דרך המלך 50, חיפה',
          status: 'ACTIVE',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.client.create({
        data: {
          name: 'הנדסת קידום',
          email: 'info@kidum.co.il',
          phone: '08-6543210',
          address: 'שד\' בן גוריון 100, באר שבע',
          status: 'ACTIVE',
          companyId,
          ownerId: userId,
        },
      }),
      prisma.client.create({
        data: {
          name: 'דיגיטל פרו',
          email: 'hello@digitalpro.co.il',
          phone: '04-7654321',
          address: 'רחוב הנשיא 25, ירושלים',
          status: 'ACTIVE',
          companyId,
          ownerId: userId,
        },
      }),
    ])

    // Create demo projects
    const projects = await Promise.all([
      prisma.project.create({
        data: {
          name: 'פיתוח אתר תדמית',
          description: 'אתר תדמית מודרני עם ממשק ניהול תוכן',
          status: 'IN_PROGRESS',
          budget: 45000,
          progress: 60,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-03-30'),
          companyId,
          clientId: clients[0].id,
        },
      }),
      prisma.project.create({
        data: {
          name: 'מערכת ניהול מלאי',
          description: 'מערכת מקיפה לניהול מלאי והזמנות',
          status: 'IN_PROGRESS',
          budget: 120000,
          progress: 35,
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-06-30'),
          companyId,
          clientId: clients[1].id,
        },
      }),
      prisma.project.create({
        data: {
          name: 'אפליקציית מובייל',
          description: 'אפליקציית React Native עבור iOS ו-Android',
          status: 'PLANNING',
          budget: 200000,
          progress: 10,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          companyId,
          clientId: clients[2].id,
        },
      }),
      prisma.project.create({
        data: {
          name: 'מיתוג ועיצוב',
          description: 'עיצוב לוגו, מיתוג ומדיה חברתית',
          status: 'COMPLETED',
          budget: 25000,
          progress: 100,
          startDate: new Date('2023-11-01'),
          endDate: new Date('2024-01-15'),
          companyId,
          clientId: clients[3].id,
        },
      }),
    ])

    // Create demo tasks
    const tasks = await Promise.all([
      prisma.task.create({
        data: {
          title: 'עיצוב דף הבית',
          description: 'יצירת מוקאפים ועיצוב ויזואלי',
          status: 'DONE',
          priority: 'HIGH',
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          companyId,
          projectId: projects[0].id,
          assigneeId: userId,
        },
      }),
      prisma.task.create({
        data: {
          title: 'פיתוח ממשק ניהול',
          description: 'בניית ממשק ניהול תוכן בReact',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          companyId,
          projectId: projects[0].id,
          assigneeId: userId,
        },
      }),
      prisma.task.create({
        data: {
          title: 'אינטגרציה עם API',
          description: 'חיבור למערכת החיצונית',
          status: 'TODO',
          priority: 'NORMAL',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          companyId,
          projectId: projects[1].id,
          assigneeId: userId,
        },
      }),
      prisma.task.create({
        data: {
          title: 'בדיקות QA',
          description: 'בדיקות איכות מקיפות',
          status: 'TODO',
          priority: 'URGENT',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          companyId,
          projectId: projects[0].id,
          assigneeId: userId,
        },
      }),
      prisma.task.create({
        data: {
          title: 'תיעוד מערכת',
          description: 'כתיבת תיעוד מקיף למשתמש הקצה',
          status: 'TODO',
          priority: 'LOW',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          companyId,
          projectId: projects[1].id,
          assigneeId: userId,
        },
      }),
      prisma.task.create({
        data: {
          title: 'הדרכת לקוח',
          description: 'הדרכה למערכת החדשה',
          status: 'TODO',
          priority: 'NORMAL',
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          companyId,
          projectId: projects[0].id,
          assigneeId: userId,
        },
      }),
    ])

    // Create demo budgets
    const budgets = await Promise.all([
      prisma.budget.create({
        data: {
          name: 'תשלום ראשון - אתר תדמית',
          amount: 15000,
          status: 'PAID',
          expectedAt: new Date('2024-02-01'),
          notes: 'תשלום ראשון של 3',
          companyId,
          projectId: projects[0].id,
          clientId: clients[0].id,
        },
      }),
      prisma.budget.create({
        data: {
          name: 'תשלום שני - אתר תדמית',
          amount: 15000,
          status: 'PENDING',
          expectedAt: new Date('2024-03-01'),
          companyId,
          projectId: projects[0].id,
          clientId: clients[0].id,
        },
      }),
      prisma.budget.create({
        data: {
          name: 'תשלום שלישי - אתר תדמית',
          amount: 15000,
          status: 'PENDING',
          expectedAt: new Date('2024-04-01'),
          companyId,
          projectId: projects[0].id,
          clientId: clients[0].id,
        },
      }),
      prisma.budget.create({
        data: {
          name: 'מקדמה - מערכת מלאי',
          amount: 40000,
          status: 'WON',
          expectedAt: new Date('2024-02-15'),
          companyId,
          projectId: projects[1].id,
          clientId: clients[1].id,
        },
      }),
      prisma.budget.create({
        data: {
          name: 'הצעת מחיר - מיתוג',
          amount: 25000,
          status: 'WON',
          expectedAt: new Date('2023-11-15'),
          companyId,
          projectId: projects[3].id,
          clientId: clients[3].id,
        },
      }),
    ])

    // Create demo notifications
    const notifications = await Promise.all([
      prisma.notification.create({
        data: {
          type: 'task',
          title: 'משימה חדשה הוקצתה לך',
          message: 'פיתוח ממשק ניהול - דחוף',
          companyId,
          userId,
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          type: 'lead',
          title: 'ליד חדש נוצר',
          message: 'יוסי כהן מ-Facebook Ads',
          companyId,
          userId,
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          type: 'reminder',
          title: 'תזכורת: משימה מתקרבת',
          message: 'בדיקות QA - תאריך יעד בעוד 3 ימים',
          companyId,
          userId,
          isRead: false,
        },
      }),
      prisma.notification.create({
        data: {
          type: 'document',
          title: 'תשלום התקבל',
          message: 'תשלום של 15,000 ₪ מלקוח ABC',
          companyId,
          userId,
          isRead: true,
        },
      }),
    ])

    // Create demo email templates
    const emailTemplates = await Promise.all([
      prisma.emailTemplate.create({
        data: {
          name: 'ברוכים הבאים',
          subject: 'ברוכים הבאים ל{{company_name}}',
          body: 'שלום {{customer_name}},\n\nשמחים שהצטרפת אלינו!\n\nבברכה,\nצוות {{company_name}}',
          variables: ['customer_name', 'company_name'],
          companyId,
        },
      }),
      prisma.emailTemplate.create({
        data: {
          name: 'הצעת מחיר',
          subject: 'הצעת מחיר מ-{{company_name}}',
          body: 'שלום {{customer_name}},\n\nמצורפת הצעת המחיר עבור {{project_name}}.\n\nסכום: {{amount}} ₪\n\nנשמח לשמוע ממך,\n{{sender_name}}',
          variables: ['customer_name', 'company_name', 'project_name', 'amount', 'sender_name'],
          companyId,
        },
      }),
      prisma.emailTemplate.create({
        data: {
          name: 'תזכורת לפגישה',
          subject: 'תזכורת: פגישה מחר ב-{{time}}',
          body: 'שלום {{customer_name}},\n\nרק להזכיר שיש לנו פגישה מחר ב-{{time}}.\n\nמיקום: {{location}}\n\nנתראה!',
          variables: ['customer_name', 'time', 'location'],
          companyId,
        },
      }),
    ])

    // Create demo automations
    const automations = await Promise.all([
      prisma.automation.create({
        data: {
          name: 'שליחת אימייל ללידים חדשים',
          description: 'שולח אימייל אוטומטי כאשר ליד חדש נוצר',
          isActive: true,
          trigger: { event: 'lead.created' },
          conditions: { status: 'NEW' },
          actions: { 
            sendEmail: {
              templateId: emailTemplates[0].id,
              to: '{{lead.email}}'
            }
          },
          companyId,
          createdBy: userId,
        },
      }),
      prisma.automation.create({
        data: {
          name: 'התראה על משימות דחופות',
          description: 'שולח התראה כאשר משימה דחופה נוצרת',
          isActive: true,
          trigger: { event: 'task.created' },
          conditions: { priority: 'URGENT' },
          actions: { 
            createNotification: {
              title: 'משימה דחופה חדשה',
              message: '{{task.title}} - דורש טיפול מיידי'
            }
          },
          companyId,
          createdBy: userId,
        },
      }),
      prisma.automation.create({
        data: {
          name: 'עדכון סטטוס ליד אוטומטי',
          description: 'מעדכן סטטוס ליד ל-CONTACTED לאחר 24 שעות',
          isActive: false,
          trigger: { event: 'lead.created' },
          conditions: { status: 'NEW', hoursElapsed: 24 },
          actions: { 
            updateStatus: {
              newStatus: 'CONTACTED'
            }
          },
          companyId,
          createdBy: userId,
        },
      }),
    ])

    // Create demo audit logs
    const auditLogs = await Promise.all([
      prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'Lead',
          entityId: leads[0].id,
          diff: { name: leads[0].name, email: leads[0].email },
          companyId,
          userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Project',
          entityId: projects[0].id,
          diff: { progress: { from: 50, to: 60 } },
          companyId,
          userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'Client',
          entityId: clients[0].id,
          diff: { name: clients[0].name },
          companyId,
          userId,
        },
      }),
    ])

    // Create demo events/meetings
    const now = new Date()
    const events = await Promise.all([
      prisma.event.create({
        data: {
          title: 'פגישת One-on-One עם VP',
          description: 'דיון על התקדמות הפרויקטים והצעות לשיפור',
          startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // בעוד שעתיים
          endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000), // שעה אחת
          location: 'Google Meet',
          attendees: ['vp@company.com', session.user.email || ''],
          companyId,
          createdBy: userId,
        },
      }),
      prisma.event.create({
        data: {
          title: 'פגישת סטטוס פרויקט ABC',
          description: 'עדכון התקדמות ודיון בנושאים פתוחים',
          startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // מחר
          endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 דקות
          location: 'חדר ישיבות 1',
          attendees: [clients[0].email || '', session.user.email || ''],
          companyId,
          createdBy: userId,
        },
      }),
      prisma.event.create({
        data: {
          title: 'הדרכת לקוח - XYZ',
          description: 'הדרכה למערכת החדשה',
          startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // בעוד 3 ימים
          endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // שעתיים
          location: 'Zoom',
          attendees: [clients[1].email || '', session.user.email || ''],
          companyId,
          createdBy: userId,
        },
      }),
      prisma.event.create({
        data: {
          title: 'פגישת צוות שבועית',
          description: 'עדכונים שבועיים וסנכרון',
          startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // בעוד שבוע
          endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // שעה
          location: 'משרד',
          attendees: [session.user.email || '', 'team@company.com'],
          companyId,
          createdBy: userId,
        },
      }),
      prisma.event.create({
        data: {
          title: 'הצגת הצעת מחיר - הנדסת קידום',
          description: 'מצגת והצגת ההצעה ללקוח',
          startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // בעוד 5 ימים
          endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // שעה וחצי
          location: 'משרדי הלקוח',
          attendees: [clients[2].email || '', session.user.email || ''],
          companyId,
          createdBy: userId,
        },
      }),
    ])

    console.log('✅ Seed completed successfully!')
    console.log(`Created: ${leads.length} leads, ${clients.length} clients, ${projects.length} projects, ${tasks.length} tasks, ${budgets.length} budgets, ${notifications.length} notifications, ${emailTemplates.length} email templates, ${automations.length} automations, ${auditLogs.length} audit logs, ${events.length} events`)

    return NextResponse.json({ 
      success: true,
      message: "נתוני הדמו נטענו בהצלחה!",
      stats: {
        leads: leads.length,
        clients: clients.length,
        projects: projects.length,
        tasks: tasks.length,
        budgets: budgets.length,
        notifications: notifications.length,
        emailTemplates: emailTemplates.length,
        automations: automations.length,
        auditLogs: auditLogs.length,
        events: events.length,
        pipeline: 1,
      }
    })
  } catch (error) {
    console.error("Error seeding data:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

