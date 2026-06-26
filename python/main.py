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

from config import PROVIDER, FOOTBALL_DATA_LEAGUES, LEAGUE_IDS, API_KEY, DRAW_THRESHOLD, MS2_MIN_NET, NEUTRAL_VENUE_LEAGUES
from api_client import get_fixtures, current_league_season, get_last5_summary
from analyzer import (
    calc_form_score,
    calc_raw_xg,
    calc_xg_score,
    calc_injury_effect,
    calc_confidence,
)
from api_client import get_last5_fixtures, get_team_card_stats
from predictor import _find_team_id, _calc_team_stats
from db_client import upsert_matches, upsert_coupons, delete_today_coupons, get_setting, set_setting
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
    league_ref: str | int = "",
) -> str:
    """
    Basit kural tabanlı tahmin. Tarafsız saha desteği ve gelişmiş beraberlik/MS2 eşikleri.
    """
    try:
        is_neutral = int(league_ref) in NEUTRAL_VENUE_LEAGUES
    except (ValueError, TypeError):
        is_neutral = str(league_ref).upper() in {"WC"}

    home_bonus = 0.0 if is_neutral else 0.05
    form_diff  = (home_form - away_form) * 0.35
    xg_diff    = (home_xg   - away_xg)   * 0.40
    net        = form_diff + xg_diff + home_bonus

    home_adj = home_xg * (1 - home_injury)
    away_adj = away_xg * (1 - away_injury)
    total_xg = home_adj + away_adj

    if abs(net) < DRAW_THRESHOLD:
        return "2.5 Üst" if total_xg > 2.6 else ("2.5 Alt" if total_xg < 1.8 else "X")
    if net > 0:
        return "MS1"
    if abs(net) < MS2_MIN_NET:
        return "X"
    return "MS2"


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


# ── Lig Adı Haritası ─────────────────────────────────────────────────────────

LEAGUE_NAME_MAP: dict[str | int, str] = {
    # API-Football
    203:  "Süper Lig",
    39:   "Premier Lig",
    140:  "La Liga",
    78:   "Bundesliga",
    135:  "Serie A",
    61:   "Ligue 1",
    2:    "Şampiyonlar Ligi",
    3:    "Avrupa Ligi",
    1:    "Dünya Kupası 2026",
    # football-data.org
    "PL":  "Premier Lig",
    "PD":  "La Liga",
    "BL1": "Bundesliga",
    "SA":  "Serie A",
    "FL1": "Ligue 1",
    "CL":  "Şampiyonlar Ligi",
    "EL":  "Avrupa Ligi",
    "WC":  "Dünya Kupası 2026",
}

def get_league_name(league_ref: str | int) -> str:
    try:
        key = int(league_ref)
    except (ValueError, TypeError):
        key = str(league_ref)
    return LEAGUE_NAME_MAP.get(key, f"Lig {league_ref}")


# ── Son 5 Maç Özeti ──────────────────────────────────────────────────────────

def _build_last5_summary(team_name: str, team_id: int, fixtures: list[dict], cards: dict) -> dict:
    """
    Son 5 maçtan DB'ye yazılacak yapılandırılmış özet.
    Frontend'de form çizgisi ve detay tablosu olarak gösterilir.
    """
    stats   = _calc_team_stats(team_id, fixtures)
    matches = []

    for fx in fixtures:
        home   = fx["teams"]["home"]
        away_d = fx["teams"]["away"]
        goals  = fx.get("goals", {})
        h_g    = goals.get("home") or 0
        a_g    = goals.get("away") or 0
        is_home = home.get("id") == team_id
        winner  = home.get("winner")
        date    = fx.get("fixture", {}).get("date", "")[:10]

        if winner is None:
            result = "B"
        elif (winner and is_home) or (not winner and not is_home):
            result = "G"
        else:
            result = "M"

        opponent = away_d.get("name", "?") if is_home else home.get("name", "?")
        team_score     = h_g if is_home else a_g
        opponent_score = a_g if is_home else h_g

        matches.append({
            "result":         result,
            "opponent":       opponent,
            "team_score":     team_score,
            "opponent_score": opponent_score,
            "was_home":       is_home,
            "date":           date,
        })

    return {
        "team":          team_name,
        "played":        stats["played"],
        "wins":          stats["wins"],
        "draws":         stats["draws"],
        "losses":        stats["losses"],
        "goals_for":     stats["goals_for"],
        "goals_against": stats["goals_against"],
        "yellow_cards":  cards.get("yellow_cards", 0),
        "red_cards":     cards.get("red_cards", 0),
        "matches":       matches,
    }


# ── Ana görev ─────────────────────────────────────────────────────────────────

