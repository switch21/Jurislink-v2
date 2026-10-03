import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { auditAction } from '@/lib/auditLog'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'client', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const client = await db.client.findUnique({
      where: { id },
      include: {
        _count: { select: { cases: true, invoices: true } },
        tenant: true,
        cases: {
          select: { id: true, reference: true, title: true, status: true, caseType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        invoices: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            currency: { select: { code: true, symbol: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json(client)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'client', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const client = await db.client.update({
      where: { id },
      data: {
        fullName: body.fullName,
        company: body.company,
        clientType: body.clientType,
        niu: body.niu,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        country: body.country,
        notes: body.notes,
        riskLevel: body.riskLevel,
        source: body.source,
        status: body.status,
        isActive: body.isActive,
        responsibleLawyerId: body.responsibleLawyerId,
      },
    })

    await auditAction(request, auth, 'Client modifié', {
      resourceType: 'Client',
      resourceId: id,
      tenantId: client.tenantId,
      metadata: { nom: client.fullName },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'client', 'delete')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.client.findUnique({
      where: { id },
      select: { tenantId: true, fullName: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    await db.client.delete({ where: { id } })

    await auditAction(request, auth, 'Client supprimé', {
      resourceType: 'Client',
      resourceId: id,
      tenantId: existing.tenantId,
      metadata: { nom: existing.fullName },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
