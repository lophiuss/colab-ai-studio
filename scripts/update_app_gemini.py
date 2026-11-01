with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update renderQueueDock to update topQueueBadge count and render compact cards
old_render_queue = '''function renderQueueDock() {
  if (!appState) return;
  const { queue, computeUnits } = appState;
  document.getElementById('queueAutoRunCheckbox').checked = Boolean(queue.autoRunEnabled);
  document.getElementById('dockAutoShutdownCheckbox').checked = Boolean(computeUnits.autoShutdownOnQueueFinish);

  const queuedCount = queue.items.filter(i => i.status === 'QUEUED').length;
  const runningCount = queue.items.filter(i => i.status === 'RUNNING').length;
  const estCU = queue.items
    .filter(i => i.status === 'QUEUED' || i.status === 'RUNNING')
    .reduce((acc, i) => acc + Number(i.estimatedCU || 0.06), 0);

  document.getElementById('queueStatsBar').innerHTML = `
    <span>${queuedCount} Queued</span>
    <span>${runningCount} Running</span>
    <span>Est: ${estCU.toFixed(2)} CU</span>
  `;

  const container = document.getElementById('queueItemsContainer');
  container.innerHTML = queue.items.map(item => `
    <div class="queue-card ${item.status}">
      <div class="queue-card-top">
        <span class="queue-badge ${item.status}">${item.type.toUpperCase()} · ${item.status}</span>
        <span class="mono-meta" style="font-size:11px;color:var(--text-muted);">${item.estimatedCU} CU</span>
      </div>
      <div class="queue-title">${escapeHtml(item.title)}</div>
      ${item.vramSwapNotice ? `<div class="queue-vram-swap">⚡ ${escapeHtml(item.vramSwapNotice)}</div>` : ''}
      <div class="startup-bar-track">
        <div class="startup-bar-fill" style="width:${item.progress || 0}%"></div>
      </div>
      ${item.resultSummary ? `<div class="queue-result">${escapeHtml(item.resultSummary)}</div>` : ''}
    </div>
  `).join('');
}'''

new_render_queue = '''function renderQueueDock() {
  if (!appState) return;
  const { queue, computeUnits } = appState;
  const autoRunChk = document.getElementById('queueAutoRunCheckbox');
  if (autoRunChk) autoRunChk.checked = Boolean(queue.autoRunEnabled);
  const autoShutChk = document.getElementById('dockAutoShutdownCheckbox');
  if (autoShutChk) autoShutChk.checked = Boolean(computeUnits.autoShutdownOnQueueFinish);

  const queuedCount = queue.items.filter(i => i.status === 'QUEUED').length;
  const runningCount = queue.items.filter(i => i.status === 'RUNNING').length;
  const activeCount = queuedCount + runningCount;
  const topBadge = document.getElementById('topQueueBadge');
  if (topBadge) {
    topBadge.textContent = activeCount;
    topBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }

  const estCU = queue.items
    .filter(i => i.status === 'QUEUED' || i.status === 'RUNNING')
    .reduce((acc, i) => acc + Number(i.estimatedCU || 0.06), 0);

  const statsBar = document.getElementById('queueStatsBar');
  if (statsBar) {
    statsBar.innerHTML = `
      <span>${queuedCount} Queued</span>
      <span>${runningCount} Running</span>
      <span>Est: ${estCU.toFixed(2)} CU</span>
    `;
  }

  // Render high-density, multi-line visible task cards
  const container = document.getElementById('queueItemsContainer');
  if (container) {
    container.innerHTML = queue.items.map(item => `
      <div class="queue-card ${item.status}" title="${escapeHtml(item.title)}">
        <div class="queue-card-top">
          <span class="queue-badge ${item.status}">${item.type.toUpperCase()} · ${item.status}</span>
          <span class="mono-meta" style="font-size:10px; color:var(--text-muted);">${item.estimatedCU} CU</span>
        </div>
        <div class="queue-title">${escapeHtml(item.title)}</div>
        ${item.vramSwapNotice ? `<div class="queue-vram-swap">⚡ ${escapeHtml(item.vramSwapNotice)}</div>` : ''}
        ${item.resultSummary ? `<div class="queue-result">${escapeHtml(item.resultSummary)}</div>` : ''}
      </div>
    `).join('');
  }
}'''

if old_render_queue in text:
    text = text.replace(old_render_queue, new_render_queue, 1)
    print('Updated renderQueueDock!')
else:
    print('renderQueueDock marker not found, trying partial replace...')

