import { getDb } from '@/lib/db'
import { PrismaClient } from '@prisma/client'

export type LimitResource = 'users' | 'cases' | 'storage'

export interface TenantLimits {
  maxUsers: number
  maxStorageGb: number
  maxCases: number
  hasAI: boolean
  features: string[]
  trialEndsAt: Date | null
  isTrial: boolean
  planSlug: string
  planName: string
}

export interface EnforceLimitResult {
  allowed: boolean
  limit: number
  current: number
  message?: string
}

const ENTERPRISE_SLUG = 'enterprise'
const BYTES_PER_GB = 1024 * 1024 * 1024

/**
 * Fetch the effective plan limits for a tenant.
 * If no subscription exists, returns free-tier defaults.
 */
export async function getTenantLimits(tenantId: string): Promise<TenantLimits> {
  const db = getDb()
  try {
    const subscription = await db.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    })

    if (!subscription || !subscription.plan) {
      return {
        maxUsers: 1,
        maxStorageGb: 1,
        maxCases: 3,
        hasAI: false,
        features: [],
        trialEndsAt: null,
        isTrial: false,
        planSlug: 'free',
        planName: 'Gratuit',
      }
    }

    const plan = subscription.plan
    let features: string[] = []
    try {
      features = JSON.parse(plan.features)
    } catch {
      features = []
    }

    const now = new Date()
    const isTrial = !!(subscription.trialEndsAt && subscription.trialEndsAt > now)

    return {
      maxUsers: plan.maxUsers,
      maxStorageGb: plan.maxStorageGb,
      maxCases: plan.maxCases,
      hasAI: plan.hasAI,
      features,
      trialEndsAt: subscription.trialEndsAt,
      isTrial,
      planSlug: plan.slug,
      planName: plan.name,
    }
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/**
 * Enforce a plan limit before creating a resource.
 * Call in API routes before creating a user, case, or uploading a file.
 *
 * @param resource  - 'users' | 'cases' | 'storage'
 * @param tenantId  - The tenant to check limits for
 * @param db        - Prisma client instance (caller manages lifecycle)
 * @param currentCount - Optional pre-fetched count. For 'storage' must be in bytes.
 *                        If omitted, this function will query the DB.
 */
export async function enforceLimit(
  resource: LimitResource,
  tenantId: string,
  db: PrismaClient,
  currentCount?: number,
): Promise<EnforceLimitResult> {
  // 1. Fetch plan limits
  const subscription = await db.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  })

  if (!subscription || !subscription.plan) {
    // No subscription — free tier hard limits
    const freeLimits: Record<LimitResource, number> = {
      users: 1,
      cases: 3,
      storage: 1, // 1 GB
    }
    const limit = freeLimits[resource]
    const current = await resolveCount(resource, tenantId, db, currentCount)
    const displayCurrent = resource === 'storage' ? bytesToGb(current) : current
    const displayLimit = resource === 'storage' ? limit : limit

    return {
      allowed: displayCurrent < displayLimit,
      limit: displayLimit,
      current: displayCurrent,
      message: displayCurrent >= displayLimit
        ? getLimitMessage(resource, displayLimit, 'Gratuit')
        : undefined,
    }
  }

  const plan = subscription.plan

  // Enterprise: -1 means unlimited
  if (plan.slug === ENTERPRISE_SLUG) {
    const max = resource === 'users' ? plan.maxUsers
      : resource === 'cases' ? plan.maxCases
      : -1
    if (max === -1) {
      return { allowed: true, limit: -1, current: 0 }
    }
  }

  // Determine the numeric limit for the resource
  let limit: number
  switch (resource) {
    case 'users':
      limit = plan.maxUsers
      break
    case 'cases':
      limit = plan.maxCases
      break
    case 'storage':
      limit = plan.maxStorageGb
      break
  }

  // -1 for non-enterprise shouldn't happen, but treat as unlimited if it does
  if (limit === -1) {
    return { allowed: true, limit: -1, current: 0 }
  }

  const current = await resolveCount(resource, tenantId, db, currentCount)
  const displayCurrent = resource === 'storage' ? bytesToGb(current) : current

  return {
    allowed: displayCurrent < limit,
    limit,
    current: displayCurrent,
    message: displayCurrent >= limit
      ? getLimitMessage(resource, limit, plan.name)
      : undefined,
  }
}

// ── Internal helpers ──────────────────────────────────────────────

async function resolveCount(
  resource: LimitResource,
  tenantId: string,
  db: PrismaClient,
  providedCount?: number,
): Promise<number> {
  if (providedCount !== undefined) return providedCount

  switch (resource) {
    case 'users':
      return db.user.count({ where: { tenantId, isActive: true } })
    case 'cases':
      return db.case.count({ where: { tenantId } })
    case 'storage':
      // Sum of all document file sizes in bytes
      const result = await db.document.aggregate({
        where: { tenantId },
        _sum: { fileSize: true },
      })
      return result._sum.fileSize ?? 0
  }
}

function bytesToGb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_GB) * 100) / 100
}

function getLimitMessage(resource: LimitResource, limit: number, planName: string): string {
  const resourceLabels: Record<LimitResource, string> = {
    users: 'utilisateurs',
    cases: 'dossiers',
    storage: `${limit} Go de stockage`,
  }

  if (resource === 'storage') {
    return `Limite de stockage atteinte (${limit} Go) pour le forfait ${planName}. Veuillez mettre à niveau votre abonnement.`
  }
  return `Limite de ${resourceLabels[resource]} atteinte (${limit}) pour le forfait ${planName}. Veuillez mettre à niveau votre abonnement.`
}
