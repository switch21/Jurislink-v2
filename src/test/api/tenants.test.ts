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

import { GET, POST } from '@/app/api/tenants/route'
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

const mockTenant = {
  id: TEST_IDS.tenantId,
  name: 'Cabinet Mbeki',
  slug: 'cabinet-mbeki',
  isActive: true,
  createdAt: '2025-01-01',
  _count: { users: 4, clients: 10, cases: 15, invoices: 20, documents: 30 },
  subscription: { plan: { name: 'Pro' } },
}

describe('GET /api/tenants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      tenant: {
        findMany: vi.fn().mockResolvedValue([mockTenant]),
        count: vi.fn().mockResolvedValue(1),
      },
    })
    mockRootAdminResult = null
    mockIsError.mockImplementation((r: any) => r instanceof NextResponse)
  })

  it('returns 403 without root admin', async () => {
    const err403 = NextResponse.json({ error: "Accès réservé à l'administrateur" }, { status: 403 })
    mockRootAdminResult = err403
    mockRequireRoot.mockResolvedValue(err403)
    mockIsError.mockReturnValue(true)

    const res = await callRoute(GET)
    expect(res.status).toBe(403)
  })

  it('returns tenants with counts', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(GET)
    expect(res.status).toBe(200)
    expect(res.body.tenants).toHaveLength(1)
    expect(res.body.tenants[0]._count.users).toBe(4)
    expect(res.body.total).toBe(1)
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(50)
  })

  it('filters active only by default', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    await callRoute(GET)
    expect(mockDb.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      }),
    )
  })

  it('includeInactive parameter includes all tenants', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    await callRoute(GET, { searchParams: { includeInactive: 'true' } })
    expect(mockDb.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    )
  })

  it('returns 500 on database error', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)
    mockDb.tenant.findMany.mockRejectedValue(new Error('DB error'))

    const res = await callRoute(GET)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/tenants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      tenant: { create: vi.fn().mockResolvedValue(mockTenant) },
    })
    mockRootAdminResult = null
    mockIsError.mockImplementation((r: any) => r instanceof NextResponse)
  })

  it('creates a tenant', async () => {
    mockRootAdminResult = rootAdminUser
    mockRequireRoot.mockResolvedValue(rootAdminUser)
    mockIsError.mockReturnValue(false)

    const res = await callRoute(POST, {
      method: 'POST',
      body: { name: 'New Firm', slug: 'new-firm', plan: 'starter' },
    })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Cabinet Mbeki')
    expect(mockDb.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'New Firm', slug: 'new-firm' }),
      }),
    )
  })

  it('returns 403 without root admin', async () => {
    const err403 = NextResponse.json({ error: "Accès réservé à l'administrateur" }, { status: 403 })
    mockRootAdminResult = err403
    mockRequireRoot.mockResolvedValue(err403)
    mockIsError.mockReturnValue(true)

    const res = await callRoute(POST, { method: 'POST', body: { name: 'x' } })
    expect(res.status).toBe(403)
  })
})
