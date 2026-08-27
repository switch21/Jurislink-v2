'use client'

// ═══════════════════════════════════════════════════════════════════
// JurisLink v3.8.66 — Orchestrator (split from monolithic page.tsx)
// Phase 5: Stabilisation & Performance
// View modules in src/views/
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { QueryClientProvider, TooltipProvider, useAppStore, Card, CardHeader, CardTitle, CardDescription, CardFooter, Button, Building2, cn, initAuthFetch } from '@/views/shared-ui'
import { queryClient } from '@/views/constants'

// View components
import { LoginPage } from '@/views/LoginPage'
import { Sidebar } from '@/views/Sidebar'
import { AdminSidebar } from '@/views/AdminSidebar'
import { AdminHeader } from '@/views/AdminHeader'
import { Header } from '@/views/Header'
import { DashboardView } from '@/views/DashboardView'
import { TasksView } from '@/views/TasksView'
import { CasesView } from '@/views/CasesView'
import { ClientsView } from '@/views/ClientsView'
import { DocumentsView } from '@/views/DocumentsView'
import { CalendarView } from '@/views/CalendarView'
import { InvoicesView } from '@/views/InvoicesView'
import { MessagesView } from '@/views/MessagesView'
import { ReportsView } from '@/views/ReportsView'
import { AuditLogsView } from '@/views/AuditLogsView'
import { SettingsView } from '@/views/SettingsView'
import { FinancesView } from '@/views/FinancesView'
import { NotificationsView } from '@/views/NotificationsView'
import { ArchivesView } from '@/views/ArchivesView'
import { ImpayesView } from '@/views/ImpayesView'
import { TimeTrackingView } from '@/views/TimeTrackingView'
import { TemplatesView } from '@/views/TemplatesView'
import { CommunicationsView } from '@/views/CommunicationsView'
import { AdminDashboardView, AdminCabinsView, AdminUsersView, AdminPlansView } from '@/views/AdminViews'
import { PortalSidebar, PortalHeader, PortalRouter } from '@/views/PortalViews'

// Patch fetch immediately at module load (before any React rendering)
if (typeof window !== 'undefined') initAuthFetch()


// ==================== FOOTER ====================
function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E5E7EB] py-4 px-6 flex items-center justify-between text-xs text-[#9CA3AF]">
      <span className="flex items-center gap-1.5"><img src="/icon.png" alt="" className="size-3.5 rounded-sm" />JurisLink</span>
      <span>v3.8.66</span>
    </footer>
  )
}

// ==================== ADMIN ROUTER ====================
function AdminRouter() {
  const { currentView } = useAppStore()
  switch (currentView) {
    case 'admin-dashboard': return <AdminDashboardView />
    case 'admin-cabinets': return <AdminCabinsView />
    case 'admin-users': return <AdminUsersView />
    case 'admin-plans': return <AdminPlansView />
    case 'settings': return <SettingsView />
    default: return <AdminDashboardView />
  }
}

// ==================== DASHBOARD ROUTER ====================
function DashboardRouter() {
  const { currentView } = useAppStore()
  switch (currentView) {
    case 'dashboard': return <DashboardView />
    case 'cases': return <CasesView />
    case 'clients': return <ClientsView />
    case 'tasks': return <TasksView />
    case 'documents': return <DocumentsView />
    case 'calendar': return <CalendarView />
    case 'invoices': return <InvoicesView />
    case 'finances': return <FinancesView />
    case 'impayes': return <ImpayesView />
    case 'time-tracking': return <TimeTrackingView />
    case 'templates': return <TemplatesView />
    case 'communications': return <CommunicationsView />
    case 'messages': return <MessagesView />
    case 'reports': return <ReportsView />
    case 'audit-logs': return <AuditLogsView />
    case 'settings': return <SettingsView />
    case 'archives': return <ArchivesView />
    case 'notifications': return <NotificationsView />
    default: return <DashboardView />
  }
}

// ==================== MAIN APP ====================
function AppInner() {
  const { isAuthenticated, isPortalAuthenticated, user } = useAppStore()
  const isRootAdmin = user?.role === 'root_admin'
  const needsTenant = isAuthenticated && !user?.tenantId && !isRootAdmin
  if (isPortalAuthenticated) return (
    <>
      <PortalSidebar />
      <div className='lg:pl-[260px] flex-1 flex flex-col'>
        <PortalHeader />
        <main className='flex-1'><PortalRouter /></main>
        <Footer />
      </div>
    </>
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
