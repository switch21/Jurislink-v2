const { Client } = require('pg');
async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
  console.log(JSON.stringify(r.rows.map(r => r.table_name)));
  await c.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });