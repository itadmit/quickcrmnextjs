import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("אימייל לא תקין"),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
  companyName: z.string().min(2, "שם החברה חייב להכיל לפחות 2 תווים"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, companyName } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "משתמש עם אימייל זה כבר קיים" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if this should be a super admin
    const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL

    // Create company and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
        },
      })

      // Create default pipeline with stages
      const pipeline = await tx.pipeline.create({
        data: {
          name: "Pipeline ברירת מחדל",
          isDefault: true,
          companyId: company.id,
          stages: {
            create: [
              { name: "חדש", position: 0, winProbability: 0.1, color: "#6B7280" },
              { name: "יצירת קשר", position: 1, winProbability: 0.2, color: "#3B82F6" },
              { name: "פגישה", position: 2, winProbability: 0.4, color: "#8B5CF6" },
              { name: "הצעה", position: 3, winProbability: 0.7, color: "#F59E0B" },
              { name: "סגור", position: 4, winProbability: 1.0, color: "#10B981" },
            ],
          },
        },
      })

      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: isSuperAdmin ? "SUPER_ADMIN" : "ADMIN",
          companyId: company.id,
        },
      })

      return { company, user }
    })

    return NextResponse.json({
      message: "משתמש נוצר בהצלחה",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "אירעה שגיאה ביצירת המשתמש" },
      { status: 500 }
    )
  }
}


