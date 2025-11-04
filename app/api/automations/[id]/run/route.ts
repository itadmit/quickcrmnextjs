import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AutomationEngine } from "@/lib/automation-engine"

/**
 * Manually run an automation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the automation
    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 })
    }

    if (!automation.isActive) {
      return NextResponse.json({ error: "Automation is not active" }, { status: 400 })
    }

    // Get test data from request body (optional)
    const body = await req.json()
    const { testData } = body

    // Create a test trigger event
    const trigger = automation.trigger as any
    const triggerType = trigger?.type || 'lead_created'

    const triggerData = {
      type: triggerType,
      entityId: 'test-' + Date.now(),
      entityType: 'test',
      data: testData || {
        name: 'Test Entity',
        email: 'test@example.com',
      },
      userId: session.user.id,
      companyId: session.user.companyId,
    }

    // Execute the automation
    await AutomationEngine.processTrigger(triggerData)

    return NextResponse.json({
      success: true,
      message: 'Automation executed successfully',
      automation: {
        id: automation.id,
        name: automation.name,
      },
    })
  } catch (error) {
    console.error("Error running automation:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

