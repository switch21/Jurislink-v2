import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRoute, TEST_IDS, createMockDb } from '../api-helpers'
import { NextResponse } from 'next/server'

// ── Mock auth-server ──
let mockAuthResult: any = null
vi.mock('@/lib/auth-server', () => ({
  authenticate: vi.fn().mockImplementation(async () => mockAuthResult),
  isErrorResponse: vi.fn().mockImplementation((r: any) => r instanceof NextResponse),
}))

// ── Mock db ──
let mockDb: any
vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

import { GET, POST } from '@/app/api/users/route'
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

const rootAdminUser = {
  id: TEST_IDS.rootAdmin,
  email: 'root@jurislink.com',
  fullName: 'Root Admin',
  role: 'root_admin',
  roleId: null,
  tenantId: null,
  isActive: true,
}

const mockUserList = [
  {
    id: TEST_IDS.regularUser,
    email: 'lawyer@test.com',
    fullName: 'Marie Curie',
    role: 'lawyer',
    avatarUrl: null,
    phone: '+237 123',
    preferredLanguage: 'fr',
    isActive: true,
    lastLoginAt: '2025-01-10',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-10',
    tenantId: TEST_IDS.tenantId,
    tenant: { id: TEST_IDS.tenantId, name: 'Test Firm', slug: 'test-firm', plan: 'pro' },
    roleObj: { id: TEST_IDS.roleId, name: 'avocat', label: 'Avocat' },
  },
]

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      user: {
        findMany: vi.fn().mockResolvedValue(mockUserList),
        count: vi.fn().mockResolvedValue(1),
      },
    })
    mockAuthResult = null
  })

  it('returns users filtered by tenant', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(GET)
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TEST_IDS.tenantId }),
      }),
    )
  })

  it('normalizes role from roleObj', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(GET)
    expect(res.status).toBe(200)
    // The 'role' column defaults to 'lawyer', but roleObj.name is 'avocat'
    expect(res.body.users[0].role).toBe('avocat')
  })

  it('includeRootAdmin parameter exposes root admin users', async () => {
    mockAuthResult = rootAdminUser
    mockAuthFn.mockResolvedValue(rootAdminUser)

    await callRoute(GET, { searchParams: { includeRootAdmin: 'true' } })
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    )
  })

  it('search by name/email passes OR filter', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { search: 'Marie' } })
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { fullName: { contains: 'Marie', mode: 'insensitive' } },
            { email: { contains: 'Marie', mode: 'insensitive' } },
          ],
        }),
      }),
    )
  })

  it('role filtering uses roleObj.name not role column', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { role: 'assistant' } })
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roleObj: { name: 'assistant' },
        }),
      }),
    )
  })

  it('returns 500 on database error', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockDb.user.findMany.mockRejectedValue(new Error('DB error'))

    const res = await callRoute(GET)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      user: { create: vi.fn().mockResolvedValue({ id: 'new-id', email: 'new@test.com', fullName: 'New' }) },
    })
    mockAuthResult = null
  })

  it('creates a user', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'new@test.com', fullName: 'New User', tenantId: TEST_IDS.tenantId },
    })

    expect(res.status).toBe(201)
    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'new@test.com', fullName: 'New User' }),
      }),
    )
  })
})
