"""
AI-powered scenario generation system using NASA data and local AI models.
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

from .database import get_db_connection
from .ai_scenarios import AIScenarioGenerator

logger = logging.getLogger(__name__)


class ScenarioGenerator:
    """Generate intelligent scenarios based on NASA data and crop conditions."""
    
    @staticmethod
    async def analyze_nasa_data_for_scenarios(
        nasa_data: Dict, 
        crop_info: Dict, 
        location_info: Optional[Dict] = None
    ) -> List[Dict]:
        """Analyze NASA data and generate relevant scenarios using AI when available."""
        scenarios = []
        
        if not nasa_data or not nasa_data.get('properties', {}).get('parameter'):
            return scenarios
        
        # Try AI-powered scenario generation first
        try:
            ai_generator = AIScenarioGenerator()
            ai_scenarios = await ai_generator.generate_realistic_scenarios(
                nasa_data=nasa_data,
                crop_info=crop_info,
                location_info=location_info or {}
            )
            
            if ai_scenarios:
                logger.info(f"Generated {len(ai_scenarios)} AI-powered scenarios")
                scenarios.extend(ai_scenarios)
                return scenarios  # Use AI scenarios if available
            
        except Exception as e:
            logger.warning(f"AI scenario generation failed, falling back to rule-based: {e}")
        
        # Fallback to rule-based scenarios
            
        params = nasa_data['properties']['parameter']
        
        # Extract latest values
        temp = ScenarioGenerator._get_latest_value(params.get('T2M', {}))
        precipitation = ScenarioGenerator._get_latest_value(params.get('PRECTOTCORR', {}))
        humidity = ScenarioGenerator._get_latest_value(params.get('RH2M', {}))
        solar_radiation = ScenarioGenerator._get_latest_value(params.get('ALLSKY_SFC_SW_DWN', {}))
        wind_speed = ScenarioGenerator._get_latest_value(params.get('WS2M', {}))
        
        # Drought scenario - low precipitation + high temperature
        if precipitation < 0.5 and temp > 30:  # Less than 0.5mm/day rain + hot
            scenarios.append(ScenarioGenerator._create_drought_scenario(temp, precipitation, crop_info))
        
        # Flood scenario - excessive precipitation
        if precipitation > 15:  # More than 15mm/day
            scenarios.append(ScenarioGenerator._create_flood_scenario(precipitation, crop_info))
            
        # Heat stress scenario
        if temp > 40:  # Very high temperature
            scenarios.append(ScenarioGenerator._create_heat_stress_scenario(temp, crop_info))
            
        # Cold stress scenario
        if temp < 10:  # Very low temperature
            scenarios.append(ScenarioGenerator._create_cold_stress_scenario(temp, crop_info))
            
        # High humidity pest risk
        if humidity > 80 and temp > 25:  # High humidity + warm = pest risk
            scenarios.append(ScenarioGenerator._create_pest_scenario(humidity, temp, crop_info))
            
        # Low solar radiation
        if solar_radiation < 3:  # Low solar radiation
            scenarios.append(ScenarioGenerator._create_low_light_scenario(solar_radiation, crop_info))
            
        # Wind damage scenario
        if wind_speed > 15:  # High wind speed
            scenarios.append(ScenarioGenerator._create_wind_damage_scenario(wind_speed, crop_info))
        
        return scenarios
    
    @staticmethod
    def _get_latest_value(param_dict: Dict) -> float:
        """Get the most recent value from NASA parameter dictionary."""
        if not param_dict:
            return 0.0
        
        # NASA data comes as date -> value mapping
        dates = sorted(param_dict.keys(), reverse=True)  # Most recent first
        if dates:
            return float(param_dict[dates[0]])
        return 0.0
    
    @staticmethod
    def _create_drought_scenario(temp: float, precipitation: float, crop_info: Dict) -> Dict:
        """Create drought scenario based on weather data."""
        severity = "high" if precipitation < 0.1 and temp > 35 else "medium"
        
        actions = [
            {
                "id": "install_drip_irrigation",
                "name": "Install Drip Irrigation",
                "description": "Efficient water delivery system",
                "cost_coins": 200,
                "success_rate": 0.9,
                "rewards": {"xp": 100, "coins": 50}
            },
            {
                "id": "apply_mulch",
                "name": "Apply Organic Mulch", 
                "description": "Retain soil moisture",
                "cost_coins": 50,
                "success_rate": 0.7,
                "rewards": {"xp": 60, "coins": 20}
            },
            {
                "id": "deep_watering",
                "name": "Deep Watering Schedule",
                "description": "Intensive watering program",
                "cost_coins": 80,
                "success_rate": 0.6,
                "rewards": {"xp": 40, "coins": 10}
            }
        ]
        
        return {
            "scenario_type": "drought",
            "severity": severity,
            "description": f"Severe drought conditions detected (Temp: {temp:.1f}°C, Rain: {precipitation:.1f}mm/day)",
            "impact_description": f"Your {crop_info.get('name', 'crops')} are at risk of water stress and reduced yield",
            "nasa_data_trigger": {"temperature": temp, "precipitation": precipitation},
            "available_actions": actions,
            "auto_resolve_time": 48  # Auto-resolve in 48 hours if no action
        }
    
    @staticmethod
    def _create_flood_scenario(precipitation: float, crop_info: Dict) -> Dict:
        """Create flood scenario based on excessive rainfall."""
        severity = "high" if precipitation > 25 else "medium"
        
        actions = [
            {
                "id": "improve_drainage",
                "name": "Improve Drainage System",
                "description": "Install better drainage to prevent waterlogging",
                "cost_coins": 300,
                "success_rate": 0.95,
                "rewards": {"xp": 120, "coins": 80}
            },
            {
                "id": "raised_beds",
                "name": "Create Raised Beds",
                "description": "Elevate crops above flood level",
                "cost_coins": 150,
                "success_rate": 0.8,
                "rewards": {"xp": 80, "coins": 40}
            },
            {
                "id": "fungicide_treatment",
                "name": "Apply Fungicide",
                "description": "Prevent root rot and fungal diseases",
                "cost_coins": 100,
                "success_rate": 0.7,
                "rewards": {"xp": 50, "coins": 20}
            }
        ]
        
        return {
            "scenario_type": "flood",
            "severity": severity,
            "description": f"Excessive rainfall detected ({precipitation:.1f}mm/day)",
            "impact_description": f"Risk of waterlogging and root damage to {crop_info.get('name', 'crops')}",
            "nasa_data_trigger": {"precipitation": precipitation},
            "available_actions": actions,
            "auto_resolve_time": 24
        }
    
    @staticmethod
    def _create_pest_scenario(humidity: float, temp: float, crop_info: Dict) -> Dict:
        """Create pest scenario based on humidity and temperature."""
        severity = "high" if humidity > 90 and temp > 28 else "medium"
        
        actions = [
            {
                "id": "beneficial_insects",
                "name": "Release Beneficial Insects",
                "description": "Natural pest control with predator insects",
                "cost_coins": 180,
                "success_rate": 0.85,
                "rewards": {"xp": 90, "coins": 60}
            },
            {
                "id": "organic_spray",
                "name": "Organic Pesticide Spray",
                "description": "Eco-friendly pest control treatment",
                "cost_coins": 120,
                "success_rate": 0.75,
                "rewards": {"xp": 70, "coins": 30}
            },
            {
                "id": "companion_planting",
                "name": "Companion Planting",
                "description": "Plant pest-repelling companion crops",
                "cost_coins": 80,
                "success_rate": 0.6,
                "rewards": {"xp": 50, "coins": 25}
            }
        ]
        
        return {
            "scenario_type": "pest",
            "severity": severity,
            "description": f"High pest risk conditions (Humidity: {humidity:.1f}%, Temp: {temp:.1f}°C)",
            "impact_description": f"Increased risk of pest damage to {crop_info.get('name', 'crops')}",
            "nasa_data_trigger": {"humidity": humidity, "temperature": temp},
            "available_actions": actions,
            "auto_resolve_time": 36
        }
    
    @staticmethod
    def _create_heat_stress_scenario(temp: float, crop_info: Dict) -> Dict:
        """Create heat stress scenario."""
        actions = [
            {
                "id": "shade_cloth",
                "name": "Install Shade Cloth",
                "description": "Provide protection from intense heat",
                "cost_coins": 120,
                "success_rate": 0.8,
                "rewards": {"xp": 70, "coins": 35}
            },
            {
                "id": "misting_system",
                "name": "Misting System",
                "description": "Cool the air around plants",
                "cost_coins": 200,
                "success_rate": 0.9,
                "rewards": {"xp": 100, "coins": 50}
            }
        ]
        
        return {
            "scenario_type": "heat_stress",
            "severity": "high",
            "description": f"Extreme heat warning ({temp:.1f}°C)",
            "impact_description": f"Heat stress may damage {crop_info.get('name', 'crops')}",
            "nasa_data_trigger": {"temperature": temp},
            "available_actions": actions,
            "auto_resolve_time": 12
        }
    
    @staticmethod
    def _create_cold_stress_scenario(temp: float, crop_info: Dict) -> Dict:
        """Create cold stress scenario."""
        actions = [
            {
                "id": "frost_protection",
                "name": "Frost Protection Cover",
                "description": "Protect plants from cold damage",
                "cost_coins": 100,
                "success_rate": 0.85,
                "rewards": {"xp": 60, "coins": 30}
            },
            {
                "id": "heating_system",
                "name": "Greenhouse Heating",
                "description": "Maintain optimal temperature",
                "cost_coins": 250,
                "success_rate": 0.95,
                "rewards": {"xp": 120, "coins": 70}
            }
        ]
        
        return {
            "scenario_type": "cold_stress",
            "severity": "medium",
            "description": f"Cold weather alert ({temp:.1f}°C)",
            "impact_description": f"Low temperature may slow growth of {crop_info.get('name', 'crops')}",
            "nasa_data_trigger": {"temperature": temp},
            "available_actions": actions,
            "auto_resolve_time": 18
        }
    
    @staticmethod
    def _create_low_light_scenario(solar_radiation: float, crop_info: Dict) -> Dict:
        """Create low light scenario."""
        actions = [
            {
                "id": "led_grow_lights",
                "name": "LED Grow Lights",
                "description": "Supplement natural sunlight",
                "cost_coins": 300,
                "success_rate": 0.9,
                "rewards": {"xp": 110, "coins": 80}
            },
            {
                "id": "reflective_mulch",
                "name": "Reflective Mulch",
                "description": "Increase light reflection to plants",
                "cost_coins": 80,
                "success_rate": 0.6,
                "rewards": {"xp": 40, "coins": 20}
            }
        ]
        
        return {
            "scenario_type": "low_light",
            "severity": "medium",
            "description": f"Low solar radiation detected ({solar_radiation:.1f} kWh/m²)",
            "impact_description": f"Reduced photosynthesis may affect {crop_info.get('name', 'crops')} growth",
            "nasa_data_trigger": {"solar_radiation": solar_radiation},
            "available_actions": actions,
            "auto_resolve_time": 72
        }
    
    @staticmethod
    def _create_wind_damage_scenario(wind_speed: float, crop_info: Dict) -> Dict:
        """Create wind damage scenario."""
        actions = [
            {
                "id": "windbreak",
                "name": "Install Windbreak",
                "description": "Protect crops from strong winds",
                "cost_coins": 180,
                "success_rate": 0.85,
                "rewards": {"xp": 80, "coins": 40}
            },
            {
                "id": "crop_support",
                "name": "Crop Support Stakes",
                "description": "Provide structural support",
                "cost_coins": 60,
                "success_rate": 0.7,
                "rewards": {"xp": 40, "coins": 15}
            }
        ]
        
        return {
            "scenario_type": "wind_damage",
            "severity": "medium",
            "description": f"High wind speeds detected ({wind_speed:.1f} m/s)",
            "impact_description": f"Strong winds may damage {crop_info.get('name', 'crops')}",
            "nasa_data_trigger": {"wind_speed": wind_speed},
            "available_actions": actions,
            "auto_resolve_time": 6
        }
    
    @staticmethod
    def save_scenario_to_db(user_id: int, crop_id: int, scenario_data: Dict) -> str:
        """Save a generated scenario to the database."""
        scenario_id = str(uuid.uuid4())
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Handle AI-generated scenarios that may have 'title' instead of just description
        description = scenario_data.get('description', '')
        if scenario_data.get('title') and scenario_data['title'] not in description:
            # Prepend title to description for AI scenarios
            description = f"{scenario_data['title']}: {description}"
        
        # Ensure we have impact_description
        impact_description = scenario_data.get('impact_description', description[:100] + '...')
        
        # Handle nasa_data_trigger - might not exist for AI scenarios
        nasa_trigger = scenario_data.get('nasa_data_trigger', {})
        if not nasa_trigger and scenario_data.get('scientific_basis'):
            nasa_trigger = {'ai_generated': True, 'basis': scenario_data['scientific_basis']}
        
        cursor.execute("""
            INSERT INTO plant_scenarios (
                id, crop_id, user_id, scenario_type, severity, description,
                impact_description, nasa_data_trigger, available_actions,
                auto_resolve_time, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            scenario_id,
            crop_id,
            user_id,
            scenario_data['scenario_type'],
            scenario_data.get('severity', 'medium'),
            description,
            impact_description,
            json.dumps(nasa_trigger),
            json.dumps(scenario_data.get('available_actions', [])),
            scenario_data.get('auto_resolve_time'),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return scenario_id
    
    @staticmethod
    def get_active_scenarios(user_id: int, crop_id: Optional[int] = None) -> List[Dict]:
        """Get all active scenarios for a user or specific crop."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if crop_id:
            cursor.execute("""
                SELECT * FROM plant_scenarios 
                WHERE user_id = ? AND crop_id = ? AND active = 1
                ORDER BY created_at DESC
            """, (user_id, crop_id))
        else:
            cursor.execute("""
                SELECT * FROM plant_scenarios 
                WHERE user_id = ? AND active = 1
                ORDER BY created_at DESC
            """, (user_id,))
        
        scenarios = []
        for row in cursor.fetchall():
            scenario = dict(row)
            scenario['nasa_data_trigger'] = json.loads(scenario['nasa_data_trigger'] or '{}')
            scenario['available_actions'] = json.loads(scenario['available_actions'] or '[]')
            scenarios.append(scenario)
        
        conn.close()
        return scenarios
    
    @staticmethod
    def complete_scenario(scenario_id: str, action_id: str, user_id: int) -> Dict:
        """Complete a scenario with chosen action and award rewards."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get scenario details
        cursor.execute("SELECT * FROM plant_scenarios WHERE id = ? AND user_id = ?", (scenario_id, user_id))
        scenario_row = cursor.fetchone()
        
        if not scenario_row:
            return {"success": False, "message": "Scenario not found"}
        
        scenario = dict(scenario_row)
        available_actions = json.loads(scenario['available_actions'])
        
        # Find the chosen action
        chosen_action = None
        for action in available_actions:
            if action['id'] == action_id:
                chosen_action = action
                break
        
        if not chosen_action:
            return {"success": False, "message": "Action not found"}
        
        # Check if user has enough coins from users table (single source of truth)
        cursor.execute("SELECT coins FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            return {"success": False, "message": "User not found"}
        current_coins = user_row['coins']
        
        if current_coins < chosen_action['cost_coins']:
            return {"success": False, "message": "Insufficient coins"}
        
        # Determine success based on action success rate
        success = random.random() < chosen_action['success_rate']
        
        if success:
            # Award rewards
            rewards = chosen_action['rewards']
            xp_gain = rewards.get('xp', 0)
            coin_reward = rewards.get('coins', 0)
            
            # Ensure user_progress row exists for stats updates
            cursor.execute(
                """
                INSERT OR IGNORE INTO user_progress (user_id, level, total_scenarios_completed, successful_harvests)
                VALUES (?, 1, 0, 0)
                """,
                (user_id,)
            )

            # Update coins and XP in users table (primary source)
            cursor.execute("""
                UPDATE users 
                SET coins = coins - ? + ?, 
                    xp = xp + ?
                WHERE id = ?
            """, (chosen_action['cost_coins'], coin_reward, xp_gain, user_id))
            
            # Update game statistics in user_progress table (no coins/xp)
            cursor.execute("""
                UPDATE user_progress 
                SET total_scenarios_completed = total_scenarios_completed + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (user_id,))
            
            # Mark scenario as resolved
            cursor.execute("""
                UPDATE plant_scenarios 
                SET active = 0, resolved_at = CURRENT_TIMESTAMP, resolution_action = ?
                WHERE id = ?
            """, (action_id, scenario_id))
            
            # Update level if needed (get XP from users table)
            cursor.execute("SELECT xp FROM users WHERE id = ?", (user_id,))
            user_data = cursor.fetchone()
            cursor.execute("SELECT level FROM user_progress WHERE user_id = ?", (user_id,))
            progress_data = cursor.fetchone()

            prev_level = progress_data['level'] if progress_data else 1
            new_level = ScenarioGenerator._calculate_level(user_data['xp'])

            if new_level > prev_level:
                cursor.execute("UPDATE user_progress SET level = ? WHERE user_id = ?", (new_level, user_id))
            
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "message": f"Successfully completed scenario with {chosen_action['name']}!",
                "rewards": rewards,
                "new_level": new_level if new_level > prev_level else None
            }
        else:
            # Deduct coins from users table only
            cursor.execute("""
                UPDATE users 
                SET coins = coins - ?
                WHERE id = ?
            """, (chosen_action['cost_coins'], user_id))
            
            conn.commit()
            conn.close()
            
            return {
                "success": False,
                "message": f"Action '{chosen_action['name']}' was not effective. Try another approach!",
                "coins_lost": chosen_action['cost_coins']
            }
    
    @staticmethod
    def _calculate_level(xp: int) -> int:
        """Calculate level based on XP (100 XP per level)."""
        return max(1, (xp // 100) + 1)