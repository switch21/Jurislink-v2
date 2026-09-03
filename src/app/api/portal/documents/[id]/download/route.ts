import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { downloadFile } from '@/lib/storage'
import { authenticatePortal } from '@/lib/portal-auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params

    // Look up portal account and verify access via client relation
    const portalAccount = await db.clientPortal.findUnique({
      where: { id: auth.portalUserId },
      select: { clientId: true, tenantId: true, isActive: true },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const doc = await db.document.findUnique({
      where: { id },
      include: {
        case: { select: { clientId: true } },
      },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (doc.case?.clientId !== portalAccount.clientId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let fileBuffer: Buffer
    try {
      fileBuffer = await downloadFile(doc.filePath)
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    const ext = doc.fileName.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif', webp: 'image/webp',
      txt: 'text/plain', csv: 'text/csv',
    }
    const contentType = doc.mimeType || mimeMap[ext || ''] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Portal download error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
