import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET - קבלת פרטי הזמנה לפי token
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        inviter: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // בדיקת תאריך תפוגה
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 })
    }

    // בדיקה אם כבר אושר
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation already processed" },
        { status: 400 }
      )
    }

    return NextResponse.json(invitation)
  } catch (error) {
    console.error("Error fetching invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - אישור הזמנה ויצירת משתמש
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await req.json()
    const { name, password } = body

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      )
    }

    // קבלת ההזמנה
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // בדיקת תאריך תפוגה
    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 }
      )
    }

    // בדיקה אם כבר אושר
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation already processed" },
        { status: 400 }
      )
    }

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // הצפנת סיסמה
    const hashedPassword = await bcrypt.hash(password, 10)

    // יצירת משתמש חדש
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashedPassword,
        companyId: invitation.companyId,
        role: "USER",
      },
    })

    // יצירת הרשאות למשתמש
    const permissions = invitation.permissions as Record<string, boolean>
    if (permissions && typeof permissions === "object") {
      const permissionEntries = Object.entries(permissions)
        .filter(([_, allowed]) => allowed)
        .map(([permission]) => ({
          userId: user.id,
          permission,
          allowed: true,
        }))

      if (permissionEntries.length > 0) {
        await prisma.userPermission.createMany({
          data: permissionEntries,
        })
      }
    }

    // עדכון ההזמנה
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

