'use client'

import { useState, useEffect } from 'react'

export default function Page() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    // Client-only: import the full app after mount
    import('./AppClient').then(mod => {
      setAppComponent(() => mod.default)
    })
  }, [])

  if (!AppComponent) return null
  return <AppComponent />
}
