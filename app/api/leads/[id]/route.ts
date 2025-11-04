import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { triggerAutomation } from "@/lib/automation-engine"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('GET Lead API called:', { 
      leadId: params.id, 
      hasSession: !!session,
      companyId: session?.user?.companyId 
    })
    
    if (!session?.user?.companyId) {
      console.log('Unauthorized: No session or companyId')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    console.log('Lead found:', !!lead)

    if (!lead) {
      console.log('Lead not found for:', { leadId: params.id, companyId: session.user.companyId })
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    console.log('Returning lead:', { id: lead.id, name: lead.name, status: lead.status })
    return NextResponse.json(lead)
  } catch (error) {
    console.error("Error fetching lead:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
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
    const { name, email, phone, source, notes, status, tags } = body

    // Get old lead data to check for status changes
    const oldLead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        owner: true,
        stage: true,
      },
    })

    const lead = await prisma.lead.update({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(tags && { tags }),
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    // Trigger automation if status changed
    if (status && oldLead && oldLead.status !== status) {
      await triggerAutomation(
        'lead_status_changed',
        lead.id,
        'lead',
        { ...lead, oldStatus: oldLead.status, newStatus: status },
        session.user.id,
        session.user.companyId
      )
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Error updating lead:", error)
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

    await prisma.lead.delete({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

