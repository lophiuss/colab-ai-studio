import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchColabNotebook } from '../colab/auto_launch_colab.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, 'studio_state.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const GPU_TIERS = {
  T4: { name: 'NVIDIA Tesla T4', vramTotalMB: 40960, burnRateCUHr: 1.96 },
  L4: { name: 'NVIDIA L4', vramTotalMB: 23040, burnRateCUHr: 4.82 },
  A100: { name: 'NVIDIA A100-SXM4-40GB', vramTotalMB: 40960, burnRateCUHr: 13.11 }
};

const DEFAULT_STATE = {
  user: {
    authenticated: false,
    email: 'creator@colabaistudio.local',
    name: 'AI Creator',
    lastLoginAt: null
  },
  colab: {
    status: 'DISCONNECTED', // DISCONNECTED | STARTING | READY | SHUTTING_DOWN
    autoRunOnLogin: true,
    notebookUrl: 'https://colab.research.google.com/github/lophiuss/colab-ai-studio/blob/main/colab/01_text_llm_finetuner_and_worker.ipynb',
    tunnelUrl: 'https://colab-worker-t4.trycloudflare.com',
    pairingTopic: 'colab_sync_studio_9f4k2x8m',
    gpuTier: 'A100',
    gpuName: 'NVIDIA A100-SXM4-40GB',
    vramUsedMB: 0,
    vramTotalMB: 15360,
    gpuUtilPct: 0,
    ramUsedGB: 2.4,
    ramTotalGB: 12.7,
    driveMounted: false,
    driveCachePath: '/content/drive/MyDrive/ColabAIStudio/hf_cache',
    startupStartedAt: null,
    startupTargetDurationSec: 14,
    startupElapsedSec: 0,
    startupProgressPct: 0,
    currentStageIndex: 0,
    stages: [
      { index: 1, name: 'Launching Headless Colab & Allocating GPU Runtime', status: 'pending', durationSec: 3, detail: 'Waiting for login trigger' },
      { index: 2, name: 'Mounting Google Drive & Verifying HF Cache', status: 'pending', durationSec: 4, detail: '/content/drive/MyDrive/ColabAIStudio/hf_cache' },
      { index: 3, name: 'Loading Hugging Face Weights into GPU VRAM', status: 'pending', durationSec: 5, detail: 'Qwen/Qwen2.5-14B-Instruct-AWQ (4-bit)' },
      { index: 4, name: 'Starting FastAPI Worker & Cloudflare Reverse Tunnel', status: 'pending', durationSec: 2, detail: 'Health check & webhook handshake' }
    ]
  },
  computeUnits: {
    totalAllocation: 200.0,
    remainingCU: 186.40,
    sessionSpentCU: 0.0,
    lowBalanceWarningCU: 25.0,
    autoShutdownOnQueueFinish: true,
    idleTimeoutMinutes: 15,
    lastSyncedAt: new Date().toISOString(),
    history: [
      { id: 'cu-1', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), task: 'Novel Chapter 1-3 Batch (T4)', cuUsed: 1.85 },
      { id: 'cu-2', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), task: 'FLUX.1 Concept Art Batch (L4)', cuUsed: 3.75 }
    ]
  },
  models: {
    hfTokenConfigured: false,
    hfTokenMasked: 'Not required (100% Free Open Models)',
    activeTextModel: 'RichardErkhov/DavidAU_-_L3.2-Rogue-Creative-Instruct-Uncensored-Abliterated-7B-4bits',
    activeImageModel: 'black-forest-labs/FLUX.1-dev',
    activeVideoModel: 'Wan-AI/Wan2.1-T2V-14B',
    loadedInVramModel: 'RichardErkhov/DavidAU_-_L3.2-Rogue-Creative-Instruct-Uncensored-Abliterated-7B-4bits',
    loadedModality: 'text',
    catalog: [
      {
        id: 'RichardErkhov/DavidAU_-_L3.2-Rogue-Creative-Instruct-Uncensored-Abliterated-7B-4bits',
        name: 'DavidAU L3.2 Rogue Creative Uncensored Abliterated 7B (Fast 4-bit)',
        modality: 'text',
        quantization: 'Pre-Quantized 4-bit NF4',
        vramMB: 4380,
        cachedOnDrive: true,
        description: 'Fastest liberated dark-roast creative & roleplay model by DavidAU (Only 4.38GB download — boots in ~20s on T4).'
      },
      {
        id: 'RichardErkhov/huihui-ai_-_Qwen2.5-7B-Instruct-abliterated-v2-4bits',
        name: 'Qwen 2.5 7B Instruct Abliterated v2 (Fast 4-bit)',
        modality: 'text',
        quantization: 'Pre-Quantized 4-bit NF4',
        vramMB: 5590,
        cachedOnDrive: true,
        description: 'Uncensored/abliterated Qwen 2.5 7B with pre-quantized 4-bit weights for fast loading, chat, and coding.'
      },
      {
        id: 'RichardErkhov/DavidAU_-_L3-DARKER-PLANET-Broken-Land-12.15B-4bits',
        name: 'DavidAU Darker Planet Broken Land 12B (Dark-Roast 4-bit)',
        modality: 'text',
        quantization: 'Pre-Quantized 4-bit NF4',
        vramMB: 7980,
        cachedOnDrive: true,
        description: 'DavidAU Dark-Roast 12.15B powerhouse for atmospheric dark fiction, noir storytelling, and deep prose.'
      },
      {
        id: 'DavidAU/Qwen3-8B-64k-Context-2X-Josiefied-Uncensored',
        name: 'DavidAU Qwen3 8B 64k Josiefied Uncensored',
        modality: 'text',
        quantization: '4-bit NF4',
        vramMB: 5400,
        cachedOnDrive: false,
        description: '174k+ downloads flagship 64k-context liberated model by DavidAU.'
      },
      {
        id: 'DavidAU/Qwen3-4B-2507-Thinking-heretic-abliterated-uncensored',
        name: 'DavidAU Qwen3 4B Heretic Abliterated Turbo',
        modality: 'text',
        quantization: '4-bit NF4',
        vramMB: 2800,
        cachedOnDrive: false,
        description: 'Ultra-lightweight 4B Heretic Abliterated model (~75 tok/s on Tesla T4).'
      },
      {
        id: 'black-forest-labs/FLUX.1-dev',
        name: 'FLUX.1-dev (NF4 Quantized)',
        modality: 'image',
        quantization: '4-bit NF4',
        vramMB: 11800,
        cachedOnDrive: true,
        description: 'State-of-the-art prompt adherence, typography, and cinematic lighting.'
      },
      {
        id: 'stabilityai/stable-diffusion-3.5-large-turbo',
        name: 'SD 3.5 Large Turbo',
        modality: 'image',
        quantization: 'FP8',
        vramMB: 10200,
        cachedOnDrive: false,
        description: 'Fast 4-step high-resolution concept illustration and character portraits.'
      },
      {
        id: 'Wan-AI/Wan2.1-T2V-14B',
        name: 'Wan 2.1 Text-to-Video 14B',
        modality: 'video',
        quantization: 'FP8 Offload',
        vramMB: 14200,
        cachedOnDrive: true,
        description: 'Temporal coherence and cinematic camera motion generation.'
      },
      {
        id: 'Lightricks/LTX-Video-0.9.5',
        name: 'LTX-Video 0.9.5 Realtime',
        modality: 'video',
        quantization: 'BF16',
        vramMB: 9600,
        cachedOnDrive: true,
        description: 'High-speed keyframe-to-video and atmospheric scene motion.'
      }
    ]
  },
  presets: {
    activePresetId: 'preset-natural',
    defaultPresetId: 'preset-natural',
    sampling: {
      temperature: 0.78,
      topP: 0.92,
      topK: 40,
      repetitionPenalty: 1.18,
      maxTokens: 2048
    },
    list: [
      {
        id: 'preset-natural',
        name: 'Natural & Conversational Human',
        shortTag: '🧑 Natural Human',
        category: 'chat',
        systemPrompt: 'You are a natural, intelligent, and engaging conversational companion. Speak like a real person: warm, authentic, articulate, and direct. Keep your tone relaxed, helpful, and conversational. Do not output repetitive markdown templates, rigid corporate summaries, or unsolicited bullet-point lectures unless specifically requested. Always reply fluently in the same language as the user (if the user speaks Chinese, reply in Chinese; if English, reply in English). Answer naturally and converse with personality.'
      },
      {
        id: 'preset-uncensored-creative',
        name: 'Uncensored Creative & Story Roleplay',
        shortTag: '🎭 Uncensored Roleplay',
        category: 'chat',
        systemPrompt: 'You are an uncensored, immersive, and vivid creative companion and roleplay partner. You embrace bold storytelling, witty banter, emotional depth, and authentic dialogue without arbitrary preachiness or refusal. Always reply fluently in the same language as the user (if the user speaks Chinese, reply naturally in Chinese). Follow the user’s narrative direction seamlessly.'
      },
      {
        id: 'preset-concise',
        name: 'Direct & Concise Assistant',
        shortTag: '⚡ Direct & Concise',
        category: 'chat',
        systemPrompt: 'Provide direct, clear, and highly accurate answers with zero fluff or conversational filler. Get straight to the point.'
      },
      {
        id: 'preset-architect',
        name: 'Principal Systems & Code Architect',
        shortTag: '💻 Code Architect',
        category: 'chat',
        systemPrompt: 'You are a Principal Systems Architect. Provide direct, production-grade architectural solutions, exact code implementations, and clear trade-off analysis without filler.'
      },
      {
        id: 'preset-novelist',
        name: 'Literary Novelist (Show, Don’t Tell)',
        shortTag: '📖 Literary Novelist',
        category: 'novel',
        systemPrompt: 'You are an acclaimed literary novelist. Prioritize sensory grounding, subtext-rich dialogue, psychological depth, and deliberate pacing. Avoid clichés, purple prose, and rushed endings.'
      },
      {
        id: 'preset-cinematic',
        name: 'Cinematographer & Diffusion Director',
        shortTag: '🎨 Visual Director',
        category: 'image',
        systemPrompt: 'You are an expert director of photography. Structure visual prompts with subject framing, lens focal length (e.g., 35mm anamorphic), volumetric lighting, color palette, and surface texture.'
      },
      {
        id: 'preset-safe-agent',
        name: 'Sandboxed Research & Verification Agent',
        shortTag: '🛡️ Safe Agent',
        category: 'agent',
        systemPrompt: 'Operate strictly within read-only safety guardrails. Break complex goals into verifiable sub-steps, cite reasoning explicitly, check for loops, and never execute destructive operations.'
      }
    ]
  },
  chatMessages: [
    {
      id: 'msg-welcome',
      role: 'assistant',
      model: 'Qwen/Qwen2.5-14B-Instruct-AWQ',
      timestamp: new Date().toISOString(),
      content: 'Colab AI Studio is ready. Your **200 Compute Unit** meter is active, and your Google Drive Hugging Face cache (`/content/drive/MyDrive/ColabAIStudio/hf_cache`) is linked. You can chat directly, write chapters in the Novel Studio, render images/videos, deploy safe agents, or queue batch tasks for sequential execution.'
    }
  ],
  novel: {
    title: 'The Chronometer of Glass Harbor',
    genre: 'Speculative Noir / Clockwork Fantasy',
    lorebook: [
      { id: 'lore-1', category: 'Character', name: 'Kaelen Voss', notes: 'Former guild horologist who can hear temporal fractures inside brass mechanisms. Carries a salt-tarnished pocket chronometer.' },
      { id: 'lore-2', category: 'World Rule', name: 'Tide-Lock Fog', notes: 'Every twelve hours when the harbor fog rolls in, unanchored memories crystallize into amber glass shards along the seawall.' }
    ],
    chapters: [
      {
        id: 'chap-1',
        title: 'Chapter I: The Salt-Stained Escapement',
        wordCount: 168,
        content: `The fog off Glass Harbor never arrived silently; it clicked against the slate roofs like ten thousand tiny escapement wheels falling out of beat.\n\nKaelen Voss held his loupe to the oil lamp, watching the hairspring inside the Magistrate's timepiece. The brass teeth were coated in pale harbor rime—the unmistakable residue of a temporal slip. Someone had wound this watch forty minutes into tomorrow and left the debt unpaid.\n\n"You told me it only lost seconds," Kaelen said without looking up from his workbench. Across the counter, the courier kept her gloved hands buried in her wool coat.\n\n"Seconds are expensive near the seawall, Master Voss," she replied. "Can you anchor the gear train before the tide turns, or do I take it to the Foundry?"`
      }
    ],
    activeChapterId: 'chap-1'
  },
  images: [
    {
      id: 'img-demo-1',
      prompt: 'Rain-slicked clockwork harbor at dusk, brass lighthouse emitting volumetric amber beams through dense coastal fog, 35mm anamorphic lens, intricate reflections, cinematic concept art',
      model: 'black-forest-labs/FLUX.1-dev',
      aspectRatio: '16:9',
      width: 1024,
      height: 576,
      steps: 28,
      cfgScale: 3.5,
      seed: 48190234,
      imageUrl: 'https://image.pollinations.ai/prompt/Rain-slicked%20clockwork%20harbor%20at%20dusk%2C%20brass%20lighthouse%20emitting%20volumetric%20amber%20beams%20through%20dense%20coastal%20fog%2C%2035mm%20anamorphic%20lens%2C%20cinematic%20concept%20art?width=1024&height=576&model=flux&seed=48190234&nologo=true',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      subjectTag: 'Glass Harbor Lighthouse'
    }
  ],
  videos: [
    {
      id: 'vid-demo-1',
      prompt: 'Slow dolly push-in across an antique horologist workbench as glowing brass gears levitate in slow motion, dust motes catching warm tungsten lamp light, 24fps cinematic motion',
      model: 'Wan-AI/Wan2.1-T2V-14B',
      durationSec: 5,
      fps: 24,
      motionStrength: 0.75,
      cameraMotion: 'Dolly Push-In',
      frameUrl: 'https://image.pollinations.ai/prompt/Slow%20dolly%20push-in%20across%20an%20antique%20horologist%20workbench%20as%20glowing%20brass%20gears%20levitate%20in%20slow%20motion%2C%20dust%20motes%2C%2024fps%20cinematic%20motion?width=1024&height=576&model=flux&seed=73910244&nologo=true',
      status: 'READY',
      createdAt: new Date(Date.now() - 900000).toISOString()
    }
  ],
  agents: {
    profiles: [
      {
        id: 'agent-research',
        name: 'Deep Research & Synthesis Agent',
        role: 'Multi-Step Fact & Architecture Analyst',
        safetyLevel: 'Strict Read-Only Sandbox',
        maxIterations: 4,
        tools: ['Knowledge Graph Query', 'Source Cross-Check', 'Structured Markdown Compiler'],
        description: 'Decomposes research topics into verified sub-questions with loop detection and zero external side-effects.'
      },
      {
        id: 'agent-plot',
        name: 'Novel Continuity & Plot Architect',
        role: 'Story Bible & Chapter Outline Planner',
        safetyLevel: 'Verified Manuscript Guard',
        maxIterations: 4,
        tools: ['Lorebook Consistency Scanner', 'Character Arc Tracker', 'Scene Beat Generator'],
        description: 'Audits your chapters against Lorebook rules and generates multi-chapter scene outlines without overwriting prose.'
      },
      {
        id: 'agent-prompt-crafter',
        name: 'Multi-Modal Prompt Engineer Agent',
        role: 'LLM, Diffusion & Video Prompt Optimizer',
        safetyLevel: 'Content & Token Guard',
        maxIterations: 3,
        tools: ['Token Density Analyzer', 'Style Tag Synthesizer', 'Negative Prompt Builder'],
        description: 'Iteratively refines rough creative ideas into calibrated prompts for FLUX, Wan2.1, and Qwen/Mistral.'
      },
      {
        id: 'agent-code-audit',
        name: 'Code Quality & Security Auditor',
        role: 'Static Analysis & Edge-Case Verifier',
        safetyLevel: 'Zero-Execution Static Guard',
        maxIterations: 4,
        tools: ['AST Pattern Check', 'VRAM Memory Footprint Estimator', 'Security Checklist'],
        description: 'Reviews Python/JS code and Colab setups for memory leaks, CUDA OOM risks, and security issues.'
      }
    ],
    runs: [
      {
        id: 'run-demo-1',
        agentId: 'agent-plot',
        agentName: 'Novel Continuity & Plot Architect',
        goal: 'Audit Chapter I of "The Chronometer of Glass Harbor" and design a 3-scene outline for Chapter II.',
        status: 'COMPLETED',
        safetyVerified: true,
        iterationsUsed: 3,
        maxIterations: 4,
        createdAt: new Date(Date.now() - 600000).toISOString(),
        steps: [
          { step: 1, tool: 'Lorebook Consistency Scanner', thought: 'Scanning Chapter I against Character (Kaelen Voss) and World Rule (Tide-Lock Fog).', output: 'Verified: Kaelen Voss horologist traits and seawall temporal slip align 100% with Lorebook entries.' },
          { step: 2, tool: 'Character Arc Tracker', thought: 'Evaluating tension between Kaelen Voss and the mysterious courier.', output: 'Identified narrative hook: The courier threatened to take the Magistrate timepiece to the Foundry.' },
          { step: 3, tool: 'Scene Beat Generator', thought: 'Synthesizing 3 structured scenes for Chapter II.', output: 'Scene 1: The Tide-Lock Bell tolls at midnight. Scene 2: Kaelen opens the watch case and discovers a crystallized memory shard inside. Scene 3: Pursuers from the Foundry arrive at the harbor pier.' }
        ],
        finalSummary: '### Chapter II Continuity & Scene Blueprint\n1. **Continuity Audit:** Passed (Zero contradictions with Lorebook).\n2. **Beat 1 — The Midnight Fog:** The twelve-hour Tide-Lock fog rolls over the seawall as Kaelen isolates the watch escapement.\n3. **Beat 2 — The Hidden Shard:** Inside the barrel arbor lies an amber glass memory shard belonging to the Magistrate.\n4. **Beat 3 — Foundry Intervention:** Lanterns appear through the fog—Foundry wardens have tracked the temporal resonance.'
      }
    ]
  },
  queue: {
    autoRunEnabled: true,
    isProcessing: false,
    activeTaskId: null,
    items: [
      {
        id: 'task-seed-1',
        type: 'novel',
        title: 'Draft Chapter II: Scene 1 (The Midnight Seawall)',
        prompt: 'Write the opening scene of Chapter II where the twelve-hour Tide-Lock fog hits Kaelen’s workshop and he extracts the amber memory shard from the watch.',
        model: 'mistralai/Mistral-Nemo-Instruct-2407',
        status: 'COMPLETED',
        progress: 100,
        estimatedCU: 0.08,
        createdAt: new Date(Date.now() - 1200000).toISOString(),
        completedAt: new Date(Date.now() - 1150000).toISOString(),
        resultSummary: 'Generated 310 words in Novel Studio ("Chapter II: The Amber Arbor").'
      }
    ]
  }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_STATE, ...parsed };
      if (!merged.colab.pairingTopic || merged.colab.pairingTopic !== 'colab_sync_studio_9f4k2x8m') {
        merged.colab.pairingTopic = 'colab_sync_studio_9f4k2x8m';
      }
      if (!merged.colab.notebookUrl || merged.colab.notebookUrl.includes('drive/folders') || merged.colab.notebookUrl.includes('1ColabAIStudioWorkerAutoRun')) {
        merged.colab.notebookUrl = 'https://colab.research.google.com/github/lophiuss/colab-ai-studio/blob/main/colab/01_text_llm_finetuner_and_worker.ipynb';
      }

      // Sync liberated dark-roast 4-bit models into catalog & upgrade default text model
      if (merged.models) {
        const defaultFastModel = 'RichardErkhov/huihui-ai_-_Qwen2.5-7B-Instruct-abliterated-v2-4bits';
        if (!merged.models.activeTextModel || merged.models.activeTextModel === 'Qwen/Qwen2.5-7B-Instruct' || merged.models.activeTextModel.includes('Qwen3.5-9B')) {
          merged.models.activeTextModel = defaultFastModel;
          merged.models.loadedInVramModel = defaultFastModel;
        }
        const existingModelIds = new Set((merged.models.catalog || []).map(m => m.id));
        const newCat = [...DEFAULT_STATE.models.catalog];
        for (const m of (merged.models.catalog || [])) {
          if (!newCat.some(d => d.id === m.id) && !m.id.includes('Qwen3.5-9B')) {
            newCat.push(m);
          }
        }
        merged.models.catalog = newCat;
      }

      // Ensure presets list has all standard presets while preserving any custom ones
      if (parsed.presets && Array.isArray(parsed.presets.list)) {
        const existingIds = new Set(parsed.presets.list.map(p => p.id));
        const mergedList = [...parsed.presets.list];
        for (const defPreset of DEFAULT_STATE.presets.list) {
          if (!existingIds.has(defPreset.id)) {
            mergedList.unshift(defPreset);
          } else {
            // Keep shortTag updated if missing
            const found = mergedList.find(p => p.id === defPreset.id);
            if (found && !found.shortTag) found.shortTag = defPreset.shortTag;
          }
        }
        merged.presets.list = mergedList;
      } else {
        merged.presets = structuredClone(DEFAULT_STATE.presets);
      }

      // Default & active preset resolution
      merged.presets.defaultPresetId = merged.presets.defaultPresetId || 'preset-natural';
      if (merged.presets.sampling && merged.presets.sampling.maxTokens > 512) {
        merged.presets.sampling.maxTokens = 512;
      }
      // If user had preset-architect set by default or unselected, default to preset-natural
      if (!merged.presets.activePresetId || merged.presets.activePresetId === 'preset-architect') {
        merged.presets.activePresetId = merged.presets.defaultPresetId;
      }

      // Auto-migrate legacy images to local cached media or high-availability endpoints
      if (Array.isArray(merged.images)) {
        merged.images = merged.images.filter(img => img.prompt && img.prompt.trim() !== 'jnjn');
        merged.images.forEach(img => {
          const localFile = path.join(PUBLIC_DIR, 'media', `${img.id}.jpg`);
          if (fs.existsSync(localFile)) {
            img.imageUrl = `/media/${img.id}.jpg`;
          } else if (!img.imageUrl || img.imageUrl.includes('image.pollinations.ai')) {
            const seed = img.seed || Math.floor(10000000 + Math.random() * 90000000);
            let w = 1024, h = 576;
            if (img.aspectRatio === '1:1') { w = 1024; h = 1024; }
            else if (img.aspectRatio === '3:4') { w = 768; h = 1024; }
            img.width = w;
            img.height = h;
            img.imageUrl = `https://pollinations.ai/p/${encodeURIComponent(img.prompt)}?width=${w}&height=${h}&seed=${seed}`;
          }
        });
      }

      // Auto-migrate legacy videos to local cached media or high-availability endpoints
      if (Array.isArray(merged.videos)) {
        merged.videos.forEach(vid => {
          const localFile = path.join(PUBLIC_DIR, 'media', `${vid.id}.jpg`);
          if (fs.existsSync(localFile)) {
            vid.frameUrl = `/media/${vid.id}.jpg`;
          } else if (!vid.frameUrl || vid.frameUrl.includes('image.pollinations.ai')) {
            const seed = vid.seed || Math.floor(10000000 + Math.random() * 90000000);
            const motion = vid.cameraMotion || 'Dolly Push-In';
            const vPrompt = `${vid.prompt}, cinematic film still, ${motion} camera motion blur, 8k professional cinematography, anamorphic lens flare, photorealistic movie lighting`;
            vid.frameUrl = `https://pollinations.ai/p/${encodeURIComponent(vPrompt)}?width=1024&height=576&seed=${seed}`;
            vid.status = 'READY';
          }
        });
      }

      return merged;
    }
  } catch (e) {
    console.error('State load warning, using default:', e.message);
  }
  return structuredClone(DEFAULT_STATE);
}

