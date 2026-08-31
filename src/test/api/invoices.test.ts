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

import { GET, POST } from '@/app/api/invoices/route'
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

const mockInvoice = {
  id: TEST_IDS.invoiceId,
  invoiceNumber: 'FAC-2025-001',
  type: 'facture',
  amount: 5000,
  paidAmount: 0,
  status: 'non_paye',
  dueDate: '2025-01-15',
  issuedAt: '2025-01-01',
  tenantId: TEST_IDS.tenantId,
  clientId: TEST_IDS.clientId,
  client: { id: TEST_IDS.clientId, fullName: 'Jean Dupont', company: 'Dupont SARL' },
  case: { id: TEST_IDS.caseId, reference: 'REF-001', title: 'Test Case' },
  currency: { code: 'XAF', name: 'FCFA' },
  lineItems: [
    { id: 'li-1', description: 'Honoraires', quantity: 10, unitPrice: 500, total: 5000, sortOrder: 0 },
  ],
  payments: [],
}

describe('GET /api/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      invoice: {
        findMany: vi.fn().mockResolvedValue([mockInvoice]),
      },
    })
    mockAuthResult = null
  })

  it('returns invoices with client info', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId } })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].client.fullName).toBe('Jean Dupont')
    expect(res.body[0].lineItems).toHaveLength(1)
  })

  it('filters by status', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    await callRoute(GET, { searchParams: { tenantId: TEST_IDS.tenantId, status: 'non_paye' } })
    expect(mockDb.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'non_paye' }),
      }),
    )
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)

    const res = await callRoute(GET)
    expect(res.status).toBe(401)
  })

  it('returns 500 on database error', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)
    mockDb.invoice.findMany.mockRejectedValue(new Error('DB error'))

    const res = await callRoute(GET)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = createMockDb({
      invoice: {
        count: vi.fn().mockResolvedValue(0),
      },
    })
    mockDb.$transaction = vi.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const created = { ...mockInvoice, id: 'new-inv-id', invoiceNumber: 'FAC-2025-001' }
      mockDb.invoice.create = vi.fn().mockResolvedValue(created)
      return fn(mockDb)
    })
    mockAuthResult = null
  })

  it('creates invoice with line items', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(POST, {
      method: 'POST',
      body: {
        tenantId: TEST_IDS.tenantId,
        clientId: TEST_IDS.clientId,
        lineItems: [
          { description: 'Consultation', quantity: 2, unitPrice: 25000 },
        ],
      },
    })

    expect(res.status).toBe(201)
    expect(res.body.invoiceNumber).toBeTruthy()
  })

  it('returns 400 when tenantId or clientId missing', async () => {
    mockAuthResult = authUser
    mockAuthFn.mockResolvedValue(authUser)

    const res = await callRoute(POST, {
      method: 'POST',
      body: { amount: 1000 },
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('tenantId')
  })

  it('returns 401 without auth', async () => {
    mockAuthResult = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    mockAuthFn.mockResolvedValue(mockAuthResult)

    const res = await callRoute(POST, { method: 'POST', body: {} })
    expect(res.status).toBe(401)
  })
})
