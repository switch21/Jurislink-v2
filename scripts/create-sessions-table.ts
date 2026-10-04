// Crée la table user_sessions (gestion des sessions : 2 appareils max, inactivité 3 min)
import { config } from 'dotenv'
config({ path: 'C:/Users/patep/Desktop/FETCH/.env' })

const raw = process.env.DATABASE_URL || ''
const m = raw.match(/postgresql:\/\/([^:]+):([^@]+)@[^/]+\/(.+)/)
if (m) {
  const [, user, pass, dbName] = m
  const base = user.split('.')[0]
  const ref = user.includes('.') ? user.split('.')[1] : 'zosqktvmihtkqbbgdbgx'
  process.env.DATABASE_URL = `postgresql://${base}.${ref}:${pass}@aws-1-eu-west-3.pooler.supabase.com:5432/${dbName}`
  console.log('DATABASE_URL -> pooler (ref ' + ref + ')')
}

async function main() {
  const { getDb } = await import('../src/lib/db')
  const db = getDb()

  await db.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      tenant_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_active_at timestamptz NOT NULL DEFAULT now(),
      active boolean NOT NULL DEFAULT true
    )
  `)
  console.log('user_sessions créée (ou déjà existante)')

  await db.$queryRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id, active)`)
  console.log('index ok')

  const rows = await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_sessions' ORDER BY ordinal_position`)
  console.log('colonnes:', (rows as Array<{ column_name: string }>).map(r => r.column_name).join(', '))

  await db.$disconnect()
}
main().catch(e => { console.error('FATAL:', e); process.exit(1) })