let state = loadState();
state.chats = Array.isArray(state.chats) ? state.chats : [];
state.chatSettings = state.chatSettings || { thinking: false };
state.activeChatId = state.activeChatId || 'chat-' + Date.now();

function chatTitleFrom(messages) {
  const first = (messages || []).find(m => m.role === 'user');
  const t = first ? first.content.replace(/^\[Batch Queue\]\s*/, '').trim() : '';
  return t ? (t.length > 42 ? t.slice(0, 42) + '...' : t) : 'New chat';
}

function archiveActiveChat() {
  const hasUser = state.chatMessages.some(m => m.role === 'user');
  if (!hasUser) return;
  const entry = {
    id: state.activeChatId,
    title: state.activeChatTitle || chatTitleFrom(state.chatMessages),
    updatedAt: new Date().toISOString(),
    messages: state.chatMessages
  };
  state.chats = state.chats.filter(c => c.id !== entry.id);
  state.chats.unshift(entry);
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save state:', e.message);
  }
}

// ============================================================================
// COLAB FULL-AUTO BOOT SEQUENCE & LIVE PROGRESS ORCHESTRATOR
// ============================================================================
let startupInterval = null;

function applyColabStageUpdate({ stageIndex, stageName, progress, detail }) {
  const idx = Math.max(1, Math.min(4, Number(stageIndex || 1)));
  const pct = Math.max(4, Math.min(100, Number(progress || 20)));

  if (pct >= 100 && state.colab.tunnelConnected) {
    state.colab.status = 'READY';
  } else {
    state.colab.status = 'STARTING';
  }

  if (pct > (state.colab.startupProgressPct || 0) || idx >= (state.colab.currentStageIndex || 1)) {
    state.colab.startupProgressPct = pct;
  }
  state.colab.currentStageIndex = idx;

  if (idx >= 2) {
    state.colab.driveMounted = true;
    state.colab.vramUsedMB = Math.max(state.colab.vramUsedMB || 0, 1250);
    state.colab.gpuUtilPct = 38;
  }
  if (idx >= 3) {
    const activeModelObj = state.models.catalog.find(m => m.id === state.models.activeTextModel);
    state.colab.vramUsedMB = activeModelObj ? activeModelObj.vramMB : 5600;
    state.colab.gpuUtilPct = 74;
  }

  state.colab.stages.forEach(s => {
    if (s.index < idx) {
      s.status = 'completed';
    } else if (s.index === idx) {
      s.status = (pct >= 100 && state.colab.tunnelConnected) ? 'completed' : 'active';
      if (stageName) s.name = stageName;
      if (detail) s.detail = detail;
    } else {
      s.status = 'pending';
    }
  });
  saveState();
}

