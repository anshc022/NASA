from __future__ import annotations

import asyncio
import json
import logging
import random
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, List
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from .achievements import AchievementsService
from .ai import AIAdvisor
from .auth import authenticate_user, create_access_token, get_current_user, get_password_hash
from .avatar_service import avatar_service
from .auth_schemas import (
    LanguageUpdate,
    TokenResponse,
    UserLogin,
    UserResponse,
    UserSignup,
    WelcomeBonusResponse,
)
from .config import get_settings
from .database import UserDB, get_db_connection


def serialize_user(user: dict | None) -> dict:
    """Normalize user row for API responses."""
    if not user:
        return {}

    normalized = user.copy()
    normalized.pop("password_hash", None)
    normalized["coins"] = int(normalized.get("coins") or 0)
    normalized["xp"] = int(normalized.get("xp") or 0)
    normalized["welcome_bonus_claimed"] = bool(normalized.get("welcome_bonus_claimed"))
    
    # Ensure avatar exists and is normalized to PNG for RN compatibility
    try:
        if not normalized.get("avatar_url"):
            normalized["avatar_url"] = avatar_service.ensure_user_has_avatar(normalized)
        else:
            normalized["avatar_url"] = avatar_service.normalize_avatar_url(normalized.get("avatar_url"))
    except:
        normalized["avatar_url"] = normalized.get("avatar_url") or None

    created_at = normalized.get("created_at")
    if created_at is not None:
        normalized["created_at"] = str(created_at)

    last_login = normalized.get("last_login")
    normalized["last_login"] = str(last_login) if last_login else None

    return normalized
from .nasa_client import NASAClient, NASAClientError, to_daily_series
from .recommendations import Recommendation
from .schemas import (
    FarmDataQuery, FarmDataResponse, RecommendationPayload, FarmCreate, FarmResponse,
    PlantScenario, CompleteScenarioRequest, PlayerProgress, ShopItem, PurchaseRequest
)
from .game_schemas import (
    FarmStateResponse, FarmActionRequest, FarmActionResponse,
    ChallengeResponse, AchievementResponse, AchievementsSummaryResponse, LeaderboardEntry, LeaderboardResponse
)
from .scenario_ai import ScenarioGenerator
from .challenges import ChallengesService
from .activity_tracker import log_activity, check_completable_challenges

app = FastAPI(
    title="Fasal Seva – NASA Farm Navigator Backend",
    version="0.1.0",
    description="Backend service providing NASA POWER data and AI-guided farming insights.",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add CORS middleware for mobile app access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React web
        "http://localhost:19006",  # Expo web
        "http://localhost:8081",   # Expo metro bundler
        "exp://localhost:19000",   # Expo development
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


async def get_nasa_client() -> NASAClient:
    return NASAClient()


@app.get("/")
async def root(settings=Depends(get_settings)) -> Dict[str, Any]:
    return {
        "message": "Welcome to Fasal Seva – NASA Farm Navigator",
        "nasa_parameters": settings.nasa_parameters.split(","),
        "ai_provider": settings.ai_provider,
        "status": "online",
        "version": "1.0.0",
    }


# ========================================
# AUTHENTICATION ENDPOINTS
# ========================================

@app.get("/auth/username-available")
async def username_available(username: str = Query(..., min_length=3, max_length=50)) -> Dict[str, Any]:
    """Check if a username is available (case-insensitive)."""
    normalized = username.strip().lower()
    exists = UserDB.get_user_by_username(normalized) is not None
    return {"username": normalized, "available": not exists}

@app.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """Register a new user."""
    # Normalize for case-insensitive uniqueness
    normalized_email = user_data.email.lower()
    normalized_username = user_data.username.lower()

    # Check if user already exists
    existing_user = UserDB.get_user_by_email(normalized_email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    
    existing_user = UserDB.get_user_by_username(normalized_username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    
    # Hash password and create user
    password_hash = get_password_hash(user_data.password)
    user_id = UserDB.create_user(
        email=normalized_email,
        username=normalized_username,
        password_hash=password_hash,
        full_name=user_data.full_name,
        language=user_data.language
    )
    
    if user_id is None:
        # Likely a race condition on uniqueness; report conflict for better UX
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or username already registered")
    
    # Get created user
    user = serialize_user(UserDB.get_user_by_id(user_id))
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user_id)})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user)
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with username/email and password."""
    user = authenticate_user(credentials.username_or_email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = serialize_user(user)

    # Auto-grant welcome bonus on first login if not claimed
    if not user.get("welcome_bonus_claimed", False):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Grant 1000 welcome bonus coins (users table only)
        cursor.execute("""
            UPDATE users SET coins = coins + 1000, welcome_bonus_claimed = 1 
            WHERE id = ?
        """, (user["id"],))
        
        # Create user_progress record for game statistics (no coins)
        cursor.execute("""
            INSERT OR IGNORE INTO user_progress (user_id, level, total_scenarios_completed, successful_harvests)
            VALUES (?, 1, 0, 0)
        """, (user["id"],))
        
        conn.commit()
        conn.close()
        
        # Update user object for return
        user["coins"] = (user.get("coins", 0) or 0) + 1000
        user["welcome_bonus_claimed"] = True

    # Create access token
    access_token = create_access_token(data={"sub": str(user["id"])})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user)
    )


@app.post("/auth/claim-welcome-bonus", response_model=WelcomeBonusResponse)
async def claim_welcome_bonus(current_user: dict = Depends(get_current_user)):
    """Allow user to claim one-time welcome bonus coins."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT coins, welcome_bonus_claimed FROM users WHERE id = ?",
        (current_user["id"],),
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    coins, claimed = row
    coins = coins or 0
    claimed = bool(claimed)

    if claimed:
        conn.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Welcome bonus already claimed")

    new_total = coins + 1000
    cursor.execute(
        "UPDATE users SET coins = ?, welcome_bonus_claimed = 1 WHERE id = ?",
        (new_total, current_user["id"]),
    )
    conn.commit()
    conn.close()

    return WelcomeBonusResponse(
        message="Welcome bonus claimed successfully!",
        coins_awarded=1000,
        total_coins=new_total,
    )


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information."""
    return UserResponse(**serialize_user(current_user))


@app.put("/auth/language", response_model=UserResponse)
async def update_language(
    language_data: LanguageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's preferred language."""
    from .database import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET language = ? WHERE id = ?",
        (language_data.language, current_user["id"])
    )
    conn.commit()
    conn.close()
    
    # Get updated user
    updated_user = UserDB.get_user_by_id(current_user["id"])
    updated_user.pop("password_hash", None)
    
    return UserResponse(**updated_user)


# =====================
# AVATAR ENDPOINTS
# =====================

@app.get("/avatar/options")
async def get_avatar_options(
    page: int = Query(0, ge=0, description="Page number (0-based)"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """Get paginated avatar options for the current user."""
    try:
        options = avatar_service.generate_avatar_options(current_user, page=page, per_page=per_page)
        return options
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate avatar options: {str(e)}")


@app.get("/avatar/categories")
async def get_avatar_categories(current_user: dict = Depends(get_current_user)):
    """Get avatar options organized by categories."""
    try:
        categories = avatar_service.generate_avatar_categories(current_user)
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate avatar categories: {str(e)}")


@app.get("/avatar/current")
async def get_current_avatar(current_user: dict = Depends(get_current_user)):
    """Get current user's avatar URL."""
    try:
        avatar_url = avatar_service.ensure_user_has_avatar(current_user)
        return {"avatar_url": avatar_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get avatar: {str(e)}")


@app.put("/avatar")
async def update_avatar(
    avatar_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's avatar."""
    try:
        avatar_url = avatar_data.get("avatar_url")
        if not avatar_url:
            raise HTTPException(status_code=400, detail="Avatar URL is required")
        
        success = avatar_service.update_user_avatar(current_user["id"], avatar_url)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update avatar")
        
        return {"success": True, "avatar_url": avatar_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update avatar: {str(e)}")


@app.get("/avatar/test")
async def test_avatar_generation(current_user: dict = Depends(get_current_user)):
    """Test avatar generation (for debugging)."""
    try:
        results = avatar_service.test_avatar_urls(current_user)
        return {"test_results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test avatars: {str(e)}")


# =====================
# USER FARMS ENDPOINTS
# =====================

@app.get("/farms", response_model=list[FarmResponse])
async def list_farms(current_user: dict = Depends(get_current_user)):
    """List farms for the current user."""
    from .database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, farm_name, latitude, longitude, crop_type, farm_size, created_at FROM user_farms WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],),
    )
    rows = cur.fetchall()
    conn.close()
    farms = [
        {
            "id": r[0],
            "farm_name": r[1],
            "latitude": r[2],
            "longitude": r[3],
            "crop_type": r[4],
            "farm_size": r[5],
            "created_at": str(r[6]),
        }
        for r in rows
    ]
    return farms


@app.post("/farms", response_model=FarmResponse, status_code=201)
async def create_farm(payload: FarmCreate, current_user: dict = Depends(get_current_user)):
    """Create a farm for the current user."""
    print(f"Creating farm for user {current_user.get('id')}: {payload}")
    try:
        from .database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO user_farms (user_id, farm_name, latitude, longitude, crop_type, farm_size)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["id"],
                payload.farm_name,
                payload.latitude,
                payload.longitude,
                payload.crop_type,
                payload.farm_size,
            ),
        )
    except Exception as e:
        print(f"Error creating farm: {e}")
        print(f"Payload: {payload}")
        raise HTTPException(status_code=400, detail=f"Error creating farm: {str(e)}")
    farm_id = cur.lastrowid
    conn.commit()
    cur.execute(
        "SELECT id, farm_name, latitude, longitude, crop_type, farm_size, created_at FROM user_farms WHERE id = ?",
        (farm_id,),
    )
    row = cur.fetchone()
    conn.close()
    return FarmResponse(
        id=row[0],
        farm_name=row[1],
        latitude=row[2],
        longitude=row[3],
        crop_type=row[4],
        farm_size=row[5],
        created_at=str(row[6]),
    )


@app.get("/date-ranges")
async def get_date_ranges():
    """Get suggested date ranges for NASA POWER data."""
    from datetime import datetime, timedelta
    today = datetime.now()
    
    # NASA POWER data has ~2-3 day lag
    max_end = today - timedelta(days=3)
    
    ranges = {
        "last_week": {
            "start": (max_end - timedelta(days=7)).strftime("%Y%m%d"),
            "end": max_end.strftime("%Y%m%d"),
        },
        "last_month": {
            "start": (max_end - timedelta(days=30)).strftime("%Y%m%d"),
            "end": max_end.strftime("%Y%m%d"),
        },
        "last_season": {
            "start": (max_end - timedelta(days=90)).strftime("%Y%m%d"),
            "end": max_end.strftime("%Y%m%d"),
        },
        "max_end_date": max_end.strftime("%Y%m%d"),
        "note": "NASA POWER data has a 2-3 day lag. Use dates ending before the max_end_date."
    }
    
    return ranges


