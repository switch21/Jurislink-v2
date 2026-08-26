'use client'

import dynamic from 'next/dynamic'

// TEST: Remove loading component to isolate the hydration error.
// If next/dynamic({ ssr: false }) renders null on BOTH server and client
// during hydration, there's nothing to mismatch → error should disappear.
// A CSS-only spinner in globals.css handles the loading visual.
const App = dynamic(() => import('@/components/AppClient'), {
  ssr: false,
})

export default function ClientShell() {
  return <App />
}
