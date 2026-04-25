Fu Enerji Case Study — Ders Programı Çizelgeleme Uygulaması
> **Süre:** 2 gün | **Stack:** Next.js 16 + FastAPI + Greedy/Backtracking | **Deploy:** Vercel + Railway

---

## Alınan Kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Persistence | SQLite | Refresh'te veri kaybolmamalı; auth yok → tek tablo yeterli |
| Backend deploy | Railway | Vercel Python Functions çok kısıtlı; Railway stabil |
| Service layer | Var | Router HTTP katmanı, iş mantığı service'te; test edilebilirlik |
| Teacher DELETE | 409 if subjects | Sessiz veri kaybını önler |
| Classroom DELETE | Links temizlenir | FK kısıtı olmasa da referential integrity |
| PUT /teachers | Partial (PATCH semantics) | `exclude_unset=True`; HTTP verb dokümante edildi |
| Scheduler | MRV + backtracking | Her kararı savunabiliyorum; OR-Tools kara kutu |
| Slot sıralama | teacher_day_load spread | Soft constraint'i hard olmadan dolaylı tatmin |
| Blok dağıtım | Split: ≤3=[h], 4=[2,2], 5=[3,2], 6=[3,3] | Ardışık periyot garantisi; aynı günde tekrar yok |
| Frontend veri çekme | `useClient` + useEffect | External API → Server Components değer üretmiyor |
| Availability | Dialog (modal) | Sayfa temiz kalır; 5×8 grid inline overkill |
| Teacher branş | Zorunlu alan (TeacherCreate validator) | Ders adı otomatik türetmek için gerekli; mevcut kayıtlar boş geçebilir (ResponseValidationError önlemi) |
| Classroom modeli | grade + section + student_count | İnsan okunabilir ad (9-A) türetilir; istatistik için student_count saklanır |
| Cascade güncelleme | Service layer, tek transaction | Branch değişince Subject.name + lessons_json güncellenir; sınıf adı değişince lessons_json güncellenir |
| DB migration | Idempotent (PRAGMA table_info + ALTER TABLE) | Hem taze kurulum hem mevcut DB'yi destekler |
| CORS | ALLOWED_ORIGINS env var | Farklı ortamlar için hardcode değil |
| Subject PUT cascade | 6 tetikleyici, tek flush+commit | Ad/öğretmen/sınıf/saat değişikliği → lessons_json tek atomik güncelleme |
| Multi-select dropdown | useRef + pointerdown (custom) | Yeni paket gerektirmez; shadcn Select görünümüne uyumlu |
| Branş-öğretmen senkronu | Bidirectional (ad↔öğretmen) | Ders adı branşı yönlendirir; yanlış öğretmen atamasını önler |
| Program sınıf seçimi | Select dropdown (Tabs yerine) | Çok sınıfta Tabs taşar; dropdown ölçeklenir |
| Sınıf sütunu | Tooltip (info ikonu hover) | Tablo satırını şişirmez; gerektiğinde detay görünür |

---

## Tamamlanan Adımlar

### ✅ Adım 1 — Proje İskeleti
- Monorepo: `frontend/` + `backend/`
- Next.js 16 (App Router, TypeScript, Tailwind 4, shadcn/ui New York Slate)
- FastAPI + uv, klasör yapısı
- `.gitignore`, README taslağı

