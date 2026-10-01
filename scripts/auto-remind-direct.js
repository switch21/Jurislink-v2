/**
 * Direct script for auto-remind cron job.
 * Connects to Supabase PostgreSQL via pg adapter and runs the same logic as
 * POST /api/invoices/overdue/auto-remind
 *
 * Thresholds:
 *   1st reminder: 7+ days overdue
 *   2nd reminder: 15+ days overdue
 *   3rd reminder: 30+ days overdue
 *   Formal notice: 45+ days overdue
 */
const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const THRESHOLDS = [
  { fromLevel: 0, toLevel: 1, minDaysOverdue: 7 },
  { fromLevel: 1, toLevel: 2, minDaysOverdue: 15 },
  { fromLevel: 2, toLevel: 3, minDaysOverdue: 30 },
  { fromLevel: 3, toLevel: 4, minDaysOverdue: 45 },
]

const LEVEL_LABELS = ['', '1ere relance', '2eme relance', '3eme relance', 'Mise en demeure']

async function main() {
  const now = new Date()
  let actionsTaken = 0
  const results = []

  try {
    console.log(`[${now.toISOString()}] Auto-remind started`)

    for (const threshold of THRESHOLDS) {
      const cutoffDate = new Date(now.getTime() - threshold.minDaysOverdue * 86400000)
      const recentCutoff = new Date(now.getTime() - 3 * 86400000)

      const { rows: invoices } = await pool.query(`
        SELECT i.*, c.id as client_id, c.full_name as client_full_name, c.email as client_email,
               t.id as tenant_id, t.name as tenant_name
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        LEFT JOIN tenants t ON t.id = i.tenant_id
        WHERE i.type = 'facture'
          AND i.status IN ('non_paye', 'partiel')
          AND i.reminder_level = $1
          AND i.due_date <= $2
          AND NOT EXISTS (
            SELECT 1 FROM reminder_logs rl
            WHERE rl.invoice_id = i.id AND rl.level = $3 AND rl.sent_at >= $4
          )
      `, [threshold.fromLevel, cutoffDate, threshold.toLevel, recentCutoff])

      for (const inv of invoices) {
        const daysOverdue = inv.due_date
          ? Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
          : 0

        const { rows: payments } = await pool.query(
          'SELECT amount FROM payments WHERE invoice_id = $1', [inv.id]
        )
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
        const remaining = Math.max(0, inv.amount - totalPaid)

        const subject = `${LEVEL_LABELS[threshold.toLevel]} — Facture ${inv.invoice_number || inv.id.slice(0, 8)}`
        const content = `Relance automatique ${LEVEL_LABELS[threshold.toLevel]} pour la facture ${inv.invoice_number || inv.id.slice(0, 8)}.\nClient: ${inv.client_full_name || 'N/A'}\nMontant du: ${new Intl.NumberFormat('fr-FR').format(Math.round(remaining))} FCFA\nRetard: ${daysOverdue} jours`

        await pool.query(`
          INSERT INTO reminder_logs (level, method, subject, content, status, days_overdue, amount_due, invoice_id, tenant_id, sent_at)
          VALUES ($1, 'email', $2, $3, 'sent', $4, $5, $6, $7, NOW())
        `, [threshold.toLevel, subject, content, daysOverdue, remaining, inv.id, inv.tenant_id])

        await pool.query(`
          INSERT INTO notifications (title, message, category, resource_type, resource_id, tenant_id, created_at)
          VALUES ($1, $2, 'facture', 'invoice', $3, $4, NOW())
        `, [
          `${LEVEL_LABELS[threshold.toLevel]} automatique`,
          `${LEVEL_LABELS[threshold.toLevel]} pour ${inv.client_full_name || 'client'} — ${inv.invoice_number || '?'} — ${daysOverdue}j de retard`,
          inv.id, inv.tenant_id
        ])

        await pool.query(`
          UPDATE invoices SET reminder_level = $1, last_reminder_at = NOW() WHERE id = $2
        `, [threshold.toLevel, inv.id])

        actionsTaken++
        results.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number || inv.id.slice(0, 8),
          level: threshold.toLevel,
          levelLabel: LEVEL_LABELS[threshold.toLevel],
          clientName: inv.client_full_name || 'N/A',
          clientEmail: inv.client_email || 'N/A',
          tenantName: inv.tenant_name || 'N/A',
          daysOverdue,
          amountDue: remaining,
        })
        console.log(`  -> ${LEVEL_LABELS[threshold.toLevel]}: ${inv.invoice_number || inv.id.slice(0, 8)} (${inv.client_full_name}) — ${daysOverdue}j — ${Math.round(remaining)} FCFA`)
      }
    }

    console.log(`\n[${now.toISOString()}] Auto-remind completed: ${actionsTaken} reminder(s) generated`)
    console.log(JSON.stringify({ checked: true, timestamp: now.toISOString(), actionsTaken, results }, null, 2))
  } catch (error) {
    console.error('Auto-remind error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
