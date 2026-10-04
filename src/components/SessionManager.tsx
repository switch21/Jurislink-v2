'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'

const IDLE_LIMIT_MS = 3 * 60 * 1000
const CHECK_INTERVAL_MS = 20 * 1000
const HEARTBEAT_INTERVAL_MS = 60 * 1000

function getSessionId(): string | null {
  try {
    return localStorage.getItem('jurislink_session')
  } catch {
    return null
  }
}

/**
 * Session lifecycle for cabinet users:
 * - Auto-logout after 3 minutes of inactivity
 * - Heartbeat keeps the server session alive and detects revocations
 *   (force logout from the Équipe screen, superseded sessions)
 */
export function SessionManager() {
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const isPortalAuthenticated = useAppStore(s => s.isPortalAuthenticated)
  const lastActivityRef = useRef<number>(Date.now())
  const idleLoggedOutRef = useRef(false)

  useEffect(() => {
    const enabled = isAuthenticated && !isPortalAuthenticated
    if (!enabled) {
      idleLoggedOutRef.current = false
      return
    }
    lastActivityRef.current = Date.now()

    const onActivity = () => { lastActivityRef.current = Date.now() }
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true })

    const idleCheck = window.setInterval(() => {
      if (idleLoggedOutRef.current) return
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor < IDLE_LIMIT_MS) return
      idleLoggedOutRef.current = true
      const sessionId = getSessionId()
      if (sessionId) {
        fetch('/api/sessions/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {})
      }
      localStorage.removeItem('jurislink_session')
      useAppStore.getState().logout()
    }, CHECK_INTERVAL_MS)

    const heartbeat = window.setInterval(() => {
      const sessionId = getSessionId()
      if (!sessionId) return
      fetch('/api/sessions/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(r => (r.ok ? r.json() : { active: true }))
        .then((d: { active?: boolean }) => {
          if (d.active === false) {
            localStorage.removeItem('jurislink_session')
            useAppStore.getState().logout()
          }
        })
        .catch(() => {})
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity)
      window.clearInterval(idleCheck)
      window.clearInterval(heartbeat)
    }
  }, [isAuthenticated, isPortalAuthenticated])

  return null
}
