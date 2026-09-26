'use client'

import { useEffect } from 'react'
import { useLocaleStore, RTL_LOCALES } from '@/lib/i18n'

/**
 * Syncs the <html> element's lang and dir attributes with the i18n locale store.
 * This MUST run in a useEffect (never during render) to avoid React error #185
 * (hydration attribute mismatch) in React 19.
 *
 * Place this inside <ThemeProvider> in layout.tsx so it runs after hydration.
 */
export function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
  }, [locale])

  return null
}
