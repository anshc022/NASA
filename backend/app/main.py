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
from .schemas import FarmDataQuery, FarmDataResponse, RecommendationPayload

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

@app.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """Register a new user."""
    # Check if user already exists
    existing_user = UserDB.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    existing_user = UserDB.get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Hash password and create user
    password_hash = get_password_hash(user_data.password)
    user_id = UserDB.create_user(
        email=user_data.email,
        username=user_data.username,
        password_hash=password_hash,
        full_name=user_data.full_name,
        language=user_data.language
    )
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
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
    return normalised
