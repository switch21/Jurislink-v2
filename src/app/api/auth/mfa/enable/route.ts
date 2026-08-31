import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as OTPAuth from 'otpauth'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/auth/mfa/enable
 * Verifies a TOTP code and enables MFA for the user.
 * Idempotent: if MFA is already enabled, returns success without requiring a code.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const db = getDb()
  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { mfaSecret: true, mfaEnabled: true },
    })

    if (!dbUser?.mfaSecret) {
      return NextResponse.json({ error: 'Aucun secret MFA trouvé. Veuillez d\'abord générer un secret.' }, { status: 400 })
    }

    // Idempotent: if already enabled, return success immediately
    if (dbUser.mfaEnabled) {
      return NextResponse.json({
        enabled: true,
        message: 'MFA est déjà activé',
        alreadyEnabled: true,
        backupCodes: [],
      })
    }

    const { code } = await request.json()
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code invalide — 6 chiffres requis' }, { status: 400 })
    }

    // Verify the TOTP code
    const totp = new OTPAuth.TOTP({
      issuer: 'JurisLink',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(dbUser.mfaSecret),
    })

    const delta = totp.validate({ token: code, window: 1 })
    if (delta === null) {
      return NextResponse.json({ error: 'Code invalide. Veuillez réessayer.' }, { status: 401 })
    }

    // Enable MFA in DB first
    await db.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    })

    // Generate backup codes using Web Crypto API (universally available)
    let backupCodes: string[] = []
    try {
      const buf = new Uint8Array(32) // 8 codes × 4 bytes each
      crypto.getRandomValues(buf)
      backupCodes = Array.from({ length: 8 }, (_, i) => {
        const start = i * 4
        return Array.from(buf.slice(start, start + 4))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
      })
    } catch (backupErr) {
      console.error('MFA backup codes generation failed (non-critical):', backupErr)
    }

    return NextResponse.json({
      enabled: true,
      message: 'MFA activé avec succès',
      backupCodes,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('MFA enable error:', message)
    return NextResponse.json({ error: 'Erreur lors de l\'activation MFA' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
