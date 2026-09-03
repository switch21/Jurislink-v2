import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import PDFDocument from 'pdfkit'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

async function fetchLogoAsBuffer(logoUrl: string): Promise<Buffer | null> {
  try {
    const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    const res = await fetch(`${host}/${logoUrl.replace(/^\//, '')}`, { cache: 'force-cache' })
    if (!res.ok) return null
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch {
    return null
  }
}

const COLORS = { primary: '#1E5A8A', gold: '#C8A45D', dark: '#111827', gray: '#6B7280', lightGray: '#F3F4F6', border: '#D1D5DB', white: '#FFFFFF', green: '#059669', red: '#DC2626' }

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' FCFA'
}
function fmtD(d: Date | string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d))
}

export async function GET(request: Request) {
  const auth = await authenticate(request, 'report', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const clientId = searchParams.get('clientId')

    if (!tenantId) return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })

    const invoiceWhere: Record<string, unknown> = { tenantId }
    if (clientId) invoiceWhere.clientId = clientId
    if (startDate || endDate) {
      invoiceWhere.issuedAt = {}
      if (startDate) (invoiceWhere.issuedAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (invoiceWhere.issuedAt as Record<string, unknown>).lte = new Date(endDate)
    }

    const invoices = await db.invoice.findMany({
      where: invoiceWhere,
      include: { client: { select: { fullName: true, company: true } }, payments: { select: { amount: true } } },
      orderBy: { issuedAt: 'desc' },
    })

    const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0)
    const totalPaid = invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + (p.amount || 0), 0), 0)
    const totalRemaining = Math.max(0, totalAmount - totalPaid)

    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // ---- HEADER ----
    // Blue accent bar at top
    doc.rect(0, 0, 595.28, 6).fill(COLORS.primary)

    // Logo (fetch via HTTP instead of fs — works on Vercel serverless)
    let logoW = 0
    let hasLogo = false
    if (tenant?.logoUrl) {
      const imgBuf = await fetchLogoAsBuffer(tenant.logoUrl)
      if (imgBuf) {
        try {
          doc.image(imgBuf, 50, 24, { height: 55 })
          logoW = 70
          hasLogo = true
        } catch { /* skip broken logo */ }
      }
    }

    // Firm info
    const firmX = 50 + logoW + 10
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary).text(tenant?.name || 'JurisLink', firmX, 28, { width: 300 })
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray)
    let firmInfoY = 48
    if (tenant?.address) {
      doc.text(tenant.address + (tenant.city ? `, ${tenant.city}` : '') + (tenant.country ? ` — ${tenant.country}` : ''), firmX, firmInfoY, { width: 300 })
      firmInfoY += 12
    }
    const contactLine = [tenant?.phone, tenant?.email].filter(Boolean).join('  |  ')
    if (contactLine) { doc.text(contactLine, firmX, firmInfoY, { width: 300 }); firmInfoY += 12 }
    if (tenant?.niu) { doc.text(`NIU : ${tenant.niu}`, firmX, firmInfoY, { width: 300 }); firmInfoY += 12 }

    // Title
    const yTitle = hasLogo ? 100 : 50
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.dark)
    doc.text('Rapport Financier', 50, yTitle)
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(`Généré le ${fmtD(new Date())}`, 50, yTitle + 22)
    if (startDate || endDate) {
      const range = `Période : ${startDate ? fmtD(startDate) : '...'} — ${endDate ? fmtD(endDate) : '...'}`
      doc.text(range, 50, yTitle + 34)
    }

    // KPI boxes
    let y = yTitle + 55
    const kpis = [
      { label: 'Total facturé', value: fmt(totalAmount), color: COLORS.primary },
      { label: 'Encaissé', value: fmt(totalPaid), color: COLORS.green },
      { label: 'À recouvrer', value: fmt(totalRemaining), color: COLORS.red },
      { label: 'Nb factures', value: String(invoices.length), color: COLORS.dark },
    ]
    const boxW = 115
    for (let i = 0; i < kpis.length; i++) {
      const x = 50 + i * (boxW + 8)
      // Top accent line on each KPI box
      doc.rect(x, y, boxW, 2).fill(kpis[i].color)
      doc.roundedRect(x, y + 2, boxW, 38, 0).stroke(COLORS.border)
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.gray).text(kpis[i].label, x + 8, y + 8, { width: boxW - 16 })
      doc.font('Helvetica-Bold').fontSize(11).fillColor(kpis[i].color).text(kpis[i].value, x + 8, y + 22, { width: boxW - 16 })
    }

    // Invoices table
    y += 55
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark).text('Détail des factures', 50, y)
    y += 18

    const colX = [50, 130, 200, 340, 420, 490]
    const colW = [80, 70, 140, 80, 70, 70]

    doc.rect(50, y, 490, 16).fill(COLORS.primary)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.white)
    const headers = ['N°', 'Date', 'Client', 'Montant', 'Payé', 'Reste']
    headers.forEach((h, i) => doc.text(h, colX[i] + 4, y + 4, { width: colW[i] - 8 }))

    y += 16

    for (let i = 0; i < invoices.length; i++) {
      if (y > 720) break
      const inv = invoices[i]
      const paid = inv.payments.reduce((s, p) => s + (p.amount || 0), 0)
      const remaining = Math.max(0, (inv.amount || 0) - paid)
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.lightGray
      doc.rect(50, y, 490, 14).fill(bgColor)
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.dark)
      doc.text(inv.invoiceNumber || '', colX[0] + 4, y + 3, { width: colW[0] - 8 })
      doc.text(inv.issuedAt ? fmtD(inv.issuedAt) : '', colX[1] + 4, y + 3, { width: colW[1] - 8 })
      doc.text(inv.client.company ? `${inv.client.fullName} (${inv.client.company})` : inv.client.fullName, colX[2] + 4, y + 3, { width: colW[2] - 8 })
      doc.text(fmt(inv.amount || 0), colX[3] + 4, y + 3, { width: colW[3] - 8, align: 'right' })
      doc.fillColor(COLORS.green).text(fmt(paid), colX[4] + 4, y + 3, { width: colW[4] - 8, align: 'right' })
      doc.fillColor(remaining > 0 ? COLORS.red : COLORS.green).text(fmt(remaining), colX[5] + 4, y + 3, { width: colW[5] - 8, align: 'right' })
      y += 14
    }

    // Totals
    y += 5
    doc.rect(50, y, 490, 0.5).fill(COLORS.primary)
    y += 8
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray).text('Total facturé', 380, y, { width: 80, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.dark).text(fmt(totalAmount), 470, y, { width: 70, align: 'right' })
    y += 14
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.green).text('Total encaissé', 380, y, { width: 80, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.green).text(fmt(totalPaid), 470, y, { width: 70, align: 'right' })
    y += 14
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.red).text('Reste à payer', 380, y, { width: 80, align: 'right' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.red).text(fmt(totalRemaining), 470, y, { width: 70, align: 'right' })

    // Footer
    doc.rect(50, 730, 490, 0.5).fill(COLORS.primary)
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.gray)
    const footerParts = [tenant?.name, tenant?.address, tenant?.city, tenant?.phone, tenant?.email].filter(Boolean)
    doc.text(footerParts.join('  —  '), 50, 738, { width: 490, align: 'center' })
    if (tenant?.niu) doc.text(`NIU : ${tenant.niu}`, 50, 748, { width: 490, align: 'center' })
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.gray)
    doc.text('Rapport généré par JurisLink', 50, 758, { width: 490, align: 'center' })

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(new NextResponse(Buffer.concat(chunks), {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="rapport_financier_${new Date().toISOString().slice(0, 10)}.pdf"` },
        }))
      })
    })
  } catch (error) {
    console.error('Finance PDF error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
