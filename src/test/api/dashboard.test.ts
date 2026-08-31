import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRoute, TEST_IDS, createMockDb } from '../api-helpers'

// ── Mock auth-server: authenticate returns user or 401 ──
let mockAuthResult: any = null
vi.mock('@/lib/auth-server', () => ({
  authenticate: vi.fn().mockImplementation(async () => mockAuthResult),
  isErrorResponse: vi.fn().mockImplementation((r: any) => r?.constructor?.name === 'NextResponse' || (r && typeof r.status === 'number' && r.status !== 200)),
}))

// ── Mock db ──
let mockDb: any
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

import { GET } from '@/app/api/dashboard/route'
import { NextResponse } from 'next/server'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const mockAuthFn = vi.mocked(authenticate)
const mockIsError = vi.mocked(isErrorResponse)

const authUser = {
  id: TEST_IDS.regularUser,
  email: 'lawyer@test.com',
  fullName: 'Test Lawyer',
  role: 'avocat',
  roleId: TEST_IDS.roleId,
  tenantId: TEST_IDS.tenantId,
  isActive: true,
}

function buildMockDb() {
  const now = new Date()
  return createMockDb({
    case: {
      count: vi.fn().mockResolvedValue(5),
      groupBy: vi.fn().mockResolvedValue([
        { status: 'nouveau', _count: { status: 2 } },
        { status: 'ferme', _count: { status: 3 } },
      ]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    client: { count: vi.fn().mockResolvedValue(10) },
    invoice: {
      count: vi.fn().mockResolvedValue(3),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 5000 } }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    payment: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 2000 } }),
    },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    task: { findMany: vi.fn().mockResolvedValue([]) },
    event: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    document: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    caseAssignment: { findMany: vi.fn().mockResolvedValue([]) },
  })
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = buildMockDb()
    mockAuthResult = null
    // Default: isErrorResponse returns true for NextResponse objects
    mockIsError.mockImplementation((r: any) => r instanceof NextResponse)
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)
    mockIsError.mockReturnValue(true)

    const res = await callRoute(GET)
    expect(res.status).toBe(401)
  })

  it('returns 400 without tenantId', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET)
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('tenantId')
  })

  it('returns dashboard data with valid auth + tenantId', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET, {
      searchParams: { tenantId: TEST_IDS.tenantId },
    })

    expect(res.status).toBe(200)
  })

  it('response includes all expected fields', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET, {
      searchParams: { tenantId: TEST_IDS.tenantId },
    })

    expect(res.body).toHaveProperty('totalCases')
    expect(res.body).toHaveProperty('activeCases')
    expect(res.body).toHaveProperty('totalClients')
    expect(res.body).toHaveProperty('unpaidInvoices')
    expect(res.body).toHaveProperty('paidInvoices')
    expect(res.body).toHaveProperty('casesByStatus')
    expect(res.body).toHaveProperty('casesByType')
    expect(res.body).toHaveProperty('recentActivity')
    expect(res.body).toHaveProperty('overdueInvoices')
    expect(res.body).toHaveProperty('urgentTasks')
    expect(res.body).toHaveProperty('myTasks')
    expect(res.body).toHaveProperty('financial')
    expect(res.body).toHaveProperty('activityCounts')
    expect(res.body).toHaveProperty('pendingDocuments')
    expect(res.body).toHaveProperty('casesWithoutDeadlines')
  })

  it('handles null relations gracefully (overdue invoices without client)', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockIsError.mockReturnValue(false)

    mockDb.invoice.findMany = vi.fn().mockResolvedValue([
      { id: 'inv-1', amount: 1000, dueDate: '2025-01-01', status: 'non_paye', client: null, currency: { code: 'XAF' } },
    ])

    const res = await callRoute(GET, {
      searchParams: { tenantId: TEST_IDS.tenantId },
    })

    expect(res.status).toBe(200)
    expect(res.body.overdueInvoices[0].clientName).toBe('Inconnu')
  })

  it('handles events without assignments', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockIsError.mockReturnValue(false)

    mockDb.event.findMany = vi.fn().mockResolvedValue([
      { id: 'ev-1', title: 'Audience', startTime: new Date(), endTime: new Date(), eventType: 'audience', criticality: 'normal', case: { reference: 'REF-001' }, assignments: null },
    ])

    const res = await callRoute(GET, {
      searchParams: { tenantId: TEST_IDS.tenantId },
    })

    expect(res.status).toBe(200)
  })

  it('returns 500 on database error', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockIsError.mockReturnValue(false)
    mockDb.case.count = vi.fn().mockRejectedValue(new Error('DB error'))

    const res = await callRoute(GET, {
      searchParams: { tenantId: TEST_IDS.tenantId },
    })

    expect(res.status).toBe(500)
  })
})
