import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateQuoteHTML } from "@/lib/pdf-generator"
import { Session } from "next-auth"

interface ExtendedSession extends Session {
  user: {
    id: string
    email: string
    name: string
    role: string
    companyId: string
    companyName: string
  }
}

// GET /api/quotes/[id]/html - קבלת HTML של הצעת מחיר לתצוגה מקדימה
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        lead: true,
        items: {
          orderBy: {
            position: "asc",
          },
        },
        company: {
          select: {
            name: true,
            settings: true,
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    const html = await generateQuoteHTML(quote)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("Error generating HTML:", error)
    return NextResponse.json(
      { error: "Failed to generate HTML" },
      { status: 500 }
    )
  }
}

