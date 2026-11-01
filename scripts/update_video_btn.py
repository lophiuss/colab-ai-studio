with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = """  const btnGenerateVideo = document.getElementById('btnGenerateVideo');
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
  }"""

replacement = """  const btnGenerateVideo = document.getElementById('btnGenerateVideo');
  if (btnGenerateVideo) {
    btnGenerateVideo.addEventListener('click', async () => {
      const prompt = document.getElementById('videoPromptInput').value.trim() || 'Cinematic cyberpunk sports car speeding through rainy neon city';
      const cameraMotion = document.getElementById('videoCameraMotion')?.value || 'Dolly Push-In';
      const durationSec = document.getElementById('videoDuration')?.value || '5';
      const motionStrength = document.getElementById('videoMotionStrength')?.value || '0.8';
      const seedanceStyle = document.getElementById('videoSeedanceStyle')?.value || 'cinematic-hyperreal';
      const aspectRatio = document.getElementById('videoAspectRatio')?.value || '16:9';

      btnGenerateVideo.disabled = true;
      btnGenerateVideo.textContent = 'Synthesizing Seedance Motion on GPU... ⏳';
      try {
        await apiPost('/api/studio/video', { prompt, cameraMotion, durationSec, motionStrength, seedanceStyle, aspectRatio });
        showToast('Rendered Seedance Video Scene on GPU!');
        await fetchState();
      } catch (err) {
        showToast('Video synthesis failed: ' + err.message);
      } finally {
        btnGenerateVideo.disabled = false;
        btnGenerateVideo.textContent = 'Render Seedance Video (0.25 CU)';
      }
    });
  }

  const btnClearBrokenVideos = document.getElementById('btnClearBrokenVideos');
  if (btnClearBrokenVideos) {
    btnClearBrokenVideos.addEventListener('click', async () => {
      await apiPost('/api/studio/video/delete', { clearBroken: true });
      await fetchState();
      showToast('Cleaned up broken video cards!');
    });
  }"""

if target in text:
    text = text.replace(target, replacement, 1)
    with open('public/app.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated btnGenerateVideo in public/app.js!')
else:
    print('target not found in app.js!')
