import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// --- UUID regex tests (extracted from auth-server.ts source) ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('UUID regex validation', () => {
  it('accepts valid UUID v4', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('accepts valid UUID v1', () => {
    expect(UUID_RE.test('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
  })

  it('accepts uppercase UUID', () => {
    expect(UUID_RE.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('accepts mixed case UUID', () => {
    expect(UUID_RE.test('550e8400-E29b-41d4-a716-446655440000')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(UUID_RE.test('')).toBe(false)
  })

  it('rejects "null" string', () => {
    expect(UUID_RE.test('null')).toBe(false)
  })

  it('rejects UUID without dashes', () => {
    expect(UUID_RE.test('550e8400e29b41d4a716446655440000')).toBe(false)
  })

  it('rejects UUID with extra characters', () => {
    expect(UUID_RE.test('x550e8400-e29b-41d4-a716-446655440000')).toBe(false)
  })

  it('rejects too short UUID', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-4466554400')).toBe(false)
  })

  it('rejects too long UUID', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-44665544000000')).toBe(false)
  })

  it('rejects random string', () => {
    expect(UUID_RE.test('not-a-uuid-at-all')).toBe(false)
  })

  it('rejects numeric ID', () => {
    expect(UUID_RE.test('12345')).toBe(false)
  })

  it('rejects UUID with invalid hex characters', () => {
    expect(UUID_RE.test('550g8400-e29b-41d4-a716-446655440000')).toBe(false)
  })

  it('rejects UUID with wrong segment lengths', () => {
    expect(UUID_RE.test('550e84-e29b-41d4-a716-446655440000')).toBe(false)
  })

  it('accepts all-zeros UUID', () => {
    expect(UUID_RE.test('00000000-0000-0000-0000-000000000000')).toBe(true)
  })

  it('accepts all-f UUID', () => {
    expect(UUID_RE.test('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true)
  })
})

// --- Mock DB and RBAC for auth-server imports ---
const mockFindUnique = vi.fn()
const mockDisconnect = vi.fn().mockResolvedValue(undefined)
const mockDb = {
  user: { findUnique: mockFindUnique },
  $disconnect: mockDisconnect,
}

vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}))

vi.mock('@/lib/rbac', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import { requireTenantAccess, isErrorResponse } from '@/lib/auth-server'

describe('requireTenantAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const rootAdmin = { id: '1', email: 'a@b.com', fullName: 'Root', role: 'root_admin', roleId: null, tenantId: null, isActive: true }
  const lawyer = { id: '2', email: 'l@b.com', fullName: 'Lawyer', role: 'lawyer', roleId: 'r1', tenantId: 't1', isActive: true }

  it('root_admin bypasses tenant check', () => {
    expect(requireTenantAccess(rootAdmin, 't-other')).toBe(true)
  })

  it('returns true when resourceTenantId is null', () => {
    expect(requireTenantAccess(lawyer, null)).toBe(true)
  })

  it('returns true when resourceTenantId is undefined', () => {
    expect(requireTenantAccess(lawyer, undefined)).toBe(true)
  })

  it('returns true when tenantId matches', () => {
    expect(requireTenantAccess(lawyer, 't1')).toBe(true)
  })

  it('returns false when tenantId does not match', () => {
    expect(requireTenantAccess(lawyer, 't-other')).toBe(false)
  })
})

describe('isErrorResponse', () => {
  it('returns true for NextResponse instance', () => {
    const resp = NextResponse.json({ error: 'test' }, { status: 403 })
    expect(isErrorResponse(resp)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isErrorResponse(null)).toBe(false)
  })

  it('returns false for plain object', () => {
    expect(isErrorResponse({})).toBe(false)
  })

  it('returns false for string', () => {
    expect(isErrorResponse('error')).toBe(false)
  })

  it('returns false for number', () => {
    expect(isErrorResponse(42)).toBe(false)
  })
})
