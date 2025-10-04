from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional, Set

import httpx

from .config import get_settings
from .recommendations import HeuristicAdvisor, Recommendation, summarize

logger = logging.getLogger(__name__)


class AIAdvisor:
    """AI assistant that upgrades heuristic advice when an LLM is available."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.heuristic = HeuristicAdvisor()

    async def advise(
        self,
        power_summary: Dict[str, Any],
        *,
        crop_type: Optional[str] = None,
    ) -> Recommendation:
        average_rainfall = summarize(
            value for value in power_summary.get("PRECTOT", {}).values() if value is not None
        )
        average_temp = summarize(
            value for value in power_summary.get("T2M", {}).values() if value is not None
        )

        if not self._is_ai_enabled():
            return self.heuristic.generate(
                average_rainfall=average_rainfall,
                average_temp=average_temp,
                crop_type=crop_type,
            )

        payload = self._build_prompt(power_summary, crop_type=crop_type)
        try:
            provider = self.settings.ai_provider.lower() if self.settings.ai_provider else None
            if provider == "ollama":
                ai_message = await _call_ollama(
                    base_url=self.settings.ollama_base_url,
                    model=self.settings.ollama_model,
                    payload=payload,
                )
            else:
                raise RuntimeError("Unsupported AI provider configured; set FASALSEVA_AI_PROVIDER=ollama")

            return Recommendation(
                summary=ai_message.get("summary", "Data insights"),
                detail=ai_message.get(
                    "detail",
                    "LLM returned no detailed insights. Review NASA data manually and apply sustainable practices.",
                ),
                confidence=float(ai_message.get("confidence", 0.7)),
            )
        except Exception as exc:  # pragma: no cover - best effort fallback
            logger.info("AI generation unavailable (%s). Falling back to heuristics.", exc)
            return self.heuristic.generate(
                average_rainfall=average_rainfall,
                average_temp=average_temp,
                crop_type=crop_type,
            )

    def _is_ai_enabled(self) -> bool:
        provider = self.settings.ai_provider
        if not provider:
            return False
        provider = provider.lower()
        if provider == "ollama":
            return True
        return False

    def _build_prompt(
        self,
        power_summary: Dict[str, Any],
        *,
        crop_type: Optional[str] = None,
    ) -> str:
        crop_fragment = (
            f" Focus on implications for {crop_type.lower()} production." if crop_type else ""
        )
        return (
            "You are an agronomy expert. Analyze the given NASA POWER weather dataset "
            "and craft a succinct summary (<=40 words) plus one actionable recommendation "
            "for a smallholder farmer practicing sustainable agriculture. Highlight irrigation, crop choice, "
            "or risk mitigation if relevant." + crop_fragment + " Data: "
            f"{power_summary}"
        )
async def _call_ollama(base_url: str, model: str, payload: str) -> Dict[str, Any]:
    base = base_url.rstrip("/")
    timeout = httpx.Timeout(60.0)

    async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
        await _ensure_ollama_model_available(client, base, model)
        try:
            response = await client.post(
                f"{base}/api/generate",
                json={
                    "model": model,
                    "prompt": payload,
                    "format": "json",
                    "stream": False,
                },
            )
            response.raise_for_status()
            return _parse_ollama_generate(response.json())
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                raise
            logger.debug("/api/generate not available on Ollama host, falling back to /api/chat")

        response = await client.post(
            f"{base}/api/chat",
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are an agronomy expert returning strict JSON with keys"
                            " 'summary', 'detail', and 'confidence'."
                        ),
                    },
                    {"role": "user", "content": payload},
                ],
                "format": "json",
                "stream": False,
            },
        )
        response.raise_for_status()
        return _parse_ollama_chat(response.json())


def _parse_ollama_generate(data: Any) -> Dict[str, Any]:
    if not isinstance(data, dict) or "response" not in data:
        raise RuntimeError("Unexpected response from Ollama generate endpoint")

    response_text = data["response"]
    if not isinstance(response_text, str):
        raise RuntimeError("Ollama generate response is not textual JSON")

    return json.loads(response_text)


def _parse_ollama_chat(data: Any) -> Dict[str, Any]:
    if not isinstance(data, dict) or "message" not in data:
        raise RuntimeError("Unexpected response from Ollama chat endpoint")

    message = data["message"]
    content: Optional[str] = None

    if isinstance(message, dict):
        content_value = message.get("content")
        if isinstance(content_value, str):
            content = content_value
        elif isinstance(content_value, list):  # newer Ollama may return list of chunks
            content = "".join(chunk for chunk in content_value if isinstance(chunk, str))

    if not content:
        raise RuntimeError("Ollama chat response did not include textual content")

    return json.loads(content)


async def _ensure_ollama_model_available(
    client: httpx.AsyncClient,
    base: str,
    model: str,
) -> None:
    try:
        response = await client.get(f"{base}/api/tags")
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(
            f"Unable to reach Ollama at {base}. Ensure 'ollama serve' is running."
        ) from exc

    try:
        payload = response.json()
    except ValueError as exc:  # pragma: no cover - unexpected response
        raise RuntimeError("Received invalid JSON from Ollama tags endpoint") from exc

    models: Set[str] = {
        entry.get("name")
        for entry in payload.get("models", [])
        if isinstance(entry, dict) and entry.get("name")
    }

    if model not in models:
        raise RuntimeError(
            f"Ollama model '{model}' not found. Run `ollama pull {model}` or set FASALSEVA_OLLAMA_MODEL accordingly."
        )
