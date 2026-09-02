'use client'

import { useEffect } from 'react'

const HYDRATION_RESET_KEY = 'jl_hydr_reset'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const msg = error?.message || ''
  const isHydration = msg.includes('185') || msg.includes('hydration') || msg.includes('Text content did not match')

  useEffect(() => {
    if (isHydration) {
      // Auto-reset once per session for hydration errors.
      // reset() re-renders without re-hydrating, so the error won't recur.
      const alreadyReset = sessionStorage.getItem(HYDRATION_RESET_KEY)
      if (!alreadyReset) {
        sessionStorage.setItem(HYDRATION_RESET_KEY, '1')
        const t = setTimeout(() => reset(), 50)
        return () => clearTimeout(t)
      }
    } else {
      // Clear flag for non-hydration errors
      sessionStorage.removeItem(HYDRATION_RESET_KEY)
      console.error('=== APP ERROR ===', error)
    }
  }, [error, isHydration, reset])

  // Hydration errors: show loading (app will render after auto-reset)
  if (isHydration) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  // Non-hydration errors: show full error UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
      <div className="max-w-lg w-full text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626' }}>!</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Une erreur est survenue</h2>
        <pre className="text-xs text-left bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap break-all">
          {msg || 'Erreur inconnue'}
        </pre>
        {error?.digest && (
          <p className="text-xs text-slate-400">Code: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{ padding: '8px 20px', background: '#1E5A8A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
