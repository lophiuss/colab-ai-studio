# ==============================================================================
# COLAB AI STUDIO — 1-CELL FULL-AUTO GPU WORKER & QLORA ENGINE (ROLE 1: TEXT)
# Default Model: DavidAU L3.2 Rogue Creative Uncensored Abliterated 7B (4-bit)
# Includes Llama-3 <|eot_id|> instant stop-token handling & T4 GPU verification!
# ==============================================================================
import os, sys, time, json, subprocess, threading, re, gc, urllib.request

PAIRING_TOPIC = "colab_sync_studio_9f4k2x8m"
# @markdown ### 🤖 Select AI Model (Default: Qwen 2.5 Abliterated - Fluent Chinese & English Uncensored)
MODEL_CHOICE = "RichardErkhov/huihui-ai_-_Qwen2.5-7B-Instruct-abliterated-v2-4bits" #@param ["RichardErkhov/huihui-ai_-_Qwen2.5-7B-Instruct-abliterated-v2-4bits", "Qwen/Qwen2.5-7B-Instruct", "RichardErkhov/DavidAU_-_L3.2-Rogue-Creative-Instruct-Uncensored-Abliterated-7B-4bits"]
PRIMARY_GPU_MODEL = MODEL_CHOICE

def broadcast_stage(stage_idx, name, pct, detail=""):
    print(f"📊 [STAGE {stage_idx} | {pct}%] {name} — {detail}", flush=True)
    payload = json.dumps({
        "type": "colab_stage",
        "stageIndex": stage_idx,
        "stageName": name,
        "progress": pct,
        "detail": detail,
        "timestamp": time.time()
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{PAIRING_TOPIC}",
            data=payload,
            method="POST"
        )
        urllib.request.urlopen(req, timeout=4)
    except Exception:
        pass

def get_gpu_info():
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
            universal_newlines=True
        ).strip()
        name, mem_used, mem_total, util = [x.strip() for x in out.split(",")]
        return {"gpuName": name, "vramUsedMB": float(mem_used), "vramTotalMB": float(mem_total), "gpuUtilPct": float(util), "hasGpu": True}
    except Exception:
        return {"gpuName": "CPU Runtime (Change to A100 or T4 GPU in Runtime menu!)", "vramUsedMB": 0, "vramTotalMB": 0, "gpuUtilPct": 0, "hasGpu": False}

gpu_info = get_gpu_info()
if not gpu_info["hasGpu"]:
    print("⚠️" * 30)
    print("⚠️ WARNING: THIS COLAB TAB IS CURRENTLY ON A CPU RUNTIME (NO GPU)!")
    print("👉 In Colab top menu, click: Runtime -> Change runtime type -> Select A100 GPU")
    print("⚠️" * 30, flush=True)
    broadcast_stage(1, "⚠️ Colab is on CPU! Switch to A100 GPU in Runtime menu", 25, "Running fast CPU fallback until GPU is enabled")
else:
    print(f"🚀 GPU DETECTED: {gpu_info['gpuName']} | Total VRAM: {int(gpu_info['vramTotalMB'])} MB", flush=True)
    broadcast_stage(1, f"Allocated Colab GPU ({gpu_info['gpuName']})", 25, f"GPU Ready: {gpu_info['gpuName']} ({int(gpu_info['vramTotalMB'])} MB VRAM)")

BASE_DIR = "/content/drive/MyDrive/ColabAIStudio" if os.path.exists("/content/drive/MyDrive") else "/content/ColabAIStudio"
CACHE_DIR = os.path.join(BASE_DIR, "hf_cache")
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ["HF_HOME"] = CACHE_DIR

broadcast_stage(2, "Installing AI & Tunnel Dependencies", 45, "Installing transformers, bitsandbytes, accelerate, pycloudflared, fastapi...")
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q",
    "transformers", "accelerate", "bitsandbytes", "peft", "pycloudflared", "fastapi", "uvicorn", "diffusers"
])
broadcast_stage(2, "Dependencies Ready", 60, f"Packages installed; cache bound to {CACHE_DIR}")

import torch
from transformers import AutoConfig, AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

gc.collect()
HAS_CUDA = torch.cuda.is_available()
if HAS_CUDA:
    torch.cuda.empty_cache()
    BASE_MODEL_NAME = PRIMARY_GPU_MODEL
    broadcast_stage(3, f"Loading {BASE_MODEL_NAME.split('/')[-1]}", 75, f"Loading model onto {gpu_info['gpuName']}...")
