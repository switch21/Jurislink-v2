import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const type = searchParams.get('type')
    const caseId = searchParams.get('caseId')
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const where: Prisma.CommunicationWhereInput = { tenantId }
    if (type) where.type = type
    if (caseId) where.caseId = caseId
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const communications = await db.communication.findMany({
      where,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        client: { select: { id: true, fullName: true, email: true, phone: true } },
        sentBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json(communications)
  } catch (error) {
    console.error('List communications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const {
      tenantId, type, subject, content, caseId,
      clientId, recipientEmail, recipientPhone, sentById,
    } = body

    if (!tenantId || !content) {
      return NextResponse.json(
        { error: 'tenantId and content are required' },
        { status: 400 },
      )
    }

    // If clientId provided, fetch client email/phone as defaults
    let resolvedEmail = recipientEmail || null
    let resolvedPhone = recipientPhone || null
    if (clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: { email: true, phone: true, fullName: true },
      })
      if (client) {
        if (!resolvedEmail && client.email) resolvedEmail = client.email
        if (!resolvedPhone && client.phone) resolvedPhone = client.phone
      }
    }

    const communication = await db.communication.create({
      data: {
        type: type || 'email',
        subject: subject || null,
        content,
        status: 'sent',
        recipientEmail: resolvedEmail,
        recipientPhone: resolvedPhone,
        sentAt: new Date(),
        tenantId,
        caseId: caseId || null,
        clientId: clientId || null,
        sentById: sentById || null,
      },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        client: { select: { id: true, fullName: true, email: true, phone: true } },
        sentBy: { select: { id: true, fullName: true } },
      },
    })

    // Create notification for the communication
    const typeLabel = type === 'email' ? 'E-mail' : type === 'sms' ? 'SMS' : type === 'whatsapp' ? 'WhatsApp' : type
    await db.notification.create({
      data: {
        title: `${typeLabel} envoyé`,
        message: `Un ${typeLabel.toLowerCase()} a été envoyé${subject ? ` : ${subject}` : ''}.`,
        category: 'communication',
        resourceType: 'communication',
        resourceId: communication.id,
        tenantId,
        userId: sentById || null,
      },
    })

    return NextResponse.json(communication, { status: 201 })
  } catch (error) {
    console.error('Create communication error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