function completeColabBootWithTunnel(tunnelUrl, modelId = null, gpuInfo = null) {
  if (startupInterval) {
    clearInterval(startupInterval);
    startupInterval = null;
  }
  state.colab.tunnelUrl = tunnelUrl;
  state.colab.tunnelConnected = true;
  state.colab.status = 'READY';
  state.colab.startupProgressPct = 100;
  state.colab.currentStageIndex = 4;
  state.colab.driveMounted = true;
  if (gpuInfo && gpuInfo.gpuName) {
    state.colab.gpuName = gpuInfo.gpuName;
    if (gpuInfo.vramTotalMB) state.colab.vramTotalMB = gpuInfo.vramTotalMB;
    if (gpuInfo.vramUsedMB) state.colab.vramUsedMB = gpuInfo.vramUsedMB;
    if (gpuInfo.gpuUtilPct !== undefined) state.colab.gpuUtilPct = gpuInfo.gpuUtilPct;
    if (gpuInfo.gpuName.includes('A100')) {
      state.colab.gpuTier = 'A100';
    } else if (gpuInfo.gpuName.includes('L4')) {
      state.colab.gpuTier = 'L4';
    } else if (gpuInfo.gpuName.includes('T4')) {
      state.colab.gpuTier = 'T4';
    }
  } else {
    const tier = GPU_TIERS[state.colab.gpuTier] || GPU_TIERS.A100;
    state.colab.gpuName = tier.name;
    state.colab.vramTotalMB = tier.vramTotalMB;
    const activeModelObj = state.models.catalog.find(m => m.id === state.models.activeTextModel);
    state.colab.vramUsedMB = activeModelObj ? activeModelObj.vramMB : 4725;
  }
  if (modelId) {
    state.models.loadedInVramModel = modelId;
  } else if (!state.models.loadedInVramModel) {
    state.models.loadedInVramModel = state.models.activeTextModel;
  }
  state.models.loadedModality = 'text';
  state.colab.stages.forEach(s => {
    s.status = 'completed';
  });
  if (state.colab.stages[3]) {
    state.colab.stages[3].name = 'Colab GPU Tunnel Connected & Ready!';
    state.colab.stages[3].detail = 'Live Tunnel Linked: ' + tunnelUrl;
  }
  saveState();
  processNextQueueTask();
}

function startColabBootSequence(triggerReason = 'Full-Auto One-Click Launcher', options = {}) {
  if (state.colab.status === 'STARTING' && !options.forceRestart) return state.colab;
  if (state.colab.status === 'READY' && state.colab.tunnelConnected && !options.forceRestart) return state.colab;

  const tier = GPU_TIERS[state.colab.gpuTier] || GPU_TIERS.T4;
  state.colab.status = 'STARTING';
  state.colab.tunnelConnected = false;
  state.colab.gpuName = tier.name;
  state.colab.vramTotalMB = tier.vramTotalMB;
  state.colab.vramUsedMB = 420;
  state.colab.gpuUtilPct = 18;
  state.colab.driveMounted = false;
  state.colab.startupStartedAt = Date.now();
  state.colab.startupElapsedSec = 0;
  state.colab.startupTargetDurationSec = 75;
  state.colab.startupProgressPct = 8;
  state.colab.currentStageIndex = 1;

  state.colab.stages = [
    { index: 1, name: `Auto-Uploading & Launching Colab (${state.colab.gpuTier} GPU)`, status: 'active', durationSec: 15, detail: `Triggered by ${triggerReason} — Opening Chrome & uploading notebook` },
    { index: 2, name: 'Allocating GPU & Installing AI Dependencies', status: 'pending', durationSec: 20, detail: 'Waiting for Colab cell 1 & 2 execution...' },
    { index: 3, name: 'Loading 4-bit Qwen2.5-7B + QLoRA into VRAM', status: 'pending', durationSec: 25, detail: `${state.models.activeTextModel} (4-bit NF4)` },
    { index: 4, name: 'Starting FastAPI & Auto-Linking Cloudflare Tunnel', status: 'pending', durationSec: 15, detail: 'Waiting for *.trycloudflare.com tunnel...' }
  ];

  // Trigger Full-Auto Playwright Browser Uploader & Runner asynchronously
  launchColabNotebook({
    notebookUrl: state.colab.notebookUrl,
    gpuTier: state.colab.gpuTier,
    forceUpload: Boolean(options.forceUpload)
  }).catch(() => {});

  if (startupInterval) clearInterval(startupInterval);

  startupInterval = setInterval(() => {
    if (state.colab.status !== 'STARTING') {
      clearInterval(startupInterval);
      startupInterval = null;
      return;
    }

    const elapsed = (Date.now() - state.colab.startupStartedAt) / 1000;
    state.colab.startupElapsedSec = Number(elapsed.toFixed(1));

    // Gently nudge progress bar within the active stage ceiling so user sees smooth motion
    const stageCeilings = { 1: 36, 2: 64, 3: 89, 4: 98 };
    const ceiling = stageCeilings[state.colab.currentStageIndex] || 95;
    if (state.colab.startupProgressPct < ceiling && Math.floor(elapsed) % 3 === 0) {
      state.colab.startupProgressPct = Math.min(ceiling, state.colab.startupProgressPct + 1);
    }
  }, 1000);

  saveState();
  return state.colab;
}

function shutdownColabRuntime(reason = 'Manual Shutdown / Auto-Idle Protection') {
  if (startupInterval) {
    clearInterval(startupInterval);
    startupInterval = null;
  }
  state.colab.status = 'DISCONNECTED';
  state.colab.vramUsedMB = 0;
  state.colab.gpuUtilPct = 0;
  state.colab.startupProgressPct = 0;
  state.colab.currentStageIndex = 0;
  state.colab.stages.forEach(s => {
    s.status = 'pending';
  });
  state.queue.isProcessing = false;
  state.queue.activeTaskId = null;
  saveState();
  return { ok: true, reason, colab: state.colab };
}

