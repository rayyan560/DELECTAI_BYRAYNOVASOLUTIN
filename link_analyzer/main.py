import os
import random
import logging
import asyncio
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

try:
    from yt_dlp import YoutubeDL
    from yt_dlp.utils import DownloadError, ExtractorError
except Exception as e:
    raise RuntimeError("yt-dlp is required. Install with `pip install yt-dlp`.") from e

LOG = logging.getLogger("link_analyzer")
logging.basicConfig(level=logging.INFO)


class LinkRequest(BaseModel):
    url: HttpUrl


class LinkResponse(BaseModel):
    status: str
    message: Optional[str] = None
    platform: Optional[str] = None
    title: Optional[str] = None
    script_link: Optional[str] = None


app = FastAPI(title="Link Analyzer", version="1.0")

# Constrain concurrent extractions to avoid memory spikes
EXTRACTION_SEMAPHORE = asyncio.Semaphore(6)

# Minimal modern rotating user agents (extend as needed)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
]


def choose_user_agent() -> str:
    return random.choice(USER_AGENTS)


def _select_best_format(info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Prefer mp4 progressive or highest resolution https URL
    formats = info.get("formats") or []
    if not formats:
        # old-style extractor: direct url in info
        if info.get("url"):
            return {"url": info.get("url"), "ext": info.get("ext")}
        return None

    # Filter playable video formats
    mp4_candidates = [f for f in formats if (f.get("ext") == "mp4" or (f.get("vcodec") and f.get("acodec")))]
    if mp4_candidates:
        # pick the best by height then bitrate
        mp4_candidates.sort(key=lambda f: (f.get("height") or 0, f.get("tbr") or 0), reverse=True)
        return mp4_candidates[0]

    # fallback: pick best overall
    formats.sort(key=lambda f: (f.get("height") or 0, f.get("tbr") or 0), reverse=True)
    return formats[0]


async def run_extract(url: str, user_agent: str, proxy: Optional[str] = None, timeout: int = 15) -> Dict[str, Any]:
    opts = {
        # Do not download - only extract metadata and urls
        "skip_download": True,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": True,
        "cachedir": False,
        # try to prefer mp4 progressive where available
        "format": "best[ext=mp4]/best",
        # speed/network optimizations
        "socket_timeout": timeout,
    }
    if proxy:
        opts["proxy"] = proxy

    # inject headers
    opts["http_headers"] = {"User-Agent": user_agent}

    def _extract():
        with YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)

    try:
        # run blocking extraction in threadpool
        info = await asyncio.to_thread(_extract)
        return {"ok": True, "info": info}
    except Exception as e:
        LOG.exception("yt-dlp extraction failed")
        return {"ok": False, "error": str(e)}


@app.post("/api/analyze-link", response_model=LinkResponse)
async def analyze_link(req: LinkRequest, request: Request):
    url = req.url
    # optional: allow client to pass a proxy via header X-Proxy (for server admins)
    proxy = None
    if "x-proxy" in request.headers:
        proxy = request.headers.get("x-proxy")

    user_agent = choose_user_agent()

    # enforce extraction concurrency limit
    async with EXTRACTION_SEMAPHORE:
        result = await run_extract(str(url), user_agent=user_agent, proxy=proxy)

    if not result.get("ok"):
        # Map errors to safer messages
        message = result.get("error") or "Extraction failed"
        # Do not leak internal stack traces
        return JSONResponse(status_code=500, content={
            "status": "error",
            "message": message,
            "platform": None,
            "title": None,
            "script_link": None
        })

    info = result.get("info") or {}
    # If playlist-like, take first entry
    if info.get("entries"):
        entries = [e for e in info.get("entries") if e]
        if not entries:
            return {"status": "error", "message": "No playable entries found"}
        info = entries[0]

    # best candidate
    chosen = _select_best_format(info)
    script_link = chosen.get("url") if chosen else None
    title = info.get("title") or info.get("description") or ""

    # Determine platform (basic heuristics)
    platform = None
    u = str(url).lower()
    if "tiktok.com" in u:
        platform = "TikTok"
    elif "instagram.com" in u or "instagr.am" in u:
        platform = "Instagram"
    elif "youtube.com" in u or "youtu.be" in u:
        platform = "YouTube"
    elif "facebook.com" in u or "fb.watch" in u:
        platform = "Facebook"
    elif "x.com" in u or "twitter.com" in u:
        platform = "X/Twitter"

    if not script_link:
        return JSONResponse(status_code=502, content={
            "status": "error",
            "message": "Could not resolve a direct media URL for this link.",
            "platform": platform,
            "title": title,
            "script_link": None
        })

    return {
        "status": "success",
        "message": "OK",
        "platform": platform,
        "title": title,
        "script_link": script_link
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("link_analyzer.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), log_level="info")
