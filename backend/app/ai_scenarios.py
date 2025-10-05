"""
Enhanced AI-powered scenario generation using Ollama/Gemma for realistic farming challenges.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


class AIScenarioGenerator:
    """Generate realistic farming scenarios using AI based on NASA data."""
    
    def __init__(self):
        self.settings = get_settings()
    
    async def generate_realistic_scenarios(
        self,
        nasa_data: Dict[str, Any],
        crop_info: Dict[str, Any],
        location_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered realistic scenarios based on actual NASA data."""
        
        if not self._is_ai_enabled():
            logger.info("AI not enabled, falling back to basic scenarios")
            return []
        
        try:
            # Prepare comprehensive data for AI analysis
            weather_analysis = self._prepare_weather_analysis(nasa_data)
            crop_context = self._prepare_crop_context(crop_info)
            location_context = self._prepare_location_context(location_info)
            
            # Generate scenarios using AI
            prompt = self._build_scenario_prompt(weather_analysis, crop_context, location_context)
            
            ai_response = await self._call_ollama_for_scenarios(prompt)
            scenarios = self._parse_ai_scenarios(ai_response)
            
            logger.info(f"Generated {len(scenarios)} AI-powered scenarios")
            return scenarios
            
        except Exception as e:
            logger.error(f"AI scenario generation failed: {e}")
            return []
    
    def _prepare_weather_analysis(self, nasa_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze NASA weather data for scenario generation."""
        if not nasa_data or not nasa_data.get('properties', {}).get('parameter'):
            return {}
        
        params = nasa_data['properties']['parameter']
        
        # Calculate trends and extremes
        analysis = {
            "current_conditions": {},
            "trends": {},
            "extremes": {},
            "risks": []
        }
        
        # Temperature analysis
        temp_data = params.get('T2M', {})
        if temp_data:
            temps = list(temp_data.values())
            analysis["current_conditions"]["temperature"] = {
                "current": temps[-1] if temps else 0,
                "avg_7day": sum(temps[-7:]) / min(len(temps), 7) if temps else 0,
                "min_7day": min(temps[-7:]) if temps else 0,
                "max_7day": max(temps[-7:]) if temps else 0
            }
        
        # Precipitation analysis
        precip_data = params.get('PRECTOTCORR', {})
        if precip_data:
            precips = list(precip_data.values())
            analysis["current_conditions"]["precipitation"] = {
                "current": precips[-1] if precips else 0,
                "total_7day": sum(precips[-7:]) if precips else 0,
                "avg_daily": sum(precips[-7:]) / min(len(precips), 7) if precips else 0
            }
        
        # Humidity analysis
        humidity_data = params.get('RH2M', {})
        if humidity_data:
            humidities = list(humidity_data.values())
            analysis["current_conditions"]["humidity"] = {
                "current": humidities[-1] if humidities else 0,
                "avg_7day": sum(humidities[-7:]) / min(len(humidities), 7) if humidities else 0
            }
        
        # Solar radiation analysis
        solar_data = params.get('ALLSKY_SFC_SW_DWN', {})
        if solar_data:
            solar_values = list(solar_data.values())
            analysis["current_conditions"]["solar_radiation"] = {
                "current": solar_values[-1] if solar_values else 0,
                "avg_7day": sum(solar_values[-7:]) / min(len(solar_values), 7) if solar_values else 0
            }
        
        return analysis
    
    def _prepare_crop_context(self, crop_info: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare crop-specific context for scenario generation."""
        return {
            "crop_name": crop_info.get("name", "wheat"),
            "growth_stage": crop_info.get("growth_stage", 1),
            "health": crop_info.get("health", 100),
            "water_level": crop_info.get("water_level", 50),
            "fertilizer_level": crop_info.get("fertilizer_level", 50),
            "planted_date": crop_info.get("planted_at", datetime.now().isoformat())
        }
    
    def _prepare_location_context(self, location_info: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare location-specific context."""
        return {
            "latitude": location_info.get("latitude", 0),
            "longitude": location_info.get("longitude", 0),
            "region": self._get_climate_region(location_info.get("latitude", 0)),
            "season": self._get_current_season(location_info.get("latitude", 0))
        }
    
    def _get_climate_region(self, latitude: float) -> str:
        """Determine climate region based on latitude."""
        abs_lat = abs(latitude)
        if abs_lat >= 66.5:
            return "polar"
        elif abs_lat >= 23.5:
            return "temperate"
        else:
            return "tropical"
    
    def _get_current_season(self, latitude: float) -> str:
        """Determine current season based on latitude and date."""
        month = datetime.now().month
        
        # Northern hemisphere seasons
        if latitude >= 0:
            if month in [12, 1, 2]:
                return "winter"
            elif month in [3, 4, 5]:
                return "spring"
            elif month in [6, 7, 8]:
                return "summer"
            else:
                return "autumn"
        # Southern hemisphere seasons
        else:
            if month in [12, 1, 2]:
                return "summer"
            elif month in [3, 4, 5]:
                return "autumn"
            elif month in [6, 7, 8]:
                return "winter"
            else:
                return "spring"
    
    def _build_scenario_prompt(
        self,
        weather_analysis: Dict[str, Any],
        crop_context: Dict[str, Any],
        location_context: Dict[str, Any]
    ) -> str:
        """Build comprehensive prompt for AI scenario generation."""
        
        return f"""You are an expert agricultural advisor and climate scientist. Based on real NASA weather data and crop conditions, generate 1-3 realistic farming scenarios that a farmer might face.

CURRENT WEATHER DATA:
{json.dumps(weather_analysis, indent=2)}

CROP INFORMATION:
- Crop: {crop_context['crop_name']}
- Growth Stage: {crop_context['growth_stage']}/5
- Current Health: {crop_context['health']}%
- Water Level: {crop_context['water_level']}%
- Fertilizer Level: {crop_context['fertilizer_level']}%

LOCATION CONTEXT:
- Climate Region: {location_context['region']}
- Current Season: {location_context['season']}
- Coordinates: ({location_context['latitude']}, {location_context['longitude']})

TASK: Generate realistic farming scenarios based on this data. Each scenario should:
1. Be scientifically accurate based on the weather conditions
2. Be relevant to the crop type and growth stage
3. Include specific, actionable solutions
4. Have realistic costs and success rates
5. Provide meaningful rewards

Return your response as a JSON array with this exact structure:
[
  {{
    "id": "unique_scenario_id",
    "scenario_type": "drought|flood|pest|disease|extreme_weather|soil_issue",
    "title": "Brief scenario title",
    "description": "Detailed description of the farming challenge (100-200 words)",
    "impact_description": "How this affects the specific crop",
    "severity": "low|medium|high",
    "scientific_basis": "Brief explanation of why this scenario is likely given the weather data",
    "actions": [
      {{
        "id": "action_id",
        "name": "Action Name",
        "description": "Detailed action description",
        "cost_coins": 50,
        "success_rate": 0.85,
        "rewards": {{"xp": 60, "coins": 30}},
        "time_to_complete": "24 hours",
        "scientific_rationale": "Why this action works"
      }}
    ]
  }}
]

Generate scenarios that are:
- Realistic for current weather conditions
- Appropriate for {crop_context['crop_name']} at growth stage {crop_context['growth_stage']}
- Scientifically grounded
- Educational for the farmer
- Engaging but not overwhelming

Focus on scenarios that help farmers learn real agricultural practices while making the game educational and fun."""
    
    async def _call_ollama_for_scenarios(self, prompt: str) -> Dict[str, Any]:
        """Call Ollama API for scenario generation."""
        base_url = self.settings.ollama_base_url.rstrip("/")
        model = self.settings.ollama_model
        timeout = httpx.Timeout(120.0)  # Longer timeout for complex generation
        
        async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
            try:
                response = await client.post(
                    f"{base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                            "num_predict": 2000
                        }
                    }
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Ollama API error: {e}")
                raise
    
    def _parse_ai_scenarios(self, ai_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse AI response and validate scenario structure."""
        try:
            response_text = ai_response.get("response", "")
            if not response_text:
                return []
            
            # Parse JSON response
            scenarios_data = json.loads(response_text)
            
            # Handle different response formats
            if isinstance(scenarios_data, dict):
                if "scenarios" in scenarios_data:
                    scenarios_data = scenarios_data["scenarios"]
                elif any(key in scenarios_data for key in ["id", "scenario_type", "title"]):
                    scenarios_data = [scenarios_data]
                else:
                    logger.warning("Unknown AI response format, attempting to extract scenarios")
                    scenarios_data = []
            
            if not isinstance(scenarios_data, list):
                logger.warning("AI response is not a list, attempting to wrap")
                scenarios_data = [scenarios_data] if scenarios_data else []
            
            validated_scenarios = []
            for scenario in scenarios_data:
                if self._validate_scenario_structure(scenario):
                    # Ensure all required fields are present
                    validated_scenario = self._normalize_scenario(scenario)
                    validated_scenarios.append(validated_scenario)
                else:
                    logger.warning(f"Invalid scenario structure: {scenario}")
            
            return validated_scenarios
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Error processing AI scenarios: {e}")
            return []
    
    def _validate_scenario_structure(self, scenario: Dict[str, Any]) -> bool:
        """Validate that scenario has required fields."""
        required_fields = ["id", "scenario_type", "title", "description"]
        has_required = all(field in scenario for field in required_fields)
        
        # Check if actions exist and are valid (or can be created)
        actions = scenario.get("actions", [])
        if not actions:
            # Create default action if none provided
            scenario["actions"] = [self._create_default_action(scenario)]
        
        return has_required
    
    def _create_default_action(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Create a default action if none provided by AI."""
        scenario_type = scenario.get("scenario_type", "general")
        
        default_actions = {
            "drought": {
                "id": "water_management",
                "name": "Implement Water Conservation",
                "description": "Apply water-saving techniques to help crops survive dry conditions",
                "cost_coins": 100,
                "success_rate": 0.8,
                "rewards": {"xp": 50, "coins": 25}
            },
            "flood": {
                "id": "drainage_improvement",
                "name": "Improve Drainage",
                "description": "Install better drainage systems to handle excess water",
                "cost_coins": 150,
                "success_rate": 0.7,
                "rewards": {"xp": 60, "coins": 30}
            },
            "pest": {
                "id": "pest_control",
                "name": "Integrated Pest Management",
                "description": "Apply sustainable pest control methods",
                "cost_coins": 80,
                "success_rate": 0.85,
                "rewards": {"xp": 55, "coins": 35}
            }
        }
        
        return default_actions.get(scenario_type, {
            "id": "general_care",
            "name": "General Crop Care",
            "description": "Apply appropriate farming techniques for this situation",
            "cost_coins": 75,
            "success_rate": 0.75,
            "rewards": {"xp": 45, "coins": 20}
        })

    def _normalize_scenario(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize scenario to match expected structure."""
        return {
            "id": scenario.get("id", f"ai_scenario_{datetime.now().timestamp()}"),
            "scenario_type": scenario.get("scenario_type", "general"),
            "title": scenario.get("title", "Agricultural Challenge"),
            "description": scenario.get("description", "A farming challenge requiring attention."),
            "impact_description": scenario.get("impact_description", scenario.get("description", "")),
            "severity": scenario.get("severity", "medium"),
            "scientific_basis": scenario.get("scientific_basis", "Based on current conditions"),
            "available_actions": [
                {
                    "id": action.get("id", f"action_{i}"),
                    "name": action.get("name", f"Action {i+1}"),
                    "description": action.get("description", "Farming action"),
                    "cost_coins": max(1, action.get("cost_coins", 50)),
                    "success_rate": min(1.0, max(0.1, action.get("success_rate", 0.7))),
                    "rewards": action.get("rewards", {"xp": 50, "coins": 25}),
                    "time_to_complete": action.get("time_to_complete", "24 hours"),
                    "scientific_rationale": action.get("scientific_rationale", "Proven farming practice")
                }
                for i, action in enumerate(scenario.get("actions", []))
            ]
        }
    
    def _is_ai_enabled(self) -> bool:
        """Check if AI scenario generation is enabled."""
        return (
            self.settings.ai_provider and 
            self.settings.ai_provider.lower() == "ollama" and
            self.settings.ollama_base_url and
            self.settings.ollama_model
        )