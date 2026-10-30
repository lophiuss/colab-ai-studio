# ⚡ Colab AI Studio & 200 Compute Unit Orchestrator

An all-in-one web platform and orchestrator built to harness Google Colab GPU runtimes (optimizing your **200 Compute Unit** allocation) for multi-modal creative workflows: **Interactive Chat**, **Novel & Long-Form Writing**, **Diffusion Image Generation**, **Temporal Video Synthesis**, **Safe Autonomous Agents**, and **Sequential Batch Task Queuing**.

---

## 🚀 Key Features

1. **Zero-Touch Colab Auto-Run on Login:**
   - As soon as you sign into the website, the platform automatically boots your Colab runtime (either via background Playwright headless browser or live reverse webhook).
   - Real-time **4-Stage Startup Progress Bar** with live elapsed seconds, estimated time of arrival (ETA), and progress indicators:
     1. *Allocating GPU Runtime (T4 / L4 / A100)*
     2. *Mounting Google Drive & Hugging Face Cache (`/content/drive/MyDrive/ColabAIStudio/hf_cache`)*
     3. *Loading Hugging Face Model Weights into GPU VRAM*
     4. *Starting FastAPI Worker, Health Check & Reverse Tunnel*

2. **200 Compute Unit (CU) Balance Meter & Idle Guard:**
   - Real-time gauge tracking remaining units out of **200.00 CU**.
   - Dynamic burn rate calculator based on selected hardware:
     - **Tesla T4 (15 GB VRAM):** `1.96 CU/hr`
     - **NVIDIA L4 (22.5 GB VRAM):** `4.82 CU/hr`
     - **NVIDIA A100 (40 GB VRAM):** `13.11 CU/hr`
   - One-click balance calibration/sync with Colab's Resource Monitor.
   - **Post-Queue Auto-Shutdown:** Automatically triggers `runtime.unassign()` when the batch queue finishes to prevent burning compute units while you sleep.

3. **Multi-Modal Workspaces:**
   - **💬 Interactive Chat:** Multi-turn streaming conversation with code highlighting, active Hugging Face model badge, and system prompt preset injection.
   - **📖 Novel Writing Studio:** Editorial manuscript editor (serif typography) with multi-chapter management, **Story Bible / Lorebook** (Characters & World Rules), and AI prose tools (*Continue Chapter*, *Expand Sensory Detail*, *Literary Rewrite*, *Batch Queue 3 Chapters*).
   - **🎨 Image Studio (Diffusers):** Synthesize high-resolution concept art and illustrations via FLUX.1-dev or Stable Diffusion 3.5 Large Turbo with Aspect Ratio, Step, CFG, and Seed controls.
   - **🎬 Video Studio (Temporal Motion):** Generate cinematic motion clips with Wan2.1-T2V-14B & LTX-Video, featuring interactive HTML5 Canvas motion playback, camera movement modes, and FPS controls.
   - **🛡️ Safe Autonomous Agents:** 4 sandboxed agent profiles (*Deep Research & Synthesis*, *Novel Plot Architect*, *Prompt Optimization Specialist*, *Code & Security Auditor*) equipped with loop detection, max-iteration caps, and verified step-by-step traces.

4. **✨ Quality Prompt Enhancer ("Magic Wand"):**
   - One-click prompt transformer available across all studios that converts rough ideas into structured, high-performing prompts calibrated for LLMs, literary prose, diffusion lighting, or video camera kinematics.

5. **🤗 Hugging Face Model Hub & System Prompt Presets:**
   - Dynamically load open-weight models into Colab GPU VRAM by Repo ID (e.g., `meta-llama/...`, `Qwen/...`, `black-forest-labs/...`) with quantization options (`4-bit NF4`, `4-bit AWQ`, `GGUF`, `FP8`).
   - Create, edit, and switch system prompt presets and tune sampling parameters (`Temperature`, `Top-P`, `Repetition Penalty`, `Max Tokens`).

6. **⚡ Sequential Batch Task Queue & VRAM Swapper:**
   - Add single or multi-task batches across any combination of Chat, Novel, Image, Video, or Agent workflows.
   - **Sequential Auto-Runner:** Automatically executes the next task as soon as the current one finishes.
   - **Automatic VRAM Swapping:** Intelligently unloads LLM weights before loading Diffusion/Video models when transitioning between task modalities.

---

## 📁 Project Structure

```
colab/
├── colab/
│   ├── colab_ai_worker.ipynb     # The zero-touch 4-cell Google Colab GPU notebook
│   └── auto_launch_colab.mjs     # Headless Playwright launcher for Ctrl+F9 Run All
├── public/
│   ├── index.html                # Telemetry bar, 5 multi-modal studios, batch queue dock
│   ├── styles.css                # Precision dark instrument styling
│   └── app.js                    # Live state polling, telemetry meters & studio controllers
├── server/
│   └── index.js                  # Express/Node HTTP server, queue runner & CU engine
├── data/
│   └── studio_state.json         # Persistent JSON database for prompts, history & queue
├── package.json
├── PRD.md                        # Full Product Requirements Document
└── README.md
```

---

## 🏃 Running the Studio

1. **Start the Web Application:**
   ```bash
   npm start
   ```
   Or:
   ```bash
   node server/index.js
   ```

2. **Open in Browser:**
   Navigate to [http://localhost:3456](http://localhost:3456).

3. **Sign In & Auto-Launch:**
   - Enter your email and Colab Notebook URL (or use default).
   - Leave *"Automatically wake & run Colab notebook upon login"* checked.
   - Click **"Sign In & Auto-Launch Colab Runtime"**.
   - Watch the live **4-Stage Startup Progress Bar** initialize your GPU, mount Google Drive, load Hugging Face weights, and connect the reverse tunnel!

4. **Using with Google Colab:**
   - Click **"⬇ Download colab_ai_worker.ipynb"** from the top header or the *Colab Auto-Setup* tab.
   - Upload `colab_ai_worker.ipynb` to your Google Drive under `ColabAIStudio/`.
   - The notebook connects automatically to your studio dashboard and reports live GPU telemetry (`nvidia-smi`) and stage progress.
