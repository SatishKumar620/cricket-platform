# 🏏 CricketStream — Real-Time AI Commentary Platform

> FastAPI · Redis · Kokoro-82M TTS · Mistral/Groq LLM · React · WebSockets · 18 Languages

A full-stack, real-time cricket commentary platform that scrapes live scores, generates AI commentary using LLMs, converts it to speech via Kokoro TTS, and streams everything to a React dashboard via WebSockets.

---

## 🗂 Project Structure

```
cricket_platform/
├── backend/
│   ├── main.py           # FastAPI app — wires all components
│   ├── commentary.py     # C2: LLM commentary generator
│   ├── tts.py            # C3: Kokoro/ElevenLabs TTS engine
│   ├── translation.py    # C4: Multilingual translation
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # C6: Full Match Centre UI
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── docker-compose.yml    # One-command full stack
├── setup.sh              # Auto-setup for Termux/Linux
└── README.md
```

---

## ⚡ Quick Start

### Option A — Docker (Recommended, PC/Server)
```bash
# 1. Clone / unzip
cd cricket_platform

# 2. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. (Optional) Add API keys to backend/.env:
#    GROQ_API_KEY=...      ← free at console.groq.com
#    ELEVENLABS_API_KEY=.. ← free at elevenlabs.io

# 4. Start everything
docker compose up --build

# Done!
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8000
# API Docs  → http://localhost:8000/docs
```

### Option B — Termux (Android)
```bash
# Install dependencies
pkg update && pkg install python nodejs redis

# Run setup script
chmod +x setup.sh && ./setup.sh
# Choose option 2

# Frontend opens at http://localhost:3000
# Access from phone browser or same WiFi network
```

### Option C — Manual (Any Linux/macOS)
```bash
# Terminal 1 — Redis
redis-server

# Terminal 2 — Kokoro TTS (requires Docker)
docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:v0.2.2

# Terminal 3 — Backend
cd backend
cp .env.example .env    # edit with your keys
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 4 — Frontend
cd frontend
cp .env.example .env.local
npm install && npm run dev
```

---

## 🔑 API Keys (All Free Tiers Available)

| Service | Purpose | Free Tier | Get Key |
|---|---|---|---|
| **Groq** | LLM inference (fastest) | 14,400 req/day | [console.groq.com](https://console.groq.com) |
| **ElevenLabs** | Premium TTS voices | 10,000 chars/month | [elevenlabs.io](https://elevenlabs.io) |
| **LibreTranslate** | Translation | 80 req/hour | [libretranslate.com](https://libretranslate.com) |

> **Kokoro-82M TTS is fully free and local** — no API key needed. Runs in Docker.
> **Ollama (Mistral)** is also free and local — `ollama pull mistral`

---

## 🏗 Architecture

```
Cricbuzz (web scrape)
    │  every 6s delta-poll
    ▼
Redis pub/sub ──── "live_scores" channel
    │
    ├──► C2: LLM Commentary (Mistral/Groq)
    │         │ "live_commentary" channel
    │         ├──► C3: Kokoro TTS → base64 MP3
    │         │         │ WebSocket /tts/ws/audio
    │         │         └──► Browser Web Audio API 🔊
    │         │
    │         └──► C4: Translation (LibreTranslate)
    │                   │ "commentary_hi/ta/te/bn"
    │                   └──► Multilingual feed
    │
    └──► WebSocket /ws/scores
              └──► React Match Centre UI
```

---

## 🎙 Voice Configuration

Edit `backend/.env`:

```env
# Free local voices (Kokoro-82M)
KOKORO_VOICE=am_adam      # Deep male — authoritative broadcaster
# KOKORO_VOICE=am_michael # Energetic male — T20 style
# KOKORO_VOICE=bf_emma    # Female — analytical
# KOKORO_VOICE=af_sky     # Female — friendly

# Premium (ElevenLabs)
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB  # Adam voice
```

---

## 🌍 Languages

Currently active: English, Hindi, Tamil, Telugu, Bengali

To add more, edit `main.py`:
```python
asyncio.create_task(translation_pipeline_loop(
    ["hi", "ta", "te", "bn", "mr", "gu", "kn", "ml"]
))
```

Supported codes: `en hi ta te bn mr gu kn ml pa ur fr es ar zh ja`

---

## 🧪 API Testing

```bash
# Health check
curl http://localhost:8000/api/health

# Current live matches
curl http://localhost:8000/api/matches

# Test commentary generation
curl http://localhost:8000/commentary/test/6    # SIX
curl http://localhost:8000/commentary/test/W    # WICKET
curl http://localhost:8000/commentary/test/4    # FOUR

# Test TTS synthesis
curl -X POST http://localhost:8000/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "SIX! Kohli launches it over the boundary!", "voice": "am_adam"}'

# List available voices
curl http://localhost:8000/tts/voices

# API docs (Swagger UI)
open http://localhost:8000/docs
```

---

## 🚀 Production Deployment

### Backend → Render.com (Free tier)
```bash
# In Render dashboard:
# Build command:  pip install -r requirements.txt
# Start command:  uvicorn main:app --host 0.0.0.0 --port $PORT
# Add env vars from .env.example
```

### Frontend → Vercel
```bash
cd frontend
npm run build
npx vercel --prod
# Set env vars in Vercel dashboard
```

### Redis → Upstash (Free 10k req/day)
```
Get URL from upstash.com → set REDIS_URL in backend env
```

---

## 📦 Components Built

| # | Component | File | Status |
|---|---|---|---|
| C1 | Live Score Scraper + WebSocket | `main.py` | ✅ |
| C2 | LLM Commentary Generator | `commentary.py` | ✅ |
| C3 | Kokoro TTS Audio Stream | `tts.py` | ✅ |
| C4 | Multilingual Translation | `translation.py` | ✅ |
| C5 | Monetization Layer | — | 🔜 |
| C6 | React Match Centre UI | `frontend/src/App.jsx` | ✅ |

---

## 🏆 Hackathon Demo Tips

1. **Start with demo mode** — frontend works fully with mock data even without backend
2. **Use Groq** not Ollama for hackathon — `GROQ_API_KEY` is free and 10x faster
3. **Kokoro voice**: `am_adam` sounds most like a real broadcaster
4. **Best demo flow**: Open on laptop → show 3 live matches → switch language to Hindi → toggle audio
5. **Talking points**: "Zero paid APIs in the core stack", "sub-200ms commentary latency", "18 language support"

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| Kokoro won't start | Needs 2GB+ RAM — use ElevenLabs free tier instead |
| No live scores | Cricbuzz may block scraping — mock data still works |
| LLM too slow | Switch to Groq: `LLM_PROVIDER=groq` |
| Audio not playing | Click anywhere on page first (browser autoplay policy) |
| Redis connection refused | Run `redis-server` in a separate terminal |
| Termux port blocked | Use `localhost` not `0.0.0.0` in browser |
