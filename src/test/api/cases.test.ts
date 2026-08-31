import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRoute, TEST_IDS, createMockDb } from '../api-helpers'
import { NextResponse } from 'next/server'

// ── Mock auth-server ──
let mockAuthResult: any = null
vi.mock('@/lib/auth-server', () => ({
  authenticate: vi.fn().mockImplementation(async () => mockAuthResult),
}))

// ── Mock workflow-templates ──
vi.mock('@/lib/workflow-templates', () => ({
  getWorkflowTemplate: vi.fn().mockReturnValue(null),
}))

// ── Mock db ──
let mockDb: any
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

import { GET, POST } from '@/app/api/cases/route'
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

const mockCase = {
  id: TEST_IDS.caseId,
  reference: 'REF-001',
  title: 'Test Case',
  description: 'A test case',
  caseType: 'civil',
  status: 'nouveau',
  priority: 'haute',
  tenantId: TEST_IDS.tenantId,
  clientId: TEST_IDS.clientId,
  createdAt: '2025-01-01',
  client: { id: TEST_IDS.clientId, fullName: 'Jean Dupont' },
  assignments: [],
}

describe('GET /api/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      case: { findMany: vi.fn().mockResolvedValue([mockCase]) },
    })
    mockAuthResult = null
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)

    const res = await callRoute(GET)
    expect(res.status).toBe(401)
  })

  it('returns cases list', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId } })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('passes tenantId filter to query', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId } })
    expect(mockDb.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TEST_IDS.tenantId }),
      }),
    )
  })

  it('passes status filter to query', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId, status: 'ferme' } })
    expect(mockDb.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ferme' }),
      }),
    )
  })

  it('uses caseType filter (not type)', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId, caseType: 'penal' } })
    expect(mockDb.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ caseType: 'penal' }),
      }),
    )
  })

  it('searches by title', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId, search: 'DUPONT' } })
    expect(mockDb.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: 'DUPONT' } },
            { reference: { contains: 'DUPONT' } },
            { description: { contains: 'DUPONT' } },
          ],
        }),
      }),
    )
  })
})

describe('POST /api/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      case: { create: vi.fn().mockResolvedValue(mockCase) },
    })
    mockAuthResult = null
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)

    const res = await callRoute(POST, { method: 'POST', body: { title: 'Test' } })
    expect(res.status).toBe(401)
  })

  it('creates a case with required fields', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const newCase = { ...mockCase, id: 'new-case-id' }
    mockDb.case.create.mockResolvedValue(newCase)

    const res = await callRoute(POST, {
      method: 'POST',
      body: {
        reference: 'REF-002',
        title: 'New Case',
        description: 'Desc',
        caseType: 'civil',
        status: 'nouveau',
        priority: 'haute',
        tenantId: TEST_IDS.tenantId,
        clientId: TEST_IDS.clientId,
      },
    })

    expect(res.status).toBe(201)
    expect(mockDb.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'New Case',
          caseType: 'civil',
          tenantId: TEST_IDS.tenantId,
        }),
      }),
    )
  })

  it('returns 500 on database error', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockDb.case.create.mockRejectedValue(new Error('DB error'))

    const res = await callRoute(POST, { method: 'POST', body: { title: 'Test' } })
    expect(res.status).toBe(500)
  })
})
