'use client'

/**
 * Override window.fetch to automatically inject X-User-Id and X-Tenant-Id headers
 * from the Zustand store. Call initAuthFetch() once at app startup.
 */
let _initialized = false

export function initAuthFetch() {
  if (typeof window === 'undefined' || _initialized) return
  _initialized = true

  const originalFetch = window.fetch
  window.fetch = async (input, init) => {
    try {
      const stored = localStorage.getItem('jurislink_user')
      if (stored) {
        const user = JSON.parse(stored)
        const headers = new Headers(init?.headers)
        if (user.id) headers.set('X-User-Id', user.id)
        if (user.tenantId) headers.set('X-Tenant-Id', user.tenantId)
        return originalFetch(input, { ...init, headers })
      }
    } catch {
      // ignore parse errors
    }
    return originalFetch(input, init)
  }
}
