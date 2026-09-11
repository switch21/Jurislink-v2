#!/usr/bin/env python3
"""Fix RBAC on routes with multi-line function signatures."""

import os, re

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'app', 'api')

# Resource mapping from route path to RBAC resource name
RESOURCE_MAP = {
    'cases': 'case', 'clients': 'client', 'documents': 'document',
    'invoices': 'invoice', 'payments': 'invoice', 'tasks': 'task',
    'events': 'event', 'messages': 'message', 'notifications': 'notification',
    'communications': 'communication', 'time-entries': 'time_entry',
    'document-templates': 'document_template',
}

ACTION_MAP = {'GET': 'read', 'POST': 'create', 'PUT': 'update', 'DELETE': 'delete', 'PATCH': 'update'}

METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

def read_file(p):
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write_file(p, c):
    with open(p, 'w', encoding='utf-8') as f: f.write(c)

def get_resource(route_path):
    parts = route_path.replace('[id]', '').strip('/').split('/')
    for p in parts:
        if p in RESOURCE_MAP:
            return RESOURCE_MAP[p]
    return parts[0] if parts else 'unknown'

def process_file(filepath, route_name):
    content = read_file(filepath)
    original = content
    resource = get_resource(route_name)
    
    # Fix: rename _request to request in multi-line signatures
    # Pattern: export async function METHOD(\n  _request: Request,\n
    # First, check if this file needs fixing (has import but no await)
    if 'await authenticate(' in content or 'await requireRootAdmin(' in content:
        return False  # Already has auth checks

    # Find each method handler with multi-line signature
    for method in METHODS:
        # Pattern: export async function GET(\n  _request: Request,\n  { params }...\n) {\n  const db
        # We need to: 1) rename _request to request, 2) add auth after {
        
        # Multi-line function start pattern
        pat = rf'(export async function {method}\s*\(\s*_request\s*:\s*Request\s*,)'
        if not re.search(pat, content):
            continue
        
        # Replace _request with request
        content = re.sub(rf'(export async function {method}\s*\(\s*)_request(\s*:\s*Request)', r'\1request\2', content)
        
        # Now find the opening brace of the function body and add auth check
        # The signature ends with ') {'
        # Find the method signature, then the '{' after it
        func_start = content.find(f'export async function {method}(request: Request,')
        if func_start < 0:
            continue
        
        # Find the opening { of the function body
        brace_search_start = func_start
        while True:
            brace_pos = content.find('{', brace_search_start)
            if brace_pos < 0:
                break
            # Check if this brace is the function body opener
            # by verifying there's no unclosed ( before it from func_start
            between = content[func_start:brace_pos]
            if between.count('(') <= between.count(')'):
                # This is likely the function body opening
                insert_pos = brace_pos + 1
                action = ACTION_MAP.get(method, 'read')
                check = f"\n  const auth = await authenticate(request, '{resource}', '{action}')\n  if (auth instanceof NextResponse) return auth"
                content = content[:insert_pos] + check + content[insert_pos:]
                break
            brace_search_start = brace_pos + 1
    
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
        try:
            if process_file(fp, rn):
                print(f'  ✓ {rn}')
                fixed += 1
        except Exception as e:
            print(f'  ❌ {rn}: {e}')
    print(f'\nFixed {fixed} routes')

if __name__ == '__main__':
    main()
