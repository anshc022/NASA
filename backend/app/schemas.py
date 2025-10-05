from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field, validator


class FarmDataQuery(BaseModel):
    lat: float = Field(..., description="Latitude of farm location", ge=-90, le=90)
    lon: float = Field(..., description="Longitude of farm location", ge=-180, le=180)
    start: str = Field(..., pattern=r"^\d{8}$", description="Start date in YYYYMMDD")
    end: str = Field(..., pattern=r"^\d{8}$", description="End date in YYYYMMDD")
    crop_type: Optional[str] = Field(
        default=None,
        description="Optional crop type for AI personalization",
    )

    @validator("end")
    def validate_date_range(cls, end: str, values: Dict[str, str]):  # type: ignore[override]
        start = values.get("start")
        if start and end < start:
            raise ValueError("end date must be on or after start date")
        return end


class DailyRecord(BaseModel):
    date: str
    t2m: Optional[float] = None
    t2m_max: Optional[float] = None
    t2m_min: Optional[float] = None
    t2mdew: Optional[float] = None
    rh2m: Optional[float] = None
    prectot: Optional[float] = None
    allsky_sfc_sw_dwn: Optional[float] = None
    sza: Optional[float] = None
    ws2m: Optional[float] = None


class RecommendationPayload(BaseModel):
    summary: str
    detail: str
    confidence: float


class FarmDataResponse(BaseModel):
    location: Dict[str, float]
    period: Dict[str, str]
    crop_type: Optional[str] = None
    parameters: Dict[str, Dict[str, float]]
    daily: List[DailyRecord]
    recommendation: RecommendationPayload


# =====================
# Farms (CRUD) Schemas
# =====================

class FarmCreate(BaseModel):
    farm_name: Optional[str] = Field(default=None, max_length=120)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    crop_type: Optional[str] = Field(default=None, max_length=60)
    farm_size: Optional[str] = Field(default=None, max_length=60)


class FarmResponse(BaseModel):
    id: int
    farm_name: Optional[str]
    latitude: float
    longitude: float
    crop_type: Optional[str]
    farm_size: Optional[str]
    created_at: str


# =====================
# Scenario and Progression Schemas
# =====================

class ScenarioAction(BaseModel):
    id: str
    name: str
    description: str
    cost_coins: int
    success_rate: float
    rewards: Dict[str, int]  # {"xp": 50, "coins": 100}


class PlantScenario(BaseModel):
    id: str
    crop_id: str
    scenario_type: str  # "drought", "pest", "disease", "fertilizer_shortage"
    severity: str  # "low", "medium", "high"
    description: str
    impact_description: str
    nasa_data_trigger: Dict[str, float]  # What NASA data triggered this
    available_actions: List[ScenarioAction]
    auto_resolve_time: Optional[int] = None  # hours until auto-resolve
    active: bool = True
    created_at: str


class CompleteScenarioRequest(BaseModel):
    action_id: str


class PlayerProgress(BaseModel):
    level: int
    xp: int
    coins: int
    xp_to_next_level: int
    total_scenarios_completed: int
    successful_harvests: int


class ShopItem(BaseModel):
    id: str
    name: str
    description: str
    cost_coins: int
    category: str  # "tools", "seeds", "upgrades", "decorations"
    effects: Dict[str, float]  # {"growth_bonus": 0.1, "disease_resistance": 0.2}
    available: bool = True


class PurchaseRequest(BaseModel):
    item_id: str
    quantity: int = 1
