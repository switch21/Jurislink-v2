'use client'

/**
 * Override window.fetch to automatically inject X-User-Id, X-Tenant-Id and X-Login-At headers.
 * For portal routes (/api/portal/), injects X-Portal-User-Id instead.
 * Detects forced logout (401 + X-Force-Logout header) and clears session.
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
          if (data.loginAt) headers.set('X-Login-At', data.loginAt)
        }
        const response = await originalFetch(input, { ...init, headers })

        // Detect forced logout: 401 + X-Force-Logout header
        if (response.status === 401 && response.headers.get('x-force-logout')) {
          localStorage.removeItem(key)
          localStorage.removeItem(isPortal ? 'jurislink_portal_view' : 'jurislink_current_view')
          // Lazy import to avoid circular dependency at module load
          const { useAppStore } = await import('@/store/appStore')
          if (isPortal) {
            useAppStore.getState().portalLogout()
          } else {
            useAppStore.getState().logout()
          }
        }

        return response
      }
    } catch {
      // ignore parse errors
    }
    return originalFetch(input, init)
  }
}
