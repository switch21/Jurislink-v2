import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { differenceInDays } from 'date-fns'
import { requireRootAdmin } from '@/lib/auth-server'

const ALERT_DAYS = [30, 15, 10, 5, 1]
const CRON_SECRET = process.env.CRON_SECRET || 'jl-cron-2026'

export async function POST(request: Request) {
  // Allow Vercel Cron (Authorization: Bearer <CRON_SECRET>) or x-cron-secret header
  const authHeader = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')
  const isValidCron =
    (authHeader === `Bearer ${CRON_SECRET}`) || (cronSecret === CRON_SECRET)
  if (!isValidCron) {
    const auth = await requireRootAdmin(request)
    if (auth instanceof NextResponse) return auth
  }
  const db = getDb()
  try {
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      include: { tenant: { include: { users: { where: { role: { in: ['firm_admin', 'associate'] } }, select: { id: true } } } }, plan: true },
    })

    const results: Array<{ tenantId: string; tenantName: string; daysLeft: number; action: string }> = []

    for (const sub of activeSubs) {
      if (!sub.currentPeriodEnd) continue
      const daysLeft = differenceInDays(new Date(sub.currentPeriodEnd), new Date())

      // Expired → deactivate
      if (daysLeft < 0) {
        await db.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } })
        await db.tenant.update({ where: { id: sub.tenantId }, data: { isActive: false } })
        // Notify all admins
        for (const u of sub.tenant.users) {
          await db.notification.create({
            data: { title: 'Abonnement expiré', message: `L'abonnement ${sub.plan.name} de ${sub.tenant.name} a expiré. Votre cabinet a été désactivé.`, category: 'abonnement', resourceType: 'Subscription', resourceId: sub.id, tenantId: sub.tenantId, userId: u.id },
          })
        }
        results.push({ tenantId: sub.tenantId, tenantName: sub.tenant.name, daysLeft, action: 'désactivé' })
        continue
      }

      // Check alert thresholds
      for (const d of ALERT_DAYS) {
        if (daysLeft <= d) {
          const existing = await db.notification.findFirst({
            where: { resourceType: 'Subscription', resourceId: sub.id, title: { contains: `${d} jour` }, tenantId: sub.tenantId },
          })
          if (!existing) {
            for (const u of sub.tenant.users) {
              await db.notification.create({
                data: { title: `Abonnement expire dans ${d} jour${d > 1 ? 's' : ''}`, message: `L'abonnement ${sub.plan.name} de ${sub.tenant.name} expire dans ${d} jour${d > 1 ? 's' : ''} (le ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}).`, category: 'abonnement', resourceType: 'Subscription', resourceId: sub.id, tenantId: sub.tenantId, userId: u.id },
              })
            }
            results.push({ tenantId: sub.tenantId, tenantName: sub.tenant.name, daysLeft, action: `relance ${d}j` })
          }
          break
        }
      }
    }

    return NextResponse.json({ checked: activeSubs.length, actions: results })
  } catch (error) {
    console.error('Check expiry error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
