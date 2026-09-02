'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useQuery, motion, AnimatePresence, useAppStore, cn, Button, Check, Crown, Star, Zap, Shield, ArrowRight, Building2, Users, FileText, BarChart3, Brain , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'
import { t } from '@/lib/i18n'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

interface PricingPlan {
  id: string
  name: string
  slug: string
  description: string | null
  prices: {
    monthly: number
    quarterly: number
    semiAnnual: number
    annual: number
  }
  maxUsers: number
  maxStorageGb: number
  maxCases: number
  hasAI: boolean
  features: string[]
  sortOrder: number
}

interface PricingData {
  plans: PricingPlan[]
  currency: { code: string; symbol: string }
  region: string
}

type Period = 'monthly' | 'quarterly' | 'semiAnnual' | 'annual'

// ══════════════════════════════════════════════════════════════
// Feature → translation key mapping
// ══════════════════════════════════════════════════════════════

const FEATURE_I18N: Record<string, string> = {
  cases: 'pricing.features.cases',
  clients: 'pricing.features.clients',
  calendar: 'pricing.features.calendar',
  documents: 'pricing.features.documents',
  invoicing: 'pricing.features.invoicing',
  reports: 'pricing.features.reports',
  search: 'pricing.features.search',
  teams: 'pricing.features.teams',
  workflow: 'pricing.features.workflow',
  ai: 'pricing.features.ai',
  document_analysis: 'pricing.features.documentAnalysis',
  documentAnalysis: 'pricing.features.documentAnalysis',
  conflict_detection: 'pricing.features.conflictDetection',
  conflictDetection: 'pricing.features.conflictDetection',
  communications: 'pricing.features.communications',
  time_tracking: 'pricing.features.timeTracking',
  timeTracking: 'pricing.features.timeTracking',
  templates: 'pricing.features.templates',
  portal: 'pricing.features.portal',
  api: 'pricing.features.api',
  priority_support: 'pricing.features.prioritySupport',
  prioritySupport: 'pricing.features.prioritySupport',
  dedicated_manager: 'pricing.features.dedicatedManager',
  dedicatedManager: 'pricing.features.dedicatedManager',
  custom_integration: 'pricing.features.customIntegration',
  customIntegration: 'pricing.features.customIntegration',
  audit_log: 'pricing.features.auditLog',
  auditLog: 'pricing.features.auditLog',
  advanced_security: 'pricing.features.advancedSecurity',
  advancedSecurity: 'pricing.features.advancedSecurity',
}

// ══════════════════════════════════════════════════════════════
// Plan icon mapping
// ══════════════════════════════════════════════════════════════

function PlanIcon({ slug, className }: { slug: string; className?: string }) {
  switch (slug) {
    case 'starter': return <Zap className={className} />
    case 'professional': return <Star className={className} />
    case 'enterprise': return <Building2 className={className} />
    default: return <Crown className={className} />
  }
}

// ══════════════════════════════════════════════════════════════
// Format price
// ══════════════════════════════════════════════════════════════