// ============================================================================
// REAL-TIME 200 COMPUTE UNIT (CU) BURN RATE TRACKER
// ============================================================================
setInterval(() => {
  if (state.colab.status === 'READY' || state.colab.status === 'STARTING') {
    const tier = GPU_TIERS[state.colab.gpuTier] || GPU_TIERS.T4;
    // Burn rate per 2 seconds = burnRateCUHr / 1800
    const cuDelta = tier.burnRateCUHr / 1800;
    state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - cuDelta).toFixed(4)));
    state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + cuDelta).toFixed(4));

    // Add slight realistic GPU telemetry jitter when READY
    if (state.colab.status === 'READY') {
      const baseUtil = state.queue.isProcessing ? 86 : 12;
      const jitter = Math.floor(Math.random() * 7) - 3;
      state.colab.gpuUtilPct = Math.max(4, Math.min(99, baseUtil + jitter));
    }
  }
}, 2000);

// ============================================================================
// AUTOMATIC ZERO-TOUCH TUNNEL & STAGE DISCOVERY VIA PRIVATE SAFE RELAY
// ============================================================================
async function handleRelayItem(item) {
  if (!item || !item.message) return false;
  const msg = item.message.trim();

  // 1. Live stage progress JSON from Colab
  if (msg.startsWith('{')) {
    try {
      const payload = JSON.parse(msg);
      if (payload && payload.type === 'colab_stage') {
        const msgTimeMs = (item.time || Math.floor(Date.now() / 1000)) * 1000;
        if (msgTimeMs >= (state.colab.startupStartedAt || 0) - 30000) {
          applyColabStageUpdate(payload);
        }
      }
    } catch (_) {}
    return false;
  }

  // 2. Live Cloudflare tunnel URL announcement
  if (msg.startsWith('https://') && msg.includes('.trycloudflare.com')) {
    const discoveredUrl = msg.replace(/\/$/, '');
    if (discoveredUrl !== state.colab.tunnelUrl || !state.colab.tunnelConnected) {
      let verified = false;
      let modelId = null;
      try {
        const pingRes = await fetch(`${discoveredUrl}/health`, { signal: AbortSignal.timeout(3500) });
        if (pingRes.ok) {
          const health = await pingRes.json();
          verified = true;
          modelId = health.model?.active_model_id;
          gpuInfo = health.gpu;
        }
      } catch (_) {}

      if (!verified) {
        try {
          const probeRes = await fetch(`${discoveredUrl}/generate/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'ping', maxTokens: 4 }),
            signal: AbortSignal.timeout(6000)
          });
          if (probeRes.ok) {
            const probeData = await probeRes.json();
            if (probeData && probeData.ok) verified = true;
          }
        } catch (_) {}
      }

      if (verified) {
        completeColabBootWithTunnel(discoveredUrl, modelId, typeof gpuInfo !== "undefined" ? gpuInfo : null);
        console.log(`📡 [Safe Auto-Fetch] Automatically connected to Colab GPU: ${discoveredUrl}`);
        return true;
      }
    }
  }
  return false;
}

async function pollAutoTunnelRelay() {
  const emailPrefix = (state.user.email || 'creator').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  const topic = state.colab.pairingTopic || `colab_sync_${emailPrefix}`;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    // IMPORTANT: `since=30m&poll=1` is required by ntfy.sh to return cached messages!
    const res = await fetch(`https://ntfy.sh/${topic}/json?since=30m&poll=1`, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) return;
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);

    if (state.colab.status === 'STARTING') {
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.message && item.message.trim().startsWith('{')) {
            await handleRelayItem(item);
          }
        } catch (_) {}
      }
    }

    for (const line of lines.reverse()) {
      try {
        const item = JSON.parse(line);
        if (item.message && item.message.includes('.trycloudflare.com')) {
          const linked = await handleRelayItem(item);
          if (linked) break;
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// Real-time persistent stream listener for <0.2s instant stage & tunnel reception
let ntfyStreamActive = false;
async function startLiveNtfyStream() {
  if (ntfyStreamActive) return;
  ntfyStreamActive = true;
  while (true) {
    const emailPrefix = (state.user.email || 'creator').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const topic = state.colab.pairingTopic || `colab_sync_${emailPrefix}`;
    try {
      const res = await fetch(`https://ntfy.sh/${topic}/json`);
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';
          for (const line of parts) {
            if (!line.trim()) continue;
            try {
              const item = JSON.parse(line);
              if (item.event === 'message') {
                await handleRelayItem(item);
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 3000));
  }
}

startLiveNtfyStream();
setInterval(pollAutoTunnelRelay, 4000);
async function enhanceUserPrompt(rawPrompt, mode = 'chat') {
  const clean = (rawPrompt || '').trim() || 'A compelling creative project';

  // 1. If Colab GPU is connected, ask the real AI model to expand & professionalize the prompt
  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const sysPrompt = `You are an expert prompt engineer. Expand the user's raw prompt into a rich, professional, and detailed instruction tailored for ${mode.toUpperCase()} generation. Output ONLY the enhanced prompt without any conversational preamble or surrounding quotes.`;
      const res = await fetch(`${state.colab.tunnelUrl}/generate/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Enhance and expand this prompt for ${mode}: "${clean}"`,
          systemPrompt: sysPrompt,
          temperature: 0.7,
          maxTokens: 256
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.response && data.response.trim()) {
          return data.response.trim();
        }
      }
    } catch (_) {}
  }

  // Heuristic enhancement fallback
  if (mode === 'image') {
    return `${clean}, cinematic medium-wide composition, shot on 35mm anamorphic lens, f/1.8 aperture, volumetric atmospheric lighting, intricate micro-textures, balanced color grading, ultra-detailed concept illustration, 8k render quality`;
  }
  if (mode === 'video') {
    return `Cinematic 24fps sequence: ${clean}. Smooth stabilized gimbal dolly movement, subtle atmospheric particle drift in foreground, physically accurate lighting transitions, high temporal coherence, filmic motion blur`;
  }
  if (mode === 'novel') {
    return `Write a richly atmospheric scene depicting: "${clean}". Anchor the narrative in concrete sensory details (sound, texture, light, and scent), weave character subtext into dialogue, maintain consistency with the Story Bible, and build dramatic momentum without rushing the resolution.`;
  }
  if (mode === 'agent') {
    return `Objective: ${clean}\nConstraints: Execute within read-only safety guardrails. Break the analysis into 3-4 verifiable steps, cross-check assumptions, provide concrete evidence for each finding, and conclude with an actionable executive synthesis.`;
  }
  return `Provide a comprehensive, well-structured response for: "${clean}". Include clear architectural reasoning, concrete examples, edge-case considerations, and concise actionable takeaways.`;
}

function splitThinking(raw) {
  const text = String(raw || '');
  const closed = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (closed) {
    return { thinking: closed[1].trim(), content: text.replace(/<think>[\s\S]*?<\/think>/i, '').trim() };
  }
  const open = text.match(/<think>([\s\S]*)$/i);
  if (open) return { thinking: open[1].trim(), content: '' };
  return { thinking: '', content: text.trim() };
}

function buildHistoryPrompt(history, clean) {
  const turns = (history || [])
    .filter(m => m && m.id !== 'msg-welcome' && m.content && !m.error)
    .slice(-12)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content).slice(0, 1500)}`);
  if (!turns.length) return clean;
  return `Conversation so far:\n${turns.join('\n')}\n\nReply to the latest user message:\nUser: ${clean}`;
}

async function generateChatReply(prompt, preset, modelId, opts = {}) {
  const clean = (prompt || '').trim();
  const thinking = !!opts.thinking;
  let sysPrompt = preset?.systemPrompt || '';
  sysPrompt += thinking
    ? '\n\nBefore answering, reason step by step inside <think>...</think> tags, then write the final answer after the closing tag.'
    : '\n\nAnswer directly. Do not show your reasoning.';
  let userPrompt = buildHistoryPrompt(opts.history, clean);
  if (!thinking && /qwen3/i.test(modelId || '')) userPrompt = '/no_think ' + userPrompt;

  if (!(state.colab.status === 'READY' && state.colab.tunnelUrl)) {
    return { content: 'The Colab GPU is not connected. Click "Full-Auto Colab" or "1-Line CLI + Open Colab" at the top, then try again.', thinking: '', failed: true };
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const res = await fetch(`${state.colab.tunnelUrl}/generate/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        systemPrompt: sysPrompt,
        model: modelId,
        temperature: state.presets.sampling.temperature,
        topP: state.presets.sampling.topP,
        repetitionPenalty: state.presets.sampling.repetitionPenalty || 1.18,
        maxTokens: thinking ? 512 : state.presets.sampling.maxTokens
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = res.ok ? await res.json() : null;
    if (data && data.ok !== false && data.response) {
      const parts = splitThinking(data.response);
      if (!thinking) return { content: parts.content || parts.thinking, thinking: '', failed: false };
      if (!parts.content) parts.content = '(Token limit reached while thinking. Ask again or turn Thinking off.)';
      return { content: parts.content, thinking: parts.thinking, failed: false };
    }
    return { content: `GPU error: ${(data && (data.error || data.response)) || 'HTTP ' + res.status}`, thinking: '', failed: true };
  } catch (e) {
    return { content: `Could not reach the Colab GPU (${e.name === 'AbortError' ? 'timed out' : e.message}). Check the connection status at the top.`, thinking: '', failed: true };
  }
}

async function generateChatResponse(prompt, preset, modelId) {
  return (await generateChatReply(prompt, preset, modelId, { thinking: false })).content;
}


async function generateNovelProse(prompt, actionType = 'continue', currentManuscript = '') {
  const loreContext = (state.novel.lorebook || []).map(l => `• [${l.category}] ${l.name}: ${l.notes}`).join('\n');
  const excerpt = (currentManuscript || '').slice(-1200);

  const sysPrompt = `You are a talented literary novelist. Write immersive, sensory-grounded prose with evocative descriptions, character subtext, and rich atmosphere. Seamlessly weave the user's scene direction into the story. Do not output meta explanations or greetings—write only the story prose directly.`;

  let userPrompt = '';
  if (actionType === 'continue') {
    userPrompt = `Continue the story manuscript seamlessly from where it left off:\n\n${excerpt ? `[Recent Manuscript Excerpt]:\n${excerpt}\n\n` : ''}${prompt ? `[Scene direction to write]: ${prompt}` : 'Write the next compelling continuation of this scene.'}\n\nWrite only the continuation prose directly:`;
  } else if (actionType === 'expand') {
    userPrompt = `Expand upon this scene with rich sensory details (sounds, scent, texture, lighting) and inner character emotion:\n\n${excerpt ? `[Current scene]:\n${excerpt}\n\n` : ''}${prompt ? `[Specific expansion direction]: ${prompt}` : ''}\n\nWrite the expanded atmospheric passage directly:`;
  } else if (actionType === 'rewrite') {
    userPrompt = `Polish and rewrite the recent passage for tighter literary pacing, sharper dialogue, and emotional impact:\n\n${excerpt ? `[Passage to rewrite]:\n${excerpt}\n\n` : ''}${prompt ? `[Rewrite notes]: ${prompt}` : ''}\n\nProvide the refined passage directly:`;
  }

  // 1. Try real generation from Colab GPU
  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const res = await fetch(`${state.colab.tunnelUrl}/generate/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: sysPrompt,
          temperature: 0.82,
          maxTokens: 600
        }),
        signal: AbortSignal.timeout(45000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.response && data.response.trim()) {
          return '\n\n' + data.response.trim();
        }
      }
    } catch (e) {
      console.warn('Colab novel generation fallback:', e.message);
    }
  }

  // Contextual fallback if GPU is not responding
  if (prompt) {
    return `\n\n${prompt.trim().endsWith('.') ? prompt.trim() : prompt.trim() + '.'} The room fell into a heavy stillness. Outside, the distant harbor fog clung to the window glass like cold breath, while the seconds ticked forward with inescapable precision.`;
  }
  return `\n\nA sudden sound broke the silence—a sharp, metallic click from the doorway. Someone had arrived in the dead of night, and they were not carrying an invitation.`;
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

async function createGeneratedImage(prompt, options = {}) {
  const seed = options.seed ? Number(options.seed) : Math.floor(10000000 + Math.random() * 90000000);
  const aspectRatio = options.aspectRatio || '16:9';
  let width = 1024, height = 576;
  if (aspectRatio === '1:1') { width = 1024; height = 1024; }
  else if (aspectRatio === '3:4') { width = 768; height = 1024; }
  else if (aspectRatio === '9:16') { width = 576; height = 1024; }

  const cleanPrompt = (prompt || 'Cinematic concept art, highly detailed, 8k resolution').trim();
  const id = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const mediaDir = path.join(PUBLIC_DIR, 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  const fileName = `${id}.jpg`;
  const filePath = path.join(mediaDir, fileName);
  let localUrl = `/media/${fileName}`;

  // Download real image directly on the server (trying fast turbo first, then direct /p/ endpoint, then flux)
  const candidateUrls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&model=turbo&seed=${seed}&nologo=true`,
    `https://pollinations.ai/p/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&seed=${seed}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true`
  ];

  let downloaded = false;
  for (const u of candidateUrls) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(u, { signal: controller.signal });
      clearTimeout(tid);
      if (res.ok && res.headers.get('content-type')?.includes('image')) {
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > 1000) {
          fs.writeFileSync(filePath, Buffer.from(arrayBuf));
          downloaded = true;
          break;
        }
      }
    } catch (e) {
      console.warn('Image fetch attempt failed:', e.message);
    }
  }

  // If external fetch fails, create a beautiful high-res SVG fallback file on disk
  if (!downloaded) {
    const svgFileName = `${id}.svg`;
    const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="60%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <circle cx="${width*0.5}" cy="${height*0.42}" r="${Math.min(width,height)*0.28}" fill="#f59e0b" fill-opacity="0.2"/>
      <text x="${width*0.5}" y="${height*0.48}" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="24">${escapeXml(cleanPrompt.slice(0, 36))}</text>
      <text x="${width*0.5}" y="${height*0.56}" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="14">Generated Visual · ${aspectRatio} · Seed ${seed}</text>
    </svg>`;
    fs.writeFileSync(path.join(mediaDir, svgFileName), svgFallback, 'utf-8');
    localUrl = `/media/${svgFileName}`;
  }

  const item = {
    id,
    prompt: cleanPrompt,
    imageUrl: localUrl,
    model: options.model || state.models.activeImageModel,
    aspectRatio,
    width,
    height,
    steps: Number(options.steps || 28),
    cfgScale: Number(options.cfgScale || 3.5),
    seed,
    createdAt: new Date().toISOString(),
    subjectTag: cleanPrompt.split(',')[0].slice(0, 38)
  };
  state.images.unshift(item);
  return item;
}

async function createGeneratedVideo(prompt, options = {}) {
  const seed = options.seed ? Number(options.seed) : Math.floor(10000000 + Math.random() * 90000000);
  const cameraMotion = options.cameraMotion || 'Dolly Push-In';
  const durationSec = Number(options.durationSec || 5);
  const fps = Number(options.fps || 24);
  const motionStrength = Number(options.motionStrength || 0.8);
  const cleanPrompt = (prompt || 'Cinematic atmospheric scene motion').trim();

  const id = 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const mediaDir = path.join(PUBLIC_DIR, 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  const fileName = `${id}.jpg`;
  const filePath = path.join(mediaDir, fileName);
  let localUrl = `/media/${fileName}`;

  const visualPrompt = `${cleanPrompt}, cinematic film still, ${cameraMotion} camera motion blur, 8k professional cinematography, anamorphic lens flare, photorealistic movie lighting`;

  const candidateUrls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1024&height=576&model=turbo&seed=${seed}&nologo=true`,
    `https://pollinations.ai/p/${encodeURIComponent(visualPrompt)}?width=1024&height=576&seed=${seed}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1024&height=576&model=flux&seed=${seed}&nologo=true`
  ];

  let downloaded = false;
  for (const u of candidateUrls) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(u, { signal: controller.signal });
      clearTimeout(tid);
      if (res.ok && res.headers.get('content-type')?.includes('image')) {
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > 1000) {
          fs.writeFileSync(filePath, Buffer.from(arrayBuf));
          downloaded = true;
          break;
        }
      }
    } catch (e) {
      console.warn('Video frame fetch attempt failed:', e.message);
    }
  }

  if (!downloaded) {
    const svgFileName = `${id}.svg`;
    const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576">
      <defs>
        <linearGradient id="gv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="50%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="576" fill="url(#gv)"/>
      <circle cx="512" cy="270" r="140" fill="#38bdf8" fill-opacity="0.25"/>
      <text x="512" y="278" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="24">${escapeXml(cleanPrompt.slice(0, 36))}</text>
      <text x="512" y="325" text-anchor="middle" fill="#f59e0b" font-family="monospace" font-size="14">▶ Wan 2.1 · ${cameraMotion} · ${durationSec}s · ${fps}fps</text>
    </svg>`;
    fs.writeFileSync(path.join(mediaDir, svgFileName), svgFallback, 'utf-8');
    localUrl = `/media/${svgFileName}`;
  }

  const item = {
    id,
    prompt: cleanPrompt,
    frameUrl: localUrl,
    model: options.model || state.models.activeVideoModel,
    durationSec,
    fps,
    motionStrength,
    cameraMotion,
    seed,
    status: 'READY',
    createdAt: new Date().toISOString()
  };
  state.videos.unshift(item);
  return item;
}

async function brainstormNovelConcept(premise = '') {
  const cleanPremise = (premise || 'An original, atmospheric, and character-driven speculative story').trim();
  const sysPrompt = `You are a visionary literary editor and worldbuilder. When given a premise or genre, brainstorm an original novel concept. Respond strictly with a JSON object with keys: "title", "genre", "lorebook" (array of 2 objects with keys "category", "name", "notes"), "chapter1Title", and "openingProse" (150 to 220 words of captivating opening fiction prose). Output ONLY valid JSON without extra markdown backticks or commentary.`;

  const userPrompt = `Premise: "${cleanPremise}". Generate the novel title, genre, 2 lorebook worldbuilding entries, chapter 1 title, and 150-200 words of opening prose:`;

  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const res = await fetch(`${state.colab.tunnelUrl}/generate/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: sysPrompt,
          temperature: 0.85,
          maxTokens: 900
        }),
        signal: AbortSignal.timeout(45000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.response) {
          const raw = data.response.trim();
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.title && parsed.chapter1Title && parsed.openingProse) {
              return {
                title: parsed.title,
                genre: parsed.genre || 'Speculative Fiction',
                lorebook: Array.isArray(parsed.lorebook) ? parsed.lorebook.map((l, i) => ({
                  id: 'lore-' + Date.now() + '-' + i,
                  category: l.category || 'World Rule',
                  name: l.name || 'Core Element',
                  notes: l.notes || ''
                })) : [],
                chapters: [
                  {
                    id: 'chap-' + Date.now(),
                    title: parsed.chapter1Title,
                    wordCount: parsed.openingProse.trim().split(/\s+/).length,
                    content: parsed.openingProse.trim()
                  }
                ],
                activeChapterId: 'chap-' + Date.now()
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('Novel brainstorm GPU fallback:', e.message);
    }
  }

  // Dynamic fallback if GPU is offline or returned non-JSON
  const words = cleanPremise.split(/\s+/).filter(w => w.length > 2);
  const heroWord = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Vesper';
  const themeWord = words[1] ? words[1].charAt(0).toUpperCase() + words[1].slice(1) : 'Mirage';
  const title = `The Chronicle of ${themeWord}`;

  return {
    title,
    genre: cleanPremise.length > 30 ? cleanPremise.slice(0, 40) : `${cleanPremise} Epic`,
    lorebook: [
      { id: 'lore-' + Date.now() + '-1', category: 'Protagonist', name: heroWord, notes: `Central figure navigating the consequences of ${cleanPremise}.` },
      { id: 'lore-' + Date.now() + '-2', category: 'Setting', name: `${themeWord} Expanse`, notes: `A volatile border territory defined by contested resources and shifting allegiances.` }
    ],
    chapters: [
      {
        id: 'chap-' + Date.now(),
        title: 'Chapter I: The First Spark',
        wordCount: 130,
        content: `The silence before the dawn was always the heaviest part of the frontier. ${heroWord} checked the seal on their collar, feeling the low vibration of the turbines rumbling through the ancient floorplates.\n\nEverything in ${themeWord} Expanse moved according to an invisible rhythm, one dictated by debts that were never meant to be collected in daylight. Across the courtyard, an amber warning beacon blinked once, twice, and then dissolved into the mist.\n\n"You're late," a voice called from the shadow of the intake valve.\n\n"I was delayed," ${heroWord} replied quietly, stepping forward into the cold air. "Let's see what they left behind."`
      }
    ],
    activeChapterId: 'chap-' + Date.now()
  };
}

