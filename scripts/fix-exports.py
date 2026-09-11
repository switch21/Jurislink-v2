#!/usr/bin/env python3
"""
Add 'export' to all top-level const/function/type/interface declarations
in view files that need it.
"""
import re, os

VIEWS = '/home/z/my-project/src/views'

# Files that need exports added
EXPORT_FILES = [
    'constants.ts',
    'types.ts',
]

# Pattern: top-level 'const X' or 'function X' without 'export'
# Must be at start of line (possibly with whitespace)
exportable = re.compile(r'^(const |function |type |interface )', re.MULTILINE)

for filename in EXPORT_FILES:
    filepath = os.path.join(VIEWS, filename)
    if not os.path.exists(filepath):
        print(f'MISSING: {filename}')
        continue
    with open(filepath) as f:
        content = f.read()
    
    # Add 'export' to non-exported declarations
    # Only at line start, not already exported, not inside comments
    lines = content.split('\n')
    new_lines = []
    count = 0
    for line in lines:
        stripped = line.lstrip()
        # Skip comment lines and section dividers
        if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            new_lines.append(line)
            continue
        # Check if it starts with a declaration keyword
        if re.match(r'^(const |function |type |interface )', stripped) and not stripped.startswith('export '):
            indent = line[:len(line) - len(stripped)]
            new_lines.append(f'{indent}export {stripped}')
            count += 1
        else:
            new_lines.append(line)
    
    if count > 0:
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f'{filename}: added {count} export(s)')
    else:
        print(f'{filename}: no changes needed')

print('Done!')
