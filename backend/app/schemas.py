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
