with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = """  const btnToggleQueue = document.getElementById('btnToggleQueueDock');
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

replacement = """  const btnToggleQueue = document.getElementById('btnToggleQueueDock');
  const btnCloseQueue = document.getElementById('btnCloseQueueDock');

  // Check saved preference: default is hidden so thumbnails and gallery take full width
  const savedQueue = localStorage.getItem('colab_queue_visible');
  if (savedQueue === 'true') {
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
    with open('public/app.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated queue toggle in public/app.js!')
else:
    print('target not found!')
