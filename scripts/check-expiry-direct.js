// Standalone subscription check-expiry script
// Mirrors: src/app/api/subscriptions/check-expiry/route.ts
// Runs directly against DB via @prisma/client (no Next.js server needed)

process.env.DATABASE_URL = 'postgresql://postgres.zosqktvmihtkqbbgdbgx:xoTozRtY5jJqu2ma@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

const { PrismaClient } = require('@prisma/client');
const { differenceInDays } = require('date-fns');

const ALERT_DAYS = [30, 15, 10, 5, 1];

async function main() {
  console.log('=== Subscription Check-Expiry (Direct DB) ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Alert thresholds: ${ALERT_DAYS.join(', ')} days`);
  console.log('');

  const db = new PrismaClient();
  try {
    // Step 1: Fetch all active subscriptions with tenant users and plan
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      include: {
        tenant: {
          include: {
            users: { where: { role: { in: ['firm_admin', 'associate'] } }, select: { id: true } },
          },
        },
        plan: true,
      },
    });

    console.log(`Found ${activeSubs.length} active subscription(s):`);
    for (const sub of activeSubs) {
      const daysLeft = sub.currentPeriodEnd ? differenceInDays(new Date(sub.currentPeriodEnd), new Date()) : 'N/A';
      console.log(`  - ${sub.tenant.name} | Plan: ${sub.plan.name} | Period end: ${sub.currentPeriodEnd || 'N/A'} | Days left: ${daysLeft} | Admin/Associate users: ${sub.tenant.users.length}`);
    }
    console.log('');

    // Step 2: Process each subscription
    const results = [];

    for (const sub of activeSubs) {
      if (!sub.currentPeriodEnd) {
        console.log(`[SKIP] ${sub.tenant.name} — no currentPeriodEnd set`);
        continue;
      }

      const daysLeft = differenceInDays(new Date(sub.currentPeriodEnd), new Date());

      // Expired → deactivate subscription and tenant, create notifications
      if (daysLeft < 0) {
        console.log(`[EXPIRE] ${sub.tenant.name} — expired ${Math.abs(daysLeft)} day(s) ago`);
        await db.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } });
        await db.tenant.update({ where: { id: sub.tenantId }, data: { isActive: false } });

        for (const u of sub.tenant.users) {
          await db.notification.create({
            data: {
              title: 'Abonnement expiré',
              message: `L'abonnement ${sub.plan.name} de ${sub.tenant.name} a expiré. Votre cabinet a été désactivé.`,
              category: 'abonnement', resourceType: 'Subscription', resourceId: sub.id,
              tenantId: sub.tenantId, userId: u.id,
            },
          });
        }

        results.push({ tenantId: sub.tenantId, tenantName: sub.tenant.name, daysLeft, action: 'désactivé' });
        console.log(`  → Subscription set to 'expired', tenant deactivated, ${sub.tenant.users.length} notification(s) created`);
        continue;
      }

      // Check alert thresholds
      for (const d of ALERT_DAYS) {
        if (daysLeft <= d) {
          const existing = await db.notification.findFirst({
            where: {
              resourceType: 'Subscription', resourceId: sub.id,
              title: { contains: `${d} jour` },
              tenantId: sub.tenantId,
            },
          });

          if (!existing) {
            console.log(`[ALERT] ${sub.tenant.name} — ${daysLeft} day(s) left, creating ${d}-day alert notifications`);
            for (const u of sub.tenant.users) {
              await db.notification.create({
                data: {
                  title: `Abonnement expire dans ${d} jour${d > 1 ? 's' : ''}`,
                  message: `L'abonnement ${sub.plan.name} de ${sub.tenant.name} expire dans ${d} jour${d > 1 ? 's' : ''} (le ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}).`,
                  category: 'abonnement', resourceType: 'Subscription', resourceId: sub.id,
                  tenantId: sub.tenantId, userId: u.id,
                },
              });
            }
            results.push({ tenantId: sub.tenantId, tenantName: sub.tenant.name, daysLeft, action: `relance ${d}j` });
            console.log(`  → ${sub.tenant.users.length} notification(s) created`);
          } else {
            console.log(`[SKIP] ${sub.tenant.name} — ${d}-day alert already sent`);
          }
          break;
        }
      }

      // No alert needed (daysLeft > 30)
      if (daysLeft > ALERT_DAYS[0]) {
        console.log(`[OK] ${sub.tenant.name} — ${daysLeft} days left, no action needed`);
      }
    }

    console.log('');
    console.log('=== SUMMARY ===');
    console.log(JSON.stringify({ checked: activeSubs.length, actions: results }, null, 2));
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
