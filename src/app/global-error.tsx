'use client'

import './globals.css'

// ──── Bootstrap the app using createRoot (NOT hydration) ────
// This runs at module load time and in the render function.
// It completely bypasses React's hydration, so the Next.js 16
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
    createRoot(container).render(App)
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
