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

// GET /api/quotes/[id] - קבלת הצעת מחיר בודדת
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

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    )
  }
}

// PATCH /api/quotes/[id] - עדכון הצעת מחיר
export async function PATCH(
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

    const body = await req.json()
    const {
      title,
      description,
      status,
      validUntil,
      notes,
      terms,
      items,
      discount,
      tax,
    } = body

    // בדיקה שההצעת מחיר שייכת לחברה
    const existingQuote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    let updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (body.templateType !== undefined) updateData.templateType = body.templateType
    if (status !== undefined) {
      updateData.status = status
      if (status === "SENT" && !existingQuote.issuedAt) {
        updateData.issuedAt = new Date()
      }
      if (status === "VIEWED" && !existingQuote.viewedAt) {
        updateData.viewedAt = new Date()
      }
      if (
        (status === "ACCEPTED" || status === "REJECTED") &&
        !existingQuote.respondedAt
      ) {
        updateData.respondedAt = new Date()
      }
    }
    if (validUntil !== undefined)
      updateData.validUntil = validUntil ? new Date(validUntil) : null
    if (notes !== undefined) updateData.notes = notes
    if (terms !== undefined) updateData.terms = terms

    // אם יש פריטים חדשים, מחשבים מחדש
    if (items) {
      let subtotal = 0
      const processedItems = items.map((item: any, index: number) => {
        const itemTotal =
          item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
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

      const finalDiscount = discount !== undefined ? discount : existingQuote.discount
      const finalTax = tax !== undefined ? tax : existingQuote.tax

      const discountAmount = subtotal * (finalDiscount / 100)
      const afterDiscount = subtotal - discountAmount
      const taxAmount = afterDiscount * (finalTax / 100)
      const total = afterDiscount + taxAmount

      updateData.subtotal = subtotal
      updateData.discount = finalDiscount
      updateData.tax = finalTax
      updateData.total = total

      // מחיקת פריטים קיימים ויצירת חדשים
      await prisma.quoteItem.deleteMany({
        where: { quoteId: params.id },
      })

      await prisma.quoteItem.createMany({
        data: processedItems.map((item) => ({
          ...item,
          quoteId: params.id,
        })),
      })
    } else {
      // אם רק discount או tax השתנו, מחשבים מחדש
      if (discount !== undefined || tax !== undefined) {
        const finalDiscount = discount !== undefined ? discount : existingQuote.discount
        const finalTax = tax !== undefined ? tax : existingQuote.tax

        const discountAmount = existingQuote.subtotal * (finalDiscount / 100)
        const afterDiscount = existingQuote.subtotal - discountAmount
        const taxAmount = afterDiscount * (finalTax / 100)
        const total = afterDiscount + taxAmount

        updateData.discount = finalDiscount
        updateData.tax = finalTax
        updateData.total = total
      }
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        lead: true,
        items: {
          orderBy: {
            position: "asc",
          },
        },
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 }
    )
  }
}

// DELETE /api/quotes/[id] - מחיקת הצעת מחיר
export async function DELETE(
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

    // בדיקה שההצעת מחיר שייכת לחברה
    const quote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    await prisma.quote.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quote:", error)
    return NextResponse.json(
      { error: "Failed to delete quote" },
      { status: 500 }
    )
  }
}

