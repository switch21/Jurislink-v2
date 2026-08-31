import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRoute, TEST_IDS, createMockDb } from '../api-helpers'
import { NextResponse } from 'next/server'

// ── Mock auth-server ──
let mockRootAdminResult: any = null
vi.mock('@/lib/auth-server', () => ({
  requireRootAdmin: vi.fn().mockImplementation(async () => mockRootAdminResult),
  isErrorResponse: vi.fn().mockImplementation((r: any) => r instanceof NextResponse),
}))

// ── Mock db ──
let mockDb: any
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

import { GET } from '@/app/api/admin/dashboard/route'
import { requireRootAdmin, isErrorResponse } from '@/lib/auth-server'

const mockRequireRoot = vi.mocked(requireRootAdmin)
const mockIsError = vi.mocked(isErrorResponse)

const rootAdminUser = {
  id: TEST_IDS.rootAdmin,
  email: 'root@jurislink.com',
  fullName: 'Root Admin',
  role: 'root_admin',
  roleId: null,
  tenantId: null,
  isActive: true,
}

const regularUser = {
  id: TEST_IDS.regularUser,
  email: 'lawyer@test.com',
  fullName: 'Test Lawyer',
  role: 'avocat',
  roleId: TEST_IDS.roleId,
  tenantId: TEST_IDS.tenantId,
  isActive: true,
}

function buildAdminMockDb() {
  return createMockDb({
    tenant: {
      count: vi.fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8),
      groupBy: vi.fn().mockResolvedValue([
        { plan: 'starter', _count: { id: 5 } },
        { plan: 'pro', _count: { id: 3 } },
      ]),
      findMany: vi.fn().mockResolvedValue([
        {
          id: TEST_IDS.tenantId,
          name: 'Test Firm',
          createdAt: '2025-01-01',
          _count: { users: 4, cases: 10 },
          subscription: { plan: { name: 'Pro', price: 49 } },
        },
      ]),
    },
    user: {
      count: vi.fn()
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20),
      findMany: vi.fn().mockResolvedValue([
        { roleObj: { name: 'avocat', label: 'Avocat' } },
        { roleObj: { name: 'avocat', label: 'Avocat' } },
        { roleObj: { name: 'assistant', label: 'Assistant' } },
      ]),
    },
    case: {
      count: vi.fn()
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30),
    },
    client: { count: vi.fn().mockResolvedValue(40) },
    invoice: { count: vi.fn().mockResolvedValue(60) },
    payment: {
      count: vi.fn().mockResolvedValue(30),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 100000 } }),
    },
    subscriptionPlan: { findMany: vi.fn().mockResolvedValue([]) },
    $queryRaw: vi.fn().mockResolvedValue([
      { month: '2025-01', count: BigInt(3) },
      { month: '2025-02', count: BigInt(2) },
    ]),
  })
}

describe('GET /api/admin/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = buildAdminMockDb()
    mockRootAdminResult = null
    mockIsError.mockImplementation((r: any) => r instanceof NextResponse)
  })

  it('returns 401 without auth', async () => {
    const err401 = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockRootAdminResult = err401
    mockRequireRoot.mockResolvedValue(err401)
    mockIsError.mockReturnValue(true)

    const res = await callRoute(GET)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-root-admin', async () => {
    const err403 = NextResponse.json({ error: "Accès réservé à l'administrateur" }, { status: 403 })
    mockRootAdminResult = err403
    mockRequireRoot.mockResolvedValue(err403)
    mockIsError.mockReturnValue(true)

    const res = await callRoute(GET)
    expect(res.status).toBe(403)
  })

  it('returns all stats for root admin', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET)
    expect(res.status).toBe(200)
    expect(res.body.totalTenants).toBe(10)
    expect(res.body.activeTenants).toBe(8)
    expect(res.body.inactiveTenants).toBe(2)
    expect(res.body.totalUsers).toBe(25)
    expect(res.body.activeUsers).toBe(20)
    expect(res.body.totalCases).toBe(50)
    expect(res.body.activeCases).toBe(30)
    expect(res.body.totalClients).toBe(40)
    expect(res.body.totalInvoices).toBe(60)
  })

  it('response includes tenants, users, cases, revenue data', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET)
    expect(res.body).toHaveProperty('totalTenants')
    expect(res.body).toHaveProperty('totalUsers')
    expect(res.body).toHaveProperty('totalCases')
    expect(res.body).toHaveProperty('totalRevenue')
    expect(res.body).toHaveProperty('thisMonthRevenue')
    expect(res.body).toHaveProperty('tenantsByPlan')
    expect(res.body).toHaveProperty('usersByRole')
    expect(res.body).toHaveProperty('recentTenants')
  })

  it('signupsByMonth is properly formatted', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET)
    expect(res.status).toBe(200)
    expect(res.body.signupsByMonth).toEqual({
      '2025-01': 3,
      '2025-02': 2,
    })
  })

  it('returns 500 on database error', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)
    mockDb.tenant.count.mockReset().mockRejectedValue(new Error('DB error'))

    const res = await callRoute(GET)
    expect(res.status).toBe(500)
  })
})