@app.get("/farm-data", response_model=FarmDataResponse)
async def farm_data(
    lat: float = Query(..., ge=-90, le=90, description="Latitude of farm"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude of farm"),
    start: str = Query(..., pattern=r"^\d{8}$", description="Start date (YYYYMMDD)"),
    end: str = Query(..., pattern=r"^\d{8}$", description="End date (YYYYMMDD)"),
    crop_type: str | None = Query(
        default=None,
        description="Optional crop type for AI personalization",
    ),
    nasa_client: NASAClient = Depends(get_nasa_client),
) -> FarmDataResponse:
    if end < start:
        raise HTTPException(status_code=400, detail="end date must not be earlier than start date")

    try:
        logger.info(f"Fetching NASA data for lat={lat}, lon={lon}, start={start}, end={end}")
        parameter_data = await nasa_client.fetch_daily_power_data(
            lat=lat, lon=lon, start=start, end=end
        )
        logger.info(f"Successfully fetched {len(parameter_data)} parameters from NASA")
    except NASAClientError as exc:
        logger.error(f"NASA client error: {exc}")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"Unexpected error fetching NASA data: {type(exc).__name__}: {exc}")
        # Check if it's a NASA client error with date range issue
        if isinstance(exc, NASAClientError) and "422" in str(exc):
            from datetime import datetime, timedelta
            today = datetime.now()
            suggested_end = (today - timedelta(days=3)).strftime("%Y%m%d")
            suggested_start = (today - timedelta(days=33)).strftime("%Y%m%d")
            error_msg = f"Invalid date range. NASA POWER data has a 2-3 day lag. Try dates ending before {suggested_end} (e.g., {suggested_start} to {suggested_end})"
            raise HTTPException(status_code=400, detail=error_msg) from exc
        raise HTTPException(status_code=502, detail="Failed to fetch data from NASA POWER") from exc

    daily_records = [
        _normalise_keys(record)
        for record in to_daily_series(parameter_data)
    ]

    advisor = AIAdvisor()
    recommendation = await advisor.advise(parameter_data, crop_type=crop_type)

    # Close the NASA client
    await nasa_client.close()

    return FarmDataResponse(
        location={"lat": lat, "lon": lon},
        period={"start": start, "end": end},
        crop_type=crop_type,
        parameters=parameter_data,
        daily=daily_records,
        recommendation=RecommendationPayload(**recommendation.__dict__),
    )


def _normalise_keys(record: Dict[str, Any]) -> Dict[str, Any]:
    mapping = {
        "t2m": "t2m",
        "rh2m": "rh2m",
        "prectot": "prectot",
        "sza": "sza",
        "ws2m": "ws2m",
    }
    normalised = {"date": record["date"]}
    for key, value in record.items():
        if key == "date":
            continue
        normalised[mapping.get(key, key)] = value
    # If PRECTOT missing but PRECTOTCORR exists, map it
    if normalised.get("prectot") in (None, "") and "prectotcorr" in record:
        try:
            corr_val = float(record.get("prectotcorr"))
            normalised["prectot"] = corr_val
        except Exception:
            pass
    return normalised


# ========================================
# GAME MECHANICS ENDPOINTS
# ========================================

from .game_logic import (
    CHALLENGES, ACHIEVEMENTS, calculate_level, get_action_rewards,
    update_challenge_progress, check_and_unlock_achievements
)


@app.post("/farm/start", response_model=FarmStateResponse)
async def start_farm(farm_id: int, current_user: dict = Depends(get_current_user)):
    """Initialize or get farm state."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if farm exists and belongs to user
    cursor.execute("SELECT id FROM user_farms WHERE id = ? AND user_id = ?", (farm_id, current_user["id"]))
    farm = cursor.fetchone()
    
    if not farm:
        conn.close()
        raise HTTPException(status_code=404, detail="Farm not found")
    
    # Check if farm state exists
    cursor.execute("SELECT * FROM farm_state WHERE farm_id = ?", (farm_id,))
    state = cursor.fetchone()
    
    if not state:
        # Create initial state
        cursor.execute(
            """INSERT INTO farm_state (farm_id, user_id, crops_json, xp, level, coins) 
               VALUES (?, ?, ?, 0, 1, 0)""",
            (farm_id, current_user["id"], "[]")
        )
        conn.commit()
        
        # Create user stats
        cursor.execute(
            "INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)",
            (current_user["id"],)
        )
        conn.commit()
        
        conn.close()
        return FarmStateResponse(
            farm_id=farm_id,
            user_id=current_user["id"],
            crops=[],
            xp=0,
            level=1,
            coins=0,
            last_updated=datetime.now().isoformat()
        )
    
    conn.close()
    return FarmStateResponse(
        farm_id=farm_id,
        user_id=current_user["id"],
        crops=json.loads(state[3]),
        xp=state[4],
        level=state[5],
        coins=state[6],
        last_updated=str(state[7])
    )


@app.get("/farm/state/{farm_id}", response_model=FarmStateResponse)
async def get_farm_state(farm_id: int, current_user: dict = Depends(get_current_user)):
    """Get current farm state."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM farm_state WHERE farm_id = ? AND user_id = ?",
        (farm_id, current_user["id"])
    )
    state = cursor.fetchone()
    conn.close()
    
    if not state:
        raise HTTPException(status_code=404, detail="Farm state not found. Initialize with /farm/start")
    
    return FarmStateResponse(
        farm_id=farm_id,
        user_id=current_user["id"],
        crops=json.loads(state[3]),
        xp=state[4],
        level=state[5],
        coins=state[6],
        last_updated=str(state[7])
    )


@app.post("/farm/action", response_model=FarmActionResponse)
async def perform_farm_action(
    action_data: FarmActionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Perform a farm action: plant, water, fertilize, harvest."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current farm state
    cursor.execute(
        "SELECT crops_json, xp, level, coins FROM farm_state WHERE farm_id = ? AND user_id = ?",
        (action_data.farm_id, current_user["id"])
    )
    state = cursor.fetchone()
    
    if not state:
        conn.close()
        raise HTTPException(status_code=404, detail="Farm state not found")
    
    crops = json.loads(state[0])
    current_xp = state[1]
    current_level = state[2]
    current_coins = state[3]
    
    # Get action rewards
    base_xp, coins_change = get_action_rewards(action_data.action)
    
    # Validate action
    if action_data.action == "plant":
        if current_coins + coins_change < 0:
            conn.close()
            raise HTTPException(status_code=400, detail="Not enough coins")
        # Add crop to crops list (simplified)
        new_crop = {
            "id": f"crop_{len(crops)}_{datetime.now().timestamp()}",
            "type": action_data.crop_type or "wheat",
            "planted_at": datetime.now().isoformat(),
            "growth": 0,
            "health": 100
        }
        crops.append(new_crop)
        
        # Update stats
        cursor.execute(
            "UPDATE user_stats SET total_plants = total_plants + 1 WHERE user_id = ?",
            (current_user["id"],)
        )
        
    elif action_data.action == "water":
        # Update stats
        cursor.execute(
            "UPDATE user_stats SET total_waters = total_waters + 1 WHERE user_id = ?",
            (current_user["id"],)
        )
        
    elif action_data.action == "fertilize":
        if current_coins + coins_change < 0:
            conn.close()
            raise HTTPException(status_code=400, detail="Not enough coins")
        # Update stats
        cursor.execute(
            "UPDATE user_stats SET total_fertilizes = total_fertilizes + 1 WHERE user_id = ?",
            (current_user["id"],)
        )
        
    elif action_data.action == "harvest":
        # Update stats
        cursor.execute(
            "UPDATE user_stats SET total_harvests = total_harvests + 1 WHERE user_id = ?",
            (current_user["id"],)
        )
    
    # Update challenge progress and get bonus rewards
    bonus_xp, bonus_coins = update_challenge_progress(conn, current_user["id"], action_data.action)
    
    # Calculate new values
    total_xp_earned = base_xp + bonus_xp
    total_coins_earned = coins_change + bonus_coins
    new_xp = current_xp + total_xp_earned
    new_coins = current_coins + total_coins_earned
    new_level = calculate_level(new_xp)
    
    # Check achievements
    check_and_unlock_achievements(conn, current_user["id"], {
        "total_plants": None,  # Will fetch from stats if needed
        "level": new_level,
        "coins": new_coins
    })
    
    # Update farm state
    cursor.execute(
        """UPDATE farm_state SET crops_json = ?, xp = ?, level = ?, coins = ?, last_updated = ?
           WHERE farm_id = ? AND user_id = ?""",
        (json.dumps(crops), new_xp, new_level, new_coins, datetime.now().isoformat(),
         action_data.farm_id, current_user["id"])
    )
    conn.commit()
    conn.close()
    
    return FarmActionResponse(
        success=True,
        message=f"Action '{action_data.action}' performed successfully!",
        xp_earned=total_xp_earned,
        coins_earned=total_coins_earned,
        new_xp=new_xp,
        new_coins=new_coins,
        new_level=new_level
    )


@app.get("/challenges")
async def get_challenges(current_user: dict = Depends(get_current_user)):
    """Get all challenges with user progress using real data."""
    from .database import get_db_session
    
    try:
        # Use SQLAlchemy session for better database handling
        db = get_db_session()
        challenges_service = ChallengesService(db)
        
        # Get comprehensive challenges data
        challenges_data = challenges_service.get_user_challenges(current_user["id"])
        
        if not challenges_data["success"]:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to get challenges: {challenges_data.get('error', 'Unknown error')}"
            )
        
        # Transform data for frontend compatibility
        all_challenges = []
        
        # Add active challenges
        for challenge in challenges_data["active_challenges"]:
            all_challenges.append({
                "id": challenge["id"],
                "title": challenge["title"],
                "description": challenge["description"],
                "progress": challenge["current"],
                "target": challenge["target"],
                "reward_xp": challenge["reward_xp"],
                "reward_coins": challenge["reward_coins"],
                "completed": challenge["is_completed"],
                "challenge_type": challenge["type"],
                "category": challenge["category"],
                "icon": challenge["icon"],
                "difficulty": challenge["difficulty"],
                "estimated_time": challenge["estimated_time"],
                "progress_percentage": challenge["progress"]
            })
        
        # Add weekly challenges
        for challenge in challenges_data["weekly_challenges"]:
            all_challenges.append({
                "id": challenge["id"],
                "title": challenge["title"],
                "description": challenge["description"],
                "progress": challenge["current"],
                "target": challenge["target"],
                "reward_xp": challenge["reward_xp"],
                "reward_coins": challenge["reward_coins"],
                "completed": challenge["is_completed"],
                "challenge_type": challenge["type"],
                "category": challenge["category"],
                "icon": challenge["icon"],
                "deadline": challenge["deadline"],
                "progress_percentage": challenge["progress"]
            })
        
        # Add daily challenges
        for challenge in challenges_data["daily_challenges"]:
            all_challenges.append({
                "id": challenge["id"],
                "title": challenge["title"],
                "description": challenge["description"],
                "progress": challenge["current"],
                "target": challenge["target"],
                "reward_xp": challenge["reward_xp"],
                "reward_coins": challenge["reward_coins"],
                "completed": challenge["is_completed"],
                "challenge_type": challenge["type"],
                "category": challenge["category"],
                "icon": challenge["icon"],
                "deadline": challenge["deadline"],
                "progress_percentage": challenge["progress"]
            })
        
        db.close()
        
        # Calculate total available rewards from active challenges only
        total_available_xp = sum(c.get("reward_xp", 0) for c in challenges_data["active_challenges"])
        total_available_coins = sum(c.get("reward_coins", 0) for c in challenges_data["active_challenges"])
        
        return {
            "success": True,
            "challenges": all_challenges,
            "summary": {
                "total_active": challenges_data["total_active"],
                "total_completed": challenges_data["total_completed"],
                "user_stats": challenges_data["user_stats"],
                "total_available_xp": total_available_xp,
                "total_available_coins": total_available_coins
            }
        }
        
    except Exception as e:
        print(f"Error in get_challenges endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting challenges: {str(e)}")


