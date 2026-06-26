"""
Kritik Yapay Zeka Analiz Motoru.

İki takımın son 5 maçını Claude Haiku ile analiz eder,
Türkçe maç raporu + kesin tahmin üretir.

ANTHROPIC_API_KEY ayarlanmamışsa kural+istatistik tabanlı metne döner.
"""

import os
import math
import logging
from config import NEUTRAL_VENUE_LEAGUES, DRAW_THRESHOLD, MS2_MIN_NET

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


def _calc_btts_stats(team_id: int | None, fixtures: list[dict]) -> dict:
    """Son N maçtan KG Var ve 2.5 Üst sayılarını hesaplar."""
    btts = over25 = scored = conceded = played = 0
    for m in fixtures:
        home  = m["teams"]["home"]
        goals = m.get("goals", {})
        h_g   = goals.get("home") or 0
        a_g   = goals.get("away") or 0
        my_g  = h_g if home.get("id") == team_id else a_g
        op_g  = a_g if home.get("id") == team_id else h_g
        if my_g > 0 and op_g > 0: btts += 1
        if (my_g + op_g) > 2:     over25 += 1
        if my_g > 0:  scored   += 1
        if op_g > 0:  conceded += 1
        played += 1
    return {"played": played, "btts": btts, "over25": over25, "scored": scored, "conceded": conceded}


def _poisson_over25(home_xg: float, away_xg: float) -> int:
    """xG toplamına dayalı Poisson ile 2.5 Üst ihtimali (0-100)."""
    lam = max(home_xg + away_xg, 0.1)
    p0  = math.exp(-lam)
    p1  = lam * p0
    p2  = (lam ** 2 / 2) * p0
    return round((1 - p0 - p1 - p2) * 100)


def _poisson_1x2(home_xg: float, away_xg: float) -> tuple[int, int, int]:
    """
    Dixon-Coles yaklaşımı: xG'den MS1 / X / MS2 olasılıkları.
    Her takım bağımsız Poisson dağılımı varsayılır; 0-10 gol truncate.
    """
    MAX = 11
    lh  = max(home_xg, 0.05)
    la  = max(away_xg, 0.05)

    # P(home=k) ve P(away=k) tabloları
    ph = [math.exp(-lh) * lh**k / math.factorial(k) for k in range(MAX)]
    pa = [math.exp(-la) * la**k / math.factorial(k) for k in range(MAX)]

    ms1 = x = ms2 = 0.0
    for h in range(MAX):
        for a in range(MAX):
            p = ph[h] * pa[a]
            if h > a:   ms1 += p
            elif h == a: x  += p
            else:        ms2 += p

    total = ms1 + x + ms2
    if total == 0:
        return 40, 30, 30
    return round(ms1 / total * 100), round(x / total * 100), round(ms2 / total * 100)


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

def _implied_probs(ms1: float, x: float, ms2: float) -> tuple[int, int, int] | None:
    """Bahis oranlarından vig-free zımni olasılık hesapla (toplam %100)."""
    try:
        raw = [1 / ms1, 1 / x, 1 / ms2]
        total = sum(raw)
        return tuple(round(p / total * 100) for p in raw)
    except Exception:
        return None


