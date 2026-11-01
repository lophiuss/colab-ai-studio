import fs from 'node:fs';

const appPath = 'public/app.js';
let appJs = fs.readFileSync(appPath, 'utf8');

// 1. Replace renderImageStudio
const oldRenderImageRegex = /function renderImageStudio\(\) \{[\s\S]*?grid\.querySelectorAll\('\.btn-copy-image-prompt'\)\.forEach\(btn => \{[\s\S]*?\}\);[\s\S]*?\}/;

const newRenderImage = `function renderImageStudio() {
  if (!appState) return;
  const activeModelEl = document.getElementById('imageActiveModelPill');
  const selModel = document.getElementById('imageModelSelect')?.value;
  if (activeModelEl) activeModelEl.textContent = selModel || (appState.models ? appState.models.activeImageModel : 'FLUX Realism');
  
  const countEl = document.getElementById('galleryCountLabel');
  if (countEl && appState.images) countEl.textContent = '🖼️ Generated Creations (' + appState.images.length + ')';

  const grid = document.getElementById('imageGalleryGrid');
  if (!grid) return;
  const signature = (appState.images || []).map(i => i.id + ':' + (i.imageUrl || '')).join('|');
  if (grid.dataset.lastSig === signature) return;
  grid.dataset.lastSig = signature;

  if (!appState.images || appState.images.length === 0) {
    grid.innerHTML = \`
      <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; color: var(--text-muted); background: var(--bg-panel); border: 1px dashed var(--border-hairline); border-radius: 12px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🎨</div>
        <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No images generated yet</div>
        <div style="font-size: 13px;">Choose your model and aspect ratio above, then click "Render Image" to generate your first creation.</div>
      </div>
    \`;
    return;
  }

  grid.innerHTML = appState.images.map(img => {
    const finalUrl = img.imageUrl || ('/media/' + (img.fileName || (img.id + '.jpg')));
    const properName = getDescriptiveFilename(img);
    const shortModel = (img.model || 'FLUX-Realism').split('/').pop();
    const ratioTag = img.aspectRatio || (img.width && img.height ? (img.width + '×' + img.height) : '1:1');

    return \`
      <div class="media-card" data-img-id="\${img.id}" data-ratio="\${img.aspectRatio || '1:1'}">
        <div class="media-visual-wrap">
          <img class="media-visual-backdrop" src="\${finalUrl}" alt="" aria-hidden="true" />
          <img class="media-visual" src="\${finalUrl}" alt="\${escapeHtml(img.prompt)}" loading="lazy" onerror="this.onerror=null; this.classList.add('media-img-error');" />
          <span class="ratio-badge">\${escapeHtml(ratioTag)}</span>
          <div class="media-overlay-actions">
            <button class="btn-overlay-icon btn-view-image" data-url="\${finalUrl}" data-prompt="\${escapeHtml(img.prompt)}" data-meta="\${escapeHtml(ratioTag)} · Seed \${img.seed} · \${escapeHtml(shortModel)}" data-filename="\${escapeHtml(properName)}" title="🔍 Enlarge / Zoom HD (Lightbox)">🔍</button>
            <button class="btn-overlay-icon btn-trace-image" data-img-id="\${img.id}" title="⚙️ Generation Trace &amp; Parameters">⚙️</button>
            <a class="btn-overlay-icon" href="\${finalUrl}" target="_blank" download="\${escapeHtml(properName)}" title="💾 Download HD Master Image" onclick="event.stopPropagation()">💾</a>
            <button class="btn-overlay-icon btn-copy-image-prompt" data-prompt="\${escapeHtml(img.prompt)}" title="📋 Copy Prompt">📋</button>
            <button class="btn-overlay-icon btn-delete-image" data-img-id="\${img.id}" title="🗑️ Delete Image" style="color:#ef4444;">🗑️</button>
          </div>
        </div>
        <div class="media-info">
          <div class="media-prompt" title="\${escapeHtml(img.prompt)}">\${escapeHtml(img.prompt)}</div>
          <div class="media-meta-row">
            <span title="Model Repo: \${escapeHtml(img.model)}">🏷️ \${escapeHtml(shortModel)}</span>
            <span class="mono-meta" style="font-size:11px;">\${ratioTag} · s\${img.seed} · CFG \${img.cfgScale || 3} · \${img.steps || 12}st</span>
          </div>
        </div>
      </div>
    \`;
  }).join('');

  grid.querySelectorAll('.btn-view-image').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openLightbox(btn.dataset.url, btn.dataset.prompt, btn.dataset.meta, btn.dataset.filename);
    };
  });

  // Clicking directly on the image thumbnail also opens the lightbox immediately
  grid.querySelectorAll('.media-visual-wrap').forEach(wrap => {
    wrap.onclick = () => {
      const btnView = wrap.querySelector('.btn-view-image');
      if (btnView) {
        openLightbox(btnView.dataset.url, btnView.dataset.prompt, btnView.dataset.meta, btnView.dataset.filename);
      }
    };
  });

  grid.querySelectorAll('.btn-trace-image').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const img = appState.images.find(i => i.id === btn.dataset.imgId);
      if (img) openTraceModal(img);
    };
  });

  grid.querySelectorAll('.btn-copy-image-prompt').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.prompt);
      showToast('Copied Prompt to Clipboard!');
    };
  });

  grid.querySelectorAll('.btn-delete-image').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const imgId = btn.dataset.imgId;
      if (!confirm('Are you sure you want to delete this generated image?')) return;
      try {
        await apiPost('/api/studio/image/delete', { id: imgId });
        showToast('Deleted image asset');
        await fetchState();
      } catch (err) {
        showToast('Delete failed: ' + err.message);
      }
    };
  });
}`;

