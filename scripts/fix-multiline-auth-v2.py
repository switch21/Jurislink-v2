#!/usr/bin/env python3
"""Fix RBAC on [id] routes with multi-line signatures - insert after ') {' line."""

import os, re

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'app', 'api')

RESOURCE_MAP = {
    'cases': 'case', 'clients': 'client', 'documents': 'document',
    'invoices': 'invoice', 'payments': 'invoice', 'tasks': 'task',
    'events': 'event', 'messages': 'message', 'notifications': 'notification',
    'communications': 'communication', 'time-entries': 'time_entry',
    'document-templates': 'document_template',
}
ACTION_MAP = {'GET': 'read', 'POST': 'create', 'PUT': 'update', 'DELETE': 'delete'}
METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

def read_file(p):
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write_file(p, c):
    with open(p, 'w', encoding='utf-8') as f: f.write(c)

def get_resource(route):
    parts = route.replace('[id]', '').strip('/').split('/')
    for p in parts:
        if p in RESOURCE_MAP: return RESOURCE_MAP[p]
    return parts[0] if parts else 'unknown'

def add_auth_after_brace(content, method, resource):
    """Find 'export async function METHOD(...\n) {' and insert auth after the '{' line."""
    # Pattern: find the function declaration
    # We look for the closing ') {' of the multi-line signature
    pat = rf'export async function {method}\s*\('
    match = re.search(pat, content)
    if not match:
        return content, False
    
    # Find the ') {' after the match
    search_from = match.start()
    brace_line_match = re.search(r'\)\s*\{\s*$', content[search_from:search_from+500], re.MULTILINE)
    if not brace_line_match:
        return content, False
    
    # Absolute position of the end of ') {' line
    abs_end = search_from + brace_line_match.end()
    
    # Check if auth already exists after this point
    next_200 = content[abs_end:abs_end+200]
    if 'await authenticate(' in next_200 or 'await requireRootAdmin(' in next_200:
        return content, False
    
    action = ACTION_MAP.get(method, 'read')
    check = f"\n  const auth = await authenticate(request, '{resource}', '{action}')\n  if (auth instanceof NextResponse) return auth\n"
    
    content = content[:abs_end] + check + content[abs_end:]
    return content, True

def process_file(filepath, route_name):
    content = read_file(filepath)
    original = content
    resource = get_resource(route_name)
    
    for method in METHODS:
        content, changed = add_auth_after_brace(content, method, resource)
    
    if content != original:
        write_file(filepath, content)
        return True
    return False

def find_routes(base):
    routes = []
    for root, _, files in os.walk(base):
        for f in files:
            if f == 'route.ts':
                full = os.path.join(root, f)
                rel = os.path.relpath(full, base)
                route = rel.replace(os.sep, '/').replace('/route.ts', '')
                if route == '.': route = 'root'
                routes.append((full, route))
    return sorted(routes)

def main():
    routes = find_routes(BASE)
    fixed = 0
    for fp, rn in routes:
        # Skip auth routes
        if 'auth/' in rn:
            continue
        try:
            if process_file(fp, rn):
                print(f'  ✓ {rn}')
                fixed += 1
        except Exception as e:
            print(f'  ❌ {rn}: {e}')
    print(f'\nFixed {fixed} routes')

if __name__ == '__main__':
    main()
