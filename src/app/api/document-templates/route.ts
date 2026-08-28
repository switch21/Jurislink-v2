import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'document_template', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where: Prisma.DocumentTemplateWhereInput = { tenantId }
    if (category) where.category = category
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const templates = await db.documentTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('List document templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'document_template', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, name, category, description, content, variables } = body

    if (!tenantId || !name || !content) {
      return NextResponse.json(
        { error: 'tenantId, name, and content are required' },
        { status: 400 },
      )
    }

    const template = await db.documentTemplate.create({
      data: {
        name,
        category: category || 'general',
        description: description || null,
        content,
        variables: variables ? JSON.stringify(variables) : null,
        tenantId,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Create document template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request, 'document_template', 'delete')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { ids, tenantId } = body

    if (!tenantId || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'tenantId and ids array are required' },
        { status: 400 },
      )
    }

    const result = await db.documentTemplate.deleteMany({
      where: {
        id: { in: ids },
        tenantId,
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Bulk delete document templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
