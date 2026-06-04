"""
Kritik Data Bot — Ana Orkestratör

Çalıştırma:
  python main.py           → tek seferlik çalıştır
  python main.py --cron    → saatlik cron döngüsü başlat

Cron modu her saat başı çalışır. Production'da
systemd timer veya cron ile `python main.py` de yeterli.
"""

import sys
import time
import logging
import uuid
from datetime import datetime, timezone

import schedule

from config import PROVIDER, FOOTBALL_DATA_LEAGUES, LEAGUE_IDS
from api_client import get_fixtures, current_league_season
from analyzer import (
    calc_form_score,
    calc_raw_xg,
    calc_xg_score,
    calc_injury_effect,
    calc_confidence,
)
from api_client import get_last5_fixtures
from db_client import upsert_matches, upsert_coupons, delete_today_coupons
from models import MatchRecord, MissingPlayer, CouponRecord
from news_fetcher import run_news_fetch
from predictor import analyze_with_claude

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("kritik-bot")


# ── Deterministik UUID ────────────────────────────────────────────────────────

def fixture_uuid(fixture_id: int) -> str:
    """
    API-Football fixture_id'sinden her seferinde aynı UUID üretir.
    Bu sayede upsert çakışma yaratmaz.
    """
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"apifootball:{fixture_id}"))


# ── Tahmin mantığı ────────────────────────────────────────────────────────────

def predict(
    home_form: float, away_form: float,
    home_xg: float,   away_xg: float,
    home_injury: float, away_injury: float,
) -> str:
    """
    Basit kural tabanlı tahmin — her zaman bir string döndürür (kritik5.py: zorunlu str).
    Net avantaj > 0 → MS1, < 0 → MS2, yakın → xG toplamına göre 2.5 Üst/Alt
    """
    form_diff = (home_form - away_form) * 0.35
    xg_diff   = (home_xg   - away_xg)   * 0.40
    net       = form_diff + xg_diff + 0.05

    home_adj = home_xg * (1 - home_injury)
    away_adj = away_xg * (1 - away_injury)
    total_xg = home_adj + away_adj

    if abs(net) < 0.08:
        return "2.5 Üst" if total_xg > 2.5 else "2.5 Alt"
    return "MS1" if net > 0 else "MS2"


# ── Kupon üretici ─────────────────────────────────────────────────────────────

def build_coupons(analyzed: list[MatchRecord]) -> list[CouponRecord]:
    """
    Analiz edilen maçlardan otomatik kupon üretir.

    Banko:           confidence >= 0.70, tek maç
    xG Canavarı:     home_xg + away_xg >= 2.8, en fazla 3 maç
    Premium Sürpriz: en yüksek güvenli 3 maç, is_premium=True
    """
    coupons: list[CouponRecord] = []
    sorted_by_conf = sorted(analyzed, key=lambda m: m.confidence_score, reverse=True)

    # Banko
    bankolar = [m for m in sorted_by_conf if m.confidence_score >= 0.70]
    if bankolar:
        m = bankolar[0]
        coupons.append(CouponRecord(
            coupon_type="Banko",
            matches=[m.id],
            total_rate=max(round(1.0 / m.confidence_score, 2), 1.01),
            is_premium=False,
        ))

    # xG Canavarı
    yuksek_xg = [m for m in analyzed if m.home_xg + m.away_xg >= 2.8][:3]
    if yuksek_xg:
        avg_rate = round(
            sum(1.0 / max(m.confidence_score, 0.01) for m in yuksek_xg) / len(yuksek_xg), 2
        )
        coupons.append(CouponRecord(
            coupon_type="xG Canavarı",
            matches=[m.id for m in yuksek_xg],
            total_rate=max(avg_rate, 1.01),
            is_premium=False,
        ))

    # Premium Sürpriz
    if len(sorted_by_conf) >= 3:
        top3 = sorted_by_conf[:3]
        combo_rate = min(round(
            (1.0 / max(top3[0].confidence_score, 0.01)) *
            (1.0 / max(top3[1].confidence_score, 0.01)) *
            (1.0 / max(top3[2].confidence_score, 0.01)),
            2,
        ), 50.0)
        coupons.append(CouponRecord(
            coupon_type="Premium Sürpriz",
            matches=[m.id for m in top3],
            total_rate=max(combo_rate, 1.01),
            is_premium=True,
        ))

    return coupons


# ── Ana görev ─────────────────────────────────────────────────────────────────

