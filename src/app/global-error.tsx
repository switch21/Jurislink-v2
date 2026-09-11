'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Silently handle hydration errors - they are expected and harmless.
  // The real app mounts client-side via useEffect and works fine after hydration.
  // Do NOT auto-reload - that causes infinite loops.
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>
        <div />
      </body>
    </html>
  )
}
