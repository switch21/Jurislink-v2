import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as OTPAuth from 'otpauth'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/auth/mfa/disable
 * Disables MFA for the user. Requires a valid TOTP code as confirmation.
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
    if (!dbUser?.mfaSecret || !dbUser.mfaEnabled) {
      return NextResponse.json({ error: 'MFA n\'est pas activé' }, { status: 400 })
    }

    // Verify the TOTP code before disabling
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
      return NextResponse.json({ error: 'Code invalide. MFA non désactivé.' }, { status: 401 })
    }

    // Disable MFA and clear secret
    await db.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null },
    })

    return NextResponse.json({
      enabled: false,
      message: 'MFA désactivé avec succès',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('MFA disable error:', message)
    return NextResponse.json({ error: 'Erreur lors de la désactivation MFA' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
