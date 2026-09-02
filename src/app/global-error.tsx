'use client'

import App from './AppClient'
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // If global-error re-triggers (e.g. <html> hydration mismatch),
  // sessionStorage flag prevents re-rendering the app → breaks the loop
  const alreadyRecovered = typeof window !== 'undefined' && sessionStorage.getItem('__jl_global_err') === '1'
  if (typeof window !== 'undefined') sessionStorage.setItem('__jl_global_err', '1')

  if (alreadyRecovered) {
    return (
      <html lang="fr" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning>
          <div id="__jl_root" style={{ minHeight: '100vh' }} />
        </body>
      </html>
    )
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <App />
      </body>
    </html>
  )
}
