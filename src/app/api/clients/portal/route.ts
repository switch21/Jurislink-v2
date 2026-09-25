import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hash } from 'bcryptjs'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

/** GET /api/clients/portal?tenantId=... — list all client portal accounts for a tenant */
export async function GET(request: Request) {
  const auth = await authenticate(request, 'client', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId

    const portals = await db.clientPortal.findMany({
      where,
      include: {
        client: { select: { id: true, fullName: true, company: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(portals)
  } catch (error) {
    console.error('List client portals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/** POST /api/clients/portal — create a portal account for a client
 * Body: { clientId, tenantId, email?, password? }
 * If email not provided, uses the client's email.
 * If password not provided, generates a random one.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request, 'client', 'manage')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { clientId, tenantId } = body
    if (!clientId || !tenantId) {
      return NextResponse.json({ error: 'clientId et tenantId sont requis' }, { status: 400 })
    }

    // Check client exists
    const client = await db.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    // Check if portal already exists
    const existing = await db.clientPortal.findFirst({ where: { clientId } })
    if (existing) {
      return NextResponse.json({ error: 'Ce client a déjà un compte portail' }, { status: 409 })
    }

    // Generate password if not provided
    const portalEmail = body.email || client.email
    if (!portalEmail) {
      return NextResponse.json({ error: 'Email requis (aucun email sur le client)' }, { status: 400 })
    }

    const rawPassword = body.password || generateRandomPassword()
    const passwordHash = await hash(rawPassword, 10)

    const portal = await db.clientPortal.create({
      data: {
        email: portalEmail,
        passwordHash,
        isActive: true,
        clientId,
        tenantId,
      },
      include: {
        client: { select: { id: true, fullName: true, company: true, email: true } },
      },
    })

    return NextResponse.json({ ...portal, generatedPassword: rawPassword }, { status: 201 })
  } catch (error) {
    console.error('Create client portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/** DELETE /api/clients/portal?clientId=... — revoke portal access for a client */
export async function DELETE(request: Request) {
  const auth = await authenticate(request, 'client', 'manage')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'clientId est requis' }, { status: 400 })
    }

    const portal = await db.clientPortal.findFirst({ where: { clientId } })
    if (!portal) {
      return NextResponse.json({ error: 'Aucun compte portail pour ce client' }, { status: 404 })
    }

    await db.clientPortal.delete({ where: { id: portal.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete client portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/** PATCH /api/clients/portal — reset portal password or toggle active status
 * Body: { clientId, password? (reset), isActive? (toggle) }
 */
export async function PATCH(request: Request) {
  const auth = await authenticate(request, 'client', 'manage')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { clientId } = body
    if (!clientId) {
      return NextResponse.json({ error: 'clientId est requis' }, { status: 400 })
    }

    const portal = await db.clientPortal.findFirst({ where: { clientId } })
    if (!portal) {
      return NextResponse.json({ error: 'Aucun compte portail pour ce client' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.isActive !== undefined) data.isActive = body.isActive

    if (body.resetPassword) {
      const rawPassword = generateRandomPassword()
      data.passwordHash = await hash(rawPassword, 10)
      await db.clientPortal.update({ where: { id: portal.id }, data })
      return NextResponse.json({ success: true, generatedPassword: rawPassword })
    }

    await db.clientPortal.update({ where: { id: portal.id }, data })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update client portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

function generateRandomPassword(length = 12): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@'
  let pw = ''
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)]
  }
  return pw
}
