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
  const msg = error?.message || ''

  useEffect(() => {
    console.error('=== APP ERROR ===', error)
  }, [error])

  // Always show the error UI so the user can report it.
  // Never return null — that causes blank/white pages.
  // Never auto-reload — that causes infinite loops.
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-4">
      <div className="max-w-lg w-full text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Une erreur est survenue</h2>
        <pre className="text-xs text-left bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap break-all">
          {msg || 'Erreur inconnue'}
        </pre>
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
