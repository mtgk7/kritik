"""
Supabase yazma katmanı — supabase-py (v2) ile direkt bağlantı.
Service role key kullanır; RLS bypass eder, bot güvenli şekilde yazar.
"""

import logging
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from models import MatchRecord, CouponRecord

log = logging.getLogger("kritik-bot.db")

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def upsert_matches(matches: list[MatchRecord]) -> int:
    """
    Maç analizlerini `matches` tablosuna yazar.
    id çakışmasında mevcut kaydı günceller (upsert).
    Doğrulanmış MatchRecord listesi alır.
    """
    if not matches:
        return 0

    rows = [m.to_db_dict() for m in matches]
    client = _get_client()

    result = (
        client.table("matches")
        .upsert(rows, on_conflict="id")
        .execute()
    )

    count = len(result.data) if result.data else 0
    log.info(f"matches upsert: {count} kayıt")
    return count


def upsert_coupons(coupons: list[CouponRecord]) -> int:
    """
    Kuponları `coupons` tablosuna ekler.
    Kuponlar append-only — aynı kupon iki kez eklenmez
    (main.py her çalıştırmada günün kuponlarını temizler).
    """
    if not coupons:
        return 0

    rows = [c.to_db_dict() for c in coupons]
    client = _get_client()

    result = (
        client.table("coupons")
        .insert(rows)
        .execute()
    )

    count = len(result.data) if result.data else 0
    log.info(f"coupons insert: {count} kayıt")
    return count


def get_existing_analyses() -> dict[str, dict]:
    """
    Yaklaşan maçların mevcut Claude analizlerini id → veri sözlüğü olarak döner.
    Bot, 48 saatten uzak ve zaten analiz edilmiş maçlarda Claude'u tekrar
    çağırmamak için bunu kullanır (kredi tasarrufu).
    """
    client = _get_client()
    try:
        res = (
            client.table("matches")
            .select("id, prediction, prediction_confidence, analysis, alternatives, match_time")
            .neq("status", "bitti")
            .not_.is_("analysis", "null")
            .execute()
        )
    except Exception as e:
        log.warning(f"Mevcut analizler çekilemedi: {e}")
        return {}

    out: dict[str, dict] = {}
    for row in res.data or []:
        out[row["id"]] = row
    return out


def get_setting(key: str) -> dict | None:
    """app_settings tablosundan bir ayarı okur."""
    client = _get_client()
    res = client.table("app_settings").select("value").eq("key", key).limit(1).execute()
    if res.data:
        return res.data[0].get("value")
    return None


def set_setting(key: str, value: dict) -> None:
    """app_settings tablosuna bir ayar yazar (upsert)."""
    client = _get_client()
    client.table("app_settings").upsert(
        {"key": key, "value": value}, on_conflict="key"
    ).execute()
    log.info(f"app_settings güncellendi: {key}")


def delete_today_coupons() -> None:
    """
    Her çalıştırmada bugünün botun ürettiği kuponlarını siler,
    böylece duplicate oluşmaz.
    """
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()
    client = _get_client()
    client.table("coupons").delete().gte("created_at", today).execute()
    log.info("Bugünün eski kuponları silindi")
