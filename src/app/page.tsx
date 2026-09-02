'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('./AppClient'), {
  ssr: false,
  loading: () => (
    <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: '#F8F9FB' }}>
      <div className='flex flex-col items-center gap-3'>
        <div className='size-10 rounded-xl animate-pulse' style={{ backgroundColor: '#E5E7EB' }} />
        <p className='text-sm' style={{ color: '#9CA3AF' }}>Chargement…</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <App />
}
