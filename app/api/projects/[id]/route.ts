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

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
        budgets: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
        files: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            budgets: true,
            payments: true,
            files: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
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
    const { name, description, clientId, startDate, endDate, budget, status, progress } = body

    const project = await prisma.project.update({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(clientId && { clientId }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
        ...(status && { status }),
        ...(progress !== undefined && { progress: parseInt(progress) }),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
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

    // Verify project exists and belongs to company
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            budgets: true,
            payments: true,
            files: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete all related data first (in correct order due to foreign keys)
    // Note: Prisma will automatically cascade delete tasks, budgets, files, and payments
    // due to onDelete: Cascade in schema, but we'll be explicit for clarity
    
    // Delete files associated with the project
    await prisma.file.deleteMany({
      where: {
        projectId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Delete payments associated with the project
    await prisma.payment.deleteMany({
      where: {
        projectId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Delete budgets associated with the project
    await prisma.budget.deleteMany({
      where: {
        projectId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Delete tasks associated with the project (will cascade delete task files)
    await prisma.task.deleteMany({
      where: {
        projectId: params.id,
        companyId: session.user.companyId,
      },
    })

    // Finally, delete the project itself
    await prisma.project.delete({
      where: {
        id: params.id,
      },
    })

    console.log(`✅ Project ${params.id} deleted successfully with all related data`)

    return NextResponse.json({ 
      success: true,
      message: "Project deleted successfully",
      deletedData: {
        tasks: project._count.tasks,
        budgets: project._count.budgets,
        payments: project._count.payments,
        files: project._count.files,
      },
    })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

