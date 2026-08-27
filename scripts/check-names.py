#!/usr/bin/env python3
import re, os

VIEWS = '/home/z/my-project/src/views'

# Expected exports per file
expected = {
    'AdminViews.tsx': ['AdminDashboardView', 'AdminCabinsView', 'AdminUsersView', 'AdminPlansView'],
    'PortalViews.tsx': ['PortalSidebar', 'PortalHeader', 'PortalDashboardView', 'PortalCasesView', 'PortalCaseDetailView', 'PortalInvoicesView', 'PortalDocumentsView', 'PortalMessagesView', 'PortalProfileView', 'PortalRouter'],
    'LoginPage.tsx': ['LoginPage'],
    'Sidebar.tsx': ['Sidebar'],
    'AdminSidebar.tsx': ['AdminSidebar'],
    'AdminHeader.tsx': ['AdminHeader'],
    'Header.tsx': ['Header'],
    'DashboardView.tsx': ['DashboardView'],
    'TasksView.tsx': ['TasksView'],
    'CasesView.tsx': ['CasesView'],
    'ClientsView.tsx': ['ClientsView'],
    'DocumentsView.tsx': ['DocumentsView'],
    'CalendarView.tsx': ['CalendarView'],
    'InvoicesView.tsx': ['InvoicesView'],
    'MessagesView.tsx': ['MessagesView'],
    'ReportsView.tsx': ['ReportsView'],
    'AuditLogsView.tsx': ['AuditLogsView'],
    'SettingsView.tsx': ['SettingsView'],
    'FinancesView.tsx': ['FinancesView'],
    'NotificationsView.tsx': ['NotificationsView'],
    'ArchivesView.tsx': ['ArchivesView'],
    'ImpayesView.tsx': ['ImpayesView'],
    'TimeTrackingView.tsx': ['TimeTrackingView'],
    'TemplatesView.tsx': ['TemplatesView'],
    'CommunicationsView.tsx': ['CommunicationsView'],
}

for filename, expected_names in expected.items():
    filepath = os.path.join(VIEWS, filename)
    if not os.path.exists(filepath):
        print(f'MISSING: {filename}')
        continue
    with open(filepath) as f:
        content = f.read()
    # Find function declarations
    defined = re.findall(r'(?:export )?function (\w+)', content)
    missing = [n for n in expected_names if n not in defined]
    if missing:
        print(f'{filename}: MISSING {missing}')
        print(f'  Defined: {defined}')
    else:
        print(f'{filename}: OK ({len(expected_names)} exports)')
