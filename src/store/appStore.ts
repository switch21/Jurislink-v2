import { create } from 'zustand'

export interface UserPermission {
  resource: string
  action: string
  allowed: boolean
}

export interface UserInfo {
  id: string
  email: string
  fullName: string
  role: string
  tenantId: string | null
  phone?: string | null
  avatarUrl?: string | null
  preferredLanguage?: string
  isActive?: boolean
  permissions?: UserPermission[]
}

export interface PortalClientInfo {
  id: string
  fullName: string
  company?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  niu?: string | null
}

export interface PortalTenantInfo {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  niu?: string | null
  currencyCode: string
}

export interface PortalUserInfo {
  id: string
  email: string
  clientId: string
  client: PortalClientInfo
  tenant: PortalTenantInfo
}

export type ViewName =
  | 'login'
  | 'dashboard'
  | 'clients'
  | 'cases'
  | 'documents'
  | 'calendar'
  | 'invoices'
  | 'messages'
  | 'tasks'
  | 'reports'
  | 'settings'
  | 'finances'
  | 'impayes'
  | 'notifications'
  | 'audit-logs'
  | 'archives'
  | 'time-tracking'
  | 'templates'
  | 'communications'
  | 'admin-dashboard'
  | 'admin-cabinets'
  | 'admin-users'
  | 'admin-plans'
  | 'portal-dashboard'
  | 'portal-cases'
  | 'portal-case-detail'
  | 'portal-invoices'
  | 'portal-documents'
  | 'portal-messages'
  | 'portal-profile'

export type PortalViewName =
  | 'portal-dashboard'
  | 'portal-cases'
  | 'portal-case-detail'
  | 'portal-invoices'
  | 'portal-documents'
  | 'portal-messages'
  | 'portal-profile'

interface AppState {
  user: UserInfo | null
  isAuthenticated: boolean
  currentView: ViewName
  sidebarOpen: boolean
  // Portal client state
  portalUser: PortalUserInfo | null
  isPortalAuthenticated: boolean
  portalCurrentView: PortalViewName
  portalSelectedCaseId: string | null
  // Actions
  login: (user: UserInfo) => void
  logout: () => void
  setCurrentView: (view: ViewName) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  hasPermission: (resource: string, action: string) => boolean
  // Portal actions
  portalLogin: (user: PortalUserInfo) => void
  portalLogout: () => void
  setPortalView: (view: PortalViewName) => void
  setPortalSelectedCaseId: (id: string | null) => void
}

const loadUser = (): UserInfo | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('jurislink_user')
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return null
}

const loadPortalUser = (): PortalUserInfo | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('jurislink_portal_user')
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return null
}

export const useAppStore = create<AppState>((set, get) => ({
  user: loadUser(),
  isAuthenticated: !!loadUser(),
  currentView: loadUser()?.role === 'root_admin' ? 'admin-dashboard' : (loadUser() ? 'dashboard' : 'login'),
  sidebarOpen: false,
  portalUser: loadPortalUser(),
  isPortalAuthenticated: !!loadPortalUser(),
  portalCurrentView: 'portal-dashboard',
  portalSelectedCaseId: null,
  login: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_user', JSON.stringify(user))
    }
    set({ user, isAuthenticated: true, currentView: user.role === 'root_admin' ? 'admin-dashboard' : 'dashboard' })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jurislink_user')
    }
    set({ user: null, isAuthenticated: false, currentView: 'login' })
  },
  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  hasPermission: (resource, action) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'root_admin') return true
    const perm = user.permissions?.find(
      (p) => p.resource === resource && p.action === action
    )
    return perm?.allowed ?? false
  },
  portalLogin: (portalUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_portal_user', JSON.stringify(portalUser))
    }
    set({ portalUser, isPortalAuthenticated: true, portalCurrentView: 'portal-dashboard', portalSelectedCaseId: null })
  },
  portalLogout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jurislink_portal_user')
    }
    set({ portalUser: null, isPortalAuthenticated: false, portalCurrentView: 'portal-dashboard', portalSelectedCaseId: null })
  },
  setPortalView: (view) => set({ portalCurrentView: view }),
  setPortalSelectedCaseId: (id) => set({ portalSelectedCaseId: id }),
}))
