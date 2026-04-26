# Fu Enerji Scheduler

Okul idarecileri için haftalık ders programı otomatik oluşturma uygulaması. Öğretmenleri, sınıfları ve dersleri tanımlarsınız; sistem kısıt tatmin algoritmasıyla çakışmasız bir haftalık çizelge üretir.

## Canlı Demo

| | URL |
|---|---|
| **Uygulama** | https://fu-enerji-scheduler.vercel.app |
| **API** | https://fu-enerji-scheduler-production.up.railway.app |
| **API Docs** | https://fu-enerji-scheduler-production.up.railway.app/docs |

> Uygulamayı açınca **Dashboard → Demo Veri Yükle** butonuna basın. 16 sınıf, 26 öğretmen ve 26 ders otomatik yüklenir. Ardından **Programlar → Program Oluştur** ile solver'ı çalıştırın.

## Stack

| Katman | Teknoloji | Gerekçe |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui | App Router, Vercel uyumu |
| Backend | FastAPI + SQLModel + SQLite | Pydantic validation, async, servis katmanı mimarisi |
| Scheduler | CSP + Backtracking (sıfırdan yazıldı) | Kara kutu yok; her karar savunulabilir |
| Deploy | Vercel (frontend) + Railway (backend) | Vercel Python Functions kısıtlı; Railway stabil |

## Uygulama Sayfaları

| Sayfa | Açıklama |
|---|---|
| Dashboard | İstatistik kartları, son program durumu, Demo Veri Yükle butonu |
| Öğretmenler | CRUD · branş · izin durumu · 5×8 müsaitlik matrisi · boş saat sayacı |
| Sınıflar | CRUD · sınıf + şube + öğrenci sayısı |
| Dersler | CRUD · branş-öğretmen bidirectional sync · çoklu sınıf seçimi |
| Programlar | Haftalık grid · sınıf bazlı dropdown · PDF indirme |
| Öğretmen Programları | Haftalık grid · öğretmen bazlı dropdown · PDF indirme |

## Veri Modeli

- **Teacher → Subject:** 1-to-many (her ders tek öğretmen); `branch` alanı taşır
- **Classroom:** `grade` + `section` → `name` türetilir (`"9-A"`); `student_count` saklanır
- **Classroom ↔ Subject:** many-to-many (`ClassroomSubjectLink` association table)
- **Availability:** 5×8 boolean matrix, JSON string olarak DB'de saklanır
- **ScheduleResult:** Üretilen program `lessons_json` (JSON) olarak SQLite'ta kalıcı saklanır

## Cascade Güncelleme Kuralları

Veriler değiştiğinde mevcut program otomatik güncellenir veya geçersiz işaretlenir. Tüm işlemler tek transaction içinde atomiktir.

| Tetikleyici | Etkilenen |
|---|---|
| Öğretmen branşı değişir | İlgili `Subject.name` kayıtları + `lessons_json` içindeki `subject_name` |
| Sınıf grade/section değişir | `Classroom.name` yeniden türetilir + `lessons_json` içindeki `classroom_name` |
| Ders adı değişir | `lessons_json` içindeki `subject_name` güncellenir |
| Dersin öğretmeni değişir | `lessons_json` güncellenir + `is_feasible = False` (yeni öğretmen eski slotlarda müsait olmayabilir) |
| Dersten sınıf çıkarılır | O sınıfa ait dersler `lessons_json`'dan silinir |
| Dersin haftalık saati değişir | `is_feasible = False` — yeniden oluşturma gerekir |
| Öğretmen izne ayrılır / döner | `is_feasible = False` — yeniden oluşturma gerekir |

## Scheduler Algoritması (CSP + Backtracking)

Problem: Her `(Subject, Classroom)` çifti için haftalık saat kadar ders dilimi ata; hiçbir öğretmen veya sınıf aynı anda iki yerde olmasın.

