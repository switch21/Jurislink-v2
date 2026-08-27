import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { deleteFile } from '@/lib/storage'

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
      select: { filePath: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.filePath) {
      await deleteFile(document.filePath).catch(() => {})
    }

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
