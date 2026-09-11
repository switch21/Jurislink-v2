import re, sys

with open('src/app/page.tsx','r') as f:
    content = f.read()
    lines = content.split('\n')
    start = None
    end = None
    for i, line in enumerate(lines):
        if '<TabsContent value="documents"' in line:
            if start is None: start = i
        if '</TabsContent>' in line:
                end = i + 1
                break
    print(f'Lines {start+1}-{end}')

with open('src/app/page.tsx','w') as f:
    fix = open('/home/z/my-project/src/app/page.tsx_docs_fix.txt').read()
    before = lines[:start]
    after = lines[end:]
    f.write(before)
    f.write(fix)
    f.write(after)
    print('Done')
