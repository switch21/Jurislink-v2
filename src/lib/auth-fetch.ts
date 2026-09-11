'use client'

/**
 * Override window.fetch to automatically inject X-User-Id and X-Tenant-Id headers
 * from the Zustand store. For portal routes (/api/portal/), injects X-Portal-User-Id instead.
 * Call initAuthFetch() once at app startup.
 */
let _initialized = false

export function initAuthFetch() {
  if (typeof window === 'undefined' || _initialized) return
  _initialized = true

  const originalFetch = window.fetch
  window.fetch = async (input, init) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : ''
      const isPortal = url.includes('/api/portal/')
      const key = isPortal ? 'jurislink_portal_user' : 'jurislink_user'
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        const headers = new Headers(init?.headers)
        if (isPortal) {
          if (data.id) headers.set('X-Portal-User-Id', data.id)
        } else {
          if (data.id) headers.set('X-User-Id', data.id)
          if (data.tenantId) headers.set('X-Tenant-Id', data.tenantId)
        }
        return originalFetch(input, { ...init, headers })
      }
    } catch {
      // ignore parse errors
    }
    return originalFetch(input, init)
  }
}
