from __future__ import annotations

import datetime as dt
from typing import Dict, List

import httpx

from .config import get_settings


class NASAClientError(RuntimeError):
    """Raised when the NASA POWER API returns an unexpected response."""


class NASAClient:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._settings = get_settings()
        self._client = client or httpx.AsyncClient(timeout=httpx.Timeout(30.0), trust_env=False)

    async def fetch_daily_power_data(
        self, *, lat: float, lon: float, start: str, end: str
    ) -> Dict[str, Dict[str, float]]:
        """Fetch daily POWER data for a given location and date range.

        Returns a mapping from parameter name to {date: value}.
        """

        params = {
            "latitude": lat,
            "longitude": lon,
            "start": start,
            "end": end,
            "community": self._settings.nasa_community,
            "parameters": self._settings.nasa_parameters,
            "format": "JSON",
        }
        response = await self._client.get(self._settings.nasa_base_url, params=params)
        response.raise_for_status()
        data = response.json()

        try:
            parameter_data: Dict[str, Dict[str, float]] = data["properties"]["parameter"]
        except (KeyError, TypeError) as exc:  # pragma: no cover - defensive
            # Log the actual response structure for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"NASA API response structure: {data}")
            raise NASAClientError("Unexpected response from NASA POWER API") from exc
        return parameter_data

    async def close(self) -> None:
        await self._client.aclose()


def to_daily_series(parameter_data: Dict[str, Dict[str, float]]) -> List[Dict[str, float]]:
    """Transforms parameter keyed dict into list of daily readings."""

    # gather all unique dates from available parameters
    unique_dates: set[dt.date] = set()
    for series in parameter_data.values():
        for date_str in series.keys():
            unique_dates.add(_parse_date(date_str))

    sorted_dates = sorted(unique_dates)
    daily_records: List[Dict[str, float]] = []
    for date in sorted_dates:
        entry: Dict[str, float] = {"date": date.isoformat()}
        for parameter, readings in parameter_data.items():
            value = readings.get(date.strftime("%Y%m%d"))
            if value is not None:
                entry[parameter.lower()] = float(value)
        daily_records.append(entry)

    return daily_records


def _parse_date(date_str: str) -> dt.date:
    return dt.datetime.strptime(date_str, "%Y%m%d").date()
