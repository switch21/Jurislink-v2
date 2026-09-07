import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const result: Record<string, unknown> = {}
  
  // 1. Env check (safely masked)
  const rawUrl = process.env.DATABASE_URL || ''
  result['has_database_url'] = Boolean(rawUrl)
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      result['db_protocol'] = parsed.protocol
      result['db_host'] = parsed.hostname
      result['db_port'] = parsed.port
      result['db_database'] = parsed.pathname
      result['db_params'] = parsed.search
    } catch {
      result['db_url_parse_error'] = 'Invalid URL format'
    }
  }

  // 2. Prisma raw query connection test
  const db = getDb()
  try {
    const connCheck = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT 1 as connected, current_database() as db, current_user as usr, version() as version'
    )
    result['connection_test'] = 'SUCCESS'
    result['connection_info'] = connCheck[0] || null

    // 3. Inspect public tables in DB
    const tables = await db.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    )
    result['existing_tables'] = tables.map((t) => t.table_name)

    // 4. Inspect columns of users / User table
    const columns = await db.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('users', 'User') ORDER BY column_name`
    )
    result['user_columns'] = columns

    // 5. Try Prisma findFirst
    try {
      const userCount = await db.user.count()
      result['prisma_user_count'] = userCount
      const firstUser = await db.user.findFirst({
        select: { id: true, email: true, fullName: true, role: true, isActive: true },
      })
      result['prisma_find_first'] = 'SUCCESS'
      result['sample_user'] = firstUser
    } catch (e: unknown) {
      result['prisma_find_first'] = 'FAILED'
      result['prisma_find_first_error'] = e instanceof Error ? e.message : String(e)
    }
  } catch (err: unknown) {
    result['connection_test'] = 'FAILED'
    result['connection_error'] = err instanceof Error ? err.message : String(err)
  } finally {
    await db.$disconnect().catch(() => {})
  }

  return NextResponse.json(result)
}
