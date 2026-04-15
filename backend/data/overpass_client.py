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
    """
    Send a rate-limited POST request to the Overpass API with retries.

    Features:
    - waits between calls to avoid spamming the API
    - retries on failures and 429 rate-limit responses
    - raises a clear error if all retries fail
    """
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

            try:
                return response.json()
            except ValueError as exc:
                raise RuntimeError(
                    f"Overpass returned non-JSON response: {response.text[:200]}"
                ) from exc

        except requests.RequestException as exc:
            lastError = exc
            backoffTime = OVERPASS_BACKOFF_SECONDS * (retryIndex + 1)
            time.sleep(backoffTime)

    raise RuntimeError(
        f"Overpass request failed after {OVERPASS_MAX_RETRIES} retries: {lastError}"
    )