import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-server'

/**
 * GET /api/currencies?tenantId=xxx
 * Returns global currencies (tenantId=null) + the tenant's own currencies.
 * Any authenticated user can view currencies.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId') || auth.tenantId

  const db = getDb()
  try {
    const currencies = await db.currency.findMany({
      where: {
        OR: [
          { tenantId: null },  // Global/system currencies
          ...(tenantId ? [{ tenantId }] : []),
        ],
      },
      orderBy: [{ tenantId: 'asc' }, { code: 'asc' }],
    })
    return NextResponse.json(currencies)
  } catch (error) {
    console.error('List currencies error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/**
 * POST /api/currencies
 * Creates a new currency for the authenticated user's tenant.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Cabinet requis' }, { status: 400 })
  }

  const db = getDb()
  try {
    const body = await request.json()
    if (!body.code || !body.name || !body.symbol) {
      return NextResponse.json({ error: 'Code, nom et symbole requis' }, { status: 400 })
    }
    const code = body.code.toUpperCase().trim()

    const currency = await db.currency.create({
      data: {
        code,
        name: body.name.trim(),
        symbol: body.symbol.trim(),
        tenantId: auth.tenantId,
      },
    })
    return NextResponse.json(currency, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'Cette devise existe déjà pour votre cabinet' }, { status: 409 })
    }
    console.error('Create currency error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
