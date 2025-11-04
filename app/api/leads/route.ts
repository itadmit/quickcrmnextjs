import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { triggerAutomation } from "@/lib/automation-engine"
import { notifyLeadCreated } from "@/lib/notification-service"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const leads = await prisma.lead.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        stage: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error("Error fetching leads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone, source, notes, tags } = body

    const lead = await prisma.lead.create({
      data: {
        companyId: session.user.companyId,
        name,
        email,
        phone,
        source,
        notes,
        tags: tags || [],
        status: "NEW",
        ownerId: session.user.id,
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        stage: true,
      },
    })

    // Send notification (in-app + email)
    await notifyLeadCreated({
      userId: session.user.id,
      companyId: session.user.companyId,
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email || '',
      source: lead.source || 'לא צוין',
    })

    // Trigger automation for lead creation
    await triggerAutomation(
      'lead_created',
      lead.id,
      'lead',
      lead,
      session.user.id,
      session.user.companyId
    )

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Error creating lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