@app.post("/challenges/{challenge_id}/complete")
async def complete_challenge(
    challenge_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Complete a challenge and award rewards."""
    from .database import get_db_session
    
    try:
        db = get_db_session()
        challenges_service = ChallengesService(db)
        
        # Attempt to complete the challenge
        result = challenges_service.complete_challenge(current_user["id"], challenge_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=400, 
                detail=result.get("error", "Failed to complete challenge")
            )
        
        db.close()
        
        return {
            "success": True,
            "message": f"Challenge '{result['challenge']['title']}' completed!",
            "rewards": result["rewards"],
            "challenge": result["challenge"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error completing challenge: {e}")
        raise HTTPException(status_code=500, detail=f"Error completing challenge: {str(e)}")


@app.get("/achievements", response_model=AchievementsSummaryResponse)
async def get_achievements(current_user: dict = Depends(get_current_user)):
    """Get all achievements with unlock status and progress."""
    try:
        achievements_service = AchievementsService()
        
        # Get user achievements with progress
        achievements_data = achievements_service.get_user_achievements(current_user["id"])
        
        # Transform for response
        achievements_list = []
        for achievement in achievements_data["achievements"]:
            achievements_list.append(AchievementResponse(
                id=achievement["id"],
                title=achievement["title"],
                description=achievement["description"],
                icon=achievement["icon"],
                unlocked=achievement["unlocked"],
                unlocked_at=achievement["unlocked_at"],
                reward_xp=achievement["reward_xp"],
                reward_coins=achievement["reward_coins"],
                progress=achievement["progress"]
            ))
        
        return AchievementsSummaryResponse(
            achievements=achievements_list,
            summary=achievements_data["summary"]
        )
        
    except Exception as e:
        print(f"Error getting achievements: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting achievements: {str(e)}")


@app.get("/achievements/stats")
async def get_achievement_stats(current_user: dict = Depends(get_current_user)):
    """Get achievement statistics for user."""
    try:
        achievements_service = AchievementsService()
        stats = achievements_service.get_achievement_stats(current_user["id"])
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        print(f"Error getting achievement stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting achievement stats: {str(e)}")


@app.post("/achievements/check")
async def check_achievements(current_user: dict = Depends(get_current_user)):
    """Manually check for new achievement unlocks."""
    try:
        achievements_service = AchievementsService()
        newly_unlocked = achievements_service.check_achievements(current_user["id"])
        
        return {
            "success": True,
            "newly_unlocked": newly_unlocked,
            "count": len(newly_unlocked)
        }
        
    except Exception as e:
        print(f"Error checking achievements: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking achievements: {str(e)}")


@app.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Get leaderboard rankings."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get top users by XP
    cursor.execute("""
        SELECT u.id, u.username, COALESCE(f.level, 1) as level, COALESCE(f.xp, 0) as xp, 
               COALESCE(s.total_harvests, 0) as harvests
        FROM users u
        LEFT JOIN (
            SELECT user_id, MAX(level) as level, MAX(xp) as xp 
            FROM farm_state 
            GROUP BY user_id
        ) f ON u.id = f.user_id
        LEFT JOIN user_stats s ON u.id = s.user_id
        ORDER BY xp DESC, level DESC
        LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    
    entries = []
    user_rank = None
    
    for idx, row in enumerate(rows, start=1):
        entry = LeaderboardEntry(
            rank=idx,
            user_id=row[0],
            username=row[1],
            level=row[2],
            xp=row[3],
            total_harvests=row[4]
        )
        entries.append(entry)
        
        if row[0] == current_user["id"]:
            user_rank = idx
    
    # If user not in top, find their rank
    if user_rank is None:
        cursor.execute("""
            SELECT COUNT(*) + 1
            FROM farm_state
            WHERE xp > (SELECT COALESCE(MAX(xp), 0) FROM farm_state WHERE user_id = ?)
        """, (current_user["id"],))
        result = cursor.fetchone()
        if result:
            user_rank = result[0]
    
    conn.close()
    
    return LeaderboardResponse(
        entries=entries,
        user_rank=user_rank
    )


# Farm Management Endpoints
@app.get("/farm/status")
async def get_farm_status(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the complete farm status for the current user."""
    from .database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, position_row, position_col, planted_at, 
                   growth_stage, water_level, health, fertilizer_level,
                   latitude, longitude, climate_bonus
            FROM crops WHERE user_id = ?
        """, (current_user["id"],))
        
        crops = []
        for row in cursor.fetchall():
            crops.append({
                "id": row[0],
                "name": row[1],
                "position_row": row[2],
                "position_col": row[3],
                "planted_at": row[4],
                "growth_stage": row[5],
                "water_level": row[6],
                "health": row[7],
                "fertilizer_level": row[8] if row[8] is not None else 100,
                "latitude": row[9],
                "longitude": row[10],
                "climate_bonus": row[11] if row[11] is not None else 0.0,
            })
        
        # Update growth for all crops based on time and climate
        current_time = datetime.now()
        updated_crops = []
        
        # Natural plant degradation system - plants need ongoing care
        for crop in crops:
            plant_age_hours = (current_time - datetime.fromisoformat(crop["planted_at"].replace('Z', '+00:00').replace('+00:00', ''))).total_seconds() / 3600
            
            # Calculate degradation rates (per hour)
            water_degradation_rate = 1.0  # Lose 1% water per hour
            fertilizer_degradation_rate = 0.8  # Lose 0.8% fertilizer per hour  
            health_degradation_rate = 0.3  # Lose 0.3% health per hour if water/fertilizer low
            
            # Apply natural degradation based on time since last care
            current_water = crop["water_level"]
            current_fertilizer = crop["fertilizer_level"] 
            current_health = crop["health"]
            
            # Degrade water and fertilizer over time
            new_water = max(0, current_water - (water_degradation_rate * min(plant_age_hours, 24)))
            new_fertilizer = max(0, current_fertilizer - (fertilizer_degradation_rate * min(plant_age_hours, 24)))
            
            # Health degrades faster if water or fertilizer is low
            if new_water < 30 or new_fertilizer < 30:
                health_degradation_rate *= 2.0  # Double degradation if neglected
            
            new_health = max(10, current_health - (health_degradation_rate * min(plant_age_hours, 24)))
            
            # Update crop levels in database if they changed significantly
            if abs(new_water - current_water) > 1 or abs(new_fertilizer - current_fertilizer) > 1 or abs(new_health - current_health) > 1:
                cursor.execute("""
                    UPDATE crops 
                    SET water_level = ?, fertilizer_level = ?, health = ?
                    WHERE id = ?
                """, (new_water, new_fertilizer, new_health, crop["id"]))
                
                # Update crop data
                crop["water_level"] = new_water
                crop["fertilizer_level"] = new_fertilizer  
                crop["health"] = new_health
        
        for crop in crops:
            # Check for active scenarios for this crop
            active_scenarios = ScenarioGenerator.get_active_scenarios(current_user["id"], crop["id"])
            crop["active_scenarios"] = len(active_scenarios)
            crop["needs_attention"] = len(active_scenarios) > 0
            crop["scenario_types"] = [s["scenario_type"] for s in active_scenarios]
            
            # Auto-generate scenarios if crop has location and none exist
            if crop["latitude"] and crop["longitude"] and len(active_scenarios) == 0:
                # Occasionally check for new scenarios (10% chance per status check)
                if random.random() < 0.1:
                    try:
                        # Get recent NASA data
                        nasa_client = NASAClient()
                        end_date = datetime.now()
                        start_date = end_date.replace(day=max(1, end_date.day - 3))
                        
                        query = FarmDataQuery(
                            lat=crop["latitude"],
                            lon=crop["longitude"],
                            start=start_date.strftime('%Y%m%d'),
                            end=end_date.strftime('%Y%m%d'),
                            crop_type=crop["name"]
                        )
                        
                        nasa_data = await nasa_client.get_farm_data(query)
                        location_info = {"latitude": crop["latitude"], "longitude": crop["longitude"]}
                        scenarios = await ScenarioGenerator.analyze_nasa_data_for_scenarios(nasa_data, crop, location_info)
                        
                        # Save new scenarios
                        for scenario_data in scenarios:
                            ScenarioGenerator.save_scenario_to_db(current_user["id"], crop["id"], scenario_data)
                        
                        if scenarios:
                            crop["active_scenarios"] = len(scenarios)
                            crop["needs_attention"] = True
                            crop["scenario_types"] = [s["scenario_type"] for s in scenarios]
                    
                    except Exception as e:
                        print(f"Failed to auto-generate scenarios: {e}")
            
            if crop["growth_stage"] < 100:
                # Calculate time since planting
                planted_at = datetime.fromisoformat(crop["planted_at"].replace('Z', '+00:00').replace('+00:00', ''))
                hours_passed = (current_time - planted_at).total_seconds() / 3600
                
                # Base growth rate (crops mature in ~4 hours)
                base_growth_rate = 25.0  # 25% per hour = 100% in 4 hours
                
                # Apply climate bonus
                climate_multiplier = 1.0 + crop["climate_bonus"]
                actual_growth_rate = base_growth_rate * climate_multiplier
                
                # Calculate new growth stage
                new_growth = min(100, hours_passed * actual_growth_rate)
                
                if new_growth != crop["growth_stage"]:
                    # Update growth in database
                    cursor.execute("""
                        UPDATE crops SET growth_stage = ? WHERE id = ?
                    """, (new_growth, crop["id"]))
                    crop["growth_stage"] = new_growth
                    
            updated_crops.append(crop)
        
        conn.commit()
        
        return {"crops": updated_crops, "status": "success"}

@app.post("/farm/plant")
async def plant_crop(
    request: dict,
    current_user: Dict[str, Any] = Depends(get_current_user),
    nasa_client: NASAClient = Depends(get_nasa_client)
):
    """Plant a crop at the specified position with location-based climate data."""
    from .database import get_db_connection
    
    position_row = request.get("position_row")
    position_col = request.get("position_col") 
    crop_type = request.get("crop_type")
    latitude = request.get("latitude")
    longitude = request.get("longitude")
    
    if position_row is None or position_col is None or not crop_type:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Location is required for planting. Please select a farm location first.")
    
    # Crop costs mapping
    crop_costs = {
        "Tomato": 10, "Wheat": 5, "Corn": 15,
        "Carrot": 8, "Potato": 12, "Lettuce": 6
    }
    
    cost = crop_costs.get(crop_type, 10)
    
    # Check if user has enough coins
    if current_user.get("coins", 0) < cost:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Get NASA climate data for the location
    try:
        nasa_data = nasa_client.get_farm_data(latitude, longitude)
        
        # Calculate climate bonus based on NASA data
        climate_bonus = 0.0
        if nasa_data and "properties" in nasa_data:
            props = nasa_data["properties"]["parameter"]
            
            # Temperature bonus (optimal 20-30°C)
            if "T2M" in props:
                temp = props["T2M"]
                if isinstance(temp, dict) and temp:
                    avg_temp = sum(temp.values()) / len(temp)
                    if 20 <= avg_temp <= 30:
                        climate_bonus += 0.2
                    elif 15 <= avg_temp <= 35:
                        climate_bonus += 0.1
            
            # Precipitation bonus (optimal 2-5mm/day)
            if "PRECTOTCORR" in props:
                precip = props["PRECTOTCORR"]
                if isinstance(precip, dict) and precip:
                    avg_precip = sum(precip.values()) / len(precip)
                    if 2 <= avg_precip <= 5:
                        climate_bonus += 0.15
                    elif 1 <= avg_precip <= 7:
                        climate_bonus += 0.05
            
            # Solar radiation bonus (optimal >15 kWh/m²)
            if "ALLSKY_SFC_SW_DWN" in props:
                solar = props["ALLSKY_SFC_SW_DWN"]
                if isinstance(solar, dict) and solar:
                    avg_solar = sum(solar.values()) / len(solar)
                    if avg_solar > 15:
                        climate_bonus += 0.1
                    elif avg_solar > 10:
                        climate_bonus += 0.05
    except Exception as e:
        # Don't fail planting due to NASA API issues, just use no bonus
        print(f"NASA API error during planting: {e}")
        climate_bonus = 0.0
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Check if position is already occupied
        cursor.execute("""
            SELECT id FROM crops 
            WHERE user_id = ? AND position_row = ? AND position_col = ?
        """, (current_user["id"], position_row, position_col))
        
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Position already occupied")
        
        # Create new crop with location and realistic starting conditions
        # New plants start with moderate levels and need care to thrive
        cursor.execute("""
            INSERT INTO crops (user_id, name, position_row, position_col, planted_at, 
                             growth_stage, water_level, health, fertilizer_level,
                             latitude, longitude, climate_bonus)
            VALUES (?, ?, ?, ?, ?, 0, 60, 75, 40, ?, ?, ?)
        """, (current_user["id"], crop_type, position_row, position_col, datetime.now(),
              latitude, longitude, climate_bonus))
        
        crop_id = cursor.lastrowid
        
        # Deduct coins from user
        new_coins = current_user["coins"] - cost
        cursor.execute("UPDATE users SET coins = ? WHERE id = ?", (new_coins, current_user["id"]))
        
        # Store NASA data in database to avoid repeated API calls
        if nasa_data and "properties" in nasa_data:
            try:
                import json
                nasa_params = nasa_data["properties"]["parameter"]
                cursor.execute("""
                    INSERT OR REPLACE INTO nasa_data (crop_id, latitude, longitude, 
                                                    temperature, precipitation, solar_radiation, 
                                                    humidity, wind_speed, fetched_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    crop_id, latitude, longitude,
                    json.dumps(nasa_params.get("T2M", {})), 
                    json.dumps(nasa_params.get("PRECTOTCORR", {})),
                    json.dumps(nasa_params.get("ALLSKY_SFC_SW_DWN", {})),
                    json.dumps(nasa_params.get("RH2M", {})),
                    json.dumps(nasa_params.get("WS2M", {})),
                    datetime.now()
                ))
                print(f"Stored NASA data for crop {crop_id}")
            except Exception as e:
                print(f"Failed to store NASA data: {e}")
        
        conn.commit()
        
        # Generate initial scenarios for the newly planted crop
        try:
            crop_dict = {
                "id": crop_id,
                "user_id": current_user["id"], 
                "name": crop_type,
                "latitude": latitude,
                "longitude": longitude,
                "growth_stage": 0,
                "health": 100,
                "water_level": 100,
                "fertilizer_level": 100,
                "planted_at": datetime.now()
            }
            
            if nasa_data:
                # Generate scenarios using NASA data
                location_info = {"latitude": latitude, "longitude": longitude}
                scenarios = await ScenarioGenerator.analyze_nasa_data_for_scenarios(nasa_data, crop_dict, location_info)
                print(f"Generated {len(scenarios)} initial scenarios for crop {crop_id}")
        except Exception as e:
            print(f"Failed to generate initial scenarios: {e}")
            # Don't fail the planting if scenario generation fails
        
        # Trigger educational content update since user added new plant
        try:
            from .educational_manager import educational_manager
            await educational_manager.invalidate_user_content(current_user["id"])
            print(f"🎓 Educational content invalidated for user {current_user['id']} due to new plant")
        except Exception as e:
            print(f"Warning: Failed to update educational content: {e}")
        
        # Log activity for challenges tracking
        try:
            from .database import get_db_session
            activity_db = get_db_session()
            log_activity(activity_db, current_user["id"], "plant", crop_id, xp_earned=20, coins_earned=0)
            
            # Check for newly completable challenges
            completable = check_completable_challenges(activity_db, current_user["id"])
            if completable:
                print(f"🎯 User {current_user['id']} has {len(completable)} completable challenges after planting!")
            
            activity_db.close()
        except Exception as e:
            print(f"Warning: Failed to log planting activity: {e}")
        
        return {
            "crop_id": crop_id,
            "cost": cost,
            "growth_stage": 0,
            "climate_bonus": climate_bonus,
            "location": {"latitude": latitude, "longitude": longitude},
            "water_level": 60,  # Realistic starting value
            "health": 75,      # Realistic starting value
            "fertilizer_level": 40,  # Realistic starting value
            "rewards": {"xp": 20, "coins": 0},  # Updated to match logged activity
            "status": "success",
            "message": "Crop planted successfully! New educational content will be generated based on your expanded farm."
        }

@app.post("/farm/water/{crop_id}")
async def water_crop(
    crop_id: int,
    quality_level: str = "basic",  # basic (5 coins), premium (12 coins), expert (20 coins)
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Water a specific crop with realistic costs and quality scoring."""
    from .database import get_db_connection
    
    # Water quality costs and benefits
    water_options = {
        "basic": {"cost": 5, "water_boost": 25, "health_boost": 3, "quality_score": 60},
        "premium": {"cost": 12, "water_boost": 40, "health_boost": 8, "quality_score": 80},
        "expert": {"cost": 20, "water_boost": 50, "health_boost": 15, "quality_score": 95}
    }
    
    if quality_level not in water_options:
        quality_level = "basic"
    
    water_config = water_options[quality_level]
    
    # Check if user has enough coins
    if current_user.get("coins", 0) < water_config["cost"]:
        raise HTTPException(status_code=400, detail=f"Insufficient coins for {quality_level} watering (need {water_config['cost']} coins)")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get crop details including care history
        cursor.execute("""
            SELECT id, water_level, health, fertilizer_level, 
                   total_investment, care_score, last_watered
            FROM crops 
            WHERE id = ? AND user_id = ?
        """, (crop_id, current_user["id"]))
        
        crop = cursor.fetchone()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        # Calculate care quality based on timing and current plant state
        current_water = crop[1] or 50
        current_health = crop[2] or 50
        current_investment = crop[4] or 0
        current_care_score = crop[5] or 60.0
        
        # Determine watering efficiency (better when plant really needs water)
        water_need_factor = max(0.5, (100 - current_water) / 100)
        efficiency_score = water_config["quality_score"] * water_need_factor
        
        # Update plant levels
        new_water_level = min(100, current_water + water_config["water_boost"])
        new_health = min(100, current_health + water_config["health_boost"])
        new_investment = current_investment + water_config["cost"]
        
        # Calculate updated care score (weighted average)
        new_care_score = (current_care_score * 0.8) + (efficiency_score * 0.2)
        
        # Determine rewards based on care quality
        base_xp = 8
        base_coins = 0  # No coins earned, this costs money
        
        if efficiency_score >= 85:
            bonus_xp = 5
            quality_rating = "Excellent"
        elif efficiency_score >= 70:
            bonus_xp = 3
            quality_rating = "Good"
        else:
            bonus_xp = 1
            quality_rating = "Adequate"
        
        total_xp = base_xp + bonus_xp
        
        # Update crop in database
        cursor.execute("""
            UPDATE crops SET 
                water_level = ?, health = ?, total_investment = ?, 
                care_score = ?, last_watered = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_water_level, new_health, new_investment, new_care_score, crop_id))
        
        # Update user coins and XP
        new_coins = current_user["coins"] - water_config["cost"]
        new_xp = current_user.get("xp", 0) + total_xp
        cursor.execute("UPDATE users SET coins = ?, xp = ? WHERE id = ?", 
                      (new_coins, new_xp, current_user["id"]))
        
        # Track care action for scoring
        cursor.execute("""
            INSERT OR REPLACE INTO crop_care_log 
            (crop_id, user_id, action_type, quality_level, cost_paid, efficiency_score, created_at)
            VALUES (?, ?, 'water', ?, ?, ?, CURRENT_TIMESTAMP)
        """, (crop_id, current_user["id"], quality_level, water_config["cost"], efficiency_score))
        
        conn.commit()
        
        # Log activity and check for challenge completions
        from .activity_tracker import log_activity
        log_activity(
            user_id=current_user["id"],
            action_type="water", 
            xp_earned=total_xp,
            coins_earned=0,
            db_connection=conn
        )
        
        # Generate care recommendations
        recommendations = []
        if new_water_level > 90:
            recommendations.append("🚰 Plant is well-watered! Wait before next watering to avoid overwatering")
        if current_health < 60:
            recommendations.append("🌱 Consider fertilizing to boost plant health")
        if quality_level == "basic" and current_investment > 50:
            recommendations.append("💰 Try premium watering for better results on your investment!")
        
        return {
            "action": f"{quality_level.title()} Watering",
            "cost_paid": water_config["cost"],
            "water_level": new_water_level,
            "health": new_health,
            "care_score": round(new_care_score, 1),
            "efficiency_score": round(efficiency_score, 1),
            "quality_rating": quality_rating,
            "total_investment": new_investment,
            "rewards": {"xp": total_xp, "coins_spent": water_config["cost"]},
            "recommendations": recommendations,
            "status": "success"
        }

@app.post("/farm/harvest/{crop_id}")
async def harvest_crop(
    crop_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Harvest a mature crop."""
    from .database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get crop details
        cursor.execute("""
            SELECT id, growth_stage, health, name FROM crops 
            WHERE id = ? AND user_id = ?
        """, (crop_id, current_user["id"]))
        
        crop = cursor.fetchone()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        if crop[1] < 100:  # growth_stage < 100
            raise HTTPException(status_code=400, detail="Crop not ready for harvest")
        
        # Calculate rewards based on health
        base_reward = 50
        health_bonus = int((crop[2] / 100) * 50)
        total_xp = base_reward + health_bonus
        total_coins = (base_reward * 2) + (health_bonus * 2)
        
        # Remove crop from database
        cursor.execute("DELETE FROM crops WHERE id = ?", (crop_id,))
        
        # Add rewards to user
        new_coins = current_user["coins"] + total_coins
        new_xp = current_user.get("xp", 0) + total_xp
        cursor.execute("UPDATE users SET coins = ?, xp = ? WHERE id = ?", 
                      (new_coins, new_xp, current_user["id"]))
        
        # Log activity and check for challenge completions
        from .activity_tracker import log_activity
        log_activity(
            user_id=current_user["id"],
            action_type="harvest", 
            xp_earned=total_xp,
            coins_earned=total_coins,
            db_connection=conn
        )
        
        conn.commit()
        
        return {
            "rewards": {"xp": total_xp, "coins": total_coins},
            "crop_name": crop[3],
            "health_bonus": health_bonus,
            "status": "success"
        }

@app.post("/farm/fertilize/{crop_id}")
async def fertilize_crop(
    crop_id: int,
    fertilizer_type: str = "basic",  # basic (15 coins), organic (25 coins), premium (40 coins)
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Fertilize a crop with realistic costs and advanced plant nutrition science."""
    from .database import get_db_connection
    
    # Fertilizer types with different costs and benefits
    fertilizer_options = {
        "basic": {
            "cost": 15, "nutrient_boost": 30, "health_boost": 8, "growth_bonus": 1.2,
            "quality_score": 65, "duration": 7, "name": "Basic NPK Fertilizer"
        },
        "organic": {
            "cost": 25, "nutrient_boost": 45, "health_boost": 15, "growth_bonus": 1.5,
            "quality_score": 85, "duration": 12, "name": "Organic Compost Blend"
        },
        "premium": {
            "cost": 40, "nutrient_boost": 60, "health_boost": 25, "growth_bonus": 2.0,
            "quality_score": 95, "duration": 18, "name": "Expert Slow-Release Formula"
        }
    }
    
    if fertilizer_type not in fertilizer_options:
        fertilizer_type = "basic"
    
    fertilizer_config = fertilizer_options[fertilizer_type]
    
    # Check if user has enough coins
    if current_user.get("coins", 0) < fertilizer_config["cost"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient coins for {fertilizer_config['name']} (need {fertilizer_config['cost']} coins)"
        )
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get comprehensive crop details
        cursor.execute("""
            SELECT id, fertilizer_level, health, water_level, growth_stage,
                   total_investment, care_score, last_fertilized, planted_at
            FROM crops 
            WHERE id = ? AND user_id = ?
        """, (crop_id, current_user["id"]))
        
        crop = cursor.fetchone()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        current_fertilizer = crop[1] or 50
        current_health = crop[2] or 50
        current_water = crop[3] or 50
        growth_stage = crop[4] or 1
        current_investment = crop[5] or 0
        current_care_score = crop[6] or 60.0
        
        # Calculate fertilizer effectiveness based on plant state and growth stage
        # Plants need more fertilizer during growth periods
        growth_factor = 1.0 + (growth_stage * 0.15)  # 15% more effective per growth stage
        water_synergy = 0.7 + (current_water / 100 * 0.3)  # Better with adequate water
        
        # Avoid over-fertilization penalty
        over_fertilizer_penalty = 1.0
        if current_fertilizer > 80:
            over_fertilizer_penalty = 0.6  # Diminished returns from over-fertilization
        
        effectiveness_multiplier = growth_factor * water_synergy * over_fertilizer_penalty
        
        # Apply fertilizer effects
        actual_nutrient_boost = int(fertilizer_config["nutrient_boost"] * effectiveness_multiplier)
        actual_health_boost = int(fertilizer_config["health_boost"] * effectiveness_multiplier)
        
        new_fertilizer_level = min(100, current_fertilizer + actual_nutrient_boost)
        new_health = min(100, current_health + actual_health_boost)
        new_investment = current_investment + fertilizer_config["cost"]
        
        # Calculate care score improvement
        fertilizer_quality_score = fertilizer_config["quality_score"] * effectiveness_multiplier
        new_care_score = (current_care_score * 0.7) + (fertilizer_quality_score * 0.3)
        
        # Determine rewards based on effectiveness
        base_xp = 12
        bonus_xp = 0
        
        if effectiveness_multiplier >= 1.3:
            bonus_xp = 8
            efficiency_rating = "Perfectly Timed!"
        elif effectiveness_multiplier >= 1.0:
            bonus_xp = 5
            efficiency_rating = "Good Application"
        elif effectiveness_multiplier >= 0.8:
            bonus_xp = 2
            efficiency_rating = "Adequate"
        else:
            bonus_xp = 0
            efficiency_rating = "Inefficient (over-fertilized?)"
        
        total_xp = base_xp + bonus_xp
        
        # Special growth bonus for premium fertilizers
        growth_acceleration = 0
        if fertilizer_type == "premium" and effectiveness_multiplier > 1.0:
            growth_acceleration = 0.1  # 10% faster growth
        
        # Update crop in database
        cursor.execute("""
            UPDATE crops SET 
                fertilizer_level = ?, health = ?, total_investment = ?,
                care_score = ?, last_fertilized = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_fertilizer_level, new_health, new_investment, new_care_score, crop_id))
        
        # Update user coins and XP
        new_coins = current_user["coins"] - fertilizer_config["cost"]
        new_xp = current_user.get("xp", 0) + total_xp
        cursor.execute("UPDATE users SET coins = ?, xp = ? WHERE id = ?", 
                      (new_coins, new_xp, current_user["id"]))
        
        # Log the fertilizer application
        cursor.execute("""
            INSERT OR REPLACE INTO crop_care_log 
            (crop_id, user_id, action_type, quality_level, cost_paid, efficiency_score, created_at)
            VALUES (?, ?, 'fertilize', ?, ?, ?, CURRENT_TIMESTAMP)
        """, (crop_id, current_user["id"], fertilizer_type, fertilizer_config["cost"], fertilizer_quality_score))
        
        conn.commit()
        
        # Log activity and check for challenge completions
        from .activity_tracker import log_activity
        log_activity(
            user_id=current_user["id"],
            action_type="fertilize", 
            xp_earned=total_xp,
            coins_earned=0,
            db_connection=conn
        )
        
        # Generate expert recommendations
        recommendations = []
        if over_fertilizer_penalty < 1.0:
            recommendations.append("⚠️ Over-fertilization detected! Wait before next application")
        if current_water < 50:
            recommendations.append("💧 Water your plant before fertilizing for better nutrient absorption")
        if fertilizer_type == "basic" and new_investment > 100:
            recommendations.append("🌿 Consider upgrading to organic fertilizer for better long-term results")
        if effectiveness_multiplier > 1.2:
            recommendations.append("🎯 Perfect timing! Your plant absorbed nutrients efficiently")
        
        # Calculate ROI projection
        expected_harvest_value = int(new_care_score * 2)  # Rough estimate
        roi_percentage = ((expected_harvest_value - new_investment) / max(new_investment, 1)) * 100
        
        return {
            "action": f"{fertilizer_config['name']} Applied",
            "fertilizer_type": fertilizer_type,
            "cost_paid": fertilizer_config["cost"],
            "fertilizer_level": new_fertilizer_level,
            "health": new_health,
            "care_score": round(new_care_score, 1),
            "effectiveness": round(effectiveness_multiplier, 2),
            "efficiency_rating": efficiency_rating,
            "total_investment": new_investment,
            "growth_acceleration": growth_acceleration,
            "expected_harvest_value": expected_harvest_value,
            "roi_projection": round(roi_percentage, 1),
            "rewards": {"xp": total_xp, "coins_spent": fertilizer_config["cost"]},
            "recommendations": recommendations,
            "duration_days": fertilizer_config["duration"],
            "status": "success"
        }

@app.get("/farm/care-shop")
async def get_plant_care_shop():
    """Get available plant care supplies with prices and quality options."""
    
    return {
        "water_supplies": [
            {
                "id": "basic_water",
                "name": "Tap Water",
                "cost_per_use": 5,
                "quality_bonus": 1.0,
                "description": "Basic watering with tap water",
                "icon": "🚰"
            },
            {
                "id": "premium_water", 
                "name": "Filtered Water",
                "cost_per_use": 12,
                "quality_bonus": 1.6,
                "description": "Purified water with optimal pH balance",
                "icon": "💧"
            },
            {
                "id": "expert_water",
                "name": "Nutrient-Enhanced Water",
                "cost_per_use": 20,
                "quality_bonus": 2.0,
                "description": "Premium water with trace minerals",
                "icon": "✨"
            }
        ],
        "fertilizers": [
            {
                "id": "basic_fertilizer",
                "name": "Basic NPK Fertilizer",
                "cost_per_use": 15,
                "nutrient_type": "balanced",
                "effectiveness": 1.0,
                "duration_days": 7,
                "description": "Standard 10-10-10 fertilizer blend",
                "icon": "🌱"
            },
            {
                "id": "organic_fertilizer",
                "name": "Organic Compost Blend", 
                "cost_per_use": 25,
                "nutrient_type": "organic",
                "effectiveness": 1.5,
                "duration_days": 12,
                "description": "Slow-release organic nutrients from compost",
                "icon": "🍃"
            },
            {
                "id": "premium_fertilizer",
                "name": "Expert Slow-Release Formula",
                "cost_per_use": 40,
                "nutrient_type": "premium",
                "effectiveness": 2.0,
                "duration_days": 18,
                "description": "Professional-grade controlled-release fertilizer",
                "icon": "🔬"
            }
        ],
        "premium_services": [
            {
                "id": "soil_test",
                "name": "Professional Soil Analysis",
                "cost": 50,
                "description": "Get detailed soil composition and pH analysis",
                "benefits": ["Optimized fertilizer recommendations", "+20% fertilizer effectiveness for 30 days"],
                "icon": "🧪"
            },
            {
                "id": "expert_consultation",
                "name": "Agricultural Expert Consultation", 
                "cost": 75,
                "description": "Personal consultation with farming expert",
                "benefits": ["Custom care plan", "+30% all care effectiveness for 14 days"],
                "icon": "👨‍🌾"
            }
        ]
    }

@app.get("/farm/plant-scorecard/{crop_id}")
async def get_plant_scorecard(
    crop_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get comprehensive plant performance scorecard."""
    from .database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get crop details
        cursor.execute("""
            SELECT id, name, water_level, health, fertilizer_level, growth_stage,
                   total_investment, care_score, planted_at, last_watered, last_fertilized
            FROM crops 
            WHERE id = ? AND user_id = ?
        """, (crop_id, current_user["id"]))
        
        crop = cursor.fetchone()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        # Get care history
        cursor.execute("""
            SELECT action_type, quality_level, cost_paid, efficiency_score, created_at
            FROM crop_care_log 
            WHERE crop_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        """, (crop_id, current_user["id"]))
        
        care_history = cursor.fetchall()
        
        # Calculate comprehensive scores
        water_level = crop[2] or 50
        health = crop[3] or 50
        fertilizer_level = crop[4] or 50
        growth_stage = crop[5] or 1
        total_investment = crop[6] or 0
        care_score = crop[7] or 60.0
        
        # Calculate category scores
        water_score = min(100, water_level + (20 if water_level > 70 else 0))
        nutrition_score = min(100, fertilizer_level + (15 if fertilizer_level > 60 else 0))
        health_score = health
        consistency_score = len(care_history) * 5  # 5 points per care action
        
        overall_score = (water_score + nutrition_score + health_score + consistency_score) / 4
        
        # Calculate ROI
        expected_harvest = int(overall_score * 2.5)  # Better scoring = better harvest
        roi_percentage = ((expected_harvest - total_investment) / max(total_investment, 1)) * 100
        
        # Determine efficiency rating
        if overall_score >= 90:
            efficiency_rating = "Master Farmer"
            bonus_multiplier = 2.5
        elif overall_score >= 80:
            efficiency_rating = "Expert Grower"
            bonus_multiplier = 2.0
        elif overall_score >= 70:
            efficiency_rating = "Good Farmer"
            bonus_multiplier = 1.5
        elif overall_score >= 60:
            efficiency_rating = "Learning Farmer"
            bonus_multiplier = 1.2
        else:
            efficiency_rating = "Needs Improvement"
            bonus_multiplier = 1.0
        
        # Generate achievements
        achievements = []
        if total_investment >= 100:
            achievements.append("💰 Serious Investor")
        if len(care_history) >= 10:
            achievements.append("🤲 Dedicated Caretaker")
        if overall_score >= 85:
            achievements.append("🏆 Plant Care Expert")
        if roi_percentage > 50:
            achievements.append("📈 Profit Maker")
        
        return {
            "plant_id": crop_id,
            "plant_name": crop[1],
            "overall_score": round(overall_score, 1),
            "care_categories": {
                "watering": round(water_score, 1),
                "nutrition": round(nutrition_score, 1),
                "health": round(health_score, 1),
                "consistency": min(100, consistency_score)
            },
            "investment_total": total_investment,
            "expected_harvest_value": expected_harvest,
            "roi_percentage": round(roi_percentage, 1),
            "efficiency_rating": efficiency_rating,
            "bonus_multiplier": bonus_multiplier,
            "achievements": achievements,
            "care_actions_count": len(care_history),
            "growth_stage": growth_stage,
            "days_since_planted": (datetime.now() - datetime.fromisoformat(crop[8].replace('Z', '+00:00'))).days if crop[8] else 0,
            "recommendations": [
                "🎯 Maintain consistent care for best results",
                "💡 Higher quality supplies improve efficiency",
                "📊 Track your ROI to optimize investments"
            ]
        }

@app.post("/farm/calculate-care-rewards/{crop_id}")
async def calculate_care_rewards(
    crop_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Calculate and award bonus rewards based on plant care performance."""
    from .database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get crop performance data
        cursor.execute("""
            SELECT care_score, total_investment, growth_stage, health, planted_at
            FROM crops 
            WHERE id = ? AND user_id = ?
        """, (crop_id, current_user["id"]))
        
        crop = cursor.fetchone()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        care_score = crop[0] or 60.0
        total_investment = crop[1] or 0
        growth_stage = crop[2] or 1
        health = crop[3] or 50
        
        # Calculate bonus rewards based on performance
        base_reward = 10
        
        # Performance bonuses
        if care_score >= 95:
            performance_bonus = 50
            performance_tier = "Legendary Farmer"
        elif care_score >= 85:
            performance_bonus = 30
            performance_tier = "Master Grower"
        elif care_score >= 75:
            performance_bonus = 20
            performance_tier = "Expert Caretaker"
        elif care_score >= 65:
            performance_bonus = 10
            performance_tier = "Good Farmer"
        else:
            performance_bonus = 5
            performance_tier = "Learning Farmer"
        
        # Investment efficiency bonus (good ROI)
        investment_efficiency = care_score / max(total_investment, 1)
        if investment_efficiency > 2.0:
            efficiency_bonus = 25
        elif investment_efficiency > 1.5:
            efficiency_bonus = 15
        elif investment_efficiency > 1.0:
            efficiency_bonus = 10
        else:
            efficiency_bonus = 5
        
        # Health maintenance bonus
        health_bonus = int(health / 10)  # 1 point per 10% health
        
        # Growth stage bonus
        growth_bonus = growth_stage * 5
        
        total_xp_reward = base_reward + performance_bonus + efficiency_bonus + health_bonus + growth_bonus
        
        # Coins bonus for exceptional care (85+ score)
        coins_bonus = 0
        if care_score >= 85:
            coins_bonus = int(care_score - 70)  # Escalating coin rewards
        
        # Update user rewards
        new_xp = current_user.get("xp", 0) + total_xp_reward
        new_coins = current_user.get("coins", 0) + coins_bonus
        
        cursor.execute("UPDATE users SET xp = ?, coins = ? WHERE id = ?", 
                      (new_xp, new_coins, current_user["id"]))
        
        # Mark this reward as claimed (add timestamp)
        cursor.execute("""
            UPDATE crops SET last_reward_calculated = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (crop_id,))
        
        conn.commit()
        
        return {
            "performance_tier": performance_tier,
            "care_score": round(care_score, 1),
            "rewards_breakdown": {
                "base_reward": base_reward,
                "performance_bonus": performance_bonus,
                "efficiency_bonus": efficiency_bonus,
                "health_bonus": health_bonus,
                "growth_bonus": growth_bonus
            },
            "total_rewards": {
                "xp": total_xp_reward,
                "coins": coins_bonus
            },
            "investment_efficiency": round(investment_efficiency, 2),
            "message": f"Congratulations! Your {performance_tier} skills earned exceptional rewards!",
            "achievements_unlocked": [
                f"🎯 {performance_tier}",
                f"💰 Total Investment: {total_investment} coins",
                f"📊 Care Score: {care_score:.1f}/100"
            ]
        }

@app.get("/leaderboard/care-masters")
async def get_care_leaderboard():
    """Get leaderboard of best plant care farmers."""
    from .database import get_db_connection
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get top farmers by care score
        cursor.execute("""
            SELECT u.username, u.id, 
                   AVG(c.care_score) as avg_care_score,
                   COUNT(c.id) as total_crops,
                   SUM(c.total_investment) as total_invested,
                   MAX(c.care_score) as best_score
            FROM users u
            JOIN crops c ON u.id = c.user_id
            GROUP BY u.id
            HAVING total_crops >= 1
            ORDER BY avg_care_score DESC, best_score DESC
            LIMIT 20
        """)
        
        leaderboard = []
        for i, row in enumerate(cursor.fetchall()):
            leaderboard.append({
                "rank": i + 1,
                "username": row[0],
                "avg_care_score": round(row[2], 1),
                "total_crops": row[3],
                "total_investment": row[4],
                "best_score": round(row[5], 1),
                "tier": get_farmer_tier(row[2])
            })
        
        return {
            "leaderboard": leaderboard,
            "total_farmers": len(leaderboard),
            "criteria": "Average Plant Care Score"
        }

def get_farmer_tier(care_score):
    """Determine farmer tier based on care score."""
    if care_score >= 95:
        return "🏆 Legendary Farmer"
    elif care_score >= 85:
        return "🌟 Master Grower" 
    elif care_score >= 75:
        return "🎯 Expert Caretaker"
    elif care_score >= 65:
        return "🌱 Good Farmer"
    else:
        return "📚 Learning Farmer"

@app.get("/nasa/facts")
async def get_nasa_facts():
    """Get educational NASA facts for the learning section."""
    facts = [
        {
            "id": 1,
            "title": "🛰️ NASA POWER Data",
            "content": "NASA's POWER project provides solar and meteorological data from satellites and models, helping farmers optimize crop yields with real-time weather insights.",
            "category": "Satellites"
        },
        {
            "id": 2,
            "title": "🌧️ Precipitation Patterns", 
            "content": "NASA satellites track global rainfall patterns, helping farmers plan irrigation schedules and predict drought conditions up to 7 days in advance.",
            "category": "Weather"
        },
        {
            "id": 3,
            "title": "🌡️ Temperature Monitoring",
            "content": "Surface temperature data from NASA helps determine optimal planting times and predict crop stress conditions before they become visible.",
            "category": "Climate"
        },
        {
            "id": 4,
            "title": "💧 Soil Moisture Insights",
            "content": "NASA's SMAP mission measures soil moisture globally, helping farmers optimize irrigation and prevent water waste.",
            "category": "Soil"
        }
    ]
    return facts


# =====================
# SCENARIO & PROGRESSION ENDPOINTS
# =====================

@app.post("/scenarios/generate/{crop_id}")
async def generate_scenarios_for_crop(
    crop_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Generate AI-powered scenarios for a specific crop using NASA data."""
    user_id = current_user["id"]
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get crop details
        cursor.execute("""
            SELECT * FROM crops WHERE id = ? AND user_id = ?
        """, (crop_id, user_id))
        crop_row = cursor.fetchone()
        
        if not crop_row:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        crop = dict(crop_row)
        
        # Get NASA data for crop location if available
        nasa_data = None
        if crop['latitude'] and crop['longitude']:
            try:
                nasa_client = NASAClient()
                # Get recent NASA data
                end_date = datetime.now()
                start_date = end_date.replace(day=max(1, end_date.day - 7))
                
                query = FarmDataQuery(
                    lat=crop['latitude'],
                    lon=crop['longitude'], 
                    start=start_date.strftime('%Y%m%d'),
                    end=end_date.strftime('%Y%m%d'),
                    crop_type=crop['name']
                )
                
                nasa_data = await nasa_client.get_farm_data(query)
            except Exception as e:
                print(f"Failed to get NASA data: {e}")
        
        # Generate scenarios using AI with location info
        location_info = {
            "latitude": crop.get('latitude', 0),
            "longitude": crop.get('longitude', 0)
        }
        scenarios = await ScenarioGenerator.analyze_nasa_data_for_scenarios(nasa_data, crop, location_info)
        
        # Save scenarios to database
        saved_scenarios = []
        for scenario_data in scenarios:
            scenario_id = ScenarioGenerator.save_scenario_to_db(user_id, crop_id, scenario_data)
            saved_scenarios.append({
                "id": scenario_id,
                **scenario_data
            })
        
        conn.close()
        
        return {
            "success": True,
            "scenarios_generated": len(saved_scenarios),
            "scenarios": saved_scenarios
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scenarios/active")
async def get_active_scenarios(
    crop_id: int = Query(None, description="Filter by crop ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get all active scenarios for the user."""
    user_id = current_user["id"]
    
    try:
        scenarios = ScenarioGenerator.get_active_scenarios(user_id, crop_id)
        
        # Add crop name to each scenario
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for scenario in scenarios:
            cursor.execute("SELECT name FROM crops WHERE id = ?", (scenario['crop_id'],))
            crop_row = cursor.fetchone()
            scenario['crop_name'] = crop_row['name'] if crop_row else 'Unknown'
        
        conn.close()
        
        return {
            "scenarios": scenarios,
            "total": len(scenarios)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scenarios/{scenario_id}/complete")
async def complete_scenario(
    scenario_id: str,
    request: CompleteScenarioRequest,
    current_user: dict = Depends(get_current_user)
):
    """Complete a scenario with chosen action."""
    user_id = current_user["id"]
    
    try:
        result = ScenarioGenerator.complete_scenario(scenario_id, request.action_id, user_id)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/progress", response_model=PlayerProgress)
async def get_player_progress(current_user: dict = Depends(get_current_user)):
    """Get player's current progress and stats."""
    user_id = current_user["id"]
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get coins and XP from users table (primary source)
        cursor.execute("SELECT coins, xp FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get or create progress record for game statistics only
        cursor.execute("SELECT * FROM user_progress WHERE user_id = ?", (user_id,))
        progress_row = cursor.fetchone()
        
        if not progress_row:
            # Initialize progress for new user (game stats only)
            cursor.execute("""
                INSERT INTO user_progress (user_id, level, total_scenarios_completed, successful_harvests)
                VALUES (?, 1, 0, 0)
            """, (user_id,))
            conn.commit()
            progress = {"level": 1, "total_scenarios_completed": 0, "successful_harvests": 0}
        else:
            progress = dict(progress_row)
        
        # Use coins and XP from users table
        user_coins = user_row['coins']
        user_xp = user_row['xp'] if user_row['xp'] is not None else 0
        
        # Calculate XP needed for next level
        current_level = progress['level']
        xp_for_next_level = current_level * 100  # 100 XP per level
        xp_to_next_level = max(0, xp_for_next_level - user_xp)
        
        conn.close()
        
        return PlayerProgress(
            level=progress['level'],
            xp=user_xp,
            coins=user_coins,
            xp_to_next_level=xp_to_next_level,
            total_scenarios_completed=progress['total_scenarios_completed'],
            successful_harvests=progress['successful_harvests']
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/shop/items")
async def get_shop_items(
    category: str = Query(None, description="Filter by category")
):
    """Get available shop items."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if category:
            cursor.execute("SELECT * FROM shop_items WHERE available = 1 AND category = ? ORDER BY cost_coins", (category,))
        else:
            cursor.execute("SELECT * FROM shop_items WHERE available = 1 ORDER BY category, cost_coins")
        
        items = []
        for row in cursor.fetchall():
            item = dict(row)
            item['effects'] = json.loads(item['effects'] or '{}')
            items.append(item)
        
        conn.close()
        
        return {"items": items}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/shop/purchase")
async def purchase_item(
    request: PurchaseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Purchase an item from the shop."""
    user_id = current_user["id"]
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get item details
        cursor.execute("SELECT * FROM shop_items WHERE id = ? AND available = 1", (request.item_id,))
        item_row = cursor.fetchone()
        
        if not item_row:
            raise HTTPException(status_code=404, detail="Item not found")
        
        item = dict(item_row)
        total_cost = item['cost_coins'] * request.quantity
        
        # Check user's coins from users table
        cursor.execute("SELECT coins FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_coins = user_row['coins']
        
        if current_coins < total_cost:
            raise HTTPException(status_code=400, detail="Insufficient coins")
        
        # Deduct coins from users table
        cursor.execute("""
            UPDATE users SET coins = coins - ?
            WHERE id = ?
        """, (total_cost, user_id))
        
        cursor.execute("""
            INSERT INTO user_purchases (user_id, item_id, quantity)
            VALUES (?, ?, ?)
        """, (user_id, request.item_id, request.quantity))
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": f"Successfully purchased {request.quantity}x {item['name']}",
            "coins_spent": total_cost,
            "remaining_coins": current_coins - total_cost
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/leaderboard")
async def get_leaderboard(limit: int = Query(10, le=50)):
    """Get top players by level and XP."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT u.username, up.level, up.xp, up.total_scenarios_completed, up.successful_harvests
            FROM user_progress up
            JOIN users u ON up.user_id = u.id
            ORDER BY up.level DESC, up.xp DESC
            LIMIT ?
        """, (limit,))
        
        leaderboard = []
        for i, row in enumerate(cursor.fetchall(), 1):
            entry = dict(row)
            entry['rank'] = i
            leaderboard.append(entry)
        
        conn.close()
        
        return {"leaderboard": leaderboard}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/farm/simulate-time/{crop_id}")
async def simulate_time_passage(
    crop_id: int,
    hours: int = 6,  # Default 6 hours
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Simulate time passage for testing plant degradation (hours forward)."""
    from .database import get_db_connection
    
    if hours > 48:  # Limit to 48 hours max
        raise HTTPException(status_code=400, detail="Maximum 48 hours simulation allowed")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get current crop
        cursor.execute("""
            SELECT id, water_level, fertilizer_level, health, planted_at
            FROM crops WHERE id = ? AND user_id = ?
        """, (crop_id, current_user["id"]))
        
        crop = cursor.fetchone()
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        
        current_water, current_fertilizer, current_health = crop[1], crop[2], crop[3]
        
        # Apply degradation for specified hours
        water_loss = hours * 1.0  # 1% per hour
        fertilizer_loss = hours * 0.8  # 0.8% per hour
        health_loss = hours * 0.3  # 0.3% per hour, double if neglected
        
        # Double health loss if water or fertilizer is low
        if current_water < 30 or current_fertilizer < 30:
            health_loss *= 2.0
            
        new_water = max(0, current_water - water_loss)
        new_fertilizer = max(0, current_fertilizer - fertilizer_loss)
        new_health = max(10, current_health - health_loss)
        
        # Update crop
        cursor.execute("""
            UPDATE crops 
            SET water_level = ?, fertilizer_level = ?, health = ?
            WHERE id = ?
        """, (new_water, new_fertilizer, new_health, crop_id))
        
        return {
            "message": f"Simulated {hours} hours of time passage",
            "changes": {
                "water": f"{current_water:.1f}% → {new_water:.1f}% (-{water_loss:.1f}%)",
                "fertilizer": f"{current_fertilizer:.1f}% → {new_fertilizer:.1f}% (-{fertilizer_loss:.1f}%)", 
                "health": f"{current_health:.1f}% → {new_health:.1f}% (-{health_loss:.1f}%)"
            },
            "status": {
                "water_level": new_water,
                "fertilizer_level": new_fertilizer,
                "health": new_health
            }
        }


@app.post("/educational/generate")
async def generate_educational_content(
    force_regenerate: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Generate personalized educational content with smart caching and auto-updates."""
    from .database import get_db_connection
    from .educational_manager import educational_manager
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user's location from farm
        cursor.execute("""
            SELECT latitude, longitude FROM user_farms 
            WHERE user_id = ? 
            ORDER BY created_at DESC LIMIT 1
        """, (current_user["id"],))
        
        farm = cursor.fetchone()
        if not farm:
            conn.close()
            raise HTTPException(status_code=404, detail="No farm found for user")
        
        latitude, longitude = farm
        
        # Get user's current plants with status
        cursor.execute("""
            SELECT 
                id, 
                name, 
                water_level, 
                fertilizer_level, 
                health, 
                planted_at 
            FROM crops 
            WHERE user_id = ?
        """, (current_user["id"],))
        
        plants = cursor.fetchall()
        conn.close()
        
        # Get NASA data for this location (simplified mock data for now)
        nasa_data = {
            "temperature": 25.0 + (latitude - 20) * 0.5,  # Simple temperature model
            "precipitation": max(0.5, 3.0 - abs(latitude - 10) * 0.1),  # Simple rain model  
            "humidity": min(90, 60 + abs(longitude - 77) * 0.2),  # Simple humidity model
            "solar_radiation": max(3.0, 6.0 - abs(latitude - 23) * 0.1)  # Simple solar model
        }
        
        # Convert plants to the format expected by AI advisor
        plant_data = [{
            "crop_id": plant[0],  # id from database
            "crop_type": plant[1],  # name from database
            "water_level": plant[2], 
            "fertilizer_level": plant[3],
            "health": plant[4],
            "planted_at": plant[5]
        } for plant in plants]
        
        # Use smart educational manager for caching and auto-updates
        educational_content = await educational_manager.get_educational_content(
            user_id=current_user["id"],
            user_plants=plant_data,
            location={"lat": latitude, "lon": longitude},
            nasa_data=nasa_data,
            force_regenerate=force_regenerate
        )
        
        # Get completed content for UI state
        completed_content = educational_manager.get_completed_content(current_user["id"])
        
        return {
            "success": True,
            "content": educational_content,
            "location": {"latitude": latitude, "longitude": longitude},
            "plant_count": len(plants),
            "is_cached": educational_content.get("is_cached", False),
            "content_hash": educational_content.get("content_hash", ""),
            "completed_content": completed_content,
            "last_updated": educational_content.get("generated_at", "")
        }
        
    except Exception as e:
        logger.error(f"Educational content generation failed: {e}")
        # Fallback to basic content
        return {
            "success": False,
            "content": {
                "facts": [
                    {
                        "id": "basic_1",
                        "title": "Plant Care Basics",
                        "content": "Your plants need regular water and fertilizer to stay healthy.",
                        "category": "plant_care",
                        "xp": 10,
                        "is_personalized": False
                    }
                ],
                "interactive_missions": [],
                "climate_insights": {"summary": "Keep monitoring your plant health levels."},
                "sustainability_tips": ["Water plants regularly", "Use fertilizer wisely"]
            },
            "location": {"latitude": latitude, "longitude": longitude},
            "plant_count": len(plants),
            "is_cached": False,
            "completed_content": [],
            "error": str(e)
        }


@app.post("/educational/complete")
async def mark_educational_content_completed(
    content_type: str,
    content_id: str, 
    xp_earned: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Mark educational content as completed by user."""
    from .educational_manager import educational_manager
    
    try:
        success = educational_manager.mark_content_completed(
            user_id=current_user["id"],
            content_type=content_type,
            content_id=content_id,
            xp_earned=xp_earned
        )
        
        if success:
            # Also update user's XP in the main table
            from .database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users SET coins = coins + ? WHERE id = ?
            """, (xp_earned, current_user["id"]))
            
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "message": f"Completed {content_type}: {content_id}",
                "xp_earned": xp_earned
            }
        else:
            return {
                "success": False,
                "message": "Content already completed or error occurred"
            }
            
    except Exception as e:
        logger.error(f"Error marking content completed: {e}")
        return {
            "success": False,
            "message": f"Error: {e}"
        }


@app.post("/educational/check-updates")
async def check_educational_content_updates(current_user: dict = Depends(get_current_user)):
    """Check if educational content needs updating due to farm changes."""
    from .educational_manager import educational_manager
    
    try:
        update_status = await educational_manager.check_and_update_content_on_plant_change(
            user_id=current_user["id"]
        )
        
        return {
            "success": True,
            "update_status": update_status,
            "user_id": current_user["id"]
        }
        
    except Exception as e:
        logger.error(f"Error checking content updates: {e}")
        return {
            "success": False,
            "message": f"Error: {e}"
        }


@app.get("/analytics/farm")
async def get_farm_analytics(current_user: dict = Depends(get_current_user)):
    """Get comprehensive farm analytics for the current user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user stats - calculate from actual activity data
        # First try user_stats table (if it exists and has data)
        cursor.execute("""
            SELECT total_plants, total_waters, total_fertilizes, total_harvests
            FROM user_stats 
            WHERE user_id = ?
        """, (current_user["id"],))
        stats_row = cursor.fetchone()
        
        if stats_row and any(stats_row):
            # Use user_stats if available and has data
            stats = {
                "total_plants": stats_row[0] or 0,
                "total_waters": stats_row[1] or 0,
                "total_fertilizes": stats_row[2] or 0,
                "total_harvests": stats_row[3] or 0,
            }
        else:
            # Calculate from activity logs
            # Count total crops planted
            cursor.execute("""
                SELECT COUNT(*) FROM crops WHERE user_id = ?
            """, (current_user["id"],))
            total_plants = cursor.fetchone()[0] or 0
            
            # Count activities from crop_care_log
            cursor.execute("""
                SELECT action_type, COUNT(*) 
                FROM crop_care_log 
                WHERE user_id = ? 
                GROUP BY action_type
            """, (current_user["id"],))
            activities = cursor.fetchall()
            
            # Count harvested crops (growth_stage = 100 means harvested)
            cursor.execute("""
                SELECT COUNT(*) FROM crops 
                WHERE user_id = ? AND growth_stage >= 100
            """, (current_user["id"],))
            total_harvests = cursor.fetchone()[0] or 0
            
            # Parse activity counts
            activity_counts = dict(activities) if activities else {}
            
            stats = {
                "total_plants": total_plants,
                "total_waters": activity_counts.get('water', 0),
                "total_fertilizes": activity_counts.get('fertilize', 0),
                "total_harvests": total_harvests,
            }
        
        # Get user progress - use main user XP and progress table
        cursor.execute("""
            SELECT COALESCE(up.level, 1) as level, 
                   COALESCE(u.xp, 0) as xp,
                   COALESCE(up.total_scenarios_completed, 0) as total_scenarios,
                   COALESCE(up.successful_harvests, 0) as successful_harvests
            FROM users u
            LEFT JOIN user_progress up ON u.id = up.user_id
            WHERE u.id = ?
        """, (current_user["id"],))
        progress_row = cursor.fetchone()
        user_progress = {
            "level": progress_row[0] if progress_row else 1,
            "xp": progress_row[1] if progress_row else 0,
            "total_scenarios": progress_row[2] if progress_row else 0,
            "successful_harvests": progress_row[3] if progress_row else 0,
        }
        
        # Get current crops with detailed info
        cursor.execute("""
            SELECT name, growth_stage, health, water_level, fertilizer_level, 
                   position_row, position_col, planted_at, climate_bonus
            FROM crops 
            WHERE user_id = ?
            ORDER BY planted_at DESC
        """, (current_user["id"],))
        crops_data = cursor.fetchall()
        
        # Process crop types and distribution
        crop_types = {}
        total_health = 0
        total_water = 0
        total_fertilizer = 0
        active_crops = len(crops_data)
        
        for crop in crops_data:
            name = crop[0]
            if name not in crop_types:
                crop_types[name] = {"count": 0, "avg_health": 0, "avg_growth": 0}
            crop_types[name]["count"] += 1
            crop_types[name]["avg_health"] = (crop_types[name]["avg_health"] + crop[2]) / 2
            crop_types[name]["avg_growth"] = (crop_types[name]["avg_growth"] + crop[1]) / 2
            
            total_health += crop[2]
            total_water += crop[3]
            total_fertilizer += crop[4]
        
        # Calculate averages
        avg_health = total_health / active_crops if active_crops > 0 else 100
        avg_water = total_water / active_crops if active_crops > 0 else 100
        avg_fertilizer = total_fertilizer / active_crops if active_crops > 0 else 100
        
        # Get weekly activity (simulate for now - in real app you'd track daily actions)
        import datetime
        today = datetime.date.today()
        weekly_data = []
        for i in range(7):
            date = today - datetime.timedelta(days=6-i)
            # Simulate activity based on total stats (in real app, track daily)
            activity = max(0, (stats["total_waters"] + stats["total_fertilizes"]) // 7 + random.randint(-5, 5))
            weekly_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "day": date.strftime("%a"),
                "activity": activity
            })
        
        # Get recent scenarios
        cursor.execute("""
            SELECT scenario_type, severity, created_at, active
            FROM plant_scenarios 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        """, (current_user["id"],))
        scenarios = cursor.fetchall()
        
        # Calculate efficiency score
        efficiency_score = min(100, max(0, 
            (avg_health * 0.4) + 
            (avg_water * 0.2) + 
            (avg_fertilizer * 0.2) + 
            ((stats["total_harvests"] / max(1, stats["total_plants"])) * 100 * 0.2)
        ))
        
        # NASA integration - get recent farm data if available
        nasa_insights = None
        cursor.execute("""
            SELECT latitude, longitude FROM user_farms 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        """, (current_user["id"],))
        farm_location = cursor.fetchone()
        
        if farm_location:
            try:
                from .nasa_client import NASAClient
                from datetime import datetime, timedelta
                
                nasa_client = NASAClient()
                end_date = datetime.now()
                start_date = end_date - timedelta(days=7)
                
                query = FarmDataQuery(
                    lat=farm_location[0],
                    lon=farm_location[1],
                    start=start_date.strftime("%Y%m%d"),
                    end=end_date.strftime("%Y%m%d"),
                    crop_type=list(crop_types.keys())[0] if crop_types else None
                )
                
                nasa_data = nasa_client.get_farm_data(
                    latitude=query.lat,
                    longitude=query.lon
                )
                
                # Extract key insights
                if nasa_data.daily:
                    recent_day = nasa_data.daily[-1]
                    nasa_insights = {
                        "temperature": recent_day.t2m,
                        "humidity": recent_day.rh2m,
                        "precipitation": recent_day.prectot,
                        "solar_radiation": recent_day.allsky_sfc_sw_dwn,
                        "recommendation": nasa_data.recommendation.summary if nasa_data.recommendation else None
                    }
            except Exception as e:
                logger.warning(f"Could not fetch NASA data: {e}")
                nasa_insights = None
        
        return {
            "user_stats": stats,
            "user_progress": user_progress,
            "crops": {
                "active_count": active_crops,
                "types": [
                    {
                        "name": name,
                        "count": data["count"],
                        "avg_health": round(data["avg_health"], 1),
                        "avg_growth": round(data["avg_growth"], 1),
                        "color": f"hsl({hash(name) % 360}, 70%, 60%)"
                    }
                    for name, data in crop_types.items()
                ],
                "health_metrics": {
                    "avg_health": round(avg_health, 1),
                    "avg_water": round(avg_water, 1),
                    "avg_fertilizer": round(avg_fertilizer, 1)
                }
            },
            "weekly_activity": weekly_data,
            "scenarios": [
                {
                    "type": s[0],
                    "severity": s[1],
                    "date": s[2],
                    "active": bool(s[3])
                }
                for s in scenarios
            ],
            "efficiency": {
                "overall_score": round(efficiency_score, 1),
                "health_score": round(avg_health, 1),
                "water_efficiency": round(avg_water, 1),
                "fertilizer_efficiency": round(avg_fertilizer, 1),
                "harvest_rate": round((stats["total_harvests"] / max(1, stats["total_plants"])) * 100, 1)
            },
            "nasa_insights": nasa_insights,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting farm analytics: {e}")
        raise HTTPException(status_code=500, detail="Error fetching analytics data")
    finally:
        conn.close()
