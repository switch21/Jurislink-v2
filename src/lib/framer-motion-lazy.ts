'use client'

import { lazy, type ComponentProps, type RefExoticComponent, type RefAttributes } from 'react'

/**
 * Lazy-loaded framer-motion wrapper.
 *
 * Problem: `import { motion, AnimatePresence } from 'framer-motion'` triggers
 * framer-motion's module-level code which injects a <style> tag into <head>.
 * Turbopack inlines framer-motion into the initial bundle in dev mode,
 * so this happens BEFORE React hydrates → error #185.
 *
 * Fix: Dynamic import() creates a separate chunk. framer-motion only evaluates
 * (and injects CSS) when the chunk loads — which is AFTER hydration
 * because all motion/AnimatePresence usage is post-mount.
 *
 * The Proxy-based `motion` export provides a transparent API — components
 * can use `motion.div`, `motion.span`, etc. just like before.
 * The first render (during hydration) shows a Suspense fallback; after mount,
 * the real framer-motion components take over.
 */

type MotionComponent = RefExoticComponent<ComponentProps<any> & RefAttributes<any>>

// Lazy AnimatePresence — React.lazy defers rendering until after mount
export const AnimatePresence = lazy(() =>
  import('framer-motion').then(m => ({ default: m.AnimatePresence }))
)

// Proxy-based motion component factory
// Returns a lazy component that only renders after mount
const _motionCache = new Map<string, MotionComponent>()
let _motionPromise: Promise<typeof import('framer-motion')> | null = null

function getMotionPromise() {
  if (!_motionPromise) {
    _motionPromise = import('framer-motion').then(m => m)
  }
  return _motionPromise
}

// Create a lazy motion component for a specific HTML element
function createLazyMotionComponent(tag: string): MotionComponent {
  const Component = lazy(() =>
    getMotionPromise().then(m => ({ default: (m.motion as any)[tag] }))
  )
  Component.displayName = `LazyMotion.${tag}`
  return Component
}

// Proxy that intercepts `motion.div`, `motion.span`, etc.
// Returns lazy components that only render after mount
export const motion = new Proxy({} as typeof import('framer-motion').motion, {
  get(_target, prop: string) {
    if (typeof prop !== 'string') return undefined
    if (!_motionCache.has(prop)) {
      _motionCache.set(prop, createLazyMotionComponent(prop))
    }
    return _motionCache.get(prop)
  },
})
