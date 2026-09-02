import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const TVA_RATE = 0.1925
const COLORS = {
  primary: '#1E5A8A',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#D1D5DB',
  red: '#DC2626',
  green: '#059669',
  white: '#FFFFFF',
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' FCFA'
}

function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d))
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'invoice', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        case: { select: { id: true, reference: true, title: true } },
        tenant: true,
        currency: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const t = invoice.tenant
    const c = invoice.client
    const cur = invoice.currency?.code ?? 'XAF'

    // Build line items from DB lineItems or fallback to notes
    let items = invoice.lineItems.map(li => ({
      description: li.description,
      quantity: li.quantity || 1,
      unitPrice: li.unitPrice || (li.total || 0),
      total: li.total || 0,
    }))

    if (items.length === 0) {
      const notesText = invoice.notes || ''
      const lines = notesText.split('\n').filter(l => l.trim())
      items = lines.map(line => {
        if (line.includes('|')) {
          const [desc, amt] = line.split('|')
          const amount = parseFloat((amt || '0').trim())
          return { description: desc.trim(), quantity: 1, unitPrice: isNaN(amount) ? 0 : amount, total: isNaN(amount) ? 0 : amount }
        }
        return { description: line.trim(), quantity: 1, unitPrice: 0, total: 0 }
      })
    }

    const htTotal = items.reduce((s, i) => s + (i.total > 0 ? i.total : i.quantity * i.unitPrice), 0)
    const tvaAmount = Math.round(htTotal * TVA_RATE)
    const ttcTotal = htTotal + tvaAmount
    const totalPaid = invoice.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0
    const remaining = ttcTotal - totalPaid

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // ---- HEADER ----
    // Blue accent bar at top
    doc.rect(0, 0, 595.28, 6).fill(COLORS.primary)

    const logoPath = t.logoUrl ? path.join(process.cwd(), 'public', t.logoUrl) : null
    let logoW = 0
    let hasLogo = false
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const imgBuf = fs.readFileSync(logoPath)
        doc.image(imgBuf, 50, 24, { height: 55 })
        logoW = 70
        hasLogo = true
      } catch { /* skip broken logo */ }
    }

    const firmX = 50 + logoW + 10
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary).text(t.name || 'JurisLink', firmX, 28, { width: 300 })
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray)
    let firmInfoY = 48
    if (t.address) { doc.text(t.address + (t.city ? `, ${t.city}` : '') + (t.country ? ` — ${t.country}` : ''), firmX, firmInfoY, { width: 300 }); firmInfoY += 12 }
    const contactLine = [t.phone, t.email].filter(Boolean).join('  |  ')
    if (contactLine) { doc.text(contactLine, firmX, firmInfoY, { width: 300 }); firmInfoY += 12 }
    if (t.niu) { doc.text(`NIU : ${t.niu}`, firmX, firmInfoY, { width: 300 }); firmInfoY += 12 }

    // Invoice title
    const yTitle = hasLogo ? 100 : 40
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.primary)
    doc.text(invoice.type === 'devis' ? 'DEVIS' : invoice.type === 'avoir' ? 'AVOIR' : 'FACTURE', 380, yTitle, { align: 'right', width: 160 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark)
    doc.text(invoice.invoiceNumber || '', 380, yTitle + 25, { align: 'right', width: 160 })

    const topContent = Math.max(yTitle + 55, 110)

    // ---- INFO BOXES ----
    doc.moveDown(1)
    const boxY = topContent + 5

    // Client box
    doc.roundedRect(50, boxY, 230, 80, 4).stroke(COLORS.border)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.gray).text('CLIENT', 60, boxY + 8)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark).text(c.fullName, 60, boxY + 20, { width: 210 })
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray)
    if (c.company) doc.text(c.company, 60, boxY + 34, { width: 210 })
    let infoY = c.company ? boxY + 46 : boxY + 34
    if (c.address) { doc.text(c.address, 60, infoY, { width: 210 }); infoY += 12 }
    doc.text([c.email, c.phone].filter(Boolean).join('  |  '), 60, infoY, { width: 210 })

    // Invoice details box
    doc.roundedRect(300, boxY, 240, 80, 4).stroke(COLORS.border)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.gray).text('DÉTAILS FACTURE', 310, boxY + 8)
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.dark)
    doc.text(`Date : ${fmtDate(invoice.issuedAt ?? new Date())}`, 310, boxY + 22)
    doc.text(`Échéance : ${invoice.dueDate ? fmtDate(invoice.dueDate) : '—'}`, 310, boxY + 34)
    if (invoice.case?.reference) doc.text(`Dossier : ${invoice.case.reference}`, 310, boxY + 46)
    const statusLabel: Record<string, string> = { paye: 'Payée', non_paye: 'Non payée', partiel: 'Partiellement payée' }
    doc.text(`Statut : ${statusLabel[invoice.status] || invoice.status}`, 310, boxY + (invoice.case?.reference ? 58 : 46))

    // ---- TABLE ----
    const tableY = boxY + 95
    const colX = [50, 280, 340, 400, 470] // desc, qty, pu, ht, ttc
    const colW = [230, 60, 60, 70, 70]

    // Header
    doc.rect(50, tableY, 490, 18).fill(COLORS.primary)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
    doc.text('DESCRIPTION', colX[0] + 5, tableY + 5, { width: colW[0] - 10 })
    doc.text('QTE', colX[1] + 5, tableY + 5, { width: colW[1] - 10, align: 'right' })
    doc.text('P.U. HT', colX[2] + 5, tableY + 5, { width: colW[2] - 10, align: 'right' })
    doc.text('MONT. HT', colX[3] + 5, tableY + 5, { width: colW[3] - 10, align: 'right' })
    doc.text('MONT. TTC', colX[4] + 5, tableY + 5, { width: colW[4] - 10, align: 'right' })

    // Rows
    let rowY = tableY + 18
    for (const item of items) {
      const ht = item.total > 0 ? item.total : item.quantity * item.unitPrice
      const ttc = Math.round(ht * (1 + TVA_RATE))
      if (rowY > 680) break // page limit
      doc.rect(50, rowY, 490, 16).fill(items.indexOf(item) % 2 === 0 ? COLORS.white : COLORS.lightGray)
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.dark)
      doc.text(item.description || '—', colX[0] + 5, rowY + 4, { width: colW[0] - 10 })
      doc.text(String(item.quantity), colX[1] + 5, rowY + 4, { width: colW[1] - 10, align: 'right' })
      doc.text(fmtMoney(item.unitPrice), colX[2] + 5, rowY + 4, { width: colW[2] - 10, align: 'right' })
      doc.text(fmtMoney(ht), colX[3] + 5, rowY + 4, { width: colW[3] - 10, align: 'right' })
      doc.text(fmtMoney(ttc), colX[4] + 5, rowY + 4, { width: colW[4] - 10, align: 'right' })
      rowY += 16
    }

    // Totals section
    rowY += 10
    doc.rect(50, rowY, 490, 1).fill(COLORS.border)
    rowY += 8

    const totalsX = 340
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray)
    doc.text('Total HT', totalsX, rowY, { width: 100, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark)
    doc.text(fmtMoney(htTotal), totalsX + 110, rowY, { width: 90, align: 'right' })
    rowY += 16

    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray)
    doc.text('TVA (19.25%)', totalsX, rowY, { width: 100, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark)
    doc.text(fmtMoney(tvaAmount), totalsX + 110, rowY, { width: 90, align: 'right' })
    rowY += 16

    doc.rect(totalsX, rowY, 200, 1).fill(COLORS.border)
    rowY += 4

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    doc.text('Total TTC', totalsX, rowY, { width: 100, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.dark)
    doc.text(fmtMoney(ttcTotal), totalsX + 110, rowY, { width: 90, align: 'right' })
    rowY += 20

    if (totalPaid > 0) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.green)
      doc.text('Déjà payé', totalsX, rowY, { width: 100, align: 'right' })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.green)
      doc.text('- ' + fmtMoney(totalPaid), totalsX + 110, rowY, { width: 90, align: 'right' })
      rowY += 16

      doc.font('Helvetica-Bold').fontSize(9).fillColor(remaining > 0 ? COLORS.red : COLORS.green)
      doc.text('Reste à payer', totalsX, rowY, { width: 100, align: 'right' })
      doc.font('Helvetica-Bold').fontSize(11).fillColor(remaining > 0 ? COLORS.red : COLORS.green)
      doc.text(fmtMoney(remaining), totalsX + 110, rowY, { width: 90, align: 'right' })
      rowY += 20
    }

    // Footer
    doc.rect(50, 730, 490, 0.5).fill(COLORS.primary)
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.gray)
    const footerParts = [t.name, t.address, t.city, t.phone, t.email].filter(Boolean)
    doc.text(footerParts.join('  —  '), 50, 738, { width: 490, align: 'center' })
    if (t.niu) doc.text(`NIU : ${t.niu}`, 50, 748, { width: 490, align: 'center' })
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.gray)
    doc.text('Document généré par JurisLink', 50, 758, { width: 490, align: 'center' })

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${invoice.invoiceNumber || 'facture'}.pdf"`,
          },
        }))
      })
    })
  } catch (error) {
    console.error('PDF invoice error:', error)
    return NextResponse.json({ error: 'Erreur de génération PDF' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
