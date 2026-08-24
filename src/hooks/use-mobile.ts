import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const mql = React.useMemo(
    () => typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`) : null,
    []
  )
  const [isMobile, setIsMobile] = React.useState(() => mql?.matches ?? false)

  React.useEffect(() => {
    if (!mql) return
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [mql])

  return isMobile
}
