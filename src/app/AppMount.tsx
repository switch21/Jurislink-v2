'use client'

import { useState, useEffect } from 'react'

export function AppMount() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    import('./AppClient').then(mod => {
      setAppComponent(() => mod.default)
    })
  }, [])

  if (!AppComponent) return null
  return <AppComponent />
}
