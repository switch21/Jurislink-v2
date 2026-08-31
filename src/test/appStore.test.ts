import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '@/store/appStore'
import type { UserInfo } from '@/store/appStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('appStore', () => {
  beforeEach(() => {
    // Reset the store between tests
    useAppStore.setState({
      user: null,
      isAuthenticated: false,
      currentView: 'login',
      sidebarOpen: false,
      unreadCount: 0,
      lastNotification: null,
      portalUser: null,
      isPortalAuthenticated: false,
      portalCurrentView: 'portal-dashboard',
      portalSelectedCaseId: null,
    })
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has user as null', () => {
      expect(useAppStore.getState().user).toBeNull()
    })

    it('has isAuthenticated as false', () => {
      expect(useAppStore.getState().isAuthenticated).toBe(false)
    })

    it('has currentView as login', () => {
      expect(useAppStore.getState().currentView).toBe('login')
    })

    it('has sidebarOpen as false', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('has unreadCount as 0', () => {
      expect(useAppStore.getState().unreadCount).toBe(0)
    })

    it('has lastNotification as null', () => {
      expect(useAppStore.getState().lastNotification).toBeNull()
    })
  })

  describe('login', () => {
    const lawyerUser: UserInfo = {
      id: 'user-1',
      email: 'lawyer@test.com',
      fullName: 'Jean Avocat',
      role: 'lawyer',
      tenantId: 'tenant-1',
    }

    it('sets user and isAuthenticated', () => {
      useAppStore.getState().login(lawyerUser)
      const state = useAppStore.getState()
      expect(state.user).not.toBeNull()
      expect(state.isAuthenticated).toBe(true)
    })

    it('sets currentView to dashboard for regular user', () => {
      useAppStore.getState().login(lawyerUser)
      expect(useAppStore.getState().currentView).toBe('dashboard')
    })

    it('normalizes role from roleObj.name', () => {
      const userWithRoleObj: UserInfo = {
        ...lawyerUser,
        role: 'lawyer', // Prisma default, should be overridden
        roleObj: { id: 'role-1', name: 'associate', label: 'Associé', level: 80, isSystem: true },
      }
      useAppStore.getState().login(userWithRoleObj)
      expect(useAppStore.getState().user!.role).toBe('associate')
    })

    it('sets currentView to admin-dashboard for root_admin', () => {
      const adminUser: UserInfo = {
        ...lawyerUser,
        role: 'root_admin',
        roleObj: { id: 'role-0', name: 'root_admin', label: 'Admin Racine', level: 100, isSystem: true },
      }
      useAppStore.getState().login(adminUser)
      expect(useAppStore.getState().currentView).toBe('admin-dashboard')
    })

    it('persists user to localStorage', () => {
      useAppStore.getState().login(lawyerUser)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'jurislink_user',
        expect.stringContaining('lawyer@test.com'),
      )
    })
  })

  describe('logout', () => {
    it('clears user and sets isAuthenticated to false', () => {
      // First login
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Test', role: 'lawyer', tenantId: 't1',
      })
      // Then logout
      useAppStore.getState().logout()
      expect(useAppStore.getState().user).toBeNull()
      expect(useAppStore.getState().isAuthenticated).toBe(false)
    })

    it('sets currentView to login', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Test', role: 'lawyer', tenantId: 't1',
      })
      useAppStore.getState().logout()
      expect(useAppStore.getState().currentView).toBe('login')
    })

    it('removes user from localStorage', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Test', role: 'lawyer', tenantId: 't1',
      })
      useAppStore.getState().logout()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('jurislink_user')
    })
  })

  describe('setCurrentView', () => {
    it('updates currentView', () => {
      useAppStore.getState().setCurrentView('cases')
      expect(useAppStore.getState().currentView).toBe('cases')
    })
  })

  describe('toggleSidebar', () => {
    it('toggles sidebarOpen', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(false)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(true)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('setSidebarOpen', () => {
    it('sets sidebarOpen to true', () => {
      useAppStore.getState().setSidebarOpen(true)
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('sets sidebarOpen to false', () => {
      useAppStore.getState().setSidebarOpen(true)
      useAppStore.getState().setSidebarOpen(false)
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('returns false when no user', () => {
      expect(useAppStore.getState().hasPermission('case', 'view')).toBe(false)
    })

    it('returns true for root_admin role', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Admin', role: 'root_admin', tenantId: null,
      })
      expect(useAppStore.getState().hasPermission('anything', 'anything')).toBe(true)
    })

    it('returns true for root_admin via roleObj.name', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Admin', role: 'lawyer',
        roleObj: { id: 'r0', name: 'root_admin', label: 'Admin', level: 100, isSystem: true },
        tenantId: null,
      })
      expect(useAppStore.getState().hasPermission('anything', 'anything')).toBe(true)
    })

    it('returns true when matching permission exists with allowed=true', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Lawyer', role: 'lawyer', tenantId: 't1',
        permissions: [
          { resource: 'case', action: 'view', allowed: true },
        ],
      })
      expect(useAppStore.getState().hasPermission('case', 'view')).toBe(true)
    })

    it('returns false when matching permission exists with allowed=false', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Lawyer', role: 'lawyer', tenantId: 't1',
        permissions: [
          { resource: 'case', action: 'delete', allowed: false },
        ],
      })
      expect(useAppStore.getState().hasPermission('case', 'delete')).toBe(false)
    })

    it('returns false when no matching permission found', () => {
      useAppStore.getState().login({
        id: 'u1', email: 'a@b.com', fullName: 'Lawyer', role: 'lawyer', tenantId: 't1',
        permissions: [
          { resource: 'case', action: 'view', allowed: true },
        ],
      })
      expect(useAppStore.getState().hasPermission('invoice', 'delete')).toBe(false)
    })
  })

  describe('incrementUnread / setUnreadCount', () => {
    it('increments unread count', () => {
      expect(useAppStore.getState().unreadCount).toBe(0)
      useAppStore.getState().incrementUnread()
      expect(useAppStore.getState().unreadCount).toBe(1)
      useAppStore.getState().incrementUnread()
      expect(useAppStore.getState().unreadCount).toBe(2)
    })

    it('sets unread count directly', () => {
      useAppStore.getState().setUnreadCount(42)
      expect(useAppStore.getState().unreadCount).toBe(42)
    })
  })

  describe('portalLogin / portalLogout', () => {
    it('sets portal user and auth flag', () => {
      useAppStore.getState().portalLogin({
        id: 'p1', email: 'client@test.com', clientId: 'c1',
        client: { id: 'c1', fullName: 'Client Name' },
        tenant: { id: 't1', name: 'Cabinet', slug: 'cab', currencyCode: 'XAF' },
      })
      const state = useAppStore.getState()
      expect(state.isPortalAuthenticated).toBe(true)
      expect(state.portalUser).not.toBeNull()
      expect(state.portalCurrentView).toBe('portal-dashboard')
    })

    it('clears portal state on logout', () => {
      useAppStore.getState().portalLogin({
        id: 'p1', email: 'client@test.com', clientId: 'c1',
        client: { id: 'c1', fullName: 'Client Name' },
        tenant: { id: 't1', name: 'Cabinet', slug: 'cab', currencyCode: 'XAF' },
      })
      useAppStore.getState().portalLogout()
      const state = useAppStore.getState()
      expect(state.isPortalAuthenticated).toBe(false)
      expect(state.portalUser).toBeNull()
    })
  })

  describe('setPortalSelectedCaseId', () => {
    it('sets selected case id', () => {
      useAppStore.getState().setPortalSelectedCaseId('case-123')
      expect(useAppStore.getState().portalSelectedCaseId).toBe('case-123')
    })

    it('clears selected case id with null', () => {
      useAppStore.getState().setPortalSelectedCaseId('case-123')
      useAppStore.getState().setPortalSelectedCaseId(null)
      expect(useAppStore.getState().portalSelectedCaseId).toBeNull()
    })
  })
})
