import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import PDFDocument from 'pdfkit'

export async function POST(request: Request) {
  const auth = await authenticate(request, 'document', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()

  try {
    const body = await request.json()
    const { templateId, caseId, variables } = body as {
      templateId: string
      caseId: string
      variables: Record<string, string>
    }

    if (!templateId || !caseId) {
      return NextResponse.json(
        { error: 'templateId et caseId sont requis' },
        { status: 400 },
      )
    }

    // Fetch template
    const template = await db.documentTemplate.findUnique({
      where: { id: templateId },
    })
    if (!template) {
      return NextResponse.json(
        { error: 'Modèle non trouvé' },
        { status: 404 },
      )
    }

    // Tenant check
    if (auth.role !== 'root_admin' && auth.tenantId !== template.tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fetch case with client and tenant
    const caze = await db.case.findUnique({
      where: { id: caseId },
      include: {
        client: { select: { fullName: true, company: true, email: true, phone: true } },
        tenant: { select: { name: true } },
      },
    })
    if (!caze) {
      return NextResponse.json(
        { error: 'Dossier non trouvé' },
        { status: 404 },
      )
    }
    if (auth.role !== 'root_admin' && auth.tenantId !== caze.tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Build auto-populated variables
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`

    const amountStr = caze.amountInDispute
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(caze.amountInDispute)
      : ''

    const autoVars: Record<string, string> = {
      case_reference: caze.reference || '',
      case_title: caze.title || '',
      client_name: caze.client?.fullName || '',
      client_company: caze.client?.company || '',
      client_email: caze.client?.email || '',
      client_phone: caze.client?.phone || '',
      adversary: caze.adversary || '',
      jurisdiction: caze.jurisdiction || '',
      amount: amountStr,
      date: dateStr,
      tenant_name: caze.tenant?.name || '',
    }

    // User-provided variables override auto-populated ones
    const mergedVars = { ...autoVars, ...(variables || {}) }

    // Replace all {{variable}} placeholders
    let content = template.content
    for (const [key, val] of Object.entries(mergedVars)) {
      content = content.replaceAll(`{{${key}}}`, val)
    }

    // Generate PDF
    const pdfDoc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 55, right: 55 },
      bufferPages: true,
    })

    const chunks: Uint8Array[] = []
    pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk))

    const pageWidth = pdfDoc.page.width - pdfDoc.page.margins.left - pdfDoc.page.margins.right

    // Helper to format date
    const formatDateHeader = () => {
      return now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // HEADER — Tenant name
    pdfDoc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#1E5A8A')
      .text(caze.tenant?.name || 'JurisLink', 55, 40, { align: 'center', width: pageWidth })

    pdfDoc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#6B7280')
      .text(formatDateHeader(), 55, 60, { align: 'center', width: pageWidth })

    // Horizontal line under header
    pdfDoc
      .moveTo(55, 78)
      .lineTo(55 + pageWidth, 78)
      .strokeColor('#C8A45D')
      .lineWidth(1.5)
      .stroke()

    // Document title
    pdfDoc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#111827')
      .text(template.name, 55, 92, { align: 'center', width: pageWidth })

    // Case reference line
    if (caze.reference) {
      pdfDoc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#6B7280')
        .text(`Dossier : ${caze.reference}`, 55, 112, { align: 'center', width: pageWidth })
    }

    // Spacer
    pdfDoc.moveDown(1.5)

    // BODY — Parse content with **bold** support and line breaks
    const bodyTop = pdfDoc.y
    const lines = content.split('\n')
    
    for (const line of lines) {
      // Check if we need a new page
      if (pdfDoc.y > pdfDoc.page.height - pdfDoc.page.margins.bottom - 30) {
        pdfDoc.addPage()
      }

      if (line.trim() === '') {
        pdfDoc.moveDown(0.5)
        continue
      }

      // Parse **bold** segments
      const segments = line.split(/(\*\*[^*]+\*\*)/g)
      let x = pdfDoc.page.margins.left
      const y = pdfDoc.y
      let hasContent = false

      for (const seg of segments) {
        if (!seg) continue
        const isBold = /^\*\*[^*]+\*\*$/.test(seg)
        const text = isBold ? seg.replace(/^\*\*/, '').replace(/\*\*$/, '') : seg
        if (!text) continue

        pdfDoc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(10.5)
          .fillColor('#374151')
          .text(text, x, pdfDoc.y, {
            lineGap: 3,
            width: pageWidth - (x - pdfDoc.page.margins.left),
            continued: false,
          })
        hasContent = true
        x = pdfDoc.page.margins.left // Reset x after each segment
      }

      if (hasContent) {
        pdfDoc.moveDown(0.3)
      }
    }

    // FOOTER with page numbers
    const range = pdfDoc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      pdfDoc.switchToPage(i)
      // Bottom line
      pdfDoc
        .moveTo(55, pdfDoc.page.height - 40)
        .lineTo(55 + pageWidth, pdfDoc.page.height - 40)
        .strokeColor('#E5E7EB')
        .lineWidth(0.5)
        .stroke()
      // Page number
      pdfDoc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#9CA3AF')
        .text(
          `Page ${i + 1} / ${range.count}`,
          55,
          pdfDoc.page.height - 35,
          { align: 'center', width: pageWidth },
        )
    }

    pdfDoc.end()

    // Wait for all chunks, then assemble the buffer
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', reject)
    })

    const safeFileName = `${template.name.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_')}_${caze.reference || 'doc'}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFileName)}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne du serveur'
    console.error('Document generation error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
