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
| Slot sıralama | Day-spread (round-robin) | Soft constraint'i hard olmadan dolaylı tatmin |
| Frontend veri çekme | `useClient` + useEffect | External API → Server Components değer üretmiyor |
| Availability | Dialog (modal) | Sayfa temiz kalır; 5×8 grid inline overkill |

---

## Tamamlanan Adımlar

### ✅ Adım 1 — Proje İskeleti
- Monorepo: `frontend/` + `backend/`
- Next.js 16 (App Router, TypeScript, Tailwind 4, shadcn/ui New York Slate)
- FastAPI + uv, klasör yapısı
- `.gitignore`, README taslağı

### ✅ Adım 2 — Veri Modeli
- `Teacher`, `Classroom`, `Subject`, `ClassroomSubjectLink` (SQLModel + table=True)
- `Lesson`, `Schedule` (Pydantic only, scheduler çıktısı)
- `ScheduleResult` (DB'de kalıcı saklamak için)
- Availability: 5×8 boolean matrix → JSON string
- Test: `backend/tests/test_models_sanity.py` ✓

### ✅ Adım 3 — CRUD Endpoints + Scheduler
**Service layer mimarisi:**
```
backend/app/
├── services/
│   ├── teacher_service.py    get_all, get_one, create, update, delete (409 if subjects)
│   ├── classroom_service.py  get_all, get_one, create, delete (links temizlenir)
│   ├── subject_service.py    get_all, get_one, create, delete (links temizlenir)
│   └── schedule_service.py   run_generate, get_latest
└── routers/
    ├── teachers.py   GET/POST/GET{id}/PUT{id}/DELETE{id}
    ├── classrooms.py GET/POST/GET{id}/DELETE{id}
    ├── subjects.py   GET/POST/GET{id}/DELETE{id}
    └── schedule.py   POST /generate, GET /
```

**Scheduler (CSP — `scheduler/solver.py`):**
```
1. Expand   — (subject, classroom) × weekly_hours → SlotNeed listesi
2. MRV sort — öğretmen availability sayısına göre artan (erken fail)
3. Backtrack — valid slot yoksa önceki atamaya geri dön
4. Spread   — daily_count ile sort → dersler haftaya doğal yayılır
```
- Hard constraints: öğretmen/sınıf çakışması · availability · günde max 3 saat aynı ders
- `ScheduleResult` tablosuna JSON olarak yazılır; `GET /schedule` DB'den okur

### ✅ Adım 5 — Frontend Sayfaları
**Stack:** Next.js 16 + React 19 + Tailwind 4 + shadcn/ui  
**Pattern:** `'use client'` + useState/useEffect (external API → SSR değersiz)

```
frontend/
├── lib/api.ts              Typed fetch client; 404 → null (schedule/latest)
├── lib/types.ts            Backend şemalarına 1:1 TS tipleri
├── components/
│   ├── nav.tsx             Sticky top bar; active highlight; sağda CTA
│   └── availability-grid.tsx  5×8 interaktif checkbox matrisi
└── app/
    ├── page.tsx            Dashboard: 3 stat kart + son program durumu
    ├── teachers/page.tsx   Liste + ekle + slot rozeti + müsaitlik dialog
    ├── classrooms/page.tsx Liste + ekle + sil
    ├── subjects/page.tsx   Liste + ekle (select + checkbox sınıf seçimi)
    └── schedule/page.tsx   Oluştur + classroom tabs + renkli haftalık grid
```

---

## Kalan Adımlar

### ⬜ Adım 6 — UX İyileştirmeleri (kısmen yapıldı)
- [x] Loading state'leri (Loader2 spinner)
- [x] Error handling + toast (sonner)
- [x] Renk kodlaması (ders bazlı, inline HSL palette)
- [ ] Seed data butonu ("Örnek veriyle dene") — Dashboard'a eklenecek
- [ ] İnfeasible schedule daha ayrıntılı debug mesajı (hangi ders atanamadı)

### ⬜ Adım 7 — Dokümantasyon
- [ ] `APPROACH.md`: problemi nasıl tanımladım, varsayımlar, kapsam dışı, alternatifler
- [ ] README polish (canlı linkler eklenecek)

### ⬜ Adım 8 — Deploy
- [ ] Frontend → Vercel (`NEXT_PUBLIC_API_URL` env var)
- [ ] Backend → Railway (`scheduler.db` persist volume veya in-memory karar)
- [ ] CORS: `allow_origins` Railway/Vercel URL'leri ile güncelle
- [ ] Canlı uçtan uca test

---

## Başarı Kriterleri

- [ ] En az 3 sınıf, 5 öğretmen, 10 ders içeren seed data ile çalışıyor
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
- Blok dersler (2 saatlik ardışık slot)

---

## AI Kullanımı Notu

Mimari kararlar, algoritma tasarımı, trade-off değerlendirmeleri → benim.  
Claude: boilerplate üretimi, syntax, hata ayıklama, best practice kontrolü.
