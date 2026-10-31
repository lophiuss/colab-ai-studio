let appState = null;
let selectedAgentId = 'agent-research';
let activeNovelChapterId = null;
const videoAnimHandles = new Map();

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

async function apiPost(url, payload = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    appState = data;
    renderAll();
  } catch (e) {
    console.warn('Polling state error:', e);
  }
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================
let wasTunnelConnected = null;

function renderTopTelemetry() {
  if (!appState) return;
  const { colab, computeUnits, models } = appState;

  if (wasTunnelConnected === false && colab.tunnelConnected === true) {
    showToast(`🚀 Colab GPU Linked & Ready (${colab.tunnelUrl})! Start using straight away.`);
  }
  wasTunnelConnected = Boolean(colab.tunnelConnected);

  document.getElementById('activeModelHeaderBadge').textContent = models.loadedInVramModel || models.activeTextModel;

  const dot = document.getElementById('colabStatusDot');
  const statusText = document.getElementById('colabStatusText');
  const timeLabel = document.getElementById('colabStartupTimeLabel');
  const barFill = document.getElementById('colabProgressBarFill');
  const stageCaption = document.getElementById('colabStageCaption');
  const startupBanner = document.getElementById('startupStagesBanner');
  const detailSub = document.getElementById('startupDetailSubtitle');

  dot.className = 'status-dot ' + colab.status.toLowerCase();

  if (colab.status === 'STARTING') {
    statusText.textContent = `Auto-Booting Colab (${colab.startupProgressPct}%)`;
    const eta = Math.max(0, (colab.startupTargetDurationSec - colab.startupElapsedSec)).toFixed(0);
    timeLabel.textContent = `${colab.startupElapsedSec.toFixed(0)}s elapsed`;
    barFill.style.width = `${colab.startupProgressPct}%`;
    const activeStage = colab.stages.find(s => s.status === 'active') || colab.stages[0];
    stageCaption.textContent = `⏳ Stage ${activeStage.index}/4 (${colab.startupProgressPct}%): ${activeStage.name} — ${activeStage.detail || ''}`;
    if (detailSub) {
      detailSub.textContent = activeStage.detail || 'Auto-uploading & executing notebook on Google Colab GPU...';
    }
    startupBanner.classList.remove('hidden');
    document.getElementById('startupTimerPill').textContent = `Progress: ${colab.startupProgressPct}% · Elapsed: ${colab.startupElapsedSec.toFixed(0)}s`;

    const grid = document.getElementById('startupStagesGrid');
    grid.innerHTML = colab.stages.map(s => `
      <div class="stage-step-card ${s.status}">
        <div class="stage-step-top">
          <span>${s.index}. ${s.name}</span>
          <span>${s.status === 'completed' ? '✓' : s.status === 'active' ? '⟳' : '…'}</span>
        </div>
        <div class="stage-step-detail">${s.detail || ''}</div>
      </div>
    `).join('');
  } else if (colab.status === 'READY') {
    if (colab.tunnelConnected) {
      dot.className = 'status-dot ready';
      statusText.textContent = `Colab GPU Live (${colab.gpuTier})`;
      timeLabel.textContent = '100% Ready';
      stageCaption.textContent = `🟢 Live GPU Tunnel Linked: ${colab.tunnelUrl} · Model: ${models.loadedInVramModel}`;
      startupBanner.classList.add('hidden');
    } else {
      dot.className = 'status-dot starting';
      statusText.textContent = `Waiting for Tunnel (${colab.gpuTier})`;
      timeLabel.textContent = 'Auto-Linking...';
      stageCaption.textContent = `⏳ Waiting for Colab Cloudflare Tunnel to announce, or click [Auto-Run Colab] to launch browser...`;
    }
    barFill.style.width = '100%';
  } else {
    statusText.textContent = 'Colab Disconnected (0 CU/hr)';
    timeLabel.textContent = 'Idle Guard';
    barFill.style.width = '0%';
    stageCaption.textContent = colab.lastQueueFinishNotice || 'Click [Auto-Run Colab] or run START_COLAB_STUDIO.bat for Full-Auto launch';
    startupBanner.classList.add('hidden');
  }

  // 200 Compute Unit Meter
  const rem = Number(computeUnits.remainingCU || 0);
  const total = Number(computeUnits.totalAllocation || 200);
  const pctCU = Math.max(0, Math.min(100, (rem / total) * 100));
  document.getElementById('cuRemainingValue').textContent = `${rem.toFixed(2)} / ${total.toFixed(2)} CU`;
  document.getElementById('cuGaugeFill').style.width = `${pctCU}%`;

  const burnRates = { T4: 1.96, L4: 4.82, A100: 13.11 };
  const activeBurn = colab.status === 'DISCONNECTED' ? '0.00' : (burnRates[colab.gpuTier] || 1.96);
  document.getElementById('cuBurnRateLabel').textContent = `Burn: ${activeBurn} CU/hr (${colab.gpuTier})`;
  document.getElementById('cuSessionSpentLabel').textContent = `Session: ${Number(computeUnits.sessionSpentCU || 0).toFixed(3)} CU`;

  // GPU VRAM Meter
  const usedGB = (colab.vramUsedMB / 1024).toFixed(1);
  const totalGB = (colab.vramTotalMB / 1024).toFixed(1);
  const vramPct = colab.vramTotalMB > 0 ? Math.min(100, Math.round((colab.vramUsedMB / colab.vramTotalMB) * 100)) : 0;
  document.getElementById('gpuTierBadge').textContent = `${colab.gpuName}`;
  document.getElementById('vramReadout').textContent = `${usedGB} / ${totalGB} GB`;
  document.getElementById('vramGaugeFill').style.width = `${vramPct}%`;
  document.getElementById('gpuUtilLabel').textContent = `GPU Load: ${colab.gpuUtilPct}%`;
  document.getElementById('driveMountBadge').textContent = colab.driveMounted ? 'Drive Cache Mounted' : 'Drive Standby';
}

function renderPersonaDeck() {
  if (!appState || !appState.presets) return;
  const { presets } = appState;
  const activePreset = presets.list.find(p => p.id === presets.activePresetId) || presets.list[0];
  const defaultPresetId = presets.defaultPresetId || 'preset-natural';
  const isCurrentDefault = presets.activePresetId === defaultPresetId;

  // 1. Populate Chat Persona Dropdown
  const chatSelect = document.getElementById('chatPresetSelect');
  if (chatSelect) {
    const optionsHtml = presets.list.map(p => {
      const isDef = p.id === defaultPresetId;
      return `<option value="${p.id}" ${p.id === presets.activePresetId ? 'selected' : ''}>${isDef ? '⭐ ' : ''}${escapeHtml(p.name)}${isDef ? ' (Default)' : ''}</option>`;
    }).join('');


    if (chatSelect.innerHTML !== optionsHtml) {
      chatSelect.innerHTML = optionsHtml;
    }
  }

  // 2. Default Button in Chat Persona Deck
  const btnStar = document.getElementById('btnSetDefaultPreset');
  const btnStarText = document.getElementById('btnSetDefaultText');
  if (btnStar && btnStarText) {
    if (isCurrentDefault) {
      btnStar.className = 'btn-compact btn-star is-default';
      btnStarText.textContent = 'Default Persona';
      btnStar.title = 'This system prompt is currently your saved default';
    } else {
      btnStar.className = 'btn-compact btn-star';
      btnStarText.textContent = 'Set as Default';
      btnStar.title = 'Make this system prompt your default on startup';
    }
  }

  // 3. Quick Swap Persona Chips
  const chipsContainer = document.getElementById('personaChipsContainer');
  if (chipsContainer) {
    chipsContainer.innerHTML = presets.list.map(p => {
      const isActive = p.id === presets.activePresetId;
      const tag = p.shortTag || p.name;
      const isDef = p.id === defaultPresetId;
      return `
        <button type="button" class="persona-chip ${isActive ? 'active' : ''}" data-swap-id="${p.id}" title="${escapeHtml(p.systemPrompt)}">
          ${isDef ? '⭐ ' : ''}${escapeHtml(tag)}
        </button>
      `;
    }).join('');

    chipsContainer.querySelectorAll('.persona-chip').forEach(btn => {
      btn.onclick = async () => {
        await apiPost('/api/presets/update', { activePresetId: btn.dataset.swapId });
        showToast(`Swapped persona to "${btn.textContent.trim()}"`);
        await fetchState();
      };
    });
  }

  // 4. Inline Persona Editor content
  const labelEl = document.getElementById('editingPresetNameLabel');
  if (labelEl && activePreset) {
    labelEl.textContent = activePreset.name;
  }
  const inlinePrompt = document.getElementById('inlineSystemPromptText');
  if (inlinePrompt && activePreset && document.activeElement !== inlinePrompt) {
    inlinePrompt.value = activePreset.systemPrompt;
  }
  const chkDefault = document.getElementById('chkMakeDefaultOnSave');
  if (chkDefault) {
    chkDefault.checked = isCurrentDefault;
  }

  // 5. Update Left Nav Rail selector & status
  const globalSelect = document.getElementById('globalPresetSelect');
  if (globalSelect) {
    const optionsHtml = presets.list.map(p => {
      const isDef = p.id === defaultPresetId;
      return `<option value="${p.id}" ${p.id === presets.activePresetId ? 'selected' : ''}>${isDef ? '⭐ ' : ''}${escapeHtml(p.name)}</option>`;
    }).join('');
    if (globalSelect.innerHTML !== optionsHtml) {
      globalSelect.innerHTML = optionsHtml;
    }
  }
  const btnSideDefault = document.getElementById('btnSideSetDefault');
  if (btnSideDefault) {
    btnSideDefault.textContent = isCurrentDefault ? '★ Default' : 'Set Default';
    btnSideDefault.style.color = isCurrentDefault ? 'var(--accent-amber)' : '';
  }

  // 6. Update Models Tab controls
  const configSelect = document.getElementById('configPresetSelect');
  if (configSelect) {
    const optionsHtml = presets.list.map(p => {
      const isDef = p.id === defaultPresetId;
      return `<option value="${p.id}" ${p.id === presets.activePresetId ? 'selected' : ''}>${isDef ? '⭐ ' : ''}${escapeHtml(p.name)}</option>`;
    }).join('');
    if (configSelect.innerHTML !== optionsHtml) {
      configSelect.innerHTML = optionsHtml;
    }
  }
  const btnConfigDefault = document.getElementById('btnConfigSetDefault');
  if (btnConfigDefault) {
    btnConfigDefault.className = isCurrentDefault ? 'btn-compact btn-star is-default' : 'btn-compact btn-star';
    btnConfigDefault.textContent = isCurrentDefault ? '★ Default System Prompt' : '⭐ Set as Default System Prompt';
  }
}

