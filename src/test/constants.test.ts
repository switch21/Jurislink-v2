import { describe, it, expect } from 'vitest'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  ROLE_LABELS,
  CHART_COLORS,
  CHART_COLORS_DARK,
  CRIT_COLORS,
  EVENT_TYPE_LABELS,
  RISK_COLORS,
  BILLING_LABELS,
  INVOICE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  CASE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  NAV_ITEMS,
  ADMIN_NAV_ITEMS,
} from '@/views/constants'

describe('STATUS_COLORS', () => {
  it('is a non-empty object', () => {
    expect(Object.keys(STATUS_COLORS).length).toBeGreaterThan(0)
  })

  it('every color value contains bg- class', () => {
    for (const [key, value] of Object.entries(STATUS_COLORS)) {
      expect(value, `STATUS_COLORS[${key}] should contain 'bg-'`).toContain('bg-')
    }
  })
})

describe('STATUS_LABELS', () => {
  it('has a label for every STATUS_COLORS key', () => {
    for (const key of Object.keys(STATUS_COLORS)) {
      expect(STATUS_LABELS[key], `STATUS_LABELS[${key}] should exist`).toBeDefined()
    }
  })

  it('all labels are non-empty strings', () => {
    for (const [key, value] of Object.entries(STATUS_LABELS)) {
      expect(typeof value).toBe('string')
      expect(value.length, `STATUS_LABELS[${key}] should not be empty`).toBeGreaterThan(0)
    }
  })
})

describe('PRIORITY_COLORS', () => {
  it('has entries for basse, normal, haute, urgente', () => {
    const expected = ['basse', 'normal', 'haute', 'urgente']
    for (const p of expected) {
      expect(PRIORITY_COLORS[p], `PRIORITY_COLORS[${p}] should exist`).toBeDefined()
    }
  })

  it('every color contains bg- class', () => {
    for (const [key, value] of Object.entries(PRIORITY_COLORS)) {
      expect(value, `PRIORITY_COLORS[${key}] should contain 'bg-'`).toContain('bg-')
    }
  })
})

describe('PRIORITY_LABELS', () => {
  it('has a label for every PRIORITY_COLORS key', () => {
    for (const key of Object.keys(PRIORITY_COLORS)) {
      expect(PRIORITY_LABELS[key], `PRIORITY_LABELS[${key}] should exist`).toBeDefined()
    }
  })
})

describe('TYPE_LABELS', () => {
  it('has entries for common case types', () => {
    const expected = ['civil', 'penal', 'commercial', 'social', 'administratif']
    for (const t of expected) {
      expect(TYPE_LABELS[t], `TYPE_LABELS[${t}] should exist`).toBeDefined()
    }
  })
})

describe('ROLE_LABELS', () => {
  it('covers all known roles in the system', () => {
    const knownRoles = [
      'root_admin', 'associate', 'firm_admin', 'lawyer', 'jurist',
      'assistant', 'accountant', 'client', 'secretary', 'collaborator',
    ]
    for (const r of knownRoles) {
      expect(ROLE_LABELS[r], `ROLE_LABELS[${r}] should exist`).toBeDefined()
    }
  })

  it('all role labels are non-empty strings', () => {
    for (const [key, value] of Object.entries(ROLE_LABELS)) {
      expect(typeof value).toBe('string')
      expect(value.length, `ROLE_LABELS[${key}] should not be empty`).toBeGreaterThan(0)
    }
  })
})

describe('CHART_COLORS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CHART_COLORS)).toBe(true)
    expect(CHART_COLORS.length).toBeGreaterThan(0)
  })

  it('every color is a valid hex color', () => {
    const hexRe = /^#[0-9a-fA-F]{3,8}$/
    for (const color of CHART_COLORS) {
      expect(hexRe.test(color), `${color} should be a valid hex color`).toBe(true)
    }
  })

  it('CHART_COLORS_DARK has same length as CHART_COLORS', () => {
    expect(CHART_COLORS_DARK.length).toBe(CHART_COLORS.length)
  })

  it('CHART_COLORS_DARK entries are valid hex colors', () => {
    const hexRe = /^#[0-9a-fA-F]{3,8}$/
    for (const color of CHART_COLORS_DARK) {
      expect(hexRe.test(color), `${color} should be a valid hex color`).toBe(true)
    }
  })
})

describe('CRIT_COLORS', () => {
  it('has entries for all priority levels', () => {
    const expected = ['basse', 'normal', 'haute', 'urgente']
    for (const c of expected) {
      expect(CRIT_COLORS[c], `CRIT_COLORS[${c}] should exist`).toBeDefined()
    }
  })

  it('values are valid Tailwind bg classes', () => {
    for (const [key, value] of Object.entries(CRIT_COLORS)) {
      expect(value, `CRIT_COLORS[${key}] should be a bg- class`).toContain('bg-')
    }
  })
})

