import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { triggerAutomation } from "@/lib/automation-engine"
import { notifyMeetingScheduled } from "@/lib/notification-service"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Fetch events from database
    const events = await prisma.event.findMany({
      where: {
        companyId: session.user.companyId,
        ...(month && year ? {
          startTime: {
            gte: new Date(parseInt(year), parseInt(month), 1),
            lt: new Date(parseInt(year), parseInt(month) + 1, 1),
          },
        } : {}),
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Transform to match the expected format
    const meetings = events.map(event => ({
      id: event.id,
      title: event.title,
      startTime: new Date(event.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(event.endTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      type: event.location?.includes('Zoom') || event.location?.includes('Meet') ? 'video' : event.location?.includes('טלפון') || event.location?.includes('Phone') ? 'phone' : 'in-person',
      location: event.location || '',
      attendees: event.attendees,
      date: event.startTime.toISOString(),
      color: 'purple',
    }))

    return NextResponse.json(meetings)
  } catch (error) {
    console.error("Error fetching meetings:", error)
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
    const { title, description, startTime, endTime, location, attendees, isAllDay } = body

    // Create event in database
    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        attendees: attendees || [],
        isAllDay: isAllDay || false,
        companyId: session.user.companyId,
        createdBy: session.user.id,
      },
    })

    // Send notification (in-app + email)
    await notifyMeetingScheduled({
      userId: session.user.id,
      companyId: session.user.companyId,
      eventId: event.id,
      title: event.title,
      startTime: new Date(event.startTime).toLocaleString('he-IL'),
      location: event.location || 'לא צוין',
    })

    // Trigger automation for meeting scheduled
    await triggerAutomation(
      'meeting_scheduled',
      event.id,
      'event',
      event,
      session.user.id,
      session.user.companyId
    )

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

