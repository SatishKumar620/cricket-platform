"""
Component 3: TTS Audio Engine
Kokoro-82M (local, free) + ElevenLabs (cloud, premium)
Subscribes to 'live_commentary' Redis channel → streams audio via WebSocket
"""

import asyncio
import base64
import json
import logging
import os
from datetime import datetime
from typing import Optional

import httpx
import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tts", tags=["tts"])

VOICE_PROFILES = {
    "am_adam":    {"label": "Adam (Authoritative)",  "style": "broadcast"},
    "am_michael": {"label": "Michael (Energetic)",   "style": "t20"},
    "bf_emma":    {"label": "Emma (Analytical)",     "style": "test"},
    "af_sky":     {"label": "Sky (Friendly)",        "style": "casual"},
}

# ── Read config at call-time (so .env is always respected) ───────────────────
def _cfg():
    return {
        "provider":         os.getenv("TTS_PROVIDER", "kokoro"),
        "kokoro_url":       os.getenv("KOKORO_URL", "http://localhost:8880"),
        "kokoro_voice":     os.getenv("KOKORO_VOICE", "am_adam"),
        "elevenlabs_key":   os.getenv("ELEVENLABS_API_KEY", ""),
        "elevenlabs_voice": os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB"),
    }


# ── WebSocket connection manager ──────────────────────────────────────────────
class AudioStreamManager:
    def __init__(self):
        self.clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.append(ws)
        logger.info(f"[TTS] Client connected. Total: {len(self.clients)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.clients:
            self.clients.remove(ws)
        logger.info(f"[TTS] Client disconnected. Total: {len(self.clients)}")

    async def broadcast_audio(self, payload: dict):
        dead = []
        msg = json.dumps(payload)
        for ws in self.clients:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.remove(ws)


audio_manager = AudioStreamManager()


# ── Kokoro TTS ────────────────────────────────────────────────────────────────
async def synthesize_kokoro(text: str, voice: str) -> Optional[bytes]:
    """
    Calls local Kokoro-FastAPI server.
    Start with: docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:v0.2.2
    """
    cfg = _cfg()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{cfg['kokoro_url']}/v1/audio/speech",
                json={
                    "model": "kokoro",
                    "input": text,
                    "voice": voice,
                    "response_format": "mp3",
                    "speed": 1.05,
                },
            )
            resp.raise_for_status()
            return resp.content
    except Exception as e:
        logger.error(f"[TTS] Kokoro error: {e}")
        return None


# ── ElevenLabs TTS ────────────────────────────────────────────────────────────
async def synthesize_elevenlabs(text: str, voice_id: str) -> Optional[bytes]:
    """ElevenLabs turbo TTS — free tier = 10k chars/month."""
    cfg = _cfg()
    if not cfg["elevenlabs_key"]:
        return None
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": cfg["elevenlabs_key"],
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_turbo_v2",
                    "voice_settings": {
                        "stability": 0.45,
                        "similarity_boost": 0.82,
                        "style": 0.35,
                        "use_speaker_boost": True,
                    },
                },
            )
            resp.raise_for_status()
            return resp.content
    except Exception as e:
        logger.error(f"[TTS] ElevenLabs error: {e}")
        return None


# ── Synthesis router with fallback chain ──────────────────────────────────────
async def synthesize(text: str, voice: Optional[str] = None) -> Optional[bytes]:
    cfg = _cfg()
    voice = voice or cfg["kokoro_voice"]
    # Truncate — ~280 chars ≈ 10s audio, keeps latency low
    text = text.strip()[:280]
    if not text:
        return None

    if cfg["provider"] == "elevenlabs" and cfg["elevenlabs_key"]:
        audio = await synthesize_elevenlabs(text, cfg["elevenlabs_voice"])
        if audio:
            return audio
        logger.warning("[TTS] ElevenLabs failed — falling back to Kokoro")

    return await synthesize_kokoro(text, voice)


