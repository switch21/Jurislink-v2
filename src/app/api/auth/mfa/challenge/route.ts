import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as OTPAuth from 'otpauth'
import { randomUUID } from 'crypto'

// In-memory store for pending MFA challenges (userId -> { token, expiresAt, userData })
// In production, this would use Redis. For now, a simple Map with TTL cleanup.
const mfaChallenges = new Map<string, {
  userId: string
  token: string
  expiresAt: number
  userData: Record<string, unknown>
}>()

// Clean up expired challenges every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of mfaChallenges) {
      if (val.expiresAt < now) mfaChallenges.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * POST /api/auth/mfa/challenge
 * Step 2 of MFA login: verifies TOTP code and returns full user data.
 * Expects: { userId, mfaToken, code }
 */
export async function POST(request: Request) {
  try {
    const { userId, mfaToken, code } = await request.json()

    if (!userId || !mfaToken || !code) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 400 })
    }
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code invalide — 6 chiffres requis' }, { status: 400 })
    }

    // Lookup the pending challenge
    const challengeKey = `${userId}:${mfaToken}`
    const challenge = mfaChallenges.get(challengeKey)
    if (!challenge) {
      return NextResponse.json({ error: 'Session MFA expirée. Veuillez vous reconnecter.' }, { status: 401 })
    }
    if (challenge.expiresAt < Date.now()) {
      mfaChallenges.delete(challengeKey)
      return NextResponse.json({ error: 'Session MFA expirée. Veuillez vous reconnecter.' }, { status: 401 })
    }

    const db = getDb()
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { mfaSecret: true, mfaEnabled: true },
      })

      if (!user?.mfaSecret || !user.mfaEnabled) {
        mfaChallenges.delete(challengeKey)
        return NextResponse.json({ error: 'MFA non configuré pour cet utilisateur' }, { status: 400 })
      }

      // Verify TOTP
      const totp = new OTPAuth.TOTP({
        issuer: 'JurisLink',
        label: userId,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
      })

      const delta = totp.validate({ token: code, window: 1 })
      if (delta === null) {
        return NextResponse.json({ error: 'Code invalide. Veuillez réessayer.' }, { status: 401 })
      }

      // Challenge passed — remove it and return user data
      mfaChallenges.delete(challengeKey)

      // Update last login
      try {
        await db.user.update({
          where: { id: userId },
          data: { lastLoginAt: new Date() },
        })
      } catch {}

      return NextResponse.json(challenge.userData)
    } finally {
      await db.$disconnect().catch(() => {})
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('MFA challenge error:', message)
    return NextResponse.json({ error: 'Erreur de vérification MFA' }, { status: 500 })
  }
}

/**
 * Create a pending MFA challenge. Called from login route.
 * Returns the mfaToken to send to the client.
 */
export function createMfaChallenge(userId: string, userData: Record<string, unknown>): string {
  const mfaToken = randomUUID()
  mfaChallenges.set(`${userId}:${mfaToken}`, {
    userId,
    token: mfaToken,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    userData,
  })
  return mfaToken
}
