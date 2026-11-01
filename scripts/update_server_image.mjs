import fs from 'node:fs';

const serverPath = 'server/index.js';
let code = fs.readFileSync(serverPath, 'utf8');

const targetFunctionRegex = /async function createGeneratedImage\(prompt, options = \{\}\) \{[\s\S]*?\/\/ If external fetch fails, create a high-res SVG fallback file on disk/;

const replacementFunction = `async function createGeneratedImage(prompt, options = {}) {
  const seed = options.seed ? Number(options.seed) : Math.floor(10000000 + Math.random() * 90000000);
  const aspectRatio = options.aspectRatio || '1:1';
  const resBase = Number(options.resolution || 1024);

  let width = options.width ? Number(options.width) : null;
  let height = options.height ? Number(options.height) : null;

  if (!width || !height || isNaN(width) || isNaN(height)) {
    if (aspectRatio === '1:1') { width = resBase; height = resBase; }
    else if (aspectRatio === '16:9') { width = Math.round(resBase * 16 / 9 / 16) * 16; height = resBase; }
    else if (aspectRatio === '9:16') { width = resBase; height = Math.round(resBase * 16 / 9 / 16) * 16; }
    else if (aspectRatio === '3:4') { width = Math.round(resBase * 3 / 4 / 16) * 16; height = resBase; }
    else if (aspectRatio === '4:3') { width = resBase; height = Math.round(resBase * 3 / 4 / 16) * 16; }
    else if (aspectRatio === '2:3') { width = Math.round(resBase * 2 / 3 / 16) * 16; height = resBase; }
    else if (aspectRatio === '21:9') { width = Math.round(resBase * 21 / 9 / 16) * 16; height = resBase; }
    else { width = resBase; height = resBase; }
  }

  // Ensure divisible by 16 and bounded between 256 and 2048 for GPU stability
  width = Math.min(2048, Math.max(256, Math.round(width / 16) * 16));
  height = Math.min(2048, Math.max(256, Math.round(height / 16) * 16));

  const cleanPrompt = (prompt || 'Cinematic concept art, highly detailed, 8k resolution').trim();
  const id = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const mediaDir = path.join(PUBLIC_DIR, 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  const targetModel = options.model || (state.colab.gpuTier === 'A100' ? 'flux-realism' : state.models.activeImageModel);
  const steps = Number(options.steps || 12);
  const cfgScale = Number(options.cfgScale || 3.0);

  // Generate readable descriptive filename that traces model, prompt slug, seed, and settings:
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = \`\${now.getFullYear()}\${pad(now.getMonth() + 1)}\${pad(now.getDate())}_\${pad(now.getHours())}\${pad(now.getMinutes())}\${pad(now.getSeconds())}\`;
  
  let cleanModelTag = (targetModel || 'Diffusers').split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18);
  if (/dreamshaper/i.test(targetModel)) cleanModelTag = 'DreamShaperXL';
  else if (/flux.*realism/i.test(targetModel)) cleanModelTag = 'FLUX-Realism';
  else if (/flux.*pro/i.test(targetModel)) cleanModelTag = 'FLUX-Pro';
  else if (/flux/i.test(targetModel)) cleanModelTag = 'FLUX1-dev';
  else if (/turbo/i.test(targetModel)) cleanModelTag = 'SD-Turbo';

  const slug = cleanPrompt
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, '')
    .trim()
    .split(/\\s+/)
    .slice(0, 5)
    .join('_')
    .slice(0, 32) || 'visual';

  const fileName = \`\${dateStr}_\${cleanModelTag}_\${slug}_s\${seed}_cfg\${cfgScale}_st\${steps}.jpg\`;
  const metaFileName = fileName.replace(/\\.jpg$/, '.json');
  const filePath = path.join(mediaDir, fileName);
  let localUrl = \`/media/\${fileName}\`;

  // Precision Anatomical and Facial enhancements (Eyes, Mouth, Lips, Teeth, Skin)
  const isHumanOrCharacter = /woman|man|girl|boy|person|cleopatra|portrait|face|eyes|mouth|smile|lips|teeth|queen|body|erotic|sensual|skin|beauty|goddess|princess|lady|warrior|human|figure|character|photo|model|selfie|costume/i.test(cleanPrompt);
  let enhancedPrompt = cleanPrompt;
  if (options.anatomyBoost !== false && isHumanOrCharacter) {
    const eyeTerms = 'perfectly symmetrical detailed eyes, sharp intricate irises, natural corneal reflections, distinct circular pupils, realistic defined eyelashes, natural eyelids';
    const mouthTerms = 'naturally shaped lips, subtle moist lip texture, clean symmetrical white teeth, natural mouth anatomy, harmonious facial features';
    const skinTerms = 'flawless facial proportions, natural realistic skin texture, subtle skin pores, 8k uhd, professional studio lighting, sharp focus';
    
    let additions = [];
    if (!/eye|iris|pupil/i.test(cleanPrompt)) additions.push(eyeTerms);
    if (!/mouth|lip|teeth|smile/i.test(cleanPrompt)) additions.push(mouthTerms);
    additions.push(skinTerms);
    enhancedPrompt = \`\${cleanPrompt}, \${additions.join(', ')}\`;
  }

  // Surgical negative prompt targeting distorted eyes, crooked mouths, fused teeth, etc.
  const defaultNegative = 'deformed iris, deformed pupils, asymmetrical eyes, cross-eyed, misaligned pupils, wandering eye, dull lifeless eyes, blind eyes, cataract, double pupil, blurry eyes, crooked mouth, deformed lips, split lip, open mouth distortion, bad teeth, crooked teeth, yellow teeth, extra teeth, fused teeth, missing teeth, unnatural grimace, distorted smile, bad jawline, poorly drawn face, mutated face, malformed face, deformed anatomy, bad proportions, extra fingers, mutated hands, disfigured, plastic skin, doll face, 3d render doll, blurry, low resolution, bad quality, watermark, signature';
  const negativePrompt = (options.negativePrompt ? \`\${options.negativePrompt}, \${defaultNegative}\` : defaultNegative);

  let downloaded = false;
  let gpuElapsed = null;

  // 1. Primary: Real GPU generation on Colab A100 Diffusers!
  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const gpuCtrl = new AbortController();
      const gpuTid = setTimeout(() => gpuCtrl.abort(), 60000);

      const gpuRes = await fetch(\`\${state.colab.tunnelUrl}/generate/image\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          negative_prompt: negativePrompt,
          width,
          height,
          steps,
          cfg_scale: cfgScale,
          model: targetModel
        }),
        signal: gpuCtrl.signal
      });
      clearTimeout(gpuTid);
      if (gpuRes.ok) {
        const gpuData = await gpuRes.json();
        if (gpuData && gpuData.ok && gpuData.image_b64) {
          fs.writeFileSync(filePath, Buffer.from(gpuData.image_b64, 'base64'));
          downloaded = true;
          gpuElapsed = gpuData.elapsedSec || 0.4;
          console.log(\`🎨 [Colab A100 GPU] Generated real image (\${gpuData.model || targetModel}) in \${gpuData.elapsedSec || 1}s! Saved to: \${fileName}\`);
        }
      }
    } catch (e) {
      console.warn('Colab GPU image generation notice:', e.message);
    }
  }

  // 2. High-fidelity external engine fallback (prioritizing FLUX Realism & FLUX)
  if (!downloaded) {
    const reqModel = (targetModel || '').toLowerCase();
    let extModels = ['flux-realism', 'flux', 'flux-pro', 'turbo'];
    if (reqModel.includes('anime')) {
      extModels = ['flux-anime', 'flux', 'flux-realism', 'turbo'];
    } else if (reqModel.includes('pro')) {
      extModels = ['flux-pro', 'flux-realism', 'flux', 'turbo'];
    } else if (reqModel.includes('turbo')) {
      extModels = ['turbo', 'flux-realism', 'flux'];
    } else if (reqModel.includes('realism') || isHumanOrCharacter) {
      extModels = ['flux-realism', 'flux', 'flux-pro', 'turbo'];
    }

    for (const m of extModels) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 16000);
        const u = \`https://image.pollinations.ai/prompt/\${encodeURIComponent(enhancedPrompt)}?width=\${width}&height=\${height}&model=\${m}&seed=\${seed}&nologo=true&safe=false&negative_prompt=\${encodeURIComponent(negativePrompt)}\`;
        const res = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        });
        clearTimeout(tid);
        if (res.ok && res.headers.get('content-type')?.includes('image')) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const bufStr = buffer.toString('utf8', 0, 800);
          const isBanner = bufStr.includes('Free limit reached') || bufStr.includes('pollinations.ai') || [94175, 94177, 83327, 80743, 75520, 68420].includes(arrayBuf.byteLength);
          if (arrayBuf.byteLength > 3000 && !isBanner) {
            fs.writeFileSync(filePath, Buffer.from(arrayBuf));
            downloaded = true;
            console.log(\`🎨 [External Engine] Generated high-fidelity image via Pollinations (\${m}, \${width}x\${height}) -> \${fileName}\`);
            break;
          }
        }
      } catch (e) {}
    }
  }

  // If external fetch fails, create a high-res SVG fallback file on disk`;

if (targetFunctionRegex.test(code)) {
  code = code.replace(targetFunctionRegex, replacementFunction);
  fs.writeFileSync(serverPath, code, 'utf8');
  console.log('✅ Updated server/index.js createGeneratedImage with dynamic resolution & anatomical fidelity');
} else {
  console.error('❌ Could not find targetFunctionRegex in server/index.js');
}