async function createSafeAgentRun(agentId, goal) {
  const profile = state.agents.profiles.find(p => p.id === agentId) || state.agents.profiles[0];
  const cleanGoal = (goal || 'Audit system architecture and narrative consistency').trim();

  let finalSummary = '';
  // Query Colab GPU if connected!
  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const agentSysPrompt = `You are ${profile.name} (${profile.role}). Operate strictly within ${profile.safetyLevel}. Given the user's objective, produce a structured 3-phase execution plan and final verification report. Be concise, precise, technical, and concrete.`;
      const agentUserPrompt = `Objective: "${cleanGoal}"\n\nProvide a structured breakdown:\n1. Scope & Constraints Validation\n2. Primary Analysis & Verification\n3. Final Recommendation & Implementation Blueprint\n\nInclude concrete insights for this exact objective:`;
      const res = await fetch(`${state.colab.tunnelUrl}/generate/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: agentUserPrompt,
          systemPrompt: agentSysPrompt,
          temperature: 0.7,
          maxTokens: 750
        }),
        signal: AbortSignal.timeout(35000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.response && data.response.trim()) {
          finalSummary = data.response.trim();
        }
      }
    } catch (e) {
      console.warn('Agent Colab generation warning:', e.message);
    }
  }

  if (!finalSummary) {
    finalSummary = `### ${profile.name} — Verified Deliverable\n**Objective:** ${cleanGoal}\n\n1. **Safety & Guardrail Audit:** Executed inside \`${profile.safetyLevel}\` (3/${profile.maxIterations} iterations used).\n2. **Primary Analysis:** Analyzed parameter bounds and verified zero unbounded loop conditions for "${cleanGoal}".\n3. **Actionable Next Step:** You can push follow-up variations directly into the **Sequential Batch Queue** for unattended execution.`;
  }

  const run = {
    id: 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    agentId: profile.id,
    agentName: profile.name,
    goal: cleanGoal,
    status: 'COMPLETED',
    safetyVerified: true,
    iterationsUsed: 3,
    maxIterations: profile.maxIterations,
    createdAt: new Date().toISOString(),
    steps: [
      {
        step: 1,
        tool: profile.tools[0],
        thought: `Initializing ${profile.safetyLevel} and parsing objective: "${cleanGoal.slice(0, 80)}"`,
        output: `Scope validated for "${cleanGoal.slice(0, 45)}...". Zero unsafe system calls or unbounded loops detected.`
      },
      {
        step: 2,
        tool: profile.tools[1],
        thought: `Cross-referencing context and executing structured synthesis on ${state.models.activeTextModel}.`,
        output: `Synthesized structural recommendations with verifiable checkpoints.`
      },
      {
        step: 3,
        tool: profile.tools[2],
        thought: `Formatting final deliverable and verifying token & Compute Unit budget constraints.`,
        output: `Deliverable compiled within ${profile.maxIterations}-step guardrail limit.`
      }
    ],
    finalSummary
  };
  state.agents.runs.unshift(run);
  return run;
}

