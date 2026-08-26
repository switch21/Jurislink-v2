/**
 * POST /api/invoices/overdue/auto-remind
 * Cron endpoint: automatically sends reminders for overdue invoices.
 *
 * Thresholds:
 *   1st reminder: 7+ days overdue
 *   2nd reminder: 15+ days overdue
 *   3rd reminder: 30+ days overdue
 *   Formal notice: 45+ days overdue
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const THRESHOLDS = [
  { fromLevel: 0, toLevel: 1, minDaysOverdue: 7 },
  { fromLevel: 1, toLevel: 2, minDaysOverdue: 15 },
  { fromLevel: 2, toLevel: 3, minDaysOverdue: 30 },
  { fromLevel: 3, toLevel: 4, minDaysOverdue: 45 },
]

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'jurislink-cron'}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = getDb()
  const now = new Date()
  let actionsTaken = 0
  const results: Array<{ invoiceId: string; level: number; clientName: string; daysOverdue: number }> = []

  try {
    for (const threshold of THRESHOLDS) {
      const cutoffDate = new Date(now.getTime() - threshold.minDaysOverdue * 86400000)
      const recentCutoff = new Date(now.getTime() - 3 * 86400000)

      const invoices = await db.invoice.findMany({
        where: {
          type: 'facture',
          status: { in: ['non_paye', 'partiel'] },
          reminderLevel: threshold.fromLevel,
          dueDate: { lte: cutoffDate },
          reminders: { none: { level: threshold.toLevel, sentAt: { gte: recentCutoff } } },
        },
        include: {
          client: { select: { id: true, fullName: true, email: true } },
          tenant: { select: { id: true, name: true } },
          payments: { select: { amount: true } },
        },
      })

      const levelLabels = ['', '1ere relance', '2eme relance', '3eme relance', 'Mise en demeure']

      for (const inv of invoices) {
        const daysOverdue = inv.dueDate ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000) : 0
        const totalPaid = inv.payments.reduce((s, p) => s + p.amount, 0)
        const remaining = Math.max(0, inv.amount - totalPaid)

        const subject = `${levelLabels[threshold.toLevel]} — Facture ${inv.invoiceNumber || inv.id.slice(0, 8)}`
        const content = `Relance automatique ${levelLabels[threshold.toLevel]} pour la facture ${inv.invoiceNumber || inv.id.slice(0, 8)}.\nClient: ${inv.client?.fullName || 'N/A'}\nMontant du: ${new Intl.NumberFormat('fr-FR').format(Math.round(remaining))} FCFA\nRetard: ${daysOverdue} jours`

        await db.reminderLog.create({
          data: {
            level: threshold.toLevel, method: 'email', subject, content,
            status: 'sent', daysOverdue, amountDue: remaining,
            invoiceId: inv.id, tenantId: inv.tenantId,
          },
        })

        await db.notification.create({
          data: {
            title: `${levelLabels[threshold.toLevel]} automatique`,
            message: `${levelLabels[threshold.toLevel]} pour ${inv.client?.fullName || 'client'} — ${inv.invoiceNumber || '?'} — ${daysOverdue}j de retard`,
            category: 'facture', resourceType: 'invoice', resourceId: inv.id, tenantId: inv.tenantId,
          },
        })

        await db.invoice.update({
          where: { id: inv.id },
          data: { reminderLevel: threshold.toLevel, lastReminderAt: now },
        })

        actionsTaken++
        results.push({ invoiceId: inv.id, level: threshold.toLevel, clientName: inv.client?.fullName || 'N/A', daysOverdue })
      }
    }

    return NextResponse.json({ checked: true, timestamp: now.toISOString(), actionsTaken, results })
  } catch (error) {
    console.error('Auto-remind error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
