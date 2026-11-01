with open('server/index.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = "if (req.method === 'POST' && pathname === '/api/studio/video') {"
replacement = """    if (req.method === 'POST' && pathname === '/api/studio/video/delete') {
      const body = await parseJsonBody(req);
      if (body.id) {
        const found = state.videos.find(v => v.id === body.id);
        state.videos = state.videos.filter(v => v.id !== body.id);
        if (found && found.frameUrl) {
          const fPath = path.join(PUBLIC_DIR, found.frameUrl.replace(/^\\//, ''));
          const mPath = fPath.replace(/\\.(jpg|svg)$/, '.json');
          if (fs.existsSync(fPath)) try { fs.unlinkSync(fPath); } catch(_) {}
          if (fs.existsSync(mPath)) try { fs.unlinkSync(mPath); } catch(_) {}
        }
      } else if (body.clearBroken) {
        state.videos = state.videos.filter(v => {
          if (!v.frameUrl || v.frameUrl.endsWith('.svg') || v.frameUrl.includes('pollinations.ai')) return false;
          return fs.existsSync(path.join(PUBLIC_DIR, v.frameUrl.replace(/^\\//, '')));
        });
      }
      saveState();
      return sendJson(res, 200, { ok: true, videos: state.videos });
    }

    if (req.method === 'POST' && pathname === '/api/studio/video') {"""

if target in text:
    text = text.replace(target, replacement, 1)
    with open('server/index.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Added /api/studio/video/delete route in server/index.js!')
else:
    print('target not found in server/index.js!')
