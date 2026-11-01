with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update queue toggle to save preference in localStorage and handle button active styling
target = """    const btnToggleQueue = document.getElementById('btnToggleQueueDock');
    const btnCloseQueue = document.getElementById('btnCloseQueueDock');
    if (btnToggleQueue && workbenchGrid) {
      btnToggleQueue.addEventListener('click', () => {
        workbenchGrid.classList.toggle('queue-hidden');
      });
    }
    if (btnCloseQueue && workbenchGrid) {
      btnCloseQueue.addEventListener('click', () => {
        workbenchGrid.classList.add('queue-hidden');
      });
    }"""

replacement = """    const btnToggleQueue = document.getElementById('btnToggleQueueDock');
    const btnCloseQueue = document.getElementById('btnCloseQueueDock');

    // Restore saved queue visibility preference (default: hidden)
    const savedQueueVis = localStorage.getItem('colab_queue_visible');
    if (savedQueueVis === 'true') {
      workbenchGrid.classList.remove('queue-hidden');
      btnToggleQueue?.classList.add('active');
    } else {
      workbenchGrid.classList.add('queue-hidden');
      btnToggleQueue?.classList.remove('active');
    }

    if (btnToggleQueue && workbenchGrid) {
      btnToggleQueue.addEventListener('click', () => {
        const isHidden = workbenchGrid.classList.toggle('queue-hidden');
        localStorage.setItem('colab_queue_visible', String(!isHidden));
        btnToggleQueue.classList.toggle('active', !isHidden);
      });
    }
    if (btnCloseQueue && workbenchGrid) {
      btnCloseQueue.addEventListener('click', () => {
        workbenchGrid.classList.add('queue-hidden');
        localStorage.setItem('colab_queue_visible', 'false');
        btnToggleQueue?.classList.remove('active');
      });
    }"""

if target in text:
    text = text.replace(target, replacement, 1)
    print('Updated queue toggle with localStorage persistence!')
else:
    print('target not found in app.js!')

# 2. Add thumbnail click directly opens lightbox!
card_click_target = """  grid.querySelectorAll('.btn-view-image').forEach(btn => {
    btn.onclick = () => {
      openLightbox(btn.dataset.url, btn.dataset.prompt, btn.dataset.meta, btn.dataset.filename);
    };
  });"""

card_click_replacement = """  grid.querySelectorAll('.btn-view-image').forEach(btn => {
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
  });"""

if card_click_target in text:
    text = text.replace(card_click_target, card_click_replacement, 1)
    print('Added direct thumbnail click handler!')
else:
    print('card_click_target not found in app.js!')

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated public/app.js successfully!')
