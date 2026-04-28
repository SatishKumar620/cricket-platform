"""
CricketStream — Main FastAPI Entry Point
Data source priority:
  1. CricketData.org API  (free, 100 req/day)
  2. CricAPI              (free, 100 req/day)
  3. Cricbuzz scraper     (no key needed)
  4. Mock data            (never breaks demo)

Run locally:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
With Docker:
  docker compose up --build
"""

import asyncio
import hashlib
import json
import logging
import os
import random
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import aiohttp
import redis.asyncio as aioredis
import uvicorn
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from commentary import router as commentary_router, commentary_pipeline_loop
from translation import translation_pipeline_loop
from tts import router as tts_router, tts_pipeline_loop

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ═════════════════════════════════════════════════════════════════════════════
#  Lifespan — MUST be defined before app = FastAPI(lifespan=lifespan)
# ═════════════════════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    _frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    if os.path.exists(_frontend_dist):
        app.mount(
            "/",
            StaticFiles(directory=_frontend_dist, html=True),
            name="frontend",
        )
        logger.info(f"Frontend served from {_frontend_dist}")

    logger.info("Starting CricketStream pipelines...")
    tasks = [
        asyncio.create_task(scrape_loop()),
        asyncio.create_task(commentary_pipeline_loop()),
        asyncio.create_task(tts_pipeline_loop()),
        asyncio.create_task(translation_pipeline_loop(["hi", "ta", "te", "bn"])),
    ]
    logger.info("All 4 pipeline tasks started ✓")
    logger.info(
        f"Data sources: "
        f"CricketData={'ON' if os.getenv('CRICKETDATA_KEY') else 'OFF'} | "
        f"CricAPI={'ON' if os.getenv('CRICAPI_KEY') else 'OFF'} | "
        f"Cricbuzz=ON | Mock=ON"
    )

    yield   # app runs here

    # ── Shutdown ──
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    global _redis
    if _redis:
        await _redis.aclose()
        logger.info("Redis connection closed")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CricketStream — Real-Time Commentary Platform",
    version="1.0.0",
    description="FastAPI + Redis + LLM + TTS cricket platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers MUST be registered before StaticFiles mount
app.include_router(commentary_router)
app.include_router(tts_router)


# ── Redis ─────────────────────────────────────────────────────────────────────
_redis: Optional[aioredis.Redis] = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


# ═════════════════════════════════════════════════════════════════════════════
#  NORMALISED MATCH SCHEMA
#  Every source (API or scraper) must produce this shape so that
#  commentary.py can consume it without branching.
# ═════════════════════════════════════════════════════════════════════════════
# {
#   "id":          str          — stable hash of match title
#   "title":       str          — "IND vs AUS • 2nd Test"
#   "scores":      list[str]    — ["342/6 (87.4 ov)", "289 (94.0 ov)"]
#   "status":      str          — "India need 47 runs"
#   "lastBall":    str          — "4" | "6" | "W" | "0" | "1" | "Wd" | "Nb"
#   "ballHistory": list[str]    — last 10 balls, newest first
#   "batter1":     {"name": str, "runs": int, "balls": int}
#   "batter2":     {"name": str, "runs": int, "balls": int}
#   "bowler":      {"name": str, "wkts": int, "runs": int, "overs": str}
#   "source":      str          — "cricketdata" | "cricapi" | "cricbuzz" | "mock"
#   "ts":          str          — ISO datetime
# }

def _make_id(title: str) -> str:
    return hashlib.md5(title.encode()).hexdigest()[:8]

def _now() -> str:
    return datetime.utcnow().isoformat()


# ═════════════════════════════════════════════════════════════════════════════
#  SOURCE 1 — CricketData.org API
#  Free: 100 req/day  →  poll every 15 min (96 req/day)
#  Key:  CRICKETDATA_KEY in .env
#  Docs: https://cricketdata.org/documentation
# ═════════════════════════════════════════════════════════════════════════════
CRICKETDATA_KEY      = os.getenv("CRICKETDATA_KEY", "")
CRICKETDATA_LIVE_URL = "https://api.cricketdata.org/cricket/v1/currentMatches"
CRICKETDATA_DETAIL   = "https://api.cricketdata.org/cricket/v1/match-scorecard"

