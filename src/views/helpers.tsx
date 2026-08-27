'use client'

import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { STATUS_COLORS, STATUS_LABELS } from './constants'
// ==================== Helpers ====================
export function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: fr }) } catch { return '—' }
}
export function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '—' }
}
export function fmtMoney(amount: number, code: string = 'XAF', compact = false) {
  // XAF/FCFA is not a standard ISO 4217 currency code recognized by Intl.NumberFormat
  // Use manual formatting to avoid garbled output with "/" characters
  const isXaf = (code || '').toUpperCase() === 'XAF'
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  if (isXaf) {
    const suffix = compact ? (amount >= 1000000 ? ' M FCFA' : amount >= 1000 ? ' K FCFA' : ' FCFA') : ' FCFA'
    if (compact) {
      if (amount >= 1000000) {
        const m = amount / 1000000
        return m % 1 === 0 ? `${m} M FCFA` : `${m.toFixed(1)} M FCFA`
      }
      if (amount >= 1000) {
        const k = amount / 1000
        return k % 1 === 0 ? `${k} K FCFA` : `${k.toFixed(0)} K FCFA`
      }
    }
    return `${formatted} FCFA`
  }
  if (compact) {
    if (amount >= 1000000) {
      const m = amount / 1000000
      return m % 1 === 0 ? `${m} M ${code}` : `${m.toFixed(1)} M ${code}`
    }
    if (amount >= 1000) {
      const k = amount / 1000
      return k % 1 === 0 ? `${k} K ${code}` : `${k.toFixed(0)} K ${code}`
    }
    return `${formatted} ${code}`
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, minimumFractionDigits: 0 }).format(amount)
}
export function fmtFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1048576).toFixed(1) + ' Mo'
}
export function initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }
const TASK_STATUS_MAP: Record<string, string> = { todo: 'a_faire', in_progress: 'en_cours', done: 'terminee', en_cours: 'en_cours', a_faire: 'a_faire', terminee: 'terminee' }
export function taskStatusColor(s: string) { const mapped = TASK_STATUS_MAP[s] || s; return STATUS_COLORS[mapped === 'en_cours' ? 'en_cours_t' : mapped] || STATUS_COLORS[s] || '' }
export function taskStatusLabel(s: string) { const mapped = TASK_STATUS_MAP[s] || s; return STATUS_LABELS[mapped === 'en_cours' ? 'en_cours_t' : mapped] || s }
export function relativeTime(d: string | null | undefined): string {
  if (!d) return ''
  try {
    const now = Date.now()
    const then = parseISO(d).getTime()
    const diffMin = Math.floor((now - then) / 60000)
    if (diffMin < 1) return "à l'instant"
    if (diffMin < 60) return `il y a ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `il y a ${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return 'hier'
    if (diffD < 7) return `il y a ${diffD}j`
    return fmtDate(d)
  } catch { return '' }
}
export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/** Read auth headers from localStorage — same source as auth-fetch.ts override */
export function getAuthHeaders(isPortal = false): Record<string, string> {
  const headers: Record<string, string> = {}
  try {
    const key = isPortal ? 'jurislink_portal_user' : 'jurislink_user'
    const stored = localStorage.getItem(key)
    if (stored) {
      const data = JSON.parse(stored)
      if (isPortal) {
        if (data.id) headers['X-Portal-User-Id'] = data.id
      } else {
        if (data.id) headers['X-User-Id'] = data.id
        if (data.tenantId) headers['X-Tenant-Id'] = data.tenantId
      }
    }
  } catch { /* ignore */ }
  return headers
}

/** Upload a file via XHR with progress tracking and proper auth headers from localStorage */
export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
  isPortal = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        let detail = `Erreur ${xhr.status}`
        try {
          const body = JSON.parse(xhr.responseText)
          if (body.error) detail = body.error
        } catch { /* ignore parse error */ }
        reject(new Error(detail))
      }
    }
    xhr.onerror = () => reject(new Error('Erreur réseau'))
    const headers = getAuthHeaders(isPortal)
    xhr.open('POST', url)
    if (headers['X-User-Id']) xhr.setRequestHeader('X-User-Id', headers['X-User-Id'])
    if (headers['X-Tenant-Id']) xhr.setRequestHeader('X-Tenant-Id', headers['X-Tenant-Id'])
    if (headers['X-Portal-User-Id']) xhr.setRequestHeader('X-Portal-User-Id', headers['X-Portal-User-Id'])
    xhr.send(formData)
  })
}
