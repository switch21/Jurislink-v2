'use client'

import { motion, AnimatePresence, Sun, Moon, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useTheme , statusLabel, priorityLabel, typeLabel, eventTypeLabel, roleLabel, billingLabel, invoiceTypeLabel, invoiceStatusLabel, paymentMethodLabel, commTypeLabel, commStatusLabel, riskLabel, outcomeLabel, payStatusLabel, timelineTypeLabel, ROLE_OPTIONS } from './shared-ui'

// ==================== Theme Toggle ====================
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className='relative size-9'
            aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            <AnimatePresence mode='wait' initial={false}>
              {isDark ? (
                <motion.div
                  key='sun'
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: 90, scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className='size-[18px] text-[var(--accent)]' />
                </motion.div>
              ) : (
                <motion.div
                  key='moon'
                  initial={{ rotate: 90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: -90, scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className='size-[18px] text-[var(--text-secondary)]' />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isDark ? 'Mode clair' : 'Mode sombre'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