# ── Redis consumer loop ───────────────────────────────────────────────────────
async def tts_pipeline_loop():
    """
    Subscribes to 'live_commentary' channel (written by commentary.py C2).
    Synthesizes each commentary → broadcasts base64 MP3 to all audio WebSocket clients.
    """
    cfg = _cfg()
    redis = await aioredis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True
    )
    pubsub = redis.pubsub()
    await pubsub.subscribe("live_commentary")
    logger.info("[TTS] Subscribed to live_commentary channel")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])
                text = data.get("commentary", "").strip()
                if not text:
                    continue

                voice = cfg["kokoro_voice"]
                logger.info(f"[TTS] Synthesizing ({voice}): {text[:60]}...")
                audio_bytes = await synthesize(text, voice)

                if audio_bytes:
                    await audio_manager.broadcast_audio({
                        "type": "audio",
                        "match_id": data.get("match_id", ""),
                        "match_title": data.get("match_title", ""),
                        "ball_result": data.get("ball_result", ""),
                        "commentary": text,
                        "language": data.get("language", "en"),
                        "audio_b64": base64.b64encode(audio_bytes).decode("utf-8"),
                        "format": "mp3",
                        "bytes": len(audio_bytes),
                        "ts": datetime.utcnow().isoformat(),
                    })
                    logger.info(f"[TTS] Broadcast {len(audio_bytes):,} bytes to {len(audio_manager.clients)} clients")
                else:
                    # Text-only fallback — UI still updates even without audio
                    await audio_manager.broadcast_audio({
                        "type": "text_only",
                        "match_id": data.get("match_id", ""),
                        "match_title": data.get("match_title", ""),
                        "ball_result": data.get("ball_result", ""),
                        "commentary": text,
                        "language": data.get("language", "en"),
                        "ts": datetime.utcnow().isoformat(),
                    })
                    logger.warning("[TTS] No audio produced — sent text_only fallback")

            except Exception as e:
                logger.error(f"[TTS] Pipeline error: {e}", exc_info=True)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe("live_commentary")
        await pubsub.aclose()
        await redis.aclose()
        logger.info("[TTS] Pipeline shut down")


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@router.websocket("/ws/audio")
async def audio_ws(websocket: WebSocket):
    await audio_manager.connect(websocket)
    try:
        # Keep connection alive; client sends pings
        while True:
            data = await websocket.receive_text()
            # Handle voice switch from frontend: {"action": "set_voice", "voice": "am_adam"}
            try:
                msg = json.loads(data)
                if msg.get("action") == "set_voice":
                    os.environ["KOKORO_VOICE"] = msg.get("voice", "am_adam")
                    await websocket.send_text(json.dumps({"type": "voice_changed", "voice": msg["voice"]}))
            except Exception:
                pass  # plain ping text — ignore
    except WebSocketDisconnect:
        audio_manager.disconnect(websocket)


# ── REST endpoints ────────────────────────────────────────────────────────────
@router.post("/synthesize")
async def synthesize_endpoint(payload: dict):
    """Direct synthesis — useful for testing and frontend voice preview."""
    text = payload.get("text", "").strip()
    voice = payload.get("voice") or _cfg()["kokoro_voice"]
    if not text:
        return JSONResponse({"error": "text is required"}, status_code=400)
    audio = await synthesize(text, voice)
    if not audio:
        return JSONResponse(
            {"error": "synthesis failed — check Kokoro/ElevenLabs connection"},
            status_code=503,
        )
    return {
        "audio_b64": base64.b64encode(audio).decode(),
        "format": "mp3",
        "bytes": len(audio),
        "voice": voice,
    }


@router.get("/voices")
async def list_voices():
    cfg = _cfg()
    return {
        "voices": VOICE_PROFILES,
        "active": cfg["kokoro_voice"],
        "provider": cfg["provider"],
    }


@router.get("/health")
async def tts_health():
    cfg = _cfg()
    kokoro_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{cfg['kokoro_url']}/health")
            kokoro_ok = r.status_code == 200
    except Exception:
        pass
    return {
        "provider": cfg["provider"],
        "kokoro_reachable": kokoro_ok,
        "elevenlabs_configured": bool(cfg["elevenlabs_key"]),
        "active_voice": cfg["kokoro_voice"],
        "connected_clients": len(audio_manager.clients),
    }
