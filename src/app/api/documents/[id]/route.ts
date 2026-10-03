import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { deleteFile } from '@/lib/storage'
import { auditAction } from '@/lib/auditLog'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'document', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const document = await db.document.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        tenant: true,
      },
    })
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    return NextResponse.json(document)
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'document', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()

    // Build update data with only provided fields
    const data: Record<string, unknown> = {}
    if (body.fileName !== undefined) data.fileName = body.fileName
    if (body.version !== undefined) data.version = body.version
    if (body.folder !== undefined) data.folder = body.folder
    if (body.tags !== undefined) data.tags = body.tags
    if (body.documentType !== undefined) data.documentType = body.documentType
    if (body.description !== undefined) data.description = body.description
    if (body.status !== undefined) data.status = body.status

    // Fetch existing doc for audit
    const existing = await db.document.findUnique({
      where: { id },
      select: { id: true, fileName: true, tenantId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const document = await db.document.update({
      where: { id },
      data,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { versions: true } },
      },
    })

    // Audit log
    await auditAction(request, auth, 'Document modifié', {
      resourceType: 'Document',
      resourceId: id,
      tenantId: existing.tenantId,
      metadata: { fileName: existing.fileName, changed: data },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Update document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'document', 'delete')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

    const document = await db.document.findUnique({
      where: { id },
      select: { filePath: true, fileName: true, tenantId: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete all version storage files first
    const versions = await db.documentVersion.findMany({
      where: { documentId: id },
      select: { filePath: true },
    })
    for (const v of versions) {
      if (v.filePath) await deleteFile(v.filePath).catch(() => {})
    }
    await db.documentVersion.deleteMany({ where: { documentId: id } })

    // Delete the main document file
    if (document.filePath) {
      await deleteFile(document.filePath).catch(() => {})
    }

    await db.document.delete({ where: { id } })

    // Audit log
    await auditAction(request, auth, 'Document supprimé', {
      resourceType: 'Document',
      resourceId: id,
      tenantId: document.tenantId,
      metadata: { fileName: document.fileName },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
