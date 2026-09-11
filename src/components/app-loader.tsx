'use client'

import { useState, useEffect, type ComponentType } from 'react'

// This module is dynamically imported by ClientShell (ssr: false).
// It stays under Turbopack's dependency-inline threshold because it has
// minimal imports. Inside useEffect (client-only), it dynamically imports
// AppClient — ensuring ALL of AppClient's heavy deps (recharts, sonner,
// date-fns locales, 30+ lucide icons, 20+ shadcn components) are loaded
// AFTER React hydration is complete, preventing error #185.
export default function AppLoader() {
  const [Mod, setMod] = useState<ComponentType | null>(null)

  useEffect(() => {
    import('./AppClient').then((m) => setMod(() => m.default))
  }, [])

  if (!Mod) return null
  return <Mod />
}
