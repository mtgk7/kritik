import os
from dotenv import load_dotenv

load_dotenv()

# Provider seçimi
# "football_data" → ücretsiz, Avrupa ligleri
# "api_football"  → ücretli, Süper Lig dahil tüm ligler
PROVIDER = os.getenv("PROVIDER", "football_data")

# football-data.org (ücretsiz plan)
FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "")

# football-data.org lig kodları (ücretsiz planda mevcut)
# Süper Lig eklemek için PROVIDER=api_football yap
FOOTBALL_DATA_LEAGUES = os.getenv(
    "FOOTBALL_DATA_LEAGUES", "PL,PD,BL1,SA,FL1"
).split(",")

# API-Football (ücretli plan — Süper Lig için)
API_KEY    = os.getenv("API_FOOTBALL_KEY", "")
API_HOST   = os.getenv("API_FOOTBALL_HOST", "v3.football.api-sports.io")
API_BASE   = f"https://{API_HOST}"

# Supabase — direkt bağlantı (service role key, RLS bypass)
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Kritik backend (opsiyonel — direkt Supabase yerine API üzerinden yazmak için)
KRITIK_URL    = os.getenv("KRITIK_API_URL", "https://kritik-wine.vercel.app")
KRITIK_SECRET = os.getenv("KRITIK_API_SECRET", "")

# Ligler
LEAGUE_IDS = [
    int(x) for x in os.getenv("LEAGUE_IDS", "203").split(",")
]
FIXTURE_DAYS_AHEAD = int(os.getenv("FIXTURE_DAYS_AHEAD", "3"))

# Algoritma ağırlıkları
W_FORM    = 0.35   # form skoru farkı
W_XG      = 0.40   # xG farkı
W_HOME    = 0.10   # ev sahibi avantajı
W_INJURY  = 0.15   # sakatlık etkisi (negatif)

# Pozisyon bazlı oyuncu etki yüzdesi (takım gücüne katkı)
POSITION_IMPACT: dict[str, float] = {
    "G":  0.12,   # Kaleci
    "D":  0.07,   # Defans
    "M":  0.08,   # Orta saha
    "F":  0.10,   # Forvet
}
# Bilinmeyen pozisyon için varsayılan
DEFAULT_POSITION_IMPACT = 0.07

# Kaçırılan maç sayısına göre etki katsayısı (daha çok kaçırırsa daha kritik)
def missed_multiplier(missed: int) -> float:
    if missed >= 5:
        return 1.0
    return 0.5 + (missed / 5) * 0.5
