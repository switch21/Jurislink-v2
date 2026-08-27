import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const db = getDb()
  try {
    const portalUserId = request.headers.get('X-Portal-User-Id')

    if (!portalUserId || !UUID_REGEX.test(portalUserId)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const portalAccount = await db.clientPortal.findUnique({
      where: { id: portalUserId },
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
