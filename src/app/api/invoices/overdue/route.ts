/**
 * GET /api/invoices/overdue
 * Returns all overdue invoices with reminder status, KPIs, and suggested actions.
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const REMINDER_THRESHOLDS = [
  { level: 1, daysAfterDue: 7,  label: '1ère relance',  color: '#D97706', method: 'email' },
  { level: 2, daysAfterDue: 15, label: '2ème relance', color: '#EA580C', method: 'email' },
  { level: 3, daysAfterDue: 30, label: '3ème relance',  color: '#DC2626', method: 'email' },
  { level: 4, daysAfterDue: 45, label: 'Mise en demeure', color: '#991B1B', method: 'email' },
]

export async function GET(request: Request) {
  const auth = await authenticate(request, 'invoice', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const level = searchParams.get('level') // filter by reminder level
    const clientId = searchParams.get('clientId')

    const now = new Date()

    // Build where clause for overdue invoices (factures only)
    const where: Record<string, unknown> = {
      type: 'facture',
      status: { in: ['non_paye', 'partiel'] },
      dueDate: { lte: now },
    }
    if (tenantId) where.tenantId = tenantId
    if (clientId) where.clientId = clientId
    if (level) where.reminderLevel = parseInt(level)

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, fullName: true, company: true, email: true, phone: true } },
        case: { select: { id: true, reference: true, title: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        payments: { select: { amount: true } },
        _count: { select: { reminders: true } },
      },
      orderBy: [{ reminderLevel: 'desc' }, { dueDate: 'asc' }],
    })

    // Enrich with computed fields
    const enriched = invoices.map(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
      const daysOverdue = dueDate ? Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000)) : 0
      const totalPaid = inv.payments.reduce((s, p) => s + p.amount, 0)
      const remaining = inv.amount - totalPaid

      // Determine suggested next action
      const nextThreshold = REMINDER_THRESHOLDS.find(t => t.level > inv.reminderLevel && daysOverdue >= t.daysAfterDue)
      const currentThreshold = REMINDER_THRESHOLDS[inv.reminderLevel - 1]

      return {
        ...inv,
        daysOverdue,
        totalPaid,
        remaining: Math.max(0, remaining),
        suggestedAction: nextThreshold
          ? { level: nextThreshold.level, label: nextThreshold.label, color: nextThreshold.color, method: nextThreshold.method }
          : inv.reminderLevel < 4
          ? { level: inv.reminderLevel + 1, label: REMINDER_THRESHOLDS[inv.reminderLevel]?.label || 'Relance', color: REMINDER_THRESHOLDS[inv.reminderLevel]?.color || '#6B7280', method: 'email' }
          : null, // max reached
        currentLevelLabel: currentThreshold?.label || null,
        currentLevelColor: currentThreshold?.color || null,
      }
    })

    // KPIs
    const totalOverdue = enriched.length
    const totalAmount = enriched.reduce((s, i) => s + i.remaining, 0)
    const avgDaysOverdue = totalOverdue > 0 ? Math.round(enriched.reduce((s, i) => s + i.daysOverdue, 0) / totalOverdue) : 0
    const maxDaysOverdue = enriched.length > 0 ? Math.max(...enriched.map(i => i.daysOverdue)) : 0
    const actionable = enriched.filter(i => i.suggestedAction).length
    const byLevel = [1, 2, 3, 4].map(l => ({
      level: l,
      label: REMINDER_THRESHOLDS[l - 1]?.label,
      color: REMINDER_THRESHOLDS[l - 1]?.color,
      count: enriched.filter(i => i.reminderLevel >= l).length,
      amount: enriched.filter(i => i.reminderLevel >= l).reduce((s, i) => s + i.remaining, 0),
    }))
    const byClient = new Map<string, { clientName: string; count: number; amount: number }>()
    for (const i of enriched) {
      const name = i.client?.fullName || 'Inconnu'
      const existing = byClient.get(i.clientId)
      if (existing) { existing.count++; existing.amount += i.remaining }
      else byClient.set(i.clientId, { clientName: name, count: 1, amount: i.remaining })
    }

    return NextResponse.json({
      invoices: enriched,
      kpis: {
        totalOverdue,
        totalAmount,
        avgDaysOverdue,
        maxDaysOverdue,
        actionable,
        byLevel,
        byClient: Array.from(byClient.entries()).sort((a, b) => b[1].amount - a[1].amount).map(([id, v]) => ({ clientId: id, ...v })),
      },
      thresholds: REMINDER_THRESHOLDS,
    })
  } catch (error) {
    console.error('Overdue invoices error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
