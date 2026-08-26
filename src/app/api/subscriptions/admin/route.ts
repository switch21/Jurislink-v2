import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isErrorResponse, requireRootAdmin } from '@/lib/auth-server'

function getPeriodDates(billingPeriod: string, fromDate?: Date) {
  const start = fromDate ? new Date(fromDate) : new Date()
  const end = new Date(start)

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

export async function PUT(request: Request) {
  const auth = await requireRootAdmin(request)
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, planId, billingPeriod, action } = body

    if (!tenantId || !planId || !billingPeriod || !action) {
      return NextResponse.json(
        { error: 'tenantId, planId, billingPeriod et action sont requis' },
        { status: 400 }
      )
    }

    if (!['renew', 'change', 'upgrade'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Valeurs: renew, change, upgrade' },
        { status: 400 }
      )
    }

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } } },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Cabinet introuvable' }, { status: 404 })
    }

    // Verify plan exists
    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: 'Forfait introuvable' }, { status: 404 })
    }

    let startDate: Date
    let { end: endDate } = getPeriodDates(billingPeriod)

    if (action === 'renew' || action === 'upgrade') {
      // Extend from current period end (or from now if expired/missing)
      const currentEnd = tenant.subscription?.currentPeriodEnd
        ? new Date(tenant.subscription.currentPeriodEnd)
        : null
      if (currentEnd && currentEnd > new Date()) {
        startDate = new Date(currentEnd)
        // Recalculate end from the current end date
        const result = getPeriodDates(billingPeriod, currentEnd)
        endDate = result.end
      } else {
        // Expired or no subscription — start from now
        startDate = new Date()
      }
    } else {
      // 'change' — start new period from now
      startDate = new Date()
    }

    // Upsert subscription
    const subscription = await db.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId,
        status: 'active',
        billingPeriod,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
      },
      update: {
        planId,
        billingPeriod,
        status: 'active',
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
      },
      include: { plan: true },
    })

    // Update tenant with plan info and reactivate if needed
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan: plan.slug || plan.name.toLowerCase(),
        maxUsers: plan.maxUsers,
        maxStorageGb: plan.maxStorageGb,
        isActive: true,
      },
    })

    const actionLabels: Record<string, string> = {
      renew: 'renouvelé',
      change: 'modifié',
      upgrade: 'upgradé',
    }

    return NextResponse.json({
      subscription,
      message: `Abonnement ${actionLabels[action]} avec succès`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Admin subscription management error:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la gestion de l\'abonnement' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
