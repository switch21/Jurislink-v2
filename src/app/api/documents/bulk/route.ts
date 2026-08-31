import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { deleteFile } from '@/lib/storage'

/**
 * POST /api/documents/bulk
 * Body: { action: 'delete' | 'folder' | 'status' | 'tags', ids: string[], value?: string }
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'document', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const body = await request.json()
    const { action, ids, value } = body as { action: string; ids: string[]; value?: string }

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'action and ids are required' }, { status: 400 })
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 documents at a time' }, { status: 400 })
    }

    switch (action) {
      case 'delete': {
        // Fetch all docs for file deletion
        const docs = await db.document.findMany({
          where: { id: { in: ids } },
          select: { id: true, filePath: true, fileName: true, tenantId: true },
        })

        // Delete version files
        for (const doc of docs) {
          const versions = await db.documentVersion.findMany({
            where: { documentId: doc.id },
            select: { filePath: true },
          })
          for (const v of versions) {
            if (v.filePath) await deleteFile(v.filePath).catch(() => {})
          }
        }

        // Delete versions + documents in DB
        await db.documentVersion.deleteMany({ where: { documentId: { in: ids } } })
        await db.document.deleteMany({ where: { id: { in: ids } } })

        // Delete main files
        for (const doc of docs) {
          if (doc.filePath) await deleteFile(doc.filePath).catch(() => {})

          // Audit log per doc
          await db.auditLog.create({
            data: {
              action: 'document.delete',
              resourceType: 'document',
              resourceId: doc.id,
              metadata: JSON.stringify({ fileName: doc.fileName, bulk: true }),
              tenantId: doc.tenantId,
              userId: auth.id || null,
            },
          }).catch(() => {})
        }

        return NextResponse.json({ ok: true, deleted: ids.length })
      }

      case 'folder': {
        if (!value) return NextResponse.json({ error: 'value (folder name) is required' }, { status: 400 })
        const result = await db.document.updateMany({
          where: { id: { in: ids } },
          data: { folder: value },
        })
        return NextResponse.json({ ok: true, updated: result.count })
      }

      case 'status': {
        if (!value || !['actif', 'archivé'].includes(value)) {
          return NextResponse.json({ error: 'value must be actif or archivé' }, { status: 400 })
        }
        const result = await db.document.updateMany({
          where: { id: { in: ids } },
          data: { status: value },
        })
        return NextResponse.json({ ok: true, updated: result.count })
      }

      case 'tags': {
        if (!value) return NextResponse.json({ error: 'value (tags) is required' }, { status: 400 })
        const result = await db.document.updateMany({
          where: { id: { in: ids } },
          data: { tags: value },
        })
        return NextResponse.json({ ok: true, updated: result.count })
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: delete, folder, status, tags' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bulk documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