def run():
    log.info("=== Kritik Data Bot başlatıldı ===")
    analyzed_all = []

    # Provider'a göre lig listesi seç
    leagues = FOOTBALL_DATA_LEAGUES if PROVIDER == "football_data" else [str(i) for i in LEAGUE_IDS]

    for league_ref in leagues:
        season = current_league_season(league_ref)
        log.info(f"Lig {league_ref} | Sezon {season} | Provider: {PROVIDER}")

        fixtures = get_fixtures(league_ref, season)
        log.info(f"  {len(fixtures)} maç bulundu")

        for fx in fixtures:
            fixture_id = fx["fixture"]["id"]
            match_time = fx["fixture"]["date"]

            home = fx["teams"]["home"]
            away = fx["teams"]["away"]
            home_id, home_name = home["id"], home["name"]
            away_id, away_name = away["id"], away["name"]

            log.info(f"  Analiz: {home_name} vs {away_name}")

            try:
                # Form skorları
                home_form = calc_form_score(home_id, league_ref, season)
                away_form = calc_form_score(away_id, league_ref, season)

                # Ham xG (DB'ye yazılır)
                home_xg_raw = calc_raw_xg(home_id, league_ref, season)
                away_xg_raw = calc_raw_xg(away_id, league_ref, season)

                # Normalize xG (algoritma içi kullanım)
                home_xg_norm = calc_xg_score(home_id, league_ref, season)
                away_xg_norm = calc_xg_score(away_id, league_ref, season)

                # Sakatlık etkisi
                home_inj, home_missing = calc_injury_effect(home_id, league_ref, season)
                away_inj, away_missing = calc_injury_effect(away_id, league_ref, season)

                # Toplam sakatlık etkisi (ortalama)
                critical_missing_effect = round((home_inj + away_inj) / 2, 3)

                # Güven skoru
                confidence = calc_confidence(
                    home_form, away_form,
                    home_xg_norm, away_xg_norm,
                    home_inj, away_inj,
                )

                # Son 5 maç verisi
                home_last5 = get_last5_fixtures(home_id, league_ref, season)
                away_last5 = get_last5_fixtures(away_id, league_ref, season)

                # Claude AI analizi (API key yoksa kural tabanlı)
                ai_result = analyze_with_claude(
                    home_name, away_name,
                    home_last5, away_last5,
                    home_form, away_form,
                    home_xg_raw, away_xg_raw,
                    home_inj, away_inj,
                    home_missing + away_missing,
                )

                all_missing = [
                    MissingPlayer(**p) for p in home_missing + away_missing
                ]

                match_record = MatchRecord(
                    id=fixture_uuid(fixture_id),
                    home_team=home_name,
                    away_team=away_name,
                    match_time=match_time,
                    home_xg=home_xg_raw,
                    away_xg=away_xg_raw,
                    home_form_score=home_form,
                    away_form_score=away_form,
                    critical_missing_effect=critical_missing_effect,
                    confidence_score=confidence,
                    prediction=ai_result["prediction"],
                    prediction_confidence=ai_result.get("prediction_confidence", 0),
                    analysis=ai_result.get("analysis"),
                    alternatives=ai_result.get("alternatives", []),
                    missing_players=all_missing,
                )

                analyzed_all.append(match_record)
                log.info(
                    f"    xG {home_xg_raw}/{away_xg_raw} | "
                    f"Güven %{round(confidence*100)} | "
                    f"Tahmin: {ai_result['prediction']}"
                )

            except Exception as exc:
                log.warning(f"    HATA [{home_name} vs {away_name}]: {exc}")
                continue

            # API rate-limit koruması
            time.sleep(0.4)

    # DB'ye yaz
    if analyzed_all:
        written = upsert_matches(analyzed_all)
        log.info(f"DB'ye yazıldı: {written} maç")

        delete_today_coupons()
        coupons = build_coupons(analyzed_all)
        if coupons:
            written_c = upsert_coupons(coupons)
            log.info(f"Kupon oluşturuldu: {written_c} kupon")
    else:
        log.info("Yazılacak maç bulunamadı.")

    # Haberleri çek
    log.info("Haberler çekiliyor...")
    run_news_fetch()

    log.info("=== Tamamlandı ===")


# ── Giriş noktası ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--cron" in sys.argv:
        log.info("Cron modu: maç analizi saatlik, haberler 10 dk'da bir.")
        schedule.every().hour.at(":00").do(run)
        schedule.every(10).minutes.do(run_news_fetch)
        run()   # ilk tam çalıştırma hemen
        while True:
            schedule.run_pending()
            time.sleep(30)
    else:
        run()
