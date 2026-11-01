with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start_marker = '<!-- 4. VIDEO GENERATION STUDIO -->'
end_marker = '<!-- 5. SAFE AUTONOMOUS AGENT STUDIO -->'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Video Studio markers not found!')
    exit(1)

new_video_section = """<!-- 4. VIDEO GENERATION STUDIO (SEEDANCE STYLE) -->
        <section id="tab-video" class="workspace-panel">
          <div class="panel-header">
            <div>
              <h2>Seedance Video Studio (Temporal Motion)</h2>
              <p class="panel-subtitle">Synthesize high-fidelity cinematic video scenes with Seedance Motion Dynamics &amp; Wan2.1 on Colab GPU</p>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pill-badge" id="videoActiveModelPill" style="background:rgba(245,158,11,0.15); border-color:var(--accent-amber); color:var(--accent-amber);">ByteDance/Seedance-Wan2.1</span>
              <button id="btnClearBrokenVideos" type="button" class="btn-compact btn-secondary" style="font-size:11px;">🧹 Clean Broken</button>
            </div>
          </div>

          <!-- Seedance Video Composer Box -->
          <div class="composer-box seedance-composer">
            <!-- Top Controls Row -->
            <div class="composer-toolbar" style="flex-wrap:wrap; gap:8px;">
              <button type="button" class="btn-compact btn-wand" data-enhance-target="videoPromptInput" data-enhance-mode="video">
                ✨ Enhance Seedance Prompt
              </button>
              <div class="inline-controls" style="flex-wrap:wrap;">
                <label>Style Mode
                  <select id="videoSeedanceStyle">
                    <option value="cinematic-hyperreal" selected>🎬 Cinematic Hyperreal</option>
                    <option value="anime-action">⚡ Anime Action Sakuga</option>
                    <option value="scifi-vfx">🌌 Sci-Fi VFX / Unreal Engine</option>
                  </select>
                </label>
                <label>Camera Dynamic
                  <select id="videoCameraMotion">
                    <option value="Dolly Push-In" selected>🎥 Dolly Push-In</option>
                    <option value="Anamorphic Orbit">🔄 Anamorphic 360° Orbit</option>
                    <option value="Slow Crane Rise">🦅 Cinematic Crane Rise</option>
                    <option value="Handheld Tracking">🏃 Handheld Action Tracking</option>
                    <option value="FPV Drone Swoop">⚡ FPV Drone Swoop</option>
                  </select>
                </label>
                <label>Duration
                  <select id="videoDuration">
                    <option value="5" selected>5.0s (Standard)</option>
                    <option value="8">8.0s (Extended)</option>
                  </select>
                </label>
                <label>Motion
                  <input id="videoMotionStrength" type="number" step="0.1" min="0.2" max="1.0" value="0.8" style="width:52px" />
                </label>
                <label>Ratio
                  <select id="videoAspectRatio">
                    <option value="16:9" selected>16:9 Cinema</option>
                    <option value="9:16">9:16 Mobile</option>
                  </select>
                </label>
              </div>
            </div>

            <!-- Prompt Input -->
            <textarea id="videoPromptInput" rows="2" placeholder="Describe scene movement, subject action, camera path, and cinematic lighting dynamics (e.g. Cyberpunk sports car speeding through rainy neon city)..."></textarea>

            <!-- Actions Row -->
            <div class="composer-actions">
              <span class="mono-meta" style="font-size:11px; color:var(--text-muted);">Seedance Motion Engine: 24 FPS · Temporal Optical Flow</span>
              <div style="display:flex; gap:8px;">
                <button id="btnQueueVideo" type="button" class="btn-secondary">+ Add Video to Queue</button>
                <button id="btnGenerateVideo" type="button" class="btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);">Render Seedance Video (0.25 CU)</button>
              </div>
            </div>
          </div>

          <!-- Video Gallery Grid -->
          <div id="videoGalleryGrid" class="media-gallery-grid seedance-gallery"></div>
        </section>

        """

html = html[:start_idx] + new_video_section + html[end_idx:]
with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated Video Studio section in public/index.html!')
