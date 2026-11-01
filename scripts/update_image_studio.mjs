import fs from 'node:fs';
import path from 'node:path';

// 1. UPDATE public/index.html
const indexHtmlPath = 'public/index.html';
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Update cache-buster
indexHtml = indexHtml.replace(/styles\.css\?v=[^\"]+/, 'styles.css?v=20261101_v12');
indexHtml = indexHtml.replace(/app\.js\?v=[^\"]+/, 'app.js?v=20261101_v12');

// Replace tab-image composer and gallery
const oldComposerRegex = /<div class="composer-box">[\s\S]*?<div id="imageGalleryGrid" class="media-gallery-grid"><\/div>/;
const newComposerHtml = `<div class="composer-box">
            <!-- Row 1: Enhancer & Primary Selectors -->
            <div class="composer-toolbar" style="flex-wrap: wrap; gap: 8px;">
              <button type="button" class="btn-compact btn-wand" data-enhance-target="imagePromptInput" data-enhance-mode="image">
                ✨ Enhance Visual Prompt
              </button>
              <div class="inline-controls" style="flex-wrap: wrap; gap: 8px;">
                <label>Model
                  <select id="imageModelSelect" style="max-width:235px;">
                    <option value="flux-realism" selected>👁️ FLUX Realism (Flawless Eyes &amp; Face)</option>
                    <option value="black-forest-labs/FLUX.1-dev">🎨 FLUX.1-dev (Cinematic Ultra HD)</option>
                    <option value="flux-pro">💎 FLUX Pro (Studio Commercial Quality)</option>
                    <option value="Lykon/dreamshaper-xl-v2-turbo">🎭 DreamShaper XL (Story &amp; Fantasy)</option>
                    <option value="stabilityai/stable-diffusion-xl-base-1.0">⚡ SDXL 1.0 (Universal High Detail)</option>
                    <option value="flux-anime">🌸 FLUX Anime / Sakuga (Clean Faces)</option>
                    <option value="stabilityai/sd-turbo">⚡ SD Turbo (Instant 0.3s Draft)</option>
                  </select>
                </label>
                <label>Ratio
                  <select id="imageAspectRatio">
                    <option value="1:1" selected>1:1 Square (1024×1024)</option>
                    <option value="16:9">16:9 Cinematic (1344×768)</option>
                    <option value="9:16">9:16 Story / Mobile (768×1344)</option>
                    <option value="3:4">3:4 Portrait (768×1024)</option>
                    <option value="4:3">4:3 Classic (1024×768)</option>
                    <option value="2:3">2:3 Photo (832×1248)</option>
                    <option value="21:9">21:9 Ultra-Wide (1536×640)</option>
                    <option value="custom">⚙️ Custom (W × H)</option>
                  </select>
                </label>
                <label>Quality
                  <select id="imageResolution" style="width:115px;">
                    <option value="1024" selected>1024px (HD)</option>
                    <option value="1280">1280px (720p)</option>
                    <option value="1920">1920px (1080p)</option>
                    <option value="768">768px (Draft)</option>
                    <option value="512">512px (Fast)</option>
                  </select>
                </label>
                <div class="dimensions-pill" style="display:inline-flex; align-items:center; gap:4px; font-size:12px; background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:2px 8px;">
                  <span style="color:var(--text-muted); font-size:11px;">Size:</span>
                  <input id="imageWidthInput" type="number" value="1024" min="256" max="2048" step="16" style="width:58px; height:24px; padding:2px 4px; font-size:11px; text-align:center;" title="Image Width in pixels" />
                  <span style="color:var(--text-muted); font-size:11px;">×</span>
                  <input id="imageHeightInput" type="number" value="1024" min="256" max="2048" step="16" style="width:58px; height:24px; padding:2px 4px; font-size:11px; text-align:center;" title="Image Height in pixels" />
                </div>
              </div>
            </div>

            <!-- Row 2: Fine Tuning Parameters, Seed & Facial Chips -->
            <div class="composer-toolbar-secondary" style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06);">
              <div class="inline-controls" style="flex-wrap:wrap; gap:8px;">
                <label>Steps
                  <input id="imageSteps" type="number" value="12" min="4" max="60" style="width:48px" />
                </label>
                <label>CFG
                  <input id="imageCfg" type="number" step="0.5" value="3.0" min="1" max="15" style="width:48px" />
                </label>
                <div style="display:inline-flex; align-items:center; gap:4px; font-size:12px;">
                  <label for="imageSeedInput">Seed</label>
                  <input id="imageSeedInput" type="number" placeholder="Random" style="width:90px;" />
                  <button id="btnRandomizeSeed" type="button" class="btn-compact btn-secondary" style="padding:4px 7px;" title="Roll Random Seed">🎲</button>
                  <button id="btnToggleSeedLock" type="button" class="btn-compact btn-secondary" style="padding:4px 7px;" title="Lock/Unlock Seed">🔓</button>
                </div>
                <label class="checkbox-row compact" style="margin-left:4px; font-size:12px; display:inline-flex; align-items:center; gap:5px; color:var(--accent-cyan); cursor:pointer;" title="Inforces symmetrical pupils, realistic irises, natural lips, clean teeth, and suppresses deformed facial anatomy">
                  <input id="chkAnatomyBoost" type="checkbox" checked />
                  <span>👁️👄 Perfect Eyes, Lips &amp; Anatomy</span>
                </label>
              </div>

              <!-- Quick Facial & Quality Prompt Chips -->
              <div class="prompt-chips-row" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <button type="button" class="chip-btn" id="chipAddEyesLips" title="Add flawless eyes, pupil reflections, and natural lips tags">👁️👄 Flawless Eyes &amp; Lips</button>
                <button type="button" class="chip-btn" id="chipAddStudioPortrait" title="Add 85mm portrait lens, bokeh, and soft studio lighting">📸 85mm Portrait</button>
                <button type="button" class="chip-btn" id="chipAddAntiDeform" title="Auto-fill negative prompt against deformed eyes, mouths, and bad teeth">🚫 Auto-Filter Flaws</button>
              </div>
            </div>

            <!-- Prompt Inputs -->
            <div style="margin-top:8px;">
              <textarea id="imagePromptInput" rows="2" placeholder="Describe subject, facial expression, eye color, lighting, outfit, and atmosphere..."></textarea>
            </div>
            <div style="margin-top:6px;">
              <input id="imageNegativePromptInput" type="text" style="width:100%; font-size:12px; padding:6px 12px; background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:6px; color:var(--text-muted);" placeholder="Negative prompt (e.g., deformed eyes, bad pupils, crooked mouth, bad teeth, extra limbs, bad anatomy)..." />
            </div>

            <!-- Action Buttons -->
            <div class="composer-actions">
              <button id="btnQueueImageBatch" type="button" class="btn-amber">+ Queue 3 Variations</button>
              <button id="btnQueueImage" type="button" class="btn-secondary">+ Add to Queue</button>
              <button id="btnGenerateImage" type="button" class="btn-primary">Render Image (0.12 CU)</button>
            </div>
          </div>

          <!-- Gallery Control Header Bar -->
          <div class="gallery-header-bar" style="display:flex; align-items:center; justify-content:space-between; margin:14px 0 10px; padding:6px 12px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.06); border-radius:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span id="galleryCountLabel" style="font-size:12px; font-weight:600; color:var(--text-primary);">🖼️ Generated Creations</span>
              <span id="galleryRatioFilterNote" style="font-size:11px; color:var(--text-muted);">True aspect-ratio display</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11.5px; color:var(--text-muted);">View Mode:</span>
              <button type="button" id="btnGalleryViewFit" class="btn-compact btn-secondary active-view-toggle" title="Display complete photo without cropping (Natural Ratio)">🔲 Fit (No Crop)</button>
              <button type="button" id="btnGalleryViewCover" class="btn-compact btn-secondary" title="Fill cards uniformly">⬛ Cover Grid</button>
            </div>
          </div>

          <div id="imageGalleryGrid" class="media-gallery-grid gallery-mode-fit"></div>`;

if (oldComposerRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(oldComposerRegex, newComposerHtml);
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log('✅ Updated public/index.html with rich controls & gallery header');
} else {
  console.error('❌ Could not find old composer in index.html');
}
