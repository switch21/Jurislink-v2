'use client'

import dynamic from 'next/dynamic'
import './globals.css'

// Load the full app client-side only — zero hydration surface
const App = dynamic(() => import('./AppClient'), { ssr: false })

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Always render the app. This catches:
  // - Layout-level hydration errors (MetadataBoundary, etc.)
  // - Any unhandled errors that bypass error.tsx
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <App />
      </body>
    </html>
  )
}
