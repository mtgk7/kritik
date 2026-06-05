"""
Kritik Yapay Zeka Analiz Motoru.

İki takımın son 5 maçını Claude Haiku ile analiz eder,
Türkçe maç raporu + kesin tahmin üretir.

ANTHROPIC_API_KEY ayarlanmamışsa kural+istatistik tabanlı metne döner.
"""

import os
import logging

log = logging.getLogger("kritik-bot.predictor")


# ── İstatistik Hesaplama ───────────────────────────────────────────────────────

def _find_team_id(team_name: str, fixtures: list[dict]) -> int | None:
    name_lower = team_name.lower()
    for m in fixtures:
        h = m["teams"]["home"]
        a = m["teams"]["away"]
        if name_lower in h.get("name", "").lower():
            return h["id"]
        if name_lower in a.get("name", "").lower():
            return a["id"]
    if fixtures:
        return fixtures[0]["teams"]["home"]["id"]
    return None


def _calc_team_stats(team_id: int | None, fixtures: list[dict]) -> dict:
    """Son N maçtan W/D/L ve gol istatistiklerini hesaplar."""
    wins = draws = losses = goals_for = goals_against = 0

    for m in fixtures:
        home    = m["teams"]["home"]
        goals   = m.get("goals", {})
        h_g     = goals.get("home") or 0
        a_g     = goals.get("away") or 0
        is_home = home.get("id") == team_id
        winner  = home.get("winner")

        if winner is None:
            draws += 1
        elif (winner and is_home) or (not winner and not is_home):
            wins += 1
        else:
            losses += 1

        goals_for     += h_g if is_home else a_g
        goals_against += a_g if is_home else h_g

    return {
        "played":        len(fixtures),
        "wins":          wins,
        "draws":         draws,
        "losses":        losses,
        "goals_for":     goals_for,
        "goals_against": goals_against,
    }


def _split_missing(missing_players: list[dict]) -> tuple[list[dict], list[dict]]:
    """missing_players listesini sakat ve cezalı olarak ikiye ayırır."""
    injured    = [p for p in missing_players if p.get("reason", "").lower() != "ceza"]
    suspended  = [p for p in missing_players if p.get("reason", "").lower() == "ceza"]
    return injured, suspended


def _match_lines(team_id: int | None, fixtures: list[dict]) -> str:
    lines = []
    for m in fixtures:
        home   = m["teams"]["home"]
        away_d = m["teams"]["away"]
        goals  = m.get("goals", {})
        h_g    = goals.get("home", "?")
        a_g    = goals.get("away", "?")
        is_home = home.get("id") == team_id
        winner  = home.get("winner")

        if winner is None:
            result = "B"
        elif (winner and is_home) or (not winner and not is_home):
            result = "G"
        else:
            result = "M"

        side = "Ev" if is_home else "Dep"
        lines.append(f"  [{result}] {home.get('name','?')} {h_g}-{a_g} {away_d.get('name','?')} ({side})")
    return "\n".join(lines) if lines else "  Veri yok"


# ── Prompt Oluşturucu ─────────────────────────────────────────────────────────

