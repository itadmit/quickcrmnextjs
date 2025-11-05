import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateQuotePDF } from "@/lib/pdf-generator"
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

// GET /api/quotes/[id]/pdf - יצירת PDF של הצעת מחיר
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

    // עדכון שההצעת מחיר נצפתה (אם היא נשלחה)
    if (quote.status === "SENT" && !quote.viewedAt) {
      await prisma.quote.update({
        where: { id: params.id },
        data: {
          status: "VIEWED",
          viewedAt: new Date(),
        },
      })
    }

    const pdfBuffer = await generateQuotePDF(quote)

    // בדיקה אם זו תצוגה מקדימה או הורדה
    const { searchParams } = new URL(req.url)
    const isPreview = searchParams.get('preview') === 'true'

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": isPreview 
          ? `inline; filename="quote-${quote.quoteNumber}.pdf"`
          : `attachment; filename="quote-${quote.quoteNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}

