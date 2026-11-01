with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = '''function openLightbox(url, prompt, meta, downloadFilename = 'render.jpg') {
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

new_block = '''let currentLightboxIndex = -1;

function getLightboxImageList() {
  if (!appState || !Array.isArray(appState.images)) return [];
  return appState.images.filter(img => img.imageUrl && !img.imageUrl.includes('placeholder'));
}

function updateLightboxView(index) {
  const list = getLightboxImageList();
  if (!list.length) return;
  if (index < 0) index = list.length - 1;
  if (index >= list.length) index = 0;
  currentLightboxIndex = index;

  const cur = list[index];
  const url = cur.imageUrl || `/media/${cur.id}.svg`;
  const prompt = cur.prompt || 'Generated Visual';
  const meta = `${cur.aspectRatio || '16:9'} · Seed ${cur.seed} · ${(cur.model || 'Diffusers').split('/').pop()}`;
  const downloadFilename = (typeof getDescriptiveFilename === 'function') ? getDescriptiveFilename(cur) : `${cur.id}.jpg`;

  const modal = document.getElementById('mediaLightboxModal');
  const img = document.getElementById('lightboxImage');
  const promptEl = document.getElementById('lightboxPrompt');
  const metaEl = document.getElementById('lightboxMeta');
  const downloadLink = document.getElementById('btnLightboxDownload');

  img.src = url;
  promptEl.textContent = prompt;
  metaEl.textContent = `${meta} · [${index + 1} / ${list.length}]`;
  downloadLink.href = url;
  downloadLink.download = downloadFilename;

  modal.classList.remove('hidden');
}

function openLightbox(url, prompt, meta, downloadFilename = 'render.jpg') {
  const list = getLightboxImageList();
  const foundIdx = list.findIndex(i => i.imageUrl === url || `/media/${i.id}.jpg` === url || `/media/${i.id}.svg` === url);
  if (foundIdx !== -1) {
    updateLightboxView(foundIdx);
  } else {
    currentLightboxIndex = -1;
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
  }
}

function prevLightboxImage() {
  const list = getLightboxImageList();
  if (!list.length) return;
  const newIdx = currentLightboxIndex <= 0 ? list.length - 1 : currentLightboxIndex - 1;
  updateLightboxView(newIdx);
}

function nextLightboxImage() {
  const list = getLightboxImageList();
  if (!list.length) return;
  const newIdx = currentLightboxIndex >= list.length - 1 ? 0 : currentLightboxIndex + 1;
  updateLightboxView(newIdx);
}'''

if old_block in text:
    text = text.replace(old_block, new_block, 1)
    print('Updated openLightbox with carousel index navigation!')
else:
    print('old_block not found in app.js!')
    exit(1)

# Hook up prev/next button clicks and Left/Right keyboard events
listeners_marker = "const btnCloseLightbox = document.getElementById('btnCloseLightbox');"
nav_listeners = '''  const btnPrevLb = document.getElementById('btnLightboxPrev');
  const btnNextLb = document.getElementById('btnLightboxNext');
  if (btnPrevLb) btnPrevLb.addEventListener('click', (e) => { e.stopPropagation(); prevLightboxImage(); });
  if (btnNextLb) btnNextLb.addEventListener('click', (e) => { e.stopPropagation(); nextLightboxImage(); });

  // Arrow key keyboard navigation
  window.addEventListener('keydown', (e) => {
    const lbModal = document.getElementById('mediaLightboxModal');
    if (!lbModal || lbModal.classList.contains('hidden')) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevLightboxImage();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextLightboxImage();
    } else if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  '''

if listeners_marker in text:
    text = text.replace(listeners_marker, nav_listeners + listeners_marker, 1)
    print('Added keyboard and button event listeners!')
else:
    print('listeners_marker not found!')

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated public/app.js successfully!')
