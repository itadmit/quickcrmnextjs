import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the lead
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check if lead already has a client (already converted)
    if (lead.clientId) {
      const existingClient = await prisma.client.findUnique({
        where: { id: lead.clientId },
      })
      if (existingClient) {
        return NextResponse.json({ 
          success: true, 
          client: existingClient,
          message: "Lead already converted to client",
          alreadyConverted: true
        })
      }
    }

    // Create a new client from the lead
    const client = await prisma.client.create({
      data: {
        companyId: session.user.companyId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes,
        status: "ACTIVE",
        ownerId: lead.ownerId,
      },
    })

    // Update the lead status to WON and link to client
    await prisma.lead.update({
      where: {
        id: params.id,
      },
      data: {
        status: "WON",
        clientId: client.id,
      },
    })

    // Transfer tasks from lead to client
    await prisma.task.updateMany({
      where: {
        leadId: params.id,
        clientId: null, // Only update tasks that don't already have a client
      },
      data: {
        clientId: client.id,
      },
    })

    // Transfer files from lead to client
    await prisma.file.updateMany({
      where: {
        leadId: params.id,
        clientId: null, // Only update files that don't already have a client
      },
      data: {
        clientId: client.id,
      },
    })

    // Note: Quotes and Payments are already linked to the lead via leadId
    // and will be accessible through the lead relationship
    // Projects created from quotes will be linked to the client

    // Log the conversion
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        userId: session.user.id,
        action: "LEAD_CONVERTED",
        entityType: "Lead",
        entityId: lead.id,
        diff: {
          leadId: lead.id,
          leadName: lead.name,
          clientId: client.id,
          clientName: client.name,
        },
      },
    })

    return NextResponse.json({ 
      success: true, 
      client,
      message: "Lead converted to client successfully"
    })
  } catch (error) {
    console.error("Error converting lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