def _normalize_cricketdata(match: dict) -> Optional[dict]:
    """Convert CricketData.org match object → normalised schema."""
    try:
        teams  = match.get("teams", [])
        t1     = teams[0] if len(teams) > 0 else {}
        t2     = teams[1] if len(teams) > 1 else {}
        title  = f"{t1.get('name','TBA')} vs {t2.get('name','TBA')}"
        series = match.get("series", {}).get("name", "")
        if series:
            title = f"{title} • {series}"

        scores = []
        for t in [t1, t2]:
            innings = t.get("innings", [])
            if innings:
                inn = innings[-1]
                scores.append(
                    f"{t.get('name','?')} {inn.get('runs','?')}/{inn.get('wickets','?')} "
                    f"({inn.get('overs','?')} ov)"
                )

        # Ball-by-ball data
        batting  = match.get("batting", [])
        bowling  = match.get("bowling", [])
        b1       = batting[0] if len(batting) > 0 else {}
        b2       = batting[1] if len(batting) > 1 else {}
        bwl      = bowling[0] if bowling else {}

        # Last ball from recent commentary string if present
        recent   = match.get("recentBalls", [])
        last_ball = str(recent[0]) if recent else "1"
        # Map API ball codes → our codes
        ball_map = {"W": "W", "4": "4", "6": "6", "0": "0",
                    "wd": "Wd", "nb": "Nb", "1": "1", "2": "2", "3": "3"}
        last_ball = ball_map.get(str(last_ball).lower(), "1")

        return {
            "id":          _make_id(title),
            "title":       title,
            "scores":      scores or ["—"],
            "status":      match.get("status", "Live"),
            "lastBall":    last_ball,
            "ballHistory": [ball_map.get(str(b).lower(), "1") for b in (recent[:10] if recent else ["1"])],
            "batter1":     {
                "name":  b1.get("batsman", {}).get("name", "Batter 1"),
                "runs":  int(b1.get("r", 0)),
                "balls": int(b1.get("b", 0)),
            },
            "batter2":     {
                "name":  b2.get("batsman", {}).get("name", "Batter 2"),
                "runs":  int(b2.get("r", 0)),
                "balls": int(b2.get("b", 0)),
            },
            "bowler":      {
                "name":  bwl.get("bowler", {}).get("name", "Bowler"),
                "wkts":  int(bwl.get("w", 0)),
                "runs":  int(bwl.get("r", 0)),
                "overs": str(bwl.get("o", "0.0")),
            },
            "source": "cricketdata",
            "ts":     _now(),
        }
    except Exception as e:
        logger.error(f"[CricketData] Normalise error: {e}", exc_info=True)
        return None


