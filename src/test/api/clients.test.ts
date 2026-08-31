import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRoute, TEST_IDS, createMockDb } from '../api-helpers'
import { NextResponse } from 'next/server'

// ── Mock auth-server ──
let mockAuthResult: any = null
vi.mock('@/lib/auth-server', () => ({
  authenticate: vi.fn().mockImplementation(async () => mockAuthResult),
}))

// ── Mock db ──
let mockDb: any
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

import { GET, POST } from '@/app/api/clients/route'
import { authenticate } from '@/lib/auth-server'

const mockAuthFn = vi.mocked(authenticate)

const authUser = {
  id: TEST_IDS.regularUser,
  email: 'lawyer@test.com',
  fullName: 'Test Lawyer',
  role: 'avocat',
  roleId: TEST_IDS.roleId,
  tenantId: TEST_IDS.tenantId,
  isActive: true,
}

const mockClient = {
  id: TEST_IDS.clientId,
  fullName: 'Jean Dupont',
  company: 'Dupont SARL',
  email: 'jean@dupont.com',
  phone: '+237 699',
  isActive: true,
  tenantId: TEST_IDS.tenantId,
  _count: { cases: 3 },
  createdAt: '2025-01-01',
}

describe('GET /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      client: {
        findMany: vi.fn().mockResolvedValue([mockClient]),
      },
    })
    mockAuthResult = null
  })

  it('returns clients list', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId } })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].fullName).toBe('Jean Dupont')
    expect(res.body[0]._count.cases).toBe(3)
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)

    const res = await callRoute(GET)
    expect(res.status).toBe(401)
  })

  it('search filter passes OR condition', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId, search: 'Dupont' } })
    expect(mockDb.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { fullName: { contains: 'Dupont' } },
            { company: { contains: 'Dupont' } },
            { email: { contains: 'Dupont' } },
          ],
        }),
      }),
    )
  })

  it('tenant isolation via tenantId filter', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: 'other-tenant-id' } })
    expect(mockDb.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'other-tenant-id' }),
      }),
    )
  })

  it('returns 500 on database error', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockDb.client.findMany.mockRejectedValue(new Error('DB error'))

    const res = await callRoute(GET)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      client: { create: vi.fn().mockResolvedValue(mockClient) },
    })
    mockAuthResult = null
  })

  it('creates a client', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(POST, {
      method: 'POST',
      body: { fullName: 'Jean Dupont', tenantId: TEST_IDS.tenantId },
    })

    expect(res.status).toBe(201)
    expect(mockDb.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fullName: 'Jean Dupont', tenantId: TEST_IDS.tenantId }),
      }),
    )
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)

    const res = await callRoute(POST, { method: 'POST', body: { fullName: 'x' } })
    expect(res.status).toBe(401)
  })
})
