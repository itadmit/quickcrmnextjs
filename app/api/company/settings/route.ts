import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        settings: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({
      settings: company.settings || {},
    })
  } catch (error) {
    console.error("Error fetching company settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { quoteTemplate, companyInfo } = body

    // קבלת הגדרות קיימות
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { settings: true },
    })

    const currentSettings = (company?.settings as any) || {}

    // עדכון ההגדרות
    const updatedSettings = {
      ...currentSettings,
      quoteTemplate: {
        ...(currentSettings.quoteTemplate || {}),
        ...quoteTemplate,
      },
      companyInfo: {
        ...(currentSettings.companyInfo || {}),
        ...companyInfo,
      },
    }

    // שמירה במסד הנתונים
    await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        settings: updatedSettings,
      },
    })

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    console.error("Error updating company settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