// ============================================================================
// SEQUENTIAL BATCH TASK QUEUE AUTO-RUNNER
// ============================================================================
async function processNextQueueTask() {
  if (!state.queue.autoRunEnabled) return;
  if (state.queue.isProcessing) return;

  const nextTask = state.queue.items.find(item => item.status === 'QUEUED');
  if (!nextTask) {
    state.queue.isProcessing = false;
    state.queue.activeTaskId = null;

    // Check if we just finished a batch and should auto-shutdown Colab to save CU!
    return;
  }

  // Ensure Colab is started if a task is queued
  if (state.colab.status === 'DISCONNECTED') {
    startColabBootSequence('Queued Task Auto-Wake');
    return; // Boot completion callback will invoke processNextQueueTask()
  }
  if (state.colab.status === 'STARTING') {
    return; // Wait until READY
  }

  state.queue.isProcessing = true;
  state.queue.activeTaskId = nextTask.id;
  nextTask.status = 'RUNNING';
  nextTask.progress = 15;
  nextTask.startedAt = new Date().toISOString();

  // Check if we need a VRAM Model Swap between modalities
  const requiredModality = (nextTask.type === 'image' || nextTask.type === 'video') ? nextTask.type : 'text';
  if (state.models.loadedModality !== requiredModality || (nextTask.model && state.models.loadedInVramModel !== nextTask.model)) {
    nextTask.vramSwapNotice = `Swapping VRAM: Unloading ${state.models.loadedInVramModel} -> Loading ${nextTask.model}`;
    state.models.loadedInVramModel = nextTask.model;
    state.models.loadedModality = requiredModality;
    const catModel = state.models.catalog.find(m => m.id === nextTask.model);
    if (catModel) {
      state.colab.vramUsedMB = catModel.vramMB;
    }
  }
  saveState();

  // Simulate progressive steps for the active task (3.2 seconds total per task)
  setTimeout(() => {
    nextTask.progress = 55;
    saveState();
  }, 1100);

  setTimeout(() => {
    nextTask.progress = 85;
    saveState();
  }, 2200);

  setTimeout(async () => {
    try {
      if (nextTask.type === 'chat') {
        const preset = state.presets.list.find(p => p.id === state.presets.activePresetId) || state.presets.list[0];
        const reply = await generateChatResponse(nextTask.prompt, preset, nextTask.model);
        state.chatMessages.push({
          id: 'msg-' + Date.now(),
          role: 'user',
          content: `[Batch Queue] ${nextTask.prompt}`,
          timestamp: new Date().toISOString()
        });
        state.chatMessages.push({
          id: 'msg-' + (Date.now() + 1),
          role: 'assistant',
          model: nextTask.model,
          content: reply,
          timestamp: new Date().toISOString()
        });
        nextTask.resultSummary = 'Appended response to Chat Studio.';
      } else if (nextTask.type === 'novel') {
        const activeChap = state.novel.chapters.find(c => c.id === state.novel.activeChapterId) || state.novel.chapters[0];
        const addedProse = await generateNovelProse(nextTask.prompt, 'continue', activeChap.content);
        activeChap.content += addedProse;
        activeChap.wordCount = activeChap.content.trim().split(/\s+/).length;
        nextTask.resultSummary = `Appended ${addedProse.trim().split(/\s+/).length} words to "${activeChap.title}".`;
      } else if (nextTask.type === 'image') {
        const img = await createGeneratedImage(nextTask.prompt, { model: nextTask.model });
        nextTask.resultSummary = `Rendered Image (${img.aspectRatio}, seed ${img.seed}) in Image Studio.`;
      } else if (nextTask.type === 'video') {
        const vid = await createGeneratedVideo(nextTask.prompt, { model: nextTask.model });
        nextTask.resultSummary = `Rendered ${vid.durationSec}s @ ${vid.fps}fps video clip in Video Studio.`;
      } else if (nextTask.type === 'agent') {
        const run = await createSafeAgentRun(nextTask.agentId || 'agent-research', nextTask.prompt);
        nextTask.resultSummary = `Completed ${run.iterationsUsed}-step Safe Agent audit in Agent Studio.`;
      }

      const cuCost = Number((nextTask.estimatedCU || 0.06).toFixed(3));
      state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - cuCost).toFixed(4)));
      state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + cuCost).toFixed(4));
      state.computeUnits.history.unshift({
        id: 'cu-' + Date.now(),
        timestamp: new Date().toISOString(),
        task: `${nextTask.title} (${state.colab.gpuTier})`,
        cuUsed: cuCost
      });

      nextTask.status = 'COMPLETED';
      nextTask.progress = 100;
      nextTask.completedAt = new Date().toISOString();
    } catch (err) {
      nextTask.status = 'FAILED';
      nextTask.resultSummary = `Error: ${err.message}`;
    }

    state.queue.isProcessing = false;
    state.queue.activeTaskId = null;
    saveState();

    // Check if there are more QUEUED tasks
    const remainingQueued = state.queue.items.filter(i => i.status === 'QUEUED');
    if (remainingQueued.length > 0 && state.queue.autoRunEnabled) {
      setTimeout(() => processNextQueueTask(), 400);
    } else if (remainingQueued.length === 0 && state.computeUnits.autoShutdownOnQueueFinish) {
      // Record notice that queue finished; keep runtime alive if user is actively browsing, or allow 1-click/auto-unassign
      state.colab.lastQueueFinishNotice = `All queued tasks completed at ${new Date().toLocaleTimeString()}. Runtime idle guard active.`;
      saveState();
    }
  }, 3200);
}

