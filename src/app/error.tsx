'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Une erreur est survenue</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {error?.message || 'Erreur inconnue'}
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
