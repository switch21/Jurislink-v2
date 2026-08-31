/**
 * Fire-and-forget notification helper.
 * Sends notification to the notification service (port 3005) or falls back to direct DB insert.
 * Never blocks the parent request.
 */

import { getDb } from '@/lib/db'

const NOTIFY_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005'

export interface NotifyParams {
  tenantId: string
  type: string // notification category: dossier, facture, tache, evenement, message, systeme, document
  title: string
  message: string
  resourceType?: string | null // case, invoice, task, event, document
  resourceId?: string | null
  userId?: string | null // specific user (null = broadcast to tenant)
}

/**
 * Try notification service first, fall back to direct DB insert.
 */
export function fireNotification(params: NotifyParams): void {
  // Fire-and-forget — never await this
  const doNotify = async () => {
    try {
      const endpoint = params.userId ? '/notify-user' : '/notify'
      const res = await fetch(`${NOTIFY_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: params.tenantId,
          type: params.type,
          title: params.title,
          message: params.message,
          resourceType: params.resourceType || null,
          resourceId: params.resourceId || null,
          userId: params.userId || null,
        }),
      })
      if (res.ok) return // success via service
    } catch {
      // Service down — fall back to direct DB
    }

    // Fallback: direct DB insert
    try {
      const db = getDb()
      await db.notification.create({
        data: {
          title: params.title,
          message: params.message,
          category: params.type,
          resourceType: params.resourceType || null,
          resourceId: params.resourceId || null,
          tenantId: params.tenantId,
          userId: params.userId || null,
        },
      })
      await db.$disconnect().catch(() => {})
    } catch {
      // Silently fail — never block parent request
    }
  }

  doNotify()
}

/**
 * Notify all assignees of a case about something.
 */
export async function notifyCaseAssignees(
  caseId: string,
  tenantId: string,
  params: Omit<NotifyParams, 'tenantId' | 'userId'>
): Promise<void> {
  try {
    const db = getDb()
    const assignments = await db.caseAssignment.findMany({
      where: { caseId, tenantId },
      select: { userId: true },
    })
    await db.$disconnect().catch(() => {})
    for (const a of assignments) {
      fireNotification({ ...params, tenantId, userId: a.userId })
    }
  } catch {
    // Silently fail
  }
}
