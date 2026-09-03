import { NextResponse } from 'next/server'
import { requireRootAdmin } from '@/lib/auth-server'

export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  const info: Record<string, string> = {}

  // 1) Check env vars (no sensitive data)
  info['DATABASE_URL_set'] = !!process.env.DATABASE_URL ? 'YES' : 'NO'
  info['NODE_ENV'] = process.env.NODE_ENV || 'undefined'

  // 2) Try Prisma connection
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const start = Date.now()
    await prisma.$queryRawUnsafe('SELECT 1 as ok')
    info['prisma_connection'] = `OK (${Date.now() - start}ms)`
    await prisma.$disconnect()
  } catch (e: unknown) {
    info['prisma_connection'] = 'FAILED'
    if (e instanceof Error) info['prisma_error'] = e.message.substring(0, 200)
  }

  return NextResponse.json(info)
}