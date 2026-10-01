const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows: subs } = await pool.query(`
    SELECT s.*, sp.name as plan_name, t.id as tenant_id, t.name as tenant_name, t.is_active as tenant_is_active
    FROM subscriptions s
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    LEFT JOIN tenants t ON t.id = s.tenant_id
  `);
  const now = new Date();
  let issues = 0;
  const results = [];

  for (const sub of subs) {
    const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
    const daysLeft = end ? Math.ceil((end - now) / 86400000) : null;
    const expired = end && end < now;
    const warning = end && !expired && daysLeft !== null && daysLeft <= 15;
    const healthy = !expired && !warning;

    results.push({ tenant: sub.tenant_name, plan: sub.plan_name, end: sub.current_period_end, daysLeft, status: expired ? 'EXPIRED' : warning ? 'WARNING' : 'OK', tenantActive: sub.tenant_is_active });

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

  await pool.end();
}

main().catch(e => { console.error("DB ERROR:", e.message); process.exit(1); });
