/**
 * Full-Auto Colab CLI & CDP Browser Launcher (`colab/auto_launch_colab.mjs`)
 * --------------------------------------------------------------------------
 * Why this works 100% reliably without Google blocking login or file dialogs failing:
 * 1. Copies the 1-Line Colab CLI Bootstrap Command directly to your Windows Clipboard
 *    so you can also paste (`Ctrl+V`) into any open Colab tab at any time.
 * 2. Launches normal Windows `chrome.exe` with `--remote-debugging-port=9222`
 *    (which Google Login treats as a 100% normal human browser, never blocking sign-in)
 *    and attaches via `connectOverCDP('http://127.0.0.1:9222')`.
 * 3. Opens `https://colab.research.google.com/#create=true`, waits until a Colab code
 *    cell is mounted in the DOM, injects `colab/colab_cli_bootstrap.py` directly into
 *    the Monaco code cell (zero file-chooser popups needed!), and executes it (`Shift+Enter`).
 * 4. Streams live progress stages and auto-links the Cloudflare tunnel to `http://localhost:3456`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let isLaunching = false;

async function postToBackend(backendUrl, endpoint, payload) {
  try {
    const res = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function reportStage(backendUrl, stageIndex, stageName, progress, detail) {
  console.log(`📊 [Auto-Colab Stage ${stageIndex} | ${progress}%] ${stageName} — ${detail}`);
  await postToBackend(backendUrl, '/api/colab/stage', {
    stageIndex,
    stageName,
    progress,
    detail
  });
}

function copyToWindowsClipboard(text) {
  try {
    const proc = spawn('clip', [], { stdio: ['pipe', 'ignore', 'ignore'] });
    proc.stdin.write(text, 'utf-8');
    proc.stdin.end();
  } catch (_) {}
}

function getBootstrapPythonCode() {
  const bootstrapPath = path.join(ROOT_DIR, 'colab', 'colab_cli_bootstrap.py');
  if (fs.existsSync(bootstrapPath)) {
    return fs.readFileSync(bootstrapPath, 'utf-8');
  }
  return 'print("Bootstrap file not found")';
}

function getOneLineCliCommand() {
  const code = getBootstrapPythonCode();
  const b64 = Buffer.from(code, 'utf-8').toString('base64');
  return `import base64; exec(base64.b64decode("${b64}").decode("utf-8"))`;
}

function findChromeExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

async function ensureCdpBrowserRunning(userDataDir, port = 9222) {
  // Check if port 9222 is already responding
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return true;
  } catch (_) {}

  const exePath = findChromeExecutable();
  if (!exePath) return false;

  fs.mkdirSync(userDataDir, { recursive: true });
  const child = spawn(exePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://colab.research.google.com/github/lophiuss/colab-ai-studio/blob/main/colab/01_text_llm_finetuner_and_worker.ipynb'
  ], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  // Wait up to 10s for CDP port to listen
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch (_) {}
  }
  return false;
}

export async function launchColabNotebook({
  notebookUrl = '',
  gpuTier = 'T4',
  backendUrl = 'http://localhost:3456',
  userDataDir = path.join(ROOT_DIR, '.colab-chrome-profile')
} = {}) {
  // Always copy the 1-Line Colab CLI command to clipboard immediately!
  const oneLiner = getOneLineCliCommand();
  copyToWindowsClipboard(oneLiner);

  if (isLaunching) {
    return {
      mode: 'already-launching',
      message: 'Full-Auto Colab Browser & CLI Runner is active (1-Line CLI also copied to clipboard).'
    };
  }

  isLaunching = true;

  try {
    await reportStage(
      backendUrl,
      1,
      `Launching Google Colab & Preparing 1-Cell CLI Worker (${gpuTier})`,
      14,
      '1-Line Colab CLI copied to clipboard! Opening Chrome session...'
    );

    const cdpReady = await ensureCdpBrowserRunning(userDataDir, 9222);
    const playwright = await import('playwright-core').catch(() => null);

    if (!cdpReady || !playwright) {
      isLaunching = false;
      return {
        mode: 'cli-clipboard',
        message: '1-Line Colab CLI copied to clipboard! Paste (Ctrl+V) in Google Colab and press Shift+Enter.'
      };
    }

    const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();
    const page = pages.find(p => p.url().includes('colab.research.google.com') || p.url().includes('accounts.google.com'))
      || pages[0]
      || (await context.newPage());

    if (!page.url().includes('colab.research.google.com') && !page.url().includes('accounts.google.com')) {
      await page.goto('https://colab.research.google.com/#create=true', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }).catch(() => {});
    }

    runCdpColabFlow(page, backendUrl).finally(() => {
      isLaunching = false;
    });

    return {
      mode: 'cdp-full-auto',
      gpuTier,
      message: 'Chrome opened via native CDP & 1-Line Colab CLI copied to clipboard!'
    };
  } catch (err) {
    isLaunching = false;
    return {
      mode: 'cli-clipboard',
      error: err.message
    };
  }
}

async function autoClickColabDialogs(page) {
  const selectors = [
    'mwc-button[dialogAction="ok"]',
    'mwc-button[dialogaction="ok"]',
    'paper-button#ok',
    'md-text-button:has-text("Run anyway")',
    'button:has-text("Run anyway")',
    'mwc-button:has-text("Run anyway")',
    'md-filled-button:has-text("Run anyway")',
    'md-text-button:has-text("OK")'
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if ((await btn.count()) > 0 && (await btn.isVisible())) {
        await btn.click({ timeout: 1200 }).catch(() => {});
      }
    } catch (_) {}
  }
}

async function runCdpColabFlow(page, backendUrl) {
  try {
    await page.waitForTimeout(2500);

    // 1. Wait until the user is signed into Google and a Colab code cell is actually mounted!
    let cellReady = false;
    const waitStart = Date.now();

    while (Date.now() - waitStart < 300000) {
      const url = page.url();
      const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');

      // Check if Colab has a code cell mounted in the editor
      const hasCell = await page.evaluate(() => {
        const cells = document.querySelectorAll('.cell, colab-cell, .code, .monaco-editor');
        return cells.length > 0;
      }).catch(() => false);

      // Check if "Sign in" button or accounts.google.com is active
      const needsSignIn = url.includes('accounts.google.com') ||
        bodyText.includes('Sign in to continue') ||
        (await page.locator('a[href*="ServiceLogin"], a:has-text("Sign in")').count().catch(() => 0)) > 0;

      if (hasCell && !needsSignIn) {
        cellReady = true;
        break;
      }

      if (needsSignIn) {
        await reportStage(
          backendUrl,
          1,
          'Waiting for Google Sign-In in Chrome (One-Time Setup)',
          18,
          'Sign into your Google account in the opened Chrome window — or press Ctrl+V & Shift+Enter in any open Colab tab!'
        );
        // If still on colab with a "Sign in" link, click it once to open Google login
        if (!url.includes('accounts.google.com')) {
          const signInLink = page.locator('a[href*="ServiceLogin"], a:has-text("Sign in")').first();
          if ((await signInLink.count()) > 0) {
            await signInLink.click().catch(() => {});
          }
        } else {
          // Pre-fill email if configured via environment variable
          const envEmail = process.env.COLAB_CREATOR_EMAIL || '';
          const emailInput = page.locator('input[type="email"], #identifierId').first();
          if (envEmail && (await emailInput.count()) > 0) {
            const val = await emailInput.inputValue().catch(() => '');
            if (!val) await emailInput.fill(envEmail).catch(() => {});
          }
        }
      } else if (!url.includes('#create=true') && !url.includes('/drive/')) {
        await page.goto('https://colab.research.google.com/#create=true', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }

      await page.waitForTimeout(2500);
    }

    if (!cellReady) return;

    await reportStage(
      backendUrl,
      1,
      'Injecting GPU Worker CLI Script into Google Colab',
      26,
      'Writing 1-Cell Text LLM & Cloudflare Tunnel Worker into Colab editor...'
    );

    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape').catch(() => {});

    const pythonCode = getBootstrapPythonCode();

    // Inject directly into Colab's Monaco Editor model (or fallback to clipboard paste)
    const injectedViaMonaco = await page.evaluate((code) => {
      try {
        if (window.monaco && window.monaco.editor) {
          const models = window.monaco.editor.getModels();
          if (models && models.length > 0) {
            models[0].setValue(code);
            return true;
          }
        }
      } catch (_) {}
      return false;
    }, pythonCode).catch(() => false);

    if (!injectedViaMonaco) {
      // Click inside the first code cell editor and paste via Ctrl+A -> Ctrl+V
      const editorArea = page.locator('.monaco-editor, .cell, colab-cell').first();
      if ((await editorArea.count()) > 0) {
        await editorArea.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
        copyToWindowsClipboard(pythonCode);
        await page.keyboard.press('Control+a').catch(() => {});
        await page.keyboard.press('Control+v').catch(() => {});
      }
    }

    await page.waitForTimeout(1000);

    await reportStage(
      backendUrl,
      1,
      'Executing GPU Worker Cell (Shift+Enter / Ctrl+F9)',
      32,
      'Running GPU allocation, 4-bit Qwen2.5-7B loader, and Cloudflare tunnel...'
    );

    // Click run button or press Shift+Enter + Control+F9
    const runBtn = page.locator('colab-run-button, button[title*="Run cell"], #run-button').first();
    if ((await runBtn.count()) > 0) {
      await runBtn.click({ timeout: 2000 }).catch(() => {});
    }
    await page.keyboard.press('Shift+Enter').catch(() => {});
    await page.waitForTimeout(800);
    await page.keyboard.press('Control+F9').catch(() => {});

    // Save the notebook URL if it created a Drive ID
    const currentUrl = page.url();
    if (currentUrl.startsWith('https://colab.research.google.com/drive/')) {
      await postToBackend(backendUrl, '/api/colab/config', { notebookUrl: currentUrl });
    }

    // Monitor cell output in DOM as backup to the real-time ntfy stream
    const monitorStart = Date.now();
    let linkedTunnel = null;
    while (Date.now() - monitorStart < 15 * 60 * 1000) {
      await page.waitForTimeout(2500);
      await autoClickColabDialogs(page);

      // Check if backend is already READY & tunnelConnected
      try {
        const stRes = await fetch(`${backendUrl}/api/state`, { signal: AbortSignal.timeout(2500) });
        if (stRes.ok) {
          const st = await stRes.json();
          if (st?.colab?.tunnelConnected && st?.colab?.status === 'READY') {
            return;
          }
        }
      } catch (_) {}

      const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
      if (!bodyText) continue;

      const tunnelMatches = bodyText.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
      if (tunnelMatches && tunnelMatches.length > 0) {
        const candidate = tunnelMatches.reverse().find(u => !u.includes('colab-worker-t4'));
        if (candidate && candidate !== linkedTunnel) {
          linkedTunnel = candidate;
          for (let i = 0; i < 5; i++) {
            const verifyRes = await postToBackend(backendUrl, '/api/colab/verify-tunnel', { tunnelUrl: candidate });
            if (verifyRes && verifyRes.ok) return;
            await page.waitForTimeout(2500);
          }
        }
      }
    }
  } catch (err) {
    console.error('CDP Colab Runner notice:', err.message);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  launchColabNotebook().then(res => console.log('Result:', res));
}
