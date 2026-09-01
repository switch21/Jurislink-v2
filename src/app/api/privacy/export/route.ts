import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/**
 * POST /api/privacy/export
 * Droit d'accès (Loi 2024/017) — export complet des données utilisateur.
 * Génère un JSON téléchargeable avec toutes les données liées à l'utilisateur.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'user', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const userId = auth.id
    const tenantId = auth.tenantId

    // ── Collecte des données utilisateur ──
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        preferredLanguage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
        roleObj: { select: { name: true, label: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // ── Dossiers où l'utilisateur est participant ──
    const cases = await db.caseAssignment.findMany({
      where: { userId },
      include: {
        case: {
          include: {
            client: { select: { id: true, fullName: true, email: true, phone: true, niu: true } },
            documents: {
              select: { id: true, fileName: true, fileSize: true, documentType: true, createdAt: true },
            },
            notes: {
              select: { id: true, content: true, createdAt: true, author: { select: { id: true, fullName: true } } },
              orderBy: { createdAt: 'desc' },
            },
            communications: {
              select: { id: true, type: true, subject: true, content: true, status: true, sentAt: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
            tasks: {
              select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    // ── Documents uploadés par l'utilisateur ──
    const documents = await db.document.findMany({
      where: { uploadedById: userId },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        documentType: true,
        mimeType: true,
        status: true,
        createdAt: true,
        case: { select: { id: true, title: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Notes (case notes) rédigées par l'utilisateur ──
    const notes = await db.caseNote.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        case: { select: { id: true, title: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Factures du cabinet (si l'utilisateur a accès au tenant) ──
    let invoices: unknown[] = []
    if (tenantId) {
      invoices = await db.invoice.findMany({
        where: { tenantId },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          amount: true,
          paidAmount: true,
          status: true,
          issuedAt: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
          client: { select: { id: true, fullName: true } },
          case: { select: { id: true, title: true, reference: true } },
          lineItems: { select: { description: true, quantity: true, unitPrice: true, total: true } },
          payments: { select: { id: true, amount: true, method: true, status: true, paidAt: true, reference: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    // ── Paiements enregistrés par l'utilisateur ──
    const payments = await db.payment.findMany({
      where: { recordedBy: userId },
      select: {
        id: true,
        amount: true,
        method: true,
        reference: true,
        status: true,
        paidAt: true,
        createdAt: true,
        invoice: { select: { id: true, invoiceNumber: true, client: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Communications envoyées par l'utilisateur ──
    const communications = await db.communication.findMany({
      where: { sentById: userId },
      select: {
        id: true,
        type: true,
        subject: true,
        content: true,
        status: true,
        recipientEmail: true,
        recipientPhone: true,
        sentAt: true,
        createdAt: true,
        case: { select: { id: true, title: true, reference: true } },
        client: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Journal d'audit de l'utilisateur ──
    const auditLogs = await db.auditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        metadata: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    })

    // ── Time entries de l'utilisateur ──
    const timeEntries = await db.timeEntry.findMany({
      where: { userId },
      select: {
        id: true,
        description: true,
        startTime: true,
        endTime: true,
        duration: true,
        isBillable: true,
        hourlyRate: true,
        totalAmount: true,
        billed: true,
        createdAt: true,
        case: { select: { id: true, title: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Construire l'export JSON ──
    const exportData = {
      exportMeta: {
        generatedAt: new Date().toISOString(),
        userId,
        format: 'jurislink-privacy-export-v1',
        loi: 'Loi n°2024/017 du 17 juillet 2024 relative à la protection des données personnelles',
      },
      user,
      cases: cases.map((a) => a.case),
      documents,
      notes,
      invoices,
      payments,
      communications,
      auditLogs,
      timeEntries,
    }

    const jsonStr = JSON.stringify(exportData, null, 2)

    // ── Enregistrer la demande d'export dans data_export_requests ──
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''

    await db.$executeRaw`
      INSERT INTO data_export_requests (id, user_id, tenant_id, status, file_path, completed_at, expires_at, created_at)
      VALUES (
        gen_random_uuid(),
        ${userId}::uuid,
        ${tenantId || null}::uuid,
        'completed',
        NULL,
        NOW(),
        NOW() + INTERVAL '30 days',
        NOW()
      )
    `

    // ── Journal d'audit ──
    await db.auditLog.create({
      data: {
        action: 'data_export',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify({ format: 'json', sizeBytes: Buffer.byteLength(jsonStr, 'utf-8') }),
        ipAddress,
        userAgent,
        tenantId: tenantId || '',
        userId,
      },
    })

    // ── Retourner le fichier JSON en téléchargement ──
    const dateStr = new Date().toISOString().slice(0, 10)
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="jurislink-export-${dateStr}.json"`,
      },
    })
  } catch (error) {
    console.error('Export des données erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'export des données' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
