const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const subs = await db.subscription.findMany({
    include: { plan: { select: { name: true } }, tenant: { select: { id: true, name: true, isActive: true } } },
  });
  const now = new Date();
  let issues = 0;
  const results = [];

  for (const sub of subs) {
    const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    const daysLeft = end ? Math.ceil((end - now) / 86400000) : null;
    const expired = end && end < now;
    const warning = end && !expired && daysLeft !== null && daysLeft <= 15;
    const healthy = !expired && !warning;

    results.push({ tenant: sub.tenant.name, plan: sub.plan?.name, end: sub.currentPeriodEnd, daysLeft, status: expired ? 'EXPIRED' : warning ? 'WARNING' : 'OK', tenantActive: sub.tenant.isActive });

    if (!healthy) issues++;
  }

  console.log("=== JurisLink Subscription Expiry Check ===");
  console.log("Date:", now.toISOString());
  console.log("Total subscriptions:", subs.length);
  console.log("Issues found:", issues);
  console.log("");

  if (issues > 0) {
    console.log("--- Issues ---");
    results.filter(r => r.status !== 'OK').forEach(r => {
      console.log(`[${r.status}] ${r.tenant} | ${r.plan} | ${r.daysLeft}j remaining | end: ${r.end}`);
    });
  } else {
    console.log("All subscriptions healthy.");
  }

  console.log("");
  console.log("--- All Subscriptions ---");
  results.forEach(r => {
    console.log(`[${r.status}] ${r.tenant} | ${r.plan} | ${r.daysLeft !== null ? r.daysLeft + 'j' : 'N/A'}`);
  });

  await db.$disconnect();
}

main().catch(e => { console.error("DB ERROR:", e.message); process.exit(1); });
