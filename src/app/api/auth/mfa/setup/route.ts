import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/auth/mfa/setup
 * Generates a new TOTP secret and returns the otpauth:// URI + QR code data URL.
 * The secret is NOT saved yet — user must verify a code first to confirm setup.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const db = getDb()
  try {
    // Generate new TOTP secret
    const secret = new OTPAuth.Secret()
    const totp = new OTPAuth.TOTP({
      issuer: 'JurisLink',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })

    const otpauthUri = totp.toString()

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
      width: 256,
      margin: 2,
      color: { dark: '#1a2332', light: '#ffffff' },
    })

    // Temporarily store the secret on the user record (not enabled yet)
    // mfaEnabled stays false until the user verifies a code
    await db.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret.base32 },
    })

    return NextResponse.json({
      otpauthUri,
      qrDataUrl,
      secretBase32: secret.base32,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('MFA setup error:', message)
    return NextResponse.json({ error: 'Erreur lors de la génération du secret MFA' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
