import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const template = await db.documentTemplate.findUnique({ where: { id } })

    if (!template) {
      return NextResponse.json({ error: 'Document template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Get document template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.documentTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Document template not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, category, description, content, variables, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (category !== undefined) data.category = category
    if (description !== undefined) data.description = description || null
    if (content !== undefined) data.content = content
    if (variables !== undefined) data.variables = variables ? JSON.stringify(variables) : null
    if (isActive !== undefined) data.isActive = isActive

    const template = await db.documentTemplate.update({
      where: { id },
      data,
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Update document template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
