"""
Component 2: LLM Commentary Generator
Ollama (local Mistral) or Groq (free cloud API)
Subscribes to 'live_scores' Redis → publishes to 'live_commentary'
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Optional

import httpx
import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import APIRouter
from pydantic import BaseModel

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commentary", tags=["commentary"])


# ── Config (read at call-time) ────────────────────────────────────────────────
def _cfg():
    return {
        "provider":     os.getenv("LLM_PROVIDER", "ollama"),
        "model":        os.getenv("LLM_MODEL", "mistral"),
        "base_url":     os.getenv("LLM_BASE_URL", "http://localhost:11434"),
        "groq_key":     os.getenv("GROQ_API_KEY", ""),
    }


# ── Pydantic models ───────────────────────────────────────────────────────────
class BallEvent(BaseModel):
    match_id: str
    match_title: str
    ball_result: str          # "4", "6", "W", "0", "1", "2", "Wd", "Nb"
    batter: str
    bowler: str
    batter_score: str         # e.g. "54(71)"
    team_score: str           # e.g. "342/6 in 87.4 overs"
    match_situation: str
    over_history: list[str] = []
    language: str = "en"


class CommentaryResponse(BaseModel):
    match_id: str
    ball_result: str
    commentary: str
    language: str
    style: str
    ts: str


# ── Prompt engineering ────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an elite cricket commentator with 20 years of experience 
broadcasting for BBC Sport, Star Sports, and Willow TV.

Rules:
1. Start with the ball outcome — FOUR!, SIX!, WICKET!, Dot ball, etc.
2. Use cricket-specific terms: cover drive, yorker, googly, outside off, 
   short of length, powerplay, death overs, strike rate, etc.
3. Reference match pressure, required rate, milestones where relevant.
4. Emotional calibration: dot ball = measured; wicket = high drama; six = explosive.
5. Exactly 2-3 sentences. Snappy, broadcast-ready.
6. ONE tactical insight per ball (field placement, shot selection, bowler strategy).
7. Output ONLY the commentary text. No labels, no preamble."""

BALL_CONTEXT = {
    "6": "maximum boundary — crowd erupts",
    "4": "boundary — clean timing or placement",
    "W": "WICKET — massive moment, high drama",
    "0": "dot ball — pressure building",
    "1": "single — strike rotation",
    "2": "two runs — smart running",
    "3": "three runs — excellent running between wickets",
    "Wd": "wide — bowler error, free run",
    "Nb": "no ball — free hit coming up",
}

def build_prompt(event: BallEvent) -> str:
    ball_ctx = BALL_CONTEXT.get(event.ball_result, "delivery")
    over_str = " | ".join(event.over_history) if event.over_history else "—"
    lang_note = ""
    if event.language == "hi":
        lang_note = "\nRespond in Hindi (Devanagari script)."
    elif event.language == "ta":
        lang_note = "\nRespond in Tamil script."
    elif event.language != "en":
        lang_note = f"\nRespond in {event.language}."

    return f"""Ball: {event.ball_result} ({ball_ctx})
Batter: {event.batter} — {event.batter_score}
Bowler: {event.bowler}
Team score: {event.team_score}
Situation: {event.match_situation}
Over so far: {over_str}
Match: {event.match_title}{lang_note}

Write the commentary now:"""


# ── LLM providers ─────────────────────────────────────────────────────────────
async def _call_ollama(prompt: str, cfg: dict) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{cfg['base_url']}/api/generate",
            json={
                "model": cfg["model"],
                "prompt": prompt,
                "system": SYSTEM_PROMPT,
                "stream": False,
                "options": {"temperature": 0.85, "top_p": 0.9, "num_predict": 150},
            },
        )
        resp.raise_for_status()
        return resp.json()["response"].strip()