function formatPrice(amount: number, symbol: string): string {
  // For XAF (FCFA), no decimals
  if (symbol === 'FCFA') {
    return amount.toLocaleString('fr-FR') + ' ' + symbol
  }
  return symbol + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ══════════════════════════════════════════════════════════════
// Period label
// ══════════════════════════════════════════════════════════════

const PERIOD_LABELS: Record<Period, string> = {
  monthly: 'pricing.perMonth',
  quarterly: 'pricing.perQuarter',
  semiAnnual: 'pricing.perSemiAnnual',
  annual: 'pricing.perYear',
}

const PERIOD_TABS: { value: Period; labelKey: string; savings?: number }[] = [
  { value: 'monthly', labelKey: 'pricing.monthly' },
  { value: 'quarterly', labelKey: 'pricing.quarterly' },
  { value: 'semiAnnual', labelKey: 'pricing.semiAnnual' },
  { value: 'annual', labelKey: 'pricing.annual', savings: 20 },
]

// ══════════════════════════════════════════════════════════════
// Trust badges
// ══════════════════════════════════════════════════════════════

const TRUST_ITEMS = [
  { icon: Shield, labelKey: 'pricing.trust.security' },
  { icon: FileText, labelKey: 'pricing.trust.compliance' },
  { icon: BarChart3, labelKey: 'pricing.trust.backup' },
  { icon: Users, labelKey: 'pricing.trust.support' },
]

// ══════════════════════════════════════════════════════════════
// Skeleton loader
// ══════════════════════════════════════════════════════════════

function PricingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <div className="flex-1 flex flex-col items-center px-4 py-12 md:py-20">
        <div className="w-full max-w-5xl space-y-12">
          <div className="text-center space-y-4">
            <div className="h-8 w-64 mx-auto rounded-lg bg-[var(--border)] animate-pulse" />
            <div className="h-4 w-96 mx-auto rounded bg-[var(--border)] animate-pulse" />
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-9 w-28 rounded-lg bg-[var(--border)] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-[var(--border)] p-6 space-y-4">
                <div className="h-5 w-24 rounded bg-[var(--border)] animate-pulse" />
                <div className="h-10 w-32 rounded bg-[var(--border)] animate-pulse" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="h-4 w-full rounded bg-[var(--border)] animate-pulse" />
                  ))}
                </div>
                <div className="h-11 w-full rounded-lg bg-[var(--border)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Pricing Page
// ══════════════════════════════════════════════════════════════

