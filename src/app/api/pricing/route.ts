import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// ── Currency configuration ─────────────────────────────────────────

interface CurrencyConfig {
  code: string
  symbol: string
  rateToXaf: number // 1 unit of this currency = ? XAF
}

const CURRENCIES: Record<string, CurrencyConfig> = {
  XAF: { code: 'XAF', symbol: 'FCFA', rateToXaf: 1 },
  EUR: { code: 'EUR', symbol: '€', rateToXaf: 655.96 },
  USD: { code: 'USD', symbol: '$', rateToXaf: 601.50 },
  GBP: { code: 'GBP', symbol: '£', rateToXaf: 783.50 },
}

// Accept-Language locale → currency mapping
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  // XAF countries (CM, FR/BE/CA/CI/SN/TG/CD)
  'cm': 'XAF',
  'ci': 'XAF',
  'sn': 'XAF',
  'tg': 'XAF',
  'cd': 'XAF',
  // XAF for French (used in FR/BE/CA as well in this app context)
  'fr': 'XAF',
  // EUR countries
  'de': 'EUR',
  'it': 'EUR',
  'es': 'EUR',
  // GBP
  'gb': 'GBP',
  'uk': 'GBP',
  // USD
  'us': 'USD',
  'ng': 'USD',
  'ke': 'USD',
}

// Explicit region → currency override via ?region= query param
const REGION_CURRENCY_MAP: Record<string, string> = {
  'CM': 'XAF',
  'FR': 'XAF',
  'BE': 'XAF',
  'CA': 'XAF',
  'CI': 'XAF',
  'SN': 'XAF',
  'TG': 'XAF',
  'CD': 'XAF',
  'DE': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'GB': 'GBP',
  'US': 'USD',
  'NG': 'USD',
  'KE': 'USD',
}

/**
 * Detect currency from request.
 * Priority: ?region= query param > Accept-Language header > default XAF
 */
function detectCurrency(request: Request): { currency: CurrencyConfig; region: string } {
  const url = new URL(request.url)
  const regionParam = (url.searchParams.get('region') || '').toUpperCase()

  // 1. Explicit ?region= query param
  if (regionParam && REGION_CURRENCY_MAP[regionParam]) {
    const code = REGION_CURRENCY_MAP[regionParam]
    return { currency: CURRENCIES[code], region: regionParam }
  }

  // 2. Accept-Language header
  const acceptLang = request.headers.get('accept-language') || ''
  // Extract locale code (e.g. "fr-FR" → "fr", "en-US" → "en")
  const localeMatch = acceptLang.match(/^([a-zA-Z]{2})/)
  const locale = localeMatch ? localeMatch[1].toLowerCase() : ''

  if (locale && LOCALE_CURRENCY_MAP[locale]) {
    const code = LOCALE_CURRENCY_MAP[locale]
    return { currency: CURRENCIES[code], region: locale.toUpperCase() }
  }

  // 3. Default
  return { currency: CURRENCIES['XAF'], region: 'CM' }
}

/**
 * Convert a price from XAF (base currency in DB) to target currency.
 */
function convertPrice(priceXaf: number, currency: CurrencyConfig): number {
  if (currency.code === 'XAF') return priceXaf
  return Math.round((priceXaf / currency.rateToXaf) * 100) / 100
}

// ── GET handler ────────────────────────────────────────────────────

export async function GET(request: Request) {
  const db = getDb()
  try {
    const { currency, region } = detectCurrency(request)

    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    const formattedPlans = plans.map(plan => {
      let features: string[] = []
      try {
        features = JSON.parse(plan.features)
      } catch {
        features = []
      }

      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        prices: {
          monthly: convertPrice(plan.priceMonthly, currency),
          quarterly: convertPrice(plan.priceQuarterly, currency),
          semiAnnual: convertPrice(plan.priceSemiAnnual, currency),
          annual: convertPrice(plan.priceAnnual, currency),
        },
        maxUsers: plan.maxUsers,
        maxStorageGb: plan.maxStorageGb,
        maxCases: plan.maxCases,
        hasAI: plan.hasAI,
        features,
        sortOrder: plan.sortOrder,
      }
    })

    return NextResponse.json({
      plans: formattedPlans,
      currency: { code: currency.code, symbol: currency.symbol },
      region,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur lors de la récupération des tarifs:', message)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tarifs' },
      { status: 500 },
    )
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
