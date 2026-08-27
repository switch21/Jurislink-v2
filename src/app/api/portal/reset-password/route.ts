import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hash, compare } from 'bcryptjs'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateToken(length: number = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// POST /api/portal/reset-password — Request reset
// Body: { email }
export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const { token, newPassword } = body

    // If token + newPassword are provided, this is a reset confirmation
    if (token && newPassword) {
      return handleResetConfirmation(db, token, newPassword)
    }

    // Otherwise, this is a reset request
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const portalAccount = await db.clientPortal.findUnique({
      where: { email },
    })

    if (!portalAccount) {
      // Don't reveal if account exists
      return NextResponse.json({ message: 'Si un compte existe avec cet email, un email de réinitialisation sera envoyé' })
    }

    const resetToken = generateToken(8)
    const hashedToken = await hash(resetToken, 10)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.clientPortal.update({
      where: { id: portalAccount.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    })

    // In production, send email with resetToken
    // For now, just return success
    return NextResponse.json({ message: 'Si un compte existe avec cet email, un email de réinitialisation sera envoyé' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal reset password error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

async function handleResetConfirmation(db: ReturnType<typeof getDb>, token: string, newPassword: string) {
  // Find portal account with a reset token
  const portalAccounts = await db.clientPortal.findMany({
    where: {
      resetToken: { not: null },
      resetTokenExpiry: { gt: new Date() },
    },
  })

  let matchedAccount: typeof portalAccounts[0] | null = null
  for (const account of portalAccounts) {
    const isValid = await compare(token, account.resetToken!)
    if (isValid) {
      matchedAccount = account
      break
    }
  }

  if (!matchedAccount) {
    return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 })
  }

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 })
  }

  const hashedPassword = await hash(newPassword, 10)

  await db.clientPortal.update({
    where: { id: matchedAccount.id },
    data: {
      passwordHash: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return NextResponse.json({ message: 'Mot de passe mis à jour avec succès' })
}
