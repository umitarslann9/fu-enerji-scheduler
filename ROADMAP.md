Fu Enerji Case Study — Ders Programı Çizelgeleme Uygulaması
> **Süre:** ~3 gün | **Stack:** Next.js 16 + FastAPI + MRV Backtracking | **Deploy:** Vercel + Railway

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
| Blok dağıtım | Split: 1=[1], 2=[2], 3=[3], 4=[2,2], 5=[3,2], 6=[3,3] | Ardışık periyot garantisi; aynı günde tekrar yok |
| Frontend veri çekme | `useClient` + useEffect | External API → Server Components değer üretmiyor |
| Availability | Dialog (modal) | Sayfa temiz kalır; 5×8 grid inline overkill |
| Teacher branş | Zorunlu alan | Ders adı otomatik türetmek için gerekli |
| Classroom modeli | grade + section + student_count | İnsan okunabilir ad (9-A) türetilir |
| Cascade güncelleme | Service layer, tek transaction | 6 farklı tetikleyici, hepsi atomik |
| DB migration | Idempotent (PRAGMA table_info + ALTER TABLE) | Hem taze kurulum hem mevcut DB'yi destekler |
| CORS | ALLOWED_ORIGINS env var | Farklı ortamlar için hardcode değil |
| Multi-select dropdown | useRef + pointerdown (custom) | Yeni paket gerektirmez |
| Branş-öğretmen senkronu | Bidirectional (ad↔öğretmen) | Yanlış öğretmen atamasını önler |
| Program sınıf seçimi | Select dropdown (Tabs yerine) | Çok sınıfta Tabs taşar; dropdown ölçeklenir |
| PDF indirme | window.open + window.print() | Yeni paket gerektirmez |
| Timetable renk algoritması | Golden-angle (i × 137.5° mod 360°) | Sonsuz benzersiz hue garantisi; 26 derste bile çakışma yok |
| Dark mode | next-themes (attribute="class") | SSR hydration uyumlu; sistem teması destekli |
| Font | Inter 400/500/600 | Minimal SaaS estetiği; Geist'tan daha nötr |
| Design token'lar | zinc nötr + blue-600 accent | Linear/Notion estetiği; gradient/glow yok |

---

## Tamamlanan Adımlar

### ✅ Adım 1 — Proje İskeleti
- Monorepo: `frontend/` + `backend/`
- Next.js 16 (App Router, TypeScript, Tailwind 4, shadcn/ui)
- FastAPI + uv, klasör yapısı
- `.gitignore`, README taslağı

### ✅ Adım 2 — Veri Modeli
- `Teacher` (name + branch), `Classroom` (grade + section + student_count + name), `Subject`, `ClassroomSubjectLink`
- `Lesson`, `Schedule` (Pydantic only), `ScheduleResult` (DB kalıcı)
- Availability: 5×8 boolean matrix → JSON string

### ✅ Adım 3 — CRUD Endpoints + Scheduler
- Service layer mimarisi (router → service → DB)
- Scheduler: Split → Expand → MRV sort → Backtrack → Spread
- Hard constraints: öğretmen/sınıf çakışması · availability · blok ardışıklığı · günlük tekrar yok

### ✅ Adım 4 — Cascade Güncelleme
- 6 tetikleyici; hepsi tek transaction içinde (session.flush + commit)
- Branch değişimi → Subject.name + lessons_json
- Sınıf adı değişimi → lessons_json
- Öğretmen/ders/sınıf değişimi → lessons_json

### ✅ Adım 5 — Frontend Sayfaları
- 6 sayfa: Dashboard · Öğretmenler · Sınıflar · Dersler · Programlar · Öğretmen Programları
- Typed API client (`lib/api.ts`)
- AvailabilityGrid 5×8 interaktif matris
- ClassroomPicker custom multi-select dropdown
- Branş-öğretmen bidirectional senkron
- PDF: window.open + window.print()

### ✅ Adım 6 — UX İyileştirmeleri
- Tüm sayfalarda tutarlı pattern: sağ üst ekle butonu, collapsible form, anlık arama
- Boş saat sayacı (X/Y formatı), hover tooltip, silme onayı
- Program sayfası: Tabs → Select dropdown; tam gün adları

### ✅ Adım 7 — Seed Data & Performans
- Dashboard "Demo Veri Yükle": 16 sınıf (9-12, A-D), 26 öğretmen, ~%82 doluluk
- SQLite WAL mode + NORMAL sync + 32 MB page cache
- N+1 sorgu düzeltmesi (subjects + solver selectinload)
- Solver 3M iterasyon limiti

### ✅ Adım 8 — Görsel Tasarım (Design System)
- Inter font (400/500/600) ile Geist değiştirildi
- Design token'lar: zinc-50/100/200/900/950 nötr; blue-600 primary
- Dark mode: next-themes ThemeProvider + navbar Sun/Moon toggle
- Timetable: golden-angle renk algoritması — 8 sabit renk → sonsuz benzersiz ton
- Öğretmen programı: alfabetik öğretmen listesi
- Availability grid: hardcoded dark renkler → emerald/red/border semantic
- Hardcoded hex renkler (#16a34a, #dc2626 vb.) kaldırıldı, Tailwind token'larına geçildi
- Radix Dialog accessibility warning'leri (aria-describedby) düzeltildi

---

## Kalan Adımlar

### ⬜ Adım 9 — Deploy
- [ ] Frontend → Vercel (`NEXT_PUBLIC_API_URL` env var)
- [ ] Backend → Railway (`scheduler.db` persist volume kararı)
- [ ] CORS: `ALLOWED_ORIGINS` Railway/Vercel URL'leri ile güncelle
- [ ] Canlı uçtan uca test

### ⬜ Adım 10 — İyileştirmeler (İsteğe Bağlı)
- [ ] İnfeasible schedule — hangi (ders, sınıf) bloğu atanamadı detayı
- [ ] Timetable çakışma görsel uyarısı (red ring — solver garantiliyor ama UI göstergesi)

---

## Başarı Kriterleri

- [x] Seed data ile sorunsuz çalışıyor (16 sınıf, 26 öğretmen, 26 ders)
- [x] Infeasible durumda anlamlı hata mesajı
- [x] UI temiz, prezentabl, dark mode destekli
- [x] Timetable renkleri benzersiz ve ayırt edilebilir
- [ ] README self-explanatory (canlı link dahil)
- [ ] Canlı link çalışıyor

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
