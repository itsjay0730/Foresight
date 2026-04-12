from __future__ import annotations

import json
import os
import re
import time
from typing import Any

from dotenv import load_dotenv
from google import genai

load_dotenv(override=False)

MODEL_NAME = "gemini-2.5-flash-lite"

DEFAULT_AI_INSIGHTS = {
    "opportunityType": "Unknown Opportunity",
    "drivers": [
        "Insufficient signal",
        "Fallback analysis used",
        "Review raw plot data",
    ],
    "bestUse": [
        "Hold",
        "Further analysis",
        "Manual review",
    ],
    "confidence": "Low",
}

_ALLOWED_CONFIDENCE = {"Low", "Medium", "High"}


def _clean_env_value(value: str | None) -> str:
    if value is None:
        return ""

    cleaned = value.strip()

    if (
        (cleaned.startswith('"') and cleaned.endswith('"'))
        or (cleaned.startswith("'") and cleaned.endswith("'"))
    ):
        cleaned = cleaned[1:-1].strip()

    return cleaned


def _get_client():
    raw_api_key = os.getenv("GEMINI_API_KEY")
    api_key = _clean_env_value(raw_api_key)

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    os.environ["GEMINI_API_KEY"] = api_key

    print("[AI DEBUG] Using Gemini 2.5 Flash Lite")

    return genai.Client()


def _fallback_ai_insights() -> dict[str, Any]:
    return dict(DEFAULT_AI_INSIGHTS)


def _safe_json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


def buildPrompt(plot: dict[str, Any]) -> str:
    plot_json = _safe_json_dumps(plot)

    return f"""You are a real estate investment AI.

You are given full structured data:

{plot_json}

Analyze:
- demographics
- income
- crime
- permits
- population
- amenities
- schools
- zoning
- ownership
- valuation
- nearby POIs
- trends

Return ONLY valid JSON in exactly this shape:

{{
  "ai_insights": {{
    "opportunityType": "string",
    "drivers": [
      "string",
      "string",
      "string"
    ],
    "bestUse": [
      "string",
      "string",
      "string"
    ],
    "confidence": "Low | Medium | High"
  }}
}}

Rules:
- Use all data
- Send back JSON only
- No markdown
- No explanations
- Always include all fields
"""


def _extract_first_json_object(text: str) -> str | None:
    text = text.strip()
    if not text:
        return None

    if text.startswith("{") and text.endswith("}"):
        return text

    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, flags=re.DOTALL)
    if fenced:
        return fenced.group(1).strip()

    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    for idx in range(start, len(text)):
        ch = text[idx]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : idx + 1].strip()

    return None


def _sanitize_string_list(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback

    cleaned = []

    for item in value:
        if item is None:
            continue

        text = str(item).strip()

        if text:
            cleaned.append(text)

    if not cleaned:
        return fallback

    cleaned = cleaned[:3]

    while len(cleaned) < 3:
        cleaned.append(fallback[len(cleaned)])

    return cleaned


def _sanitize_ai_insights(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return _fallback_ai_insights()

    ai_insights = payload.get("ai_insights", payload)

    if not isinstance(ai_insights, dict):
        return _fallback_ai_insights()

    opportunity_type = str(
        ai_insights.get("opportunityType", DEFAULT_AI_INSIGHTS["opportunityType"])
    ).strip()

    if not opportunity_type:
        opportunity_type = DEFAULT_AI_INSIGHTS["opportunityType"]

    drivers = _sanitize_string_list(
        ai_insights.get("drivers"),
        DEFAULT_AI_INSIGHTS["drivers"],
    )

    best_use = _sanitize_string_list(
        ai_insights.get("bestUse"),
        DEFAULT_AI_INSIGHTS["bestUse"],
    )

    confidence = str(
        ai_insights.get("confidence", DEFAULT_AI_INSIGHTS["confidence"])
    ).strip()

    if confidence not in _ALLOWED_CONFIDENCE:
        confidence = DEFAULT_AI_INSIGHTS["confidence"]

    return {
        "opportunityType": opportunity_type,
        "drivers": drivers,
        "bestUse": best_use,
        "confidence": confidence,
    }


def generateAIInsights(plot: dict[str, Any], client=None) -> dict[str, Any]:
    client = client or _get_client()

    prompt = buildPrompt(plot)

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        raw_text = getattr(response, "text", "")

        print(f"[AI DEBUG] Response {plot.get('id')}:\n{raw_text}\n")

        json_text = _extract_first_json_object(raw_text)

        if not json_text:
            return _fallback_ai_insights()

        parsed = json.loads(json_text)

        return _sanitize_ai_insights(parsed)

    except Exception as exc:
        print(f"[generateAIInsights] Failed for plot {plot.get('id')}: {exc}")
        return _fallback_ai_insights()


def generateAIInsightsAll(
    data: list[dict[str, Any]],
    sleep_seconds: float = 0.0,
    limit: int | None = None,
) -> list[dict[str, Any]]:

    client = _get_client()

    results: list[dict[str, Any]] = []

    items = data if limit is None else data[:limit]

    total = len(items)

    if total == 0:
        return []

    for idx, plot in enumerate(items, start=1):
        print(f"[AI] Generating insights {idx}/{total} -> {plot.get('id')}")

        enriched_plot = dict(plot)

        enriched_plot["ai_insights"] = generateAIInsights(
            enriched_plot,
            client=client,
        )

        results.append(enriched_plot)

        if sleep_seconds > 0 and idx < total:
            time.sleep(sleep_seconds)

    return results