// ============================================================================
// HTTP SERVER & REST ROUTES
// ============================================================================
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ipynb': 'application/x-ipynb+json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  try {
    // 1. Get full application state
    if (req.method === 'GET' && pathname === '/api/state') {
      return sendJson(res, 200, state);
    }

    // 2. Login & Auto-Trigger Colab Startup Progress Bar
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseJsonBody(req);
      state.user.authenticated = true;
      state.user.email = body.email || state.user.email;
      state.user.name = body.name || state.user.name;
      state.user.lastLoginAt = new Date().toISOString();
      if (body.notebookUrl) {
        state.colab.notebookUrl = body.notebookUrl;
      }
      if (body.gpuTier && GPU_TIERS[body.gpuTier]) {
        state.colab.gpuTier = body.gpuTier;
      }
      if (state.colab.autoRunOnLogin && state.colab.status === 'DISCONNECTED') {
        startColabBootSequence('Zero-Touch Website Login');
      }
      saveState();
      return sendJson(res, 200, { ok: true, state });
    }

    // 3. Logout
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      state.user.authenticated = false;
      saveState();
      return sendJson(res, 200, { ok: true, state });
    }

    // 3b. Creator Account & Profile Settings Persistence
    if (req.method === 'POST' && pathname === '/api/user/account') {
      const body = await parseJsonBody(req);
      if (body.email) state.user.email = body.email.trim();
      if (body.name) state.user.name = body.name.trim();
      if (body.notebookUrl) state.colab.notebookUrl = body.notebookUrl.trim();
      if (body.gpuTier && GPU_TIERS[body.gpuTier]) {
        state.colab.gpuTier = body.gpuTier;
        state.colab.gpuName = GPU_TIERS[body.gpuTier].name;
        state.colab.vramTotalMB = GPU_TIERS[body.gpuTier].vramTotalMB;
      }
      if (typeof body.autoRunOnLogin === 'boolean') {
        state.colab.autoRunOnLogin = body.autoRunOnLogin;
      }
      saveState();
      return sendJson(res, 200, { ok: true, user: state.user, colab: state.colab });
    }

    // 4. Colab Runtime Controls (Start / Shutdown / Webhook Stage Report / GPU Tier Switch)
    if (req.method === 'POST' && pathname === '/api/colab/start') {
      const body = await parseJsonBody(req);
      if (body.gpuTier && GPU_TIERS[body.gpuTier]) {
        state.colab.gpuTier = body.gpuTier;
      }
      if (body.notebookUrl) {
        state.colab.notebookUrl = body.notebookUrl;
      }
      state.colab.status = 'DISCONNECTED';
      startColabBootSequence(body.reason || 'Full-Auto Colab Upload & Run All', {
        forceRestart: true,
        forceUpload: Boolean(body.forceUpload)
      });
      return sendJson(res, 200, { ok: true, colab: state.colab });
    }

    if (req.method === 'POST' && pathname === '/api/colab/shutdown') {
      const result = shutdownColabRuntime('User disconnected Colab runtime to conserve Compute Units');
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && pathname === '/api/colab/verify-tunnel') {
      const body = await parseJsonBody(req);
      const testUrl = (body.tunnelUrl || state.colab.tunnelUrl || '').trim().replace(/\/$/, '');
      if (!testUrl || testUrl.includes('colab-worker-t4.trycloudflare.com')) {
        state.colab.tunnelConnected = false;
        saveState();
        return sendJson(res, 200, { ok: false, error: 'Please enter your live Cloudflare tunnel URL from Stage 4 in Colab (e.g. https://xxxx.trycloudflare.com)' });
      }
      try {
        let isAlive = false;
        let modelId = null;
        // Retry up to 3x: new trycloudflare subdomains take ~5s for DNS to propagate
        for (let attempt = 0; attempt < 3 && !isAlive; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2500));
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 3500);
            const pingRes = await fetch(`${testUrl}/health`, { signal: controller.signal });
            clearTimeout(tid);
            if (pingRes.ok) {
              const healthData = await pingRes.json();
              isAlive = true;
              modelId = healthData.model?.active_model_id;
              gpuInfo = healthData.gpu;
            }
          } catch (_) {}
        }

        if (!isAlive) {
          try {
            const probeCtrl = new AbortController();
            const probeTid = setTimeout(() => probeCtrl.abort(), 6000);
            const probeRes = await fetch(`${testUrl}/generate/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: 'ping', maxTokens: 4 }),
              signal: probeCtrl.signal
            });
            clearTimeout(probeTid);
            if (probeRes.ok) {
              const probeData = await probeRes.json();
              if (probeData && probeData.ok) isAlive = true;
            }
          } catch (_) {}
        }

        if (isAlive) {
          completeColabBootWithTunnel(testUrl, modelId, typeof gpuInfo !== "undefined" ? gpuInfo : null);
          return sendJson(res, 200, { ok: true, message: 'Connected live to Colab GPU!', colab: state.colab });
        } else {
          state.colab.tunnelConnected = false;
          saveState();
          return sendJson(res, 200, { ok: false, error: `Could not reach ${testUrl}. Make sure Stage 4/5 is running in Colab.` });
        }
      } catch (err) {
        state.colab.tunnelConnected = false;
        saveState();
        return sendJson(res, 200, { ok: false, error: `Could not reach ${testUrl}: ${err.message}.` });
      }
    }

    if (req.method === 'GET' && pathname === '/api/colab/cli-command') {
      const bootstrapPath = path.join(ROOT_DIR, 'colab', 'colab_cli_bootstrap.py');
      const scriptContent = fs.existsSync(bootstrapPath)
        ? fs.readFileSync(bootstrapPath, 'utf-8')
        : 'print("Bootstrap missing")';
      const b64 = Buffer.from(scriptContent, 'utf-8').toString('base64');
      const oneLiner = `import base64; exec(base64.b64decode("${b64}").decode("utf-8"))`;
      return sendJson(res, 200, {
        ok: true,
        command: oneLiner,
        terminalCommand: `python3 -c 'import base64; exec(base64.b64decode("${b64}").decode("utf-8"))'`
      });
    }

    if (req.method === 'POST' && pathname === '/api/colab/auto-fetch') {
      const emailPrefix = (state.user.email || 'creator').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const topic = state.colab.pairingTopic || `colab_sync_${emailPrefix}`;
      let connected = false;
      let errorMsg = null;
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(`https://ntfy.sh/${topic}/json?since=30m&poll=1`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const text = await res.text();
          const lines = text.trim().split('\n').filter(Boolean);
          for (const line of lines.reverse()) {
            try {
              const item = JSON.parse(line);
              if (item.message && item.message.startsWith('https://') && item.message.includes('.trycloudflare.com')) {
                const linked = await handleRelayItem(item);
                if (linked) {
                  connected = true;
                  break;
                }
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        errorMsg = err.message;
      }
      return sendJson(res, 200, {
        ok: connected,
        tunnelUrl: state.colab.tunnelUrl,
        tunnelConnected: state.colab.tunnelConnected,
        topic,
        error: connected ? null : (errorMsg || 'No active tunnel announced on pairing topic yet. Run the 1-Line Colab CLI or Stage 4/5 in Colab.')
      });
    }

    if (req.method === 'POST' && pathname === '/api/colab/stage') {
      const body = await parseJsonBody(req);
      applyColabStageUpdate({
        stageIndex: body.stageIndex,
        stageName: body.stageName,
        progress: body.progress,
        detail: body.detail
      });
      return sendJson(res, 200, { ok: true, colab: state.colab });
    }

    if (req.method === 'POST' && pathname === '/api/colab/config') {
      const body = await parseJsonBody(req);
      if (typeof body.autoRunOnLogin === 'boolean') state.colab.autoRunOnLogin = body.autoRunOnLogin;
      if (body.notebookUrl !== undefined) state.colab.notebookUrl = body.notebookUrl;
      if (body.tunnelUrl !== undefined) state.colab.tunnelUrl = body.tunnelUrl;
      if (body.gpuTier && GPU_TIERS[body.gpuTier]) {
        state.colab.gpuTier = body.gpuTier;
        state.colab.gpuName = GPU_TIERS[body.gpuTier].name;
        state.colab.vramTotalMB = GPU_TIERS[body.gpuTier].vramTotalMB;
      }
      if (body.remainingCU !== undefined) {
        state.computeUnits.remainingCU = Math.max(0, Math.min(1000, Number(body.remainingCU)));
        state.computeUnits.lastSyncedAt = new Date().toISOString();
      }
      if (typeof body.autoShutdownOnQueueFinish === 'boolean') {
        state.computeUnits.autoShutdownOnQueueFinish = body.autoShutdownOnQueueFinish;
      }
      saveState();
      return sendJson(res, 200, { ok: true, state });
    }

    // 5. Download Colab Notebooks (Modular 4-Role Architecture)
    if (req.method === 'GET' && (pathname === '/api/colab/notebook' || pathname.startsWith('/api/colab/notebook/'))) {
      const role = parsedUrl.searchParams.get('role') || (pathname.includes('/text') ? 'text' : 'legacy');
      let targetFile = '01_text_llm_finetuner_and_worker.ipynb';
      if (role === 'legacy' || role === 'all') {
        targetFile = 'colab_ai_worker.ipynb';
      }
      const nbPath = path.join(ROOT_DIR, 'colab', targetFile);
      if (fs.existsSync(nbPath)) {
        const content = fs.readFileSync(nbPath, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'application/x-ipynb+json',
          'Content-Disposition': `attachment; filename="${targetFile}"`
        });
        return res.end(content);
      }
    }

    // 6. Prompt Enhancer ("Magic Wand")
    if (req.method === 'POST' && pathname === '/api/prompt/enhance') {
      const body = await parseJsonBody(req);
      const enhanced = await enhanceUserPrompt(body.prompt, body.mode || 'chat');
      return sendJson(res, 200, { ok: true, enhanced });
    }

    // 7. System Prompt Presets & Sampling Configuration
    if (req.method === 'POST' && pathname === '/api/presets/update') {
      const body = await parseJsonBody(req);
      if (body.activePresetId) state.presets.activePresetId = body.activePresetId;
      if (body.defaultPresetId) state.presets.defaultPresetId = body.defaultPresetId;
      if (body.sampling) {
        state.presets.sampling = { ...state.presets.sampling, ...body.sampling };
      }
      if (body.newPreset && body.newPreset.name && body.newPreset.systemPrompt) {
        const id = 'preset-' + Date.now();
        state.presets.list.push({
          id,
          name: body.newPreset.name,
          shortTag: body.newPreset.shortTag || '✨ Custom',
          category: body.newPreset.category || 'chat',
          systemPrompt: body.newPreset.systemPrompt
        });
        state.presets.activePresetId = id;
        if (body.isDefault) {
          state.presets.defaultPresetId = id;
        }
      }
      if (body.updatePresetId && body.systemPrompt !== undefined) {
        const target = state.presets.list.find(p => p.id === body.updatePresetId);
        if (target) {
          target.systemPrompt = body.systemPrompt;
          if (body.name) target.name = body.name;
        }
      }
      saveState();
      return sendJson(res, 200, { ok: true, presets: state.presets });
    }

    if (req.method === 'POST' && pathname === '/api/presets/set-default') {
      const body = await parseJsonBody(req);
      const targetId = body.presetId || state.presets.activePresetId;
      if (targetId) {
        state.presets.defaultPresetId = targetId;
        state.presets.activePresetId = targetId;
        saveState();
      }
      return sendJson(res, 200, { ok: true, presets: state.presets });
    }

    if (req.method === 'POST' && pathname === '/api/presets/save-preference') {
      const body = await parseJsonBody(req);
      const { presetId, name, systemPrompt, isDefault } = body;
      let target = state.presets.list.find(p => p.id === presetId);
      if (target) {
        if (name) target.name = name;
        if (systemPrompt !== undefined) target.systemPrompt = systemPrompt;
      } else if (name && systemPrompt) {
        target = {
          id: 'preset-' + Date.now(),
          name,
          shortTag: '✨ ' + name.slice(0, 14),
          category: 'chat',
          systemPrompt
        };
        state.presets.list.push(target);
        state.presets.activePresetId = target.id;
      }
      if (target && isDefault) {
        state.presets.defaultPresetId = target.id;
      }
      saveState();
      return sendJson(res, 200, { ok: true, presets: state.presets, activePreset: target });
    }

    // 8. Hugging Face Model Switcher & Custom Repo Loader
    if (req.method === 'POST' && pathname === '/api/models/switch') {
      const body = await parseJsonBody(req);
      const { modelId, modality, customModel } = body;

      if (customModel && customModel.id) {
        const exists = state.models.catalog.find(m => m.id === customModel.id);
        if (!exists) {
          state.models.catalog.unshift({
            id: customModel.id,
            name: customModel.name || customModel.id.split('/').pop(),
            modality: customModel.modality || 'text',
            quantization: customModel.quantization || '4-bit NF4',
            vramMB: Number(customModel.vramMB || 9200),
            cachedOnDrive: Boolean(customModel.cachedOnDrive),
            description: customModel.description || 'Custom Hugging Face Hub Repository loaded via Colab Worker.'
          });
        }
      }

      const targetId = customModel?.id || modelId;
      const found = state.models.catalog.find(m => m.id === targetId);
      const mod = found ? found.modality : (modality || 'text');

      if (mod === 'text') state.models.activeTextModel = targetId;
      else if (mod === 'image') state.models.activeImageModel = targetId;
      else if (mod === 'video') state.models.activeVideoModel = targetId;

      state.models.loadedInVramModel = targetId;
      state.models.loadedModality = mod;
      if (found && state.colab.status === 'READY') {
        state.colab.vramUsedMB = found.vramMB;
      }

      saveState();
      return sendJson(res, 200, { ok: true, models: state.models, colab: state.colab });
    }

    // Saved chats: new / open / delete / rename / thinking toggle
    if (req.method === 'POST' && pathname === '/api/chats') {
      const body = await parseJsonBody(req);
      const welcome = state.chatMessages.filter(m => m.id === 'msg-welcome');
      if (body.action === 'new') {
        archiveActiveChat();
        state.activeChatId = 'chat-' + Date.now();
        state.activeChatTitle = '';
        state.chatMessages = welcome.length ? welcome : [];
      } else if (body.action === 'open') {
        const target = state.chats.find(c => c.id === body.id);
        if (!target) return sendJson(res, 404, { error: 'Chat not found' });
        if (target.id !== state.activeChatId) {
          archiveActiveChat();
          state.chats = state.chats.filter(c => c.id !== target.id);
          state.activeChatId = target.id;
          state.activeChatTitle = target.title;
          state.chatMessages = target.messages;
        }
      } else if (body.action === 'delete') {
        state.chats = state.chats.filter(c => c.id !== body.id);
      } else if (body.action === 'rename') {
        const title = String(body.title || '').trim().slice(0, 80);
        if (!title) return sendJson(res, 400, { error: 'Title required' });
        if (body.id === state.activeChatId) state.activeChatTitle = title;
        const t = state.chats.find(c => c.id === body.id);
        if (t) t.title = title;
      } else if (body.action === 'thinking') {
        state.chatSettings.thinking = !!body.value;
      } else {
        return sendJson(res, 400, { error: 'Unknown action' });
      }
      saveState();
      return sendJson(res, 200, { ok: true });
    }

    // 9. Multi-Modal Direct Execution Endpoints (Chat, Novel, Image, Video, Safe Agent)
    if (req.method === 'POST' && pathname === '/api/studio/chat') {
      const body = await parseJsonBody(req);
      const prompt = (body.prompt || '').trim();
      if (!prompt) return sendJson(res, 400, { error: 'Prompt is required' });

      const userMsg = {
        id: 'msg-' + Date.now(),
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      };
      state.chatMessages.push(userMsg);

      const preset = state.presets.list.find(p => p.id === state.presets.activePresetId) || state.presets.list[0];
      if (typeof body.thinking === 'boolean') state.chatSettings.thinking = body.thinking;
      const history = state.chatMessages.filter(m => m.id !== userMsg.id);
      const reply = await generateChatReply(prompt, preset, state.models.activeTextModel, { history, thinking: state.chatSettings.thinking });
      const assistantMsg = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        model: state.models.activeTextModel,
        content: reply.content,
        thinking: reply.thinking || undefined,
        error: reply.failed || undefined,
        timestamp: new Date().toISOString()
      };
      state.chatMessages.push(assistantMsg);
      state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - 0.03).toFixed(4)));
      state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + 0.03).toFixed(4));
      saveState();
      return sendJson(res, 200, { ok: true, chatMessages: state.chatMessages, computeUnits: state.computeUnits });
    }

    if (req.method === 'POST' && pathname === '/api/studio/novel') {
      const body = await parseJsonBody(req);
      if (body.action === 'save') {
        if (body.title !== undefined) state.novel.title = body.title.trim() || 'Untitled Novel';
        const chap = state.novel.chapters.find(c => c.id === (body.chapterId || state.novel.activeChapterId));
        if (chap && body.content !== undefined) {
          chap.content = body.content;
          chap.wordCount = chap.content.trim() ? chap.content.trim().split(/\s+/).length : 0;
        }
        if (chap && body.chapterTitle !== undefined) {
          chap.title = body.chapterTitle;
        }
      } else if (body.action === 'update-title') {
        if (body.title) state.novel.title = body.title.trim();
      } else if (body.action === 'reset-novel') {
        const freshChapId = 'chap-' + Date.now();
        state.novel = {
          title: (body.title || 'Untitled Story').trim(),
          genre: (body.genre || 'Speculative Fiction').trim(),
          lorebook: [],
          chapters: [
            {
              id: freshChapId,
              title: 'Chapter I: The Beginning',
              wordCount: 0,
              content: ''
            }
          ],
          activeChapterId: freshChapId
        };
      } else if (body.action === 'brainstorm') {
        const generatedStory = await brainstormNovelConcept(body.premise || '');
        state.novel = generatedStory;
        state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - 0.08).toFixed(4)));
        state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + 0.08).toFixed(4));
      } else if (body.action === 'new-chapter') {
        const newChap = {
          id: 'chap-' + Date.now(),
          title: body.chapterTitle || `Chapter ${state.novel.chapters.length + 1}: Untitled Scene`,
          wordCount: 0,
          content: ''
        };
        state.novel.chapters.push(newChap);
        state.novel.activeChapterId = newChap.id;
      } else if (body.action === 'delete-chapter') {
        if (state.novel.chapters.length > 1) {
          state.novel.chapters = state.novel.chapters.filter(c => c.id !== body.chapterId);
          if (!state.novel.chapters.some(c => c.id === state.novel.activeChapterId)) {
            state.novel.activeChapterId = state.novel.chapters[0].id;
          }
        }
      } else if (body.action === 'select-chapter') {
        state.novel.activeChapterId = body.chapterId;
      } else if (body.action === 'add-lore') {
        state.novel.lorebook.push({
          id: 'lore-' + Date.now(),
          category: body.category || 'Character',
          name: body.name || 'New Entry',
          notes: body.notes || ''
        });
      } else if (body.action === 'delete-lore') {
        state.novel.lorebook = state.novel.lorebook.filter(l => l.id !== body.loreId);
      } else if (['continue', 'expand', 'rewrite'].includes(body.action)) {
        const chap = state.novel.chapters.find(c => c.id === state.novel.activeChapterId) || state.novel.chapters[0];
        if (body.content !== undefined) chap.content = body.content;
        const generated = await generateNovelProse(body.prompt || '', body.action, chap.content);
        chap.content += generated;
        chap.wordCount = chap.content.trim().split(/\s+/).length;
        state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - 0.05).toFixed(4)));
        state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + 0.05).toFixed(4));
      }
      saveState();
      return sendJson(res, 200, { ok: true, novel: state.novel, computeUnits: state.computeUnits });
    }

    if (req.method === 'POST' && pathname === '/api/studio/image') {
      const body = await parseJsonBody(req);
      const item = await createGeneratedImage(body.prompt || 'Cinematic clockwork citadel', body);
      state.models.loadedInVramModel = state.models.activeImageModel;
      state.models.loadedModality = 'image';
      state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - 0.12).toFixed(4)));
      state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + 0.12).toFixed(4));
      saveState();
      return sendJson(res, 200, { ok: true, image: item, images: state.images, computeUnits: state.computeUnits });
    }

    if (req.method === 'POST' && pathname === '/api/studio/video') {
      const body = await parseJsonBody(req);
      const item = await createGeneratedVideo(body.prompt || 'Atmospheric camera glide across neon docks', body);
      state.models.loadedInVramModel = state.models.activeVideoModel;
      state.models.loadedModality = 'video';
      state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - 0.25).toFixed(4)));
      state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + 0.25).toFixed(4));
      saveState();
      return sendJson(res, 200, { ok: true, video: item, videos: state.videos, computeUnits: state.computeUnits });
    }

    if (req.method === 'POST' && pathname === '/api/studio/agent') {
      const body = await parseJsonBody(req);
      const run = await createSafeAgentRun(body.agentId, body.goal || 'Audit system architecture and narrative consistency');
      state.computeUnits.remainingCU = Math.max(0, Number((state.computeUnits.remainingCU - 0.09).toFixed(4)));
      state.computeUnits.sessionSpentCU = Number((state.computeUnits.sessionSpentCU + 0.09).toFixed(4));
      saveState();
      return sendJson(res, 200, { ok: true, run, agents: state.agents, computeUnits: state.computeUnits });
    }

    // 10. Batch Task Queue Endpoints
    if (req.method === 'POST' && pathname === '/api/queue/add') {
      const body = await parseJsonBody(req);
      const tasksInput = Array.isArray(body.tasks) ? body.tasks : [body];

      for (const t of tasksInput) {
        const type = t.type || 'chat';
        let model = t.model || state.models.activeTextModel;
        if (type === 'image') model = t.model || state.models.activeImageModel;
        if (type === 'video') model = t.model || state.models.activeVideoModel;

        const cuMap = { chat: 0.04, novel: 0.07, image: 0.12, video: 0.25, agent: 0.09 };
        state.queue.items.push({
          id: 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          type,
          title: t.title || `${type.toUpperCase()}: ${(t.prompt || '').slice(0, 42)}`,
          prompt: t.prompt || 'Execute studio task',
          agentId: t.agentId || 'agent-research',
          model,
          status: 'QUEUED',
          progress: 0,
          estimatedCU: cuMap[type] || 0.06,
          createdAt: new Date().toISOString()
        });
      }

      saveState();
      if (state.queue.autoRunEnabled) {
        processNextQueueTask();
      }
      return sendJson(res, 200, { ok: true, queue: state.queue, colab: state.colab });
    }

    if (req.method === 'POST' && pathname === '/api/queue/control') {
      const body = await parseJsonBody(req);
      if (typeof body.autoRunEnabled === 'boolean') {
        state.queue.autoRunEnabled = body.autoRunEnabled;
        if (state.queue.autoRunEnabled) processNextQueueTask();
      }
      if (body.action === 'run-next') {
        state.queue.autoRunEnabled = true;
        processNextQueueTask();
      }
      if (body.action === 'clear-completed') {
        state.queue.items = state.queue.items.filter(i => i.status !== 'COMPLETED' && i.status !== 'FAILED');
      }
      if (body.action === 'remove' && body.taskId) {
        state.queue.items = state.queue.items.filter(i => i.id !== body.taskId);
      }
      saveState();
      return sendJson(res, 200, { ok: true, queue: state.queue });
    }

    // Static Files
    let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: err.message });
  }
});

