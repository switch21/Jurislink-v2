'use client'

import { useState, useEffect, useQuery, motion, AnimatePresence, useAppStore, cn, Button, X, Clock, ArrowRight, Crown , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'

// ══════════════════════════════════════════════════════════════
// Trial Banner — shows when user is in trial period
// Dismissible, remembers dismissal in localStorage
// ══════════════════════════════════════════════════════════════

const DISMISS_KEY = 'jurislink_trial_banner_dismissed'

type SettingsTab = string // Will be passed as 'abonnement' to SettingsView

export function TrialBanner() {
  const { user, setCurrentView } = useAppStore()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  // Check if previously dismissed
  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(DISMISS_KEY)
      if (wasDismissed) {
        setDismissed(true)
        return
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch subscription check
  const { data } = useQuery({
    queryKey: ['subscription-check', user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId) return null
      const params = new URLSearchParams()
      params.set('tenantId', user.tenantId)
      const res = await fetch(`/api/subscription/check?${params}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.tenantId && !dismissed,
    staleTime: 10 * 60 * 1000, // 10 min
    refetchOnWindowFocus: false,
  })

  const isTrial = data?.isTrial === true
  const trialExpired = data?.trialExpired === true
  const daysRemaining = data?.trialDaysRemaining ?? 0

  // Show banner with slide-in animation when trial data loads
  useEffect(() => {
    if (dismissed) return
    if ((isTrial || trialExpired) && !visible) {
      // Small delay for animation
      const timer = setTimeout(() => setVisible(true), 200)
      return () => clearTimeout(timer)
    }
  }, [isTrial, trialExpired, dismissed, visible])

  // Don't render if not in trial, expired, or dismissed
  if (!isTrial && !trialExpired) return null
  if (dismissed || !visible) return null

  const handleDismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch { /* ignore */ }
    setDismissed(true)
  }

  const handleUpgrade = () => {
    // Navigate to settings, subscription tab
    // The SettingsView reads a global ref or query param for initial tab
    // Using a simple approach: set a flag and navigate
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/?tab=abonnement')
    }
    setCurrentView('settings')
  }

  const isUrgent = isTrial && daysRemaining <= 3

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'relative z-50 border-b',
            isUrgent
              ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/15 dark:border-amber-500/20'
              : trialExpired
                ? 'bg-red-500/10 border-red-500/30 dark:bg-red-500/15 dark:border-red-500/20'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40'
          )}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 max-w-[1800px] mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'size-7 rounded-full flex items-center justify-center shrink-0',
                isUrgent
                  ? 'bg-amber-500/20'
                  : trialExpired
                    ? 'bg-red-500/20'
                    : 'bg-amber-500/15 dark:bg-amber-500/20'
              )}>
                {trialExpired ? (
                  <Crown className="size-3.5 text-red-500 dark:text-red-400" />
                ) : (
                  <Clock className={cn(
                    'size-3.5',
                    isUrgent
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-amber-600 dark:text-amber-400'
                  )} />
                )}
              </div>
              <p className={cn(
                'text-sm font-medium truncate',
                isUrgent
                  ? 'text-amber-800 dark:text-amber-300'
                  : trialExpired
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-amber-800 dark:text-amber-200'
              )}>
                {trialExpired
                  ? t('trial.expired')
                  : t('trial.banner').replace('{days}', String(daysRemaining))
                }
              </p>
              {isTrial && !trialExpired && isUrgent && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300">
                  {t('trial.daysRemaining').replace('{days}', String(daysRemaining))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={trialExpired ? 'destructive' : 'outline'}
                className={cn(
                  'h-8 text-xs font-medium rounded-lg gap-1.5',
                  trialExpired
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : isUrgent
                      ? 'border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30'
                      : 'border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30'
                )}
                onClick={handleUpgrade}
              >
                {t('trial.upgrade')}
                <ArrowRight className="size-3" />
              </Button>
              <button
                onClick={handleDismiss}
                className={cn(
                  'size-7 rounded-md flex items-center justify-center transition-colors',
                  'text-amber-600 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:bg-amber-800/30'
                )}
                aria-label={t('trial.close')}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}