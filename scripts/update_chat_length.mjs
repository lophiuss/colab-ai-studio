import fs from 'node:fs';

// 1. Update server/index.js
const serverPath = 'server/index.js';
let serverCode = fs.readFileSync(serverPath, 'utf8');

serverCode = serverCode.replace(
  'generateChatReply(prompt, preset, state.models.activeTextModel, { history, thinking: state.chatSettings.thinking })',
  'generateChatReply(prompt, preset, state.models.activeTextModel, { history, thinking: state.chatSettings.thinking, lengthMode: body.lengthMode || "epic" })'
);

fs.writeFileSync(serverPath, serverCode, 'utf8');
console.log('✅ Updated server/index.js to pass lengthMode to generateChatReply');

// 2. Update public/app.js
const appPath = 'public/app.js';
let appCode = fs.readFileSync(appPath, 'utf8');

// Pass lengthMode in apiPost('/api/studio/chat')
appCode = appCode.replace(
  "const res = await apiPost('/api/studio/chat', { prompt, thinking: document.getElementById('chkThinking').checked });",
  "const lengthMode = document.getElementById('chatLengthSelect')?.value || 'epic';\n      const res = await apiPost('/api/studio/chat', { prompt, thinking: document.getElementById('chkThinking').checked, lengthMode });"
);

// Add Continue Writing and Copy action buttons to chat bubbles
const oldBubbleHtmlRegex = /<div class="bubble-body">\$\{escapeHtml\(m\.content\)\.replace\(\/\\n\/g, '<br\/>'\)\}<\/div>\s*<\/div>/;

const newBubbleHtml = `<div class="bubble-body">\${escapeHtml(m.content).replace(/\\n/g, '<br/>')}</div>
      \${m.role === 'assistant' ? \`
        <div class="chat-bubble-actions" style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px;">
          <button type="button" class="btn-compact btn-secondary btn-continue-chat" data-msg-id="\${m.id}" style="font-size:11px; padding:3px 8px;" title="Let the AI continue writing seamlessly without repeating previous text">⏩ 继续写下去 (Continue Writing)</button>
          <button type="button" class="btn-compact btn-secondary btn-copy-chat" data-msg-id="\${m.id}" style="font-size:11px; padding:3px 8px;" title="Copy Full Text">📋 Copy</button>
        </div>
      \` : ''}
    </div>`;

if (oldBubbleHtmlRegex.test(appCode)) {
  appCode = appCode.replace(oldBubbleHtmlRegex, newBubbleHtml);
  console.log('✅ Added Continue Writing action button to assistant chat bubbles in public/app.js');
}

// Wire up continue & copy listeners in renderChatStudio
const oldTranscriptScrollRegex = /transcript\.scrollTop = transcript\.scrollHeight;\s*\}\s*\}\s*function renderNovelStudio/;

const newTranscriptWiring = `transcript.scrollTop = transcript.scrollHeight;
    
    // Wire up Continue Writing and Copy actions
    transcript.querySelectorAll('.btn-continue-chat').forEach(btn => {
      btn.onclick = () => {
        const input = document.getElementById('chatPromptInput');
        if (input) {
          input.value = '请紧接着上一段继续写下去，保持同样的细节深度、文风与宏大篇幅，不要总结，直接输出下一章节/段落：';
          document.getElementById('btnSendChat')?.click();
        }
      };
    });

    transcript.querySelectorAll('.btn-copy-chat').forEach(btn => {
      btn.onclick = () => {
        const bubble = btn.closest('.chat-bubble');
        const bodyText = bubble ? bubble.querySelector('.bubble-body')?.innerText : '';
        if (bodyText) {
          navigator.clipboard.writeText(bodyText);
          showToast('Copied text to clipboard');
        }
      };
    });
  }
}

function renderNovelStudio`;

if (oldTranscriptScrollRegex.test(appCode)) {
  appCode = appCode.replace(oldTranscriptScrollRegex, newTranscriptWiring);
  console.log('✅ Wired up btn-continue-chat and btn-copy-chat event listeners in public/app.js');
}

fs.writeFileSync(appPath, appCode, 'utf8');
