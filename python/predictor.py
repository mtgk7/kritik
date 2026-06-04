"""
Kritik Yapay Zeka Analiz Motoru.

İki takımın son 5 maçını Claude Haiku ile analiz eder,
Türkçe maç raporu + kesin tahmin üretir.

ANTHROPIC_API_KEY ayarlanmamışsa kural tabanlı tahmine döner.
"""

import os
import logging

log = logging.getLogger("kritik-bot.predictor")


def _build_prompt(
    home_team: str,
    away_team: str,
    home_last5: list[dict],
    away_last5: list[dict],
    home_form: float,
    away_form: float,
    home_xg: float,
    away_xg: float,
    home_injury: float,
    away_injury: float,
    missing_players: list[dict],
) -> str:
    """Claude için analiz promptu oluşturur."""

    def match_summary(team_id: int, matches: list[dict]) -> str:
        lines = []
        for m in matches:
            home = m["teams"]["home"]
            away_d = m["teams"]["away"]  # away_d = away data
            goals  = m.get("goals", {})
            h_goals = goals.get("home", "?")
            a_goals = goals.get("away", "?")
            is_home = home.get("id") == team_id
            side    = "Ev sahibi" if is_home else "Deplasman"
            winner  = home.get("winner")
            if winner is None:
                result = "B"
            elif (winner and is_home) or (not winner and not is_home):
                result = "G"
            else:
                result = "M"
            lines.append(f"  [{result}] {home.get('name','?')} {h_goals}-{a_goals} {away_d.get('name','?')} ({side})")
        return "\n".join(lines) if lines else "  Veri yok"

    # Eksik oyuncular
    eksik = ""
    if missing_players:
        eksik_list = [f"{p['name']} ({p.get('reason','?')}, {p.get('missed_matches_count',0)} maç kaçırdı)"
                      for p in missing_players[:5]]
        eksik = "\nEksik oyuncular: " + ", ".join(eksik_list)

    # Home/away team id'lerini bul
    home_id = None
    if home_last5:
        home_id = home_last5[0]["teams"]["home"]["id"]
        # Doğru id'yi bul
        for m in home_last5:
            if home_team.lower() in m["teams"]["home"].get("name","").lower():
                home_id = m["teams"]["home"]["id"]
                break
            if home_team.lower() in m["teams"]["away"].get("name","").lower():
                home_id = m["teams"]["away"]["id"]
                break

    away_id = None
    if away_last5:
        for m in away_last5:
            if away_team.lower() in m["teams"]["home"].get("name","").lower():
                away_id = m["teams"]["home"]["id"]
                break
            if away_team.lower() in m["teams"]["away"].get("name","").lower():
                away_id = m["teams"]["away"]["id"]
                break

    home_5 = match_summary(home_id, home_last5) if home_id else "  Veri yok"
    away_5 = match_summary(away_id, away_last5) if away_id else "  Veri yok"

    prompt = f"""Sen bir futbol analiz uzmanısın. Aşağıdaki verilere dayanarak {home_team} - {away_team} maçını analiz et.

## {home_team} Son 5 Maç
{home_5}

## {away_team} Son 5 Maç
{away_5}

## İstatistikler
- Form: {home_team} %{round(home_form*100)} — {away_team} %{round(away_form*100)}
- xG (Gol Beklentisi/Maç): {home_team} {home_xg:.2f} — {away_team} {away_xg:.2f}
- Sakatlık etkisi: {home_team} %{round(home_injury*100)} — {away_team} %{round(away_injury*100)}{eksik}

## Talimatlar
1. 3-4 cümle kısa Türkçe analiz yaz (son 5 maç performansına değin)
2. Analizin sonuna TAM OLARAK şu formatı ekle — başka format kabul edilmez:

---TAHMINLER---
ANA: [tahmin] %[güven]
ALT1: [tahmin] %[güven]
ALT2: [tahmin] %[güven]
---SON---

Tahmin seçenekleri: MS1, MS2, X, 2.5 Üst, 2.5 Alt
Güven yüzdeleri toplamı 100 olmalı.
Örnek:
---TAHMINLER---
ANA: MS1 %62
ALT1: X %25
ALT2: MS2 %13
---SON---"""

    return prompt


