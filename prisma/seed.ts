/**
 * Minimal seed — ensures root_admin role + user exist.
 * SAFE: only INSERT if not already present. NEVER updates or deletes.
 *
 * Usage: bunx tsx prisma/seed.ts
 */
import { Pool } from 'pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
})

const ROOT_ADMIN_EMAIL = 'pat.epee@gmail.com'
const ROOT_ADMIN_NAME = 'Root Administrateur'
const DEFAULT_PASSWORD = 'Admin@123'

// ── Role + Permission IDs ────────────────────────────────────────────────────
const ROOT_ROLE_ID = 'a1000000-0002-0000-0000-000000000001'

const SYSTEM_ROLES = [
  { id: ROOT_ROLE_ID, name: 'root_admin', label: 'Admin Racine', description: 'Super administrateur, gère tous les cabinets', level: 100 },
  { name: 'associate', label: 'Associé', description: 'Accès complet à tous les dossiers du cabinet', level: 80 },
  { name: 'firm_admin', label: 'Admin Cabinet', description: 'Administrateur du cabinet', level: 70 },
  { name: 'lawyer', label: 'Avocat', description: 'Accès à ses dossiers et dossiers autorisés', level: 50 },
  { name: 'jurist', label: 'Juriste', description: 'Dossiers attribués uniquement', level: 40 },
  { name: 'assistant', label: 'Assistant', description: 'Agenda, tâches et documents autorisés', level: 30 },
  { name: 'accountant', label: 'Comptable', description: 'Facturation et paiements', level: 20 },
  { name: 'client', label: 'Client', description: 'Uniquement son espace client', level: 10 },
]

// Resources + actions for permission matrix
const RESOURCES = ['case', 'client', 'document', 'invoice', 'task', 'event', 'audit', 'user', 'report', 'setting', 'message', 'notification', 'time_entry', 'document_template', 'payment', 'communication', 'role', 'audit_log', 'subscription']
const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'manage_permissions']

// root_admin gets ALL permissions
const ROOT_PERMISSIONS: Record<string, Record<string, number>> = {}
for (const res of RESOURCES) {
  ROOT_PERMISSIONS[res] = {}
  for (const act of ACTIONS) {
    ROOT_PERMISSIONS[res][act] = 1
  }
}

async function main() {
  console.log('🌱 Minimal seed — ensuring root_admin exists (no data modified)…')

  // ═════════════════════════════════════════════════════════════════════════
  // 1. ROLES — insert if missing
  // ═════════════════════════════════════════════════════════════════════════
  for (const r of SYSTEM_ROLES) {
    const id = r.id || undefined
    const { rowCount } = await pool.query(
      `INSERT INTO roles (id, name, label, description, level, is_system, created_at, updated_at)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, true, NOW(), NOW())
       ON CONFLICT (name) DO NOTHING`,
      [id, r.name, r.label, r.description, r.level]
    )
    if (rowCount) console.log(`  ✅ Role created: ${r.name}`)
    else console.log(`  ⏭️  Role already exists: ${r.name}`)
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. PERMISSIONS — insert if missing
  // ═════════════════════════════════════════════════════════════════════════
  let permCount = 0
  for (const res of RESOURCES) {
    for (const act of ACTIONS) {
      const name = `${res}_${act}`
      const { rowCount } = await pool.query(
        `INSERT INTO permissions (id, name, resource, action, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
         ON CONFLICT (name) DO NOTHING`,
        [name, res, act]
      )
      if (rowCount) permCount++
    }
  }
  console.log(`  ✅ Permissions: ${permCount} created (others already existed)`)

  // ═════════════════════════════════════════════════════════════════════════
  // 3. ROLE_PERMISSIONS for root_admin — insert if missing
  // ═════════════════════════════════════════════════════════════════════════
  const { rows: rootRole } = await pool.query(
    `SELECT id FROM roles WHERE name = 'root_admin' LIMIT 1`
  )
  if (rootRole.length === 0) {
    throw new Error('root_admin role not found — this should never happen')
  }
  const rootRoleId = rootRole[0].id

  let rpCount = 0
  for (const res of RESOURCES) {
    for (const act of ACTIONS) {
      if (!ROOT_PERMISSIONS[res]?.[act]) continue
      const { rowCount } = await pool.query(
        `INSERT INTO role_permissions (id, role_id, permission_id, allowed, created_at)
         SELECT gen_random_uuid(), $1, p.id, true, NOW()
         FROM permissions p WHERE p.name = $2
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [rootRoleId, `${res}_${act}`]
      )
      if (rowCount) rpCount++
    }
  }
  console.log(`  ✅ root_admin permissions: ${rpCount} linked (others already existed)`)

  // ═════════════════════════════════════════════════════════════════════════
  // 4. ROOT_ADMIN USER — insert if missing, NEVER update
  // ═════════════════════════════════════════════════════════════════════════
  const { rows: existingAdmin } = await pool.query(
    `SELECT id, email, full_name, is_active FROM users WHERE email = $1 LIMIT 1`,
    [ROOT_ADMIN_EMAIL]
  )

  if (existingAdmin.length > 0) {
    const admin = existingAdmin[0]
    console.log(`  ⏭️  root_admin user already exists: ${admin.email} (${admin.full_name}), active=${admin.is_active}`)
    console.log('     → No modification made (root_admin is never touched)')
  } else {
    const passwordHash = await hash(DEFAULT_PASSWORD, 10)
    const { rowCount } = await pool.query(
      `INSERT INTO users (id, full_name, email, role, role_id, password, is_active, preferred_language, mfa_enabled, failed_login_attempts, session_count_today, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'root_admin', $3, $4, true, 'fr', false, 0, 0, NOW(), NOW())`,
      [ROOT_ADMIN_NAME, ROOT_ADMIN_EMAIL, rootRoleId, passwordHash]
    )
    if (rowCount) {
      console.log(`  ✅ root_admin user created: ${ROOT_ADMIN_EMAIL}`)
      console.log(`     Password: ${DEFAULT_PASSWORD}`)
      console.log('     ⚠️  Change this password immediately after first login!')
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. CURRENCIES — insert if missing
  // ═════════════════════════════════════════════════════════════════════════
  const currencies = [
    { code: 'XAF', name: 'Franc CFA (BEAC)', symbol: 'FCFA' },
    { code: 'XOF', name: 'Franc CFA (BCEAO)', symbol: 'FCFA' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'Dollar US', symbol: '$' },
  ]
  for (const c of currencies) {
    await pool.query(
      `INSERT INTO currencies (id, code, name, symbol, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       ON CONFLICT (code, tenant_id) DO NOTHING`,
      [c.code, c.name, c.symbol]
    ).catch(() => {
      // Currency already exists — safe to ignore
    })
  }
  console.log('  ✅ Currencies ensured')

  console.log('\n✅ Seed complete — root_admin is safe.')
  console.log(`   Login: ${ROOT_ADMIN_EMAIL}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => pool.end())
