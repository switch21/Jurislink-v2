'use client'

import './globals.css'

// global-error.tsx only renders for UNHANDLED errors that bubble past error.tsx.
// For Next.js 16 MetadataBoundary hydration mismatch (#185), render a minimal shell.
// React 19 recovers automatically (re-renders the mismatched subtree client-side).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const msg = error?.message || ''
  const isHydration = msg.includes('185') || msg.includes('hydration') || msg.includes('Text content did not match') || msg.includes('Minified React error')

  // For hydration errors: render minimal HTML shell, let React 19 auto-recover
  if (isHydration) {
    return (
      <html lang="fr" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning>
          <div />
        </body>
      </html>
    )
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page, #F5F7FA)' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary, #111827)', marginBottom: '8px' }}>Une erreur est survenue</p>
            <pre style={{ fontSize: '12px', color: '#EF4444', background: '#FEE2E2', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', wordBreak: 'break-all', textAlign: 'left' }}>{msg || 'Erreur inconnue'}</pre>
            <button onClick={reset} style={{ marginTop: '16px', padding: '8px 20px', background: 'var(--primary, #1E5A8A)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Réessayer</button>
          </div>
        </div>
      </body>
    </html>
  )
}
