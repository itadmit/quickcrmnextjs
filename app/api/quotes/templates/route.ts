import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - קבלת כל התבניות
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templates = await prisma.quote.findMany({
      where: {
        companyId: session.user.companyId,
        isTemplate: true,
      },
      include: {
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

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - שמירת תבנית חדשה
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      templateType,
      items,
      notes,
      terms,
      discount,
      tax,
    } = body

    // יצירת תבנית חדשה
    const template = await prisma.quote.create({
      data: {
        companyId: session.user.companyId,
        quoteNumber: `TEMPLATE-${Date.now()}`,
        title: title || "תבנית חדשה",
        description: description || null,
        templateType: templateType || "simple",
        status: "DRAFT",
        isTemplate: true,
        subtotal: 0,
        discount: discount || 0,
        tax: tax || 18,
        total: 0,
        notes: notes || null,
        terms: terms || null,
        createdBy: session.user.id,
        items: {
          create: items.map((item: any, index: number) => ({
            description: item.description,
            richDescription: item.richDescription || null,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discount: item.discount || 0,
            total: (item.quantity || 1) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100),
            position: index,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

