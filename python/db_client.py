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
