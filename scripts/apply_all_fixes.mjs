import fs from 'node:fs';
import path from 'node:path';

// ==========================================
// 1. UPDATE public/index.html
// ==========================================
const indexHtmlPath = 'public/index.html';
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Update cache-buster to v13
indexHtml = indexHtml.replace(/styles\.css\?v=[^\"]+/, 'styles.css?v=20261101_v13');
indexHtml = indexHtml.replace(/app\.js\?v=[^\"]+/, 'app.js?v=20261101_v13');

// Add Length Selector in Chat Toolbar
const chatToolbarOld = `<div class="chat-toolbar">
              <label class="think-toggle" title="Let the model reason step by step before answering (slower, uses more tokens)">
                <input id="chkThinking" type="checkbox" />
                <span class="think-switch"></span>
                <span>Thinking</span>
              </label>
              <button id="btnChatHistory" type="button" class="btn-compact btn-secondary">History</button>
              <button id="btnNewChat" type="button" class="btn-compact btn-primary">+ New chat</button>
            </div>`;

const chatToolbarNew = `<div class="chat-toolbar" style="flex-wrap:wrap; gap:8px;">
              <label class="think-toggle" title="Let the model reason step by step before answering (slower, uses more tokens)">
                <input id="chkThinking" type="checkbox" />
                <span class="think-switch"></span>
                <span>Thinking</span>
              </label>
              <label style="display:inline-flex; align-items:center; gap:5px; font-size:12px; background:rgba(15,23,42,0.6); padding:3px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
                <span style="color:var(--text-muted); font-size:11px;">Length:</span>
                <select id="chatLengthSelect" class="compact-select" style="padding:2px 6px; font-size:11.5px; background:transparent; border:none; color:var(--accent-cyan); font-weight:600; cursor:pointer;" title="Choose output length cap (Epic allows 5,000+ words)">
                  <option value="epic" selected>📜 Epic / 5000+ Words (8192 Tok)</option>
                  <option value="long">📖 Long-Form (4096 Tok)</option>
                  <option value="detailed">📝 Detailed (2048 Tok)</option>
                  <option value="auto">⚡ Standard (1024 Tok)</option>
                </select>
              </label>
              <button id="btnChatHistory" type="button" class="btn-compact btn-secondary">History</button>
              <button id="btnNewChat" type="button" class="btn-compact btn-primary">+ New chat</button>
            </div>`;

if (indexHtml.includes(chatToolbarOld)) {
  indexHtml = indexHtml.replace(chatToolbarOld, chatToolbarNew);
  console.log('✅ Added Length Selector to Chat Toolbar in index.html');
}

// Replace tab-image cleanly
const tabImageRegex = /<!-- 3\. IMAGE GENERATION STUDIO -->[\s\S]*?<section id="tab-image" class="workspace-panel">[\s\S]*?<\/section>/;

const newTabImageHtml = `<!-- 3. IMAGE GENERATION STUDIO -->
        <section id="tab-image" class="workspace-panel">
          <div class="panel-header">
            <div>
              <h2>Image Generation Studio (Diffusers)</h2>
              <p class="panel-subtitle">Generate concept art, character portraits &amp; book covers using FLUX.1-dev or SD 3.5 on Colab VRAM</p>
            </div>
            <span class="pill-badge" id="imageActiveModelPill">flux-realism</span>
          </div>

          <div class="composer-box">
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
                    <option value="flux-pro">💎 FLUX Pro (Studio Quality)</option>
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

            <!-- Row 2: Fine Tuning Parameters & Seed -->
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
                <label class="checkbox-row compact" style="margin-left:4px; font-size:12px; display:inline-flex; align-items:center; gap:5px; color:var(--accent-cyan); cursor:pointer;" title="Enforces symmetrical pupils, realistic irises, natural lips, clean teeth, and suppresses deformed facial anatomy">
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

          <div id="imageGalleryGrid" class="media-gallery-grid gallery-mode-fit"></div>
        </section>`;

if (tabImageRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(tabImageRegex, newTabImageHtml);
  console.log('✅ Accurately updated tab-image in index.html (preserving Novel & Chat!)');
} else {
  console.error('❌ Could not match tabImageRegex in index.html');
}

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');

// ==========================================
// 2. UPDATE server/index.js (Long Replies & Token Caps)
// ==========================================
const serverPath = 'server/index.js';
let serverCode = fs.readFileSync(serverPath, 'utf8');

// Update default maxTokens in state definition
serverCode = serverCode.replace(/maxTokens:\s*2048/g, 'maxTokens: 4096');

// Remove artificial clamp in loadState:
serverCode = serverCode.replace(/if\s*\(merged\.presets\.sampling\s*&&\s*merged\.presets\.sampling\.maxTokens\s*>\s*512\)\s*\{\s*merged\.presets\.sampling\.maxTokens\s*=\s*512;\s*\}/g, '// Token limit cap removed for long 5000+ words support\n      if (merged.presets.sampling && merged.presets.sampling.maxTokens < 2048) { merged.presets.sampling.maxTokens = 4096; }');

// Replace generateChatReply with high token & long-form capability
const chatReplyRegex = /async function generateChatReply\(prompt, preset, modelId, opts = \{\}\) \{[\s\S]*?return generateIntelligentPersonaResponse\(clean, preset, thinking\);\s*\}/;

const newChatReplyCode = `async function generateChatReply(prompt, preset, modelId, opts = {}) {
  const clean = (prompt || '').trim();
  const thinking = !!opts.thinking;
  const lengthMode = opts.lengthMode || 'epic';

  // Check if user is asking for long-form / multi-thousand word content
  const isLongExplicit = /(5000|4000|3000|2000|1000|万字|千字|长篇|详细|详尽|完整|深入|全文|章节|长文|深入探讨|long|in depth|detailed|extensive|expand|继续)/i.test(clean);
  const isLong = isLongExplicit || lengthMode === 'epic' || lengthMode === 'long';

  // Target token calculation: Up to 8192 tokens for 5000+ words!
  let targetMaxTokens = 4096;
  if (lengthMode === 'epic' || (isLongExplicit && /(5000|4000|万字|长篇)/i.test(clean))) {
    targetMaxTokens = 8192;
  } else if (lengthMode === 'detailed') {
    targetMaxTokens = 2048;
  } else if (lengthMode === 'auto' && !isLongExplicit) {
    targetMaxTokens = 1024;
  }

  let sysPrompt = preset?.systemPrompt || 'You are an intelligent, thoughtful, highly articulate and immersive AI companion.';
  
  if (isLong) {
    sysPrompt += '\\n\\n【重要长文输出指令】：用户明确要求产出极其详尽的长篇深度内容（篇幅目标在 3000~5000 字以上，或完整长篇故事/论文/分析）。请务必彻底展开叙述，分成多个深入的章节、小标题或详细结构模块，包含充实的细节描写、完整论证过程、丰富的角色对话或背景铺陈。坚决禁止简略概括或提前草草收尾，请尽可能发挥最大篇幅，产出篇幅充盈、结构完整、文字量极大的高水准长文！';
  }

  if (thinking) {
    sysPrompt += '\\n\\nBefore answering, reason step by step inside <think>...</think> tags, then write the final comprehensive answer after the closing tag.';
  } else {
    sysPrompt += '\\n\\nAnswer directly with depth, structure, and clarity.';
  }

  let userPrompt = buildHistoryPrompt(opts.history, clean);
  if (!thinking && /qwen3/i.test(modelId || '')) userPrompt = '/no_think ' + userPrompt;

  // 1. Primary Engine: Colab GPU when connected
  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(\`\${state.colab.tunnelUrl}/generate/chat\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: sysPrompt,
          model: modelId,
          temperature: state.presets.sampling.temperature || 0.78,
          topP: state.presets.sampling.topP || 0.92,
          repetitionPenalty: state.presets.sampling.repetitionPenalty || 1.15,
          maxTokens: targetMaxTokens
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = res.ok ? await res.json() : null;
      if (data && data.ok !== false && data.response) {
        const parts = splitThinking(data.response);
        if (!thinking) return { content: parts.content || parts.thinking, thinking: '', failed: false };
        if (!parts.content) parts.content = '(Token limit reached while thinking. Turn Thinking off or request next section.)';
        return { content: parts.content, thinking: parts.thinking, failed: false };
      }
    } catch (e) {
      console.warn('Colab GPU chat notice:', e.message);
    }
  }

  // 2. High-Performance Full-Scale Fallback Engine (POST method, 120s timeout for 5000+ words)
  try {
    const fallbackCtrl = new AbortController();
    const fallbackTid = setTimeout(() => fallbackCtrl.abort(), 120000);
    const fbRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'openai',
        seed: Math.floor(100000 + Math.random() * 900000),
        jsonMode: false
      }),
      signal: fallbackCtrl.signal
    });
    clearTimeout(fallbackTid);
    if (fbRes.ok) {
      const txt = await fbRes.text();
      if (txt && !txt.includes('Free limit reached') && !txt.includes('Please wait')) {
        const parts = splitThinking(txt);
        return {
          content: parts.content || txt,
          thinking: parts.thinking || (thinking ? \`Reasoning on user prompt: "\${clean.slice(0, 48)}"\nFormulating multi-thousand word comprehensive response...\` : ''),
          failed: false
        };
      }
    }
  } catch (err) {
    console.warn('Fallback text engine notice:', err.message);
  }

  // 3. Fallback GET with long timeout
  try {
    const getCtrl = new AbortController();
    const getTid = setTimeout(() => getCtrl.abort(), 60000);
    const u = \`https://text.pollinations.ai/\${encodeURIComponent(clean)}?model=openai&system=\${encodeURIComponent(sysPrompt)}\`;
    const getRes = await fetch(u, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: getCtrl.signal
    });
    clearTimeout(getTid);
    if (getRes.ok) {
      const txt = await getRes.text();
      if (txt && !txt.includes('Free limit reached') && txt.length > 50) {
        const parts = splitThinking(txt);
        return { content: parts.content || txt, thinking: parts.thinking || '', failed: false };
      }
    }
  } catch (err) {}

  // 4. Intelligent Persona Knowledge Engine (Rich multi-section response)
  return generateIntelligentPersonaResponse(clean, preset, thinking);
}`;

if (chatReplyRegex.test(serverCode)) {
  serverCode = serverCode.replace(chatReplyRegex, newChatReplyCode);
  console.log('✅ Updated generateChatReply in server/index.js with 8192 token support & long-form prompts');
} else {
  console.error('❌ Could not match chatReplyRegex in server/index.js');
}

fs.writeFileSync(serverPath, serverCode, 'utf8');

// ==========================================
// 3. UPDATE data/studio_state.json
// ==========================================
const stateJsonPath = 'data/studio_state.json';
if (fs.existsSync(stateJsonPath)) {
  let stateJson = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
  if (stateJson.presets && stateJson.presets.sampling) {
    stateJson.presets.sampling.maxTokens = 4096;
  }
  fs.writeFileSync(stateJsonPath, JSON.stringify(stateJson, null, 2), 'utf8');
  console.log('✅ Updated data/studio_state.json maxTokens to 4096');
}

// ==========================================
// 4. UPDATE Colab Notebooks Token Limits
// ==========================================
for (const nbFile of ['colab/a100_one_click_worker.ipynb', 'colab/gpu_one_click_worker.ipynb']) {
  if (fs.existsSync(nbFile)) {
    let nbStr = fs.readFileSync(nbFile, 'utf8');
    nbStr = nbStr.replace(/max_tokens = min\(requested_tokens, 1024\) if HAS_CUDA else min\(requested_tokens, 96\)/g, 'max_tokens = min(requested_tokens, 8192) if HAS_CUDA else min(requested_tokens, 1024)');
    fs.writeFileSync(nbFile, nbStr, 'utf8');
    console.log('✅ Updated ' + nbFile + ' max_tokens to 8192');
  }
}