describe('EVENT_TYPE_LABELS', () => {
  it('has entries for all event types', () => {
    const expected = ['audience', 'rdv', 'echeance', 'depot', 'autre']
    for (const e of expected) {
      expect(EVENT_TYPE_LABELS[e], `EVENT_TYPE_LABELS[${e}] should exist`).toBeDefined()
    }
  })
})

describe('RISK_COLORS', () => {
  it('has entries for faible, moyen, eleve', () => {
    expect(RISK_COLORS.faible).toBeDefined()
    expect(RISK_COLORS.moyen).toBeDefined()
    expect(RISK_COLORS.eleve).toBeDefined()
  })
})

describe('BILLING_LABELS', () => {
  it('covers common billing types', () => {
    const expected = ['forfait', 'horaire', 'abonnement', 'success_fee', 'provision']
    for (const b of expected) {
      expect(BILLING_LABELS[b], `BILLING_LABELS[${b}] should exist`).toBeDefined()
    }
  })
})

describe('INVOICE_TYPE_LABELS', () => {
  it('covers devis, facture, avoir, recu', () => {
    expect(INVOICE_TYPE_LABELS.devis).toBe('Devis')
    expect(INVOICE_TYPE_LABELS.facture).toBe('Facture')
    expect(INVOICE_TYPE_LABELS.avoir).toBe('Avoir')
    expect(INVOICE_TYPE_LABELS.recu).toBe('Reçu')
  })
})

describe('PAYMENT_METHOD_LABELS', () => {
  it('covers common payment methods', () => {
    const expected = ['especes', 'virement', 'mobile_money', 'carte', 'cheque']
    for (const p of expected) {
      expect(PAYMENT_METHOD_LABELS[p], `PAYMENT_METHOD_LABELS[${p}] should exist`).toBeDefined()
    }
  })
})

describe('CASE_STATUS_LABELS', () => {
  it('has labels for all case statuses', () => {
    const expected = ['nouveau', 'ouvert', 'en_cours', 'en_attente', 'clos', 'archive']
    for (const s of expected) {
      expect(CASE_STATUS_LABELS[s], `CASE_STATUS_LABELS[${s}] should exist`).toBeDefined()
    }
  })
})

describe('INVOICE_STATUS_LABELS', () => {
  it('has labels for all invoice statuses', () => {
    const expected = ['non_paye', 'partiel', 'paye', 'annule']
    for (const s of expected) {
      expect(INVOICE_STATUS_LABELS[s], `INVOICE_STATUS_LABELS[${s}] should exist`).toBeDefined()
    }
  })
})

describe('NAV_ITEMS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NAV_ITEMS)).toBe(true)
    expect(NAV_ITEMS.length).toBeGreaterThan(0)
  })

  it('each item has view, label, icon', () => {
    for (const item of NAV_ITEMS) {
      expect(item.view).toBeDefined()
      expect(item.label).toBeDefined()
      expect(item.icon).toBeDefined()
    }
  })

  it('has unique view names', () => {
    const views = NAV_ITEMS.map(n => n.view)
    expect(new Set(views).size).toBe(views.length)
  })
})

describe('ADMIN_NAV_ITEMS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(ADMIN_NAV_ITEMS)).toBe(true)
    expect(ADMIN_NAV_ITEMS.length).toBeGreaterThan(0)
  })

  it('includes admin-dashboard', () => {
    expect(ADMIN_NAV_ITEMS.some(n => n.view === 'admin-dashboard')).toBe(true)
  })
})

describe('Cross-consistency', () => {
  it('TASK_STATUS_MAP (in helpers) keys all have status colors', () => {
    // The task status map in helpers.tsx maps: todo, in_progress, done, en_cours, a_faire, terminee
    const taskStatusKeys = ['todo', 'in_progress', 'done', 'en_cours', 'a_faire', 'terminee', 'en_cours_t', 'annulee']
    for (const key of taskStatusKeys) {
      expect(STATUS_COLORS[key], `STATUS_COLORS[${key}] should exist for task status`).toBeDefined()
    }
  })

  it('all STATUS_COLORS keys have corresponding STATUS_LABELS', () => {
    for (const key of Object.keys(STATUS_COLORS)) {
      expect(STATUS_LABELS[key], `STATUS_LABELS[${key}] should exist`).toBeDefined()
    }
  })
})
