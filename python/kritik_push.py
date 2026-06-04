"""
Kritik — Python Algoritma Push Scripti
Kullanım: python kritik_push.py
"""

import requests
from datetime import datetime, timezone, timedelta

BASE_URL = "https://kritik-wine.vercel.app"
SECRET   = "kritik-algorithm-secret-2026"

HEADERS = {
    "Authorization": f"Bearer {SECRET}",
    "Content-Type": "application/json",
}


def push_matches(matches: list[dict]) -> dict:
    """
    Maç verilerini Kritik API'sine gönderir.
    Varsa günceller (upsert), yoksa ekler.
    """
    r = requests.post(f"{BASE_URL}/api/matches", json=matches, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def push_coupons(coupons: list[dict]) -> dict:
    """
    Algoritmanın ürettiği kuponları Kritik API'sine gönderir.
    """
    r = requests.post(f"{BASE_URL}/api/coupons", json=coupons, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


# ── Örnek kullanım ─────────────────────────────────────────────────────────────

if __name__ == "__main__":

    # 1. Maçları gönder
    ornek_maclar = [
        {
            "home_team": "Galatasaray",
            "away_team": "Fenerbahçe",
            "match_time": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "home_xg": 1.85,
            "away_xg": 1.20,
            "home_form_score": 0.78,
            "away_form_score": 0.65,
            "critical_missing_effect": 0.12,
            "confidence_score": 0.74,
            "prediction": "MS1",
            "missing_players": [
                {"name": "Icardi", "reason": "Sakatlık", "missed_matches_count": 2}
            ],
        },
        {
            "home_team": "Beşiktaş",
            "away_team": "Trabzonspor",
            "match_time": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            "home_xg": 1.40,
            "away_xg": 1.10,
            "home_form_score": 0.60,
            "away_form_score": 0.55,
            "critical_missing_effect": 0.05,
            "confidence_score": 0.61,
            "prediction": "2.5 Üst",
            "missing_players": [],
        },
    ]

    print("Maçlar gönderiliyor...")
    mac_sonuc = push_matches(ornek_maclar)
    print(f"  → {mac_sonuc.get('inserted', 0)} maç eklendi/güncellendi")

    # Eklenen maç ID'lerini al (kuponlar için)
    mac_idleri = [m["id"] for m in mac_sonuc.get("data", []) if "id" in m]

    # 2. Kuponları gönder
    if mac_idleri:
        ornek_kuponlar = [
            {
                "coupon_type": "Banko",
                "matches": [mac_idleri[0]],
                "total_rate": 1.85,
                "is_premium": False,
            },
        ]

        if len(mac_idleri) >= 2:
            ornek_kuponlar.append({
                "coupon_type": "Premium Sürpriz",
                "matches": mac_idleri,
                "total_rate": round(1.85 * 1.75, 2),
                "is_premium": True,
            })

        print("Kuponlar gönderiliyor...")
        kupon_sonuc = push_coupons(ornek_kuponlar)
        print(f"  → {kupon_sonuc.get('inserted', 0)} kupon eklendi")

    print("\nTamamlandı.")
