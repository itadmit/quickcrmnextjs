import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get API Key from header
    const apiKey = req.headers.get("X-API-KEY")
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API Key" },
        { status: 401 }
      )
    }

    // Find company by API Key
    const company = await prisma.company.findUnique({
      where: { apiKey },
    })

    if (!company) {
      return NextResponse.json(
        { error: "Invalid API Key" },
        { status: 401 }
      )
    }

    // Parse and validate body
    const body = await req.json()
    const validatedData = leadSchema.parse(body)

    // Check for duplicates (optional - based on email)
    if (validatedData.email) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          companyId: company.id,
          email: validatedData.email,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      })

      if (existingLead) {
        const duration = Date.now() - startTime
        
        // Log the duplicate
        await prisma.webhookLog.create({
          data: {
            companyId: company.id,
            type: "lead_created",
            payload: body,
            statusCode: 409,
            durationMs: duration,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          },
        })

        return NextResponse.json(
          { reason: "duplicate", message: "Lead with this email already exists in the last 7 days" },
          { status: 409 }
        )
      }
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        source: validatedData.source || "Webhook",
        tags: validatedData.tags || [],
        notes: validatedData.notes,
        status: "NEW",
      },
    })

    const duration = Date.now() - startTime

    // Log the webhook
    await prisma.webhookLog.create({
      data: {
        companyId: company.id,
        type: "lead_created",
        payload: body,
        statusCode: 201,
        response: { id: lead.id },
        durationMs: duration,
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      },
    })

    return NextResponse.json(
      { id: lead.id, status: "created" },
      { status: 201 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


