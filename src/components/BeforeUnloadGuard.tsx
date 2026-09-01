'use client'

import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { hasAnyDirtyForm, clearAllDrafts, STORAGE_PREFIX } from '@/hooks/useFormDraft'
import { toast } from '@/lib/sonner-lazy'
import { X } from 'lucide-react'

function countDrafts(): number {
  if (typeof window === 'undefined') return 0
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(STORAGE_PREFIX)) count++
  }
  return count
}

/**
 * BeforeUnloadGuard — Shows browser warning when leaving with unsaved changes.
 * Memoized to prevent unnecessary re-renders.
 */
const BeforeUnloadGuardInner = memo(function BeforeUnloadGuardInner() {
  const [initialCount] = useState(() => countDrafts())
  const [showBanner, setShowBanner] = useState(() => initialCount > 0)
  const [dirtyCount, setDirtyCount] = useState(initialCount)

  // Only poll if there are drafts (stop polling when count reaches 0)
  useEffect(() => {
    if (dirtyCount === 0 && !showBanner) return
    const id = setInterval(() => {
      const c = countDrafts()
      setDirtyCount(c)
      if (c === 0) setShowBanner(false)
    }, 3000)
    return () => clearInterval(id)
  }, [dirtyCount, showBanner])

  // beforeunload listener — always active
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasAnyDirtyForm() || dirtyCount > 0) {
        e.preventDefault()
        e.returnValue = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirtyCount])

  const handleClearAll = useCallback(() => {
    clearAllDrafts()
    setDirtyCount(0)
    setShowBanner(false)
    toast.success('Brouillons supprimés', { description: 'Tous les brouillons sauvegardés ont été supprimés.' })
  }, [])

  if (!showBanner || dirtyCount === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {dirtyCount} brouillon{dirtyCount > 1 ? 's' : ''} récupérable{dirtyCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Vos données de formulaire ont été sauvegardées automatiquement.
            </p>
            <button
              onClick={handleClearAll}
              className="text-xs text-[var(--text-muted)] hover:text-red-500 mt-2 transition-colors"
            >
              Ignorer les brouillons
            </button>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
})

export { BeforeUnloadGuardInner as BeforeUnloadGuard }
