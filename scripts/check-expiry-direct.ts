import { getDb } from '../src/lib/db'
import { differenceInDays } from 'date-fns'

const ALERT_DAYS = [30, 15, 10, 5, 1]

async function main() {
  const db = getDb()
  try {
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      include: {
        tenant: {
          include: {
            users: {
              where: { role: { in: ['firm_admin', 'associate'] } },
              select: { id: true }
            }
          }
        },
        plan: true
      }
    })

    console.log(`[check-expiry] ${activeSubs.length} abonnement(s) actif(s) trouvé(s)`)

    const results: Array<{ tenantId: string; tenantName: string; daysLeft: number; action: string }> = []

    for (const sub of activeSubs) {
      if (!sub.currentPeriodEnd) {
        console.log(`  ⚠ ${sub.tenant?.name}: pas de currentPeriodEnd, ignoré`)
        continue
      }
      const daysLeft = differenceInDays(new Date(sub.currentPeriodEnd), new Date())
      console.log(`  → ${sub.tenant?.name}: ${daysLeft} jour(s) restant(s) (expire le ${sub.currentPeriodEnd})`)

      if (daysLeft < 0) {
        await db.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } })
        await db.tenant.update({ where: { id: sub.tenantId }, data: { isActive: false } })
        for (const u of sub.tenant.users) {
          await db.notification.create({
            data: {
              title: 'Abonnement expiré',
              message: `L'abonnement ${sub.plan.name} de ${sub.tenant.name} a expiré. Votre cabinet a été désactivé.`,
              category: 'abonnement',
              resourceType: 'Subscription',
              resourceId: sub.id,
              tenantId: sub.tenantId,
              userId: u.id
            }
          })
        }
        results.push({ tenantId: sub.tenantId, tenantName: sub.tenant.name, daysLeft, action: 'désactivé' })
        console.log(`    ✗ EXPIRÉ → désactivé, notification créée`)
        continue
      }

      for (const d of ALERT_DAYS) {
        if (daysLeft <= d) {
          const existing = await db.notification.findFirst({
            where: {
              resourceType: 'Subscription',
              resourceId: sub.id,
              title: { contains: `${d} jour` },
              tenantId: sub.tenantId
            }
          })
          if (!existing) {
            for (const u of sub.tenant.users) {
              await db.notification.create({
                data: {
                  title: `Abonnement expire dans ${d} jour${d > 1 ? 's' : ''}`,
                  message: `L'abonnement ${sub.plan.name} de ${sub.tenant.name} expire dans ${d} jour${d > 1 ? 's' : ''} (le ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}).`,
                  category: 'abonnement',
                  resourceType: 'Subscription',
                  resourceId: sub.id,
                  tenantId: sub.tenantId,
                  userId: u.id
                }
              })
            }
            results.push({ tenantId: sub.tenantId, tenantName: sub.tenant.name, daysLeft, action: `relance ${d}j` })
            console.log(`    ⚠ ALERTE ${d}j → notification de relance créée`)
          } else {
            console.log(`    ℹ ALERTE ${d}j → notification déjà existante, ignoré`)
          }
          break
        }
      }

      if (daysLeft > ALERT_DAYS[0]) {
        console.log(`    ✓ Aucune action (>${ALERT_DAYS[0]}j restants)`)
      }
    }

    console.log(`\n[check-expiry] Résultat: ${activeSubs.length} vérifié(s), ${results.length} action(s)`)  
    console.log(JSON.stringify({ checked: activeSubs.length, actions: results }, null, 2))
  } catch (error) {
    console.error('[check-expiry] ERREUR:', error)
    process.exit(1)
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

main()
