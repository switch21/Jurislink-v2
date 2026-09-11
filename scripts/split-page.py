#!/usr/bin/env python3
"""
Split the monolithic page.tsx into modular view files.
Reads src/app/page.tsx, extracts sections, writes to src/views/.
Then rewrites page.tsx as a thin orchestrator.
"""
import re

BASE = '/home/z/my-project/src'
PAGE = f'{BASE}/app/page.tsx'
VIEWS = f'{BASE}/views'

with open(PAGE, 'r') as f:
    content = f.read()
lines = content.split('\n')

# Define section boundaries (1-indexed line numbers inclusive)
# Based on our structure map
SECTIONS = {
    'types.ts':          (68, 266),   # All interfaces
    'constants.ts':      (271, 355), # Constants + QueryClient
    'helpers.tsx':       (357, 411), # Helper functions
    'ThemeToggle.tsx':   (413, 425),
    'EmptyState.tsx':    (427, 439),
    'LoginPage.tsx':     (440, 530),
    'Sidebar.tsx':       (531, 572),
    'AdminSidebar.tsx':  (573, 614),
    'AdminHeader.tsx':   (615, 632),
    'Header.tsx':        (633, 729),
    'DashboardView.tsx': (730, 931),
    'TasksView.tsx':     (933, 1080),
    'CasesView.tsx':     (1081, 1699),
    'ClientsView.tsx':   (1700, 1875),
    'DocumentsView.tsx': (1876, 2230),
    'CalendarView.tsx':  (2231, 2405),
    'InvoicesView.tsx':  (2406, 2640),
    'MessagesView.tsx':  (2641, 2725),
    'ReportsView.tsx':   (2726, 2923),
    'AuditLogsView.tsx': (2924, 2975),
    'SettingsView.tsx':  (2976, 3398),
    'FinancesView.tsx':  (3399, 3651),
    'NotificationsView.tsx': (3652, 3741),
    'ArchivesView.tsx':  (3742, 3771),
    'ImpayesView.tsx':   (3772, 3988),
    'TimeTrackingView.tsx': (3989, 4164),
    'TemplatesView.tsx': (4165, 4394),
    'CommunicationsView.tsx': (4395, 4552),
    'AdminViews.tsx':    (4553, 4907),
    'PortalViews.tsx':   (4908, 5547),
}

# Footer, Routers, MainApp - stay in page.tsx
ORCHESTRATOR_START = 5543  # FOOTER section

# Extract sections
for filename, (start, end) in SECTIONS.items():
    section_lines = lines[start-1:end]
    section_text = '\n'.join(section_lines)
    
    filepath = f'{VIEWS}/{filename}'
    with open(filepath, 'w') as f:
        f.write(section_text)
    print(f'  Extracted {filename}: lines {start}-{end} ({end-start+1} lines)')

print(f'\nExtracted {len(SECTIONS)} files to {VIEWS}/')
print(f'Orchestrator starts at line {ORCHESTRATOR_START}')

# Now build the new page.tsx
orchestrator_lines = lines[ORCHESTRATOR_START-1:]
orchestrator_text = '\n'.join(orchestrator_lines)

# Build imports for each section
imports = []
for filename, (start, end) in SECTIONS.items():
    # Extract exported names from the section
    section_text = '\n'.join(lines[start-1:end])
    
    # Find function declarations
    func_names = re.findall(r'(?:function|const)\s+(\w+)', section_text)
    # Find interface/type declarations
    type_names = re.findall(r'(?:interface|type)\b\s+(\w+)', section_text)
    # Find const that look like values (not functions)
    # Filter out common non-exports
    all_names = func_names + type_names
    # Remove common false positives
    skip = {'if', 'for', 'while', 'switch', 'return', 'const', 'let', 'var', 'new', 'try', 'catch', 'throw'}
    names = [n for n in all_names if n not in skip and len(n) > 1]
    
    # Determine what to import based on file type
    if filename == 'types.ts':
        imports.append("export * from '@/views/types'")
    elif filename == 'constants.ts':
        imports.append("export * from '@/views/constants'")
    elif filename == 'helpers.tsx':
        imports.append("export * from '@/views/helpers'")
    else:
        # Component file - find the main component(s)
        comp_names = re.findall(r'function\s+(\w+(?:View|Router|Sidebar|Header|Footer|Page|Toggle|State))', section_text)
        if not comp_names:
            comp_names = re.findall(r'function\s+(\w+)', section_text)
        if comp_names:
            names_str = ', '.join(comp_names)
            imports.append(f"import {{ {names_str} }} from '@/views/{filename[:-4]}'")

print('\n--- Generated imports ---')
for imp in imports:
    print(imp)

# Write the new page.tsx
new_page = f"""'use client'

// ==================== Re-exports from split modules ====================
{chr(10).join(imports)}

// ==================== FOOTER ====================
{orchestrator_text}
"""

# Actually, we need to be smarter. The orchestrator section uses component names
# that need to be imported. Let's write it properly.

with open(PAGE + '.new', 'w') as f:
    f.write(new_page)

print(f'\nWrote new page.tsx to {PAGE}.new')
print('Review before replacing!')