if (oldRenderImageRegex.test(appJs)) {
  appJs = appJs.replace(oldRenderImageRegex, newRenderImage);
  console.log('✅ Updated renderImageStudio in public/app.js');
} else {
  console.error('❌ Could not match oldRenderImageRegex in public/app.js');
}

// 2. Add dimension synchronization & Image Studio control handlers
const oldGenerateHandlerRegex = /const btnGenerateImage = document\.getElementById\('btnGenerateImage'\);[\s\S]*?btnGenerateImage\.addEventListener\('click'[\s\S]*?\}\);\s*\}/;

const newGenerateHandler = `let isSeedLocked = false;

  function syncImageDimensions() {
    const ratioSel = document.getElementById('imageAspectRatio');
    const resSel = document.getElementById('imageResolution');
    const wInput = document.getElementById('imageWidthInput');
    const hInput = document.getElementById('imageHeightInput');
    if (!ratioSel || !resSel || !wInput || !hInput) return;

    const ratio = ratioSel.value;
    const res = Number(resSel.value || 1024);
    if (ratio === 'custom') return;

    let w = res, h = res;
    if (ratio === '1:1') { w = res; h = res; }
    else if (ratio === '16:9') { w = Math.round(res * 16 / 9 / 16) * 16; h = res; }
    else if (ratio === '9:16') { w = res; h = Math.round(res * 16 / 9 / 16) * 16; }
    else if (ratio === '3:4') { w = Math.round(res * 3 / 4 / 16) * 16; h = res; }
    else if (ratio === '4:3') { w = res; h = Math.round(res * 3 / 4 / 16) * 16; }
    else if (ratio === '2:3') { w = Math.round(res * 2 / 3 / 16) * 16; h = res; }
    else if (ratio === '21:9') { w = Math.round(res * 21 / 9 / 16) * 16; h = res; }

    wInput.value = w;
    hInput.value = h;
  }

  // Dimension Sync Listeners
  const ratioSelect = document.getElementById('imageAspectRatio');
  const resSelect = document.getElementById('imageResolution');
  const wInputEl = document.getElementById('imageWidthInput');
  const hInputEl = document.getElementById('imageHeightInput');
  if (ratioSelect) ratioSelect.addEventListener('change', syncImageDimensions);
  if (resSelect) resSelect.addEventListener('change', syncImageDimensions);
  if (wInputEl) wInputEl.addEventListener('input', () => { if (ratioSelect) ratioSelect.value = 'custom'; });
  if (hInputEl) hInputEl.addEventListener('input', () => { if (ratioSelect) ratioSelect.value = 'custom'; });

  // Seed Randomizer & Lock Controls
  const seedInput = document.getElementById('imageSeedInput');
  const btnRandSeed = document.getElementById('btnRandomizeSeed');
  const btnLockSeed = document.getElementById('btnToggleSeedLock');
  if (btnRandSeed && seedInput) {
    btnRandSeed.onclick = () => {
      seedInput.value = Math.floor(10000000 + Math.random() * 90000000);
      showToast('Generated random seed: ' + seedInput.value);
    };
  }
  if (btnLockSeed && seedInput) {
    btnLockSeed.onclick = () => {
      isSeedLocked = !isSeedLocked;
      btnLockSeed.textContent = isSeedLocked ? '🔒' : '🔓';
      btnLockSeed.title = isSeedLocked ? 'Seed locked (reproducible iterations)' : 'Seed unlocked (random per render)';
      btnLockSeed.style.color = isSeedLocked ? 'var(--accent-amber)' : '';
      showToast(isSeedLocked ? '🔒 Seed Locked' : '🔓 Seed Unlocked');
    };
  }

  // Quick Facial & Quality Prompt Chips
  const promptInput = document.getElementById('imagePromptInput');
  const negPromptInput = document.getElementById('imageNegativePromptInput');
  const chipEyesLips = document.getElementById('chipAddEyesLips');
  const chipStudio = document.getElementById('chipAddStudioPortrait');
  const chipAntiDeform = document.getElementById('chipAddAntiDeform');

  if (chipEyesLips && promptInput) {
    chipEyesLips.onclick = () => {
      const text = 'symmetrical detailed eyes, natural moist lips, clean white teeth, realistic iris reflections, harmonious facial proportions';
      if (!promptInput.value.includes('symmetrical detailed eyes')) {
        promptInput.value = promptInput.value.trim() ? (promptInput.value.trim() + ', ' + text) : text;
        showToast('Injected flawless eyes & lips anatomical tags');
      }
    };
  }
  if (chipStudio && promptInput) {
    chipStudio.onclick = () => {
      const text = '85mm portrait photography, shallow depth of field, soft studio rim lighting, natural skin texture';
      if (!promptInput.value.includes('85mm portrait')) {
        promptInput.value = promptInput.value.trim() ? (promptInput.value.trim() + ', ' + text) : text;
        showToast('Injected 85mm studio portrait tags');
      }
    };
  }
  if (chipAntiDeform && negPromptInput) {
    chipAntiDeform.onclick = () => {
      const tags = 'deformed iris, deformed pupils, asymmetrical eyes, cross-eyed, misaligned pupils, crooked mouth, deformed lips, bad teeth, yellow teeth, extra teeth, distorted jaw, poorly drawn face, plastic skin, bad anatomy';
      negPromptInput.value = negPromptInput.value.trim() ? (negPromptInput.value.trim() + ', ' + tags) : tags;
      showToast('Filled anti-deformity facial filter tags');
    };
  }

  // Gallery View Mode Toggle (Fit vs Cover Grid)
  const btnFit = document.getElementById('btnGalleryViewFit');
  const btnCover = document.getElementById('btnGalleryViewCover');
  const galleryGrid = document.getElementById('imageGalleryGrid');
  function setGalleryViewMode(mode) {
    localStorage.setItem('colab_gallery_view_mode', mode);
    if (galleryGrid) {
      galleryGrid.classList.toggle('gallery-mode-fit', mode === 'fit');
      galleryGrid.classList.toggle('gallery-mode-cover', mode === 'cover');
    }
    if (btnFit) btnFit.classList.toggle('active-view-toggle', mode === 'fit');
    if (btnCover) btnCover.classList.toggle('active-view-toggle', mode === 'cover');
  }
  if (btnFit) btnFit.onclick = () => setGalleryViewMode('fit');
  if (btnCover) btnCover.onclick = () => setGalleryViewMode('cover');
  setGalleryViewMode(localStorage.getItem('colab_gallery_view_mode') || 'fit');

  const btnGenerateImage = document.getElementById('btnGenerateImage');
  if (btnGenerateImage) {
    btnGenerateImage.addEventListener('click', async () => {
      const prompt = document.getElementById('imagePromptInput').value.trim() || 'Rain-slicked clockwork harbor at dusk, volumetric amber lantern light';
      const model = document.getElementById('imageModelSelect')?.value || 'flux-realism';
      const aspectRatio = document.getElementById('imageAspectRatio')?.value || '1:1';
      const resolution = document.getElementById('imageResolution')?.value || '1024';
      const width = document.getElementById('imageWidthInput')?.value || '1024';
      const height = document.getElementById('imageHeightInput')?.value || '1024';
      const steps = document.getElementById('imageSteps')?.value || '12';
      const cfgScale = document.getElementById('imageCfg')?.value || '3.0';
      const seed = isSeedLocked && seedInput.value ? seedInput.value : (seedInput.value || undefined);
      const anatomyBoost = document.getElementById('chkAnatomyBoost')?.checked ?? true;
      const negativePrompt = document.getElementById('imageNegativePromptInput')?.value.trim() || '';

      btnGenerateImage.disabled = true;
      btnGenerateImage.textContent = 'Rendering high-fidelity visual... ⏳';

      // Insert immediate live generating card at top of gallery
      const grid = document.getElementById('imageGalleryGrid');
      let placeholderCard = null;
      if (grid) {
        placeholderCard = document.createElement('div');
        placeholderCard.className = 'media-card media-card-generating';
        placeholderCard.innerHTML = \`
          <div class="media-visual-wrap" style="height:215px;">
            <div style="text-align:center; padding:20px; z-index:2;">
              <div style="font-size:32px; animation:spin 1.5s infinite linear; display:inline-block; margin-bottom:8px;">⚙️</div>
              <div style="font-size:13px; font-weight:600; color:var(--text-primary);">Synthesizing with \${model.split('/').pop()}</div>
              <div style="font-size:11px; color:var(--accent-cyan); margin-top:4px;">\${aspectRatio} (\${width}×\${height}) · High-Fidelity Anatomy</div>
            </div>
          </div>
          <div class="media-info" style="padding:10px;">
            <div class="media-prompt" style="color:var(--text-muted);">\${escapeHtml(prompt)}</div>
          </div>
        \`;
        if (grid.firstChild) grid.insertBefore(placeholderCard, grid.firstChild);
        else grid.appendChild(placeholderCard);
      }

      try {
        await apiPost('/api/studio/image', {
          prompt,
          model,
          aspectRatio,
          resolution,
          width,
          height,
          steps,
          cfgScale,
          seed,
          anatomyBoost,
          negativePrompt
        });
        showToast('Rendered high-resolution image with anatomical enhancement!');
        await fetchState();
      } catch (err) {
        showToast('Image render failed: ' + err.message);
      } finally {
        if (placeholderCard && placeholderCard.parentNode) {
          placeholderCard.parentNode.removeChild(placeholderCard);
        }
        btnGenerateImage.disabled = false;
        btnGenerateImage.textContent = 'Render Image (0.12 CU)';
      }
    });
  }`;

if (oldGenerateHandlerRegex.test(appJs)) {
  appJs = appJs.replace(oldGenerateHandlerRegex, newGenerateHandler);
  console.log('✅ Updated btnGenerateImage handler & dimension sync in public/app.js');
} else {
  console.error('❌ Could not match oldGenerateHandlerRegex in public/app.js');
}

fs.writeFileSync(appPath, appJs, 'utf8');
