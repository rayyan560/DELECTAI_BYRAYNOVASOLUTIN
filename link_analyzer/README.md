Link Analyzer - FastAPI + yt-dlp
================================

Overview
--------
This service exposes a single endpoint to extract a direct media URL (raw .mp4/CDN link) from a social-video URL using yt-dlp as the extraction engine.

Quick start
-----------

1. Create a Python virtual environment and install:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Run the app locally:

```bash
uvicorn link_analyzer.main:app --host 0.0.0.0 --port 8000 --workers 1
```

3. POST JSON to `http://localhost:8000/api/analyze-link` with body:

```json
{ "url": "https://www.tiktok.com/@.../video/..." }
```

Response
--------
The endpoint returns a strictly typed JSON with keys: `status`, `message`, `platform`, `title`, `script_link`.

Production notes
----------------
- Run behind a reverse proxy (nginx) and scale using multiple uvicorn workers or containers.
- Consider adding caching (Redis) for repeated link extractions.
- Add logging/metrics and a hardened timeout at the HTTP proxy level.

Proxy support
-------------
The service supports a per-request proxy via the `X-Proxy` request header (for admin-only routes). In production, inject proxy settings centrally instead of allowing arbitrary proxies from clients.

Security
--------
- Use rotating user agents (configured inside the app) to reduce fingerprinting.
- Keep the server stateless; add request throttling/rate-limiting at reverse proxy or API gateway.
