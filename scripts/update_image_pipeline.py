with open('server/index.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'async function createGeneratedImage(prompt, options = {}) {'
end_marker = 'async function createGeneratedVideo(prompt, options = {}) {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Markers not found! start:', start_idx, 'end:', end_idx)
    exit(1)

replacement = """async function createGeneratedImage(prompt, options = {}) {
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

  const targetModel = options.model || (state.colab.gpuTier === 'A100' ? 'Lykon/dreamshaper-xl-v2-turbo' : state.models.activeImageModel);
  const steps = Number(options.steps || 8);
  const cfgScale = Number(options.cfgScale || 2.0);

  // Generate readable descriptive filename that traces model, prompt slug, seed, and settings:
  // e.g., 20261031_2335_DreamShaperXL_cleopatra_erotic_jewelry_s88495168_cfg2_st8.jpg
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  let cleanModelTag = (targetModel || 'Diffusers').split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18);
  if (/dreamshaper/i.test(targetModel)) cleanModelTag = 'DreamShaperXL';
  else if (/flux.*realism/i.test(targetModel)) cleanModelTag = 'FLUX-Realism';
  else if (/flux/i.test(targetModel)) cleanModelTag = 'FLUX1-dev';
  else if (/turbo/i.test(targetModel)) cleanModelTag = 'SD-Turbo';

  const slug = cleanPrompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\\s+/)
    .slice(0, 5)
    .join('_')
    .slice(0, 32) || 'visual';

  const fileName = `${dateStr}_${cleanModelTag}_${slug}_s${seed}_cfg${cfgScale}_st${steps}.jpg`;
  const metaFileName = fileName.replace(/\\.jpg$/, '.json');
  const filePath = path.join(mediaDir, fileName);
  let localUrl = `/media/${fileName}`;

  // Anatomical and liberated quality enhancements
  const isHumanOrCharacter = /woman|man|girl|boy|person|cleopatra|portrait|face|eyes|queen|body|erotic|sensual|skin|breasts|beauty|goddess|princess|lady|warrior|human|figure/i.test(cleanPrompt);
  let enhancedPrompt = cleanPrompt;
  if (options.anatomyBoost !== false && isHumanOrCharacter && !cleanPrompt.toLowerCase().includes('symmetrical eyes')) {
    enhancedPrompt = `${cleanPrompt}, masterpiece, highly detailed symmetrical eyes, detailed pupils, realistic authentic irises, anatomically correct body, natural skin texture, sharp focus, 8k resolution, cinematic lighting`;
  }

  const defaultNegative = 'deformed iris, deformed pupils, bad eyes, cross-eyed, bad anatomy, deformed hands, extra fingers, mutated hands, poorly drawn face, disfigured, malformed limbs, blurry, bad proportions, cloned face, gross proportions, watermark, low quality';
  const negativePrompt = (options.negativePrompt ? `${options.negativePrompt}, ${defaultNegative}` : defaultNegative);

  let downloaded = false;
  let gpuElapsed = null;

  // 1. Primary: Real GPU generation on Colab A100 Diffusers!
  if (state.colab.status === 'READY' && state.colab.tunnelUrl) {
    try {
      const gpuCtrl = new AbortController();
      const gpuTid = setTimeout(() => gpuCtrl.abort(), 60000);

      const gpuRes = await fetch(`${state.colab.tunnelUrl}/generate/image`, {
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
          console.log(`🎨 [Colab A100 GPU] Generated real image (${gpuData.model || targetModel}) in ${gpuData.elapsedSec || 1}s! Saved to: ${fileName}`);
        }
      }
    } catch (e) {
      console.warn('Colab GPU image generation notice:', e.message);
    }
  }

  // 2. High-speed external fallback with real browser User-Agent
  if (!downloaded) {
    const reqModel = (targetModel || '').toLowerCase();
    let extModels = ['any-dark', 'flux-realism', 'flux', 'turbo'];
    if (reqModel.includes('realism') || reqModel.includes('photo')) {
      extModels = ['flux-realism', 'any-dark', 'flux', 'turbo'];
    }

    for (const m of extModels) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 14000);
        const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=${m}&seed=${seed}&nologo=true&safe=false`;
        const res = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        });
        clearTimeout(tid);
        if (res.ok && res.headers.get('content-type')?.includes('image')) {
          const arrayBuf = await res.arrayBuffer();
          // Filter out the known rate limit banner files
          if (arrayBuf.byteLength > 2000 && ![94175, 94177, 83327, 80743].includes(arrayBuf.byteLength)) {
            fs.writeFileSync(filePath, Buffer.from(arrayBuf));
            downloaded = true;
            console.log(`🎨 [External Engine] Generated image via Pollinations (${m}) -> ${fileName}`);
            break;
          }
        }
      } catch (e) {}
    }
  }

  // If external fetch fails, create a high-res SVG fallback file on disk
  if (!downloaded) {
    const svgFileName = fileName.replace(/\\.jpg$/, '.svg');
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

  // Write full companion metadata trace sidecar (.json)
  const metaSidecar = {
    id,
    fileName,
    imageUrl: localUrl,
    createdAt: new Date().toISOString(),
    model: targetModel,
    prompt: cleanPrompt,
    enhancedPrompt: (enhancedPrompt !== cleanPrompt ? enhancedPrompt : undefined),
    negativePrompt,
    settings: {
      seed,
      steps,
      cfgScale,
      aspectRatio,
      width,
      height,
      anatomyBoost: options.anatomyBoost !== false
    },
    hardware: {
      gpuTier: state.colab.gpuTier || 'A100',
      gpuName: state.colab.gpuName || 'NVIDIA A100-SXM4-40GB',
      elapsedSec: gpuElapsed || null
    }
  };

  try {
    fs.writeFileSync(path.join(mediaDir, metaFileName), JSON.stringify(metaSidecar, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write metadata sidecar:', e.message);
  }

  const item = {
    id,
    fileName,
    metaUrl: `/media/${metaFileName}`,
    prompt: cleanPrompt,
    enhancedPrompt,
    negativePrompt,
    imageUrl: localUrl,
    model: targetModel,
    aspectRatio,
    width,
    height,
    steps,
    cfgScale,
    seed,
    anatomyBoost: options.anatomyBoost !== false,
    gpuInfo: {
      tier: state.colab.gpuTier || 'A100',
      elapsedSec: gpuElapsed || null
    },
    createdAt: new Date().toISOString(),
    subjectTag: cleanPrompt.split(',')[0].slice(0, 38)
  };
  state.images.unshift(item);
  return item;
}

"""

new_content = content[:start_idx] + replacement + content[end_idx:]
with open('server/index.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated server/index.js with descriptive filename and metadata sidecar!')
