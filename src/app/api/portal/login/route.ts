import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { compare } from 'bcryptjs'
import { signPortalToken } from '@/lib/portal-jwt'

export async function POST(request: Request) {
  const db = getDb()
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe sont requis' }, { status: 400 })
    }

    const portalAccount = await db.clientPortal.findFirst({
      where: {
        OR: [
          { email },
          { client: { email } },
        ],
      },
      include: {
        client: {
          include: { tenant: true },
        },
      },
    })

    if (!portalAccount) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    if (!portalAccount.isActive) {
      return NextResponse.json({ error: 'Compte portail désactivé' }, { status: 401 })
    }

    if (portalAccount.client.tenant && !portalAccount.client.tenant.isActive) {
      return NextResponse.json({ error: 'Cabinet désactivé' }, { status: 401 })
    }

    const valid = await compare(password, portalAccount.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    // Generate JWT token
    const token = signPortalToken(portalAccount.id, portalAccount.tenantId)

    // Update lastLoginAt (non-critical)
    try {
      await db.clientPortal.update({
        where: { id: portalAccount.id },
        data: { lastLoginAt: new Date() },
      })
    } catch {}

    const tenant = portalAccount.client.tenant
    return NextResponse.json({
      id: portalAccount.id,
      email: portalAccount.email,
      clientId: portalAccount.clientId,
      token,
      client: {
        id: portalAccount.client.id,
        fullName: portalAccount.client.fullName,
        company: portalAccount.client.company,
        phone: portalAccount.client.phone,
        email: portalAccount.client.email,
        address: portalAccount.client.address,
        city: portalAccount.client.city,
        country: portalAccount.client.country,
        niu: portalAccount.client.niu,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        city: tenant.city,
        country: tenant.country,
        niu: tenant.niu,
        currencyCode: tenant.currencyCode,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal login error:', message)
    return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
