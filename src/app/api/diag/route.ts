import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doMigrate = searchParams.get('migrate') === 'true'
  const result: Record<string, unknown> = {}
  const db = getDb()

  try {
    // If migrate=true, safely apply missing columns
    if (doMigrate) {
      const sqlStatements = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMP;`,
        `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_cases INTEGER DEFAULT 50;`,
        `ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_portal_id UUID;`,
        `ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT;`,
        `ALTER TABLE events ADD COLUMN IF NOT EXISTS external_event_id TEXT;`,
        `ALTER TABLE events ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT FALSE;`,
      ]
      const applied: string[] = []
      for (const sql of sqlStatements) {
        await db.$executeRawUnsafe(sql)
        applied.push(sql)
      }
      result['migration_applied'] = applied
    }

    // Inspect columns of users table
    const columns = await db.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY column_name`
    )
    result['user_columns'] = columns.map(c => c.column_name)

    // Test the exact query that Login runs
    try {
      const testUser = await db.user.findFirst({
        where: { email: 'ngassa@jurislink.com' },
        include: { tenant: true, roleObj: true },
      })
      result['login_query_test'] = 'SUCCESS'
      result['test_user_found'] = Boolean(testUser)
      if (testUser) {
        result['test_user_email'] = testUser.email
        result['test_user_role'] = testUser.role
        result['test_user_tenant'] = testUser.tenant?.name || null
        result['test_user_has_password'] = Boolean(testUser.password)
      }
    } catch (e: unknown) {
      result['login_query_test'] = 'FAILED'
      result['login_query_error'] = e instanceof Error ? e.message : String(e)
    }

  } catch (err: unknown) {
    result['error'] = err instanceof Error ? err.message : String(err)
  } finally {
    await db.$disconnect().catch(() => {})
  }

  return NextResponse.json(result)
}