def _build_prompt(
    home_team: str, away_team: str,
    home_last5: list[dict], away_last5: list[dict],
    home_cards: dict, away_cards: dict,
    home_stats: dict, away_stats: dict,
    home_form: float, away_form: float,
    home_xg: float, away_xg: float,
    home_injury: float, away_injury: float,
    missing_players: list[dict],
) -> str:
    home_id = _find_team_id(home_team, home_last5)
    away_id = _find_team_id(away_team, away_last5)
    home_5  = _match_lines(home_id, home_last5)
    away_5  = _match_lines(away_id, away_last5)

    injured, suspended = _split_missing(missing_players)

    eksik_parts = []
    if injured:
        names = ", ".join(f"{p['name']} ({p.get('missed_matches_count',0)} maç)" for p in injured[:4])
        eksik_parts.append(f"Sakat: {names}")
    if suspended:
        names = ", ".join(f"{p['name']}" for p in suspended[:3])
        eksik_parts.append(f"Cezalı: {names}")
    eksik = ("\nEksik oyuncular — " + " | ".join(eksik_parts)) if eksik_parts else ""

    hs, as_, hc, ac = home_stats, away_stats, home_cards, away_cards

    h_card_str = f"Son {hc['played']} maçta {hc['yellow_cards']} sarı, {hc['red_cards']} kırmızı kart" if hc.get("played") else "Kart verisi yok"
    a_card_str = f"Son {ac['played']} maçta {ac['yellow_cards']} sarı, {ac['red_cards']} kırmızı kart" if ac.get("played") else "Kart verisi yok"

    prompt = f"""Sen bir futbol analiz uzmanısın. Aşağıdaki gerçek istatistikleri kullanarak {home_team} - {away_team} maçı için Türkçe analiz yaz.

KURAL: Sadece verilen sayıları kullan. Hiçbir istatistiği uydurma.

## {home_team} Son {hs['played']} Maç
{home_5}
Sonuçlar: {hs['wins']} galibiyet | {hs['draws']} beraberlik | {hs['losses']} mağlubiyet
Gol: {hs['goals_for']} attı / {hs['goals_against']} yedi | xG/maç: {home_xg:.2f}
Kartlar: {h_card_str}

## {away_team} Son {as_['played']} Maç
{away_5}
Sonuçlar: {as_['wins']} galibiyet | {as_['draws']} beraberlik | {as_['losses']} mağlubiyet
Gol: {as_['goals_for']} attı / {as_['goals_against']} yedi | xG/maç: {away_xg:.2f}
Kartlar: {a_card_str}

## Kadro Durumu
Form skoru: {home_team} %{round(home_form*100)} — {away_team} %{round(away_form*100)}
Sakatlık etkisi: {home_team} %{round(home_injury*100)} — {away_team} %{round(away_injury*100)}{eksik}

## Talimatlar
5-6 cümle Türkçe analiz yaz:
- {home_team}'in son form ve gol istatistiklerini gerçek rakamlarla belirt.
- {away_team}'in son form ve gol istatistiklerini gerçek rakamlarla belirt.
- Sarı/kırmızı kart baskısı önemliyse belirt.
- Sakat veya cezalı oyuncu varsa bir cümleyle belirt (adlarını yaz).
- Rakamları olduğu gibi kullan; farklı sayı yazma.

Analizin sonuna TAM OLARAK şu formatı ekle:

---TAHMINLER---
ANA: [tahmin] %[güven]
ALT1: [tahmin] %[güven]
ALT2: [tahmin] %[güven]
---SON---

Tahmin seçenekleri: MS1, MS2, X, 2.5 Üst, 2.5 Alt
Güven yüzdeleri toplamı 100 olmalı."""

    return prompt


# ── Deterministik İstatistik Metni ────────────────────────────────────────────