```
1. Split    — haftalık saati günlük ardışık bloklara böl (max 2'li; haftaya yayılır)
               1h=[1]  2h=[2]  3h=[2,1]  4h=[2,2]  5h=[2,2,1]  6h=[2,2,2]

2. Expand   — (subject, classroom) × blok sayısı kadar BlockNeed üret

3. MRV sort — öğretmen müsaitlik sayısına göre artan sırala
               (en kısıtlı öğretmenden başla → erken hata, az backtrack)

4. Backtrack — geçerli slot yoksa bir önceki atamaya geri dön
               (3 milyon iterasyon limiti — sonsuz döngü koruması)

5. Spread   — teacher_day_load ile slot sırala → bloklar haftaya doğal yayılır
```

**Hard constraints:** öğretmen çakışması yok · sınıf çakışması yok · availability matrisi · blok içindeki periyotlar ardışık · aynı (ders, sınıf) bloğu aynı günde tekrar yok

## Proje Yapısı

```
fu-enerji-scheduler/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Dashboard
│   │   ├── providers.tsx           # next-themes ThemeProvider
│   │   ├── teachers/               # Öğretmen CRUD + müsaitlik matrisi
│   │   ├── classrooms/             # Sınıf CRUD
│   │   ├── subjects/               # Ders CRUD + branş-öğretmen sync
│   │   ├── schedule/               # Haftalık program grid (sınıf bazlı)
│   │   └── teacher-schedule/       # Haftalık program grid (öğretmen bazlı)
│   ├── components/
│   │   ├── nav.tsx                 # Navigasyon + dark mode toggle
│   │   └── availability-grid.tsx   # 5×8 interaktif müsaitlik matrisi
│   └── lib/
│       ├── api.ts                  # Typed fetch client
│       └── types.ts                # Backend şemalarına karşılık TypeScript tipleri
├── backend/
│   └── app/
│       ├── main.py                 # FastAPI app + CORS middleware
│       ├── db/database.py          # SQLite engine + idempotent migration
│       ├── models/schemas.py       # SQLModel tablo modelleri + Pydantic şemaları
│       ├── routers/                # teachers / classrooms / subjects / schedule / seed
│       ├── services/               # İş mantığı + cascade update katmanı
│       └── scheduler/solver.py     # CSP + Backtracking algoritması
└── ROADMAP.md
```

## API Referansı

| Method | Yol | Açıklama |
|---|---|---|
| GET / POST | `/teachers` | Liste / ekle |
| GET / PUT / DELETE | `/teachers/{id}` | Tek kayıt / güncelle / sil |
| GET / POST | `/classrooms` | Liste / ekle |
| GET / PUT / DELETE | `/classrooms/{id}` | Tek kayıt / güncelle / sil |
| GET / POST | `/subjects` | Liste / ekle |
| GET / PUT / DELETE | `/subjects/{id}` | Tek kayıt / güncelle / sil |
| POST | `/schedule/generate` | Solver'ı çalıştır, sonucu DB'ye kaydet |
| GET | `/schedule` | Son üretilen programı döndür |
| POST | `/seed` | Demo veri yükle (mevcut veriyi sıfırlar) |
| GET | `/health` | Servis sağlık kontrolü |

## Yerel Kurulum

### Backend
```bash
cd backend
uv sync
uv run python main.py
# → http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

`NEXT_PUBLIC_API_URL` tanımlanmazsa varsayılan `http://localhost:8000`.  
`ALLOWED_ORIGINS` tanımlanmazsa varsayılan `http://localhost:3000`.

## Tasarım Sistemi

- **Font:** Inter (400/500/600) — `next/font` ile yüklü, layout shift yok
- **Renkler:** zinc-50/100/200/900/950 nötr skalası; blue-600 primary accent
- **Dark mode:** `next-themes` (`attribute="class"`); sistem teması destekli; navbar'da Sun/Moon toggle
- **Timetable renkleri:** golden-angle algoritması (`i × 137.5° mod 360°`) — 26 derste bile hiçbir iki renk çakışmaz

## Kapsam Dışı

Authentication · çoklu kullanıcı · oda/laboratuvar tahsisi · takvim export (.ics) · öğretmen tercihleri (soft constraint) · yedek öğretmen

## AI Kullanımı

Mimari kararlar, algoritma tasarımı, trade-off değerlendirmeleri → benim.  
Claude Code: boilerplate üretimi, syntax, hata ayıklama, best practice kontrolü.