async def _call_groq(prompt: str, cfg: dict) -> str:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {cfg['groq_key']}"},
            json={
                "model": "mixtral-8x7b-32768",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 150,
                "temperature": 0.85,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()


# ── Template fallback (zero dependency) ───────────────────────────────────────
_FALLBACK = {
    "6":  "SIX! {batter} sends it sailing over the boundary — the crowd erupts. {score}.",
    "4":  "FOUR! {batter} pierces the gap with precision. {score}.",
    "W":  "WICKET! {bowler} strikes — {batter} departs for {b_score}. {situation}.",
    "0":  "Dot ball. {bowler} beats {batter} on the outside edge. The pressure builds.",
    "1":  "Single taken. {batter} rotates the strike. {score}.",
    "2":  "Good running — two taken. {score}.",
    "Wd": "Wide from {bowler} — an unnecessary gift for the batting side.",
    "Nb": "No ball! Free hit coming up. {bowler} will be frustrated.",
}

def _fallback(event: BallEvent) -> str:
    tpl = _FALLBACK.get(event.ball_result, "{batter} plays the delivery. {score}.")
    return tpl.format(
        batter=event.batter, bowler=event.bowler,
        b_score=event.batter_score, score=event.team_score,
        situation=event.match_situation,
    )


# ── Main generate function ────────────────────────────────────────────────────
async def generate_commentary(event: BallEvent) -> str:
    cfg = _cfg()
    prompt = build_prompt(event)
    try:
        if cfg["provider"] == "groq" and cfg["groq_key"]:
            return await _call_groq(prompt, cfg)
        return await _call_ollama(prompt, cfg)
    except httpx.ConnectError:
        logger.warning(f"[Commentary] LLM unreachable ({cfg['provider']}) — using fallback")
        return _fallback(event)
    except Exception as e:
        logger.error(f"[Commentary] LLM error: {e}")
        return _fallback(event)


# ── Redis pipeline loop ───────────────────────────────────────────────────────
async def commentary_pipeline_loop():
    """
    Reads 'live_scores' (C1) → generates commentary → publishes to 'live_commentary' (→ C3 TTS).
    """
    redis = await aioredis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True
    )
    pubsub = redis.pubsub()
    await pubsub.subscribe("live_scores")
    logger.info("[Commentary] Subscribed to live_scores channel")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])

                # Safely extract nested fields from scraper payload
                batter1 = data.get("batter1") or {}
                bowler  = data.get("bowler")  or {}

                event = BallEvent(
                    match_id       = data.get("id", "unknown"),
                    match_title    = data.get("title", "Live Match"),
                    ball_result    = data.get("lastBall", "1"),
                    batter         = batter1.get("name", "Batter") if isinstance(batter1, dict) else str(batter1),
                    bowler         = bowler.get("name", "Bowler")  if isinstance(bowler,  dict) else str(bowler),
                    batter_score   = str(batter1.get("runs", "—")) if isinstance(batter1, dict) else "—",
                    team_score     = " ".join(data.get("scores", ["—"])),
                    match_situation= data.get("status", ""),
                    over_history   = (data.get("ballHistory") or [])[:6],
                    language       = "en",
                )

                commentary = await generate_commentary(event)
                payload = {
                    "match_id":     event.match_id,
                    "match_title":  event.match_title,
                    "ball_result":  event.ball_result,
                    "commentary":   commentary,
                    "language":     event.language,
                    "ts":           datetime.utcnow().isoformat(),
                }
                await redis.publish("live_commentary", json.dumps(payload))
                logger.info(f"[Commentary] Published: {commentary[:70]}...")

            except Exception as e:
                logger.error(f"[Commentary] Pipeline error: {e}", exc_info=True)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe("live_scores")
        await pubsub.aclose()
        await redis.aclose()
        logger.info("[Commentary] Pipeline shut down")


# ── REST endpoints ────────────────────────────────────────────────────────────
@router.post("/generate", response_model=CommentaryResponse)
async def generate_endpoint(event: BallEvent):
    commentary = await generate_commentary(event)
    return CommentaryResponse(
        match_id=event.match_id, ball_result=event.ball_result,
        commentary=commentary, language=event.language,
        style="broadcast", ts=datetime.utcnow().isoformat(),
    )


@router.get("/test/{ball_result}")
async def test_endpoint(ball_result: str):
    """Quick smoke-test: GET /commentary/test/6"""
    event = BallEvent(
        match_id="test", match_title="IND vs AUS • 2nd Test",
        ball_result=ball_result, batter="Virat Kohli", bowler="Pat Cummins",
        batter_score="78(91)", team_score="243/4 in 67.2 overs",
        match_situation="India trail by 102 runs with 6 wickets remaining",
        over_history=["1", "0", "4", "0", "2"],
    )
    commentary = await generate_commentary(event)
    return {"ball": ball_result, "commentary": commentary, "model": _cfg()["model"]}


@router.get("/health")
async def commentary_health():
    cfg = _cfg()
    llm_ok = False
    try:
        if cfg["provider"] == "groq" and cfg["groq_key"]:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get("https://api.groq.com/openai/v1/models",
                                     headers={"Authorization": f"Bearer {cfg['groq_key']}"})
                llm_ok = r.status_code == 200
        else:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{cfg['base_url']}/api/tags")
                llm_ok = r.status_code == 200
    except Exception:
        pass
    return {"provider": cfg["provider"], "model": cfg["model"], "llm_reachable": llm_ok}
