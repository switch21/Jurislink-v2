'use client'

// ════════════════════════════════════════════════════════════════════════════
// JurisLink v3.8.71 — Orchestrator
// Phase 7: UI/UX Polish — Dark Mode, Animations, Responsive
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { QueryClientProvider, TooltipProvider, useAppStore, Card, CardHeader, CardTitle, CardDescription, CardFooter, Button, Building2, Skeleton, cn, initAuthFetch, motion, AnimatePresence } from '@/views/shared-ui'
import { queryClient } from '@/views/constants'
import { SearchDialog } from '@/views/SearchDialog'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'

// ──── Lazy-loaded guard (non-critical, loads after mount) ────
const LazyBeforeUnloadGuard = lazy(() => import('@/components/BeforeUnloadGuard').then(m => ({ default: m.BeforeUnloadGuard })))

// ──── Eagerly loaded (small, always-needed components) ────
import { LoginPage } from '@/views/LoginPage'
import { Sidebar } from '@/views/Sidebar'
import { AdminSidebar } from '@/views/AdminSidebar'
import { AdminHeader } from '@/views/AdminHeader'
import { Header } from '@/views/Header'
import { DashboardView } from '@/views/DashboardView'
import { TasksView } from '@/views/TasksView'
import { MessagesView } from '@/views/MessagesView'
import { AuditLogsView } from '@/views/AuditLogsView'
import { NotificationsView } from '@/views/NotificationsView'
import { ArchivesView } from '@/views/ArchivesView'
import { CommunicationsView } from '@/views/CommunicationsView'

// ──── Lazy-loaded views (heavy / rarely shown) ────
const LazyCasesView = lazy(() => import('@/views/CasesView').then(m => ({ default: m.CasesView })))
const LazyClientsView = lazy(() => import('@/views/ClientsView').then(m => ({ default: m.ClientsView })))
const LazyDocumentsView = lazy(() => import('@/views/DocumentsView').then(m => ({ default: m.DocumentsView })))
const LazyCalendarView = lazy(() => import('@/views/CalendarView').then(m => ({ default: m.CalendarView })))
const LazyInvoicesView = lazy(() => import('@/views/InvoicesView').then(m => ({ default: m.InvoicesView })))
const LazyReportsView = lazy(() => import('@/views/ReportsView').then(m => ({ default: m.ReportsView })))
const LazySettingsView = lazy(() => import('@/views/SettingsView').then(m => ({ default: m.SettingsView })))
const LazyFinancesView = lazy(() => import('@/views/FinancesView').then(m => ({ default: m.FinancesView })))
const LazyImpayesView = lazy(() => import('@/views/ImpayesView').then(m => ({ default: m.ImpayesView })))
const LazyTimeTrackingView = lazy(() => import('@/views/TimeTrackingView').then(m => ({ default: m.TimeTrackingView })))
const LazyTemplatesView = lazy(() => import('@/views/TemplatesView').then(m => ({ default: m.TemplatesView })))
const LazySearchView = lazy(() => import('@/views/SearchView').then(m => ({ default: m.SearchView })))
const LazyAdminDashboardView = lazy(() => import('@/views/AdminViews').then(m => ({ default: m.AdminDashboardView })))
const LazyAdminCabinsView = lazy(() => import('@/views/AdminViews').then(m => ({ default: m.AdminCabinsView })))
const LazyAdminUsersView = lazy(() => import('@/views/AdminViews').then(m => ({ default: m.AdminUsersView })))
const LazyAdminPlansView = lazy(() => import('@/views/AdminViews').then(m => ({ default: m.AdminPlansView })))
const LazyPortalSidebar = lazy(() => import('@/views/PortalViews').then(m => ({ default: m.PortalSidebar })))
const LazyPortalHeader = lazy(() => import('@/views/PortalViews').then(m => ({ default: m.PortalHeader })))
const LazyPortalRouter = lazy(() => import('@/views/PortalViews').then(m => ({ default: m.PortalRouter })))

// Patch fetch immediately at module load (before any React rendering)
if (typeof window !== 'undefined') initAuthFetch()

// ──── View Loading Fallback ────
function ViewLoader() {
  return (
    <div className='flex-1 flex items-center justify-center p-8'>
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <div className='flex items-center gap-3 w-full'>
          <div className='size-8 rounded-lg bg-[var(--primary-light)] animate-pulse' />\n          <div className='flex-1 space-y-2'>
            <Skeleton className='h-3.5 w-3/4 rounded' />
            <Skeleton className='h-3 w-1/2 rounded' />
          </div>
        </div>
        <Skeleton className='h-28 w-full rounded-xl' />
        <div className='grid grid-cols-2 gap-3 w-full'>
          <Skeleton className='h-20 rounded-xl' />
          <Skeleton className='h-20 rounded-xl' />
        </div>
        <p className='text-xs text-[var(--text-muted)] mt-2'>Chargement…</p>
      </div>
    </div>
  )
}

// ──── Switch Helper ────
function switchView(key: string, map: Record<string, React.ReactNode>, fallback: React.ReactNode): React.ReactNode {
  return map[key] ?? fallback
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] py-4 px-6 flex items-center justify-between text-xs text-[var(--text-muted)] transition-colors duration-300">
      <span className="flex items-center gap-1.5"><img src="/icon.png" alt="" className="size-3.5 rounded-sm" />JurisLink</span>
      <span>v3.8.71</span>
    </footer>
  )
}

