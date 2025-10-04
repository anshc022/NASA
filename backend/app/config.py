from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    nasa_base_url: str = Field(
        "https://power.larc.nasa.gov/api/temporal/daily/point",
        description="Base URL for the NASA POWER API",
    )
    nasa_parameters: str = Field(
        "T2M,T2M_MAX,T2M_MIN,T2MDEW,RH2M,PRECTOT,ALLSKY_SFC_SW_DWN,WS2M",
        description="Comma separated list of NASA POWER parameters to request",
    )
    nasa_community: str = Field(
        "AG",
        description="NASA POWER community identifier",
    )
    ai_provider: Optional[str] = Field(
        default="ollama",
        description="Set to 'ollama' to enable the local LLM advisor. Leave empty to disable.",
    )
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        description="Base URL for local Ollama instance",
    )
    ollama_model: str = Field(
        default="gemma:3.1b",
        description="Ollama model tag to use (e.g. gemma:3.1b)",
    )

    class Config:
        env_prefix = "FASALSEVA_"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
