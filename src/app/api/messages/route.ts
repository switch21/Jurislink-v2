import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'message', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')
    const contactId = searchParams.get('contactId')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId

    if (userId && contactId) {
      where.OR = [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId },
      ]
    } else if (userId) {
      where.OR = [
        { senderId: userId },
        { receiverId: userId },
      ]
    }

    const messages = await db.message.findMany({
      where,
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        receiver: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error('List messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'message', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const message = await db.message.create({
      data: {
        content: body.content,
        tenantId: body.tenantId,
        senderId: body.senderId,
        receiverId: body.receiverId,
      },
    })
    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
