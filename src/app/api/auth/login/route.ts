import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { compare } from 'bcryptjs'
import { createMfaChallenge } from '../mfa/challenge/route'

export async function POST(request: Request) {
  const db = getDb()
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe sont requis' }, { status: 400 })
    }

    const user = await db.user.findFirst({
      where: { email },
      include: { tenant: true, roleObj: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 401 })
    }

    if (user.tenant && !user.tenant.isActive) {
      return NextResponse.json({ error: 'Cabinet désactivé' }, { status: 401 })
    }

    // Verify password
    if (user.password) {
      const valid = await compare(password, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
      }
    }

    // Fetch user permissions via roleId -> role_permissions -> permission
    let permissions: Array<{ resource: string; action: string; allowed: boolean }> = []
    if (user.roleId) {
      const rolePerms = await db.rolePermission.findMany({
        where: { roleId: user.roleId },
        include: { permission: true },
      })
      permissions = rolePerms.map((rp) => ({
        resource: rp.permission.resource,
        action: rp.permission.action,
        allowed: rp.allowed,
      }))
    } else {
      // Fallback: grant all permissions for users without roleId (no RBAC setup)
      const allResources = ['case', 'client', 'task', 'document', 'event', 'invoice', 'message', 'report', 'notification', 'audit', 'time_entry', 'communication', 'document_template', 'subscription', 'role', 'user']
      const allActions = ['view', 'create', 'update', 'delete', 'manage']
      for (const resource of allResources) {
        for (const action of allActions) {
          permissions.push({ resource, action, allowed: true })
        }
      }
    }

    // Build user data (same as before, without password)
    const { password: _, mfaSecret: __, mfaEnabled, ...safeUser } = user
    const userData = { ...safeUser, permissions }

    // MFA check: if user has MFA enabled, challenge instead of returning user data
    if (mfaEnabled) {
      const mfaToken = createMfaChallenge(user.id, userData)
      return NextResponse.json({
        mfaRequired: true,
        userId: user.id,
        mfaToken,
      })
    }

    // No MFA — return user data directly (original flow)
    // Update last login + clear forceLogoutAt (non-critical)
    const loginAt = new Date().toISOString()
    try {
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), forceLogoutAt: null },
      })
    } catch {}

    return NextResponse.json({ ...userData, loginAt })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Login error:', message)
    return NextResponse.json({
      error: 'Erreur de base de données',
      detail: message,
    }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