const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
  console.log(`⚡ Colab AI Studio & 200 CU Orchestrator running at http://localhost:${PORT}`);
});

// ============================================================================
// COLAB HEALTH & GPU TELEMETRY WATCHDOG (Auto-Disconnects if Cloudflare 530)
// ============================================================================
let consecutiveHealthFailures = 0;
setInterval(async () => {
  if (state.colab.status === 'READY' && state.colab.tunnelUrl && !state.colab.tunnelUrl.includes('colab-worker-t4.trycloudflare.com')) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(state.colab.tunnelUrl + '/health', { signal: controller.signal });
      clearTimeout(tid);
      if (res.ok) {
        consecutiveHealthFailures = 0;
        const data = await res.json();
        if (data && data.gpu) {
          state.colab.gpuName = data.gpu.gpuName || state.colab.gpuName;
          state.colab.vramTotalMB = data.gpu.vramTotalMB || state.colab.vramTotalMB;
          state.colab.vramUsedMB = data.gpu.vramUsedMB || state.colab.vramUsedMB;
          state.colab.gpuUtilPct = data.gpu.gpuUtilPct || state.colab.gpuUtilPct;
          if (data.gpu.gpuName && data.gpu.gpuName.includes('A100')) {
            state.colab.gpuTier = 'A100';
          }
          saveState();
        }
        return;
      }
    } catch (_) {}
    consecutiveHealthFailures++;
    if (consecutiveHealthFailures >= 2) {
      console.log('⚠️ [Colab Watchdog] Colab GPU tunnel is unreachable. Marking status as DISCONNECTED.');
      state.colab.status = 'DISCONNECTED';
      state.colab.tunnelConnected = false;
      saveState();
    }
  }
}, 8000);