export function PricingView() {
  const { setCurrentView, isAuthenticated } = useAppStore()
  const [period, setPeriod] = useState<Period>('monthly')

  // Fetch pricing data (public, no auth required)
  const { data, isLoading, error } = useQuery<PricingData>({
    queryKey: ['pricing'],
    queryFn: async () => {
      const res = await fetch('/api/pricing?region=auto')
      if (!res.ok) throw new Error('Failed to fetch pricing')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  })

  const plans = data?.plans ?? []
  const currency = data?.currency ?? { code: 'XAF', symbol: 'FCFA' }

  // Determine which plan is "popular" (professional)
  const popularSlug = 'professional'

  const handleBack = useCallback(() => {
    setCurrentView('login')
  }, [setCurrentView])

  // ── Loading state ──
  if (isLoading) return <PricingSkeleton />

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] transition-colors duration-300">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--primary)]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--primary)]/5 blur-3xl" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 py-12 md:py-20">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium mb-2">
              <Crown className="size-3.5" />
              <span>JurisLink</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text)] tracking-tight">
              {t('pricing.title')}
            </h1>
            <p className="text-base md:text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          {/* Trial banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <div className="mx-auto max-w-2xl rounded-xl border border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-[var(--primary)]/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-[var(--text)]">
                <div className="size-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center shrink-0">
                  <Zap className="size-4 text-[var(--primary)]" />
                </div>
                <span>{t('pricing.trialBanner')}</span>
              </div>
              <Button
                size="sm"
                className="shrink-0 bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)]"
              >
                {t('pricing.startTrial')}
                <ArrowRight className="size-3.5 ms-2" />
              </Button>
            </div>
          </motion.div>

          {/* Period selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {PERIOD_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setPeriod(tab.value)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  period === tab.value
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
                )}
              >
                {t(tab.labelKey)}
                {tab.savings && (
                  <span className={cn(
                    'ms-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    period === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  )}>
                    {t('pricing.annualSavings').replace('{pct}', String(tab.savings))}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <AnimatePresence mode="wait">
              {plans.map((plan, index) => {
                const isPopular = plan.slug === popularSlug
                const isEnterprise = plan.slug === 'enterprise'
                const price = plan.prices[period]

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    className={cn(
                      'relative rounded-2xl border p-6 lg:p-8 flex flex-col transition-all duration-300',
                      isPopular
                        ? 'border-[var(--primary)] bg-[var(--card)] shadow-lg shadow-[var(--primary)]/10 ring-1 ring-[var(--primary)]/20'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 hover:shadow-md'
                    )}
                  >
                    {/* Popular badge */}
                    {isPopular && (
                      <div className="absolute -top-3 inset-x-0 flex justify-center">
                        <span className="px-3 py-1 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold shadow-sm">
                          {t('pricing.mostPopular')}
                        </span>
                      </div>
                    )}

                    {/* Plan header */}
                    <div className="mb-6">
                      <div className={cn(
                        'size-10 rounded-xl flex items-center justify-center mb-4',
                        isPopular
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                          : 'bg-[var(--border)] text-[var(--text-muted)]'
                      )}>
                        <PlanIcon slug={plan.slug} className="size-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {t(`pricing.${plan.slug}`) || plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">{plan.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {isEnterprise ? (
                        <div className="space-y-1">
                          <span className="text-3xl font-bold text-[var(--text)]">{t('pricing.unlimited')}</span>
                          <p className="text-xs text-[var(--text-muted)]">{t('pricing.contactUs')}</p>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl md:text-4xl font-bold text-[var(--text)]">
                            {formatPrice(price, currency.symbol)}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {t(PERIOD_LABELS[period])}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Limits info */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {plan.maxUsers > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--border)]/50 text-[var(--text-muted)]">
                          {t('pricing.maxUsers').replace('{n}', String(plan.maxUsers))}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                          {t('pricing.maxUsers').replace('{n}', '∞')}
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 rounded-md bg-[var(--border)]/50 text-[var(--text-muted)]">
                        {t('pricing.maxStorage').replace('{n}', String(plan.maxStorageGb))}
                      </span>
                      {plan.maxCases > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--border)]/50 text-[var(--text-muted)]">
                          {t('pricing.maxCases').replace('{n}', String(plan.maxCases))}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                          {t('pricing.maxCases').replace('{n}', '∞')}
                        </span>
                      )}
                      {plan.hasAI && (
                        <span className="text-xs px-2 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center gap-1">
                          <Brain className="size-3" />
                          {t('pricing.includesAI')}
                        </span>
                      )}
                    </div>

                    {/* Separator */}
                    <div className="border-t border-[var(--border)] my-4" />

                    {/* Features list */}
                    <ul className="flex-1 space-y-3 mb-8">
                      {plan.features.map((feature, i) => {
                        const label = t(FEATURE_I18N[feature] || feature)
                        return (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                            <Check className={cn(
                              'size-4 shrink-0 mt-0.5',
                              isPopular ? 'text-[var(--primary)]' : 'text-emerald-500 dark:text-emerald-400'
                            )} />
                            <span>{label}</span>
                          </li>
                        )
                      })}
                    </ul>

                    {/* CTA Button */}
                    <div className="mt-auto">
                      {isEnterprise ? (
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-xl border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/50 font-medium"
                          onClick={() => {
                            if (isAuthenticated) {
                              setCurrentView('settings')
                            }
                          }}
                        >
                          {t('pricing.contactUs')}
                          <ArrowRight className="size-4 ms-2" />
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            'w-full h-11 rounded-xl font-medium transition-all duration-200',
                            isPopular
                              ? 'bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20'
                              : 'bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--text)]'
                          )}
                          onClick={() => {
                            if (isAuthenticated) {
                              setCurrentView('settings')
                            }
                          }}
                        >
                          {t('pricing.choosePlan')}
                          <ArrowRight className="size-4 ms-2" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Error state */}
          {error && (
            <div className="mt-8 text-center">
              <p className="text-sm text-red-500">{t('common.error')}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-[var(--primary)] hover:underline mt-1"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Trust section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-16 text-center space-y-6"
          >
            <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {t('pricing.trust.title')}
            </p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {TRUST_ITEMS.map((item) => (
                <div key={item.labelKey} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <item.icon className="size-4 text-[var(--primary)]" />
                  <span>{t(item.labelKey)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-[var(--border)] py-4 px-6 flex items-center justify-between text-xs text-[var(--text-muted)] bg-[var(--card)] transition-colors duration-300">
        <div className="flex items-center gap-4 mx-auto w-full max-w-5xl">
          <span className="flex items-center gap-1.5">
            <img src="/icon.png" alt="" className="size-3.5 rounded-sm" />
            JurisLink
          </span>
          <span className="hidden sm:inline">© 2025 — {t('login.copyright').replace('© 2025 JurisLink — ', '')}</span>
          {!isAuthenticated && (
            <button
              onClick={handleBack}
              className="ms-auto flex items-center gap-1 text-[var(--primary)] hover:underline"
            >
              {t('pricing.backToLogin')}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}