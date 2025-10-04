"""Pydantic schemas for authentication."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserSignup(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    language: str = Field(default="en", pattern="^(en|hi|es|pt)$")


class UserLogin(BaseModel):
    """Schema for user login."""
    username_or_email: str
    password: str


class UserResponse(BaseModel):
    """Schema for user response (without password)."""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    language: str
    created_at: str
    last_login: Optional[str]


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LanguageUpdate(BaseModel):
    """Schema for updating user language."""
    language: str = Field(..., pattern="^(en|hi|es|pt)$")
