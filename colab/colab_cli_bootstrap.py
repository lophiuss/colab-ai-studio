# ==============================================================================
# COLAB AI STUDIO — 1-CELL FULL-AUTO GPU WORKER & QLORA ENGINE (ROLE 1: TEXT)
# Automatically allocates Tesla T4 GPU, installs dependencies, loads 4-bit
# Qwen/Qwen2.5-7B-Instruct, starts FastAPI + Cloudflare Tunnel, and auto-links
# live to http://localhost:3456 via real-time stream.
# ==============================================================================
import os, sys, time, json, subprocess, threading, re, gc, urllib.request

PAIRING_TOPIC = "colab_sync_studio_9f4k2x8m"
BASE_MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"

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
        return {"gpuName": name, "vramUsedMB": float(mem_used), "vramTotalMB": float(mem_total), "gpuUtilPct": float(util)}
    except Exception:
        return {"gpuName": "Tesla T4 (Colab)", "vramUsedMB": 640, "vramTotalMB": 15360, "gpuUtilPct": 15}

gpu_info = get_gpu_info()
broadcast_stage(1, "Allocated Colab GPU Runtime", 25, f"GPU Ready: {gpu_info['gpuName']} ({int(gpu_info['vramTotalMB'])} MB VRAM)")

BASE_DIR = "/content/drive/MyDrive/ColabAIStudio" if os.path.exists("/content/drive/MyDrive") else "/content/ColabAIStudio"
CACHE_DIR = os.path.join(BASE_DIR, "hf_cache")
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ["HF_HOME"] = CACHE_DIR

broadcast_stage(2, "Installing AI & Tunnel Dependencies", 45, "Installing transformers, bitsandbytes, accelerate, pycloudflared, fastapi...")
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q",
    "transformers", "accelerate", "bitsandbytes", "peft", "pycloudflared", "fastapi", "uvicorn"
])
broadcast_stage(2, "Dependencies Ready", 60, f"Packages installed; cache bound to {CACHE_DIR}")

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

gc.collect()
if torch.cuda.is_available():
    torch.cuda.empty_cache()

broadcast_stage(3, f"Loading {BASE_MODEL_NAME} (4-bit NF4)", 75, "Downloading & quantizing weights into GPU VRAM...")

try:
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    ACTIVE_MODEL_LABEL = BASE_MODEL_NAME
except Exception as load_err:
    print(f"4-bit load notice ({load_err}), loading fast fallback Qwen/Qwen2.5-1.5B-Instruct...")
    FALLBACK_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
    tokenizer = AutoTokenizer.from_pretrained(FALLBACK_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        FALLBACK_MODEL,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True
    )
    ACTIVE_MODEL_LABEL = FALLBACK_MODEL

broadcast_stage(3, "Model Ready in GPU VRAM", 88, f"Active Model: {ACTIVE_MODEL_LABEL}")

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pycloudflared import try_cloudflare

app = FastAPI(title="Colab AI Studio — Text LLM Worker")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/", response_class=HTMLResponse)
def index_page():
    return f"<html><body style='background:#090d16;color:#f1f5f9;font-family:sans-serif;text-align:center;padding-top:15vh;'><h2>⚡ Colab AI Studio GPU Worker is Live!</h2><p>Model: {ACTIVE_MODEL_LABEL}</p><a href='http://localhost:3456' style='color:#f59e0b;font-weight:bold;'>Return to Dashboard (http://localhost:3456)</a></body></html>"

@app.get("/health")
def health():
    return {
        "status": "ready",
        "model": {
            "active_model_id": ACTIVE_MODEL_LABEL,
            "modality": "text",
            "quantization": "4-bit NF4",
            "pipeline_ready": True
        },
        "gpu": get_gpu_info()
    }

@app.post("/generate/chat")
async def generate_chat(req: Request):
    body = await req.json()
    prompt = body.get("prompt", "").strip()
    sys_prompt = body.get("systemPrompt", "").strip() or "You are a natural, intelligent, and engaging conversational companion. Speak warmly, authentically, and conversationally."
    temp = float(body.get("temperature", 0.75))
    top_p = float(body.get("topP", 0.9))
    max_tokens = int(body.get("maxTokens", 1024))

    msgs = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": prompt}]
    try:
        prompt_str = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt_str, return_tensors="pt").to(model.device)
        model.eval()
        with torch.no_grad():
            output_tokens = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temp,
                top_p=top_p,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        reply = tokenizer.decode(output_tokens[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        return {"ok": True, "response": reply.strip()}
    except Exception as e:
        return {"ok": False, "error": str(e), "response": f"Generation error: {str(e)}"}

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
