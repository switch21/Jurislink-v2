import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PUT /api/currencies/:id
 * Updates a tenant-scoped currency. Global currencies (tenantId=null) cannot be edited.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const db = getDb()
  try {
    const existing = await db.currency.findUnique({ where: { id }, select: { tenantId: true } })
    if (!existing) return NextResponse.json({ error: 'Devise introuvable' }, { status: 404 })
    if (!existing.tenantId) return NextResponse.json({ error: 'Les devises système ne sont pas modifiables' }, { status: 403 })
    if (existing.tenantId !== auth.tenantId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const data: Record<string, string> = {}
    if (body.name) data.name = body.name.trim()
    if (body.symbol) data.symbol = body.symbol.trim()

    const updated = await db.currency.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update currency error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

/**
 * DELETE /api/currencies/:id
 * Deletes a tenant-scoped currency. Global currencies cannot be deleted.
 * Checks if any invoice references this currency before deleting.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const db = getDb()
  try {
    const existing = await db.currency.findUnique({
      where: { id },
      select: { tenantId: true, _count: { select: { invoices: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Devise introuvable' }, { status: 404 })
    if (!existing.tenantId) return NextResponse.json({ error: 'Les devises système ne sont pas supprimables' }, { status: 403 })
    if (existing.tenantId !== auth.tenantId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    if (existing._count.invoices > 0) return NextResponse.json({ error: 'Cette devise est utilisée par des factures et ne peut pas être supprimée' }, { status: 409 })

    await db.currency.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete currency error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
