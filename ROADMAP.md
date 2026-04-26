Fu Enerji Case Study — Ders Programı Çizelgeleme Uygulaması
> **Süre:** ~3 gün | **Stack:** Next.js 16 + FastAPI + MRV Backtracking | **Deploy:** Vercel + Railway

---

## Canlı Linkler

- **Uygulama:** https://fu-enerji-scheduler.vercel.app
- **API / Swagger:** https://fu-enerji-scheduler-production.up.railway.app/docs
- **Repo:** https://github.com/nadezhda648/fu-enerji-scheduler

---

## Alınan Kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Persistence | SQLite | Refresh'te veri kaybolmamalı; auth yok → tek kullanıcı, tek dosya yeterli |
| Backend deploy | Railway | Vercel Python Functions çok kısıtlı; Railway persistent volume destekli |
| Service layer | Var | Router sadece HTTP katmanı; iş mantığı service'te — test edilebilir, değiştirilebilir |
| Teacher DELETE | 409 if subjects | Sessiz veri kaybını önler; kullanıcıya net hata mesajı |
| Classroom DELETE | Links temizlenir | FK kısıtı olmasa da referential integrity elle korunur |
| PUT /teachers | Partial (PATCH semantics) | `exclude_unset=True`; HTTP verb dokümante edildi |
| Scheduler | MRV + backtracking | Her kararı savunabiliyorum; OR-Tools/PuLP kara kutu |
| Slot sıralama | teacher_day_load spread | Soft constraint'i (dengeli dağılım) hard olmadan dolaylı tatmin eder |
| Blok dağıtım | 1=[1], 2=[2], 3=[2,1], 4=[2,2], 5=[2,2,1], 6=[2,2,2] | Max 2'li bloklar; dersler haftaya yayılır, solver'ın arama uzayı daralır |
| Frontend veri çekme | `use client` + useEffect | External API → Server Components değer üretmiyor |
| Availability | Dialog (modal) | Sayfa temiz kalır; 5×8 grid inline çok yer kaplar |
| Teacher branş | Zorunlu alan | Ders adı = branş adı; bidirectional sync için gerekli |
| Classroom modeli | grade + section + student_count | İnsan okunabilir ad (9-A) programatik olarak türetilir |
| Cascade güncelleme | Service layer, tek transaction | 7 farklı tetikleyici, hepsi atomik (session.flush + commit) |
| DB migration | Idempotent (PRAGMA table_info + ALTER TABLE) | Hem taze kurulum hem mevcut DB desteklenir; downtime yok |
| CORS | ALLOWED_ORIGINS env var | Ortama göre değişir; hardcode değil |
| Multi-select dropdown | useRef + pointerdown (custom) | Yeni paket gerektirmez; ~30 satır |
| Branş-öğretmen senkronu | Bidirectional (ad ↔ öğretmen) | Yanlış öğretmen atamasını form seviyesinde önler |
| Program sınıf seçimi | Select dropdown (Tabs yerine) | 16+ sınıfta Tabs taşar; dropdown ölçeklenir |
| PDF indirme | window.open + window.print() | Yeni paket gerektirmez; tarayıcı native print dialog |
| Timetable renk algoritması | Golden-angle (i × 137.5° mod 360°) | Sonsuz benzersiz hue garantisi; 26 derste bile çakışma yok |
| Dark mode | next-themes (attribute="class") | SSR hydration uyumlu; sistem teması destekli |
| Font | Inter 400/500/600 | Minimal SaaS estetiği; Geist'tan daha nötr |
| Design token'lar | zinc nötr + blue-600 accent | Linear/Notion estetiği; gradient/glow yok |

---

## Tamamlanan Adımlar

### ✅ Adım 1 — Proje İskeleti
- Monorepo: `frontend/` + `backend/`
- Next.js 16 (App Router, TypeScript, Tailwind 4, shadcn/ui)
- FastAPI + uv paket yöneticisi
- `.gitignore`, README taslağı

