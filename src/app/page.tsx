'use client'

import { useState, useEffect } from 'react'

export default function Page() {
  const [App, setApp] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    // Dynamic import: the real app only loads client-side, never during SSR
    import('./AppClient').then((mod) => {
      setApp(() => mod.default)
    })
  }, [])

  // Both server and client first render produce identical HTML:
  // a simple static div with the splash screen image.
  // No CSS variables, no theme-dependent content, no store reads.
  if (!App) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <img src='/splash.png' alt='JurisLink' style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  return <App />
}
