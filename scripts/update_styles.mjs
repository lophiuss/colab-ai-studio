import fs from 'node:fs';

const stylesPath = 'public/styles.css';
let css = fs.readFileSync(stylesPath, 'utf8');

const additionalCss = `

/* ==========================================================================
   IMAGE CREATION ENHANCEMENTS — RATIO PRESERVATION, CONTROLS & FACIAL ANATOMY
   ========================================================================== */

.composer-toolbar-secondary {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

.dimensions-pill input:focus {
  outline: none !important;
  border-color: var(--accent-cyan) !important;
}

.chip-btn {
  background: rgba(30, 41, 59, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #cbd5e1 !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  padding: 3px 9px !important;
  border-radius: 12px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  user-select: none !important;
}

.chip-btn:hover {
  background: rgba(245, 158, 11, 0.22) !important;
  border-color: var(--accent-amber) !important;
  color: #fef3c7 !important;
  transform: translateY(-1px) !important;
}

.chip-btn:active {
  transform: translateY(0) !important;
}

.active-view-toggle {
  background: var(--accent-cyan) !important;
  color: #0f172a !important;
  border-color: var(--accent-cyan) !important;
  font-weight: 600 !important;
}

/* Gallery Card Dimensions & Aspect Ratio */
.media-card {
  background: #090d16 !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  height: 315px !important;
  min-height: 315px !important;
  max-height: 315px !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45) !important;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease !important;
  position: relative !important;
}

.media-visual-wrap {
  position: relative !important;
  width: 100% !important;
  height: 215px !important;
  min-height: 215px !important;
  max-height: 215px !important;
  flex: 0 0 215px !important;
  background: #030611 !important;
  overflow: hidden !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Ambient blurred background of the actual photo to guarantee true aspect-ratio preservation */
.media-visual-backdrop {
  position: absolute !important;
  inset: -12px !important;
  width: calc(100% + 24px) !important;
  height: calc(100% + 24px) !important;
  object-fit: cover !important;
  filter: blur(16px) brightness(0.28) saturate(1.4) !important;
  opacity: 0.75 !important;
  pointer-events: none !important;
  user-select: none !important;
  z-index: 1 !important;
}

/* The actual image: displayed in its 100% TRUE native aspect ratio, NEVER cropped or sliced! */
.gallery-mode-fit .media-visual,
.media-visual {
  position: relative !important;
  max-width: 100% !important;
  max-height: 100% !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
  display: block !important;
  z-index: 2 !important;
  border-radius: 4px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75) !important;
  transition: transform 0.25s ease !important;
}

.media-visual-wrap:hover .media-visual {
  transform: scale(1.03) !important;
}

/* Alternate Uniform Cover Grid Mode */
.gallery-mode-cover .media-visual {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 0 !important;
  z-index: 2 !important;
}

.gallery-mode-cover .media-visual-backdrop {
  display: none !important;
}

/* Translucent Aspect Ratio & Resolution Tag */
.ratio-badge {
  position: absolute !important;
  top: 8px !important;
  left: 8px !important;
  background: rgba(15, 23, 42, 0.88) !important;
  backdrop-filter: blur(4px) !important;
  color: #38bdf8 !important;
  border: 1px solid rgba(56, 189, 248, 0.35) !important;
  padding: 2px 7px !important;
  border-radius: 4px !important;
  font-size: 10.5px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-weight: 600 !important;
  z-index: 5 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
  pointer-events: none !important;
}

/* Live Generating Preview Card */
.media-card-generating {
  border: 1px dashed var(--accent-cyan) !important;
  background: rgba(15, 23, 42, 0.85) !important;
  animation: pulseGpuCard 1.8s infinite ease-in-out !important;
}

@keyframes pulseGpuCard {
  0%, 100% {
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
    border-color: var(--accent-cyan);
  }
  50% {
    box-shadow: 0 0 24px rgba(245, 158, 11, 0.45);
    border-color: var(--accent-amber);
  }
}
`;

css += additionalCss;
fs.writeFileSync(stylesPath, css, 'utf8');
console.log('✅ Updated public/styles.css with ratio preservation, chips & badges');
