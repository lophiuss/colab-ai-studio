import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Top Header to be clean, compact, Google-Gemini-style
top_bar_start = html.find('<header class="top-telemetry-bar">')
top_bar_end = html.find('</header>') + len('</header>')
if top_bar_start == -1 or top_bar_end == -1:
    print('Top bar not found!')
    exit(1)

new_top_bar = """<header class="top-telemetry-bar">
      <!-- Left: Logo & Model Pill -->
      <div class="brand-cluster">
        <button id="btnToggleNavRail" class="btn-icon-toggle" title="Toggle Sidebar">☰</button>
        <div class="brand-badge">⚡</div>
        <div class="brand-text-wrap">
          <span class="brand-title">Colab AI Studio</span>
          <span class="brand-sub" id="activeModelHeaderBadge">Qwen 2.5 7B Abliterated</span>
        </div>
      </div>

      <!-- Center: Status, Live URL, GPU VRAM & 200 CU meter -->
      <div class="top-center-stats">
        <div class="top-stat-pill status-pill">
          <span id="colabStatusDot" class="status-dot disconnected"></span>
          <span id="colabStatusText">Colab Live (A100)</span>
          <span id="colabStartupTimeLabel" class="mono-meta" style="font-size:11px; color:var(--text-muted);">0.0s</span>
        </div>
        <div class="top-stat-pill vram-pill">
          <span id="gpuTierBadge" class="pill-label">NVIDIA A100</span>
          <span id="vramReadout" class="mono-meta">5.9 / 40.0 GB</span>
        </div>
        <div class="top-stat-pill cu-pill">
          <span class="pill-label">CU</span>
          <span id="cuRemainingValue" class="mono-meta">185.2 / 200 CU</span>
          <div class="cu-mini-bar">
            <div id="cuGaugeFill" class="cu-gauge-fill" style="width: 92%"></div>
          </div>
        </div>
        <!-- Hidden elements retained for app.js telemetry logic compatibility -->
        <span id="cuBurnRateLabel" style="display:none;">Burn: 13.11 CU/hr</span>
        <span id="cuSessionSpentLabel" style="display:none;">Session: 0.00 CU</span>
        <span id="gpuUtilLabel" style="display:none;">GPU: 0%</span>
        <span id="driveMountBadge" style="display:none;">Drive</span>
        <div id="vramGaugeFill" style="display:none;"></div>
        <div id="colabProgressBarFill" style="display:none;"></div>
        <span id="colabStageCaption" style="display:none;"></span>
      </div>

      <!-- Right: Action Buttons & Queue Toggle -->
      <div class="top-actions-cluster">
        <button id="btnCopyColabCli" class="btn-compact btn-wand" title="Open 1-Click A100 Colab Notebook">⚡ 1-Click A100</button>
        <button id="btnConnectTunnel" class="btn-compact btn-secondary" title="Paste Cloudflare Tunnel">🔗 Tunnel</button>
        <button id="btnWakeColab" class="btn-compact btn-amber" title="Full-Auto Browser Wake">🚀 Auto-Colab</button>
        <button id="btnShutdownColab" class="btn-compact btn-ghost-danger" title="Disconnect GPU">Disconnect</button>
        <button id="btnToggleQueueDock" class="btn-compact btn-queue-toggle" title="Toggle Batch Task Queue Pane">
          📥 Queue <span id="topQueueBadge" class="queue-count-badge">0</span>
        </button>
        <button id="btnOpenAccountModal" class="user-chip-btn" title="Account &amp; Settings">
          <span class="user-avatar">👤</span>
          <span id="telemetryUserEmail" class="user-email-label" style="display:none;">creator@colabaistudio.local</span>
        </button>
      </div>
    </header>"""

html = html[:top_bar_start] + new_top_bar + html[top_bar_end:]

# 2. Update Left Navigation Rail to Google Gemini style:
# New Chat at top, History & Previous Tasks grouped by type, Mode switcher, Persona & Config at bottom
nav_start = html.find('<aside class="nav-rail">')
nav_end = html.find('</aside>', nav_start) + len('</aside>')
if nav_start == -1 or nav_end == -1:
    print('Nav rail not found!')
    exit(1)

