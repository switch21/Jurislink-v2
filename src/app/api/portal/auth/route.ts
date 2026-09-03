import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticatePortal } from '@/lib/portal-auth-server'

export async function GET(request: Request) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const portalAccount = await db.clientPortal.findUnique({
      where: { id: auth.portalUserId },
      include: {
        client: {
          include: { tenant: true },
        },
      },
    })

    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const client = portalAccount.client
    const tenant = client.tenant

    return NextResponse.json({
      id: portalAccount.id,
      email: portalAccount.email,
      clientId: portalAccount.clientId,
      tenantId: portalAccount.tenantId,
      client: {
        id: client.id,
        fullName: client.fullName,
        company: client.company,
        phone: client.phone,
        email: client.email,
        address: client.address,
        city: client.city,
        country: client.country,
        niu: client.niu,
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
    console.error('Portal auth error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
