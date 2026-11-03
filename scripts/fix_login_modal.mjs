import fs from 'node:fs';

// 1. UPDATE public/index.html
const indexHtmlPath = 'public/index.html';
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Bump cache-buster to v14
indexHtml = indexHtml.replace(/styles\.css\?v=[^\"]+/, 'styles.css?v=20261103_v14');
indexHtml = indexHtml.replace(/app\.js\?v=[^\"]+/, 'app.js?v=20261103_v14');

// Add close button and Skip button to loginModal
const oldLoginDialog = `<div class="login-dialog">
      <div class="login-brand-row">`;

const newLoginDialog = `<div class="login-dialog" style="position:relative;">
      <button id="btnCloseLoginModal" type="button" class="modal-close" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.08); border:none; color:var(--text-muted); width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" title="Enter Studio directly (Close Modal)">✕</button>
      <div class="login-brand-row">`;

if (indexHtml.includes(oldLoginDialog)) {
  indexHtml = indexHtml.replace(oldLoginDialog, newLoginDialog);
  console.log('✅ Added close button to login dialog in index.html');
}

const oldLoginActions = `<div class="login-actions">
          <button type="submit" class="btn-primary btn-large">
            Sign In &amp; Auto-Launch Colab Runtime
          </button>
        </div>`;

const newLoginActions = `<div class="login-actions" style="display:flex; flex-direction:column; gap:8px;">
          <button type="submit" class="btn-primary btn-large">
            Sign In &amp; Auto-Launch Colab Runtime
          </button>
          <button id="btnSkipLogin" type="button" class="btn-secondary" style="font-size:12px; padding:7px 12px; color:var(--text-muted); text-align:center;">
            ⚡ Enter Studio Directly (Offline / Standalone Mode)
          </button>
        </div>`;

if (indexHtml.includes(oldLoginActions)) {
  indexHtml = indexHtml.replace(oldLoginActions, newLoginActions);
  console.log('✅ Added Skip/Direct Enter button in index.html');
}

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');

// 2. UPDATE public/app.js
const appPath = 'public/app.js';
let appCode = fs.readFileSync(appPath, 'utf8');

// Add auto-dismiss of login modal when authenticated in renderAccountAndSetupFields
const targetRenderAccount = `function renderAccountAndSetupFields() {
  if (!appState) return;
  const { user, colab } = appState;`;

const newRenderAccount = `function renderAccountAndSetupFields() {
  if (!appState) return;
  const { user, colab } = appState;
  
  // Auto-hide login modal if user is authenticated or already logged in
  if (user && user.authenticated) {
    document.getElementById('loginModal')?.classList.add('hidden');
  }`;

if (appCode.includes(targetRenderAccount)) {
  appCode = appCode.replace(targetRenderAccount, newRenderAccount);
  console.log('✅ Added auto-hide login modal when user is authenticated in app.js');
}

// Update loginForm submit handler with try/catch and guaranteed modal dismissal
const oldLoginFormHandler = `document.getElementById('loginForm').addEventListener('submit', async e => {
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
    showToast(\`Signed in! Auto-launching Colab (\${gpuTier}) & syncing \${cuBalance.toFixed(1)} CU...\`);
    await fetchState();
  });`;

const newLoginFormHandler = `const loginFormEl = document.getElementById('loginForm');
  if (loginFormEl) {
    loginFormEl.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const notebookUrl = document.getElementById('loginNotebookUrl').value.trim();
      const gpuTier = document.getElementById('loginGpuTier').value;
      const cuBalance = Number(document.getElementById('loginCuBalance').value || 186.4);
      const autoRun = document.getElementById('loginAutoStart').checked;

      if (email) localStorage.setItem('colab_creator_email', email);
      if (notebookUrl) localStorage.setItem('colab_notebook_url', notebookUrl);

      // Immediately dismiss modal so user is never trapped
      document.getElementById('loginModal')?.classList.add('hidden');
      showToast(\`Signed in! Auto-launching Colab (\${gpuTier}) & syncing \${cuBalance.toFixed(1)} CU...\`);

      try {
        await apiPost('/api/user/account', { email, notebookUrl, gpuTier, autoRunOnLogin: autoRun });
        await apiPost('/api/colab/config', {
          autoRunOnLogin: autoRun,
          notebookUrl,
          gpuTier,
          remainingCU: cuBalance
        });
        await apiPost('/api/auth/login', { email, notebookUrl, gpuTier });
      } catch (err) {
        console.warn('Login handshake notice:', err);
      }
      await fetchState();
    });
  }

  // Dismiss / Close buttons for Login Modal
  const btnCloseLogin = document.getElementById('btnCloseLoginModal');
  if (btnCloseLogin) {
    btnCloseLogin.onclick = (e) => {
      e.preventDefault();
      document.getElementById('loginModal')?.classList.add('hidden');
      showToast('Entered Studio');
    };
  }

  const btnSkipLogin = document.getElementById('btnSkipLogin');
  if (btnSkipLogin) {
    btnSkipLogin.onclick = (e) => {
      e.preventDefault();
      document.getElementById('loginModal')?.classList.add('hidden');
      showToast('Entered Studio in Standalone / Offline Mode');
    };
  }`;

if (appCode.includes(oldLoginFormHandler)) {
  appCode = appCode.replace(oldLoginFormHandler, newLoginFormHandler);
  console.log('✅ Replaced loginForm handler with resilient handler & dismiss buttons in app.js');
}

fs.writeFileSync(appPath, appCode, 'utf8');
