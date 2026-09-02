'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

// Load the full app client-side only — zero hydration surface
const App = dynamic(() => import('./AppClient'), { ssr: false })

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

  // Hydration error → render the app directly (no error UI, no reset needed)
  // The error boundary unmounts the mismatched tree and renders this fresh client-only tree
  if (isHydration) {
    return <App />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Une erreur est survenue</p>
        <pre style={{ fontSize: '12px', color: '#EF4444', background: '#FEE2E2', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', wordBreak: 'break-all', textAlign: 'left' }}>{msg || 'Erreur inconnue'}</pre>
        <button onClick={reset} style={{ marginTop: '16px', padding: '8px 20px', background: '#1E5A8A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Réessayer</button>
      </div>
    </div>
  )
}