let isSendingChat = false;

function renderChatHistoryPanel() {
  const panel = document.getElementById('chatHistoryPanel');
  if (!panel || panel.classList.contains('hidden')) return;
  const chats = appState.chats || [];
  panel.innerHTML = chats.length ? chats.map(c => `
    <div class="chat-history-row" data-chat-id="${c.id}">
      <span class="ch-title">${escapeHtml(c.title)}</span>
      <span class="ch-meta">${new Date(c.updatedAt).toLocaleDateString()}</span>
      <button type="button" class="ch-rename" title="Rename">✎</button>
      <button type="button" class="ch-delete" title="Delete">✕</button>
    </div>`).join('') : '<div class="chat-history-empty">No saved chats yet. Chats are saved automatically when you start a new one.</div>';
  panel.querySelectorAll('.chat-history-row').forEach(row => {
    const id = row.dataset.chatId;
    row.onclick = async () => {
      await apiPost('/api/chats', { action: 'open', id });
      document.getElementById('chatTranscript').dataset.lastCount = '';
      panel.classList.add('hidden');
      await fetchState();
    };
    row.querySelector('.ch-delete').onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this saved chat?')) return;
      await apiPost('/api/chats', { action: 'delete', id });
      await fetchState();
    };
    row.querySelector('.ch-rename').onclick = async (e) => {
      e.stopPropagation();
      const current = (appState.chats.find(c => c.id === id) || {}).title || '';
      const title = prompt('Rename chat:', current);
      if (!title || !title.trim()) return;
      await apiPost('/api/chats', { action: 'rename', id, title: title.trim() });
      await fetchState();
    };
  });
}

function renderChatStudio() {
  if (!appState) return;
  document.getElementById('chatActiveModelPill').textContent = appState.models.activeTextModel;
  renderPersonaDeck();
  if (isSendingChat) return; // Do not overwrite in-flight typing bubble

  const transcript = document.getElementById('chatTranscript');
  const titleEl = document.getElementById('chatTitleLabel');
  if (titleEl) {
    const t = appState.activeChatTitle || (appState.chatMessages.find(m => m.role === 'user') || {}).content || 'New chat';
    titleEl.textContent = t.length > 48 ? t.slice(0, 48) + '...' : t;
  }
  const thinkChk = document.getElementById('chkThinking');
  if (thinkChk) thinkChk.checked = !!(appState.chatSettings && appState.chatSettings.thinking);
  renderChatHistoryPanel();

  const html = appState.chatMessages.map(m => `
    <div class="chat-bubble ${m.role}${m.error ? ' error' : ''}">
      <div class="bubble-meta">
        <span>${m.role === 'user' ? 'You' : (m.model || 'Colab Assistant')}</span>
        <span>${new Date(m.timestamp).toLocaleTimeString()}</span>
      </div>
      ${m.thinking ? `<details class="think-box"><summary>Thought process</summary><div>${escapeHtml(m.thinking)}</div></details>` : ''}
      <div class="bubble-body">${escapeHtml(m.content).replace(/\n/g, '<br/>')}</div>
    </div>
  `).join('');
  if (transcript.dataset.lastCount !== String(appState.chatMessages.length)) {
    transcript.innerHTML = html;
    transcript.dataset.lastCount = String(appState.chatMessages.length);
    transcript.scrollTop = transcript.scrollHeight;
  }
}

