import nodemailer from 'nodemailer'

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'quickcrmil@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'umqm cbum rdmp xsmm',
  },
})

/**
 * Send an email using Gmail SMTP
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = 'QuickCRM <quickcrmil@gmail.com>',
  attachments,
}: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || '',
      html: html || text || '',
      attachments: attachments || [],
    })

    console.log('✅ Email sent successfully:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))
  } catch (error) {
    console.error('❌ Error sending email:', error)
    throw error
  }
}

/**
 * Parse email template with variables
 */
export function parseEmailTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let parsed = template

  // Replace {{variable}} with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    parsed = parsed.replace(regex, value !== undefined && value !== null ? String(value) : '')
  })

  return parsed
}

/**
 * Get email template with default styling
 */
export function getEmailTemplate({
  title,
  content,
  footer = 'הודעה זו נשלחה אוטומטית מ-QuickCRM',
}: {
  title: string
  content: string
  footer?: string
}): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>${title}</title>
  <style>
    * {
      direction: rtl;
      text-align: right;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #6f65e2 0%, #b965e2 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
      color: #333;
      line-height: 1.6;
      direction: rtl;
      text-align: right;
    }
    .content h2 {
      direction: rtl;
      text-align: right;
    }
    .content p {
      direction: rtl;
      text-align: right;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #6f65e2 0%, #b965e2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${footer}</p>
      <p>QuickCRM © ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Pre-built email templates
 */
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'ברוך הבא ל-QuickCRM! 🎉',
    html: getEmailTemplate({
      title: 'ברוך הבא!',
      content: `
        <p>שלום ${name},</p>
        <p>תודה שנרשמת ל-QuickCRM! אנחנו שמחים שהצטרפת אלינו.</p>
        <p>המערכת שלנו תעזור לך לנהל את הלידים והלקוחות שלך בצורה יעילה ופשוטה.</p>
        <p>אם יש לך שאלות, אנחנו כאן כדי לעזור!</p>
        <p><strong>בהצלחה,<br>צוות QuickCRM</strong></p>
      `,
    }),
  }),

  leadCreated: (leadName: string, leadEmail: string, source: string) => ({
    subject: `ליד חדש נוצר: ${leadName}`,
    html: getEmailTemplate({
      title: 'ליד חדש נוסף!',
      content: `
        <h2>ליד חדש נוסף למערכת 🎯</h2>
        <p><strong>שם:</strong> ${leadName}</p>
        <p><strong>אימייל:</strong> ${leadEmail}</p>
        <p><strong>מקור:</strong> ${source}</p>
        <p>זה הזמן לפנות אליו ולהתחיל תהליך מכירה!</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/leads" class="button">
          צפה בליד
        </a>
      `,
    }),
  }),

  taskAssigned: (taskTitle: string, assigneeName: string, dueDate?: string) => ({
    subject: `משימה חדשה הוקצתה לך: ${taskTitle}`,
    html: getEmailTemplate({
      title: 'משימה חדשה',
      content: `
        <h2>הוקצתה לך משימה חדשה 📋</h2>
        <p><strong>כותרת:</strong> ${taskTitle}</p>
        ${assigneeName ? `<p><strong>מקבל המשימה:</strong> ${assigneeName}</p>` : ''}
        ${dueDate ? `<p><strong>תאריך יעד:</strong> ${dueDate}</p>` : ''}
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tasks/my" class="button">
          צפה במשימה
        </a>
      `,
    }),
  }),

  meetingReminder: (title: string, startTime: string, location: string) => ({
    subject: `תזכורת: פגישה - ${title}`,
    html: getEmailTemplate({
      title: 'תזכורת לפגישה',
      content: `
        <h2>תזכורת לפגישה הקרובה 📅</h2>
        <p><strong>נושא:</strong> ${title}</p>
        <p><strong>זמן:</strong> ${startTime}</p>
        <p><strong>מקום:</strong> ${location}</p>
        <p>נתראה שם! 👋</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/calendar" class="button">
          צפה ביומן
        </a>
      `,
    }),
  }),

  custom: (subject: string, title: string, content: string) => ({
    subject,
    html: getEmailTemplate({
      title,
      content,
    }),
  }),

  quoteApproved: (quoteNumber: string, leadName: string, total: number) => ({
    subject: `הצעה אושרה: ${quoteNumber}`,
    html: getEmailTemplate({
      title: 'הצעה אושרה! 🎉',
      content: `
        <h2>הצעה אושרה בהצלחה</h2>
        <p><strong>מספר הצעה:</strong> ${quoteNumber}</p>
        <p><strong>לקוח:</strong> ${leadName}</p>
        <p><strong>סכום:</strong> ₪${total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</p>
        <p>ההצעה אושרה על ידי הלקוח. כעת תוכל להתחיל את הפרויקט!</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/quotes" class="button">
          צפה בהצעה
        </a>
      `,
    }),
  }),

  paymentReceived: (amount: number, quoteNumber?: string, clientName?: string, transactionId?: string) => ({
    subject: `💰 תשלום חדש התקבל: ₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`,
    html: getEmailTemplate({
      title: 'תשלום חדש התקבל! 💰',
      content: `
        <h2>תשלום חדש התקבל בהצלחה</h2>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">
            ₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </p>
        </div>
        ${quoteNumber ? `<p><strong>מספר הצעה:</strong> ${quoteNumber}</p>` : ''}
        ${clientName ? `<p><strong>לקוח:</strong> ${clientName}</p>` : ''}
        ${transactionId ? `<p><strong>מספר עסקה:</strong> ${transactionId}</p>` : ''}
        <p>התשלום התקבל והתועד במערכת. הפרויקט נוצר אוטומטית.</p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments" class="button">
          צפה בתשלומים
        </a>
      `,
    }),
  }),
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('✅ Email server is ready to send messages')
    return true
  } catch (error) {
    console.error('❌ Email server connection failed:', error)
    return false
  }
}

