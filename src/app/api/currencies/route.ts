import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireRootAdmin } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const currencies = await db.currency.findMany({
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(currencies)
  } catch (error) {
    console.error('List currencies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const currency = await db.currency.create({
      data: {
        code: body.code,
        name: body.name,
        symbol: body.symbol,
      },
    })
    return NextResponse.json(currency, { status: 201 })
  } catch (error) {
    console.error('Create currency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
