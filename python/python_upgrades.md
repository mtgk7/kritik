# Kritik - Python Analiz Botu Güncel Spesifikasyon ve DB Yapılandırması

Bu belge, Python veri robotunun eski sürüme göre geçirdiği mimari değişiklikleri, Pydantic modellerini ve Supabase Service Role entegrasyon kurallarını tanımlar. Claude Code, yazacağı veya güncelleyeceği tüm Python kodlarında bu güncel spesifikasyonu baz almalıdır.

---

## 1. Mimari Farklar ve Değişim Matrisi

| Bileşen | Önceki Yapı | Yeni Güncel Yapı (Spesifikasyon Sonrası) |
| :--- | :--- | :--- |
| **Bağımlılıklar** | `requests`, `dotenv`, `schedule` | `requests`, `python-dotenv`, `supabase==2.4.0`, `pydantic==2.6.4` |
| **Veritabanı Bağlantısı** | Next.js `/api/matches` (REST API) | `supabase-py` ile doğrudan DB bağlantısı (`service_role` yetkisiyle) |
| **Veri Doğrulama / Tip** | Ham Python `dict` yapısı | Katı Tip Güvenliği: `MatchRecord`, `CouponRecord`, `MissingPlayer` (Pydantic Modelleri) |
| **Kupon Yönetimi** | Eski kuponlar aynen kalıyordu | Temizlik Mekanizması: Her çalıştırmada günün eski kuponları otomatik silinir |

---

## 2. Katı Veri Modelleri (Pydantic / Tip Güvenliği)

### MissingPlayer Modeli
```python
from pydantic import BaseModel

class MissingPlayer(BaseModel):
    name: str
    reason: str
    missed_matches_count: int
```
