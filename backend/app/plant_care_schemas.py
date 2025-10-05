"""
Enhanced plant care schemas with costs, scoring, and realistic farming economics
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class PlantCareRequest(BaseModel):
    """Request for plant care action with quality level"""
    action_type: str  # 'water', 'fertilize', 'premium_care'
    quality_level: str  # 'basic', 'premium', 'expert'
    amount: Optional[int] = 1  # Quantity of action (e.g., liters of water)

class PlantCareResponse(BaseModel):
    """Response after plant care action"""
    action_taken: str
    cost_paid: int
    quality_score: float  # 0-100 score based on care quality
    plant_health_improvement: float
    plant_growth_bonus: float
    rewards_earned: Dict[str, int]  # XP, coins, bonus points
    care_efficiency: float  # How well the action was performed
    recommendations: List[str]  # Suggestions for better care
    total_investment: int  # Total money spent on this plant
    roi_projection: float  # Expected return on investment

class PlantScoreCard(BaseModel):
    """Comprehensive plant performance scoring"""
    plant_id: int
    overall_score: float  # 0-100 overall care score
    care_categories: Dict[str, float]  # Scores for water, fertilizer, pest control, etc.
    investment_total: int  # Total coins invested
    expected_yield: float  # Projected harvest value
    roi_percentage: float  # Return on investment percentage
    care_consistency: float  # How regularly care was provided
    efficiency_rating: str  # 'Poor', 'Good', 'Excellent'
    bonus_multiplier: float  # Reward multiplier based on performance
    achievements: List[str]  # Care achievements unlocked

class WaterSupplyItem(BaseModel):
    """Water supply options with different qualities"""
    id: str
    name: str
    cost_per_liter: int
    quality_bonus: float  # Multiplier for plant benefits
    description: str
    available_amount: int

class FertilizerItem(BaseModel):
    """Fertilizer options with different qualities and effects"""
    id: str
    name: str
    cost_per_application: int
    nutrient_type: str  # 'nitrogen', 'phosphorus', 'potassium', 'organic'
    effectiveness: float
    duration_days: int
    description: str
    side_effects: Optional[str] = None

class PlantCareShop(BaseModel):
    """Shop for plant care supplies"""
    water_supplies: List[WaterSupplyItem]
    fertilizers: List[FertilizerItem]
    premium_services: List[Dict[str, Any]]  # Expert consultation, soil testing, etc.

class CareEconomics(BaseModel):
    """Economic model for plant care investment"""
    base_water_cost: int = 5  # Cost per watering action
    base_fertilizer_cost: int = 15  # Cost per fertilizer application
    premium_multiplier: float = 2.5  # Cost multiplier for premium care
    expert_multiplier: float = 4.0  # Cost multiplier for expert care
    quality_bonus_threshold: float = 80.0  # Score needed for bonus rewards
    roi_calculation_days: int = 30  # Days to calculate ROI