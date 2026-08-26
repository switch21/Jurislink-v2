import { NextResponse } from 'next/server'
import { requireRootAdmin } from '@/lib/auth-server'

export async function POST(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  try {
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