### ✅ Adım 2 — Veri Modeli
- `Teacher` (name + branch + availability + is_on_leave)
- `Classroom` (grade + section + student_count → name türetilir)
- `Subject` + `ClassroomSubjectLink` (many-to-many)
- `Lesson`, `Schedule` (Pydantic only — DB'ye yazılmaz)
- `ScheduleResult` (DB kalıcı — lessons_json olarak)
- Availability: 5×8 boolean matrix → JSON string

### ✅ Adım 3 — CRUD Endpoints + Scheduler
- Service layer mimarisi (router → service → DB)
- Tüm endpointler: teachers / classrooms / subjects / schedule / seed
- Scheduler: Split → Expand → MRV sort → Backtrack → Spread
- Hard constraints: öğretmen/sınıf çakışması yok · availability · blok ardışıklığı · günlük tekrar yok
- 3M iterasyon limiti (sonsuz döngü koruması)

### ✅ Adım 4 — Cascade Güncelleme
- 7 tetikleyici; hepsi tek transaction içinde atomik
- Öğretmen branşı → Subject.name + lessons_json subject_name
- Sınıf adı → lessons_json classroom_name
- Ders adı → lessons_json subject_name
- Dersin öğretmeni → lessons_json güncelle + is_feasible = False
- Sınıf çıkarma → lessons_json'dan o sınıfın dersleri silinir
- Haftalık saat değişimi → is_feasible = False
- Öğretmen izin durumu → is_feasible = False

### ✅ Adım 5 — Frontend Sayfaları
- 6 sayfa: Dashboard · Öğretmenler · Sınıflar · Dersler · Programlar · Öğretmen Programları
- Typed API client (`lib/api.ts`) — her endpoint için tip güvenli wrapper
- AvailabilityGrid: 5×8 interaktif matris; programda dolu slotlar kilitli
- ClassroomPicker: custom multi-select dropdown (useRef + pointerdown)
- Branş-öğretmen bidirectional senkron (ad → öğretmen filtresi; öğretmen → ad doldurur)
- PDF: window.open + window.print()

### ✅ Adım 6 — UX İyileştirmeleri
- Tüm sayfalarda tutarlı pattern: sağ üst ekle butonu, collapsible form, anlık arama
- Boş saat sayacı (X/Y formatı), hover tooltip
- Program sayfası: Tabs → Select dropdown (16 sınıf için ölçeklenir)
- Tam Türkçe gün adları

### ✅ Adım 7 — Seed Data & Performans
- Dashboard "Demo Veri Yükle": 16 sınıf (9-12, A-D), 26 öğretmen, ~%82 doluluk
- SQLite WAL mode + NORMAL sync + 32 MB page cache
- N+1 sorgu düzeltmesi (subjects + solver için selectinload)
- Solver 3M iterasyon limiti

### ✅ Adım 8 — Görsel Tasarım (Design System)
- Inter font (400/500/600) — Geist'ın yerini aldı
- Design token'lar: zinc-50/100/200/900/950 nötr; blue-600 primary
- Dark mode: next-themes ThemeProvider + navbar Sun/Moon toggle
- Timetable: golden-angle renk algoritması — 8 sabit renk → sonsuz benzersiz ton
- Availability grid: semantic emerald/red/border sınıfları (light+dark aware)
- Radix Dialog accessibility warning'leri (aria-describedby) düzeltildi

### ✅ Adım 9 — Bug Düzeltme & Optimizasyon
- **Bug fix:** Dersin öğretmeni değişince schedule artık `is_feasible = False` işaretleniyor — yeni öğretmen eski slotlarda müsait olmayabilir
- **Test fix:** `test_models_sanity.py` güncellendi — `section` alanı modele sonradan eklenmişti, test dosyası güncellenmemişti
- **Scheduler optimizasyonu:** Blok algoritması max 2'li bloklara çekildi (3=[2,1], 5=[2,2,1], 6=[2,2,2]) — dersler haftaya daha dengeli yayılır, backtracking derinliği azalır

### ✅ Adım 10 — Deploy
- Backend → Railway: root directory `/backend`, Procfile + requirements.txt ile
- Frontend → Vercel: root directory `/frontend`, Next.js otomatik algılandı
- `NEXT_PUBLIC_API_URL` → Railway URL ile Vercel'e eklendi
- `ALLOWED_ORIGINS` → Vercel URL'leri ile Railway'e eklendi
- Canlı uçtan uca test tamamlandı ✓

---

## Açık Noktalar

### İsteğe Bağlı İyileştirmeler
- **İnfeasible detay:** Solver şu an "çözüm bulunamadı" diyor; hangi (ders, sınıf) bloğunun atanamadığını belirtmiyor
- **Soft constraint görselleştirme:** Timetable'da öğretmenin tercih ettiği/etmediği slotlar ayırt edilemiyor

---

## Başarı Kriterleri

- [x] Seed data ile sorunsuz çalışıyor (16 sınıf, 26 öğretmen, 26 ders)
- [x] Infeasible durumda anlamlı hata mesajı
- [x] UI temiz, prezentabl, dark mode destekli
- [x] Timetable renkleri benzersiz ve ayırt edilebilir
- [x] README self-explanatory (canlı link dahil)
- [x] Canlı link çalışıyor

---

## Kapsam Dışı

- Authentication / çoklu kullanıcı
- Oda/laboratuvar tahsisi
- Öğretmen tercihleri (soft constraint)
- Yedek öğretmen ataması
- Takvim export (.ics)

---

## AI Kullanımı Notu

Mimari kararlar, algoritma tasarımı, trade-off değerlendirmeleri → benim.  
Claude Code: boilerplate üretimi, syntax, hata ayıklama, best practice kontrolü.