def _build_prompt(
    home_team: str, away_team: str,
    home_last5: list[dict], away_last5: list[dict],
    home_cards: dict, away_cards: dict,
    home_stats: dict, away_stats: dict,
    home_form: float, away_form: float,
    home_xg: float, away_xg: float,
    home_injury: float, away_injury: float,
    missing_players: list[dict],
    third_party_pred: dict | None = None,
    is_neutral_venue: bool = False,
    market_odds: dict | None = None,
    home_web_form: dict | None = None,
    away_web_form: dict | None = None,
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

    # BTTS ve Over/Under istatistikleri
    h_btts = _calc_btts_stats(home_id, home_last5)
    a_btts = _calc_btts_stats(away_id, away_last5)
    poisson_o25 = _poisson_over25(home_xg, away_xg)
    p_ms1, p_x, p_ms2 = _poisson_1x2(home_xg, away_xg)

    def _pct(n: int, d: int) -> str:
        return f"{n}/{d} (%{round(n/d*100) if d else 0})"

    h_btts_n  = h_btts["played"] or 1
    a_btts_n  = a_btts["played"] or 1
    btts_block = (
        f"## Gol Eğilimi (son {h_btts_n} maç)\n"
        f"{home_team}: KG Var {_pct(h_btts['btts'], h_btts_n)} | 2.5 Üst {_pct(h_btts['over25'], h_btts_n)} | Gol Attı {_pct(h_btts['scored'], h_btts_n)} | Gol Yedi {_pct(h_btts['conceded'], h_btts_n)}\n"
        f"{away_team}: KG Var {_pct(a_btts['btts'], a_btts_n)} | 2.5 Üst {_pct(a_btts['over25'], a_btts_n)} | Gol Attı {_pct(a_btts['scored'], a_btts_n)} | Gol Yedi {_pct(a_btts['conceded'], a_btts_n)}\n"
        f"xG tabanlı 2.5 Üst ihtimali: %{poisson_o25}\n\n"
        f"## Poisson Modeli (Dixon-Coles, xG={home_xg:.2f}/{away_xg:.2f})\n"
        f"MS1 %{p_ms1} | X %{p_x} | MS2 %{p_ms2} | 2.5 Üst %{poisson_o25}"
    )

    # Piyasa konsensüsü bloğu — İddaa/Misli/Nesine ortalama oranlar
    market_block = ""
    if market_odds:
        probs = _implied_probs(
            market_odds.get("ms1", 0),
            market_odds.get("x",   0),
            market_odds.get("ms2", 0),
        )
        if probs:
            sources_str = ", ".join(market_odds.get("sources", ["bahis"]))
            market_block = (
                f"\n## Piyasa Konsensüsü ({sources_str} — zımni olasılık)\n"
                f"MS1 %{probs[0]} | X %{probs[1]} | MS2 %{probs[2]}\n"
                f"Oranlar: {home_team} {market_odds.get('ms1','?')} "
                f"| X {market_odds.get('x','?')} "
                f"| {away_team} {market_odds.get('ms2','?')}\n"
            )
            o25 = market_odds.get("over25")
            u25 = market_odds.get("under25")
            if o25 and u25:
                try:
                    p_o = round(1 / o25 / (1 / o25 + 1 / u25) * 100)
                    market_block += f"2.5 Üst %{p_o} | 2.5 Alt %{100 - p_o} (oran {o25} / {u25})\n"
                except Exception:
                    pass
            kv = market_odds.get("kg_var")
            if kv and kv > 1:
                p_kv = round(100 / kv)
                market_block += f"KG Var %{p_kv} (oran {kv})\n"

    # Üçüncü taraf tahmin bloğu — api-football motoru
    third_party_block = ""
    if third_party_pred:
        pct  = third_party_pred.get("percent", {})
        adv  = third_party_pred.get("advice", "")
        comp = third_party_pred.get("comparison", {})
        h2h_s = third_party_pred.get("h2h_summary", {})

        def _fmt_cmp(key: str) -> str:
            c = comp.get(key, {})
            return f"Ev %{c.get('home','?')} / Dep %{c.get('away','?')}"

        h2h_line = ""
        if h2h_s.get("played"):
            h2h_line = (f"\nH2H son {h2h_s['played']} maç — "
                        f"KG Var: {h2h_s['btts']}/{h2h_s['played']}, "
                        f"2.5 Üst: {h2h_s['over25']}/{h2h_s['played']}")

        third_party_block = (
            f"\n## Üçüncü Taraf Tahmin (api-football istatistik motoru)\n"
            f"MS1 %{pct.get('home','?')} | X %{pct.get('draw','?')} | MS2 %{pct.get('away','?')}\n"
            f"Tavsiye: {adv}\n"
            f"Form: {_fmt_cmp('form')} | Atak: {_fmt_cmp('att')} | Savunma: {_fmt_cmp('def')} | H2H: {_fmt_cmp('h2h')}"
            f"{h2h_line}"
        )

    # Web form bloğu (SofaScore'dan çekilmiş gerçek zamanlı veri)
    web_form_block = ""
    def _fmt_web(label: str, wf: dict) -> str:
        res_str = " ".join(wf.get("results", []))
        cs = wf.get("clean_sheets", 0)
        fts = wf.get("failed_to_score", 0)
        extras = []
        if cs > 0: extras.append(f"{cs} kuru kale")
        if fts > 0: extras.append(f"{fts} golsüz maç")
        extra_str = f" ({', '.join(extras)})" if extras else ""
        return (
            f"{label}: {wf['goals_for']} gol attı / {wf['goals_against']} gol yedi "
            f"({wf['avg_gf']}/maç — {wf['avg_ga']}/maç yenilen){extra_str}\n"
            f"  Sonuçlar: {res_str} | Stil: {wf.get('style','?')}"
        )

    if home_web_form or away_web_form:
        lines = ["\n## Web Form Analizi (SofaScore — Son 5 Maç)"]
        if home_web_form:
            lines.append(_fmt_web(home_team, home_web_form))
        if away_web_form:
            lines.append(_fmt_web(away_team, away_web_form))
        web_form_block = "\n".join(lines)

    neutral_note = "\nÖNEMLİ: Bu maç TARAFSIZ SAHADA oynanıyor. Ev sahibi avantajı yoktur; her iki takım eşit koşullarda. Tahmininde ev sahibi avantajını hesaba KATMA.\n" if is_neutral_venue else ""

    prompt = f"""Sen bir futbol analiz uzmanısın. Aşağıdaki gerçek istatistikleri kullanarak {home_team} - {away_team} maçı için Türkçe analiz yaz.

KURAL: Sadece verilen sayıları kullan. Hiçbir istatistiği uydurma.{neutral_note}

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

{btts_block}{market_block}{third_party_block}{web_form_block}

## Kadro Durumu
Form skoru: {home_team} %{round(home_form*100)} — {away_team} %{round(away_form*100)}
Sakatlık etkisi: {home_team} %{round(home_injury*100)} — {away_team} %{round(away_injury*100)}{eksik}

## Talimatlar
5-6 cümle Türkçe analiz yaz:
- {home_team}'in son form ve gol istatistiklerini gerçek rakamlarla belirt.
- {away_team}'in son form ve gol istatistiklerini gerçek rakamlarla belirt.
- KG Var / 2.5 Üst eğilimi güçlüyse bunu vurgula.
- Piyasa konsensüsü varsa: kendi Poisson modelinle karşılaştır; eğer piyasa ve model aynı yönü gösteriyorsa "piyasa da [tahmin]'i destekliyor" de, farklıysa nedenini açıkla.
- Üçüncü taraf (api-football) tahmini varsa bunu da değerlendir; 3 kaynak da aynı yönü gösteriyorsa güven skorunu yüksek tut.
- Sarı/kırmızı kart baskısı önemliyse belirt.
- Sakat veya cezalı oyuncu varsa bir cümleyle belirt (adlarını yaz).
- Rakamları olduğu gibi kullan; farklı sayı yazma.

Analizin sonuna TAM OLARAK şu formatı ekle:

---TAHMINLER---
ANA: [tahmin] %[güven]
ALT1: [tahmin] %[güven]
ALT2: [tahmin] %[güven]
ALT3: [tahmin] %[güven]
---SON---

Tahmin seçenekleri (farklı piyasalar — birbirinden bağımsız):
• 1x2 piyasası: MS1, X, MS2
• Çifte şans: 1X (ev sahibi kaybetmez), X2 (deplasman kaybetmez), 12 (beraberlik yok)
• Gol piyasası: 2.5 Üst, 2.5 Alt, KG Var, KG Yok

Her tahmin kendi marketi için 0-100 arasında bağımsız güven verir.
ANA her zaman en belirleyici tahmin. ALT'lar farklı piyasalardan olabilir.

Çoklu piyasa kuralları:
- MS1 güçlüyse (>%60) → ANA: MS1, ALT1: 1X (yüksek güven), ALT2: gol piyasası
- KG Var güçlüyse → ALT olarak ekle (MS1 ile aynı anda doğru olabilir)
- 2.5 Üst Poisson %62+ → ALT olarak ekle
- Deplasman zayıfsa → ALT: 1X (%80+ güven olabilir)"""

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
    third_party_pred: dict | None = None,
    league_ref: str | int = "",
    market_odds: dict | None = None,
    home_web_form: dict | None = None,
    away_web_form: dict | None = None,
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

    try:
        is_neutral = int(league_ref) in NEUTRAL_VENUE_LEAGUES
    except (ValueError, TypeError):
        is_neutral = str(league_ref).upper() in {"WC"}

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
            league_ref=league_ref,
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
            third_party_pred=third_party_pred,
            is_neutral_venue=is_neutral,
            market_odds=market_odds,
            home_web_form=home_web_form,
            away_web_form=away_web_form,
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
            league_ref=league_ref,
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
        "alternatives":          predictions[1:5],   # en fazla 4 alternatif
        "analysis":              analysis,
    }


