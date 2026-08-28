import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import ExcelJS from 'exceljs'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

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

    // Fetch invoices with filters
    const invoiceWhere: Record<string, unknown> = { tenantId }
    if (clientId) invoiceWhere.clientId = clientId
    if (startDate || endDate) {
      invoiceWhere.issuedAt = {}
      if (startDate) (invoiceWhere.issuedAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (invoiceWhere.issuedAt as Record<string, unknown>).lte = new Date(endDate)
    }

    const invoices = await db.invoice.findMany({
      where: invoiceWhere,
      include: {
        client: { select: { fullName: true, company: true } },
        currency: { select: { code: true } },
        case: { select: { reference: true, title: true } },
        payments: { select: { amount: true, paidAt: true, method: true } },
      },
      orderBy: { issuedAt: 'desc' },
    })

    // Fetch payments with filters
    const paymentWhere: Record<string, unknown> = { invoice: { tenantId } }
    if (clientId) paymentWhere.invoice = { ...paymentWhere.invoice as object, clientId }
    const payments = await db.payment.findMany({
      where: paymentWhere,
      include: {
        invoice: { select: { invoiceNumber: true, client: { select: { fullName: true, company: true } } } },
        recorder: { select: { fullName: true } },
      },
      orderBy: { paidAt: 'desc' },
    })

    // Apply date filter to payments
    const filteredPayments = payments.filter(p => {
      if (startDate && p.paidAt && p.paidAt < new Date(startDate)) return false
      if (endDate && p.paidAt && p.paidAt > new Date(endDate)) return false
      return true
    })

    const cur = (invoices[0]?.currency?.code) || 'XAF'
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ' + cur

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'JurisLink'
    workbook.created = new Date()

    // ---- Sheet 1: Factures ----
    const wsInv = workbook.addWorksheet('Factures', {
      properties: { tabColor: { argb: 'FF1E5A8A' } },
    })
    wsInv.columns = [
      { header: 'N° Facture', key: 'num', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Client', key: 'client', width: 28 },
      { header: 'Dossier', key: 'caseRef', width: 18 },
      { header: 'Montant HT', key: 'amount', width: 18 },
      { header: 'Payé', key: 'paid', width: 18 },
      { header: 'Reste', key: 'remaining', width: 18 },
      { header: 'Statut', key: 'status', width: 16 },
      { header: 'Échéance', key: 'due', width: 14 },
    ]

    const typeLabels: Record<string, string> = { facture: 'Facture', devis: 'Devis', avoir: 'Avoir', recu: 'Reçu' }
    const statusLabels: Record<string, string> = { paye: 'Payée', non_paye: 'Non payée', partiel: 'Partiel' }

    let totalAmount = 0
    let totalPaid = 0

    for (const inv of invoices) {
      const paid = inv.payments.reduce((s, p) => s + (p.amount || 0), 0)
      const remaining = Math.max(0, inv.amount - paid)
      totalAmount += inv.amount || 0
      totalPaid += paid
      wsInv.addRow({
        num: inv.invoiceNumber,
        date: inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('fr-FR') : '',
        type: typeLabels[inv.type] || inv.type,
        client: inv.client.company ? `${inv.client.fullName} (${inv.client.company})` : inv.client.fullName,
        caseRef: inv.case?.reference || '',
        amount: inv.amount || 0,
        paid,
        remaining,
        status: statusLabels[inv.status] || inv.status,
        due: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '',
      })
    }

    // Total row
    const totalRow = wsInv.addRow({
      num: '', date: '', type: '', client: 'TOTAL', caseRef: '', amount: totalAmount, paid: totalPaid, remaining: Math.max(0, totalAmount - totalPaid), status: '', due: '',
    })
    totalRow.font = { bold: true }
    totalRow.getCell('amount').numFmt = '#,##0'
    totalRow.getCell('paid').numFmt = '#,##0'
    totalRow.getCell('remaining').numFmt = '#,##0'

    // Format amount columns
    for (const row of wsInv.getRows(2, wsInv.rowCount - 1) || []) {
    ;['amount', 'paid', 'remaining'].forEach(col => {
      const cell = row.getCell(col)
      if (cell.value && typeof cell.value === 'number') cell.numFmt = '#,##0'
    })
    }

    // ---- Sheet 2: Paiements ----
    const wsPay = workbook.addWorksheet('Paiements', {
      properties: { tabColor: { argb: 'FF059669' } },
    })
    wsPay.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Client', key: 'client', width: 28 },
      { header: 'Facture', key: 'invoice', width: 18 },
      { header: 'Montant', key: 'amount', width: 18 },
      { header: 'Méthode', key: 'method', width: 16 },
      { header: 'Enregistré par', key: 'recorder', width: 22 },
    ]

    const methodLabels: Record<string, string> = { cash: 'Espèces', cheque: 'Chèque', virement: 'Virement', mobile: 'Mobile Money', carte: 'Carte' }
    let totalPayAmount = 0

    for (const p of filteredPayments) {
      totalPayAmount += p.amount || 0
      wsPay.addRow({
        date: p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : '',
        client: p.invoice?.client?.company ? `${p.invoice.client.fullName} (${p.invoice.client.company})` : p.invoice?.client?.fullName || '',
        invoice: p.invoice?.invoiceNumber || '',
        amount: p.amount || 0,
        method: methodLabels[p.method] || p.method || '',
        recorder: p.recorder?.fullName || '',
      })
    }

    const payTotalRow = wsPay.addRow({ date: '', client: 'TOTAL', invoice: '', amount: totalPayAmount, method: '', recorder: '' })
    payTotalRow.font = { bold: true }
    payTotalRow.getCell('amount').numFmt = '#,##0'

    for (const row of wsPay.getRows(2, wsPay.rowCount - 1) || []) {
      const cell = row.getCell('amount')
      if (cell.value && typeof cell.value === 'number') cell.numFmt = '#,##0'
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(Buffer.from(buffer as ArrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="finances_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Finance export error:', error)
    return NextResponse.json({ error: 'Erreur export' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
