import fs from 'node:fs';

let html = fs.readFileSync('public/index.html', 'utf8');

// Bump cache-buster to v14
html = html.replace(/styles\.css\?v=[^\"]+/, 'styles.css?v=20261103_v14');
html = html.replace(/app\.js\?v=[^\"]+/, 'app.js?v=20261103_v14');

// Add close button
if (!html.includes('btnCloseLoginModal')) {
  html = html.replace(
    '<div class="login-dialog">',
    '<div class="login-dialog" style="position:relative;">\n      <button id="btnCloseLoginModal" type="button" class="modal-close" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.08); border:none; color:var(--text-muted); width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;" title="Enter Studio directly (Close Modal)">✕</button>'
  );
  console.log('✅ Added close button to login dialog');
}

// Add skip button
if (!html.includes('btnSkipLogin')) {
  html = html.replace(
    '</button>\n        </div>\n      </form>',
    '</button>\n          <button id="btnSkipLogin" type="button" class="btn-secondary" style="margin-top:8px; font-size:12px; padding:7px 12px; color:var(--text-muted); text-align:center; width:100%;">\n            ⚡ Enter Studio Directly (Offline / Standalone Mode)\n          </button>\n        </div>\n      </form>'
  );
  if (!html.includes('btnSkipLogin')) {
    html = html.replace(
      '</button>\r\n        </div>\r\n      </form>',
      '</button>\r\n          <button id="btnSkipLogin" type="button" class="btn-secondary" style="margin-top:8px; font-size:12px; padding:7px 12px; color:var(--text-muted); text-align:center; width:100%;">\r\n            ⚡ Enter Studio Directly (Offline / Standalone Mode)\r\n          </button>\r\n        </div>\r\n      </form>'
    );
  }
  console.log('✅ Added skip button to login dialog');
}

fs.writeFileSync('public/index.html', html, 'utf8');
