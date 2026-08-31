/**
 * Shared test helpers for API route testing.
 * Provides mock PrismaClient builder, mock Request builder,
 * and utility to call route handlers directly.
 */
import { vi } from 'vitest'

// ── Mock PrismaClient factory ──────────────────────────────────────
// Each test can override specific model methods.

export function createMockDb(overrides: Record<string, Record<string, unknown>> = {}) {
  const baseModel = {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    groupBy: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
  }

  const models = [
    'user', 'tenant', 'case', 'client', 'invoice', 'payment',
    'document', 'task', 'event', 'auditLog', 'rolePermission',
    'permission', 'role', 'caseAssignment', 'currency', 'subscription',
    'subscriptionPlan', 'lineItem',
  ] as const

  const db: Record<string, any> = {
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $connect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(db)),
    $queryRaw: vi.fn().mockResolvedValue([]),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  }

  // Apply model-level overrides
  for (const model of models) {
    db[model] = {
      ...baseModel,
      ...(overrides[model] || {}),
    }
  }

  // Apply top-level overrides (e.g. $queryRaw, $transaction)
  const topLevelKeys = ['$queryRaw', '$queryRawUnsafe', '$transaction', '$connect', '$disconnect']
  for (const key of topLevelKeys) {
    if (overrides[key]) {
      db[key] = overrides[key]
    }
  }

  return db as any
}

// ── Mock Request builder ───────────────────────────────────────────

export interface MockRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  searchParams?: Record<string, string>
}

export function mockRequest(options: MockRequestOptions = {}): Request {
  const { method = 'GET', headers = {}, body, searchParams = {} } = options

  const url = new URL('http://localhost:3000/api/test')
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }

  const init: RequestInit = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    }
  }

  return new Request(url.toString(), init)
}

// ── Call a route handler and parse the JSON response ───────────────

export async function callRoute(
  handler: (request: Request) => Promise<Response>,
  options: MockRequestOptions = {},
): Promise<{ status: number; body: any; headers: Headers }> {
  const request = mockRequest(options)
  const response = await handler(request)
  let parsedBody: any = null
  try {
    parsedBody = await response.json()
  } catch {
    // empty body
  }
  return {
    status: response.status,
    body: parsedBody,
    headers: response.headers,
  }
}

// ── Standard test user IDs (valid UUIDs) ───────────────────────────

export const TEST_IDS = {
  rootAdmin: 'a1000000-0001-0000-0000-000000000001',
  regularUser: '550e8400-e29b-41d4-a716-446655440000',
  tenantId: 'b2000000-0001-0000-0000-000000000001',
  clientId: 'c3000000-0001-0000-0000-000000000001',
  caseId: 'd4000000-0001-0000-0000-000000000001',
  invoiceId: 'e5000000-0001-0000-0000-000000000001',
  roleId: 'f6000000-0001-0000-0000-000000000001',
  permId: 'a7000000-0001-0000-0000-000000000001',
}