async def fetch_cricketdata(session: aiohttp.ClientSession) -> list[dict]:
    if not CRICKETDATA_KEY:
        return []
    try:
        async with session.get(
            CRICKETDATA_LIVE_URL,
            params={"apikey": CRICKETDATA_KEY, "offset": 0},
            timeout=aiohttp.ClientTimeout(total=12),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                raw_matches = data.get("data", [])
                results = []
                for m in raw_matches[:5]:
                    norm = _normalize_cricketdata(m)
                    if norm:
                        results.append(norm)
                logger.info(f"[CricketData] Fetched {len(results)} matches")
                return results
            elif resp.status == 429:
                logger.warning("[CricketData] Rate limit hit (100/day)")
            else:
                logger.warning(f"[CricketData] HTTP {resp.status}")
    except Exception as e:
        logger.error(f"[CricketData] Error: {e}")
    return []


# ═════════════════════════════════════════════════════════════════════════════
#  SOURCE 2 — CricAPI
#  Free: 100 req/day  →  used as fallback
#  Key:  CRICAPI_KEY in .env
#  Docs: https://cricapi.com/
# ═════════════════════════════════════════════════════════════════════════════
CRICAPI_KEY      = os.getenv("CRICAPI_KEY", "")
CRICAPI_LIVE_URL = "https://api.cricapi.com/v1/currentMatches"
CRICAPI_SCORE    = "https://api.cricapi.com/v1/match-scorecard"

def _normalize_cricapi(match: dict) -> Optional[dict]:
    """Convert CricAPI match object → normalised schema."""
    try:
        name   = match.get("name", "Live Match")
        teams  = match.get("teams", [])
        t1_name = teams[0] if len(teams) > 0 else "Team 1"
        t2_name = teams[1] if len(teams) > 1 else "Team 2"

        # Score array: [{"r":342,"w":6,"o":87.4,"inning":"IND Inning 1"}, ...]
        score_arr = match.get("score", [])
        scores = []
        for s in score_arr:
            inning = s.get("inning", "")
            team   = inning.split(" ")[0] if inning else "?"
            scores.append(
                f"{team} {s.get('r','?')}/{s.get('w','?')} ({s.get('o','?')} ov)"
            )

        status = match.get("status", "Live")

        # CricAPI doesn't always provide ball-by-ball — generate from score delta
        last_ball = "1"

        return {
            "id":          _make_id(name),
            "title":       name,
            "scores":      scores or ["—"],
            "status":      status,
            "lastBall":    last_ball,
            "ballHistory": ["1"],
            "batter1":     {"name": t1_name, "runs": 0, "balls": 0},
            "batter2":     {"name": t2_name, "runs": 0, "balls": 0},
            "bowler":      {"name": "Bowler", "wkts": 0, "runs": 0, "overs": "0.0"},
            "source":      "cricapi",
            "ts":          _now(),
        }
    except Exception as e:
        logger.error(f"[CricAPI] Normalise error: {e}", exc_info=True)
        return None


async def fetch_cricapi(session: aiohttp.ClientSession) -> list[dict]:
    if not CRICAPI_KEY:
        return []
    try:
        async with session.get(
            CRICAPI_LIVE_URL,
            params={"apikey": CRICAPI_KEY, "offset": 0},
            timeout=aiohttp.ClientTimeout(total=12),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if not data.get("status") == "success":
                    logger.warning(f"[CricAPI] Bad status: {data.get('status')}")
                    return []
                raw_matches = data.get("data", [])
                results = []
                for m in raw_matches[:5]:
                    norm = _normalize_cricapi(m)
                    if norm:
                        results.append(norm)
                logger.info(f"[CricAPI] Fetched {len(results)} matches")
                return results
            elif resp.status == 429:
                logger.warning("[CricAPI] Rate limit hit")
            else:
                logger.warning(f"[CricAPI] HTTP {resp.status}")
    except Exception as e:
        logger.error(f"[CricAPI] Error: {e}")
    return []


# ═════════════════════════════════════════════════════════════════════════════
#  SOURCE 3 — Cricbuzz HTML scraper (no key needed)
# ═════════════════════════════════════════════════════════════════════════════
CRICBUZZ_LIVE = "https://www.cricbuzz.com/cricket-match/live-scores"
_SCRAPER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def _parse_cricbuzz(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    matches = []
    cards = soup.select(".cb-lv-scrs-col") or soup.select(".cb-scrs-wrp")
    for card in cards[:5]:
        try:
            title_el  = card.select_one(".cb-lv-scrs-well-live, .cb-lv-scr-mtch-hdr")
            score_els = card.select(".cb-lv-scrs-well-batsmen, .cb-lv-scr-srs")
            status_el = card.select_one(".cb-lv-scrs-well-btn, .cb-text-live")
            bat_els   = card.select(".cb-lv-scrs-well-batsmen .cb-font-16")
            bowl_el   = card.select_one(".cb-lv-scrs-well-batsmen .cb-font-12")

            title = title_el.get_text(strip=True) if title_el else "Live Match"
            scores = [el.get_text(strip=True) for el in score_els]

            # Try to extract batter names from score strings
            b1_name = bat_els[0].get_text(strip=True) if len(bat_els) > 0 else "Batter 1"
            b2_name = bat_els[1].get_text(strip=True) if len(bat_els) > 1 else "Batter 2"
            bowl_name = bowl_el.get_text(strip=True) if bowl_el else "Bowler"

            matches.append({
                "id":          _make_id(title),
                "title":       title,
                "scores":      scores or ["—"],
                "status":      status_el.get_text(strip=True) if status_el else "Live",
                "lastBall":    "1",
                "ballHistory": ["1"],
                "batter1":     {"name": b1_name, "runs": 0, "balls": 0},
                "batter2":     {"name": b2_name, "runs": 0, "balls": 0},
                "bowler":      {"name": bowl_name, "wkts": 0, "runs": 0, "overs": "0.0"},
                "source":      "cricbuzz",
                "ts":          _now(),
            })
        except Exception:
            continue
    return matches


async def fetch_cricbuzz(session: aiohttp.ClientSession) -> list[dict]:
    try:
        async with session.get(
            CRICBUZZ_LIVE,
            headers=_SCRAPER_HEADERS,
            timeout=aiohttp.ClientTimeout(total=12),
            allow_redirects=True,
        ) as resp:
            if resp.status == 200:
                html = await resp.text()
                matches = _parse_cricbuzz(html)
                logger.info(f"[Cricbuzz] Scraped {len(matches)} matches")
                return matches
            else:
                logger.warning(f"[Cricbuzz] HTTP {resp.status}")
    except Exception as e:
        logger.error(f"[Cricbuzz] Error: {e}")
    return []


# ═════════════════════════════════════════════════════════════════════════════
#  SOURCE 4 — Mock data (always available, simulates live ball-by-ball)
# ═════════════════════════════════════════════════════════════════════════════
_BALLS = ["0", "1", "1", "1", "2", "4", "4", "6", "W", "Wd"]
_BALL_HISTORY: dict[str, list[str]] = {}

def _get_mock_matches() -> list[dict]:
    """Static match data with randomised ball simulation."""
    matches_def = [
        {
            "id": "mock0001",
            "title": "IND vs AUS • 2nd Test • Day 3",
            "scores": ["IND 342/6 (87.4 ov)", "AUS 289 (94.0 ov)"],
            "status": "India need 47 runs • 3 wkts remaining",
            "batter1": {"name": "R. Jadeja", "runs": 54, "balls": 71},
            "batter2": {"name": "J. Bumrah",  "runs": 8,  "balls": 14},
            "bowler":  {"name": "J. Hazlewood", "wkts": 3, "runs": 67, "overs": "22.4"},
        },
        {
            "id": "mock0002",
            "title": "ENG vs SA • 1st ODI",
            "scores": ["ENG 187/3 (32.0 ov)", "SA — (Yet to bat)"],
            "status": "England batting • 50-over match",
            "batter1": {"name": "J. Root",   "runs": 78, "balls": 91},
            "batter2": {"name": "B. Stokes", "runs": 22, "balls": 19},
            "bowler":  {"name": "K. Rabada", "wkts": 2, "runs": 41, "overs": "8.0"},
        },
    ]
    result = []
    for m in matches_def:
        mid = m["id"]
        if mid not in _BALL_HISTORY:
            _BALL_HISTORY[mid] = ["1", "0", "4", "1", "2", "6", "0", "W", "1", "4"]
        # Simulate new ball each call
        new_ball = random.choice(_BALLS)
        _BALL_HISTORY[mid] = [new_ball] + _BALL_HISTORY[mid][:9]
        result.append({
            **m,
            "lastBall":    new_ball,
            "ballHistory": _BALL_HISTORY[mid],
            "source":      "mock",
            "ts":          _now(),
        })
    return result


# ═════════════════════════════════════════════════════════════════════════════
#  UNIFIED SCRAPE LOOP — 4-level fallback chain
# ═════════════════════════════════════════════════════════════════════════════

# Adaptive poll intervals (seconds) per source
# API sources: slower poll to preserve free quota
# Scraper: faster poll since no quota
_INTERVALS = {
    "cricketdata": int(os.getenv("CRICKETDATA_INTERVAL", "900")),  # 15 min → 96 req/day
    "cricapi":     int(os.getenv("CRICAPI_INTERVAL",     "900")),  # 15 min → 96 req/day
    "cricbuzz":    int(os.getenv("CRICBUZZ_INTERVAL",    "8")),    # 8 sec
    "mock":        int(os.getenv("MOCK_INTERVAL",        "5")),    # 5 sec
}

async def _publish_matches(r: aioredis.Redis, matches: list[dict]) -> int:
    """
    Publish matches that have changed to Redis.
    Returns count of delta-published matches.
    """
    published = 0
    for match in matches:
        key = f"match:{match['id']}"
        try:
            cached_raw = await r.get(key)
            cached = json.loads(cached_raw) if cached_raw else {}
            # Delta check: publish if scores OR lastBall changed
            if (cached.get("scores") != match["scores"] or
                    cached.get("lastBall") != match["lastBall"]):
                await r.set(key, json.dumps(match), ex=300)
                await r.publish("live_scores", json.dumps(match))
                logger.info(
                    f"[Scraper/{match['source']}] Delta → "
                    f"{match['title']} | Ball: {match['lastBall']}"
                )
                published += 1
        except Exception as e:
            logger.error(f"[Scraper] Publish error for {match.get('id')}: {e}")
    return published


async def scrape_loop():
    r = await get_redis()
    last_fetch: dict[str, float] = {s: 0.0 for s in _INTERVALS}
    fail_counts: dict[str, int]  = {s: 0 for s in _INTERVALS}

    # Track which source is currently active
    active_source = "mock"

    async with aiohttp.ClientSession() as session:
        while True:
            now = asyncio.get_event_loop().time()
            matches: list[dict] = []

            # ── Try Source 1: CricketData.org ──
            if (CRICKETDATA_KEY and
                    now - last_fetch["cricketdata"] >= _INTERVALS["cricketdata"] and
                    fail_counts["cricketdata"] < 3):
                matches = await fetch_cricketdata(session)
                if matches:
                    last_fetch["cricketdata"] = now
                    fail_counts["cricketdata"] = 0
                    active_source = "cricketdata"
                else:
                    fail_counts["cricketdata"] += 1
                    logger.warning(
                        f"[Scraper] CricketData failed "
                        f"({fail_counts['cricketdata']}/3 before skip)"
                    )

            # ── Try Source 2: CricAPI ──
            if (not matches and
                    CRICAPI_KEY and
                    now - last_fetch["cricapi"] >= _INTERVALS["cricapi"] and
                    fail_counts["cricapi"] < 3):
                matches = await fetch_cricapi(session)
                if matches:
                    last_fetch["cricapi"] = now
                    fail_counts["cricapi"] = 0
                    active_source = "cricapi"
                else:
                    fail_counts["cricapi"] += 1

            # ── Try Source 3: Cricbuzz scraper ──
            if (not matches and
                    now - last_fetch["cricbuzz"] >= _INTERVALS["cricbuzz"] and
                    fail_counts["cricbuzz"] < 5):
                matches = await fetch_cricbuzz(session)
                if matches:
                    last_fetch["cricbuzz"] = now
                    fail_counts["cricbuzz"] = 0
                    active_source = "cricbuzz"
                else:
                    fail_counts["cricbuzz"] += 1

            # ── Source 4: Mock data (always runs if everything else failed) ──
            if not matches:
                if active_source != "mock":
                    logger.warning("[Scraper] All sources failed — using mock data")
                    active_source = "mock"
                matches = _get_mock_matches()
                last_fetch["mock"] = now

            # Publish deltas
            if matches:
                count = await _publish_matches(r, matches)
                if count:
                    logger.debug(f"[Scraper] Published {count} delta(s) from {active_source}")

            # Sleep for shortest relevant interval
            await asyncio.sleep(4)   # tight loop — intervals are managed per-source above


# ═════════════════════════════════════════════════════════════════════════════
#  WebSocket: live scores
# ═════════════════════════════════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.append(ws)
        logger.info(f"[WS/scores] Client connected ({len(self._clients)} total)")

    def disconnect(self, ws: WebSocket):
        if ws in self._clients:
            self._clients.remove(ws)
        logger.info(f"[WS/scores] Client disconnected ({len(self._clients)} total)")

    async def broadcast(self, msg: str):
        dead = []
        for ws in self._clients:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients.remove(ws)


score_manager = ConnectionManager()


@app.websocket("/ws/scores")
async def scores_ws(websocket: WebSocket):
    await score_manager.connect(websocket)
    r = await get_redis()
    pubsub = r.pubsub()

    # Send current cached snapshot immediately on connect
    try:
        keys = await r.keys("match:*")
        if keys:
            snapshot = []
            for k in keys:
                raw = await r.get(k)
                if raw:
                    try:
                        snapshot.append(json.loads(raw))
                    except json.JSONDecodeError:
                        pass
            if snapshot:
                await websocket.send_text(
                    json.dumps({"type": "snapshot", "matches": snapshot})
                )
    except Exception as e:
        logger.error(f"[WS/scores] Snapshot error: {e}")

    # Stream live updates
    await pubsub.subscribe("live_scores")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(
                    json.dumps({"type": "update", "match": json.loads(message["data"])})
                )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[WS/scores] Stream error: {e}")
    finally:
        # Always clean up — both error and disconnect paths
        score_manager.disconnect(websocket)
        try:
            await pubsub.unsubscribe("live_scores")
            await pubsub.aclose()
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
#  REST endpoints
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/matches")
async def get_matches():
    r = await get_redis()
    keys = await r.keys("match:*")
    matches = []
    for k in keys:
        raw = await r.get(k)
        if raw:
            try:
                matches.append(json.loads(raw))
            except json.JSONDecodeError:
                pass
    return {"matches": matches, "count": len(matches)}


@app.get("/api/health")
async def health():
    r = await get_redis()
    redis_ok = False
    try:
        await r.ping()
        redis_ok = True
    except Exception:
        pass
    return {
        "status": "ok",
        "redis": redis_ok,
        "sources": {
            "cricketdata_configured": bool(CRICKETDATA_KEY),
            "cricapi_configured":     bool(CRICAPI_KEY),
            "cricbuzz_scraper":       "always_on",
            "mock_fallback":          "always_on",
        },
        "ts":      _now(),
        "version": "1.0.0",
    }


@app.get("/api/source-status")
async def source_status():
    """Shows which data sources are configured and their poll intervals."""
    return {
        "cricketdata": {
            "configured": bool(CRICKETDATA_KEY),
            "interval_sec": _INTERVALS["cricketdata"],
            "req_per_day": 86400 // _INTERVALS["cricketdata"],
        },
        "cricapi": {
            "configured": bool(CRICAPI_KEY),
            "interval_sec": _INTERVALS["cricapi"],
            "req_per_day": 86400 // _INTERVALS["cricapi"],
        },
        "cricbuzz": {
            "configured": True,
            "interval_sec": _INTERVALS["cricbuzz"],
            "note": "scraper — no API key needed",
        },
        "mock": {
            "configured": True,
            "interval_sec": _INTERVALS["mock"],
            "note": "always available as final fallback",
        },
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


@app.get("/api/test-cricketdata")
async def test_cricketdata():
    """Test if Render can reach cricketdata.org API."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.cricketdata.org/api/currentMatches",
                params={"apikey": CRICKETDATA_KEY, "offset": 0}
            )
            return {"status": r.status_code, "body": r.json()}
    except Exception as e:
        return {"error": str(e)}

# ── SCRAPER IMPORTS ──
import httpx
from bs4 import BeautifulSoup

SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
    "Referer": "https://www.google.com/",
}

CRICAPI_KEY = os.getenv("CRICAPI_KEY", "")

@app.get("/api/live")
async def live_scores():
    try:
        async with httpx.AsyncClient(headers=SCRAPE_HEADERS, timeout=8) as client:
            r = await client.get("https://www.cricbuzz.com/cricket-match/live-scores")
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "lxml")
                page = soup.find("div", class_="cb-col cb-col-100 cb-bg-white")
                if page:
                    matches = page.find_all("div", class_="cb-scr-wll-chvrn cb-lv-scrs-col")
                    if matches:
                        return {"source": "cricbuzz", "matches": [m.text.strip() for m in matches]}
    except Exception:
        pass
    if CRICAPI_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(f"https://api.cricapi.com/v1/currentMatches?apikey={CRICAPI_KEY}&offset=0")
                data = r.json()
                if data.get("status") == "success":
                    return {"source": "cricapi", "matches": data.get("data", [])}
        except Exception:
            pass
    return {"source": "none", "matches": [], "error": "All sources failed"}

@app.get("/api/schedule")
async def schedule():
    try:
        async with httpx.AsyncClient(headers=SCRAPE_HEADERS, timeout=8) as client:
            r = await client.get("https://www.cricbuzz.com/cricket-schedule/upcoming-series/international")
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "lxml")
                containers = soup.find_all("div", class_="cb-col-100 cb-col")
                matches = []
                for c in containers:
                    date = c.find("div", class_="cb-lv-grn-strip text-bold")
                    info = c.find("div", class_="cb-col-100 cb-col")
                    if date and info:
                        matches.append({"date": date.text.strip(), "details": info.text.strip()})
                if matches:
                    return {"source": "cricbuzz", "schedule": matches}
    except Exception:
        pass
    return {"source": "none", "schedule": [], "error": "Scraping blocked"}

@app.get("/api/player/{player_name}")
async def player_stats(player_name: str):
    if CRICAPI_KEY:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(f"https://api.cricapi.com/v1/players?apikey={CRICAPI_KEY}&offset=0&search={player_name}")
                data = r.json()
                if data.get("status") == "success" and data.get("data"):
                    player = data["data"][0]
                    pid = player.get("id")
                    r2 = await client.get(f"https://api.cricapi.com/v1/players_info?apikey={CRICAPI_KEY}&id={pid}")
                    info = r2.json()
                    return {"source": "cricapi", "player": info.get("data", player)}
        except Exception:
            pass
    return {"source": "none", "player": {}, "error": "Player lookup failed"}

import logging
logger = logging.getLogger(__name__)

@app.get("/api/live-debug")
async def live_debug():
    try:
        async with httpx.AsyncClient(headers=SCRAPE_HEADERS, timeout=10, follow_redirects=True) as client:
            r = await client.get("https://www.cricbuzz.com/cricket-match/live-scores")
            return {
                "status_code": r.status_code,
                "content_length": len(r.text),
                "first_500_chars": r.text[:500],
                "headers": dict(r.headers),
            }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

# ── ESPN CRICINFO FREE API ──
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/cricket"
ESPN_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Origin": "https://www.espncricinfo.com",
    "Referer": "https://www.espncricinfo.com/",
}

# League IDs
LEAGUES = {
    "ipl": "8676",
    "international": "8040",
    "bbl": "8644",
    "t20_wc": "8551",
}

@app.get("/api/espn/live")
async def espn_live(league: str = "ipl"):
    league_id = LEAGUES.get(league, "8676")
    try:
        async with httpx.AsyncClient(headers=ESPN_HEADERS, timeout=10) as client:
            r = await client.get(f"{ESPN_BASE}/{league_id}/scoreboard")
            if r.status_code != 200:
                return {"error": f"ESPN returned {r.status_code}"}
            data = r.json()
            events = data.get("events", [])
            matches = []
            for e in events:
                comp = e.get("competitions", [{}])[0]
                competitors = comp.get("competitors", [])
                team1 = competitors[0] if len(competitors) > 0 else {}
                team2 = competitors[1] if len(competitors) > 1 else {}
                matches.append({
                    "id": e.get("id"),
                    "name": e.get("name"),
                    "status": e.get("status", {}).get("type", {}).get("description"),
                    "venue": comp.get("venue", {}).get("fullName"),
                    "team1": {
                        "name": team1.get("team", {}).get("displayName"),
                        "score": team1.get("score"),
                        "winner": team1.get("winner", False),
                    },
                    "team2": {
                        "name": team2.get("team", {}).get("displayName"),
                        "score": team2.get("score"),
                        "winner": team2.get("winner", False),
                    },
                })
            return {"source": "espn", "league": league, "matches": matches}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/espn/schedule")
async def espn_schedule(league: str = "ipl"):
    league_id = LEAGUES.get(league, "8676")
    try:
        async with httpx.AsyncClient(headers=ESPN_HEADERS, timeout=10) as client:
            r = await client.get(f"{ESPN_BASE}/{league_id}/schedule")
            if r.status_code != 200:
                return {"error": f"ESPN returned {r.status_code}"}
            data = r.json()
            events = data.get("events", [])
            schedule = []
            for e in events:
                schedule.append({
                    "id": e.get("id"),
                    "name": e.get("name"),
                    "date": e.get("date"),
                    "status": e.get("status", {}).get("type", {}).get("description"),
                    "venue": e.get("competitions", [{}])[0].get("venue", {}).get("fullName"),
                })
            return {"source": "espn", "league": league, "schedule": schedule}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/espn/standings")
async def espn_standings(league: str = "ipl"):
    league_id = LEAGUES.get(league, "8676")
    try:
        async with httpx.AsyncClient(headers=ESPN_HEADERS, timeout=10) as client:
            r = await client.get(f"{ESPN_BASE}/{league_id}/standings")
            if r.status_code != 200:
                return {"error": f"ESPN returned {r.status_code}"}
            data = r.json()
            standings = []
            for group in data.get("standings", {}).get("entries", []):
                team = group.get("team", {})
                stats = {s["name"]: s["displayValue"] for s in group.get("stats", [])}
                standings.append({
                    "team": team.get("displayName"),
                    "played": stats.get("gamesPlayed"),
                    "wins": stats.get("wins"),
                    "losses": stats.get("losses"),
                    "points": stats.get("points"),
                    "nrr": stats.get("nrr"),
                })
            return {"source": "espn", "league": league, "standings": standings}
    except Exception as e:
        return {"error": str(e)}
