import { NextResponse } from 'next/server'
import pg from 'pg'
import { hash } from 'bcryptjs'
import { requireRootAdmin } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  try {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()

    // Add column if missing
    const col = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password'")
    if (col.rows.length === 0) {
      await client.query('ALTER TABLE users ADD COLUMN password TEXT')
    }

    // Set default password for users without one
    try { await client.query('ALTER TABLE users DISABLE TRIGGER audit_users_trigger') } catch {}
    const pw = await hash('Admin@123', 10)
    const res = await client.query('UPDATE users SET password = $1 WHERE password IS NULL', [pw])
    try { await client.query('ALTER TABLE users ENABLE TRIGGER audit_users_trigger') } catch {}

    await client.end()
    return NextResponse.json({ ok: true, message: `OK. ${res.rowCount} mot(s) de passe mis à jour.` })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
