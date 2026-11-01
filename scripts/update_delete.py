with open('server/index.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if "pathname === '/api/studio/image/delete'" in lines[i]:
        new_lines.append(lines[i]) # if ...
        new_lines.append(lines[i+1]) # const body ...
        new_lines.append(lines[i+2]) # if (body.id) {
        new_lines.append("""        const found = state.images.find(img => img.id === body.id);
        state.images = state.images.filter(img => img.id !== body.id);
        if (found) {
          if (found.imageUrl) {
            const f1 = path.join(PUBLIC_DIR, found.imageUrl.replace(/^\\//, ''));
            const f2 = f1.replace(/\\.(jpg|svg)$/, '.json');
            if (fs.existsSync(f1)) try { fs.unlinkSync(f1); } catch(_) {}
            if (fs.existsSync(f2)) try { fs.unlinkSync(f2); } catch(_) {}
          }
          if (found.metaUrl) {
            const m1 = path.join(PUBLIC_DIR, found.metaUrl.replace(/^\\//, ''));
            if (fs.existsSync(m1)) try { fs.unlinkSync(m1); } catch(_) {}
          }
        }
        const fPath = path.join(PUBLIC_DIR, 'media', `${body.id}.jpg`);
        const sPath = path.join(PUBLIC_DIR, 'media', `${body.id}.svg`);
        const jPath = path.join(PUBLIC_DIR, 'media', `${body.id}.json`);
        if (fs.existsSync(fPath)) try { fs.unlinkSync(fPath); } catch(_) {}
        if (fs.existsSync(sPath)) try { fs.unlinkSync(sPath); } catch(_) {}
        if (fs.existsSync(jPath)) try { fs.unlinkSync(jPath); } catch(_) {}
""")
        i += 8
    else:
        new_lines.append(lines[i])
        i += 1

with open('server/index.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Updated server/index.js delete!')
