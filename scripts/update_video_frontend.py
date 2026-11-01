with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update renderVideoStudio
start_marker = 'function renderVideoStudio() {'
end_marker = 'function openLightbox('

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('renderVideoStudio not found!')
    exit(1)

new_render_video = """function renderVideoStudio() {
  if (!appState) return;
  const pill = document.getElementById('videoActiveModelPill');
  if (pill) pill.textContent = 'ByteDance/Seedance-Wan2.1';

  const grid = document.getElementById('videoGalleryGrid');
  if (!grid) return;
  const signature = (appState.videos || []).map(v => v.id + ':' + (v.frameUrl || '')).join('|');
  if (grid.dataset.lastSig === signature) return;
  grid.dataset.lastSig = signature;

  // Clear running timers
  videoPlaybackTimers.forEach(tid => clearInterval(tid));
  videoPlaybackTimers.clear();

  if (!appState.videos || !appState.videos.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; padding:40px 20px; text-align:center; background:rgba(15,23,42,0.5); border:1px dashed rgba(245,158,11,0.3); border-radius:12px;">
        <div style="font-size:32px; margin-bottom:8px;">🎬</div>
        <h3 style="color:#f8fafc; font-size:16px; margin:0 0 6px;">Ready to Synthesize Seedance Video Scenes</h3>
        <p style="color:var(--text-muted); font-size:12px; max-width:440px; margin:0 auto 16px;">Enter your movement prompt above and choose Camera Dynamic (Dolly, Orbit, Crane, FPV Drone) to synthesize 24 FPS cinematic motion on Colab GPU.</p>
      </div>`;
    return;
  }

  grid.innerHTML = appState.videos.map(vid => {
    const cam = (vid.cameraMotion || 'Dolly Push-In').toLowerCase();
    const motionClass = cam.includes('orbit') ? 'motion-orbit' :
      cam.includes('crane') ? 'motion-crane' :
      cam.includes('handheld') ? 'motion-handheld' :
      cam.includes('fpv') ? 'motion-fpv' : 'motion-dolly';

    const frameUrl = vid.frameUrl || `/media/${vid.id}.jpg`;
    const styleLabel = vid.seedanceStyle === 'anime-action' ? 'Anime Sakuga' :
      vid.seedanceStyle === 'scifi-vfx' ? 'Sci-Fi VFX' : 'Cinematic Hyperreal';

    const properFilename = vid.fileName || `${(vid.cameraMotion || 'Seedance').replace(/\\s+/g, '_')}_${vid.id}.jpg`;

    return `
      <div class="video-card" data-vid-id="${vid.id}">
        <div id="viewport-${vid.id}" class="video-viewport ${motionClass} playing" style="--motion-duration: ${vid.durationSec || 5}s;">
          <img class="cinematic-frame" src="${frameUrl}" alt="${escapeHtml(vid.prompt)}" loading="lazy" />
          
          <!-- Seedance Top HUD -->
          <div class="video-hud-top">
            <div class="video-rec-tag">
              <span class="video-rec-dot"></span>
              <span>SEEDANCE</span>
            </div>
            <div class="video-engine-tag">Wan 2.1 · ${vid.fps || 24}fps 1080p</div>
          </div>

          <!-- Seedance Bottom HUD & Timeline Controls -->
          <div class="video-hud-bottom">
            <button class="btn-transport btn-toggle-play" data-vid-id="${vid.id}" title="Play / Pause Motion">⏸</button>
            <div class="video-progress-bar" data-vid-id="${vid.id}">
              <div id="progress-${vid.id}" class="video-progress-fill"></div>
            </div>
            <span id="timecode-${vid.id}" class="video-timecode">00:00 / 00:0${vid.durationSec || 5}</span>
            <a class="btn-hud-action" href="${frameUrl}" target="_blank" download="${escapeHtml(properFilename)}" title="Download Master Frame">💾 Frame</a>
            <button class="btn-hud-action btn-fullscreen-video" data-url="${frameUrl}" data-prompt="${escapeHtml(vid.prompt)}" data-meta="${escapeHtml(vid.cameraMotion)} · ${vid.durationSec}s @ ${vid.fps || 24}fps · ${styleLabel}" title="Cinema View">⛶</button>
            <button class="btn-hud-action btn-delete-video" data-vid-id="${vid.id}" style="color:#f87171;" title="Delete Video">✕</button>
          </div>
        </div>
        <div class="media-info" style="padding:10px 12px;">
          <div class="media-prompt" title="${escapeHtml(vid.prompt)}" style="font-size:12px; font-weight:500;">${escapeHtml(vid.prompt)}</div>
          <div class="media-meta-row" style="margin-top:6px; font-size:11px;">
            <span style="color:var(--accent-amber);">🎥 ${escapeHtml(vid.cameraMotion || 'Dolly Push-In')}</span>
            <span class="mono-meta" style="color:var(--text-muted);">${vid.durationSec || 5}s · ${styleLabel}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Timeline advancement for Seedance video players
  appState.videos.forEach(vid => {
    const duration = vid.durationSec || 5;
    let elapsed = 0;
    const progressFill = document.getElementById(`progress-${vid.id}`);
    const timecode = document.getElementById(`timecode-${vid.id}`);

    const intervalId = setInterval(() => {
      const viewport = document.getElementById(`viewport-${vid.id}`);
      if (!viewport || viewport.classList.contains('paused')) return;

      elapsed = (elapsed + 0.1) % duration;
      const pct = (elapsed / duration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (timecode) {
        const curSec = Math.floor(elapsed);
        timecode.textContent = `00:0${curSec} / 00:0${duration}`;
      }
    }, 100);

    videoPlaybackTimers.set(vid.id, intervalId);
  });

  // Transport toggle
  grid.querySelectorAll('.btn-toggle-play').forEach(btn => {
    btn.onclick = () => {
      const vidId = btn.dataset.vidId;
      const viewport = document.getElementById(`viewport-${vidId}`);
      if (!viewport) return;
      if (viewport.classList.contains('paused')) {
        viewport.classList.remove('paused');
        viewport.classList.add('playing');
        btn.textContent = '⏸';
      } else {
        viewport.classList.remove('playing');
        viewport.classList.add('paused');
        btn.textContent = '▶';
      }
    };
  });

  // Fullscreen Cinema
  grid.querySelectorAll('.btn-fullscreen-video').forEach(btn => {
    btn.onclick = () => {
      if (typeof openLightbox === 'function') {
        openLightbox(btn.dataset.url, btn.dataset.prompt, btn.dataset.meta);
      }
    };
  });

  // Delete Video
  grid.querySelectorAll('.btn-delete-video').forEach(btn => {
    btn.onclick = async () => {
      const vidId = btn.dataset.vidId;
      await apiPost('/api/studio/video/delete', { id: vidId });
      if (appState && appState.videos) appState.videos = appState.videos.filter(v => v.id !== vidId);
      grid.dataset.lastSig = '';
      renderVideoStudio();
      showToast('Video scene deleted');
    };
  });
}

"""

