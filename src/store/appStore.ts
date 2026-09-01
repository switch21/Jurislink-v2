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
  roleObj?: { id: string; name: string; label: string; level: number; isSystem: boolean }
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
  | 'search'
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
  | 'portal-notifications'
  | 'portal-profile'

interface AppState {
  user: UserInfo | null
  isAuthenticated: boolean
  currentView: ViewName
  sidebarOpen: boolean
  // Notification state (real-time via WebSocket)
  unreadCount: number
  lastNotification: { title: string; message: string; resourceType?: string | null; resourceId?: string | null } | null
  // Deep-linking: when a notification is clicked, set this so the target view opens the resource
  pendingResourceOpen: { resourceType: string; resourceId: string } | null
  // Portal client state
  portalUser: PortalUserInfo | null
  isPortalAuthenticated: boolean
  portalCurrentView: PortalViewName
  portalSelectedCaseId: string | null
  // Portal notification state
  portalUnreadCount: number
  // Form dirty state (for beforeunload guard)
  hasUnsavedChanges: boolean
  // Actions
  login: (user: UserInfo) => void
  logout: () => void
  setCurrentView: (view: ViewName) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  hasPermission: (resource: string, action: string) => boolean
  // Notification actions
  incrementUnread: () => void
  setUnreadCount: (n: number) => void
  setLastNotification: (n: { title: string; message: string; resourceType?: string | null; resourceId?: string | null } | null) => void
  // Deep-linking action
  setPendingResourceOpen: (v: { resourceType: string; resourceId: string } | null) => void
  // Portal actions
  portalLogin: (user: PortalUserInfo) => void
  portalLogout: () => void
  setPortalView: (view: PortalViewName) => void
  setPortalSelectedCaseId: (id: string | null) => void
  // Portal notification actions
  setPortalUnreadCount: (n: number) => void
  incrementPortalUnread: () => void
  // Unsaved changes
  setHasUnsavedChanges: (dirty: boolean) => void
}

const loadUser = (): UserInfo | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('jurislink_user')
    if (stored) {
      const user = JSON.parse(stored)
      // Normalize role from roleObj.name (fix for cached sessions with wrong role)
      if (user.roleObj?.name) {
        user.role = user.roleObj.name
      }
      return user
    }
  } catch {
    // ignore
  }
  return null
}

const loadPortalUnread = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem('jurislink_portal_unread')
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return 0
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

const loadSavedView = (): ViewName => {
  if (typeof window === 'undefined') return 'login'
  try {
    const stored = localStorage.getItem('jurislink_current_view')
    if (stored) return stored as ViewName
  } catch { /* ignore */ }
  return 'login'
}

const loadSavedPortalView = (): PortalViewName => {
  if (typeof window === 'undefined') return 'portal-dashboard'
  try {
    const stored = localStorage.getItem('jurislink_portal_view')
    if (stored) return stored as PortalViewName
  } catch { /* ignore */ }
  return 'portal-dashboard'
}

export const useAppStore = create<AppState>((set, get) => ({
  user: loadUser(),
  isAuthenticated: !!loadUser(),
  currentView: loadSavedView(),
  sidebarOpen: false,
  unreadCount: 0,
  lastNotification: null,
  pendingResourceOpen: null,
  portalUser: loadPortalUser(),
  isPortalAuthenticated: !!loadPortalUser(),
  portalCurrentView: loadSavedPortalView(),
  portalSelectedCaseId: null,
  portalUnreadCount: loadPortalUnread(),
  hasUnsavedChanges: false,
  login: (user) => {
    // Normalize role: use roleObj.name if available (Prisma @default('lawyer') overrides the real role)
    const normalized = { ...user, role: user.roleObj?.name || user.role }
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_user', JSON.stringify(normalized))
    }
    set({ user: normalized, isAuthenticated: true, currentView: normalized.role === 'root_admin' ? 'admin-dashboard' : 'dashboard' })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jurislink_user')
      localStorage.removeItem('jurislink_current_view')
    }
    set({ user: null, isAuthenticated: false, currentView: 'login' })
  },
  setCurrentView: (view) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_current_view', view)
    }
    set({ currentView: view })
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  hasPermission: (resource, action) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'root_admin' || user.roleObj?.name === 'root_admin') return true
    const perm = user.permissions?.find(
      (p) => p.resource === resource && p.action === action
    )
    return perm?.allowed ?? false
  },
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setUnreadCount: (n) => set({ unreadCount: n }),
  setLastNotification: (n) => set({ lastNotification: n }),
  setPendingResourceOpen: (v) => set({ pendingResourceOpen: v }),
  portalLogin: (portalUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_portal_user', JSON.stringify(portalUser))
    }
    set({ portalUser, isPortalAuthenticated: true, portalCurrentView: 'portal-dashboard', portalSelectedCaseId: null })
  },
  portalLogout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jurislink_portal_user')
      localStorage.removeItem('jurislink_portal_view')
    }
    set({ portalUser: null, isPortalAuthenticated: false, portalCurrentView: 'portal-dashboard', portalSelectedCaseId: null })
  },
  setPortalView: (view) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_portal_view', view)
    }
    set({ portalCurrentView: view })
  },
  setPortalSelectedCaseId: (id) => set({ portalSelectedCaseId: id }),
  setPortalUnreadCount: (n) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_portal_unread', JSON.stringify(n))
    }
    set({ portalUnreadCount: n })
  },
  incrementPortalUnread: () => {
    const next = get().portalUnreadCount + 1
    if (typeof window !== 'undefined') {
      localStorage.setItem('jurislink_portal_unread', JSON.stringify(next))
    }
    set({ portalUnreadCount: next })
  },
  setHasUnsavedChanges: (dirty) => set({ hasUnsavedChanges: dirty }),
}))
