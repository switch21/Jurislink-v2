import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (roleId) {
      // Return a specific role's permissions
      const rolePermissions = await db.rolePermission.findMany({
        where: { roleId },
        include: { permission: true },
      })

      const permissions = rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        allowed: rp.allowed,
      }))

      return NextResponse.json({ roleId, permissions })
    }

    // Full permission matrix
    const [roles, permissions, allRolePermissions] = await Promise.all([
      db.role.findMany({ orderBy: { level: 'desc' } }),
      db.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] }),
      db.rolePermission.findMany(),
    ])

    // Build matrix: { [roleId]: { [permissionId]: boolean } }
    const matrix: Record<string, Record<string, boolean>> = {}

    for (const role of roles) {
      matrix[role.id] = {}
      for (const perm of permissions) {
        matrix[role.id][perm.id] = false
      }
    }

    for (const rp of allRolePermissions) {
      if (matrix[rp.roleId]) {
        matrix[rp.roleId][rp.permissionId] = rp.allowed
      }
    }

    return NextResponse.json({ roles, permissions, matrix })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la récupération des permissions:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des permissions' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const { roleId, permissions } = body

    if (!roleId || !permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'Le roleId et les permissions sont requis' },
        { status: 400 }
      )
    }

    const role = await db.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 })
    }

    // Upsert each permission entry
    const entries = Object.entries(permissions) as [string, boolean][]

    await db.$transaction(
      entries.map(([permissionId, allowed]) =>
        db.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId },
          },
          create: { roleId, permissionId, allowed },
          update: { allowed },
        })
      )
    )

    return NextResponse.json({ success: true, updated: entries.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la mise à jour des permissions:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des permissions' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
