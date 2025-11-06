import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

// GET - קבלת כל ההזמנות של החברה
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - יצירת הזמנה חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { email, name, permissions } = body

    if (!email || !permissions) {
      return NextResponse.json(
        { error: "Email and permissions are required" },
        { status: 400 }
      )
    }

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // בדיקה אם יש הזמנה פעילה לאותו אימייל
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        companyId: session.user.companyId,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Invitation already exists for this email" },
        { status: 400 }
      )
    }

    // יצירת token
    const token = crypto.randomBytes(32).toString("hex")

    // תאריך תפוגה - 7 ימים מהיום
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // יצירת ההזמנה
    const invitation = await prisma.invitation.create({
      data: {
        companyId: session.user.companyId,
        email,
        name: name || null,
        token,
        invitedBy: session.user.id,
        permissions: permissions as any,
        expiresAt,
        status: "PENDING",
      },
      include: {
        inviter: {
          select: {
            name: true,
          },
        },
      },
    })

    // שליחת מייל עם קישור אישור
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/accept/${token}`
    
    await sendEmail({
      to: email,
      subject: `הזמנה להצטרפות ל-QuickCRM`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6f65e2;">הזמנה להצטרפות ל-QuickCRM</h2>
          <p>שלום ${name || email},</p>
          <p>${session.user.name} הזמין אותך להצטרף לצוות ב-QuickCRM.</p>
          <p>לחץ על הקישור הבא כדי לאשר את ההזמנה וליצור חשבון:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" style="background: linear-gradient(135deg, #6f65e2 0%, #b965e2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              אישור והצטרפות
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">
            הקישור תקף למשך 7 ימים.
          </p>
        </div>
      `,
    })

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

