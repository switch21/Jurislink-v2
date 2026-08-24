import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const caseId = searchParams.get('caseId')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (caseId) where.caseId = caseId

    const documents = await db.document.findMany({
      where,
      include: {
        case: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(documents)
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tenantId = formData.get('tenantId') as string | null
    const caseId = formData.get('caseId') as string | null
    const folder = (formData.get('folder') as string | null) || 'Général'
    const tags = formData.get('tags') as string | null
    const documentType = formData.get('documentType') as string | null

    if (!file || !tenantId) {
      return NextResponse.json(
        { error: 'file and tenantId are required' },
        { status: 400 }
      )
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename to avoid collisions
    const ext = path.extname(file.name)
    const uniqueName = `${randomUUID()}${ext}`
    const filePath = path.join(uploadsDir, uniqueName)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Store relative path from uploads/
    const relativePath = uniqueName

    const document = await db.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        filePath: relativePath,
        version: 1,
        folder,
        tags: tags || null,
        documentType: documentType || null,
        mimeType: file.type || null,
        tenantId,
        caseId: caseId || null,
      },
    })
    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Create document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
