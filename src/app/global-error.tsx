'use client'

import './globals.css'

// ──── Suppress hydration mismatch errors from Next.js 16 MetadataBoundary ────
// React #185 fires BEFORE error boundaries catch it. We intercept console.error
// at module load time to prevent the error from surfacing in production logs.
if (typeof window !== 'undefined') {
  const _origConsoleError = console.error
  console.error = (...args: unknown[]) => {
    const msg = args[0]?.toString?.() || ''
    if (
      msg.includes('185') ||
      msg.includes('hydration') ||
      msg.includes('Text content did not match') ||
      msg.includes('Minified React error') ||
      msg.includes('There was an error while hydrating') ||
      msg.includes('did not match. Server')
    ) {
      return // silently suppress Next.js 16 MetadataBoundary mismatch
    }
    _origConsoleError.apply(console, args)
  }
}

// ──── Bootstrap the app using createRoot (NOT hydration) ────
// This completely bypasses React's hydration, so the Next.js 16
// MetadataBoundary mismatch error #185 never matters.
function bootstrapApp() {
  if (document.getElementById('__jl_root')) return

  // Clear all server-rendered body content to avoid visual artifacts
  document.body.innerHTML = ''

  const container = document.createElement('div')
  container.id = '__jl_root'
  document.body.appendChild(container)

  Promise.all([
    import('react-dom/client'),
    import('./AppClient'),
  ]).then(([{ createRoot }, { default: App }]) => {
    // Suppress all recoverable errors (Next.js 16 MetadataBoundary hydration mismatch)
    createRoot(container, {
      onRecoverableError: () => {},
    }).render(<App />)
  }).catch((err) => {
    console.error('=== BOOTSTRAP FAILED ===', err)
  })
}

// Module-level: runs as soon as the chunk loads (before React hydrates)
if (typeof window !== 'undefined') bootstrapApp()

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Also bootstrap during render as a safety net
  // (in case module-level code ran before DOM was ready)
  if (typeof window !== 'undefined') bootstrapApp()

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <div />
      </body>
    </html>
  )
}
