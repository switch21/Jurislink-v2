'use client'

import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react'

// Global tracker: any active draft prevents page unload
const activeDrafts = new Set<string>()
let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null

function ensureBeforeUnload() {
  if (beforeUnloadHandler || typeof window === 'undefined') return
  beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (activeDrafts.size > 0) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', beforeUnloadHandler)
}

const DRAFT_PREFIX = 'jurislink_draft_'

/**
 * useDraftSave — Autosave form data to localStorage with BeforeUnload protection
 *
 * @param key - Unique key for the draft (e.g., 'case-create', 'invoice-edit-123')
 * @param data - The current form data object to autosave
 * @param options.debounceMs - Debounce delay in ms (default 800)
 * @param options.enabled - Whether to save (default true)
 *
 * @returns { hasDraft, clearDraft }
 *   - hasDraft: boolean, true if a draft exists in localStorage
 *   - clearDraft: removes the draft from localStorage
 */
export function useDraftSave<T extends Record<string, unknown>>(
  key: string,
  data: T,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 800, enabled = true } = options
  const storageKey = `${DRAFT_PREFIX}${key}`
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  // Use useSyncExternalStore to read hasDraft without setState in effect
  const subscribe = useCallback((callback: () => void) => {
    const handler = () => callback()
    window.addEventListener('storage', handler)
    // Also listen to our custom event for same-tab updates
    window.addEventListener('draft-change', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('draft-change', handler)
    }
  }, [])

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return 'false'
    try {
      return localStorage.getItem(storageKey) ? 'true' : 'false'
    } catch { return 'false' }
  }, [storageKey])

  const getServerSnapshot = useCallback(() => 'false', [])

  const hasDraft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) === 'true'

  // Autosave with debounce
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const serialized = JSON.stringify(data)
    if (serialized === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, serialized)
        lastSavedRef.current = serialized
        activeDrafts.add(key)
        ensureBeforeUnload()
        // Notify other tabs/hooks
        window.dispatchEvent(new Event('draft-change'))
      } catch { /* quota exceeded, ignore */ }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [data, storageKey, debounceMs, enabled, key])

  // Remove from active drafts when disabled
  useEffect(() => {
    if (!enabled) {
      activeDrafts.delete(key)
      if (activeDrafts.size === 0 && beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler)
        beforeUnloadHandler = null
      }
    }
  }, [enabled, key])

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(storageKey)
    activeDrafts.delete(key)
    lastSavedRef.current = ''
    // Notify listeners
    window.dispatchEvent(new Event('draft-change'))
    // Clean up BeforeUnload listener if no drafts left
    if (activeDrafts.size === 0 && beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      beforeUnloadHandler = null
    }
  }, [storageKey, key])

  return { hasDraft, clearDraft }
}

/**
 * Restore a draft and clear it from storage
 */
export function loadDraftOnce<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const storageKey = `${DRAFT_PREFIX}${key}`
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      localStorage.removeItem(storageKey)
      return JSON.parse(stored) as T
    }
  } catch { /* ignore */ }
  return null
}

/**
 * Check if any drafts exist (for global UI indicators)
 */
export function hasAnyDrafts(): boolean {
  if (typeof window === 'undefined') return false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(DRAFT_PREFIX)) return true
  }
  return false
}
