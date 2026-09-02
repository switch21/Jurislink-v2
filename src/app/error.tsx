'use client'

import { useEffect } from 'react'
import App from './AppClient'

// Suppress hydration mismatch console.error at module level (same as global-error.tsx)
if (typeof window !== 'undefined') {
  const _orig = console.error
  console.error = (...args: unknown[]) => {
    const msg = args[0]?.toString?.() || ''
    if (
      msg.includes('185') ||
      msg.includes('hydration') ||
      msg.includes('Text content did not match') ||
      msg.includes('Minified React error') ||
      msg.includes('There was an error while hydrating') ||
      msg.includes('did not match. Server')
    ) return
    _orig.apply(console, args)
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const msg = error?.message || ''
  const isHydration = msg.includes('185') || msg.includes('hydration') || msg.includes('Text content did not match') || msg.includes('Minified React error')

  useEffect(() => {
    if (!isHydration) {
      console.error('=== APP ERROR ===', error)
    }
  }, [error, isHydration])

  // Hydration error → render the app directly (direct import, no dynamic → no loading loop)
  if (isHydration) {
    return <App />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page, #F5F7FA)' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary, #111827)', marginBottom: '8px' }}>Une erreur est survenue</p>
        <pre style={{ fontSize: '12px', color: '#EF4444', background: '#FEE2E2', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', wordBreak: 'break-all', textAlign: 'left' }}>{msg || 'Erreur inconnue'}</pre>
        <button onClick={reset} style={{ marginTop: '16px', padding: '8px 20px', background: 'var(--primary, #1E5A8A)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Réessayer</button>
      </div>
    </div>
  )
}
