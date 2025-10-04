from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from .ai import AIAdvisor
from .auth import authenticate_user, create_access_token, get_current_user, get_password_hash
from .auth_schemas import LanguageUpdate, TokenResponse, UserLogin, UserResponse, UserSignup
from .config import get_settings
from .database import UserDB
from .nasa_client import NASAClient, NASAClientError, to_daily_series
from .recommendations import Recommendation
from .schemas import FarmDataQuery, FarmDataResponse, RecommendationPayload, FarmCreate, FarmResponse

app = FastAPI(
    title="Fasal Seva – NASA Farm Navigator Backend",
    version="0.1.0",
    description="Backend service providing NASA POWER data and AI-guided farming insights.",
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
    user = UserDB.get_user_by_id(user_id)
    user.pop("password_hash", None)
    
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
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user["id"])})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user)
    )


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information."""
    return UserResponse(**current_user)


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
