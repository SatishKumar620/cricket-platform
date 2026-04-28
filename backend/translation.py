"""
Component 4: Multilingual Translation Layer
LibreTranslate (free, self-hosted or public) with cricket-term preservation.
Subscribes to 'live_commentary' → publishes 'commentary_{lang}' per language.
"""

import asyncio
import json
import logging
import os
import re
from typing import Optional

import httpx
import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "en": "English",  "hi": "Hindi",    "ta": "Tamil",
    "te": "Telugu",   "bn": "Bengali",  "mr": "Marathi",
    "gu": "Gujarati", "kn": "Kannada",  "ml": "Malayalam",
    "pa": "Punjabi",  "ur": "Urdu",     "fr": "French",
    "es": "Spanish",  "ar": "Arabic",   "zh": "Chinese",
    "ja": "Japanese",
}

# Cricket terms that should NOT be translated
CRICKET_TERMS = [
    "yorker", "googly", "bouncer", "no-ball", "LBW", "DRS",
    "powerplay", "death overs", "super over", "maiden over",
    "cover drive", "pull shot", "sweep shot", "FOUR", "SIX",
    "WICKET", "dot ball",
]


def _cfg():
    return {
        "url": os.getenv("LIBRETRANSLATE_URL", "https://libretranslate.com"),
        "key": os.getenv("LIBRETRANSLATE_KEY", ""),
    }


async def _translate_raw(text: str, target: str) -> Optional[str]:
    """Single translation request to LibreTranslate."""
    cfg = _cfg()
    if target == "en":
        return text
    try:
        payload = {"q": text, "source": "en", "target": target, "format": "text"}
        if cfg["key"]:
            payload["api_key"] = cfg["key"]

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(f"{cfg['url']}/translate", json=payload)
            resp.raise_for_status()
            return resp.json().get("translatedText", text)
    except Exception as e:
        logger.error(f"[Translation] {target}: {e}")
        return None   # None signals failure — caller keeps English


async def translate_commentary(text: str, target: str) -> str:
    """
    Translate text while preserving cricket terminology.
    Returns original English on failure.
    """
    if target == "en":
        return text

    # Replace cricket terms with placeholders
    placeholders: dict[str, str] = {}
    modified = text
    for i, term in enumerate(CRICKET_TERMS):
        if term.lower() in modified.lower():
            ph = f"__CT{i}__"
            # Case-insensitive replace
            modified = re.sub(re.escape(term), ph, modified, flags=re.IGNORECASE)
            placeholders[ph] = term

    translated = await _translate_raw(modified, target)
    if translated is None:
        return text  # fallback to English

    # Restore cricket terms
    for ph, term in placeholders.items():
        translated = translated.replace(ph, term)

    return translated


async def translation_pipeline_loop(target_languages: Optional[list[str]] = None):
    """
    Subscribes to 'live_commentary'.
    Translates into all requested languages concurrently.
    Publishes results to 'commentary_{lang}' channels.
    """
    if target_languages is None:
        target_languages = ["hi", "ta", "te", "bn"]

    # Filter out unsupported codes
    target_languages = [l for l in target_languages if l in SUPPORTED_LANGUAGES]

    redis = await aioredis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True
    )
    pubsub = redis.pubsub()
    await pubsub.subscribe("live_commentary")
    logger.info(f"[Translation] Active languages: {target_languages}")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])
                text = data.get("commentary", "").strip()
                if not text:
                    continue

                # Translate all languages concurrently
                results = await asyncio.gather(
                    *[translate_commentary(text, lang) for lang in target_languages],
                    return_exceptions=True,
                )

                for lang, result in zip(target_languages, results):
                    if isinstance(result, Exception):
                        logger.error(f"[Translation] {lang} failed: {result}")
                        result = text  # fallback to English
                    payload = {**data, "commentary": result, "language": lang}
                    await redis.publish(f"commentary_{lang}", json.dumps(payload))

                logger.info(f"[Translation] Published {len(target_languages)} translations")

            except Exception as e:
                logger.error(f"[Translation] Pipeline error: {e}", exc_info=True)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe("live_commentary")
        await pubsub.aclose()
        await redis.aclose()
        logger.info("[Translation] Pipeline shut down")