else:
    # Fast lightweight model so CPU runtime still responds in 2 seconds instead of hanging!
    BASE_MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"
    broadcast_stage(3, "CPU Runtime Detected — Loading Fast 0.5B Model", 75, "Switch Runtime -> Change runtime type -> T4 GPU for 7B Dark-Roast!")

try:
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    if HAS_CUDA:
        cfg = AutoConfig.from_pretrained(BASE_MODEL_NAME, trust_remote_code=True)
        is_pre_quantized = hasattr(cfg, "quantization_config") and bool(cfg.quantization_config)
        # On A100 (Ampere architecture), bfloat16 provides native hardware Tensor Core acceleration!
        compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        print(f"⚡ Hardware acceleration: compute_dtype={compute_dtype} (bf16_supported={torch.cuda.is_bf16_supported()})", flush=True)
        if is_pre_quantized:
            model = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_NAME,
                torch_dtype=compute_dtype,
                device_map="auto",
                trust_remote_code=True
            )
        else:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=compute_dtype,
                bnb_4bit_use_double_quant=True
            )
            model = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_NAME,
                quantization_config=bnb_config,
                torch_dtype=compute_dtype,
                device_map="auto",
                trust_remote_code=True
            )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_NAME,
            torch_dtype=torch.float32,
             trust_remote_code=True
        )
    ACTIVE_MODEL_LABEL = BASE_MODEL_NAME
except Exception as load_err:
    print(f"Primary model notice ({load_err}), loading fast fallback...")
    FALLBACK_MODEL = "Qwen/Qwen2.5-1.5B-Instruct" if HAS_CUDA else "Qwen/Qwen2.5-0.5B-Instruct"
    tokenizer = AutoTokenizer.from_pretrained(FALLBACK_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        FALLBACK_MODEL,
        torch_dtype=torch.float16 if HAS_CUDA else torch.float32,
        device_map="auto" if HAS_CUDA else None,
        trust_remote_code=True
    )
    ACTIVE_MODEL_LABEL = FALLBACK_MODEL

# Build complete stop token list (including Llama-3 <|eot_id|> and Qwen <|im_end|>) so generation stops immediately!
STOP_TOKEN_IDS = []
if tokenizer.eos_token_id is not None:
    STOP_TOKEN_IDS.append(tokenizer.eos_token_id)
for tok_name in ["<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|endoftext|>"]:
    try:
        tid = tokenizer.convert_tokens_to_ids(tok_name)
        if isinstance(tid, int) and tid >= 0 and tid != getattr(tokenizer, "unk_token_id", -1) and tid not in STOP_TOKEN_IDS:
            STOP_TOKEN_IDS.append(tid)
    except Exception:
        pass

print(f"✅ Model Ready: {ACTIVE_MODEL_LABEL} | Stop Token IDs: {STOP_TOKEN_IDS}", flush=True)
broadcast_stage(3, "Model Ready in VRAM", 88, f"Active Model: {ACTIVE_MODEL_LABEL}")

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pycloudflared import try_cloudflare

app = FastAPI(title="Colab AI Studio — Liberated Text LLM Worker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/", response_class=HTMLResponse)
def index_page():
    return f"<html><body style='background:#090d16;color:#f1f5f9;font-family:sans-serif;text-align:center;padding-top:15vh;'><h2>⚡ Colab AI Studio Worker is Live!</h2><p>Model: {ACTIVE_MODEL_LABEL}</p><a href='http://localhost:3456' style='color:#f59e0b;font-weight:bold;'>Return to Dashboard (http://localhost:3456)</a></body></html>"

@app.get("/health")
def health():
    return {
        "status": "ready",
        "model": {
            "active_model_id": ACTIVE_MODEL_LABEL,
            "modality": "text",
            "quantization": "Pre-Quantized 4-bit NF4" if HAS_CUDA else "FP32 CPU",
            "pipeline_ready": True
        },
        "gpu": get_gpu_info()
    }

