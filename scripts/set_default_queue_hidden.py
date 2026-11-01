with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = '<div class="workbench-grid">'
replacement = '<div class="workbench-grid queue-hidden">'

if target in html:
    html = html.replace(target, replacement, 1)
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Updated public/index.html with default queue-hidden class!')
else:
    print('Target not found in public/index.html!')