def _stat_analysis(
    home_team: str, away_team: str,
    home_stats: dict, away_stats: dict,
    home_cards: dict, away_cards: dict,
    home_xg: float, away_xg: float,
    home_injury: float, away_injury: float,
    missing_players: list[dict],
) -> str:
    hs, as_, hc, ac = home_stats, away_stats, home_cards, away_cards

    def form_line(team: str, s: dict, xg: float) -> str:
        if s["played"] == 0:
            return f"{team} için form verisi bulunamadı."
        gol_avg = s["goals_for"] / s["played"] if s["played"] else 0
        yenilen_avg = s["goals_against"] / s["played"] if s["played"] else 0
        return (
            f"{team} son {s['played']} maçta {s['wins']} galibiyet, "
            f"{s['draws']} beraberlik ve {s['losses']} mağlubiyet aldı; "
            f"{s['goals_for']} gol atarken {s['goals_against']} gol yedi "
            f"(maç başı ort. {gol_avg:.1f} gol, xG {xg:.2f})."
        )

    def card_line(team: str, c: dict) -> str:
        if not c.get("played"):
            return ""
        parts = []
        if c["yellow_cards"] > 0:
            parts.append(f"{c['yellow_cards']} sarı kart")
        if c["red_cards"] > 0:
            parts.append(f"{c['red_cards']} kırmızı kart")
        if not parts:
            return ""
        return f"{team} son {c['played']} maçta {' ve '.join(parts)} gördü."

    injured, suspended = _split_missing(missing_players)

    sentences: list[str] = [
        form_line(home_team, hs, home_xg),
        form_line(away_team, as_, away_xg),
    ]

    h_cards = card_line(home_team, hc)
    a_cards = card_line(away_team, ac)
    if h_cards or a_cards:
        sentences.append(" ".join(filter(None, [h_cards, a_cards])))

    if injured:
        names = ", ".join(
            f"{p['name']} ({p.get('missed_matches_count', 1)} maçtır yok)"
            for p in injured[:3]
        )
        sentences.append(f"Sakat oyuncular: {names}.")

    if suspended:
        names = ", ".join(p["name"] for p in suspended[:3])
        sentences.append(f"Cezalı oyuncular: {names} bu maçta forma giymeyecek.")

    if not injured and not suspended:
        if home_injury >= 0.15:
            sentences.append(f"{home_team}'de önemli eksikler mevcut; takım gücü olumsuz etkilenebilir.")
        elif away_injury >= 0.15:
            sentences.append(f"{away_team}'de kadro sorunları var.")

    return " ".join(sentences)


# ── Ana Fonksiyon ─────────────────────────────────────────────────────────────

def analyze_with_claude(
    home_team: str, away_team: str,
    home_last5: list[dict], away_last5: list[dict],
    home_cards: dict, away_cards: dict,
    home_form: float, away_form: float,
    home_xg: float, away_xg: float,
    home_injury: float, away_injury: float,
    missing_players: list[dict],
) -> dict:
    """
    Claude ile maç analizi yapar.
    Dönüş: {'prediction': 'MS1', 'prediction_confidence': 62, 'alternatives': [...], 'analysis': '...'}
    API key yoksa kural+istatistik tabanlı çıktı döner.
    """
    home_id    = _find_team_id(home_team, home_last5)
    away_id    = _find_team_id(away_team, away_last5)
    home_stats = _calc_team_stats(home_id, home_last5)
    away_stats = _calc_team_stats(away_id, away_last5)

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if not api_key or api_key == "BURAYA_ANTHROPIC_API_KEY_YAZ":
        log.debug("ANTHROPIC_API_KEY ayarlanmamış, kural tabanlı tahmin kullanılıyor.")
        return _rule_based(
            home_team, away_team,
            home_stats, away_stats,
            home_cards, away_cards,
            home_form, away_form,
            home_xg, away_xg,
            home_injury, away_injury,
            missing_players,
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = _build_prompt(
            home_team, away_team,
            home_last5, away_last5,
            home_cards, away_cards,
            home_stats, away_stats,
            home_form, away_form,
            home_xg, away_xg,
            home_injury, away_injury,
            missing_players,
        )

        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}],
        )

        raw    = message.content[0].text.strip()
        result = _parse_predictions(
            raw,
            home_team, away_team,
            home_stats, away_stats,
            home_cards, away_cards,
            home_form, away_form,
            home_xg, away_xg,
            home_injury, away_injury,
            missing_players,
        )

        alts_str = ", ".join(f"{a['prediction']} %{a['confidence']}" for a in result["alternatives"])
        log.info(f"    Claude: {result['prediction']} %{result['prediction_confidence']} | Alt: [{alts_str}]")
        return result

    except Exception as e:
        log.warning(f"Claude analiz hatası: {e}")
        return _rule_based(
            home_team, away_team,
            home_stats, away_stats,
            home_cards, away_cards,
            home_form, away_form,
            home_xg, away_xg,
            home_injury, away_injury,
            missing_players,
        )


# ── Ayrıştırıcı ───────────────────────────────────────────────────────────────