def analyze_with_claude(
    home_team: str,
    away_team: str,
    home_last5: list[dict],
    away_last5: list[dict],
    home_form: float,
    away_form: float,
    home_xg: float,
    away_xg: float,
    home_injury: float,
    away_injury: float,
    missing_players: list[dict],
) -> dict:
    """
    Claude ile maç analizi yapar.
    Dönüş: {'prediction': 'MS1', 'analysis': 'Türkçe analiz metni'}
    API key yoksa kural tabanlı tahmine döner.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if not api_key or api_key == "BURAYA_ANTHROPIC_API_KEY_YAZ":
        log.debug("ANTHROPIC_API_KEY ayarlanmamış, kural tabanlı tahmin kullanılıyor.")
        return _rule_based(home_form, away_form, home_xg, away_xg, home_injury, away_injury)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = _build_prompt(
            home_team, away_team,
            home_last5, away_last5,
            home_form, away_form,
            home_xg, away_xg,
            home_injury, away_injury,
            missing_players,
        )

        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()

        # Tahmin bloğunu ayrıştır
        result = _parse_predictions(raw, home_form, away_form, home_xg, away_xg, home_injury, away_injury)

        alts_str = ", ".join(f"{a['prediction']} %{a['confidence']}" for a in result['alternatives'])
        log.info(f"    Claude: {result['prediction']} %{result['prediction_confidence']} | Alt: [{alts_str}]")
        return result

    except Exception as e:
        log.warning(f"Claude analiz hatası: {e}")
        return _rule_based(home_form, away_form, home_xg, away_xg, home_injury, away_injury)


def _parse_predictions(text: str, home_form: float, away_form: float,
                        home_xg: float, away_xg: float,
                        home_injury: float, away_injury: float) -> dict:
    """
    Claude çıktısından ana + alternatif tahminleri ayrıştırır.
    Format:
      ---TAHMINLER---
      ANA: MS1 %62
      ALT1: X %25
      ALT2: MS2 %13
      ---SON---
    """
    import re

    # Analiz metnini tahmin bloğundan ayır
    parts = text.split("---TAHMINLER---")
    analysis_text = parts[0].strip() if len(parts) > 1 else text.strip()

    # Tahmin bloğunu al
    block = ""
    if len(parts) > 1:
        block = parts[1].split("---SON---")[0].strip()

    predictions = []
    for line in block.splitlines():
        line = line.strip()
        # ANA: MS1 %62  veya  ALT1: X %25
        m = re.match(r"(?:ANA|ALT\d):\s*(.+?)\s+%(\d+)", line, re.IGNORECASE)
        if m:
            pred_code = _normalize_pred(m.group(1).strip())
            confidence = int(m.group(2))
            predictions.append({"prediction": pred_code, "confidence": confidence})

    # Ayrıştırma başarısızsa kural tabanlı
    if not predictions:
        rb = _rule_based(home_form, away_form, home_xg, away_xg, home_injury, away_injury)
        rb["analysis"] = analysis_text or None
        return rb

    main_pred = predictions[0]
    alternatives = predictions[1:3]  # En fazla 2 alternatif

    return {
        "prediction":            main_pred["prediction"],
        "prediction_confidence": main_pred["confidence"],
        "alternatives":          alternatives,
        "analysis":              analysis_text or None,
    }


def _normalize_pred(code: str) -> str:
    """Claude'un farklı yazım biçimlerini normalize eder."""
    c = code.lower().strip()
    if "ms1" in c or "ev sahi" in c: return "MS1"
    if "ms2" in c or "deplasm" in c: return "MS2"
    if c == "x" or "beraberlik" in c: return "X"
    if "üst" in c or "ust" in c: return "2.5 Üst"
    if "alt" in c: return "2.5 Alt"
    return code.upper()


def _rule_based(home_form: float, away_form: float,
                home_xg: float, away_xg: float,
                home_injury: float, away_injury: float) -> dict:
    """Claude yoksa basit kural tabanlı tahmin + alternatifler."""
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
        c1 = min(70, 50 + int(abs(net) * 100))
        main = "MS1"
        alts = [{"prediction": "X", "confidence": max(10, 30 - int(abs(net)*50))},
                {"prediction": "MS2", "confidence": max(5, 20 - int(abs(net)*50))}]
    else:
        c1 = min(70, 50 + int(abs(net) * 100))
        main = "MS2"
        alts = [{"prediction": "X", "confidence": max(10, 30 - int(abs(net)*50))},
                {"prediction": "MS1", "confidence": max(5, 20 - int(abs(net)*50))}]

    # Toplamı 100'e tamamla
    total_alt = sum(a["confidence"] for a in alts)
    c1 = 100 - total_alt

    return {
        "prediction":            main,
        "prediction_confidence": c1,
        "alternatives":          alts,
        "analysis":              None,
    }
