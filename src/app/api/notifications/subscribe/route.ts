import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth-server'

const DEFAULT_PREFERENCES = {
  dossier: true,
  facture: true,
  tache: true,
  evenement: true,
  message: true,
  systeme: true,
  document: true,
}

/**
 * Validate and return notification preferences.
 * Preferences are stored client-side (localStorage) — this API validates
 * and returns defaults. No server-side storage needed.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const prefs = body.preferences as Record<string, unknown> | undefined

    if (prefs) {
      // Validate: only known keys, boolean values
      const validKeys = new Set(Object.keys(DEFAULT_PREFERENCES))
      const validated: Record<string, boolean> = {}
      for (const [key, value] of Object.entries(prefs)) {
        if (validKeys.has(key)) {
          validated[key] = typeof value === 'boolean' ? value : DEFAULT_PREFERENCES[key as keyof typeof DEFAULT_PREFERENCES]
        }
      }
      return NextResponse.json({ ok: true, preferences: { ...DEFAULT_PREFERENCES, ...validated } })
    }

    return NextResponse.json({ ok: true, preferences: DEFAULT_PREFERENCES })
  } catch {
    return NextResponse.json({ ok: true, preferences: DEFAULT_PREFERENCES })
  }
}

export async function GET() {
  return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
}
