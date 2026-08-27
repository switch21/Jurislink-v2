'use client'

// ════════════════════════════════════════════════════════════════════════════
// JurisLink v3.8.67 — Orchestrator (split from monolithic page.tsx)
// Phase 6: Bundle Optimization — Lazy Loading Views
// View modules in src/views/
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, lazy, Suspense } from 'react'
import { QueryClientProvider, TooltipProvider, useAppStore, Card, CardHeader, CardTitle, CardDescription, CardFooter, Button, Building2, Skeleton, cn, initAuthFetch } from '@/views/shared-ui'
import { queryClient } from '@/views/constants'

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
        <Skeleton className='h-4 w-3/4 rounded' />
        <Skeleton className='h-4 w-1/2 rounded' />
        <Skeleton className='h-32 w-full rounded-lg' />
        <Skeleton className='h-4 w-2/3 rounded' />
        <Skeleton className='h-4 w-1/3 rounded' />
        <p className='text-xs text-[#9CA3AF] mt-2'>Chargement de la vue…</p>
      </div>
    </div>
  )
}

// ──── Switch Helper (replaces verbose switch/case) ────
function switchView(key: string, map: Record<string, React.ReactNode>, fallback: React.ReactNode): React.ReactNode {
  return map[key] ?? fallback
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E5E7EB] py-4 px-6 flex items-center justify-between text-xs text-[#9CA3AF]">
      <span className="flex items-center gap-1.5"><img src="/icon.png" alt="" className="size-3.5 rounded-sm" />JurisLink</span>
      <span>v3.8.67</span>
    </footer>
  )
}

// ==================== ADMIN ROUTER ====================
function AdminRouter() {
  const { currentView } = useAppStore()
  return (
    <Suspense fallback={<ViewLoader />}>
      {switchView(currentView, {
        'admin-dashboard': <LazyAdminDashboardView />,
        'admin-cabinets': <LazyAdminCabinsView />,
        'admin-users': <LazyAdminUsersView />,
        'admin-plans': <LazyAdminPlansView />,
        'settings': <LazySettingsView />,
      }, <LazyAdminDashboardView />)}
    </Suspense>
  )
}

// ==================== DASHBOARD ROUTER ====================
function DashboardRouter() {
  const { currentView } = useAppStore()
  return (
    <Suspense fallback={<ViewLoader />}>
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
        'audit-logs': <AuditLogsView />,
        'settings': <LazySettingsView />,
        'archives': <ArchivesView />,
        'notifications': <NotificationsView />,
      }, <DashboardView />)}
    </Suspense>
  )
}

// ==================== MAIN APP ====================
function AppInner() {
  const { isAuthenticated, isPortalAuthenticated, user } = useAppStore()
  const isRootAdmin = user?.role === 'root_admin'
  const needsTenant = isAuthenticated && !user?.tenantId && !isRootAdmin
  if (isPortalAuthenticated) return (
    <Suspense fallback={<ViewLoader />}>
      <LazyPortalSidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <LazyPortalHeader />
        <main className='flex-1'><LazyPortalRouter /></main>
        <Footer />
      </div>
    </Suspense>
  )
  if (!isAuthenticated) return <LoginPage />
  if (needsTenant) return (
    <div className='flex-1 flex items-center justify-center p-4'>
      <Card className='max-w-md w-full'>
        <CardHeader className='text-center'>
          <Building2 className='mx-auto size-12 text-[#C8A45D] mb-2' />
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
        <main className='flex-1'><AdminRouter /></main>
        <Footer />
      </div>
    </>
  )
  return (
    <>
      <Sidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <Header />
        <main className='flex-1'><DashboardRouter /></main>
        <Footer />
      </div>
    </>
  )
}

export default function App() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { initAuthFetch(); const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className='min-h-screen flex flex-col bg-[#F5F7FA]'>
          <div className='flex-1 flex flex-col'>
            {!mounted ? (
              <div className='flex-1 flex items-center justify-center bg-[#F5F7FA]'>
                <div className='flex flex-col items-center gap-3'>
                  <img src='/splash.png' alt='JurisLink' className='h-12 w-auto object-contain animate-pulse' />
                  <p className='text-sm text-[#9CA3AF]'>Chargement…</p>
                </div>
              </div>
            ) : <AppInner />}
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
