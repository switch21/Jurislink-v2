import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as OTPAuth from 'otpauth'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/auth/mfa/enable
 * Verifies a TOTP code and enables MFA for the user.
 * The secret must already be stored on the user (from /setup).
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const db = getDb()
  try {
    const { code } = await request.json()
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code invalide — 6 chiffres requis' }, { status: 400 })
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { mfaSecret: true, mfaEnabled: true },
    })
    if (!dbUser?.mfaSecret) {
      return NextResponse.json({ error: 'Aucun secret MFA trouvé. Veuillez d\'abord générer un secret.' }, { status: 400 })
    }
    if (dbUser.mfaEnabled) {
      return NextResponse.json({ error: 'MFA est déjà activé' }, { status: 400 })
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

    // Enable MFA
    await db.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    })

    // Generate backup codes (8 codes)
    const backupCodes = Array.from({ length: 8 }, () => {
      return crypto.randomBytes(4).toString('hex').toUpperCase()
    })

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
