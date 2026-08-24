import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function getTenantId(request: Request): string | null {
  // Check header first, then query param
  const headerTenant = request.headers.get('x-tenant-id')
  if (headerTenant) return headerTenant

  const { searchParams } = new URL(request.url)
  return searchParams.get('tenantId')
}

function getPeriodDates(billingPeriod: string) {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  switch (billingPeriod) {
    case 'monthly':
      end.setMonth(end.getMonth() + 1)
      break
    case 'quarterly':
      end.setMonth(end.getMonth() + 3)
      break
    case 'semi_annual':
      end.setMonth(end.getMonth() + 6)
      break
    case 'annual':
    default:
      end.setFullYear(end.getFullYear() + 1)
      break
  }

  return { start, end }
}

export async function GET(request: Request) {
  const db = getDb()
  try {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'L\'identifiant du cabinet est requis' }, { status: 400 })
    }

    const subscription = await db.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 404 })
    }

    return NextResponse.json(subscription)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la récupération de l\'abonnement:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'abonnement' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, planId, billingPeriod } = body

    if (!tenantId || !planId) {
      return NextResponse.json(
        { error: 'L\'identifiant du cabinet et du forfait sont requis' },
        { status: 400 }
      )
    }

    const period = billingPeriod || 'annual'
    const { start, end } = getPeriodDates(period)

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'Cabinet introuvable' }, { status: 404 })
    }

    // Verify plan exists
    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: 'Forfait introuvable' }, { status: 404 })
    }

    // Upsert subscription
    const subscription = await db.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId,
        status: 'active',
        billingPeriod: period,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
      update: {
        planId,
        billingPeriod: period,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        status: 'active',
      },
      include: { plan: true },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la création de l\'abonnement:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'abonnement' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
