import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): Buffer {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.warn('[portal-jwt] JWT_SECRET not set — using insecure fallback for dev only')
    return Buffer.from('jurislink-dev-fallback-secret-change-me')
  }
  return Buffer.from(secret)
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  if (pad) {
    const padding = '='.repeat(4 - pad)
    return Buffer.from(padded + padding, 'base64')
  }
  return Buffer.from(padded, 'base64')
}

export interface PortalTokenPayload {
  sub: string      // portalUserId
  tenantId: string
  iat: number      // issued at (seconds)
  exp: number      // expiration (seconds)
}

/**
 * Signs a portal JWT with HMAC-SHA256.
 * Payload: { sub: portalUserId, tenantId, iat, exp: now + 7 days }
 */
export function signPortalToken(portalUserId: string, tenantId: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload: PortalTokenPayload = {
    sub: portalUserId,
    tenantId,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  }

  const headerB64 = base64urlEncode(Buffer.from(JSON.stringify(header), 'utf-8'))
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payload), 'utf-8'))
  const signingInput = `${headerB64}.${payloadB64}`
  const signature = createHmac('sha256', getSecret()).update(signingInput).digest()

  return `${signingInput}.${base64urlEncode(signature)}`
}

/**
 * Verifies a portal JWT and returns the payload, or null if invalid/expired.
 */
export function verifyPortalToken(token: string): { sub: string; tenantId: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, sigB64] = parts
    const signingInput = `${headerB64}.${payloadB64}`
    const expectedSig = createHmac('sha256', getSecret()).update(signingInput).digest()
    const actualSig = base64urlDecode(sigB64)

    if (expectedSig.length !== actualSig.length) return null
    if (!timingSafeEqual(expectedSig, actualSig)) return null

    const payload = JSON.parse(base64urlDecode(payloadB64).toString('utf-8')) as PortalTokenPayload

    if (!payload.sub || !payload.tenantId) return null

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null

    return { sub: payload.sub, tenantId: payload.tenantId }
  } catch {
    return null
  }
}
