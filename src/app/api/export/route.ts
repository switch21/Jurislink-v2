/**
 * GET /api/export
 * Data export for cabinets: clients, invoices, payments, tasks, events,
 * unpaid invoices, revenue (CA) and audit log — filtered by period
 * (semaine, mois, trimestre, semestre, annee, personnalise).
 * Formats: json (preview), csv, pdf.
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATASETS = ['clients', 'invoices', 'payments', 'tasks', 'events', 'unpaid', 'cad', 'audit'] as const
type Dataset = (typeof DATASETS)[number]

const PERIODS = ['semaine', 'mois', 'trimestre', 'semestre', 'annee', 'personnalise'] as const

interface ExportData {
  columns: string[]
  rows: (string | number | null)[][]
}

function computePeriod(
  period: string,
  fromParam: string | null,
  toParam: string | null,
): { start: Date; end: Date; label: string } {
  const now = new Date()
  const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  let start: Date
  let end: Date
  switch (period) {
    case 'semaine': {
      const day = (now.getDay() + 6) % 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      end = dayEnd(new Date(start.getTime() + 6 * 86400000))
      break
    }
    case 'trimestre': {
      const q = Math.floor(now.getMonth() / 3) * 3
      start = new Date(now.getFullYear(), q, 1)
      end = dayEnd(new Date(now.getFullYear(), q + 3, 0))
      break
    }
    case 'semestre': {
      const h = now.getMonth() < 6 ? 0 : 6
      start = new Date(now.getFullYear(), h, 1)
      end = dayEnd(new Date(now.getFullYear(), h + 6, 0))
      break
    }
    case 'annee':
      start = new Date(now.getFullYear(), 0, 1)
      end = dayEnd(new Date(now.getFullYear(), 11, 31))
      break
    case 'personnalise': {
      const from = fromParam ? new Date(`${fromParam}T00:00:00`) : null
      const to = toParam ? new Date(`${toParam}T00:00:00`) : null
      if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
        start = from
        end = dayEnd(to)
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = dayEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      }
      break
    }
    case 'mois':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = dayEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const label = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()} – ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`
  return { start, end, label }
}

const fmtDate = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : '')
const fmtDateTime = (v: unknown) => (v instanceof Date ? v.toISOString().replace('T', ' ').slice(0, 16) : v ? String(v) : '')
const fmtMoneyStr = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : v == null ? '0' : String(v))

async function fetchDataset(
  db: Awaited<ReturnType<typeof getDb>>,
  dataset: Dataset,
  tenantId: string | null,
  start: Date,
  end: Date,
  now: Date,
): Promise<ExportData> {
  const take = 5000
  switch (dataset) {
    case 'clients': {
      const rows = await db.client.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
        take,
      })
      return {
        columns: ['Nom', 'Société', 'Email', 'Téléphone', 'Ville', 'Pays', 'NIU', 'Créé le'],
        rows: rows.map(c => [c.fullName ?? '', c.company ?? '', c.email ?? '', c.phone ?? '', c.city ?? '', c.country ?? '', c.niu ?? '', fmtDate(c.createdAt)]),
      }
    }
    case 'invoices': {
      const rows = await db.invoice.findMany({
        where: { tenantId, type: 'facture', issuedAt: { gte: start, lte: end } },
        include: {
          client: { select: { fullName: true } },
          case: { select: { reference: true } },
          currency: { select: { code: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take,
      })
      return {
        columns: ['N°', 'Client', 'Dossier', 'Montant', 'Devise', 'Statut', 'Émise le', 'Échéance'],
        rows: rows.map(i => [i.invoiceNumber ?? '', i.client?.fullName ?? '', i.case?.reference ?? '', fmtMoneyStr(i.amount), i.currency?.code ?? 'XAF', i.status, fmtDate(i.issuedAt), fmtDate(i.dueDate)]),
      }
    }
    case 'payments': {
      const rows = await db.payment.findMany({
        where: { tenantId, paidAt: { gte: start, lte: end } },
        include: { invoice: { include: { client: { select: { fullName: true } } } } },
        orderBy: { paidAt: 'desc' },
        take,
      })
      return {
        columns: ['Date', 'Client', 'Facture', 'Montant', 'Méthode', 'Référence', 'Statut'],
        rows: rows.map(p => [fmtDate(p.paidAt), p.invoice?.client?.fullName ?? '', p.invoice?.invoiceNumber ?? '', fmtMoneyStr(p.amount), p.method ?? '', p.reference ?? '', p.status ?? '']),
      }
    }
    case 'tasks': {
      const rows = await db.task.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end } },
        include: { case: { select: { reference: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      })
      return {
        columns: ['Titre', 'Dossier', 'Priorité', 'Statut', 'Échéance', 'Créée le'],
        rows: rows.map(t => [t.title ?? '', t.case?.reference ?? '', t.priority ?? '', t.status ?? '', fmtDate(t.dueDate), fmtDate(t.createdAt)]),
      }
    }
    case 'events': {
      const rows = await db.event.findMany({
        where: { tenantId, startTime: { gte: start, lte: end } },
        include: { case: { select: { reference: true } } },
        orderBy: { startTime: 'asc' },
        take,
      })
      return {
        columns: ['Titre', 'Type', 'Dossier', 'Début', 'Fin', 'Criticalité'],
        rows: rows.map(e => [e.title ?? '', e.eventType ?? '', e.case?.reference ?? '', fmtDateTime(e.startTime), fmtDateTime(e.endTime), e.criticality ?? '']),
      }
    }
    case 'unpaid': {
      const rows = await db.invoice.findMany({
        where: { tenantId, type: 'facture', status: { in: ['non_paye', 'partiel'] }, dueDate: { gte: start, lte: end } },
        include: { client: { select: { fullName: true } }, currency: { select: { code: true } } },
        orderBy: { dueDate: 'asc' },
        take,
      })
      return {
        columns: ['N°', 'Client', 'Montant', 'Devise', 'Échéance', 'Jours de retard', 'Statut'],
        rows: rows.map(i => {
          const days = Math.max(0, Math.ceil((now.getTime() - new Date(i.dueDate).getTime()) / 86400000))
          return [i.invoiceNumber ?? '', i.client?.fullName ?? '', fmtMoneyStr(i.amount), i.currency?.code ?? 'XAF', fmtDate(i.dueDate), days, i.status]
        }),
      }
    }
    case 'cad': {
      const rows = await db.$queryRawUnsafe(
        `SELECT to_char(date_trunc('month', issued_at), 'YYYY-MM') AS month,
                COALESCE(SUM(amount), 0) AS billed,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paye'), 0) AS paid,
                COUNT(*)::int AS cnt
         FROM invoices
         WHERE tenant_id = $1 AND issued_at >= $2 AND issued_at <= $3 AND type = 'facture'
         GROUP BY 1 ORDER BY 1`,
        tenantId,
        start,
        end,
      )
      return {
        columns: ['Mois', 'CA facturé', 'CA encaissé', 'Nombre de factures'],
        rows: (rows as Array<{ month: string; billed: number; paid: number; cnt: number }>).map(r => [r.month, fmtMoneyStr(r.billed), fmtMoneyStr(r.paid), r.cnt]),
      }
    }
    case 'audit': {
      const rows = await db.auditLog.findMany({
        where: { tenantId, timestamp: { gte: start, lte: end } },
        include: { user: { select: { fullName: true } } },
        orderBy: { timestamp: 'desc' },
        take,
      })
      return {
        columns: ['Date', 'Utilisateur', 'Action', 'Type de ressource', 'Ressource'],
        rows: rows.map(a => [fmtDateTime(a.timestamp), a.user?.fullName ?? 'Système', a.action ?? '', a.resourceType ?? '', a.resourceId ?? '']),
      }
    }
  }
}

function toCsv(data: ExportData): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [data.columns.join(';'), ...data.rows.map(r => r.map(esc).join(';'))]
  return '\uFEFF' + lines.join('\r\n')
}

async function toPdf(dataset: string, periodLabel: string, data: ExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(14).font('Helvetica-Bold').text('JurisLink — Exportation de données', { align: 'left' })
    doc.fontSize(9).font('Helvetica').text(`${dataset} · Période : ${periodLabel}`, { align: 'left' })
    doc.moveDown(0.6)

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const nCols = data.columns.length
    const colW = pageW / nCols
    const rowH = 16
    const cellPad = 3

    const trunc = (v: string | number | null, max: number) => {
      const s = v == null ? '' : String(v)
      return s.length > max ? s.slice(0, max - 1) + '…' : s
    }

    const drawRow = (cells: (string | number | null)[], bold: boolean) => {
      if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) doc.addPage()
      const y = doc.y
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
      cells.forEach((cell, i) => {
        doc.text(trunc(cell, Math.floor(colW / 1.9)), doc.page.margins.left + i * colW + cellPad, y + 3, {
          width: colW - cellPad * 2,
          lineBreak: false,
          ellipsis: false,
        })
      })
      doc.moveTo(doc.page.margins.left, y + rowH).lineTo(doc.page.margins.left + pageW, y + rowH).strokeColor('#dddddd').lineWidth(0.5).stroke()
      doc.y = y + rowH
    }

    drawRow(data.columns, true)
    for (const row of data.rows) drawRow(row, false)

    doc.end()
  })
}

export async function GET(request: Request) {
  const auth = await authenticate(request, 'report', 'view')
  if (isErrorResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const dataset = searchParams.get('dataset') as Dataset | null
  const format = searchParams.get('format') || 'json'
  if (!dataset || !DATASETS.includes(dataset)) {
    return NextResponse.json({ error: `dataset invalide (valeurs: ${DATASETS.join(', ')})` }, { status: 400 })
  }

  const period = PERIODS.includes(searchParams.get('period') as (typeof PERIODS)[number]) ? (searchParams.get('period') as string) : 'mois'
  const tenantId = auth.tenantId ?? searchParams.get('tenantId')

  const db = getDb()
  try {
    const { start, end, label } = computePeriod(period, searchParams.get('from'), searchParams.get('to'))
    const data = await fetchDataset(db, dataset, tenantId, start, end, new Date())

    if (format === 'csv') {
      return new NextResponse(toCsv(data), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="jurislink-${dataset}-${period}.csv"`,
        },
      })
    }
    if (format === 'pdf') {
      const buf = await toPdf(dataset, label, data)
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="jurislink-${dataset}-${period}.pdf"`,
        },
      })
    }
    return NextResponse.json({ dataset, period, label, columns: data.columns, rows: data.rows, total: data.rows.length })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'exportation' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
