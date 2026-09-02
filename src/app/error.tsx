'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const retried = useRef(false)

  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  // For hydration errors, silently retry once then give up
  const msg = error?.message || ''
  const isHydration = msg.includes('185') || msg.includes('hydration') || msg.includes('Text content did not match')

  useEffect(() => {
    if (isHydration && !retried.current) {
      retried.current = true
      const timer = setTimeout(reset, 0)
      return () => clearTimeout(timer)
    }
  }, [isHydration, reset])

  if (isHydration) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Une erreur est survenue</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {msg || 'Erreur inconnue'}
        </p>
        {error?.digest && (
          <p className="text-xs text-slate-400">Code: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline">Réessayer</Button>
          <Button onClick={() => { localStorage.clear(); window.location.reload() }}>
            Réinitialiser
          </Button>
        </div>
      </div>
    </div>
  )
}
