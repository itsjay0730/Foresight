from __future__ import annotations

import time
from typing import Any

import requests

from config import (
    OVERPASS_API_URL,
    OVERPASS_BACKOFF_SECONDS,
    OVERPASS_MAX_RETRIES,
    OVERPASS_SLEEP_SECONDS,
    REQUEST_TIMEOUT,
)


_LAST_OVERPASS_CALL_AT = 0.0


def safeOverpassPost(query: str) -> dict[str, Any]:
    global _LAST_OVERPASS_CALL_AT

    currentTime = time.time()
    timeSinceLastCall = currentTime - _LAST_OVERPASS_CALL_AT

    if timeSinceLastCall < OVERPASS_SLEEP_SECONDS:
        time.sleep(OVERPASS_SLEEP_SECONDS - timeSinceLastCall)

    lastError: Exception | None = None

    for retryIndex in range(OVERPASS_MAX_RETRIES):
        try:
            response = requests.post(
                OVERPASS_API_URL,
                data=query.encode("utf-8"),
                timeout=REQUEST_TIMEOUT,
                headers={"Content-Type": "text/plain"},
            )

            _LAST_OVERPASS_CALL_AT = time.time()

            if response.status_code == 429:
                backoffTime = OVERPASS_BACKOFF_SECONDS * (retryIndex + 1)
                time.sleep(backoffTime)
                continue

            response.raise_for_status()
            return response.json()

        except Exception as exc:
            lastError = exc
            backoffTime = OVERPASS_BACKOFF_SECONDS * (retryIndex + 1)
            time.sleep(backoffTime)

    raise RuntimeError(f"Overpass request failed after retries: {lastError}")