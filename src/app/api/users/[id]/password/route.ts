import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hash, compare } from 'bcryptjs'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const { currentPassword, newPassword, adminOverride } = body

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true, password: true } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (!adminOverride) {
      // Self-change: verify current password
      if (!currentPassword) {
        return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 })
      }
      if (!user.password) {
        return NextResponse.json({ error: 'Aucun mot de passe défini pour cet utilisateur' }, { status: 400 })
      }
      const valid = await compare(currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
      }
    }

    const hashedPw = await hash(newPassword, 12)
    await db.user.update({
      where: { id },
      data: { password: hashedPw },
      select: { id: true },
    })

    return NextResponse.json({ ok: true, message: 'Mot de passe mis à jour' })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
