from __future__ import annotations

import json
import os
import re
import time
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

MODEL_NAME = "gpt-5-nano"

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


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


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
- drivers must contain exactly 3 short strings
- bestUse must contain exactly 3 short strings
- confidence must be exactly one of: Low, Medium, High
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


def generateAIInsights(
    plot: dict[str, Any], client: OpenAI | None = None
) -> dict[str, Any]:
    client = client or _get_client()
    prompt = buildPrompt(plot)

    try:
        response = client.responses.create(
            model=MODEL_NAME,
            reasoning={"effort": "low"},
            input=prompt,
            max_output_tokens=250,
            timeout=60,
        )

        raw_text = (response.output_text or "").strip()
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

    total = len(data)
    for idx, plot in enumerate(data, start=1):
        enriched_plot = dict(plot)
        enriched_plot["ai_insights"] = generateAIInsights(enriched_plot, client=client)
        results.append(enriched_plot)

        if sleep_seconds > 0 and idx < total:
            time.sleep(sleep_seconds)

    return results


if __name__ == "__main__":
    sample_plot = {
        "id": "demo_plot_001",
        "zip": "60611",
        "neighborhood": "NEAR NORTH SIDE",
        "zoning": "299",
        "scores": {
            "finalScore": 78,
            "investmentScore": 74,
            "growthScore": 70,
            "riskScore": 42,
        },
        "amenities": {
            "coffee_shop_count_nearby": 5,
            "restaurant_count_nearby": 18,
            "grocery_count_nearby": 2,
            "park_count_nearby": 4,
        },
    }

    print(json.dumps(generateAIInsights(sample_plot), indent=2))