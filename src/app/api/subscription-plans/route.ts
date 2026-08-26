import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isErrorResponse, requireRootAdmin } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await requireRootAdmin(request)
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(plans)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la récupération des forfaits:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des forfaits' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await requireRootAdmin(request)
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const body = await request.json()
    const plan = await db.subscriptionPlan.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        priceAnnual: body.priceAnnual || 0,
        priceSemiAnnual: body.priceSemiAnnual || 0,
        priceQuarterly: body.priceQuarterly || 0,
        priceMonthly: body.priceMonthly || 0,
        currencyCode: body.currencyCode || 'XAF',
        maxUsers: body.maxUsers || 3,
        maxStorageGb: body.maxStorageGb || 5,
        hasAI: body.hasAI ?? false,
        features: body.features ? JSON.stringify(body.features) : '[]',
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder || 0,
      },
    })
    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
