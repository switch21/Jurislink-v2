'use client'

import dynamic from 'next/dynamic'

// ssr: false means the loading fallback is rendered on the server,
// but the real AppClient is ONLY mounted on the client (no hydration).
// This eliminates ALL hydration mismatches.
const App = dynamic(() => import('./AppClient'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src='/splash.png' alt='JurisLink' style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
    </div>
  ),
})

export default function Page() {
  return <App />
}
