import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

// GET /api/quotes - קבלת כל הצעות המחיר
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const leadId = searchParams.get("leadId")

    const where: any = {
      companyId: user.companyId,
    }

    if (status) {
      where.status = status
    }

    if (leadId) {
      where.leadId = leadId
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    )
  }
}

// POST /api/quotes - יצירת הצעת מחיר חדשה
export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const {
      leadId,
      title,
      description,
      templateType = "simple",
      validUntil,
      notes,
      terms,
      items,
      discount = 0,
      tax = 18,
    } = body

    // חישוב subtotal
    let subtotal = 0
    const processedItems = items.map((item: any, index: number) => {
      const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
      subtotal += itemTotal
      return {
        description: item.description,
        richDescription: item.richDescription || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: itemTotal,
        position: index,
      }
    })

    // חישוב סה"כ
    const discountAmount = subtotal * (discount / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (tax / 100)
    const total = afterDiscount + taxAmount

    // יצירת מספר הצעת מחיר ייחודי - מספור רציף
    // מחפש את כל הצעות המחיר (לא תבניות) ומחפש את המספר הרציף הגבוה ביותר
    const allQuotes = await prisma.quote.findMany({
      where: { 
        companyId: user.companyId,
        isTemplate: false, // רק הצעות מחיר אמיתיות, לא תבניות
      },
      select: { quoteNumber: true },
    })

    // אוסף את כל המספרים מהפורמט Q-XXX (רק מספרים עד 9999 - רציפים)
    const numbers: number[] = []
    for (const quote of allQuotes) {
      const match = quote.quoteNumber.match(/Q-(\d+)/)
      if (match) {
        const num = parseInt(match[1])
        // רק מספרים קטנים (רציפים) - עד 9999, מתעלמים ממספרים ארוכים
        if (num > 0 && num <= 9999) {
          numbers.push(num)
        }
      }
    }

    // מוצא את המספר הרציף הגבוה ביותר
    let nextNumber = 1
    if (numbers.length > 0) {
      numbers.sort((a, b) => b - a) // מיון מהגבוה לנמוך
      const maxNumber = numbers[0]
      nextNumber = maxNumber + 1
    }

    // המספר הבא בפורמט Q-XXX
    const quoteNumber = `Q-${String(nextNumber).padStart(3, "0")}`

    const quote = await prisma.quote.create({
      data: {
        companyId: user.companyId,
        leadId,
        quoteNumber,
        title,
        description,
        templateType,
        subtotal,
        discount,
        tax,
        total,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
        terms,
        createdBy: session.user.id,
        items: {
          create: processedItems,
        },
      },
      include: {
        lead: true,
        items: true,
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error creating quote:", error)
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    )
  }
}

