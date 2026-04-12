from __future__ import annotations

import time
from typing import Any

import requests

from config import (
    OVERPASS_API_URL,
    OVERPASS_SLEEP_SECONDS,
    OVERPASS_MAX_RETRIES,
    OVERPASS_BACKOFF_SECONDS,
    REQUEST_TIMEOUT,
)


_LAST_OVERPASS_CALL_AT = 0.0


def safeOverpassPost(query: str) -> dict[str, Any]:
    global _LAST_OVERPASS_CALL_AT

    now = time.time()
    elapsed = now - _LAST_OVERPASS_CALL_AT
    if elapsed < OVERPASS_SLEEP_SECONDS:
        time.sleep(OVERPASS_SLEEP_SECONDS - elapsed)

    last_error: Exception | None = None

    for attempt in range(OVERPASS_MAX_RETRIES):
        try:
            response = requests.post(
                OVERPASS_API_URL,
                data=query.encode("utf-8"),
                timeout=REQUEST_TIMEOUT,
                headers={"Content-Type": "text/plain"},
            )

            _LAST_OVERPASS_CALL_AT = time.time()

            if response.status_code == 429:
                wait_time = OVERPASS_BACKOFF_SECONDS * (attempt + 1)
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            return response.json()

        except Exception as exc:
            last_error = exc
            wait_time = OVERPASS_BACKOFF_SECONDS * (attempt + 1)
            time.sleep(wait_time)

    raise RuntimeError(f"Overpass request failed after retries: {last_error}")