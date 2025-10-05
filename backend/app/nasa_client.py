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
        
        # Better error handling for common NASA API issues
        if not response.is_success:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"NASA API error {response.status_code}: {response.text}")
            if response.status_code == 422:
                raise NASAClientError(f"Invalid request parameters. NASA API returned 422. Check date range and coordinates.")
            else:
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

    def get_farm_data(self, latitude: float, longitude: float) -> Dict | None:
        """Get farm data for a location (synchronous wrapper for compatibility)."""
        import asyncio
        from datetime import datetime, timedelta
        
        try:
            # Get recent data with proper lag (NASA has 2-3 day delay)
            end_date = (datetime.now() - timedelta(days=3)).strftime("%Y%m%d")
            start_date = (datetime.now() - timedelta(days=10)).strftime("%Y%m%d")
            
            # Run the async method
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                parameter_data = loop.run_until_complete(
                    self.fetch_daily_power_data(
                        lat=latitude, 
                        lon=longitude, 
                        start=start_date, 
                        end=end_date
                    )
                )
                
                # Convert to expected format
                return {
                    "properties": {
                        "parameter": parameter_data
                    }
                }
            finally:
                loop.close()
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching farm data: {e}")
            return None

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
