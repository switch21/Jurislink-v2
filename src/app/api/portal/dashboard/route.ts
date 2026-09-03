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
    if (!portalAccount) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const clientId = portalAccount.clientId
    const tenantId = auth.tenantId
    const now = new Date()

    const [activeCasesCount, casesByStatusRaw, totalInvoicesResult, totalPaidResult, overdueInvoicesCount, recentCases, recentInvoices, recentCommunications] = await Promise.all([
      db.case.count({
        where: { clientId, tenantId, status: { in: ['nouveau', 'ouvert', 'en_cours', 'en_attente'] } },
      }),

      db.case.groupBy({
        by: ['status'],
        where: { clientId, tenantId },
        _count: { status: true },
      }),

      db.invoice.aggregate({
        where: { clientId, tenantId },
        _sum: { amount: true },
      }),

      db.invoice.aggregate({
        where: { clientId, tenantId, status: { in: ['paye', 'partiel'] } },
        _sum: { paidAmount: true },
      }),

      db.invoice.count({
        where: { clientId, tenantId, dueDate: { lt: now }, status: { in: ['non_paye', 'partiel'] } },
      }),

      db.case.findMany({
        where: { clientId, tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, reference: true, title: true, status: true, caseType: true, updatedAt: true },
      }),

      db.invoice.findMany({
        where: { clientId, tenantId },
        orderBy: { issuedAt: 'desc' },
        take: 3,
        include: {
          currency: { select: { code: true, symbol: true } },
          case: { select: { reference: true } },
        },
      }),

      db.communication.findMany({
        where: { clientId, tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          sentBy: { select: { id: true, fullName: true } },
          case: { select: { id: true, reference: true, title: true } },
        },
      }),
    ])

    const totalInvoices = totalInvoicesResult._sum.amount ?? 0
    const totalPaid = totalPaidResult._sum.paidAmount ?? 0
    const totalRemaining = totalInvoices - totalPaid

    const casesByStatus: Record<string, number> = {}
    for (const item of casesByStatusRaw) {
      casesByStatus[item.status] = item._count.status
    }

    return NextResponse.json({
      activeCasesCount,
      casesByStatus,
      totalInvoices,
      totalPaid,
      totalRemaining,
      overdueInvoicesCount,
      recentCases,
      recentInvoices,
      recentCommunications,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Portal dashboard error:', message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