def _normalize_pred(code: str) -> str:
    c = code.lower().strip()
    if c in ("1x",) or ("1x" in c and "çifte" not in c):   return "1X"
    if c in ("x2",):                                          return "X2"
    if c in ("12",):                                          return "12"
    if "ms1" in c or "ev sahi" in c:                         return "MS1"
    if "ms2" in c or "deplasm" in c:                         return "MS2"
    if c == "x" or "beraberlik" in c:                        return "X"
    if "üst" in c or "ust" in c:                             return "2.5 Üst"
    if "alt" in c:                                            return "2.5 Alt"
    if "kg var" in c or "btts" in c or "karşıl" in c:      return "KG Var"
    if "kg yok" in c or "clean" in c:                        return "KG Yok"
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
    league_ref: str | int = "",
) -> dict:
    # Tarafsız saha tespiti
    try:
        is_neutral = int(league_ref) in NEUTRAL_VENUE_LEAGUES
    except (ValueError, TypeError):
        is_neutral = str(league_ref).upper() in {"WC"}

    home_bonus = 0.0 if is_neutral else 0.05

    form_diff = (home_form - away_form) * 0.35
    xg_diff   = (home_xg   - away_xg)   * 0.40
    net       = form_diff + xg_diff + home_bonus
    abs_net   = abs(net)

    home_adj    = home_xg * (1 - home_injury)
    away_adj    = away_xg * (1 - away_injury)
    total_xg    = home_adj + away_adj
    poisson_o25 = _poisson_over25(home_xg, away_xg)
    p_ms1, p_x, p_ms2 = _poisson_1x2(home_xg, away_xg)

    # ── Gol piyasası sinyalleri ──────────────────────────────────────────────
    # KG Var: her iki takım da maç başı ortalama ≥1.2 gol atıyorsa
    btts_signal   = home_adj >= 1.20 and away_adj >= 1.20
    # 2.5 Üst: Poisson ≥62% ve toplam xG yüksek
    over25_signal  = poisson_o25 >= 62 and total_xg >= 2.5
    # 2.5 Alt: Poisson ≤33% ve toplam xG düşük
    under25_signal = poisson_o25 <= 33 and total_xg < 1.8

    # Beraberlik bölgesi: net fark küçük VEYA X olasılığı yüksek
    draw_zone = abs_net < DRAW_THRESHOLD or p_x >= 28

    # ── Ana tahmin seçimi ────────────────────────────────────────────────────
    if draw_zone:
        if btts_signal and over25_signal:
            main = "KG Var"
            alts = [
                {"prediction": "2.5 Üst", "confidence": min(poisson_o25 - 5, 32)},
                {"prediction": "X",       "confidence": max(p_x, 18)},
            ]
        elif over25_signal:
            main = "2.5 Üst"
            alts = [
                {"prediction": "X",   "confidence": max(p_x, 20)},
                {"prediction": "MS1", "confidence": max(p_ms1 - 5, 12)},
            ]
        elif under25_signal:
            main = "2.5 Alt"
            alts = [
                {"prediction": "X",   "confidence": max(p_x, 22)},
                {"prediction": "MS1", "confidence": max(p_ms1 - 5, 10)},
            ]
        else:
            main = "X"
            alts = [
                {"prediction": "MS1",     "confidence": max(p_ms1 - 5, 18)},
                {"prediction": "2.5 Üst", "confidence": min(poisson_o25, 20)},
            ]

    elif net > 0:
        # MS1 bölgesi
        strength = min(abs_net * 100, 30)
        if abs_net < 0.22 and btts_signal:
            # Hafif favori + her iki takım gol atıyor → KG Var alternatif
            main = "MS1"
            alts = [
                {"prediction": "KG Var", "confidence": min(int(home_adj * away_adj * 20), 28)},
                {"prediction": "X",      "confidence": max(int(30 - strength), 12)},
            ]
        elif abs_net < 0.22 and over25_signal:
            # Hafif favori + yüksek gol beklentisi → 2.5 Üst alternatif
            main = "MS1"
            alts = [
                {"prediction": "2.5 Üst", "confidence": min(poisson_o25 - 8, 28)},
                {"prediction": "X",       "confidence": max(int(30 - strength), 12)},
            ]
        else:
            main = "MS1"
            alts = [
                {"prediction": "X",   "confidence": max(int(30 - strength), 12)},
                {"prediction": "MS2", "confidence": max(int(15 - strength), 5)},
            ]

    else:
        # MS2 bölgesi — yeterli sinyal yoksa gol tahminine düş
        if abs_net < MS2_MIN_NET:
            if btts_signal:
                main = "KG Var"
                alts = [
                    {"prediction": "X",   "confidence": max(p_x, 22)},
                    {"prediction": "MS2", "confidence": max(p_ms2 - 5, 12)},
                ]
            elif over25_signal:
                main = "2.5 Üst"
                alts = [
                    {"prediction": "X",   "confidence": max(p_x, 22)},
                    {"prediction": "MS2", "confidence": max(p_ms2 - 5, 12)},
                ]
            else:
                main = "X"
                alts = [
                    {"prediction": "MS2",     "confidence": max(p_ms2 - 5, 15)},
                    {"prediction": "2.5 Üst", "confidence": min(poisson_o25, 18)},
                ]
        else:
            # MS2 güçlü
            strength = min(abs_net * 100, 25)
            if abs_net < 0.22 and btts_signal:
                main = "MS2"
                alts = [
                    {"prediction": "KG Var", "confidence": min(int(home_adj * away_adj * 20), 28)},
                    {"prediction": "X",      "confidence": max(int(28 - strength), 12)},
                ]
            else:
                main = "MS2"
                alts = [
                    {"prediction": "X",   "confidence": max(int(28 - strength), 12)},
                    {"prediction": "MS1", "confidence": max(int(12 - strength), 5)},
                ]

    # ── Çifte şans (double chance) ───────────────────────────────────────────
    p_1x = p_ms1 + p_x   # ev sahibi kaybetmez
    p_x2 = p_x + p_ms2   # deplasman kaybetmez
    p_12 = p_ms1 + p_ms2 # birileri kazanır

    # Ana tahmin 1x2 ise çifte şansı alt olarak ekle (daha yüksek güvende)
    existing_preds = {main} | {a["prediction"] for a in alts}
    if main in ("MS1", "X") and p_1x >= 70 and "1X" not in existing_preds:
        alts.append({"prediction": "1X", "confidence": p_1x})
    if main in ("MS2", "X") and p_x2 >= 70 and "X2" not in existing_preds:
        alts.append({"prediction": "X2", "confidence": p_x2})

    # ── Gol piyasası — ana tahmin değilse ekle ───────────────────────────────
    existing_preds = {main} | {a["prediction"] for a in alts}
    if over25_signal and "2.5 Üst" not in existing_preds:
        alts.append({"prediction": "2.5 Üst", "confidence": min(poisson_o25, 72)})
    if under25_signal and "2.5 Alt" not in existing_preds:
        alts.append({"prediction": "2.5 Alt", "confidence": min(100 - poisson_o25, 68)})
    if btts_signal and "KG Var" not in existing_preds:
        btts_conf = min(int(home_adj * away_adj * 18), 68)
        if btts_conf >= 55:
            alts.append({"prediction": "KG Var", "confidence": btts_conf})

    # Sadece ≥55% güvenli alternatifleri tut, güvene göre sırala
    alts = sorted(
        [a for a in alts if a["confidence"] >= 55],
        key=lambda a: a["confidence"],
        reverse=True,
    )

    # Ana tahminin güven skoru: birincil 1x2 tahmininin iç değeri
    c1 = max(100 - sum(a["confidence"] for a in alts[:2] if a["prediction"] in ("MS1","MS2","X","1X","X2","12")), 40)

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
        "alternatives":          alts[:4],   # en fazla 4 alternatif
        "analysis":              analysis,
    }
