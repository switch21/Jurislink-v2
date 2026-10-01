import { NextResponse } from 'next/server'
import { requireRootAdmin } from '@/lib/auth-server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  const info: Record<string, string> = {}

  // 1) Check env vars
  info['DATABASE_URL_set'] = !!process.env.DATABASE_URL ? 'YES' : 'NO'
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL
    info['DB_protocol'] = url.split('://')[0]
    info['DB_host'] = url.split('@')[1]?.split(':')[0] || '?'
    info['DB_port'] = url.split('@')[1]?.split(':')[1]?.split('/')[0] || '?'
    info['DB_name'] = url.split('/').pop() || '?'
    info['DB_url_length'] = String(url.length)
    info['DB_url_start'] = url.substring(0, 30) + '...'
    info['DB_url_end'] = '...' + url.substring(url.length - 20)
  }

  // 2) Try database connection
  try {
    const db = getDb()
    const start = Date.now()
    await db.$queryRawUnsafe('SELECT 1 as ok')
    info['db_connection'] = `OK (${Date.now() - start}ms)`
    await db.$disconnect()
  } catch (e: any) {
    info['db_connection'] = 'FAILED'
    info['db_error'] = (e?.message || String(e)).substring(0, 300)
    info['db_code'] = e?.code || '?'
  }

  return NextResponse.json(info)
}
