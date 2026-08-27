import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { uploadFile } from '@/lib/storage'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'document', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const caseId = searchParams.get('caseId')
    const search = searchParams.get('search')
    const tag = searchParams.get('tag')
    const folder = searchParams.get('folder')
    const documentType = searchParams.get('documentType')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (caseId) where.caseId = caseId
    if (folder) where.folder = folder
    if (documentType) where.documentType = documentType
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (tag) {
      ;(where as Record<string, unknown>).tags = { contains: tag }
    }

    const documents = await db.document.findMany({
      where,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })

    const allDocs = await db.document.findMany({
      where: { tenantId },
      select: { tags: true },
    })
    const tagSet = new Set<string>()
    for (const d of allDocs) {
      if (d.tags) {
        for (const t of d.tags.split(',').map((s) => s.trim()).filter(Boolean)) {
          tagSet.add(t)
        }
      }
    }

    const folderSet = new Set<string>()
    for (const d of documents as Array<{ folder?: string | null }>) {
      if (d.folder) folderSet.add(d.folder)
    }

    return NextResponse.json({
      documents,
      tags: Array.from(tagSet).sort(),
      folders: Array.from(folderSet).sort(),
      total: documents.length,
    })
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'document', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tenantId = formData.get('tenantId') as string | null
    const caseId = formData.get('caseId') as string | null
    const folder = (formData.get('folder') as string | null) || 'Général'
    const tags = formData.get('tags') as string | null
    const documentType = formData.get('documentType') as string | null
    const description = (formData.get('description') as string | null) || null

    if (!file || !tenantId) {
      return NextResponse.json(
        { error: 'file and tenantId are required' },
        { status: 400 }
      )
    }

    const storageKey = await uploadFile(file, file.name, file.type, tenantId)

    const document = await db.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        filePath: storageKey,
        version: 1,
        folder,
        tags: tags || null,
        documentType: documentType || null,
        mimeType: file.type || null,
        description,
        uploadedById: auth.id || null,
        tenantId,
        caseId: caseId || null,
      },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        uploadedBy: { select: { id: true, fullName: true } },
        _count: { select: { versions: true } },
      },
    })
    // Trigger real-time notification (fire-and-forget)
    fetch('http://localhost:3005/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        type: 'document',
        title: 'Nouveau document',
        message: `Nouveau document : ${file.name}`,
        resourceType: 'document',
        resourceId: document.id,
      }),
    }).catch(() => {})

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Create document error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
