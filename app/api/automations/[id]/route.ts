import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 })
    }

    return NextResponse.json(automation)
  } catch (error) {
    console.error("Error fetching automation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, trigger, action, conditions, isActive } = body

    // Convert single action to actions array if provided
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (trigger !== undefined) updateData.trigger = trigger
    if (action !== undefined) updateData.actions = [action]
    if (conditions !== undefined) updateData.conditions = conditions
    if (isActive !== undefined) updateData.isActive = isActive

    const automation = await prisma.automation.updateMany({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      data: updateData,
    })

    if (automation.count === 0) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating automation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const automation = await prisma.automation.deleteMany({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (automation.count === 0) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting automation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