# 2. Add Gemini Sidebar render function (recent chats and recent generations)
gemini_render_func = '''
function renderGeminiSidebar() {
  if (!appState) return;

  // 1. Render Recent Chats
  const chatsListEl = document.getElementById('geminiRecentChatsList');
  if (chatsListEl) {
    const chats = appState.chats || [];
    chatsListEl.innerHTML = chats.length ? chats.slice(0, 10).map(c => `
      <div class="gemini-history-item ${c.id === appState.activeChatId ? 'active' : ''}" data-chat-id="${c.id}">
        <span class="gemini-history-title">💬 ${escapeHtml(c.title)}</span>
        <button type="button" class="gemini-history-del" data-del-chat="${c.id}" title="Delete chat">✕</button>
      </div>
    `).join('') : '<div style="font-size:11px; color:var(--text-muted); padding:4px 8px;">No previous chats yet</div>';

    chatsListEl.querySelectorAll('.gemini-history-item').forEach(item => {
      const id = item.dataset.chatId;
      item.onclick = async (e) => {
        if (e.target.dataset.delChat) return;
        await apiPost('/api/chats', { action: 'open', id });
        const tr = document.getElementById('chatTranscript');
        if (tr) tr.dataset.lastCount = '';
        switchMode('chat');
        await fetchState();
      };
    });

    chatsListEl.querySelectorAll('[data-del-chat]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.dataset.delChat;
        if (!confirm('Delete this saved chat?')) return;
        await apiPost('/api/chats', { action: 'delete', id });
        await fetchState();
      };
    });
  }

  // 2. Render Recent Generations
  const genListEl = document.getElementById('geminiRecentGenerationsList');
  if (genListEl) {
    const images = (appState.images || []).slice(0, 8);
    genListEl.innerHTML = images.length ? images.map(img => `
      <div class="gemini-history-item" data-img-id="${img.id}">
        <span class="gemini-history-title">🎨 ${escapeHtml(img.subjectTag || img.prompt.slice(0, 24))}</span>
      </div>
    `).join('') : '<div style="font-size:11px; color:var(--text-muted); padding:4px 8px;">No generations yet</div>';

    genListEl.querySelectorAll('.gemini-history-item').forEach(item => {
      item.onclick = () => {
        switchMode('image');
        const img = appState.images.find(i => i.id === item.dataset.imgId);
        if (img && typeof openTraceModal === 'function') {
          openTraceModal(img);
        }
      };
    });
  }
}

function switchMode(mode) {
  // Update mode pills in chat composer
  document.querySelectorAll('.mode-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.switchMode === mode);
  });
  // Update sidebar mode buttons
  document.querySelectorAll('.gemini-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === mode);
  });
  // Update workspace panels
  document.querySelectorAll('.workspace-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`tab-${mode}`);
  if (panel) panel.classList.add('active');
}
'''

# 3. Add to renderAll
old_render_all = '''function renderAll() {
  renderTopTelemetry();
  renderAccountAndSetupFields();
  renderChatStudio();
  renderNovelStudio();
  renderImageStudio();
  renderVideoStudio();
  renderAgentStudio();
  renderModelsAndPresets();
  renderQueueDock();
}'''

new_render_all = '''function renderAll() {
  renderTopTelemetry();
  renderAccountAndSetupFields();
  renderChatStudio();
  renderNovelStudio();
  renderImageStudio();
  renderVideoStudio();
  renderAgentStudio();
  renderModelsAndPresets();
  renderQueueDock();
  renderGeminiSidebar();
}'''

if old_render_all in text:
    text = text.replace(old_render_all, gemini_render_func + '\n' + new_render_all, 1)
    print('Updated renderAll with renderGeminiSidebar!')

# 4. Add UI Interactive Listeners for Queue Hide/Show, Sidebar Toggle, New Chat, Mode Switcher
event_hooks = '''
  // Google Gemini Style Mode Picker & Hideable Queue Pane Listeners
  const workbenchGrid = document.querySelector('.workbench-grid');

  const btnToggleQueue = document.getElementById('btnToggleQueueDock');
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
  }

  const btnToggleNav = document.getElementById('btnToggleNavRail');
  if (btnToggleNav && workbenchGrid) {
    btnToggleNav.addEventListener('click', () => {
      workbenchGrid.classList.toggle('nav-collapsed');
    });
  }

  // Sidebar Gemini New Chat button
  const btnSideNew = document.getElementById('btnSideNewChat');
  if (btnSideNew) {
    btnSideNew.addEventListener('click', async () => {
      await apiPost('/api/chats', { action: 'new' });
      const tr = document.getElementById('chatTranscript');
      if (tr) tr.dataset.lastCount = '';
      switchMode('chat');
      showToast('Started new conversation');
      await fetchState();
    });
  }

  // Mode buttons in Sidebar
  document.querySelectorAll('.gemini-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.tab;
      switchMode(mode);
    });
  });

  // Settings links in Sidebar
  document.querySelectorAll('.gemini-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.workspace-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${tab}`)?.classList.add('active');
    });
  });

  // Inline Google Gemini Style Mode Bar Pills at Prompt Input
  document.querySelectorAll('.mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const mode = pill.dataset.switchMode;
      switchMode(mode);
    });
  });
'''

init_marker = 'document.addEventListener(\'DOMContentLoaded\', async () => {'
if init_marker in text:
    text = text.replace(init_marker, init_marker + '\n' + event_hooks, 1)
    print('Added event listeners for Gemini layout and queue toggle!')

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated public/app.js successfully!')
