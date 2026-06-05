"""
Pydantic veri modelleri — kritik5.py spesifikasyonu ile uyumlu.
"""

from __future__ import annotations
from typing import List, Optional, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class MissingPlayer(BaseModel):
    name: str
    reason: str
    missed_matches_count: int = Field(ge=0)
    position: str = "M"   # G / D / M / F


class MatchRecord(BaseModel):
    id: str                          # deterministic UUID — fixture_uuid()
    home_team: str
    away_team: str
    match_time: datetime             # kritik5.py: datetime (str değil)
    home_xg: float
    away_xg: float
    home_form_score: float
    away_form_score: float
    critical_missing_effect: float
    confidence_score: float
    prediction: str                  # Ana tahmin: MS1, MS2, X, 2.5 Üst, 2.5 Alt
    prediction_confidence: int = 0   # Ana tahminin güven yüzdesi (0-100)
    analysis: Optional[str] = None   # Claude AI Türkçe analiz metni
    alternatives: List[dict] = []    # [{"prediction":"X","confidence":25}, ...]
    missing_players: List[MissingPlayer] = []
    home_last5_data: Optional[dict] = None  # Son 5 maç özeti — ev sahibi
    away_last5_data: Optional[dict] = None  # Son 5 maç özeti — deplasman
    league_name: str = "Genel"              # Turnuva / Lig adı
    is_free_preview: bool = False           # Ücretsiz vitrin maçı mı?

    @field_validator("home_xg", "away_xg", mode="before")
    @classmethod
    def round_xg(cls, v: float) -> float:
        return round(float(v), 2)

    @field_validator(
        "home_form_score", "away_form_score",
        "critical_missing_effect", "confidence_score",
        mode="before",
    )
    @classmethod
    def clamp_and_round(cls, v: float) -> float:
        return round(max(0.0, min(1.0, float(v))), 3)

    @field_validator("match_time", mode="before")
    @classmethod
    def parse_match_time(cls, v) -> datetime:
        """ISO string veya datetime kabul eder."""
        if isinstance(v, datetime):
            return v
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    def to_db_dict(self) -> dict:
        """Supabase upsert için sözlük. match_time ISO string'e çevrilir."""
        return {
            "id":                      self.id,
            "home_team":               self.home_team,
            "away_team":               self.away_team,
            "match_time":              self.match_time.isoformat(),
            "home_xg":                 self.home_xg,
            "away_xg":                 self.away_xg,
            "home_form_score":         self.home_form_score,
            "away_form_score":         self.away_form_score,
            "critical_missing_effect": self.critical_missing_effect,
            "confidence_score":        self.confidence_score,
            "prediction":              self.prediction,
            "prediction_confidence":   self.prediction_confidence,
            "analysis":                self.analysis,
            "alternatives":            self.alternatives,
            "missing_players":  [p.model_dump(exclude={"position"}) for p in self.missing_players],
            "home_last5_data":  self.home_last5_data,
            "away_last5_data":  self.away_last5_data,
            "league_name":      self.league_name,
            "is_free_preview":  self.is_free_preview,
        }


CouponType = Literal["Banko", "xG Canavarı", "Premium Sürpriz"]


class CouponRecord(BaseModel):
    coupon_type: CouponType
    matches: List[str] = Field(min_length=1)
    total_rate: float = Field(ge=1.0)
    is_premium: bool = False

    @field_validator("total_rate", mode="before")
    @classmethod
    def round_rate(cls, v: float) -> float:
        return round(float(v), 2)

    def to_db_dict(self) -> dict:
        return self.model_dump()
