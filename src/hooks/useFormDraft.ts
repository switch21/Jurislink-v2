'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * useFormDraft — Autosave & restore form data to/from localStorage.
 *
 * Like a magic notepad ✨: every few seconds, it copies your form data
 * into the browser's memory. If you refresh, your data comes back!
 *
 * @param key  Unique draft key (e.g. "case-form", "invoice-edit-123")
 * @param data Current form data object (will be watched for changes)
 * @param opts Options
 *   - saveInterval: ms between saves (default 3000 = 3s)
 *   - enabled: whether autosave is active (default true)
 *   - excludedKeys: keys to ignore (e.g. internal state)
 */

export interface FormDraftOptions {
  saveInterval?: number
  enabled?: boolean
  excludedKeys?: string[]
}

export interface FormDraftReturn {
  /** Whether a draft was restored on mount */
  restoredDraft: boolean
  /** Whether there are unsaved changes right now */
  isDirty: boolean
  /** Manually clear the saved draft */
  clearDraft: () => void
  /** Get the stored draft data (without applying it) */
  getDraft: () => Record<string, unknown> | null
}

export const STORAGE_PREFIX = 'jurislink_draft_'

function readDraft(key: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed._ts) {
      return parsed.data as Record<string, unknown>
    }
  } catch {
    try { localStorage.removeItem(STORAGE_PREFIX + key) } catch { /* ignore */ }
  }
  return null
}

function writeDraft(key: string, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({
      _ts: Date.now(),
      data,
    }))
  } catch {
    // quota exceeded or private mode — silently fail
  }
}

function removeDraft(key: string): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(STORAGE_PREFIX + key) } catch { /* ignore */ }
}

export function useFormDraft(
  key: string,
  data: Record<string, unknown>,
  opts: FormDraftOptions = {}
): FormDraftReturn {
  const { saveInterval = 3000, enabled = true, excludedKeys = [] } = opts
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dataRef = useRef(data)

  // Use module-level variable to avoid ref-during-render lint issue
  const [initResult] = useState(() => {
    if (typeof window === 'undefined' || !enabled) return { restored: false, initialSaved: '' }
    const draft = readDraft(key)
    if (draft && Object.keys(draft).length > 0) {
      return { restored: true, initialSaved: JSON.stringify(draft) }
    }
    return { restored: false, initialSaved: '' }
  })
  const restoredDraft = initResult.restored
  const lastSavedRef = useRef(initResult.initialSaved)

  const [isDirty, setIsDirty] = useState(false)

  // Keep dataRef in sync
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Periodic save — setState inside interval callback is fine
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }

    timerRef.current = setInterval(() => {
      const current = { ...dataRef.current }
      for (const k of excludedKeys) {
        delete current[k]
      }
      const serialized = JSON.stringify(current)
      if (serialized !== lastSavedRef.current && serialized !== '{}') {
        writeDraft(key, current)
        lastSavedRef.current = serialized
        setIsDirty(true)
      } else if (serialized === lastSavedRef.current) {
        setIsDirty(false)
      }
    }, saveInterval)

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [key, saveInterval, enabled, excludedKeys.length])

  // Also save on unmount (before refresh/close)
  useEffect(() => {
    if (!enabled) return
    return () => {
      const current = { ...dataRef.current }
      for (const k of excludedKeys) {
        delete current[k]
      }
      const serialized = JSON.stringify(current)
      if (serialized !== '{}' && serialized !== lastSavedRef.current) {
        writeDraft(key, current)
      }
    }
  }, [key, enabled, excludedKeys.length])

  const clearDraft = useCallback(() => {
    removeDraft(key)
    lastSavedRef.current = ''
    setIsDirty(false)
  }, [key])

  const getDraft = useCallback((): Record<string, unknown> | null => {
    return readDraft(key)
  }, [key])

  return { restoredDraft, isDirty, clearDraft, getDraft }
}

/**
 * useBeforeUnload — Shows browser warning when leaving with unsaved changes.
 */
export function useBeforeUnload(dirty: boolean, message = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?') {
  useEffect(() => {
    if (!dirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, message])
}

/**
 * Global dirty tracker
 */
const dirtyForms = new Set<string>()

export function registerDirtyForm(key: string, dirty: boolean) {
  if (dirty) {
    dirtyForms.add(key)
  } else {
    dirtyForms.delete(key)
  }
}

export function unregisterDirtyForm(key: string) {
  dirtyForms.delete(key)
}

export function hasAnyDirtyForm(): boolean {
  return dirtyForms.size > 0
}

/**
 * Clears all drafts
 */
export function clearAllDrafts() {
  if (typeof window === 'undefined') return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(STORAGE_PREFIX)) {
      keys.push(k)
    }
  }
  keys.forEach(k => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  })
  dirtyForms.clear()
}
