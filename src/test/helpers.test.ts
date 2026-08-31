import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fmtDate, fmtDateTime, fmtMoney, fmtFileSize, initials, relativeTime, fmtDuration, taskStatusColor, taskStatusLabel } from '@/views/helpers'

// Freeze time to a known point for relativeTime tests
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
})

describe('fmtDate', () => {
  it('returns em dash for null', () => {
    expect(fmtDate(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(fmtDate(undefined)).toBe('—')
  })

  it('returns em dash for empty string', () => {
    expect(fmtDate('')).toBe('—')
  })

  it('formats a valid ISO date string in dd/MM/yyyy', () => {
    expect(fmtDate('2025-03-15')).toBe('15/03/2025')
  })

  it('formats a date-time ISO string (uses date part only)', () => {
    expect(fmtDate('2025-03-15T10:30:00Z')).toBe('15/03/2025')
  })

  it('returns em dash for invalid date string', () => {
    expect(fmtDate('not-a-date')).toBe('—')
  })
})

describe('fmtDateTime', () => {
  it('returns em dash for null', () => {
    expect(fmtDateTime(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(fmtDateTime(undefined)).toBe('—')
  })

  it('formats a valid ISO datetime in dd/MM/yyyy HH:mm', () => {
    expect(fmtDateTime('2025-03-15T14:30:00')).toMatch(/^15\/03\/2025 \d{2}:30$/)
  })

  it('returns em dash for invalid string', () => {
    expect(fmtDateTime('bad')).toBe('—')
  })
})

describe('fmtMoney', () => {
  it('formats XAF without compact', () => {
    const result = fmtMoney(150000, 'XAF')
    expect(result).toContain('FCFA')
    expect(result).toContain('150')
    expect(result).toContain('000')
  })

  it('formats XAF with compact for millions', () => {
    const result = fmtMoney(2500000, 'XAF', true)
    // toFixed(1) uses '.' as decimal separator
    expect(result).toBe('2.5 M FCFA')
  })

  it('formats XAF with compact for thousands', () => {
    const result = fmtMoney(50000, 'XAF', true)
    expect(result).toBe('50 K FCFA')
  })

  it('formats XAF without compact for small amounts', () => {
    const result = fmtMoney(500, 'XAF')
    expect(result).toContain('500')
    expect(result).toContain('FCFA')
  })

  it('formats non-XAF currency using Intl.NumberFormat', () => {
    const result = fmtMoney(100, 'EUR')
    // Intl.NumberFormat with style:'currency' uses the currency symbol
    expect(result).toContain('€')
    expect(result).toContain('100')
  })

  it('formats non-XAF compact millions', () => {
    const result = fmtMoney(3000000, 'USD', true)
    expect(result).toBe('3 M USD')
  })

  it('formats non-XAF compact thousands', () => {
    const result = fmtMoney(7000, 'USD', true)
    expect(result).toBe('7 K USD')
  })

  it('formats zero amount', () => {
    const result = fmtMoney(0, 'XAF')
    expect(result).toContain('0')
    expect(result).toContain('FCFA')
  })

  it('handles case-insensitive currency code', () => {
    const result = fmtMoney(1000, 'xaf')
    expect(result).toContain('FCFA')
  })

  it('defaults to XAF when no code given', () => {
    const result = fmtMoney(1000)
    expect(result).toContain('FCFA')
  })
})

describe('fmtFileSize', () => {
  it('returns bytes for values under 1KB', () => {
    expect(fmtFileSize(500)).toBe('500 o')
  })

  it('returns kilobytes for values under 1MB', () => {
    // toFixed uses '.' as decimal separator
    expect(fmtFileSize(1536)).toBe('1.5 Ko')
  })

  it('returns megabytes for values 1MB or above', () => {
    expect(fmtFileSize(1048576)).toBe('1.0 Mo')
  })

  it('handles zero bytes', () => {
    expect(fmtFileSize(0)).toBe('0 o')
  })

  it('handles large files', () => {
    expect(fmtFileSize(5242880)).toBe('5.0 Mo')
  })
})

describe('initials', () => {
  it('returns first letters of two words', () => {
    expect(initials('Jean Dupont')).toBe('JD')
  })

  it('returns only first two initials for three words', () => {
    expect(initials('Jean Marie Dupont')).toBe('JM')
  })

  it('uppercases the result', () => {
    expect(initials('jean dupont')).toBe('JD')
  })

  it('handles single word', () => {
    expect(initials('Admin')).toBe('A')
  })

  it('handles empty string', () => {
    expect(initials('')).toBe('')
  })
})

describe('relativeTime', () => {
  it('returns empty string for null', () => {
    expect(relativeTime(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(relativeTime(undefined)).toBe('')
  })

  it('returns "à l\'instant" for less than 1 minute ago', () => {
    const d = new Date(Date.now() - 30_000).toISOString()
    expect(relativeTime(d)).toBe("à l'instant")
  })

  it('returns minutes for less than 1 hour ago', () => {
    const d = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(relativeTime(d)).toBe('il y a 5min')
  })

  it('returns hours for less than 24 hours ago', () => {
    const d = new Date(Date.now() - 3 * 3600_000).toISOString()
    expect(relativeTime(d)).toBe('il y a 3h')
  })

  it('returns "hier" for 1 day ago', () => {
    const d = new Date(Date.now() - 26 * 3600_000).toISOString()
    expect(relativeTime(d)).toBe('hier')
  })

  it('returns days for 2-6 days ago', () => {
    const d = new Date(Date.now() - 3 * 86400_000).toISOString()
    expect(relativeTime(d)).toBe('il y a 3j')
  })

  it('returns formatted date for 7+ days ago', () => {
    const d = new Date(Date.now() - 10 * 86400_000).toISOString()
    const result = relativeTime(d)
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('returns formatted date fallback for invalid date (date-fns does not throw)', () => {
    // date-fns parseISO returns Invalid Date (doesn't throw),
    // so diffMin is NaN, no branch matches, falls through to fmtDate
    const result = relativeTime('not-valid')
    // fmtDate('not-valid') catches parseISO error and returns '—'
    expect(result).toBe('—')
  })
})

describe('fmtDuration', () => {
  it('returns only minutes when 0 hours', () => {
    expect(fmtDuration(300)).toBe('5min')
  })

  it('returns only hours when 0 minutes', () => {
    expect(fmtDuration(7200)).toBe('2h')
  })

  it('returns hours and minutes for mixed values', () => {
    expect(fmtDuration(5400)).toBe('1h 30min')
  })

  it('returns 0min for zero seconds', () => {
    expect(fmtDuration(0)).toBe('0min')
  })

  it('handles large durations with exact hours (no minutes)', () => {
    // When m=0, fmtDuration returns only hours: '10h'
    expect(fmtDuration(36000)).toBe('10h')
  })
})

describe('taskStatusColor', () => {
  it('returns color class for todo status', () => {
    const result = taskStatusColor('todo')
    expect(result).toContain('bg-')
  })

  it('returns color class for in_progress status', () => {
    const result = taskStatusColor('in_progress')
    expect(result).toContain('bg-')
  })

  it('returns color class for done status', () => {
    const result = taskStatusColor('done')
    expect(result).toContain('bg-')
  })

  it('handles en_cours mapping', () => {
    const result = taskStatusColor('en_cours')
    expect(result).toContain('bg-')
  })

  it('returns empty string for unknown status', () => {
    const result = taskStatusColor('unknown_status_xyz')
    expect(result).toBe('')
  })
})

describe('taskStatusLabel', () => {
  it('returns label for todo', () => {
    expect(taskStatusLabel('todo')).toBe('À faire')
  })

  it('returns label for in_progress', () => {
    expect(taskStatusLabel('in_progress')).toBe('En cours')
  })

  it('returns label for done', () => {
    expect(taskStatusLabel('done')).toBe('Terminée')
  })

  it('returns raw string for unknown status', () => {
    expect(taskStatusLabel('xyz')).toBe('xyz')
  })

  it('handles en_cours mapping', () => {
    expect(taskStatusLabel('en_cours')).toBe('En cours')
  })

  it('handles a_faire mapping', () => {
    expect(taskStatusLabel('a_faire')).toBe('À faire')
  })

  it('handles terminee mapping', () => {
    expect(taskStatusLabel('terminee')).toBe('Terminée')
  })
})