text = text[:start_idx] + new_render_video + text[end_idx:]

# 2. Update btnGenerateVideo event listener
old_btn_video = """    document.getElementById('btnGenerateVideo').addEventListener('click', async () => {
      const prompt = document.getElementById('videoPromptInput').value.trim() || 'Camera glide across foggy clockwork bay at midnight';
      const cameraMotion = document.getElementById('videoCameraMotion').value;
      const durationSec = document.getElementById('videoDuration').value;
      const motionStrength = document.getElementById('videoMotionStrength').value;
      const btn = document.getElementById('btnGenerateVideo');
      btn.disabled = true;
      btn.textContent = 'Synthesizing Wan2.1 Video on GPU... ⏳';
      try {
        await apiPost('/api/studio/video', { prompt, cameraMotion, durationSec, motionStrength });
        showToast('Synthesized video clip on Colab GPU');
        await fetchState();
      } catch (err) {
        showToast('Video render failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Render Video Clip (0.25 CU)';
      }
    });"""

new_btn_video = """    const btnGenerateVideo = document.getElementById('btnGenerateVideo');
    if (btnGenerateVideo) {
      btnGenerateVideo.addEventListener('click', async () => {
        const prompt = document.getElementById('videoPromptInput').value.trim() || 'Cinematic cyberpunk sports car speeding through rainy neon city';
        const cameraMotion = document.getElementById('videoCameraMotion').value;
        const durationSec = document.getElementById('videoDuration').value;
        const motionStrength = document.getElementById('videoMotionStrength').value;
        const seedanceStyle = document.getElementById('videoSeedanceStyle')?.value || 'cinematic-hyperreal';
        const aspectRatio = document.getElementById('videoAspectRatio')?.value || '16:9';

        btnGenerateVideo.disabled = true;
        btnGenerateVideo.textContent = 'Synthesizing Seedance Motion on GPU... ⏳';
        try {
          await apiPost('/api/studio/video', { prompt, cameraMotion, durationSec, motionStrength, seedanceStyle, aspectRatio });
          showToast('Rendered Seedance Video Scene on GPU!');
          await fetchState();
        } catch (err) {
          showToast('Video synthesis failed: ' + err.message);
        } finally {
          btnGenerateVideo.disabled = false;
          btnGenerateVideo.textContent = 'Render Seedance Video (0.25 CU)';
        }
      });
    }

    const btnClearBrokenVideos = document.getElementById('btnClearBrokenVideos');
    if (btnClearBrokenVideos) {
      btnClearBrokenVideos.addEventListener('click', async () => {
        await apiPost('/api/studio/video/delete', { clearBroken: true });
        await fetchState();
        showToast('Cleaned up broken video cards!');
      });
    }"""

if old_btn_video in text:
    text = text.replace(old_btn_video, new_btn_video, 1)
    print('Updated btnGenerateVideo event listener!')
else:
    print('old_btn_video not found, checking alternatives...')

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated public/app.js with Seedance Video Studio!')
