"""Additional schemas for game mechanics."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Farm Simulation Schemas
class FarmStateResponse(BaseModel):
    """Farm state with crops."""
    farm_id: int
    user_id: int
    crops: List[dict]
    xp: int
    level: int
    coins: int
    last_updated: str


class FarmActionRequest(BaseModel):
    """Request to perform a farm action."""
    farm_id: int
    action: str = Field(..., description="Action: plant, water, fertilize, harvest")
    crop_id: Optional[str] = None
    crop_type: Optional[str] = None
    position: Optional[dict] = None


class FarmActionResponse(BaseModel):
    """Response after farm action."""
    success: bool
    message: str
    xp_earned: int
    coins_earned: int
    new_xp: int
    new_coins: int
    new_level: int


# Challenge Schemas
class ChallengeResponse(BaseModel):
    """Challenge information."""
    id: str
    title: str
    description: str
    progress: int
    target: int
    reward_xp: int
    reward_coins: int
    completed: bool
    challenge_type: str


# Achievement Schemas
class AchievementResponse(BaseModel):
    """Achievement information."""
    id: str
    title: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[str] = None
    reward_xp: int
    reward_coins: int
    progress: int = Field(default=0, description="Progress percentage (0-100)")


class AchievementsSummaryResponse(BaseModel):
    """Achievements summary information."""
    achievements: List[AchievementResponse]
    summary: dict


# Leaderboard Schemas
class LeaderboardEntry(BaseModel):
    """Leaderboard entry."""
    rank: int
    user_id: int
    username: str
    level: int
    xp: int
    total_harvests: int


class LeaderboardResponse(BaseModel):
    """Leaderboard response."""
    entries: List[LeaderboardEntry]
    user_rank: Optional[int] = None
