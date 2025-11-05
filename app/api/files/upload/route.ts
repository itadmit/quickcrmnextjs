import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

interface ExtendedSession {
  user: {
    id: string
    companyId: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const entityType = formData.get("entityType") as string
    const entityId = formData.get("entityId") as string
    const clientId = formData.get("clientId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Missing entityType or entityId" }, { status: 400 })
    }

    // יצירת תיקיית uploads אם לא קיימת
    const uploadsDir = join(process.cwd(), "uploads", entityType)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // שמירת הקובץ
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filePath = join(uploadsDir, fileName)
    
    await writeFile(filePath, buffer)

    // שמירת הקובץ במסד הנתונים
    const fileRecord = await prisma.file.create({
      data: {
        companyId: session.user.companyId,
        entityType,
        entityId,
        path: `/uploads/${entityType}/${fileName}`,
        name: file.name,
        size: buffer.length,
        mimeType: file.type || null,
        uploadedBy: session.user.id,
        clientId: clientId || null,
      },
    })

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        path: fileRecord.path,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        createdAt: fileRecord.createdAt,
      },
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}

