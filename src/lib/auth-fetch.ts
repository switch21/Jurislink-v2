'use client'

/**
 * Override window.fetch to automatically inject X-User-Id, X-Tenant-Id and X-Login-At headers.
 * For portal routes (/api/portal/), injects Authorization: Bearer <jwt> instead.
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
      const headers = new Headers(init?.headers)

      if (isPortal) {
        // For portal routes, use JWT Bearer token
        const token = localStorage.getItem('jurislink_portal_token')
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      } else {
        // For admin routes, use existing header-based auth
        const stored = localStorage.getItem('jurislink_user')
        if (stored) {
          const data = JSON.parse(stored)
          if (data.id) headers.set('X-User-Id', data.id)
          if (data.tenantId) headers.set('X-Tenant-Id', data.tenantId)
          if (data.loginAt) headers.set('X-Login-At', data.loginAt)
        }
      }

      const response = await originalFetch(input, { ...init, headers })

      // Detect forced logout: 401 + X-Force-Logout header
      if (response.status === 401) {
        const key = isPortal ? 'jurislink_portal_user' : 'jurislink_user'
        localStorage.removeItem(key)
        localStorage.removeItem(isPortal ? 'jurislink_portal_view' : 'jurislink_current_view')
        if (isPortal) {
          localStorage.removeItem('jurislink_portal_token')
        }
        // Lazy import to avoid circular dependency at module load
        const { useAppStore } = await import('@/store/appStore')
        if (isPortal) {
          useAppStore.getState().portalLogout()
        } else {
          useAppStore.getState().logout()
        }
      }

      return response
    } catch {
      // ignore parse errors
    }
    return originalFetch(input, init)
  }
}
