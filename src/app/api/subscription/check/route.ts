import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'subscription', 'view')
  if (isErrorResponse(auth)) return auth

  const tenantId = auth.role === 'root_admin'
    ? (request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId'))
    : auth.tenantId

  if (!tenantId) {
    return NextResponse.json({ error: "L'identifiant du cabinet est requis" }, { status: 400 })
  }

  const db = getDb()
  try {
    const subscription = await db.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })

    if (!subscription || !subscription.plan) {
      // No subscription — return free-tier defaults
      return NextResponse.json({
        plan: null,
        subscription: null,
        limits: {
          maxUsers: 1,
          maxStorageGb: 1,
          maxCases: 3,
          hasAI: false,
          features: [],
        },
        isTrial: false,
        trialDaysRemaining: 0,
        trialExpired: false,
      })
    }

    // Parse features JSON
    let features: string[] = []
    try {
      features = JSON.parse(subscription.plan.features)
    } catch {
      features = []
    }

    const now = new Date()
    const trialEndsAt = subscription.trialEndsAt
    const isTrial = !!(trialEndsAt && trialEndsAt > now)
    const trialExpired = !!(trialEndsAt && trialEndsAt <= now)
    const trialDaysRemaining = isTrial
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    // Get current usage counts
    const [userCount, caseCount, storageResult] = await Promise.all([
      db.user.count({ where: { tenantId, isActive: true } }),
      db.case.count({ where: { tenantId } }),
      db.document.aggregate({
        where: { tenantId },
        _sum: { fileSize: true },
      }),
    ])

    const storageBytes = storageResult._sum.fileSize ?? 0
    const storageGb = Math.round((storageBytes / (1024 * 1024 * 1024)) * 100) / 100

    return NextResponse.json({
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        description: subscription.plan.description,
      },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        billingPeriod: subscription.billingPeriod,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
      },
      limits: {
        maxUsers: subscription.plan.maxUsers,
        maxStorageGb: subscription.plan.maxStorageGb,
        maxCases: subscription.plan.maxCases,
        hasAI: subscription.plan.hasAI,
        features,
        usage: {
          users: userCount,
          cases: caseCount,
          storageGb,
        },
      },
      isTrial,
      trialDaysRemaining,
      trialExpired,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la vérification de l\'abonnement:', message)
    return NextResponse.json(
      { error: "Erreur lors de la vérification de l'abonnement" },
      { status: 500 },
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
