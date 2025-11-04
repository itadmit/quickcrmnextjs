import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, verifyEmailConnection } from "@/lib/email"

/**
 * Test email sending and verify SMTP connection
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { to, subject, message } = body

    // Verify connection first
    const isConnected = await verifyEmailConnection()
    
    if (!isConnected) {
      return NextResponse.json({ 
        error: "Failed to connect to email server",
        details: "Please check your SMTP configuration"
      }, { status: 500 })
    }

    // Send test email
    await sendEmail({
      to: to || session.user.email || 'quickcrmil@gmail.com',
      subject: subject || 'בדיקת מערכת האימיילים - QuickCRM',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>שלום ${session.user.name}! 👋</h2>
          <p>${message || 'זה אימייל בדיקה ממערכת QuickCRM.'}</p>
          <p>אם קיבלת אימייל זה, המערכת עובדת כראוי! ✅</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            אימייל זה נשלח מ-QuickCRM ב-${new Date().toLocaleString('he-IL')}
          </p>
        </div>
      `,
    })

    return NextResponse.json({ 
      success: true,
      message: "Test email sent successfully",
      sentTo: to || session.user.email,
    })
  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ 
      error: "Failed to send test email",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

/**
 * Verify email connection
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isConnected = await verifyEmailConnection()
    
    return NextResponse.json({ 
      connected: isConnected,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: process.env.GMAIL_USER,
      }
    })
  } catch (error) {
    console.error("Error verifying email connection:", error)
    return NextResponse.json({ 
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

