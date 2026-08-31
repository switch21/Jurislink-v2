import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { fireNotification } from '@/lib/notify'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/vnd.rar',
  // Text
  'text/plain',
  'text/csv',
  // OpenDocument
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
])

export async function GET(request: Request) {
  const db = getDb()
  try {
    const portalUserId = request.headers.get('X-Portal-User-Id')
    if (!portalUserId || !UUID_REGEX.test(portalUserId)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const portalAccount = await db.clientPortal.findUnique({
      where: { id: portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Get all case IDs for this client (excluding secret cases)
    const clientCaseIds = await db.case.findMany({
      where: {
        clientId: portalAccount.clientId,
        tenantId: portalAccount.tenantId,
        isSecret: false,
      },
      select: { id: true },
    })

    const caseIds = clientCaseIds.map((c) => c.id)
    if (caseIds.length === 0) {
      return NextResponse.json([])
    }

    const where: Record<string, unknown> = { caseId: { in: caseIds } }
    if (search) {
      where.fileName = { contains: search, mode: 'insensitive' }
    }

    const documents = await db.document.findMany({
      where,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        uploadedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal documents error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    // 1. Portal auth validation
    const portalUserId = request.headers.get('X-Portal-User-Id')
    if (!portalUserId || !UUID_REGEX.test(portalUserId)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const portalAccount = await db.clientPortal.findUnique({
      where: { id: portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2. Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null
    const folder = (formData.get('folder') as string | null) || undefined
    const description = (formData.get('description') as string | null) || undefined
    const documentType = (formData.get('documentType') as string | null) || undefined

    // 3. File validation
    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    if (!caseId || !UUID_REGEX.test(caseId)) {
      return NextResponse.json({ error: 'caseId invalide' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` },
        { status: 400 },
      )
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 },
      )
    }

    // 4. Verify case belongs to this client and is not secret
    const targetCase = await db.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        clientId: true,
        tenantId: true,
        isSecret: true,
        reference: true,
        title: true,
      },
    })

    if (!targetCase) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }

    if (targetCase.clientId !== portalAccount.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (targetCase.isSecret) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // 5. Upload file using storage utility
    const storageKey = await uploadFile(file, file.name, file.type, portalAccount.tenantId)

    // 6. Create Document record with pending status
    const document = await db.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        filePath: storageKey,
        version: 1,
        folder: folder || null,
        documentType: documentType || null,
        mimeType: file.type || null,
        description: description || null,
        status: 'en_attente',
        uploadedByPortalId: portalAccount.id,
        tenantId: portalAccount.tenantId,
        caseId: targetCase.id,
      },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        uploadedByPortal: { select: { id: true } },
      },
    })

    // 7. Fire notification to tenant's users
    fireNotification({
      tenantId: portalAccount.tenantId,
      type: 'document',
      title: 'Document portail en attente',
      message: `Un client a déposé le document « ${file.name} » dans le dossier ${targetCase.reference} — en attente de validation.`,
      resourceType: 'document',
      resourceId: document.id,
    })

    // 8. Return created document
    return NextResponse.json(document, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal document upload error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