// ==================== ADMIN ROUTER ====================
function AdminRouter() {
  const { currentView } = useAppStore()
  return (
    <Suspense fallback={<ViewLoader />}>
      <AnimatePresence mode='wait'>
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className='h-full'
        >
          {switchView(currentView, {
            'admin-dashboard': <LazyAdminDashboardView />,
            'admin-cabinets': <LazyAdminCabinsView />,
            'admin-users': <LazyAdminUsersView />,
            'admin-plans': <LazyAdminPlansView />,
            'settings': <LazySettingsView />,
          }, <LazyAdminDashboardView />)}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  )
}

// ==================== DASHBOARD ROUTER ====================
function DashboardRouter() {
  const { currentView } = useAppStore()
  return (
    <Suspense fallback={<ViewLoader />}>
      <AnimatePresence mode='wait'>
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className='h-full'
        >
          {switchView(currentView, {
            'dashboard': <DashboardView />,
            'cases': <LazyCasesView />,
            'clients': <LazyClientsView />,
            'tasks': <TasksView />,
            'documents': <LazyDocumentsView />,
            'calendar': <LazyCalendarView />,
            'invoices': <LazyInvoicesView />,
            'finances': <LazyFinancesView />,
            'impayes': <LazyImpayesView />,
            'time-tracking': <LazyTimeTrackingView />,
            'templates': <LazyTemplatesView />,
            'communications': <CommunicationsView />,
            'messages': <MessagesView />,
            'reports': <LazyReportsView />,
            'search': <LazySearchView />,
            'audit-logs': <AuditLogsView />,
            'settings': <LazySettingsView />,
            'archives': <ArchivesView />,
            'notifications': <NotificationsView />,
          }, <DashboardView />)}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  )
}

// ==================== CMD+K SEARCH PROVIDER ====================
const searchOpenState = { value: false, set: (v: boolean) => { searchOpenState.value = v } }

// Expose search open function globally for Header button
if (typeof window !== 'undefined') {
  (window as any).__jlOpenSearch = () => { searchOpenState.set(true) }
}

// ==================== MAIN APP ====================
function AppInner() {
  const { isAuthenticated, isPortalAuthenticated, user } = useAppStore()
  const isRootAdmin = user?.roleObj?.name === 'root_admin' || user?.role === 'root_admin'
  const needsTenant = isAuthenticated && !user?.tenantId && !isRootAdmin
  const [searchOpen, setSearchOpen] = useState(false)

  // Real-time notification WebSocket (only when authenticated with a tenant)
  useNotificationSocket()

  // Sync global state
  useEffect(() => {
    searchOpenState.set = setSearchOpen
  }, [])

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  if (isPortalAuthenticated) return (
    <>
    <Suspense fallback={<ViewLoader />}>
      <LazyPortalSidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <LazyPortalHeader />
        <main id='main-content' className='flex-1' role='main'><LazyPortalRouter /></main>
        <Footer />
      </div>
    </Suspense>
    <LazyBeforeUnloadGuard />
    </>
  )
  if (!isAuthenticated) return <LoginPage />
  if (needsTenant) return (
    <div className='flex-1 flex items-center justify-center p-4'>
      <Card className='max-w-md w-full animate-scale-in'>
        <CardHeader className='text-center'>
          <div className='mx-auto size-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-2'>
            <Building2 className='size-6 text-[var(--accent)]' />
          </div>
          <CardTitle>Configuration requise</CardTitle>
          <CardDescription>Vous n'êtes pas encore assigné à un cabinet. Contactez l'administrateur.</CardDescription>
        </CardHeader>
        <CardFooter className='justify-center'>
          <Button variant='outline' onClick={() => { localStorage.clear(); window.location.reload() }}>Se déconnecter</Button>
        </CardFooter>
      </Card>
    </div>
  )
  if (isRootAdmin) return (
    <>
      <AdminSidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <AdminHeader />
        <main id='main-content' className='flex-1' role='main'><AdminRouter /></main>
        <Footer />
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <LazyBeforeUnloadGuard />
    </>
  )
  return (
    <>
      <Sidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <Header />
        <main id='main-content' className='flex-1' role='main'><DashboardRouter /></main>
        <Footer />
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <LazyBeforeUnloadGuard />
    </>
  )
}

export default function App() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { initAuthFetch(); const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className='min-h-screen flex flex-col bg-[var(--bg-page)] transition-colors duration-300'>
          <a href='#main-content' className='skip-link'>Aller au contenu principal</a>
          <div className='flex-1 flex flex-col'>
            {!mounted ? (
              <div className='flex-1 flex items-center justify-center bg-[var(--bg-page)]'>
                <div className='flex flex-col items-center gap-3 animate-fade-in'>
                  <img src='/splash.png' alt='JurisLink' className='h-12 w-auto object-contain animate-pulse' />
                  <p className='text-sm text-[var(--text-muted)]'>Chargement…</p>
                </div>
              </div>
            ) : <AppInner />}
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
