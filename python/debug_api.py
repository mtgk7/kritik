from dotenv import load_dotenv
load_dotenv()

import os, requests, time
from datetime import datetime, timedelta, timezone

KEY   = os.environ["FOOTBALL_DATA_KEY"]
today = datetime.now(timezone.utc).date()
end   = today + timedelta(days=14)

for code in ["CLI", "BSA", "PL", "CL", "WC"]:
    r = requests.get(
        f"https://api.football-data.org/v4/competitions/{code}/matches",
        headers={"X-Auth-Token": KEY},
        params={"dateFrom": today.isoformat(), "dateTo": end.isoformat()},
    )
    print(f"\n{code} -> HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        count = data.get("resultSet", {}).get("count", 0)
        print(f"  Toplam mac: {count}")
        matches = data.get("matches", [])
        for m in matches[:3]:
            print(f"  {m['homeTeam']['name']} vs {m['awayTeam']['name']} ({m['utcDate'][:10]})")
    else:
        print(f"  Hata: {r.text[:300]}")
    time.sleep(6)
