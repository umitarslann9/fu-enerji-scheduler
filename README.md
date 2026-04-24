# Fu Enerji Scheduler

Ders programı otomatik oluşturma uygulaması — okul idarecileri için CSP tabanlı haftalık çizelge üretici.

## Stack

| Katman | Seçim | Gerekçe |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui | App Router, Vercel uyumu |
| Backend | FastAPI + SQLModel + SQLite | Pydantic validation, async, savunması kolay |
| Scheduler | Greedy + Backtracking (custom) | Kara kutu yok, her kararı açıklayabiliyorum |
| Deploy | Vercel (frontend) + Railway (backend) | — |

## Proje Yapısı

```
fu-enerji-scheduler/
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Dashboard
│   │   ├── teachers/          # Öğretmen CRUD + müsaitlik matrisi
│   │   ├── classrooms/        # Sınıf CRUD
│   │   ├── subjects/          # Ders CRUD
│   │   └── schedule/          # Program oluştur + haftalık grid
│   ├── components/
│   │   ├── nav.tsx            # Üst navigasyon
│   │   └── availability-grid.tsx  # 5×8 checkbox matrisi
│   └── lib/
│       ├── api.ts             # Typed API client
│       └── types.ts           # Backend şemalarına karşılık TS tipleri
├── backend/
│   └── app/
│       ├── main.py            # FastAPI entry point + router kayıtları
│       ├── db/database.py     # SQLite bağlantısı, get_session dependency
│       ├── models/schemas.py  # SQLModel tablo modelleri + Pydantic şemaları
│       ├── routers/           # teachers / classrooms / subjects / schedule
│       ├── services/          # İş mantığı katmanı (router'dan ayrı)
│       └── scheduler/solver.py  # CSP algoritması
└── ROADMAP.md
```

## Veri Modeli

- **Teacher → Subject:** 1-to-many (her ders tek öğretmen)
- **Classroom ↔ Subject:** many-to-many (`ClassroomSubjectLink` association table)
- **Availability:** 5×8 boolean matrix, JSON string olarak DB'de saklanır
- **ScheduleResult:** Üretilen programın JSON olarak SQLite'ta kalıcı saklanması

## Scheduler Algoritması (CSP)

Problem: Her `(Subject, Classroom)` çifti için `weekly_hours` adet zaman dilimi ata.

```
1. Expand   — (subject, classroom) × weekly_hours → SlotNeed listesi
2. MRV sort — öğretmen müsaitlik sayısına göre artan sırala (erken fail)
3. Backtrack — geçerli slot yoksa bir önceki atamaya geri dön
4. Spread   — slot sıralamasında günde az atama olanı tercih et (round-robin etkisi)
```

Hard constraints: öğretmen çakışması yok · sınıf çakışması yok · availability matrisi · günde max 3 saat aynı ders

## Kurulum

### Backend
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` tanımlanmazsa varsayılan `http://localhost:8000`.

## API Özeti

| Method | Yol | Açıklama |
|---|---|---|
| GET/POST | `/teachers` | Liste / ekle |
| GET/PUT/DELETE | `/teachers/{id}` | Tek kayıt / güncelle / sil (dersi varsa 409) |
| GET/POST | `/classrooms` | Liste / ekle |
| GET/DELETE | `/classrooms/{id}` | Tek kayıt / sil (linkleri temizler) |
| GET/POST | `/subjects` | Liste / ekle (classroom_ids dahil) |
| DELETE | `/subjects/{id}` | Sil (linkleri temizler) |
| POST | `/schedule/generate` | Solver çalıştır, sonucu DB'ye yaz |
| GET | `/schedule` | Son üretilen programı döner |
| GET | `/health` | — |

## Geliştirme Durumu

- [x] Proje iskeleti
- [x] Veri modelleri (Teacher, Classroom, Subject, ScheduleResult)
- [x] Database bağlantısı
- [x] CRUD endpoints (service layer mimarisi)
- [x] Scheduler algoritması (MRV + backtracking + day-spread)
- [x] Frontend sayfaları (5 sayfa, toast, loading state'ler)
- [ ] Seed data ("Örnek veriyle dene" butonu)
- [ ] Deploy (Vercel + Railway)
- [ ] APPROACH.md (algoritma kararları ve alternatifleri)

## Kapsam Dışı

Authentication · çoklu kullanıcı · oda/laboratuvar tahsisi · takvim export (.ics) · öğretmen tercihleri (soft constraint)

## AI Kullanımı

Mimari kararlar, algoritma tasarımı, trade-off değerlendirmeleri → benim.  
Claude: boilerplate üretimi, syntax, hata ayıklama, best practice kontrolü.