def _parse_predictions(
    text: str,
    home_team: str, away_team: str,
    home_stats: dict, away_stats: dict,
    home_cards: dict, away_cards: dict,
    home_form: float, away_form: float,
    home_xg: float, away_xg: float,
    home_injury: float, away_injury: float,
    missing_players: list[dict],
) -> dict:
    import re

    parts        = text.split("---TAHMINLER---")
    analysis_raw = parts[0].strip() if len(parts) > 1 else ""

    block = ""
    if len(parts) > 1:
        block = parts[1].split("---SON---")[0].strip()

    predictions = []
    for line in block.splitlines():
        m = re.match(r"(?:ANA|ALT\d):\s*(.+?)\s+%(\d+)", line.strip(), re.IGNORECASE)
        if m:
            predictions.append({
                "prediction": _normalize_pred(m.group(1).strip()),
                "confidence": int(m.group(2)),
            })

    if not predictions:
        rb = _rule_based(
            home_team, away_team,
            home_stats, away_stats,
            home_cards, away_cards,
            home_form, away_form,
            home_xg, away_xg,
            home_injury, away_injury,
            missing_players,
        )
        if analysis_raw:
            rb["analysis"] = analysis_raw
        return rb

    analysis = analysis_raw or _stat_analysis(
        home_team, away_team,
        home_stats, away_stats,
        home_cards, away_cards,
        home_xg, away_xg,
        home_injury, away_injury,
        missing_players,
    )

    return {
        "prediction":            predictions[0]["prediction"],
        "prediction_confidence": predictions[0]["confidence"],
        "alternatives":          predictions[1:3],
        "analysis":              analysis,
    }


def _normalize_pred(code: str) -> str:
    c = code.lower().strip()
    if "ms1" in c or "ev sahi" in c: return "MS1"
    if "ms2" in c or "deplasm" in c: return "MS2"
    if c == "x" or "beraberlik" in c: return "X"
    if "üst" in c or "ust" in c: return "2.5 Üst"
    if "alt" in c: return "2.5 Alt"
    return code.upper()


# ── Kural Tabanlı Fallback ────────────────────────────────────────────────────

def _rule_based(
    home_team: str, away_team: str,
    home_stats: dict, away_stats: dict,
    home_cards: dict, away_cards: dict,
    home_form: float, away_form: float,
    home_xg: float, away_xg: float,
    home_injury: float, away_injury: float,
    missing_players: list[dict],
) -> dict:
    form_diff = (home_form - away_form) * 0.35
    xg_diff   = (home_xg   - away_xg)   * 0.40
    net       = form_diff + xg_diff + 0.05

    home_adj = home_xg * (1 - home_injury)
    away_adj = away_xg * (1 - away_injury)
    total_xg = home_adj + away_adj

    if abs(net) < 0.08:
        main, c1 = ("2.5 Üst", 55) if total_xg > 2.5 else ("2.5 Alt", 55)
        alts = [{"prediction": "X", "confidence": 25}, {"prediction": "MS1", "confidence": 20}]
    elif net > 0:
        c1   = min(70, 50 + int(abs(net) * 100))
        main = "MS1"
        alts = [
            {"prediction": "X",   "confidence": max(10, 30 - int(abs(net)*50))},
            {"prediction": "MS2", "confidence": max(5,  20 - int(abs(net)*50))},
        ]
    else:
        c1   = min(70, 50 + int(abs(net) * 100))
        main = "MS2"
        alts = [
            {"prediction": "X",   "confidence": max(10, 30 - int(abs(net)*50))},
            {"prediction": "MS1", "confidence": max(5,  20 - int(abs(net)*50))},
        ]

    total_alt = sum(a["confidence"] for a in alts)
    c1 = 100 - total_alt

    analysis = _stat_analysis(
        home_team, away_team,
        home_stats, away_stats,
        home_cards, away_cards,
        home_xg, away_xg,
        home_injury, away_injury,
        missing_players,
    )

    return {
        "prediction":            main,
        "prediction_confidence": c1,
        "alternatives":          alts,
        "analysis":              analysis,
    }
