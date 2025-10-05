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

    async def generate_educational_content(
        self,
        user_plants: list[Dict[str, Any]],
        nasa_data: Dict[str, Any],
        location: Dict[str, float],
        *,
        user_level: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate personalized educational content based on user's plants and NASA data."""
        
        if not self._is_ai_enabled():
            return self._generate_static_educational_content(user_plants, nasa_data, location)
        
        try:
            payload = self._build_educational_prompt(user_plants, nasa_data, location, user_level)
            
            provider = self.settings.ai_provider.lower() if self.settings.ai_provider else None
            if provider == "ollama":
                ai_response = await _call_ollama_educational(
                    base_url=self.settings.ollama_base_url,
                    model=self.settings.ollama_model,
                    payload=payload,
                )
            else:
                raise RuntimeError("Unsupported AI provider for educational content")
            
            return ai_response
            
        except Exception as exc:
            logger.info("AI educational content generation failed (%s). Using static content.", exc)
            return self._generate_static_educational_content(user_plants, nasa_data, location)

    def _generate_static_educational_content(
        self, 
        user_plants: list[Dict[str, Any]], 
        nasa_data: Dict[str, Any], 
        location: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate basic educational content without AI when AI is unavailable."""
        
        # Analyze user's plant health and NASA data
        avg_health = sum(plant.get('health', 50) for plant in user_plants) / len(user_plants) if user_plants else 50
        avg_temp = nasa_data.get('temperature', 25)
        rainfall = nasa_data.get('precipitation', 2)
        
        # Create basic educational content
        facts = []
        quizzes = []
        missions = []
        
        # Generate location-specific fact
        climate_type = "temperate" if 10 <= avg_temp <= 30 else "extreme"
        water_status = "wet" if rainfall > 3 else "dry" if rainfall < 1 else "moderate"
        
        facts.append({
            "id": "location_climate",
            "title": f"🌍 Your Local Climate",
            "content": f"Your location shows {climate_type} temperatures ({avg_temp:.1f}°C) with {water_status} conditions ({rainfall:.1f}mm/day). NASA satellites monitor these conditions globally to help farmers optimize their growing strategies.",
            "category": "Personal",
            "xp": 20,
            "is_personalized": True
        })
        
        # Generate plant-specific content
        if user_plants:
            plant_names = [plant.get('name', 'Unknown') for plant in user_plants[:3]]
            health_status = "thriving" if avg_health > 80 else "struggling" if avg_health < 50 else "developing"
            
            facts.append({
                "id": "user_plants",
                "title": f"🌱 Your {', '.join(plant_names)} Analysis",
                "content": f"Your plants are currently {health_status} (avg health: {avg_health:.0f}%). NASA data shows this correlates with local temperature and moisture patterns. Learn how satellite monitoring helps predict plant stress before it's visible!",
                "category": "Personal",
                "xp": 25,
                "is_personalized": True
            })
        
        return {
            "facts": facts,
            "quizzes": quizzes,
            "missions": missions,
            "personalization_level": "basic"
        }

    def _build_educational_prompt(
        self,
        user_plants: list[Dict[str, Any]],
        nasa_data: Dict[str, Any],
        location: Dict[str, float],
        user_level: Optional[int] = None,
    ) -> str:
        """Build AI prompt for educational content generation."""
        
        plant_summary = []
        for plant in user_plants[:5]:  # Limit to 5 plants for prompt efficiency
            plant_summary.append(
                f"- {plant.get('name', 'Unknown')}: {plant.get('health', 'N/A')}% health, "
                f"{plant.get('water_level', 'N/A')}% water, {plant.get('fertilizer_level', 'N/A')}% fertilizer"
            )
        
        plant_text = "\n".join(plant_summary) if plant_summary else "No plants currently growing"
        
        level_text = f"User level: {user_level}" if user_level else "Beginner level"
        
        return f"""
You are a NASA Earth science educator creating personalized learning content. Generate educational content that connects the user's real farming data with NASA satellite observations.

USER'S LOCATION: Lat {location.get('lat', 'Unknown')}, Lon {location.get('lon', 'Unknown')}

NASA DATA FOR THIS LOCATION:
- Temperature: {nasa_data.get('temperature', 'N/A')}°C
- Precipitation: {nasa_data.get('precipitation', 'N/A')} mm/day  
- Humidity: {nasa_data.get('humidity', 'N/A')}%
- Solar Radiation: {nasa_data.get('solar_radiation', 'N/A')} kWh/m²

USER'S PLANTS:
{plant_text}

{level_text}

Create educational content in JSON format with:
1. "facts": Array of 3-4 personalized learning facts that connect NASA data to their specific plants and location
2. "interactive_missions": Array of 2-3 hands-on activities using their plant data
3. "climate_insights": Location-specific climate patterns and how they affect the user's crops
4. "sustainability_tips": Actionable advice based on their current plant health and local conditions

Make it engaging, scientifically accurate, and directly relevant to their farming experience. Include XP rewards (15-30 points per item).
        """

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


async def _call_ollama_educational(base_url: str, model: str, payload: str) -> Dict[str, Any]:
    """Call Ollama specifically for educational content generation."""
    base = base_url.rstrip("/")
    timeout = httpx.Timeout(90.0)  # Longer timeout for educational content

    async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
        await _ensure_ollama_model_available(client, base, model)
        
        try:
            response = await client.post(
                f"{base}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a NASA Earth science educator. Return educational content "
                                "in strict JSON format with keys: 'facts' (array), 'interactive_missions' (array), "
                                "'climate_insights' (object), and 'sustainability_tips' (array). "
                                "Each fact/mission should have: id, title, content, category, xp, is_personalized."
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
        except Exception as exc:
            logger.error(f"Ollama educational content generation failed: {exc}")
            # Return fallback structure
            return {
                "facts": [],
                "interactive_missions": [],
                "climate_insights": {"summary": "NASA data analysis unavailable"},
                "sustainability_tips": []
            }


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
