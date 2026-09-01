'use client'

/**
 * apiFetch — A drop-in replacement for `fetch().then(r => r.json())` that:
 * 1. Checks `r.ok` and throws on non-2xx responses (instead of silently returning error objects)
 * 2. Extracts the error message from the response body
 *
 * Usage:
 *   // Before (BUG: silently treats 403 { error: '...' } as valid data):
 *   queryFn: () => fetch('/api/dashboard').then(r => r.json())
 *
 *   // After (CORRECT: throws on error, React Query shows isError state):
 *   queryFn: () => fetchJson('/api/dashboard')
 *   queryFn: () => fetchJson('/api/dashboard', { headers: { ... } })
 *   queryFn: () => fetchJson('/api/cases', { method: 'POST', body: ... })
 */
export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.detail ? `${body.error}: ${body.detail}` : body.error
    } catch { /* ignore parse errors */ }
    throw new Error(message)
  }
  return res.json()
}

/**
 * fetchJsonOrNull — Same as fetchJson but returns null on error instead of throwing.
 * Useful for non-critical data (e.g. subscription info on dashboard).
 */
export async function fetchJsonOrNull<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    return await fetchJson<T>(url, init)
  } catch {
    return null
   }
}
