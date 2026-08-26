#!/usr/bin/env python3
"""Apply RBAC authentication to all API routes systematically."""

import os
import re

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'app', 'api')

ROOT_ADMIN_ONLY = {
    'admin/dashboard', 'setup', 'debug', 'tenants', 'tenants/logo',
    'subscription-plans', 'subscriptions/admin', 'subscriptions/check-expiry',
    'currencies', 'seed',
}

SKIP_ROUTES = {'auth/login', 'auth/[id]', 'auth'}

METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def find_routes(base):
    routes = []
    for root, _, files in os.walk(base):
        for f in files:
            if f == 'route.ts':
                full = os.path.join(root, f)
                rel = os.path.relpath(full, base)
                route = rel.replace(os.sep, '/').replace('/route.ts', '')
                if route == '.':
                    route = 'root'
                # Check if should skip
                skip = False
                for s in SKIP_ROUTES:
                    if s in route:
                        skip = True
                        break
                if not skip:
                    routes.append((full, route))
    return sorted(routes)

def is_root(route):
    for r in ROOT_ADMIN_ONLY:
        if route == r or route.startswith(r + '/'):
            return True
    return False

def get_resource_from_route(route):
    """Extract the resource name from the route path."""
    parts = route.split('/')
    # Get the first meaningful part
    for p in parts:
        if p and not p.startswith('[') and p != 'admin' and p != 'root':
            return p
    return parts[-1] if parts else 'unknown'

def patch_file(filepath, route_name):
    content = read_file(filepath)
    original = content
    
    root_only = is_root(route_name)
    resource = get_resource_from_route(route_name)
    
    # Determine imports needed
    needs_auth_import = 'from' in content and 'auth-server' not in content
    needs_next_response = 'NextResponse' in content and 'next/server' not in content
    
    # Build import line
    if root_only:
        auth_func = 'requireRootAdmin'
        auth_import = "import { requireRootAdmin } from '@/lib/auth-server'"
    else:
        auth_func = 'authenticate'
        auth_import = "import { authenticate, isErrorResponse } from '@/lib/auth-server'"
    
    # Add imports after existing imports
    if needs_auth_import:
        lines = content.split('\n')
        last_import = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import = i
        if last_import >= 0:
            lines.insert(last_import + 1, auth_import)
            content = '\n'.join(lines)
    
    # Patch each method handler
    action_map = {'GET': 'read', 'POST': 'create', 'PUT': 'update', 'DELETE': 'delete', 'PATCH': 'update'}
    
    for method in METHODS:
        # Pattern 1: export async function METHOD(request: Request) {
        pat1 = rf'(export async function {method}\s*\(\s*request\s*:\s*Request\s*\)\s*\{{)'
        m = re.search(pat1, content)
        if m:
            # Check if already has auth
            func_body_start = m.end()
            next_100 = content[func_body_start:func_body_start+200]
            if auth_func in next_100:
                continue
            
            if root_only:
                check = f"\n  const auth = await {auth_func}(request)\n  if (auth instanceof NextResponse) return auth"
            else:
                action = action_map.get(method, 'read')
                check = f"\n  const auth = await {auth_func}(request, '{resource}', '{action}')\n  if (auth instanceof NextResponse) return auth"
            
            content = content[:func_body_start] + check + content[func_body_start:]
            continue
        
        # Pattern 2: export async function METHOD(request: Request, { params }) {
        pat2 = rf'(export async function {method}\s*\(\s*request\s*:\s*Request\s*,\s*\{{)'
        m = re.search(pat2, content)
        if m:
            func_body_start = m.end()
            # Find the closing } of the destructured param
            close_brace = content.find('}', func_body_start)
            if close_brace < 0:
                continue
            insert_pos = close_brace + 1
            # Find the opening { of the function body
            while insert_pos < len(content) and content[insert_pos] in ' \t\n':
                insert_pos += 1
            if insert_pos < len(content) and content[insert_pos] == '{':
                insert_pos += 1
            else:
                continue
            
            next_100 = content[insert_pos:insert_pos+200]
            if auth_func in next_100:
                continue
            
            if root_only:
                check = f"\n  const auth = await {auth_func}(request)\n  if (auth instanceof NextResponse) return auth"
            else:
                action = action_map.get(method, 'read')
                check = f"\n  const auth = await {auth_func}(request, '{resource}', '{action}')\n  if (auth instanceof NextResponse) return auth"
            
            content = content[:insert_pos] + check + content[insert_pos:]
            continue
        
        # Pattern 3: export async function METHOD() { (no request param)
        pat3 = rf'(export async function {method}\s*\(\s*\)\s*\{{)'
        m = re.search(pat3, content)
        if m:
            func_body_start = m.end()
            next_100 = content[func_body_start:func_body_start+200]
            if auth_func in next_100:
                continue
            
            # Replace () with (request: Request)
            content = content[:m.start()] + m.group(1).replace('()', '(request: Request)') + content[m.end():]
            # Recalculate func_body_start
            func_body_start = m.start() + len(m.group(1).replace('()', '(request: Request)'))
            
            if root_only:
                check = f"\n  const auth = await {auth_func}(request)\n  if (auth instanceof NextResponse) return auth"
            else:
                action = action_map.get(method, 'read')
                check = f"\n  const auth = await {auth_func}(request, '{resource}', '{action}')\n  if (auth instanceof NextResponse) return auth"
            
            content = content[:func_body_start] + check + content[func_body_start:]
            continue
    
    if content != original:
        write_file(filepath, content)
        tag = '🔒 ROOT' if root_only else '🔐 AUTH'
        print(f'  {tag} {route_name}')
        return True
    else:
        print(f'  ⏭️  {route_name} (already patched or no match)')
        return False

def main():
    routes = find_routes(BASE)
    print(f'Found {len(routes)} API routes\n')
    
    patched = 0
    for filepath, route_name in routes:
        try:
            if patch_file(filepath, route_name):
                patched += 1
        except Exception as e:
            print(f'  ❌ {route_name}: {e}')
    
    print(f'\nResult: {patched}/{len(routes)} routes patched')

if __name__ == '__main__':
    main()
