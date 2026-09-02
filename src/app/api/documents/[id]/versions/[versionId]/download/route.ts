import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { downloadFile } from '@/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await authenticate(request, 'document', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { versionId } = await params
    const version = await db.documentVersion.findUnique({ where: { id: versionId } })
    if (!version) {
      return NextResponse.json({ error: 'Version non trouvée' }, { status: 404 })
    }

    let fileBuffer: Buffer
    try {
      fileBuffer = await downloadFile(version.filePath)
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable sur le serveur' }, { status: 404 })
    }

    const ext = version.fileName.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp',
      txt: 'text/plain', csv: 'text/csv',
    }
    const contentType = version.mimeType || mimeMap[ext || ''] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(version.fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Download version error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
