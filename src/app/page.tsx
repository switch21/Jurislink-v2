'use client'

import React, { useState, useEffect, type ReactNode, type ComponentType } from 'react'

// ═══ Error Boundary (class component required for componentDidCatch) ═══
interface EBProps { children: ReactNode; onError: (msg: string) => void }
interface EBState { hasError: boolean; error: string }

class AppErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false, error: '' } }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, error: String((err as Error)?.message || err) }
  }
  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', err, info.componentStack)
    this.props.onError(this.state.error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Erreur de rendu</p>
            <pre style={{ fontSize: '12px', color: '#EF4444', background: '#FEE2E2', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', wordBreak: 'break-all', textAlign: 'left' }}>{this.state.error}</pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: '' }); this.props.onError('') }}
              style={{ marginTop: '16px', padding: '8px 20px', background: '#1E5A8A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
            >
              Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [App, setApp] = useState<ComponentType | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    import('./AppClient')
      .then((mod) => { setApp(() => mod.default) })
      .catch((err) => {
        console.error('[page.tsx] Failed to load AppClient:', err)
        setLoadError(String(err?.message || err))
      })
  }, [])

  // Import failed
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Erreur de chargement</p>
          <pre style={{ fontSize: '12px', color: '#EF4444', background: '#FEE2E2', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', wordBreak: 'break-all', textAlign: 'left' }}>{loadError}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 20px', background: '#1E5A8A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Réessayer</button>
        </div>
      </div>
    )
  }

  // Loading / splash (identical on server and client first render)
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

  return (
    <AppErrorBoundary onError={() => {}}>
      <App />
    </AppErrorBoundary>
  )
}
