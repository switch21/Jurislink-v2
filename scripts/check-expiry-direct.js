// Standalone subscription check-expiry script (REPORT ONLY — no mutations)
// Connects directly via Prisma to check active/trialing subscriptions for expiry.

process.env.DATABASE_URL =
  'postgresql://postgres.zosqktvmihtkqbbgdbgx:xoTozRtY5jJqu2ma@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

const { PrismaClient } = require('@prisma/client');

async function main() {
  const now = new Date();
  console.log('=== JurisLink Subscription Expiry Check (Direct DB) ===');
  console.log(`UTC time : ${now.toISOString()}`);
  console.log('');

  const db = new PrismaClient();
  try {
    // ── 1. Fetch all active + trialing subscriptions with tenant & plan ──
    const subs = await db.subscription.findMany({
      where: {
        status: { in: ['active', 'trialing'] },
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, isActive: true, email: true } },
        plan: { select: { id: true, name: true, slug: true, priceMonthly: true, priceAnnual: true } },
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });

    console.log(`Total active/trialing subscriptions found: ${subs.length}`);
    console.log('');

    // ── 2. Classify ──
    const expired = [];
    const warning = [];   // expiring within 7 days
    const healthy = [];

    for (const sub of subs) {
      const entry = {
        subscriptionId: sub.id,
        tenantName: sub.tenant.name,
        tenantSlug: sub.tenant.slug,
        tenantActive: sub.tenant.isActive,
        tenantEmail: sub.tenant.email,
        status: sub.status,
        plan: sub.plan.name,
        billingPeriod: sub.billingPeriod,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
      };

      // Determine the effective end date
      let effectiveEnd = null;
      let endLabel = 'currentPeriodEnd';

      if (sub.status === 'trialing' && sub.trialEndsAt) {
        effectiveEnd = new Date(sub.trialEndsAt);
        endLabel = 'trialEndsAt';
      } else if (sub.currentPeriodEnd) {
        effectiveEnd = new Date(sub.currentPeriodEnd);
      }

      if (!effectiveEnd) {
        entry.effectiveEnd = null;
        entry.daysLeft = 'N/A (no end date)';
        entry.classification = 'no_end_date';
        expired.push(entry);
        continue;
      }

      entry.effectiveEnd = effectiveEnd.toISOString();
      entry.effectiveEndLabel = endLabel;
      const diffMs = effectiveEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      entry.daysLeft = diffDays;

      if (diffDays < 0) {
        entry.classification = 'expired';
        entry.daysOverdue = Math.abs(diffDays);
        expired.push(entry);
      } else if (diffDays <= 7) {
        entry.classification = 'expiring_soon';
        warning.push(entry);
      } else {
        entry.classification = 'healthy';
        healthy.push(entry);
      }
    }

    // ── 3. Report ──
    console.log('--- EXPIRED SUBSCRIPTIONS (end date < now) ---');
    if (expired.length === 0) {
      console.log('  (none)');
    } else {
      for (const e of expired) {
        console.log(`  [${e.status.toUpperCase()}] ${e.tenantName} (${e.tenantSlug})`);
        console.log(`    Tenant active    : ${e.tenantActive}`);
        console.log(`    Plan            : ${e.plan} / ${e.billingPeriod}`);
        console.log(`    Tenant email    : ${e.tenantEmail || 'N/A'}`);
        console.log(`    Effective end   : ${e.effectiveEnd} (${e.effectiveEndLabel})`);
        console.log(`    Days left       : ${e.daysLeft}`);
        if (e.daysOverdue) console.log(`    Days overdue    : ${e.daysOverdue}`);
        console.log(`    Subscription ID : ${e.subscriptionId}`);
        console.log('');
      }
    }
    console.log('');

    console.log('--- EXPIRING SOON (<= 7 days) ---');
    if (warning.length === 0) {
      console.log('  (none)');
    } else {
      for (const w of warning) {
        console.log(`  [${w.status.toUpperCase()}] ${w.tenantName} (${w.tenantSlug}) — ${w.daysLeft} day(s) left`);
        console.log(`    Plan : ${w.plan} / ${w.billingPeriod} | Ends: ${w.effectiveEnd}`);
        console.log('');
      }
    }
    console.log('');

    console.log('--- HEALTHY (> 7 days) ---');
    if (healthy.length === 0) {
      console.log('  (none)');
    } else {
      for (const h of healthy) {
        console.log(`  [${h.status.toUpperCase()}] ${h.tenantName} — ${h.daysLeft} day(s) left | Plan: ${h.plan}`);
      }
    }
    console.log('');

    // ── 4. Summary ──
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`  Total active/trialing : ${subs.length}`);
    console.log(`  Expired (< now)       : ${expired.length}`);
    console.log(`  Expiring soon (<=7d)  : ${warning.length}`);
    console.log(`  Healthy (>7d)         : ${healthy.length}`);
    console.log('========================================');

    if (expired.length > 0) {
      console.log('\n⚠️  ACTION REQUIRED: ' + expired.length + ' subscription(s) are past their end date but still marked active/trialing!');
      console.log('   Consider running the expiry cron to deactivate them and send notifications.\n');
    } else {
      console.log('\n✅  No expired subscriptions found. All active/trialing subscriptions are within their period.\n');
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