function renderNovelStudio() {
  if (!appState) return;
  const { novel } = appState;

  // Title input
  const titleInput = document.getElementById('novelTitleInput');
  if (titleInput && document.activeElement !== titleInput) {
    titleInput.value = novel.title || 'Untitled Story';
  }

  const activeChap = novel.chapters.find(c => c.id === novel.activeChapterId) || novel.chapters[0];
  document.getElementById('novelWordCountBadge').textContent = `${activeChap ? activeChap.wordCount : 0} words`;

  const chapList = document.getElementById('chapterList');
  chapList.innerHTML = novel.chapters.map(c => `
    <div class="chapter-item-row">
      <button class="chapter-item ${c.id === novel.activeChapterId ? 'active' : ''}" data-chapter-id="${c.id}">
        <div><strong>${escapeHtml(c.title)}</strong></div>
        <div class="mono-meta">${c.wordCount} words</div>
      </button>
      ${novel.chapters.length > 1 ? `<button class="btn-item-delete btn-delete-chapter" data-chapter-id="${c.id}" title="Delete Chapter">✕</button>` : ''}
    </div>
  `).join('');

  chapList.querySelectorAll('.chapter-item').forEach(btn => {
    btn.onclick = async () => {
      await apiPost('/api/studio/novel', { action: 'select-chapter', chapterId: btn.dataset.chapterId });
      activeNovelChapterId = null;
      await fetchState();
    };
  });

  chapList.querySelectorAll('.btn-delete-chapter').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this chapter?')) return;
      await apiPost('/api/studio/novel', { action: 'delete-chapter', chapterId: btn.dataset.chapterId });
      activeNovelChapterId = null;
      showToast('Chapter deleted');
      await fetchState();
    };
  });

  const editor = document.getElementById('novelManuscriptEditor');
  const chapTitleInput = document.getElementById('chapterTitleInput');
  if (activeChap && (activeNovelChapterId !== activeChap.id || document.activeElement !== editor)) {
    activeNovelChapterId = activeChap.id;
    chapTitleInput.value = activeChap.title;
    editor.value = activeChap.content;
  }

  const loreList = document.getElementById('lorebookList');
  loreList.innerHTML = novel.lorebook.map(l => `
    <div class="lore-card">
      <div class="lore-card-header">
        <strong>[${escapeHtml(l.category)}] ${escapeHtml(l.name)}</strong>
        <button class="btn-item-delete btn-delete-lore" data-lore-id="${l.id}" title="Delete Lore Entry">✕</button>
      </div>
      <div>${escapeHtml(l.notes)}</div>
    </div>
  `).join('');

  loreList.querySelectorAll('.btn-delete-lore').forEach(btn => {
    btn.onclick = async () => {
      await apiPost('/api/studio/novel', { action: 'delete-lore', loreId: btn.dataset.loreId });
      showToast('Lore entry removed');
      await fetchState();
    };
  });
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
    return `
      <div class="media-card" data-img-id="${img.id}">
        <div class="media-visual-wrap">
          <img class="media-visual" src="${finalUrl}" alt="${escapeHtml(img.prompt)}" loading="lazy" onerror="this.onerror=null; this.src='https://pollinations.ai/p/${encodeURIComponent(img.prompt)}?width=1024&height=576&seed=${img.seed}';" />
          <div class="media-overlay-actions">
            <button class="btn-overlay btn-view-image" data-url="${finalUrl}" data-prompt="${escapeHtml(img.prompt)}" data-meta="${escapeHtml(img.aspectRatio || '16:9')} · Seed ${img.seed} · ${escapeHtml(img.model.split('/').pop())}">🔍 View HD</button>
            <a class="btn-overlay" href="${finalUrl}" target="_blank" download="render-${img.seed}.jpg">⬇ Download</a>
            <button class="btn-overlay btn-delete-image" data-img-id="${img.id}" title="Delete Image" style="color:#f87171;">✕</button>
            <button class="btn-overlay btn-copy-image-prompt" data-prompt="${escapeHtml(img.prompt)}">📋 Prompt</button>
          </div>
        </div>
        <div class="media-info">
          <div class="media-prompt" title="${escapeHtml(img.prompt)}">${escapeHtml(img.prompt)}</div>
          <div class="media-meta-row">
            <span>${escapeHtml(img.model.split('/').pop())}</span>
            <span>${img.aspectRatio || '16:9'} · Seed ${img.seed}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-view-image').forEach(btn => {
    btn.onclick = () => {
      openLightbox(btn.dataset.url, btn.dataset.prompt, btn.dataset.meta);
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

const videoPlaybackTimers = new Map();

function renderVideoStudio() {
  if (!appState) return;
  document.getElementById('videoActiveModelPill').textContent = appState.models.activeVideoModel;
  const grid = document.getElementById('videoGalleryGrid');
  const signature = appState.videos.map(v => v.id + ':' + (v.frameUrl || '')).join('|');
  if (grid.dataset.lastSig === signature) return;
  grid.dataset.lastSig = signature;

  // Clear running timers
  videoPlaybackTimers.forEach(tid => clearInterval(tid));
  videoPlaybackTimers.clear();

  grid.innerHTML = appState.videos.map(vid => {
    const motionClass = (vid.cameraMotion || 'Dolly Push-In').toLowerCase().includes('orbit') ? 'motion-orbit' :
      (vid.cameraMotion || '').toLowerCase().includes('crane') ? 'motion-crane' :
      (vid.cameraMotion || '').toLowerCase().includes('handheld') ? 'motion-handheld' : 'motion-dolly';

    const fallbackFrame = `https://image.pollinations.ai/prompt/${encodeURIComponent(vid.prompt + ', cinematic motion frame, anamorphic lens, 8k movie still')}?width=1024&height=576&model=flux&seed=${vid.seed || 481902}&nologo=true`;
    const frameUrl = vid.frameUrl || fallbackFrame;

    return `
      <div class="media-card video-card" data-vid-id="${vid.id}">
        <div id="viewport-${vid.id}" class="video-viewport ${motionClass} playing" style="--motion-duration: ${vid.durationSec || 5}s;">
          <img class="cinematic-frame" src="${frameUrl}" alt="${escapeHtml(vid.prompt)}" loading="lazy" />
          
          <!-- Top HUD -->
          <div class="video-hud-top">
            <div class="video-rec-tag">
              <span class="video-rec-dot"></span>
              <span>REC</span>
            </div>
            <div class="video-engine-tag">Wan 2.1 · ${vid.fps || 24}fps 1080p</div>
          </div>

          <!-- Bottom HUD & Transport Controls -->
          <div class="video-hud-bottom">
            <button class="btn-transport btn-toggle-play" data-vid-id="${vid.id}" title="Play / Pause Motion">⏸</button>
            <div class="video-progress-bar">
              <div id="progress-${vid.id}" class="video-progress-fill"></div>
            </div>
            <span id="timecode-${vid.id}" class="video-timecode">00:00 / 00:0${vid.durationSec || 5}</span>
            <a class="btn-hud-action" href="${frameUrl}" target="_blank" download="video-frame-${vid.id}.jpg" title="Download Master Frame">⬇ Frame</a>
            <button class="btn-hud-action btn-fullscreen-video" data-url="${frameUrl}" data-prompt="${escapeHtml(vid.prompt)}" data-meta="${escapeHtml(vid.cameraMotion)} · ${vid.durationSec}s · ${vid.fps}fps" title="Fullscreen Cinema">⛶</button>
          </div>
        </div>
        <div class="media-info">
          <div class="media-prompt" title="${escapeHtml(vid.prompt)}">${escapeHtml(vid.prompt)}</div>
          <div class="media-meta-row">
            <span>🎥 ${escapeHtml(vid.cameraMotion)}</span>
            <span>${vid.durationSec}s · ${vid.fps}fps</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Set up running timeline progression for each video card
  appState.videos.forEach(vid => {
    const duration = vid.durationSec || 5;
    let elapsed = 0;
    const progressFill = document.getElementById(`progress-${vid.id}`);
    const timecode = document.getElementById(`timecode-${vid.id}`);
    const viewport = document.getElementById(`viewport-${vid.id}`);

    const intervalId = setInterval(() => {
      if (!viewport || viewport.classList.contains('paused')) return;
      elapsed = (elapsed + 0.1) % duration;
      const pct = (elapsed / duration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (timecode) {
        const sec = Math.floor(elapsed);
        timecode.textContent = `00:0${sec} / 00:0${duration}`;
      }
    }, 100);
    videoPlaybackTimers.set(vid.id, intervalId);
  });

  // Play/Pause button handlers
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

  // Fullscreen Cinema handler
  grid.querySelectorAll('.btn-fullscreen-video').forEach(btn => {
    btn.onclick = () => {
      openLightbox(btn.dataset.url, btn.dataset.prompt, btn.dataset.meta);
    };
  });
}

function openLightbox(url, prompt, meta) {
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
}

function closeLightbox() {
  const modal = document.getElementById('mediaLightboxModal');
  if (modal) modal.classList.add('hidden');
}

function renderAgentStudio() {
  if (!appState) return;
  const { profiles, runs } = appState.agents;
  const grid = document.getElementById('agentProfilesGrid');
  grid.innerHTML = profiles.map(p => `
    <div class="agent-profile-card ${p.id === selectedAgentId ? 'selected' : ''}" data-agent-id="${p.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${escapeHtml(p.name)}</strong>
        <span class="queue-badge COMPLETED">${escapeHtml(p.safetyLevel)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(p.description)}</div>
      <div class="mono-meta" style="font-size:11px;color:var(--accent-cyan);">Tools: ${p.tools.join(' · ')} (Max ${p.maxIterations} steps)</div>
    </div>
  `).join('');

  grid.querySelectorAll('.agent-profile-card').forEach(card => {
    card.onclick = () => {
      selectedAgentId = card.dataset.agentId;
      const found = profiles.find(p => p.id === selectedAgentId);
      if (found) {
        document.getElementById('selectedAgentBadge').textContent = `Selected: ${found.name}`;
      }
      renderAgentStudio();
    };
  });

  const runsContainer = document.getElementById('agentRunsContainer');
  runsContainer.innerHTML = runs.map(r => `
    <div class="agent-run-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>🛡️ ${escapeHtml(r.agentName)}</strong>
        <span class="queue-badge COMPLETED">Verified · ${r.iterationsUsed}/${r.maxIterations} steps</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-secondary);">Goal: ${escapeHtml(r.goal)}</div>
      ${r.steps.map(s => `
        <div class="agent-step-row">
          <div><strong>Step ${s.step} [${escapeHtml(s.tool)}]:</strong> ${escapeHtml(s.thought)}</div>
          <div style="color:var(--accent-emerald);margin-top:2px;">↳ ${escapeHtml(s.output)}</div>
        </div>
      `).join('')}
      <div style="font-size:12.5px;white-space:pre-wrap;padding-top:4px;border-top:1px solid var(--border-hairline);">${escapeHtml(r.finalSummary)}</div>
    </div>
  `).join('');
}

function renderModelsAndPresets() {
  if (!appState) return;
  const { models, presets, computeUnits } = appState;

  const listEl = document.getElementById('hfModelsList');
  listEl.innerHTML = models.catalog.map(m => {
    const isActive = [models.activeTextModel, models.activeImageModel, models.activeVideoModel].includes(m.id);
    return `
      <div class="hf-model-card ${isActive ? 'active' : ''}">
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(m.name)} <span class="queue-badge">${escapeHtml(m.modality.toUpperCase())}</span></div>
          <div class="mono-meta" style="font-size:11px;color:var(--text-muted);">${escapeHtml(m.id)} · ${escapeHtml(m.quantization)} · ${(m.vramMB / 1024).toFixed(1)} GB VRAM</div>
        </div>
        <button class="btn-compact ${isActive ? 'btn-amber' : 'btn-secondary'} btn-switch-model" data-model-id="${m.id}" data-modality="${m.modality}">
          ${isActive ? 'Active on GPU' : 'Load Model'}
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-switch-model').forEach(btn => {
    btn.onclick = async () => {
      await apiPost('/api/models/switch', {
        modelId: btn.dataset.modelId,
        modality: btn.dataset.modality
      });
      showToast(`Switched Colab VRAM model to ${btn.dataset.modelId}`);
      await fetchState();
    };
  });

  // Populate Preset selects
  const globalSelect = document.getElementById('globalPresetSelect');
  const configSelect = document.getElementById('configPresetSelect');
  const optionsHtml = presets.list.map(p => `<option value="${p.id}" ${p.id === presets.activePresetId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
  if (globalSelect.innerHTML !== optionsHtml) {
    globalSelect.innerHTML = optionsHtml;
    configSelect.innerHTML = optionsHtml;
  }

  const activePreset = presets.list.find(p => p.id === presets.activePresetId) || presets.list[0];
  const promptArea = document.getElementById('configPresetPrompt');
  if (document.activeElement !== promptArea && activePreset) {
    promptArea.value = activePreset.systemPrompt;
  }

  document.getElementById('navSamplingSummary').textContent = `Temp ${presets.sampling.temperature} · Top-P ${presets.sampling.topP}`;

  // CU History Ledger in Setup tab
  const cuHist = document.getElementById('cuHistoryList');
  if (cuHist) {
    cuHist.innerHTML = (computeUnits.history || []).slice(0, 8).map(h => `
      <div class="hf-model-card">
        <div>
          <div style="font-size:12px;font-weight:600;">${escapeHtml(h.task)}</div>
          <div class="mono-meta" style="font-size:11px;color:var(--text-muted);">${new Date(h.timestamp).toLocaleTimeString()}</div>
        </div>
        <span class="cu-readout">-${Number(h.cuUsed).toFixed(2)} CU</span>
      </div>
    `).join('');
  }
}

function renderQueueDock() {
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
}

function renderAccountAndSetupFields() {
  if (!appState) return;
  const { user, colab } = appState;
  const savedEmail = localStorage.getItem('colab_creator_email') || user.email || 'creator@colabaistudio.local';
  const savedNotebookUrl = localStorage.getItem('colab_notebook_url') || colab.notebookUrl || 'https://colab.research.google.com/drive/1ColabAIStudioWorkerAutoRun';

  // 1. Top bar email badge
  const headerEmail = document.getElementById('telemetryUserEmail');
  if (headerEmail) headerEmail.textContent = user.email || savedEmail;

  // 2. Login modal fields
  const loginEmail = document.getElementById('loginEmail');
  if (loginEmail && (!loginEmail.value || loginEmail.value === 'creator@colabaistudio.local')) {
    loginEmail.value = savedEmail;
  }
  const loginNb = document.getElementById('loginNotebookUrl');
  if (loginNb && (!loginNb.value || loginNb.value === 'https://colab.research.google.com/drive/1ColabAIStudioWorkerAutoRun')) {
    loginNb.value = savedNotebookUrl;
  }

  // 3. Setup panel fields (only update if not currently focused by user)
  const setupEmail = document.getElementById('setupCreatorEmail');
  if (setupEmail && document.activeElement !== setupEmail) {
    setupEmail.value = user.email || savedEmail;
  }
  const setupName = document.getElementById('setupCreatorName');
  if (setupName && document.activeElement !== setupName) {
    setupName.value = user.name || 'AI Creator';
  }
  const setupNb = document.getElementById('setupNotebookUrl');
  if (setupNb && document.activeElement !== setupNb) {
    setupNb.value = colab.notebookUrl || savedNotebookUrl;
  }
  const linkSetupNb = document.getElementById('linkSetupOpenNotebook');
  if (linkSetupNb) {
    linkSetupNb.href = colab.notebookUrl || savedNotebookUrl;
  }
  const setupTunnel = document.getElementById('setupTunnelUrl');
  if (setupTunnel && document.activeElement !== setupTunnel && colab.tunnelUrl) {
    setupTunnel.value = colab.tunnelUrl;
  }
  const setupGpu = document.getElementById('setupGpuTier');
  if (setupGpu && document.activeElement !== setupGpu && colab.gpuTier) {
    setupGpu.value = colab.gpuTier;
  }

  // 4. Account modal fields
  const accEmail = document.getElementById('accountEmail');
  if (accEmail && document.activeElement !== accEmail) {
    accEmail.value = user.email || savedEmail;
  }
  const accName = document.getElementById('accountName');
  if (accName && document.activeElement !== accName) {
    accName.value = user.name || 'AI Creator';
  }
  const accNb = document.getElementById('accountNotebookUrl');
  if (accNb && document.activeElement !== accNb) {
    accNb.value = colab.notebookUrl || savedNotebookUrl;
  }
  const accLink = document.getElementById('linkOpenColabNotebook');
  if (accLink) {
    accLink.href = colab.notebookUrl || savedNotebookUrl;
  }
  const accGpu = document.getElementById('accountGpuTier');
  if (accGpu && document.activeElement !== accGpu && colab.gpuTier) {
    accGpu.value = colab.gpuTier;
  }
  const accTopic = document.getElementById('accountPairingTopic');
  if (accTopic && colab.pairingTopic) {
    accTopic.value = colab.pairingTopic;
  }
}

async function autoKeyInNotebookUrl(targetInputId) {
  let urlToUse = appState?.colab?.notebookUrl || localStorage.getItem('colab_notebook_url');

  // Attempt to detect from clipboard if permitted
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const clipText = (await navigator.clipboard.readText()).trim();
      if (clipText.startsWith('https://colab.research.google.com/')) {
        urlToUse = clipText;
        showToast('📋 Auto-detected Colab URL from clipboard!');
      }
    }
  } catch (_) {}

  if (!urlToUse) urlToUse = 'https://colab.research.google.com/drive/1ColabAIStudioWorkerAutoRun';

  const target = document.getElementById(targetInputId);
  if (target) {
    target.value = urlToUse;
    localStorage.setItem('colab_notebook_url', urlToUse);
    target.focus();
    showToast(`🪄 Auto-keyed in Worker URL: ${urlToUse.slice(0, 42)}...`);
  }
}

function renderAll() {
  renderTopTelemetry();
  renderAccountAndSetupFields();
  renderChatStudio();
  renderNovelStudio();
  renderImageStudio();
  renderVideoStudio();
  renderAgentStudio();
  renderModelsAndPresets();
  renderQueueDock();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// EVENT LISTENERS & WORKFLOW HANDLERS
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await fetchState();

  // Poll live Colab startup progress, 200 CU burn rate, and batch queue every 1000ms
  setInterval(fetchState, 1000);

  // 1. Login Form -> Auto-Run Colab on Login
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const notebookUrl = document.getElementById('loginNotebookUrl').value.trim();
    const gpuTier = document.getElementById('loginGpuTier').value;
    const cuBalance = Number(document.getElementById('loginCuBalance').value || 186.4);
    const autoRun = document.getElementById('loginAutoStart').checked;

    if (email) localStorage.setItem('colab_creator_email', email);
    if (notebookUrl) localStorage.setItem('colab_notebook_url', notebookUrl);

    await apiPost('/api/user/account', { email, notebookUrl, gpuTier, autoRunOnLogin: autoRun });
    await apiPost('/api/colab/config', {
      autoRunOnLogin: autoRun,
      notebookUrl,
      gpuTier,
      remainingCU: cuBalance
    });
    await apiPost('/api/auth/login', { email, notebookUrl, gpuTier });
    document.getElementById('loginModal').classList.add('hidden');
    showToast(`Signed in! Auto-launching Colab (${gpuTier}) & syncing ${cuBalance.toFixed(1)} CU...`);
    await fetchState();
  });

  // 2. Wake / Disconnect / Connect / 1-Line CLI Colab Buttons
  const btnCopyCli = document.getElementById('btnCopyColabCli');
  if (btnCopyCli) {
    btnCopyCli.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/colab/cli-command');
        const data = await res.json();
        if (data && data.command) {
          await navigator.clipboard.writeText(data.command);
          const isA100 = !appState?.colab?.gpuTier || appState.colab.gpuTier === 'A100';
          const targetUrl = isA100
            ? 'https://colab.research.google.com/github/lophiuss/colab-ai-studio/blob/main/colab/a100_one_click_worker.ipynb'
            : 'https://colab.research.google.com/github/lophiuss/colab-ai-studio/blob/main/colab/gpu_one_click_worker.ipynb';
          await apiPost('/api/colab/stage', {
            stageIndex: 1,
            stageName: `Opening 1-Cell ${isA100 ? 'A100 (40GB VRAM)' : 'T4'} GPU Worker on Colab`,
            progress: 18,
            detail: `Click the Play (▶) button or press Shift+Enter in the opened Colab tab! (${isA100 ? 'A100' : 'T4'} GPU pre-selected).`
          });
          window.open(targetUrl, '_blank');
          showToast(`🚀 Opened 1-Cell ${isA100 ? 'A100 (40GB)' : 'T4'} GPU Worker! Click Play (▶) or Shift+Enter in Colab.`);
          await fetchState();
        }
      } catch (e) {
        showToast('Could not copy CLI command: ' + e.message);
      }
    });
  }

  const btnConnect = document.getElementById('btnConnectTunnel');
  if (btnConnect) {
    btnConnect.addEventListener('click', async () => {
      const current = (appState?.colab?.tunnelUrl && !appState.colab.tunnelUrl.includes('colab-worker-t4')) ? appState.colab.tunnelUrl : '';
      const input = prompt('Paste your live Cloudflare Tunnel URL from Colab Cell 4 (e.g. https://something.trycloudflare.com):', current);
      if (!input || !input.trim()) return;
      const cleanUrl = input.trim();
      showToast('Testing live connection to Colab GPU...');
      const res = await apiPost('/api/colab/verify-tunnel', { tunnelUrl: cleanUrl });
      if (res.ok) {
        showToast('🎉 Connected live to your Colab GPU model!');
      } else {
        alert(res.error || 'Could not connect. Make sure Cell 4 is running in Google Colab.');
      }
      await fetchState();
    });
  }

  document.getElementById('btnWakeColab').addEventListener('click', async () => {
    await apiPost('/api/colab/start', { reason: 'Dashboard Wake Button' });
    showToast('Colab Auto-Launcher started! Executing colab_ai_worker.ipynb...');
    await fetchState();
  });

  document.getElementById('btnShutdownColab').addEventListener('click', async () => {
    await apiPost('/api/colab/shutdown');
    showToast('Colab GPU runtime unassigned. Compute Unit burn rate is now 0.00 CU/hr.');
    await fetchState();
  });

  document.getElementById('btnCalibrateCU').addEventListener('click', async () => {
    const input = prompt('Enter your current Google Colab Compute Unit balance (out of 200 CU):', appState?.computeUnits?.remainingCU?.toFixed(2) || '186.40');
    if (input !== null && !isNaN(Number(input))) {
      await apiPost('/api/colab/config', { remainingCU: Number(input) });
      showToast(`Synced Compute Unit balance to ${Number(input).toFixed(2)} CU`);
      await fetchState();
    }
  });

  // 3. Navigation Rail Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.workspace-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      document.getElementById(tabId)?.classList.add('active');
    });
  });

  document.querySelectorAll('[data-jump-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(`.nav-item[data-tab="${btn.dataset.jumpTab}"]`);
      if (target) target.click();
    });
  });

  // 4. Quality Prompt Enhancer ("✨ Enhance Prompt") across all workspaces
  document.querySelectorAll('[data-enhance-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetEl = document.getElementById(btn.dataset.enhanceTarget);
      const mode = btn.dataset.enhanceMode || 'chat';
      const res = await apiPost('/api/prompt/enhance', {
        prompt: targetEl.value,
        mode
      });
      if (res.enhanced) {
        targetEl.value = res.enhanced;
        showToast(`Enhanced ${mode.toUpperCase()} prompt with structured detail!`);
      }
    });
  });

  // 5. Interactive Chat Actions
  const chatInput = document.getElementById('chatPromptInput');
  const btnSend = document.getElementById('btnSendChat');

  async function sendChatMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt || isSendingChat) return;

    const transcript = document.getElementById('chatTranscript');

    isSendingChat = true;
    chatInput.value = '';
    btnSend.disabled = true;
    btnSend.innerHTML = '<span>Generating... ⏳</span>';

    // Optimistic User Bubble
    const optimisticTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userBubbleHtml = `
      <div class="chat-bubble user" id="optimistic-user-bubble">
        <div class="bubble-meta">
          <span>You</span>
          <span>${optimisticTime}</span>
        </div>
        <div class="bubble-body">${escapeHtml(prompt).replace(/\n/g, '<br/>')}</div>
      </div>
    `;
    transcript.insertAdjacentHTML('beforeend', userBubbleHtml);

    // Animated Typing Indicator
    const typingId = 'typing-' + Date.now();
    const typingHtml = `
      <div class="chat-bubble assistant typing" id="${typingId}">
        <div class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
        <span>Generating response on Colab GPU...</span>
      </div>
    `;
    transcript.insertAdjacentHTML('beforeend', typingHtml);
    transcript.scrollTop = transcript.scrollHeight;

    try {
      const res = await apiPost('/api/studio/chat', { prompt, thinking: document.getElementById('chkThinking').checked });
      document.getElementById(typingId)?.remove();
      document.getElementById('optimistic-user-bubble')?.remove();
      isSendingChat = false;
      if (res && res.chatMessages) {
        appState.chatMessages = res.chatMessages;
        if (res.computeUnits) appState.computeUnits = res.computeUnits;
        transcript.dataset.lastCount = ''; // Force refresh with final content
        renderChatStudio();
      } else {
        await fetchState();
      }
    } catch (err) {
      document.getElementById(typingId)?.remove();
      document.getElementById('optimistic-user-bubble')?.remove();
      isSendingChat = false;
      showToast('Generation notice: ' + err.message);
      await fetchState();
    } finally {
      btnSend.disabled = false;
      btnSend.innerHTML = '<span>Send Message ⏎</span>';
      chatInput.focus();
    }
  }

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  btnSend.addEventListener('click', () => {
    sendChatMessage();
  });

  document.getElementById('btnNewChat').addEventListener('click', async () => {
    if (isSendingChat) return;
    await apiPost('/api/chats', { action: 'new' });
    document.getElementById('chatTranscript').dataset.lastCount = '';
    await fetchState();
    chatInput.focus();
  });
  document.getElementById('btnChatHistory').addEventListener('click', () => {
    document.getElementById('chatHistoryPanel').classList.toggle('hidden');
    renderChatHistoryPanel();
  });
  document.getElementById('chkThinking').addEventListener('change', async (e) => {
    await apiPost('/api/chats', { action: 'thinking', value: e.target.checked });
    showToast(e.target.checked ? 'Thinking mode ON (slower, shows reasoning)' : 'Thinking mode OFF');
  });

  document.getElementById('btnQueueChat').addEventListener('click', async () => {
    const input = document.getElementById('chatPromptInput');
    if (!input.value.trim()) return;
    await apiPost('/api/queue/add', {
      type: 'chat',
      title: `Chat: ${input.value.slice(0, 38)}`,
      prompt: input.value
    });
    input.value = '';
    showToast('Added Chat task to Sequential Batch Queue');
    await fetchState();
  });

  // 6. Novel Writing Studio Actions & Auto-Save
  const novelTitleInput = document.getElementById('novelTitleInput');
  if (novelTitleInput) {
    let titleSaveTimeout = null;
    novelTitleInput.addEventListener('input', () => {
      const status = document.getElementById('novelSaveStatus');
      if (status) status.textContent = 'Saving...';
      clearTimeout(titleSaveTimeout);
      titleSaveTimeout = setTimeout(async () => {
        await apiPost('/api/studio/novel', { action: 'update-title', title: novelTitleInput.value });
        if (status) status.textContent = '● Saved';
      }, 500);
    });
  }

  const btnBrainstormNovel = document.getElementById('btnBrainstormNovel');
  const modalBrainstorm = document.getElementById('novelBrainstormModal');
  const btnCloseBrainstorm = document.getElementById('btnCloseBrainstormModal');
  const btnExecuteBrainstorm = document.getElementById('btnExecuteBrainstorm');
  const brainstormInput = document.getElementById('brainstormPremiseInput');

  if (btnBrainstormNovel && modalBrainstorm) {
    btnBrainstormNovel.addEventListener('click', () => {
      modalBrainstorm.classList.remove('hidden');
      if (brainstormInput) brainstormInput.focus();
    });
  }
  if (btnCloseBrainstorm && modalBrainstorm) {
    btnCloseBrainstorm.addEventListener('click', () => {
      modalBrainstorm.classList.add('hidden');
    });
  }
  document.querySelectorAll('.btn-quick-premise').forEach(btn => {
    btn.addEventListener('click', () => {
      if (brainstormInput) brainstormInput.value = btn.dataset.premise;
    });
  });
  if (btnExecuteBrainstorm) {
    btnExecuteBrainstorm.addEventListener('click', async () => {
      const premise = brainstormInput ? brainstormInput.value.trim() : '';
      btnExecuteBrainstorm.disabled = true;
      btnExecuteBrainstorm.textContent = 'Brainstorming with Colab GPU... ⏳';
      try {
        await apiPost('/api/studio/novel', { action: 'brainstorm', premise });
        modalBrainstorm.classList.add('hidden');
        activeNovelChapterId = null;
        showToast('✨ Colab GPU generated your new story & lorebook!');
        await fetchState();
      } catch (err) {
        showToast('Error: ' + err.message);
      } finally {
        btnExecuteBrainstorm.disabled = false;
        btnExecuteBrainstorm.textContent = '✨ Brainstorm on Colab GPU';
      }
    });
  }

  const btnNewNovel = document.getElementById('btnNewNovel');
  if (btnNewNovel) {
    btnNewNovel.addEventListener('click', async () => {
      if (!confirm('Start a fresh new story? (Current chapters will be cleared for a clean canvas)')) return;
      await apiPost('/api/studio/novel', { action: 'reset-novel', title: 'Untitled Story', genre: 'Literary Fiction' });
      activeNovelChapterId = null;
      showToast('Created blank novel canvas!');
      await fetchState();
    });
  }

  const btnExportNovel = document.getElementById('btnExportNovel');
  if (btnExportNovel) {
    btnExportNovel.addEventListener('click', () => {
      if (!appState || !appState.novel) return;
      const { novel } = appState;
      let md = `# ${novel.title}\nGenre: ${novel.genre || 'Fiction'}\n\n`;
      if (novel.lorebook && novel.lorebook.length > 0) {
        md += `## Story Bible / Lorebook\n`;
        novel.lorebook.forEach(l => {
          md += `### [${l.category}] ${l.name}\n${l.notes}\n\n`;
        });
      }
      md += `## Manuscript\n\n`;
      novel.chapters.forEach(c => {
        md += `### ${c.title}\n\n${c.content}\n\n---\n\n`;
      });

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(novel.title || 'novel').toLowerCase().replace(/[^a-z0-9]/g, '_')}_manuscript.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📥 Downloaded complete manuscript as Markdown!');
    });
  }

  document.getElementById('btnSaveNovel').addEventListener('click', async () => {
    const content = document.getElementById('novelManuscriptEditor').value;
    const chapterTitle = document.getElementById('chapterTitleInput').value;
    await apiPost('/api/studio/novel', { action: 'save', content, chapterTitle });
    showToast('Saved chapter manuscript to Story Bible store');
    await fetchState();
  });

  document.getElementById('btnNewChapter').addEventListener('click', async () => {
    await apiPost('/api/studio/novel', { action: 'new-chapter' });
    activeNovelChapterId = null;
    showToast('Created new chapter');
    await fetchState();
  });

  document.getElementById('btnAddLore').addEventListener('click', async () => {
    const name = document.getElementById('loreNameInput').value.trim();
    const notes = document.getElementById('loreNotesInput').value.trim();
    if (!name) return;
    await apiPost('/api/studio/novel', { action: 'add-lore', category: 'Lore', name, notes });
    document.getElementById('loreNameInput').value = '';
    document.getElementById('loreNotesInput').value = '';
    showToast(`Added "${name}" to Story Bible Lorebook`);
    await fetchState();
  });

  document.querySelectorAll('.novel-ai-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.novelAction;
      const prompt = document.getElementById('novelPromptInput').value;
      const content = document.getElementById('novelManuscriptEditor').value;
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Writing scene on Colab GPU... ⏳';
      try {
        await apiPost('/api/studio/novel', { action, prompt, content });
        activeNovelChapterId = null;
        showToast(`Executed "${action}" on active chapter`);
        await fetchState();
      } catch (err) {
        showToast('Error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  });

  document.getElementById('btnQueueNovelScene').addEventListener('click', async () => {
    const prompt = document.getElementById('novelPromptInput').value.trim() || 'Continue next dramatic beat of active chapter';
    await apiPost('/api/queue/add', {
      type: 'novel',
      title: `Novel Scene: ${prompt.slice(0, 34)}`,
      prompt
    });
    document.getElementById('novelPromptInput').value = '';
    showToast('Queued Novel Scene in Batch Task Queue');
    await fetchState();
  });

  document.getElementById('btnBatchQueueChapters').addEventListener('click', async () => {
    await apiPost('/api/queue/add', {
      tasks: [
        { type: 'novel', title: 'Chapter Beat 1: The Harbor Bell Tolls', prompt: 'Write the rising tension as the Tide-Lock fog seals the harbor gates.' },
        { type: 'novel', title: 'Chapter Beat 2: Extracting the Amber Shard', prompt: 'Describe Kaelen unlocking the mainspring barrel and revealing the Magistrate memory crystal.' },
        { type: 'novel', title: 'Chapter Beat 3: Escape Across the Glass Pier', prompt: 'Write the confrontation with Foundry wardens along the lantern-lit pier.' }
      ]
    });
    showToast('Enqueued 3 sequential Novel Chapter beats for auto-execution!');
    await fetchState();
  });

  // 7. Image Generation Studio Actions
  const btnGenerateImage = document.getElementById('btnGenerateImage');
  if (btnGenerateImage) {
    btnGenerateImage.addEventListener('click', async () => {
      const prompt = document.getElementById('imagePromptInput').value.trim() || 'Rain-slicked clockwork harbor at dusk, volumetric amber lantern light';
      const aspectRatio = document.getElementById('imageAspectRatio').value;
      const steps = document.getElementById('imageSteps').value;
      const cfgScale = document.getElementById('imageCfg').value;
      btnGenerateImage.disabled = true;
      btnGenerateImage.textContent = 'Rendering FLUX image on GPU... ⏳';
      try {
        await apiPost('/api/studio/image', { prompt, aspectRatio, steps, cfgScale });
        showToast('Rendered high-resolution image via Diffusers pipeline');
        await fetchState();
      } catch (err) {
        showToast('Image render failed: ' + err.message);
      } finally {
        btnGenerateImage.disabled = false;
        btnGenerateImage.textContent = 'Render Image (0.12 CU)';
      }
    });
  }

  document.getElementById('btnQueueImage').addEventListener('click', async () => {
    const prompt = document.getElementById('imagePromptInput').value.trim() || 'Steampunk horologist workshop concept art';
    await apiPost('/api/queue/add', {
      type: 'image',
      title: `Image: ${prompt.slice(0, 34)}`,
      prompt
    });
    showToast('Added Image Render to Batch Queue');
    await fetchState();
  });

  document.getElementById('btnQueueImageBatch').addEventListener('click', async () => {
    const basePrompt = document.getElementById('imagePromptInput').value.trim() || 'Glass Harbor clockwork citadel in golden hour fog';
    await apiPost('/api/queue/add', {
      tasks: [
        { type: 'image', title: 'FLUX Render #1 (Wide Establishing)', prompt: `${basePrompt}, wide anamorphic establishing shot` },
        { type: 'image', title: 'FLUX Render #2 (Character Close-Up)', prompt: `${basePrompt}, dramatic close-up portrait, rim lighting` },
        { type: 'image', title: 'FLUX Render #3 (Nocturnal Storm)', prompt: `${basePrompt}, midnight bioluminescent fog variant` }
      ]
    });
    showToast('Queued 3 FLUX.1-dev image variations for sequential rendering!');
    await fetchState();
  });

  // 8. Video Generation Studio Actions
  const btnGenerateVideo = document.getElementById('btnGenerateVideo');
  if (btnGenerateVideo) {
    btnGenerateVideo.addEventListener('click', async () => {
      const prompt = document.getElementById('videoPromptInput').value.trim() || 'Cinematic camera glide through brass clockwork observatory';
      const cameraMotion = document.getElementById('videoCameraMotion').value;
      const durationSec = document.getElementById('videoDuration').value;
      const motionStrength = document.getElementById('videoMotionStrength').value;
      btnGenerateVideo.disabled = true;
      btnGenerateVideo.textContent = 'Synthesizing Wan 2.1 video clip... ⏳';
      try {
        await apiPost('/api/studio/video', { prompt, cameraMotion, durationSec, motionStrength });
        showToast('Synthesized temporal video clip on Colab GPU');
        await fetchState();
      } catch (err) {
        showToast('Video render failed: ' + err.message);
      } finally {
        btnGenerateVideo.disabled = false;
        btnGenerateVideo.textContent = 'Render Video Clip (0.25 CU)';
      }
    });
  }

  document.getElementById('btnQueueVideo').addEventListener('click', async () => {
    const prompt = document.getElementById('videoPromptInput').value.trim() || 'Slow dolly push-in across glowing horology gears';
    await apiPost('/api/queue/add', {
      type: 'video',
      title: `Video: ${prompt.slice(0, 34)}`,
      prompt
    });
    showToast('Added Video Generation task to Batch Queue');
    await fetchState();
  });

  // 9. Safe Autonomous Agent Actions
  const btnRunAgent = document.getElementById('btnRunAgent');
  if (btnRunAgent) {
    btnRunAgent.addEventListener('click', async () => {
      const goal = document.getElementById('agentGoalInput').value.trim() || 'Verify Story Bible continuity and synthesize a 3-part narrative architecture.';
      btnRunAgent.disabled = true;
      btnRunAgent.textContent = 'Executing Safe Agent Audit on Colab GPU... ⏳';
      try {
        await apiPost('/api/studio/agent', { agentId: selectedAgentId, goal });
        showToast('Completed sandboxed Safe Agent run on Colab GPU');
        await fetchState();
      } catch (err) {
        showToast('Agent run failed: ' + err.message);
      } finally {
        btnRunAgent.disabled = false;
        btnRunAgent.textContent = 'Execute Guarded Agent Run (0.09 CU)';
      }
    });
  }

  // Lightbox Modal Handlers
  const btnCloseLightbox = document.getElementById('btnCloseLightbox');
  const modalLightbox = document.getElementById('mediaLightboxModal');
  const btnLightboxCopyPrompt = document.getElementById('btnLightboxCopyPrompt');

  if (btnCloseLightbox && modalLightbox) {
    btnCloseLightbox.onclick = closeLightbox;
    modalLightbox.onclick = (e) => {
      if (e.target === modalLightbox) closeLightbox();
    };
  }
  if (btnLightboxCopyPrompt) {
    btnLightboxCopyPrompt.onclick = () => {
      const promptText = document.getElementById('lightboxPrompt')?.textContent;
      if (promptText) {
        navigator.clipboard.writeText(promptText);
        showToast('Prompt copied to clipboard!');
      }
    };
  }

  document.getElementById('btnQueueAgent').addEventListener('click', async () => {
    const goal = document.getElementById('agentGoalInput').value.trim() || 'Audit project consistency and generate structured recommendations';
    await apiPost('/api/queue/add', {
      type: 'agent',
      agentId: selectedAgentId,
      title: `Safe Agent: ${goal.slice(0, 32)}`,
      prompt: goal
    });
    showToast('Queued Safe Agent workflow');
    await fetchState();
  });

  // 10. System Prompt Presets & Persona Deck Controls
  const chatSelect = document.getElementById('chatPresetSelect');
  if (chatSelect) {
    chatSelect.addEventListener('change', async e => {
      await apiPost('/api/presets/update', { activePresetId: e.target.value });
      showToast('Swapped active persona');
      await fetchState();
    });
  }

  const btnSetDefault = document.getElementById('btnSetDefaultPreset');
  if (btnSetDefault) {
    btnSetDefault.addEventListener('click', async () => {
      await apiPost('/api/presets/set-default', { presetId: appState?.presets?.activePresetId });
      const current = appState?.presets?.list?.find(p => p.id === appState?.presets?.activePresetId);
      showToast(`⭐ Set "${current ? current.name : 'Selected'}" as your default persona!`);
      await fetchState();
    });
  }

  const btnSideDefault = document.getElementById('btnSideSetDefault');
  if (btnSideDefault) {
    btnSideDefault.addEventListener('click', async () => {
      await apiPost('/api/presets/set-default', { presetId: appState?.presets?.activePresetId });
      const current = appState?.presets?.list?.find(p => p.id === appState?.presets?.activePresetId);
      showToast(`⭐ Set "${current ? current.name : 'Selected'}" as your default persona!`);
      await fetchState();
    });
  }

  const btnConfigDefault = document.getElementById('btnConfigSetDefault');
  if (btnConfigDefault) {
    btnConfigDefault.addEventListener('click', async () => {
      await apiPost('/api/presets/set-default', { presetId: appState?.presets?.activePresetId });
      const current = appState?.presets?.list?.find(p => p.id === appState?.presets?.activePresetId);
      showToast(`⭐ Set "${current ? current.name : 'Selected'}" as your default system prompt!`);
      await fetchState();
    });
  }

  const btnToggleEditor = document.getElementById('btnTogglePersonaEditor');
  const inlineEditor = document.getElementById('inlinePersonaEditor');
  if (btnToggleEditor && inlineEditor) {
    btnToggleEditor.addEventListener('click', () => {
      inlineEditor.classList.toggle('hidden');
      if (!inlineEditor.classList.contains('hidden')) {
        const active = appState?.presets?.list?.find(p => p.id === appState?.presets?.activePresetId);
        if (active) {
          document.getElementById('inlineSystemPromptText').value = active.systemPrompt;
          document.getElementById('editingPresetNameLabel').textContent = active.name;
        }
      }
    });
  }

  const btnCancelEdit = document.getElementById('btnCancelPersonaEdit');
  if (btnCancelEdit && inlineEditor) {
    btnCancelEdit.addEventListener('click', () => {
      inlineEditor.classList.add('hidden');
    });
  }

  const btnSavePref = document.getElementById('btnSavePersonaPreference');
  if (btnSavePref && inlineEditor) {
    btnSavePref.addEventListener('click', async () => {
      const text = document.getElementById('inlineSystemPromptText').value.trim();
      const isDef = document.getElementById('chkMakeDefaultOnSave').checked;
      const targetId = appState?.presets?.activePresetId;
      await apiPost('/api/presets/save-preference', {
        presetId: targetId,
        systemPrompt: text,
        isDefault: isDef
      });
      inlineEditor.classList.add('hidden');
      showToast('💾 Saved your persona system prompt preference!');
      await fetchState();
    });
  }

  const btnNewPrompt = document.getElementById('btnNewPersonaPrompt');
  if (btnNewPrompt) {
    btnNewPrompt.addEventListener('click', async () => {
      const name = prompt('Enter a name for your new persona preset (e.g. Friendly Witty Tutor):');
      if (!name || !name.trim()) return;
      const defaultText = `You are ${name.trim()}. Respond naturally, articulately, and authentically without corporate disclaimers or formulaic templates.`;
      const systemPrompt = prompt('Enter system prompt instructions:', defaultText);
      if (!systemPrompt || !systemPrompt.trim()) return;
      await apiPost('/api/presets/save-preference', {
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
        isDefault: false
      });
      showToast(`Created & switched to new persona "${name.trim()}"!`);
      await fetchState();
    });
  }

  // 11. Models & Presets Configuration
  document.getElementById('globalPresetSelect').addEventListener('change', async e => {
    await apiPost('/api/presets/update', { activePresetId: e.target.value });
    showToast('Swapped active persona');
    await fetchState();
  });

  document.getElementById('configPresetSelect').addEventListener('change', async e => {
    await apiPost('/api/presets/update', { activePresetId: e.target.value });
    await fetchState();
  });

  document.getElementById('btnSavePresetText').addEventListener('click', async () => {
    const systemPrompt = document.getElementById('configPresetPrompt').value;
    await apiPost('/api/presets/update', {
      updatePresetId: appState.presets.activePresetId,
      systemPrompt
    });
    showToast('Updated active System Prompt instructions');
    await fetchState();
  });

  document.getElementById('btnCreatePreset').addEventListener('click', async () => {
    const name = document.getElementById('newPresetName').value.trim();
    const systemPrompt = document.getElementById('newPresetPrompt').value.trim();
    if (!name || !systemPrompt) return;
    await apiPost('/api/presets/update', {
      newPreset: { name, systemPrompt, category: 'custom' }
    });
    document.getElementById('newPresetName').value = '';
    document.getElementById('newPresetPrompt').value = '';
    showToast(`Created and activated preset "${name}"`);
    await fetchState();
  });

  document.getElementById('sliderTemp').addEventListener('input', e => {
    document.getElementById('valTemp').textContent = e.target.value;
  });
  document.getElementById('sliderTopP').addEventListener('input', e => {
    document.getElementById('valTopP').textContent = e.target.value;
  });

  document.getElementById('btnSaveSampling').addEventListener('click', async () => {
    await apiPost('/api/presets/update', {
      sampling: {
        temperature: Number(document.getElementById('sliderTemp').value),
        topP: Number(document.getElementById('sliderTopP').value),
        repetitionPenalty: Number(document.getElementById('inputRepPen').value),
        maxTokens: Number(document.getElementById('inputMaxTokens').value)
      }
    });
    showToast('Applied LLM sampling parameters');
    await fetchState();
  });

  document.getElementById('customModelForm').addEventListener('submit', async e => {
    e.preventDefault();
    const repoId = document.getElementById('customRepoId').value.trim();
    const modality = document.getElementById('customModality').value;
    const quantization = document.getElementById('customQuant').value;
    if (!repoId) return;
    await apiPost('/api/models/switch', {
      customModel: { id: repoId, modality, quantization, cachedOnDrive: true }
    });
    document.getElementById('customRepoId').value = '';
    showToast(`Loaded Hugging Face model ${repoId} onto Colab GPU!`);
    await fetchState();
  });

  // 11. Colab Auto-Setup, Creator Account & 200 CU Guard
  // Auto-key in buttons
  document.getElementById('btnAutoKeyLoginNotebook')?.addEventListener('click', () => autoKeyInNotebookUrl('loginNotebookUrl'));
  document.getElementById('btnAutoKeyAccountNotebook')?.addEventListener('click', () => autoKeyInNotebookUrl('accountNotebookUrl'));
  document.getElementById('btnAutoKeySetupNotebook')?.addEventListener('click', () => autoKeyInNotebookUrl('setupNotebookUrl'));

  // Creator Account Modal Handlers
  const accountModal = document.getElementById('accountModal');
  const btnOpenAcc = document.getElementById('btnOpenAccountModal');
  const btnCloseAcc = document.getElementById('btnCloseAccountModal');
  const btnSaveAcc = document.getElementById('btnSaveAccountSettings');
  const btnLogoutAcc = document.getElementById('btnLogoutAccount');

  if (btnOpenAcc && accountModal) {
    btnOpenAcc.addEventListener('click', () => {
      accountModal.classList.remove('hidden');
      renderAccountAndSetupFields();
    });
  }

  if (btnCloseAcc && accountModal) {
    btnCloseAcc.addEventListener('click', () => {
      accountModal.classList.add('hidden');
    });
  }

  accountModal?.addEventListener('click', (e) => {
    if (e.target === accountModal) {
      accountModal.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountModal && !accountModal.classList.contains('hidden')) {
      accountModal.classList.add('hidden');
    }
  });

  if (btnLogoutAcc) {
    btnLogoutAcc.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out?')) {
        await apiPost('/api/auth/logout');
        accountModal?.classList.add('hidden');
        document.getElementById('loginModal')?.classList.remove('hidden');
        await fetchState();
      }
    });
  }

  if (btnSaveAcc) {
    btnSaveAcc.addEventListener('click', async () => {
      const email = document.getElementById('accountEmail').value.trim();
      const name = document.getElementById('accountName').value.trim();
      const notebookUrl = document.getElementById('accountNotebookUrl').value.trim();
      const gpuTier = document.getElementById('accountGpuTier').value;
      const autoRun = document.getElementById('accountAutoRunCheckbox').checked;

      if (!email) {
        alert('Please enter your Creator Email Address.');
        return;
      }

      localStorage.setItem('colab_creator_email', email);
      if (notebookUrl) localStorage.setItem('colab_notebook_url', notebookUrl);

      const res = await apiPost('/api/user/account', {
        email,
        name,
        notebookUrl,
        gpuTier,
        autoRunOnLogin: autoRun
      });

      if (res.ok) {
        showToast('💾 Saved Creator Account & Notebook URL!');
        accountModal?.classList.add('hidden');
        await fetchState();
      } else {
        alert(res.error || 'Failed to save account settings.');
      }
    });
  }

  // Safe Auto-Fetch Tunnel Button in Setup Tab
  const btnAutoFetchTunnel = document.getElementById('btnAutoFetchTunnelSetup');
  if (btnAutoFetchTunnel) {
    btnAutoFetchTunnel.addEventListener('click', async () => {
      showToast('📡 Polling safe pairing topic for live Colab Tunnel link...');
      const res = await apiPost('/api/colab/auto-fetch');
      if (res.ok && res.tunnelUrl) {
        document.getElementById('setupTunnelUrl').value = res.tunnelUrl;
        showToast(`🎉 Connected live to Colab Tunnel: ${res.tunnelUrl}`);
        await fetchState();
      } else {
        alert(res.error || 'No live tunnel discovered yet on topic colab_sync_studio_9f4k2x8m. Please make sure Stage 4 is running in your Colab notebook!');
      }
    });
  }

  document.getElementById('btnSaveColabSetup').addEventListener('click', async () => {
    const email = document.getElementById('setupCreatorEmail').value.trim();
    const name = document.getElementById('setupCreatorName').value.trim();
    const notebookUrl = document.getElementById('setupNotebookUrl').value.trim();
    const tunnelUrl = document.getElementById('setupTunnelUrl').value.trim();
    const gpuTier = document.getElementById('setupGpuTier').value;
    const autoRun = document.getElementById('setupAutoRunToggle').checked;

    if (email) localStorage.setItem('colab_creator_email', email);
    if (notebookUrl) localStorage.setItem('colab_notebook_url', notebookUrl);

    await apiPost('/api/user/account', { email, name, notebookUrl, gpuTier, autoRunOnLogin: autoRun });
    await apiPost('/api/colab/config', {
      autoRunOnLogin: autoRun,
      notebookUrl,
      tunnelUrl,
      gpuTier
    });
    showToast('💾 Saved Creator Account & Colab Auto-Run settings');
    await fetchState();
  });

  document.getElementById('btnUpdateCuConfig').addEventListener('click', async () => {
    await apiPost('/api/colab/config', {
      remainingCU: Number(document.getElementById('setupRemainingCU').value),
      autoShutdownOnQueueFinish: document.getElementById('setupAutoShutdownQueue').checked
    });
    showToast('Updated 200 Compute Unit meter & auto-shutdown guard');
    await fetchState();
  });

  // 12. Batch Task Queue Dock Controls
  document.getElementById('queueAutoRunCheckbox').addEventListener('change', async e => {
    await apiPost('/api/queue/control', { autoRunEnabled: e.target.checked });
    showToast(e.target.checked ? 'Sequential Queue Auto-Runner enabled' : 'Queue Auto-Runner paused');
    await fetchState();
  });

  document.getElementById('dockAutoShutdownCheckbox').addEventListener('change', async e => {
    await apiPost('/api/colab/config', { autoShutdownOnQueueFinish: e.target.checked });
    showToast('Updated post-queue Colab auto-shutdown guard');
    await fetchState();
  });

  document.getElementById('quickQueueForm').addEventListener('submit', async e => {
    e.preventDefault();
    const type = document.getElementById('quickQueueType').value;
    const promptInput = document.getElementById('quickQueuePrompt');
    if (!promptInput.value.trim()) return;
    await apiPost('/api/queue/add', {
      type,
      title: `${type.toUpperCase()}: ${promptInput.value.slice(0, 32)}`,
      prompt: promptInput.value.trim()
    });
    promptInput.value = '';
    showToast(`Added ${type.toUpperCase()} task to sequential queue`);
    await fetchState();
  });

  document.getElementById('btnQuickBatchDemo').addEventListener('click', async () => {
    await apiPost('/api/queue/add', {
      tasks: [
        {
          type: 'novel',
          title: '1. Draft Novel Scene (Mistral-Nemo)',
          prompt: 'Write the scene where Kaelen decodes the temporal inscription inside the Magistrate chronometer.'
        },
        {
          type: 'image',
          title: '2. Render Chapter Key Art (FLUX.1-dev)',
          prompt: 'Macro close-up of an antique brass chronometer emitting blue temporal light on a wooden horologist desk, 35mm lens'
        },
        {
          type: 'agent',
          agentId: 'agent-plot',
          title: '3. Safe Agent Continuity Check',
          prompt: 'Verify that the newly drafted scene and visual key art match all Story Bible Lorebook rules.'
        }
      ]
    });
    showToast('Queued 3-step Multi-Modal Pipeline! Watch sequential execution & VRAM swapping in the dock.');
    await fetchState();
  });

  document.getElementById('btnClearCompletedQueue').addEventListener('click', async () => {
    await apiPost('/api/queue/control', { action: 'clear-completed' });
    await fetchState();
  });
});