# football-data.org lig kodu → api-football lig ID eşlemesi (tahmin için)
_FD_TO_AFL: dict[str, int] = {
    "WC": 1, "PL": 39, "PD": 140, "BL1": 78, "SA": 135, "FL1": 61,
    "CL": 2, "EL": 3, "PPL": 94, "DED": 88,
}


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

                # Güven skoru (tarafsız saha ligleri için ev avantajı sıfır)
                confidence = calc_confidence(
                    home_form, away_form,
                    home_xg_norm, away_xg_norm,
                    home_inj, away_inj,
                    league_ref=league_ref,
                )

                # Son 5 maç özet verisi — SofaScore veya mevcut provider
                home_last5_data = get_last5_summary(home_name, home_id, league_ref, season)
                away_last5_data = get_last5_summary(away_name, away_id, league_ref, season)

                # SofaScore bulamazsa mevcut provider'dan hesapla
                if home_last5_data is None or away_last5_data is None:
                    home_last5 = get_last5_fixtures(home_id, league_ref, season)
                    away_last5 = get_last5_fixtures(away_id, league_ref, season)
                    home_cards = get_team_card_stats(home_id, league_ref, season)
                    away_cards = get_team_card_stats(away_id, league_ref, season)
                    if home_last5_data is None:
                        home_last5_data = _build_last5_summary(home_name, home_id, home_last5, home_cards)
                    if away_last5_data is None:
                        away_last5_data = _build_last5_summary(away_name, away_id, away_last5, away_cards)

                # api-football tahmin motoru (üçüncü taraf görüş)
                third_party_pred = None
                if API_KEY:
                    try:
                        from providers.api_football import find_afl_fixture_id, get_predictions as _get_preds
                        afl_league_id = _FD_TO_AFL.get(str(league_ref))
                        if afl_league_id:
                            match_date = str(match_time)[:10]
                            afl_fx_id = find_afl_fixture_id(
                                home_name, away_name, match_date, afl_league_id, season
                            )
                            if afl_fx_id:
                                third_party_pred = _get_preds(afl_fx_id)
                                if third_party_pred:
                                    pct = third_party_pred.get("percent", {})
                                    log.info(f"    3. taraf: MS1 {pct.get('home','?')} | X {pct.get('draw','?')} | MS2 {pct.get('away','?')}")
                    except Exception as _e:
                        log.debug(f"    3. taraf tahmin alınamadı: {_e}")

                # Claude AI analizi (API key yoksa kural tabanlı)
                ai_result = analyze_with_claude(
                    home_name, away_name,
                    home_last5, away_last5,
                    home_cards, away_cards,
                    home_form, away_form,
                    home_xg_raw, away_xg_raw,
                    home_inj, away_inj,
                    home_missing + away_missing,
                    third_party_pred=third_party_pred,
                    league_ref=league_ref,
                )

                all_missing = [
                    MissingPlayer(**p) for p in home_missing + away_missing
                ]

                match_record = MatchRecord(
                    id=fixture_uuid(fixture_id),
                    home_team=home_name,
                    away_team=away_name,
                    match_time=match_time,
                    league_name=get_league_name(league_ref),
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
                    home_last5_data=home_last5_data,
                    away_last5_data=away_last5_data,
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

    # Ücretsiz vitrin maçları — CUMA'dan CUMA'ya rotasyon (her Cuma değişir)
    if analyzed_all:
        import random
        from datetime import datetime, timezone, timedelta

        # İçinde bulunduğumuz Cuma-haftasının başlangıç Cuma'sı (anahtar olarak)
        now = datetime.now(timezone.utc)
        days_since_friday = (now.weekday() - 4) % 7  # Cuma=4
        current_week = (now - timedelta(days=days_since_friday)).date().isoformat()

        setting = get_setting("free_preview") or {}
        stored_week = setting.get("week")
        stored_ids  = setting.get("match_ids") or []

        valid_ids = {m.id for m in analyzed_all}

        if stored_week != current_week or not any(i in valid_ids for i in stored_ids):
            # Yeni hafta (veya kayıtlı maçlar artık yok) → yeniden seç
            chosen = random.sample(analyzed_all, min(4, len(analyzed_all)))
            stored_ids = [m.id for m in chosen]
            set_setting("free_preview", {"week": current_week, "match_ids": stored_ids})
            log.info(f"Ücretsiz vitrin YENİLENDİ ({current_week}): {len(stored_ids)} maç")
        else:
            log.info(f"Ücretsiz vitrin korunuyor ({current_week}): {len(stored_ids)} maç")

        # Her çalıştırmada uygula (upsert reset'ini önlemek için)
        free_set = set(stored_ids)
        for m in analyzed_all:
            m.is_free_preview = m.id in free_set

    # DB'ye yaz
    if analyzed_all:
        written = upsert_matches(analyzed_all)
        log.info(f"DB'ye yazıldı: {written} maç")

        delete_today_coupons()
        coupons = build_coupons(analyzed_all)
        if coupons:
            written_c = upsert_coupons(coupons)
            log.info(f"Kupon oluşturuldu: {written_c} kupon")

        # Bildirimler
        try:
            from email_notifier import notify_premium_users
            notify_premium_users(analyzed_all)
        except Exception as e:
            log.warning(f"Email bildirimi başarısız: {e}")

        try:
            from telegram_bot import run as telegram_run
            telegram_run()
        except Exception as e:
            log.warning(f"Telegram bildirimi başarısız: {e}")
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
