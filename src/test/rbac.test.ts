import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module before importing rbac
const mockFindFirst = vi.fn()
const mockCount = vi.fn()
const mockDisconnect = vi.fn().mockResolvedValue(undefined)
const mockDb = {
  rolePermission: {
    findFirst: mockFindFirst,
    count: mockCount,
    findMany: vi.fn(),
  },
  $disconnect: mockDisconnect,
}

vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

// Import after mock is set up
import { hasPermission, clearPermissionCache, requirePermission, getUserPermissions } from '@/lib/rbac'

beforeEach(() => {
  vi.clearAllMocks()
  clearPermissionCache()
})

describe('hasPermission', () => {
  it('returns true when roleId is null (root_admin bypass)', async () => {
    expect(await hasPermission(null, 'case', 'create')).toBe(true)
    expect(await hasPermission(undefined, 'case', 'delete')).toBe(true)
    expect(await hasPermission('', 'anything', 'anything')).toBe(true)
  })

  it('returns true when role has 0 permissions (RBAC not seeded)', async () => {
    mockCount.mockResolvedValue(0)
    expect(await hasPermission('role-123', 'case', 'view')).toBe(true)
    expect(mockCount).toHaveBeenCalled()
    // findFirst should not be called when permCount is 0
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('returns true when permission is explicitly allowed', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue({ id: 'rp-1', roleId: 'role-1' })
    expect(await hasPermission('role-123', 'case', 'view')).toBe(true)
  })

  it('returns false when permission is not found for a base resource', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue(null)
    expect(await hasPermission('role-123', 'case', 'delete')).toBe(false)
  })

  it('allows non-base resources by default when permission not found', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue(null)
    // 'dashboard' is not a BASE_RESOURCE (it aliases to 'report', which IS base)
    // but 'workflow' aliases to 'case' which IS base, so let's use something truly new
    // Actually let's test the normalization: 'read' -> 'view', 'cases' -> 'case'
    // 'dashboard' normalizes to 'report' which IS base, so it should return false
    // Let's use a resource that normalizes to something NOT in BASE_RESOURCES
    // Actually all normalized resources end up as base resources. The only way
    // to get non-base is to pass something not in RESOURCE_ALIASES.
    // So if we pass an unknown resource, it stays as-is and is not in BASE_RESOURCES.
    mockFindFirst.mockResolvedValue(null)
    expect(await hasPermission('role-123', 'new_unknown_resource', 'view')).toBe(true)
  })

  it('returns true on DB error (safety fallback)', async () => {
    mockCount.mockRejectedValue(new Error('DB connection failed'))
    expect(await hasPermission('role-123', 'case', 'view')).toBe(true)
  })

  it('normalizes action aliases: read -> view, update -> edit', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue({ id: 'rp-1' })
    await hasPermission('role-123', 'case', 'read')
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          permission: expect.objectContaining({ action: 'view' }),
        }),
      }),
    )
  })

  it('normalizes resource aliases: cases -> case, clients -> client', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue({ id: 'rp-1' })
    await hasPermission('role-123', 'cases', 'view')
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          permission: expect.objectContaining({ resource: 'case' }),
        }),
      }),
    )
  })

  it('caches results for same roleId:resource:action', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue({ id: 'rp-1' })
    await hasPermission('role-1', 'case', 'view')
    await hasPermission('role-1', 'case', 'view')
    // findFirst should only be called once due to caching
    expect(mockFindFirst).toHaveBeenCalledTimes(1)
  })

  it('clearPermissionCache clears the cache', async () => {
    mockCount.mockResolvedValue(5)
    mockFindFirst.mockResolvedValue({ id: 'rp-1' })
    await hasPermission('role-1', 'case', 'view')
    clearPermissionCache()
    await hasPermission('role-1', 'case', 'view')
    expect(mockFindFirst).toHaveBeenCalledTimes(2)
  })
})

describe('requirePermission', () => {
  it('delegates to hasPermission', async () => {
    mockCount.mockResolvedValue(0)
    expect(await requirePermission('role-1', 'case', 'view')).toBe(true)
  })
})

describe('getUserPermissions', () => {
  it('returns wildcard set for null roleId (root_admin)', async () => {
    const perms = await getUserPermissions(null)
    expect(perms.has('*')).toBe(true)
  })

  it('returns permission set from DB', async () => {
    mockDb.rolePermission.findMany.mockResolvedValue([
      { permission: { resource: 'case', action: 'view' } },
      { permission: { resource: 'client', action: 'edit' } },
    ])
    const perms = await getUserPermissions('role-1')
    expect(perms.has('case:view')).toBe(true)
    expect(perms.has('client:edit')).toBe(true)
    expect(perms.has('invoice:view')).toBe(false)
  })
})
