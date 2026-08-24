import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const document = await db.document.update({
      where: { id },
      data: {
        version: body.version,
        folder: body.folder,
        tags: body.tags,
        documentType: body.documentType,
      },
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params

    // Fetch document to get file path before deleting
    const document = await db.document.findUnique({
      where: { id },
      select: { filePath: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete file from disk
    if (document.filePath) {
      const absolutePath = path.join(process.cwd(), 'uploads', document.filePath)
      try {
        await unlink(absolutePath)
      } catch (fsError) {
        // Log but don't fail if file is already missing
        console.warn(`File not found on disk: ${absolutePath}`, fsError)
      }
    }

    // Delete database record
    await db.document.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
