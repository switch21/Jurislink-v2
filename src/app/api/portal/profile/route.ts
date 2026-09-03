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
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const client = await db.client.findUnique({
      where: { id: portalAccount.clientId },
      include: { tenant: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Fetch responsible lawyer separately (no direct relation defined)
    let responsibleLawyer: { id: string; fullName: string; email: string; phone: string | null; avatarUrl: string | null } | null = null
    if (client.responsibleLawyerId) {
      responsibleLawyer = await db.user.findUnique({
        where: { id: client.responsibleLawyerId },
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
      })
    }

    return NextResponse.json({ ...client, responsibleLawyer })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal profile error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(request: Request) {
  const auth = await authenticatePortal(request)
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const portalAccount = await db.clientPortal.findUnique({
      where: { id: auth.portalUserId },
    })
    if (!portalAccount || !portalAccount.isActive) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, address, city, country } = body

    const updateData: Record<string, string | null> = {}
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country

    const updatedClient = await db.client.update({
      where: { id: portalAccount.clientId },
      data: updateData,
    })

    return NextResponse.json(updatedClient)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal profile update error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}