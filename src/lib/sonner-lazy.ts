'use client'

import { lazy } from 'react'

/**
 * Lazy-loaded sonner wrapper.
 *
 * Problem: `import { toast, Toaster } from 'sonner'` triggers sonner's
 * module-level __insertCSS() which injects a <style> tag into <head>.
 * Turbopack inlines sonner into the initial bundle, so this happens BEFORE
 * React hydrates → error #185.
 *
 * Fix: Dynamic import() creates a separate chunk. sonner only evaluates
 * (and injects CSS) when the chunk loads — which is AFTER hydration
 * because all toast/Toaster usage is post-mount.
 *
 * IMPORTANT: No module-level `typeof window !== 'undefined'` checks.
 * All initialization is lazy — triggered on first toast() call or Toaster render.
 */

let __toast: typeof import('sonner').toast | null = null
let sonnerPromise: Promise<typeof import('sonner')> | null = null

function getSonnerPromise() {
  if (!sonnerPromise) {
    sonnerPromise = import('sonner').then(m => { __toast = m.toast; return m })
  }
  return sonnerPromise
}

// Lazy Toaster component — React.lazy defers rendering until after mount
export const Toaster = lazy(() =>
  import('sonner').then(m => ({ default: m.Toaster }))
)

// Proxy toast: transparent API, calls are queued if sonner hasn't loaded yet
// All usage in AppClient is inside mutation callbacks (user-triggered),
// which always run after hydration, so sonner is loaded by then.
export const toast = new Proxy(function () {}, {
  get(_, prop: string) {
    if (__toast && prop in __toast) return (__toast as any)[prop]
    return (...args: any[]) => {
      if (__toast) return (__toast as any)[prop](...args)
      getSonnerPromise().then(m => (m.toast as any)[prop](...args))
    }
  },
  apply(_, _thisArg, args) {
    if (__toast) return __toast(...(args as any))
    getSonnerPromise().then(m => m.toast(...(args as any)))
  },
}) as unknown as typeof import('sonner').toast
