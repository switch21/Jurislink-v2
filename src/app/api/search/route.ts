import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const q = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '5', 10)

    if (!tenantId || !q) {
      return NextResponse.json(
        { error: 'tenantId and q are required' },
        { status: 400 }
      )
    }

    const searchFilter = {
      contains: q,
      mode: 'insensitive' as const,
    }

    const tenantWhere = { tenantId }

    // Search across all models in parallel
    const [cases, clients, invoices, tasks, documents, events] =
      await Promise.all([
        // Cases: title, reference, description, adversary
        db.case.findMany({
          where: {
            ...tenantWhere,
            OR: [
              { title: searchFilter },
              { reference: searchFilter },
              { description: searchFilter },
              { adversary: searchFilter },
            ],
          },
          select: {
            id: true,
            title: true,
            reference: true,
            status: true,
            caseType: true,
            description: true,
          },
          take: limit,
        }).then((results) =>
          results.map((c) => ({ ...c, _type: 'case' as const }))
        ),

        // Clients: fullName, company, email, phone, niu
        db.client.findMany({
          where: {
            ...tenantWhere,
            OR: [
              { fullName: searchFilter },
              { company: searchFilter },
              { email: searchFilter },
              { phone: searchFilter },
              { niu: searchFilter },
            ],
          },
          select: {
            id: true,
            fullName: true,
            company: true,
            email: true,
            phone: true,
            status: true,
          },
          take: limit,
        }).then((results) =>
          results.map((c) => ({ ...c, _type: 'client' as const }))
        ),

        // Invoices: by client name (include client relation)
        db.invoice.findMany({
          where: {
            ...tenantWhere,
            client: {
              fullName: searchFilter,
            },
          },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            currency: { select: { code: true, symbol: true } },
            client: { select: { fullName: true } },
          },
          take: limit,
        }).then((results) =>
          results.map((inv) => ({
            id: inv.id,
            amount: inv.amount,
            status: inv.status,
            createdAt: inv.createdAt,
            currencyCode: inv.currency?.code ?? 'XAF',
            currencySymbol: inv.currency?.symbol ?? 'FCFA',
            clientName: inv.client?.fullName ?? '',
            _type: 'invoice' as const,
          }))
        ),

        // Tasks: title, description
        db.task.findMany({
          where: {
            ...tenantWhere,
            OR: [
              { title: searchFilter },
              { description: searchFilter },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            caseId: true,
          },
          take: limit,
        }).then((results) =>
          results.map((t) => ({ ...t, _type: 'task' as const }))
        ),

        // Documents: fileName, tags
        db.document.findMany({
          where: {
            ...tenantWhere,
            OR: [
              { fileName: searchFilter },
              { tags: searchFilter },
            ],
          },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            folder: true,
            documentType: true,
            mimeType: true,
            createdAt: true,
          },
          take: limit,
        }).then((results) =>
          results.map((d) => ({ ...d, _type: 'document' as const }))
        ),

        // Events: title, description
        db.event.findMany({
          where: {
            ...tenantWhere,
            OR: [
              { title: searchFilter },
              { description: searchFilter },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            eventType: true,
            criticality: true,
            startTime: true,
            endTime: true,
          },
          take: limit,
        }).then((results) =>
          results.map((e) => ({ ...e, _type: 'event' as const }))
        ),
      ])

    return NextResponse.json({
      results: {
        cases,
        clients,
        invoices,
        tasks,
        documents,
        events,
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