### ✅ Adım 2 — Veri Modeli
- `Teacher` (name + branch), `Classroom` (grade + section + student_count + name), `Subject`, `ClassroomSubjectLink`
- `Lesson`, `Schedule` (Pydantic only, scheduler çıktısı)
- `ScheduleResult` (DB'de kalıcı saklama)
- Availability: 5×8 boolean matrix → JSON string
- Test: `backend/tests/test_models_sanity.py` ✓

### ✅ Adım 3 — CRUD Endpoints + Scheduler
**Service layer mimarisi:**
```
backend/app/
├── services/
│   ├── teacher_service.py    get_all, get_one, create, update (branch cascade), delete (409 if subjects)
│   ├── classroom_service.py  get_all, get_one, create, update (name cascade), delete (links temizlenir)
│   ├── subject_service.py    get_all, get_one, create, update (6 cascade), delete (links temizlenir)
│   └── schedule_service.py   run_generate, get_latest
└── routers/
    ├── teachers.py   GET/POST/GET{id}/PUT{id}/DELETE{id}
    ├── classrooms.py GET/POST/GET{id}/PUT{id}/DELETE{id}
    ├── subjects.py   GET/POST/GET{id}/PUT{id}/DELETE{id}
    └── schedule.py   POST /generate, GET /
```

**Scheduler (CSP — `scheduler/solver.py`):**
```
1. Split    — weekly_hours → blok listesi: ≤3h=[h], 4h=[2,2], 5h=[3,2], 6h=[3,3]
2. Expand   — (subject, classroom) × blok sayısı → BlockNeed listesi
3. MRV sort — öğretmen availability sayısına göre artan (erken fail)
4. Backtrack — valid slot yoksa önceki atamaya geri dön
5. Spread   — teacher_day_load ile sort → bloklar haftaya doğal yayılır
```
- Hard constraints: öğretmen/sınıf çakışması · availability · blok içi ardışık periyotlar · aynı (ders,sınıf) aynı günde tekrar yok
- `ScheduleResult` tablosuna JSON olarak yazılır; `GET /schedule` DB'den okur

### ✅ Adım 4 — Cascade Güncelleme
- Öğretmen branşı değişince → ilgili `Subject.name` kayıtları + son `ScheduleResult.lessons_json` güncellenir
- Sınıf grade/section değişince → `Classroom.name` yeniden türetilir + son `ScheduleResult.lessons_json` güncellenir
- Ders adı değişince → `lessons_json` içindeki `subject_name` güncellenir
- Dersin öğretmeni değişince → `teacher_id` + `teacher_name` güncellenir
- Dersten sınıf çıkarılınca → o sınıfa ait ders satırları `lessons_json`'dan silinir
- Haftalık saat değişince → `is_feasible = False`, yeniden oluşturma uyarısı
- Tüm cascade'ler tek transaction içinde (session.flush + commit)

### ✅ Adım 5 — Frontend Sayfaları
**Stack:** Next.js 16 + React 19 + Tailwind 4 + shadcn/ui  
**Pattern:** `'use client'` + useState/useEffect (external API → SSR değersiz)

```
frontend/
├── lib/api.ts              Typed fetch client; 404 → null (schedule/latest)
├── lib/types.ts            Backend şemalarına 1:1 TS tipleri
├── components/
│   ├── nav.tsx             Sticky top bar; active highlight
│   └── availability-grid.tsx  5×8 interaktif checkbox matrisi
│                               (yeşil=müsait, kırmızı=programda dolu, siyah=müsait değil)
└── app/
    ├── page.tsx            Dashboard: 4 stat kart (öğretmen/sınıf/ders/toplam öğrenci) + son program
    ├── teachers/page.tsx   Liste + arama/filtre (isim/branş) + ekle + düzenle + müsaitlik; boş saat sayacı
    ├── classrooms/page.tsx Liste + ekle + düzenle (grade+section+student_count) + sil (onaylı)
    ├── subjects/page.tsx   Liste + ekle + düzenle (full cascade); branş-öğretmen sync; ClassroomPicker
    └── schedule/page.tsx   Oluştur + Select dropdown sınıf seçimi + renkli haftalık grid
```

### ✅ Adım 6 — UX İyileştirmeleri
- Öğretmen sayfası: boş saat sayacı (X/Y formatı), isim + branş arama filtresi
- Sınıf sayfası: düzenleme dialogu, silme onayı (window.confirm)
- Dersler sayfası: sınıf sütununda hover tooltip (info ikonu)
- Dersler sayfası: ders düzenleme — branş-öğretmen bidirectional senkron
- Dersler sayfası: ClassroomPicker custom dropdown (shadcn Select görünümü)
- Program sayfası: Tabs → Select dropdown (çok sınıfta taşma önlemi)

---

## Kalan Adımlar

### ⬜ Adım 7 — Seed Data
- [ ] Seed data butonu ("Örnek veriyle dene") — Dashboard'a eklenecek
- [ ] En az 3 sınıf, 5 öğretmen, 10 ders içeren örnek set

### ⬜ Adım 8 — Hata Detayı
- [ ] İnfeasible schedule daha ayrıntılı debug mesajı (hangi ders atanamadı)

### ⬜ Adım 9 — Dokümantasyon
- [ ] `APPROACH.md`: problemi nasıl tanımladım, varsayımlar, kapsam dışı, alternatifler
- [ ] README polish (canlı linkler eklenecek)

### ⬜ Adım 10 — Deploy
- [ ] Frontend → Vercel (`NEXT_PUBLIC_API_URL` env var)
- [ ] Backend → Railway (`scheduler.db` persist volume veya in-memory karar)
- [ ] CORS: `ALLOWED_ORIGINS` Railway/Vercel URL'leri ile güncelle
- [ ] Canlı uçtan uca test

---

## Başarı Kriterleri

- [ ] Seed data ile sorunsuz çalışıyor (3 sınıf, 5 öğretmen, 10 ders)
- [x] Infeasible durumda anlamlı hata mesajı
- [x] UI'da çakışma görsel olarak yok (solver garantiler)
- [ ] README self-explanatory (canlı link dahil)
- [ ] Canlı link çalışıyor
- [ ] Problem yaklaşımı dokümante edilmiş

---

## Kapsam Dışı (Mülakatta Savunulacak)

- Authentication / çoklu kullanıcı
- Oda/laboratuvar tahsisi
- Öğretmen tercihleri (soft constraint)
- Yedek öğretmen ataması
- Takvim export (.ics)

---

## AI Kullanımı Notu

Mimari kararlar, algoritma tasarımı, trade-off değerlendirmeleri → benim.  
Claude: boilerplate üretimi, syntax, hata ayıklama, best practice kontrolü.
