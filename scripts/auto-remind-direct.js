/**
 * Direct Prisma script for auto-remind cron job.
 * Connects to Supabase PostgreSQL and runs the same logic as
 * POST /api/invoices/overdue/auto-remind
 *
 * Thresholds:
 *   1st reminder: 7+ days overdue
 *   2nd reminder: 15+ days overdue
 *   3rd reminder: 30+ days overdue
 *   Formal notice: 45+ days overdue
 */
const { PrismaClient } = require('@prisma/client')

const THRESHOLDS = [
  { fromLevel: 0, toLevel: 1, minDaysOverdue: 7 },
  { fromLevel: 1, toLevel: 2, minDaysOverdue: 15 },
  { fromLevel: 2, toLevel: 3, minDaysOverdue: 30 },
  { fromLevel: 3, toLevel: 4, minDaysOverdue: 45 },
]

const LEVEL_LABELS = ['', '1ere relance', '2eme relance', '3eme relance', 'Mise en demeure']

async function main() {
  const db = new PrismaClient()
  const now = new Date()
  let actionsTaken = 0
  const results = []

  try {
    console.log(`[${now.toISOString()}] Auto-remind started`)

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

      for (const inv of invoices) {
        const daysOverdue = inv.dueDate
          ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)
          : 0
        const totalPaid = inv.payments.reduce((s, p) => s + p.amount, 0)
        const remaining = Math.max(0, inv.amount - totalPaid)

        const subject = `${LEVEL_LABELS[threshold.toLevel]} — Facture ${inv.invoiceNumber || inv.id.slice(0, 8)}`
        const content = `Relance automatique ${LEVEL_LABELS[threshold.toLevel]} pour la facture ${inv.invoiceNumber || inv.id.slice(0, 8)}.\nClient: ${inv.client?.fullName || 'N/A'}\nMontant du: ${new Intl.NumberFormat('fr-FR').format(Math.round(remaining))} FCFA\nRetard: ${daysOverdue} jours`

        await db.reminderLog.create({
          data: {
            level: threshold.toLevel, method: 'email', subject, content,
            status: 'sent', daysOverdue, amountDue: remaining,
            invoiceId: inv.id, tenantId: inv.tenantId,
          },
        })

        await db.notification.create({
          data: {
            title: `${LEVEL_LABELS[threshold.toLevel]} automatique`,
            message: `${LEVEL_LABELS[threshold.toLevel]} pour ${inv.client?.fullName || 'client'} — ${inv.invoiceNumber || '?'} — ${daysOverdue}j de retard`,
            category: 'facture', resourceType: 'invoice', resourceId: inv.id, tenantId: inv.tenantId,
          },
        })

        await db.invoice.update({
          where: { id: inv.id },
          data: { reminderLevel: threshold.toLevel, lastReminderAt: now },
        })

        actionsTaken++
        results.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || inv.id.slice(0, 8),
          level: threshold.toLevel,
          levelLabel: LEVEL_LABELS[threshold.toLevel],
          clientName: inv.client?.fullName || 'N/A',
          clientEmail: inv.client?.email || 'N/A',
          tenantName: inv.tenant?.name || 'N/A',
          daysOverdue,
          amountDue: remaining,
        })
        console.log(`  -> ${LEVEL_LABELS[threshold.toLevel]}: ${inv.invoiceNumber || inv.id.slice(0, 8)} (${inv.client?.fullName}) — ${daysOverdue}j — ${Math.round(remaining)} FCFA`)
      }
    }

    console.log(`\n[${now.toISOString()}] Auto-remind completed: ${actionsTaken} reminder(s) generated`)
    console.log(JSON.stringify({ checked: true, timestamp: now.toISOString(), actionsTaken, results }, null, 2))
  } catch (error) {
    console.error('Auto-remind error:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
