with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update openLightbox signature and usage
old_lightbox = '''function openLightbox(url, prompt, meta) {
  const modal = document.getElementById('mediaLightboxModal');
  const img = document.getElementById('lightboxImage');
  const promptEl = document.getElementById('lightboxPrompt');
  const metaEl = document.getElementById('lightboxMeta');
  const downloadLink = document.getElementById('btnLightboxDownload');

  img.src = url;
  promptEl.textContent = prompt || 'Generated Visual';
  metaEl.textContent = meta || 'FLUX 1024x576';
  downloadLink.href = url;
  modal.classList.remove('hidden');
}'''

new_lightbox = '''function openLightbox(url, prompt, meta, downloadFilename = 'render.jpg') {
  const modal = document.getElementById('mediaLightboxModal');
  const img = document.getElementById('lightboxImage');
  const promptEl = document.getElementById('lightboxPrompt');
  const metaEl = document.getElementById('lightboxMeta');
  const downloadLink = document.getElementById('btnLightboxDownload');

  img.src = url;
  promptEl.textContent = prompt || 'Generated Visual';
  metaEl.textContent = meta || 'FLUX 1024x576';
  downloadLink.href = url;
  downloadLink.download = downloadFilename;
  modal.classList.remove('hidden');
}'''

if old_lightbox in text:
    text = text.replace(old_lightbox, new_lightbox, 1)
    print('Updated openLightbox!')
else:
    print('openLightbox marker not found!')

# 2. Update renderImageStudio and add helpers
start_marker = 'function renderImageStudio() {'
end_marker = 'const videoPlaybackTimers = new Map();'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('renderImageStudio markers not found!')
    exit(1)

