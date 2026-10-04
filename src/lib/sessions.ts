import { getDb } from '@/lib/db'

export const MAX_ACTIVE_SESSIONS = 2
export const SESSION_IDLE_MINUTES = 3

export interface StartSessionResult {
  sessionId: string
  otherActiveCount: number
}

/**
 * Register a new device session for a user.
 * Stale sessions (inactive > 3 min) are cleaned up first.
 * Returns { sessionId: '', otherActiveCount: n } when the device limit is reached.
 * Returns null when the sessions table is unavailable (fail-open: login proceeds).
 */
export async function startSession(userId: string, tenantId: string | null): Promise<StartSessionResult | null> {
  const db = getDb()
  try {
    await db.$queryRawUnsafe(
      `UPDATE user_sessions SET active = false WHERE user_id = $1 AND active = true AND last_active_at < now() - interval '3 minutes'`,
      userId,
    )
    const rows = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM user_sessions WHERE user_id = $1 AND active = true`,
      userId,
    )
    const active = (rows as Array<{ n: number }>)[0]?.n ?? 0
    if (active >= MAX_ACTIVE_SESSIONS) {
      return { sessionId: '', otherActiveCount: active }
    }
    const sessionId = crypto.randomUUID()
    await db.$queryRawUnsafe(
      `INSERT INTO user_sessions (id, user_id, tenant_id, created_at, last_active_at, active) VALUES ($1, $2, $3, now(), now(), true)`,
      sessionId,
      userId,
      tenantId,
    )
    return { sessionId, otherActiveCount: active }
  } catch (err) {
    console.warn('[sessions] startSession unavailable:', (err as Error)?.message)
    return null
  }
}

/** Mark a session as ended (logout, idle timeout). */
export async function endSession(sessionId: string, userId: string): Promise<void> {
  if (!sessionId) return
  try {
    const db = getDb()
    await db.$queryRawUnsafe(
      `UPDATE user_sessions SET active = false WHERE id = $1 AND user_id = $2`,
      sessionId,
      userId,
    )
  } catch {
    // Non-critical
  }
}

/**
 * Heartbeat: refresh last_active_at. Returns false when the session
 * was revoked (force-logout or superseded) — the client must log out.
 * Fail-open: returns true on infrastructure errors.
 */
export async function touchSession(sessionId: string, userId: string): Promise<boolean> {
  if (!sessionId) return true
  try {
    const db = getDb()
    const rows = await db.$queryRawUnsafe(
      `UPDATE user_sessions SET last_active_at = now() WHERE id = $1 AND user_id = $2 AND active = true RETURNING id`,
      sessionId,
      userId,
    )
    return (rows as unknown[]).length > 0
  } catch {
    return true
  }
}

/** Revoke every active session of a user (force logout from the Équipe screen). */
export async function revokeAllSessions(userId: string): Promise<void> {
  try {
    const db = getDb()
    await db.$queryRawUnsafe(
      `UPDATE user_sessions SET active = false WHERE user_id = $1 AND active = true`,
      userId,
    )
  } catch {
    // Non-critical — WebSocket cut still happens
  }
}