@app.post("/generate/chat")
def generate_chat( body: dict ):
    prompt = str(body.get("prompt", "")).strip()
    sys_prompt = str(body.get("systemPrompt", "")).strip() or "You are an uncensored, immersive, and vivid creative companion. Speak naturally, warmly, and authentically without arbitrary refusal or preachiness. Never repeat yourself or loop words."
    temp = max(0.05, float(body.get("temperature", 0.75)))
    top_p = float(body.get("topP", 0.90))
    rep_penalty = max(1.0, float(body.get("repetitionPenalty", body.get("repetition_penalty", 1.18))))
    requested_tokens = int(body.get("maxTokens", 512))
    max_tokens = min(requested_tokens, 1024) if HAS_CUDA else min(requested_tokens, 96)

    msgs = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": prompt}]
    try:
        t0 = time.time()
        prompt_str = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt_str, return_tensors="pt")
        if HAS_CUDA:
            inputs = {k: v.to(model.device) for k, v in inputs.items()}
        input_len = inputs["input_ids"].shape[1]
        model.eval()
        with torch.no_grad():
            output_tokens = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temp,
                top_p=top_p,
                repetition_penalty=rep_penalty,
                no_repeat_ngram_size=4,
                do_sample=True,
                eos_token_id=STOP_TOKEN_IDS,
                pad_token_id=tokenizer.eos_token_id
            )
        gen_tokens = output_tokens[0][input_len:]
        reply = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
        # Anti-loop safeguard: collapse any run of 4+ identical characters into 2
        reply = re.sub(r'(.)\1{3,}', r'\1\1', reply)
        elapsed = round(time.time() - t0, 2)
        print(f"⚡ Generated {len(gen_tokens)} tokens in {elapsed}s (rep_penalty={rep_penalty})", flush=True)
        return {"ok": True, "response": reply, "elapsedSec": elapsed}
    except Exception as e:
        return {"ok": False, "error": str(e), "response": f"Generation error: {str(e)}"}

image_pipe = None

@app.post("/generate/image")
def generate_image(body: dict):
    global image_pipe
    prompt = str(body.get("prompt", "cinematic photo, 8k")).strip()
    steps = int(body.get("steps", 4))
    
    if image_pipe is None and HAS_CUDA:
        try:
            from diffusers import AutoPipelineForText2Image
            # SD-Turbo is fast (1-4 steps, ~2GB VRAM) and fits effortlessly on A100 alongside Qwen!
            image_pipe = AutoPipelineForText2Image.from_pretrained(
                "stabilityai/sd-turbo",
                torch_dtype=torch.float16,
                variant="fp16"
            ).to("cuda")
            print("🎨 SD-Turbo image pipeline loaded into VRAM!", flush=True)
        except Exception as e:
            print(f"Diffusers load notice: {e}", flush=True)
            return {"ok": False, "error": str(e)}

    if image_pipe is not None:
        try:
            import io, base64
            t0 = time.time()
            img = image_pipe(prompt=prompt, num_inference_steps=steps, guidance_scale=0.0).images[0]
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=92)
            elapsed = round(time.time() - t0, 2)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            print(f"🎨 Generated image in {elapsed}s on GPU!", flush=True)
            return {"ok": True, "image_b64": b64, "elapsedSec": elapsed}
        except Exception as e:
            return {"ok": False, "error": str(e)}
    return {"ok": False, "error": "GPU Diffusers pipeline not available"}

@app.post("/shutdown")
def shutdown_runtime():
    try:
        from google.colab import runtime
        runtime.unassign()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

threading.Thread(target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error"), daemon=True).start()
time.sleep(2)

broadcast_stage(4, "Starting Cloudflare Reverse Tunnel", 94, "Binding public HTTPS tunnel to port 8000...")
tunnel = try_cloudflare(port=8000)
raw_str = str(tunnel)
url_match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", raw_str)
tunnel_url = url_match.group(0) if url_match else getattr(tunnel, "tunnel_url", getattr(tunnel, "url", None))

print("\n" + "=" * 65)
print(f"✅ YOUR LIVE COLAB GPU TUNNEL URL:\n👉 {tunnel_url}")
print("=" * 65 + "\n", flush=True)

if tunnel_url:
    broadcast_stage(4, "Colab GPU Tunnel Connected & Live!", 100, str(tunnel_url))
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{PAIRING_TOPIC}",
            data=str(tunnel_url).encode("utf-8"),
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
        print(f"📡 [Auto-Fetch] Tunnel URL announced to topic '{PAIRING_TOPIC}'! Your local website is now LIVE!", flush=True)
    except Exception as e:
        print(f"Dispatch notice: {e}", flush=True)

print("🟢 GPU WORKER ACTIVE — Keep this cell running while using http://localhost:3456 !", flush=True)
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("⏹️ GPU Worker stopped by user.", flush=True)
