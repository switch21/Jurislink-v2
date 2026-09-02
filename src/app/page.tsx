'use client'
import dynamic from 'next/dynamic'

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
