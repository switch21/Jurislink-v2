import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const plan = await db.subscriptionPlan.findUnique({
      where: { id },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    return NextResponse.json(plan)
  } catch (error) {
    console.error('Get plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        priceAnnual: body.priceAnnual,
        priceSemiAnnual: body.priceSemiAnnual,
        priceQuarterly: body.priceQuarterly,
        priceMonthly: body.priceMonthly,
        currencyCode: body.currencyCode,
        maxUsers: body.maxUsers,
        maxStorageGb: body.maxStorageGb,
        hasAI: body.hasAI,
        features: body.features ? JSON.stringify(body.features) : undefined,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      },
    })
    return NextResponse.json(plan)
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params

    // Check if any active subscriptions use this plan
    const activeSubsCount = await db.subscription.count({
      where: { planId: id },
    })
    if (activeSubsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscriptions' },
        { status: 409 }
      )
    }

    await db.subscriptionPlan.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