replacement = '''function getDescriptiveFilename(img) {
  if (img.fileName) return img.fileName;
  let modelTag = (img.model || 'Diffusers').split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  if (/dreamshaper/i.test(img.model)) modelTag = 'DreamShaperXL';
  else if (/flux.*realism/i.test(img.model)) modelTag = 'FLUX-Realism';
  else if (/flux/i.test(img.model)) modelTag = 'FLUX1-dev';
  else if (/turbo/i.test(img.model)) modelTag = 'SD-Turbo';
  const slug = (img.prompt || 'render').toLowerCase().replace(/[^a-z0-9\\s]/g, '').trim().split(/\\s+/).slice(0, 4).join('_').slice(0, 28) || 'visual';
  const ratio = (img.aspectRatio || '16-9').replace(':', '-');
  return `${modelTag}_${slug}_s${img.seed || 0}_cfg${img.cfgScale || 2}_st${img.steps || 8}.${img.imageUrl && img.imageUrl.endsWith('.svg') ? 'svg' : 'jpg'}`;
}

let activeTraceImage = null;

function openTraceModal(img) {
  activeTraceImage = img;
  const modal = document.getElementById('imageTraceModal');
  if (!modal) return;
  const finalUrl = img.imageUrl || `/media/${img.id}.svg`;
  const fileName = getDescriptiveFilename(img);

  const thumb = document.getElementById('traceModalThumb');
  if (thumb) thumb.src = finalUrl;
  const chipModel = document.getElementById('traceChipModel');
  if (chipModel) chipModel.textContent = (img.model || 'Diffusers').split('/').pop();
  const chipSeed = document.getElementById('traceChipSeed');
  if (chipSeed) chipSeed.textContent = img.seed || '-';
  const chipRes = document.getElementById('traceChipRes');
  if (chipRes) chipRes.textContent = `${img.width || 1024}x${img.height || 576} (${img.aspectRatio || '16:9'})`;
  const chipSteps = document.getElementById('traceChipSteps');
  if (chipSteps) chipSteps.textContent = `${img.steps || 8} steps`;
  const chipCfg = document.getElementById('traceChipCfg');
  if (chipCfg) chipCfg.textContent = `${img.cfgScale || 2.0}`;
  const chipGpu = document.getElementById('traceChipGpu');
  if (chipGpu) chipGpu.textContent = img.gpuInfo?.tier ? `${img.gpuInfo.tier} (${img.gpuInfo.elapsedSec ? img.gpuInfo.elapsedSec + 's' : '0.4s'})` : (appState?.colab?.gpuTier || 'A100');

  const pText = document.getElementById('tracePromptText');
  if (pText) pText.value = img.prompt || '';
  const nText = document.getElementById('traceNegativeText');
  if (nText) nText.value = img.negativePrompt || 'deformed iris, deformed pupils, bad eyes, cross-eyed, bad anatomy, deformed hands, extra fingers, mutated hands, poorly drawn face, disfigured, blurry';
  const fText = document.getElementById('traceFilenameText');
  if (fText) fText.value = fileName;

  const btnDlImg = document.getElementById('btnDownloadProperImage');
  if (btnDlImg) {
    btnDlImg.href = finalUrl;
    btnDlImg.download = fileName;
  }

  modal.classList.remove('hidden');
}

function closeTraceModal() {
  const modal = document.getElementById('imageTraceModal');
  if (modal) modal.classList.add('hidden');
}

function renderImageStudio() {
  if (!appState) return;
  document.getElementById('imageActiveModelPill').textContent = appState.models.activeImageModel;
  const grid = document.getElementById('imageGalleryGrid');
  const signature = appState.images.map(i => i.id + ':' + (i.imageUrl || '')).join('|');
  if (grid.dataset.lastSig === signature) return;
  grid.dataset.lastSig = signature;

  grid.innerHTML = appState.images.map(img => {
    const fallbackUrl = `/media/${img.id}.svg`;
    const finalUrl = img.imageUrl || fallbackUrl;
    const properName = getDescriptiveFilename(img);
    const shortModel = (img.model || 'Diffusers').split('/').pop();

    return `
      <div class="media-card" data-img-id="${img.id}">
        <div class="media-visual-wrap">
          <img class="media-visual" src="${finalUrl}" alt="${escapeHtml(img.prompt)}" loading="lazy" onerror="this.onerror=null; this.src='https://pollinations.ai/p/${encodeURIComponent(img.prompt)}?width=1024&height=576&seed=${img.seed}';" />
          <div class="media-overlay-actions">
            <button class="btn-overlay btn-view-image" data-url="${finalUrl}" data-prompt="${escapeHtml(img.prompt)}" data-meta="${escapeHtml(img.aspectRatio || '16:9')} · Seed ${img.seed} · ${escapeHtml(shortModel)}" data-filename="${escapeHtml(properName)}">🔍 View HD</button>
            <button class="btn-overlay btn-trace-image" data-img-id="${img.id}" title="Inspect full prompt, seed, model, CFG and trace">⚙️ Trace</button>
            <a class="btn-overlay" href="${finalUrl}" target="_blank" download="${escapeHtml(properName)}" title="Download with proper descriptive filename">💾 Download</a>
            <button class="btn-overlay btn-delete-image" data-img-id="${img.id}" title="Delete Image" style="color:#f87171;">✕</button>
            <button class="btn-overlay btn-copy-image-prompt" data-prompt="${escapeHtml(img.prompt)}" title="Copy full prompt">📋 Prompt</button>
          </div>
        </div>
        <div class="media-info">
          <div class="media-prompt" title="${escapeHtml(img.prompt)}">${escapeHtml(img.prompt)}</div>
          <div class="media-meta-row">
            <span title="Model Repo: ${escapeHtml(img.model)}">🏷️ ${escapeHtml(shortModel)}</span>
            <span class="mono-meta" style="font-size:11px;">${img.aspectRatio || '16:9'} · s${img.seed} · CFG ${img.cfgScale || 2} · ${img.steps || 8}st</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-view-image').forEach(btn => {
    btn.onclick = () => {
      openLightbox(btn.dataset.url, btn.dataset.prompt, btn.dataset.meta, btn.dataset.filename);
    };
  });

  grid.querySelectorAll('.btn-trace-image').forEach(btn => {
    btn.onclick = () => {
      const img = appState.images.find(i => i.id === btn.dataset.imgId);
      if (img) openTraceModal(img);
    };
  });

  grid.querySelectorAll('.btn-copy-image-prompt').forEach(btn => {
    btn.onclick = () => {
      navigator.clipboard.writeText(btn.dataset.prompt);
      showToast('Prompt copied to clipboard!');
    };
  });

  grid.querySelectorAll('.btn-delete-image').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.dataset.imgId;
      await apiPost('/api/studio/image/delete', { id });
      if (appState) appState.images = appState.images.filter(img => img.id !== id);
      grid.dataset.lastSig = ''; // Force re-render
      renderImageStudio();
      showToast('Image deleted');
    };
  });
}

'''

text = text[:start_idx] + replacement + text[end_idx:]

