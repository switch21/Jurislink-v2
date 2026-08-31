/**
 * GET  /api/documents/[id]/versions — List all versions of a document
 * POST /api/documents/[id]/versions — Upload a new version
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { uploadFile } from '@/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'document', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const versions = await db.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
    })
    return NextResponse.json(versions)
  } catch (error) {
    console.error('List versions error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'document', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

    const doc = await db.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const changeNote = (formData.get('changeNote') as string) || null

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    const storageKey = await uploadFile(file, file.name, file.type, doc.tenantId || undefined)

    // Archive current version
    await db.documentVersion.create({
      data: {
        version: doc.version,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        filePath: doc.filePath,
        mimeType: doc.mimeType,
        changeNote: null,
        documentId: id,
        uploadedById: auth.id || null,
      },
    })

    const newVersion = doc.version + 1
    const updated = await db.document.update({
      where: { id },
      data: {
        fileName: file.name,
        fileSize: file.size,
        filePath: storageKey,
        version: newVersion,
        mimeType: file.type || doc.mimeType,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'document.version.create',
        resourceType: 'document',
        resourceId: id,
        metadata: JSON.stringify({ newVersion, fileName: file.name, changeNote }),
        tenantId: doc.tenantId,
        userId: auth.id || null,
      },
    }).catch(() => {})

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('Upload version error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
