import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callRoute, TEST_IDS } from '../api-helpers'

// Use vi.hoisted to create mocks available to hoisted vi.mock factories
const { mockFindFirst, mockUpdate, mockFindManyRP, mockDisconnect, mockCompare } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn().mockResolvedValue({}),
  mockFindManyRP: vi.fn().mockResolvedValue([]),
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockCompare: vi.fn().mockResolvedValue(false as any),
}))

const mockDb = {
  user: { findFirst: mockFindFirst, update: mockUpdate },
  rolePermission: { findMany: mockFindManyRP },
  $disconnect: mockDisconnect,
}

vi.mock('@/lib/db', () => ({ getDb: () => mockDb }))
vi.mock('bcryptjs', () => ({ compare: mockCompare }))

const mockUser = {
  id: TEST_IDS.regularUser,
  email: 'lawyer@test.com',
  fullName: 'Test Lawyer',
  password: '$2a$10$hashedpassword',
  role: 'lawyer',
  roleId: TEST_IDS.roleId,
  tenantId: TEST_IDS.tenantId,
  isActive: true,
  lastLoginAt: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  tenant: { id: TEST_IDS.tenantId, name: 'Test Firm', isActive: true },
  roleObj: { id: TEST_IDS.roleId, name: 'avocat', label: 'Avocat' },
}

const mockRootAdmin = {
  ...mockUser,
  id: TEST_IDS.rootAdmin,
  email: 'root@jurislink.com',
  fullName: 'Root Admin',
  role: 'root_admin',
  roleId: null,
  tenantId: null,
  tenant: null,
  roleObj: null,
}

import { POST } from '@/app/api/auth/login/route'

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompare.mockResolvedValue(false as any)
    mockFindFirst.mockResolvedValue(null)
    mockFindManyRP.mockResolvedValue([])
    mockUpdate.mockResolvedValue({})
  })

  it('returns user + permissions for valid email/password', async () => {
    mockFindFirst.mockResolvedValue(mockUser)
    mockCompare.mockResolvedValue(true as any)
    mockFindManyRP.mockResolvedValue([
      { permission: { resource: 'case', action: 'view', allowed: true } },
    ])

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'lawyer@test.com', password: 'correct-pass' },
    })

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('lawyer@test.com')
    expect(res.body.fullName).toBe('Test Lawyer')
    expect(res.body.password).toBeUndefined()
    expect(res.body.permissions).toHaveLength(1)
    expect(res.body.permissions[0].resource).toBe('case')
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { email: 'lawyer@test.com' },
      include: { tenant: true, roleObj: true },
    })
  })

  it('returns 401 for wrong password', async () => {
    mockFindFirst.mockResolvedValue(mockUser)
    mockCompare.mockResolvedValue(false as any)

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'lawyer@test.com', password: 'wrong-pass' },
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Mot de passe incorrect')
  })

  it('returns 401 for non-existent email', async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'nobody@test.com', password: 'whatever' },
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Identifiants incorrects')
  })

  it('returns 400 for missing email', async () => {
    const res = await callRoute(POST, {
      method: 'POST',
      body: { password: 'some-pass' },
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('requis')
  })

  it('returns 400 for missing password', async () => {
    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'test@test.com' },
    })

    expect(res.status).toBe(400)
  })

  it('returns 401 for inactive user', async () => {
    mockFindFirst.mockResolvedValue({ ...mockUser, isActive: false })

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'lawyer@test.com', password: 'pass' },
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Compte désactivé')
  })

  it('returns 401 when tenant is inactive', async () => {
    mockFindFirst.mockResolvedValue({
      ...mockUser,
      tenant: { id: TEST_IDS.tenantId, name: 'Test Firm', isActive: false },
    })

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'lawyer@test.com', password: 'pass' },
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Cabinet désactivé')
  })

  it('normalizes role from roleObj.name for root admin', async () => {
    mockFindFirst.mockResolvedValue(mockRootAdmin)
    mockCompare.mockResolvedValue(true as any)
    mockFindManyRP.mockResolvedValue([])

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'root@jurislink.com', password: 'admin-pass' },
    })

    expect(res.status).toBe(200)
    expect(res.body.roleId).toBeNull()
    expect(res.body.tenantId).toBeNull()
  })

  it('grants all fallback permissions when roleId is null', async () => {
    mockFindFirst.mockResolvedValue(mockRootAdmin)
    mockCompare.mockResolvedValue(true as any)
    mockFindManyRP.mockResolvedValue([])

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'root@jurislink.com', password: 'pass' },
    })

    expect(res.status).toBe(200)
    const resources = new Set(res.body.permissions.map((p: any) => p.resource))
    expect(resources.size).toBeGreaterThan(5)
    expect(res.body.permissions.every((p: any) => p.allowed === true)).toBe(true)
  })

  it('returns 500 on database error', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB down'))

    const res = await callRoute(POST, {
      method: 'POST',
      body: { email: 'test@test.com', password: 'pass' },
    })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Erreur de base de données')
  })
})