# 3. Add trace modal event listeners before final close
listener_hook = "const btnCloseLightbox = document.getElementById('btnCloseLightbox');"
trace_listeners = """  // Generation Trace Modal Listeners
  const btnCloseTrace = document.getElementById('btnCloseTraceModal');
  if (btnCloseTrace) btnCloseTrace.onclick = closeTraceModal;

  const btnCopyTracePrompt = document.getElementById('btnCopyTracePrompt');
  if (btnCopyTracePrompt) {
    btnCopyTracePrompt.onclick = () => {
      const val = document.getElementById('tracePromptText')?.value || '';
      navigator.clipboard.writeText(val);
      showToast('Copied generation prompt to clipboard!');
    };
  }

  const btnCopyTraceNegative = document.getElementById('btnCopyTraceNegative');
  if (btnCopyTraceNegative) {
    btnCopyTraceNegative.onclick = () => {
      const val = document.getElementById('traceNegativeText')?.value || '';
      navigator.clipboard.writeText(val);
      showToast('Copied negative prompt to clipboard!');
    };
  }

  const btnCopyTraceFilename = document.getElementById('btnCopyTraceFilename');
  if (btnCopyTraceFilename) {
    btnCopyTraceFilename.onclick = () => {
      const val = document.getElementById('traceFilenameText')?.value || '';
      navigator.clipboard.writeText(val);
      showToast('Copied descriptive filename!');
    };
  }

  const btnDownloadSidecarJson = document.getElementById('btnDownloadSidecarJson');
  if (btnDownloadSidecarJson) {
    btnDownloadSidecarJson.onclick = () => {
      if (!activeTraceImage) return;
      const fn = getDescriptiveFilename(activeTraceImage).replace(/\\.(jpg|svg)$/, '.json');
      const sidecarData = {
        id: activeTraceImage.id,
        filename: getDescriptiveFilename(activeTraceImage),
        model: activeTraceImage.model,
        prompt: activeTraceImage.prompt,
        enhancedPrompt: activeTraceImage.enhancedPrompt,
        negativePrompt: activeTraceImage.negativePrompt,
        settings: {
          seed: activeTraceImage.seed,
          steps: activeTraceImage.steps,
          cfgScale: activeTraceImage.cfgScale,
          aspectRatio: activeTraceImage.aspectRatio,
          width: activeTraceImage.width,
          height: activeTraceImage.height,
          anatomyBoost: activeTraceImage.anatomyBoost
        },
        hardware: activeTraceImage.gpuInfo,
        createdAt: activeTraceImage.createdAt
      };
      const blob = new Blob([JSON.stringify(sidecarData, null, 2)], { type: 'application/json' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = fn;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
      showToast(`Downloaded metadata sidecar: ${fn}`);
    };
  }

  const btnApplyTraceToStudio = document.getElementById('btnApplyTraceToStudio');
  if (btnApplyTraceToStudio) {
    btnApplyTraceToStudio.onclick = () => {
      if (!activeTraceImage) return;
      const img = activeTraceImage;
      const promptInput = document.getElementById('imagePromptInput');
      if (promptInput) promptInput.value = img.prompt || '';
      const negInput = document.getElementById('imageNegativePromptInput');
      if (negInput) negInput.value = img.negativePrompt || '';
      const ratioSelect = document.getElementById('imageAspectRatio');
      if (ratioSelect && img.aspectRatio) ratioSelect.value = img.aspectRatio;
      const stepsInput = document.getElementById('imageSteps');
      if (stepsInput && img.steps) stepsInput.value = img.steps;
      const cfgInput = document.getElementById('imageCfg');
      if (cfgInput && img.cfgScale) cfgInput.value = img.cfgScale;
      const modelSelect = document.getElementById('imageModelSelect');
      if (modelSelect && img.model) {
        let matched = false;
        for (const opt of modelSelect.options) {
          if (opt.value === img.model) { modelSelect.value = img.model; matched = true; break; }
        }
        if (!matched && img.model.includes('dreamshaper')) modelSelect.value = 'Lykon/dreamshaper-xl-v2-turbo';
      }
      closeTraceModal();
      const tabBtn = document.querySelector('[data-tab="image"]');
      if (tabBtn) tabBtn.click();
      showToast('Loaded generation trace & settings into Image Studio!');
    };
  }

  """

if listener_hook in text:
    text = text.replace(listener_hook, trace_listeners + listener_hook, 1)
    print('Added trace modal listeners!')
else:
    print('listener_hook not found!')

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated public/app.js successfully!')