new_nav_rail = """<aside class="nav-rail" id="mainNavRail">
        <div class="gemini-sidebar-top">
          <button id="btnSideNewChat" class="btn-gemini-new-chat">
            <span style="font-size:16px;">✏️</span>
            <span>New Chat</span>
          </button>
        </div>

        <div class="gemini-sidebar-scroll">
          <!-- Workspace Quick Mode Jumper -->
          <div class="sidebar-category-header">Studio Modes</div>
          <div class="gemini-modes-grid">
            <button class="gemini-mode-btn active" data-tab="chat">💬 Chat</button>
            <button class="gemini-mode-btn" data-tab="image">🎨 Image</button>
            <button class="gemini-mode-btn" data-tab="novel">📖 Novel</button>
            <button class="gemini-mode-btn" data-tab="video">🎬 Video</button>
            <button class="gemini-mode-btn" data-tab="agent">🛡️ Agent</button>
          </div>

          <!-- Grouped Recent Tasks & Chats -->
          <div class="sidebar-category-header" style="margin-top:12px;">Recent Chats</div>
          <div id="geminiRecentChatsList" class="gemini-history-list"></div>

          <div class="sidebar-category-header" style="margin-top:12px;">Recent Generations</div>
          <div id="geminiRecentGenerationsList" class="gemini-history-list"></div>

          <div class="sidebar-category-header" style="margin-top:12px;">Settings &amp; Model Hub</div>
          <div style="display:flex; flex-direction:column; gap:4px; padding:0 6px;">
            <button class="gemini-link-btn" data-tab="models">🤗 HuggingFace Models</button>
            <button class="gemini-link-btn" data-tab="setup">⚙️ Auto-Setup &amp; CU Rules</button>
          </div>
        </div>

        <div class="gemini-sidebar-footer">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11px; color:var(--text-muted);">
            <span>Active Persona</span>
            <button id="btnSideSetDefault" class="btn-link" style="font-size:10px;">Set Default</button>
          </div>
          <select id="globalPresetSelect" class="compact-select"></select>
          <div class="nav-footer-meta" id="navSamplingSummary">Temp 0.78 · Top-P 0.92</div>
        </div>
      </aside>"""

html = html[:nav_start] + new_nav_rail + html[nav_end:]

# 3. Add Floating Mode Switcher Bar right at the Prompt Input in tab-chat!
# Look for composer-box in tab-chat
chat_composer_marker = '<textarea id="chatPromptInput"'
if chat_composer_marker in html:
    mode_bar_html = """<!-- Inline Google-Gemini Style Mode Picker -->
            <div class="composer-mode-bar">
              <span class="mode-bar-label">Studio Mode:</span>
              <button type="button" class="mode-pill active" data-switch-mode="chat">💬 Chat LLM</button>
              <button type="button" class="mode-pill" data-switch-mode="image">🎨 Image Studio</button>
              <button type="button" class="mode-pill" data-switch-mode="novel">📖 Novel Studio</button>
              <button type="button" class="mode-pill" data-switch-mode="video">🎬 Video Studio</button>
              <button type="button" class="mode-pill" data-switch-mode="agent">🛡️ Safe Agents</button>
            </div>
            """
    html = html.replace(chat_composer_marker, mode_bar_html + chat_composer_marker, 1)
    print('Inserted composer-mode-bar in chat composer!')

# 4. Update Batch Task Queue Header to add Hide/Collapse button
queue_dock_marker = '<div class="queue-dock-header">'
if queue_dock_marker in html:
    new_queue_header = """<div class="queue-dock-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="btnCloseQueueDock" class="btn-icon-close" title="Hide Queue Pane">✕</button>
            <div>
              <h3 style="font-size:14px; margin:0;">Batch Task Queue</h3>
              <p class="queue-sub" style="margin:0;">Sequential Auto-Runner</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="btnClearCompletedQueue" class="btn-compact btn-secondary" style="font-size:10px; padding:3px 6px;">Clear Done</button>
            <label class="switch-pill" title="Automatically run next task when current finishes" style="font-size:11px;">
              <input id="queueAutoRunCheckbox" type="checkbox" checked />
              <span>Auto</span>
            </label>
          </div>
        </div>"""
    html = html.replace(queue_dock_marker, new_queue_header, 1)
    print('Updated queue-dock-header!')

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated public/index.html successfully!')
