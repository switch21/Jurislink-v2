import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { downloadFile } from '@/lib/storage'
import { decryptBuffer } from '@/lib/encryption'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'document', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const doc = await db.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Access control: confidential documents only accessible by assigned lawyers & firm_admin
    if (doc.isConfidential && auth.role !== 'root_admin') {
      const isAssigned = await db.caseAssignment.findFirst({
        where: { userId: auth.id, caseId: doc.caseId, tenantId: doc.tenantId },
      })
      const isAdmin = auth.role === 'firm_admin' && auth.tenantId === doc.tenantId
      if (!isAssigned && !isAdmin && doc.uploadedById !== auth.id) {
        return NextResponse.json({ error: 'Accès restreint — document confidentiel' }, { status: 403 })
      }
    }

    let fileBuffer: Buffer
    try {
      fileBuffer = await downloadFile(doc.filePath)
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable sur le serveur' }, { status: 404 })
    }

    // Decrypt if encrypted
    if (doc.isEncrypted && doc.encryptionIv) {
      try {
        fileBuffer = decryptBuffer(fileBuffer, doc.encryptionIv)
      } catch (err) {
        console.error('Decryption failed:', err)
        return NextResponse.json({ error: 'Erreur de déchiffrement' }, { status: 500 })
      }
    }

    const ext = doc.fileName.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      txt: 'text/plain', csv: 'text/csv',
      zip: 'application/zip', rar: 'application/x-rar-compressed',
    }
    const contentType = doc.mimeType || mimeMap[ext || ''] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Download document error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
