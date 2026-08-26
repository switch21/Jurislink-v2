const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:xoTozRtY5jJqu2ma@db.zosqktvmihtkqbbgdbgx.supabase.co:5432/postgres' });

c.connect().then(async () => {
  // List tables
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('=== TABLES (' + tables.rows.length + ') ===');
  tables.rows.forEach(r => console.log('  ' + r.table_name));

  // Columns for each table
  for (const t of tables.rows) {
    const cols = await c.query(
      `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
       FROM information_schema.columns WHERE table_schema='public' AND table_name='${t.table_name}' ORDER BY ordinal_position`
    );
    console.log('\n--- ' + t.table_name + ' (' + cols.rows.length + ' cols) ---');
    cols.rows.forEach(r => {
      const def = r.column_default ? ' DEFAULT ' + r.column_default : '';
      const null_ = r.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
      console.log('  ' + r.column_name + ' | ' + r.data_type + null_ + def);
    });
  }

  // Foreign keys
  console.log('\n=== FOREIGN KEYS ===');
  const fks = await c.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  fks.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name} -> ${r.foreign_table}.${r.foreign_column}`));

  // Row counts
  console.log('\n=== ROW COUNTS ===');
  for (const t of tables.rows) {
    const cnt = await c.query(`SELECT COUNT(*) as n FROM "${t.table_name}"`);
    console.log('  ' + t.table_name + ': ' + cnt.rows[0].n + ' rows');
  }

  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
