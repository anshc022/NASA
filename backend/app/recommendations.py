from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional


@dataclass
class Recommendation:
    summary: str
    detail: str
    confidence: float = 0.6


class HeuristicAdvisor:
    """Fallback advisor when AI is not available."""

    def generate(
        self,
        *,
        average_rainfall: float | None,
        average_temp: float | None,
        crop_type: Optional[str] = None,
    ) -> Recommendation:
        suffix = (
            f" Focus on resilient {crop_type.lower()} varieties and staggered sowing."  # type: ignore[union-attr]
            if crop_type
            else ""
        )
        if average_rainfall is None and average_temp is None:
            return Recommendation(
                summary="Data insufficient",
                detail=(
                    "NASA data is missing rainfall and temperature values. "
                    "Gather more readings to receive guidance." + suffix
                ).strip(),
                confidence=0.2,
            )

        if (average_rainfall or 0.0) < 3.0:
            return Recommendation(
                summary="Irrigation needed",
                detail=(
                    "Rainfall totals are low for the selected period. "
                    "Prioritize irrigation scheduling to maintain soil moisture." + suffix
                ).strip(),
                confidence=0.8,
            )

        if (average_temp or 0.0) > 32.0:
            return Recommendation(
                summary="Avoid sensitive crops",
                detail=(
                    "Temperatures exceed 32°C on average. Choose heat tolerant varieties "
                    "and plan shading or mulching strategies." + suffix
                ).strip(),
                confidence=0.75,
            )

        return Recommendation(
            summary="Good for sowing",
            detail=(
                "Rainfall and temperature trends look favourable. Proceed with sowing "
                "and continue monitoring NASA updates for adjustments." + suffix
            ).strip(),
            confidence=0.7,
        )


def summarize(values: Iterable[float]) -> Optional[float]:
    values = list(values)
    return sum(values) / len(values) if values else None
