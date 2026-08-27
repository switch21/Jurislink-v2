'use client'

import { useAppStore } from '@/store/appStore'
import PortalDashboardView from './PortalDashboardView'
import PortalCasesView from './PortalCasesView'
import PortalCaseDetailView from './PortalCaseDetailView'
import PortalInvoicesView from './PortalInvoicesView'
import PortalDocumentsView from './PortalDocumentsView'
import PortalMessagesView from './PortalMessagesView'
import PortalProfileView from './PortalProfileView'

export default function PortalRouter() {
  const { portalCurrentView } = useAppStore()
  switch (portalCurrentView) {
    case 'portal-dashboard': return <PortalDashboardView />
    case 'portal-cases': return <PortalCasesView />
    case 'portal-case-detail': return <PortalCaseDetailView />
    case 'portal-invoices': return <PortalInvoicesView />
    case 'portal-documents': return <PortalDocumentsView />
    case 'portal-messages': return <PortalMessagesView />
    case 'portal-profile': return <PortalProfileView />
    default: return <PortalDashboardView />
  }
}
