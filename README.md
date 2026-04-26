# Fu Enerji Scheduler

Ders programı otomatik oluşturma uygulaması — okul idarecileri için CSP tabanlı haftalık çizelge üretici.

## Stack

| Katman | Seçim | Gerekçe |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui | App Router, Vercel uyumu |
| Backend | FastAPI + SQLModel + SQLite | Pydantic validation, async, savunması kolay |
| Scheduler | CSP + Backtracking (custom) | Kara kutu yok, her kararı açıklayabiliyorum |
| Deploy | Vercel (frontend) + Railway (backend) | — |

## Proje Yapısı

```
fu-enerji-scheduler/
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Dashboard (stat kartlar + son program)
│   │   ├── teachers/          # Öğretmen CRUD + branş + müsaitlik matrisi
│   │   ├── classrooms/        # Sınıf CRUD (sınıf + şube + öğrenci sayısı)
│   │   ├── subjects/          # Ders CRUD + düzenleme (branş-öğretmen sync)
│   │   └── schedule/          # Program oluştur + dropdown sınıf seçimi + haftalık grid
│   ├── components/
│   │   ├── nav.tsx            # Üst navigasyon
│   │   └── availability-grid.tsx  # 5×8 interaktif matris (yeşil/kırmızı/siyah)
│   └── lib/
│       ├── api.ts             # Typed API client
│       └── types.ts           # Backend şemalarına karşılık TS tipleri
├── backend/
│   └── app/
│       ├── main.py            # FastAPI entry point + CORS (ALLOWED_ORIGINS env)
│       ├── db/database.py     # SQLite bağlantısı + idempotent migration
│       ├── models/schemas.py  # SQLModel tablo modelleri + Pydantic şemaları
│       ├── routers/           # teachers / classrooms / subjects / schedule
│       ├── services/          # İş mantığı + cascade update katmanı
│       └── scheduler/solver.py  # CSP + Backtracking algoritması
└── ROADMAP.md
```

## Veri Modeli

- **Teacher → Subject:** 1-to-many (her ders tek öğretmen); `branch` alanı taşır
- **Classroom:** `grade` + `section` → `name` türetilir (`"9-A"`); `student_count` saklanır
- **Classroom ↔ Subject:** many-to-many (`ClassroomSubjectLink` association table)
- **Availability:** 5×8 boolean matrix, JSON string olarak DB'de saklanır
- **ScheduleResult:** Üretilen programın `lessons_json` (JSON) olarak SQLite'ta kalıcı saklanması

## Cascade Güncelleme Kuralları

| Tetikleyici | Etkilenen |
|---|---|
| Öğretmen branşı değişir | İlgili `Subject.name` kayıtları + son `ScheduleResult.lessons_json` |
| Sınıf grade/section değişir | `Classroom.name` yeniden türetilir + son `ScheduleResult.lessons_json` |
| Ders adı değişir | Son `ScheduleResult.lessons_json` içindeki `subject_name` güncellenir |
| Dersin öğretmeni değişir | Son `ScheduleResult.lessons_json` içindeki `teacher_id` + `teacher_name` güncellenir |
| Dersten sınıf çıkarılır | O sınıfa ait dersler son `ScheduleResult.lessons_json`'dan silinir |
| Dersin haftalık saati değişir | Son `ScheduleResult.is_feasible = False` yapılır, yeniden oluşturma gerekir |

## Scheduler Algoritması (CSP)

Problem: Her `(Subject, Classroom)` çifti için `weekly_hours` adet ardışık zaman dilimi bloğu ata.

```
1. Split    — weekly_hours → blok listesi (haftalık saat → günlük ardışık parçalar)
               1h=[1]  2h=[2]  3h=[3]  4h=[2,2]  5h=[3,2]  6h=[3,3]
2. Expand   — (subject, classroom) × blok sayısı → BlockNeed listesi
3. MRV sort — öğretmen müsaitlik sayısına göre artan sırala (erken fail)
4. Backtrack — geçerli slot yoksa bir önceki atamaya geri dön (3M iterasyon limiti)
5. Spread   — teacher_day_load ile sort → bloklar haftaya doğal yayılır
```

Hard constraints: öğretmen çakışması yok · sınıf çakışması yok · availability matrisi · blok içindeki tüm periyotlar ardışık · aynı (ders, sınıf) bloğu aynı günde tekrar yok

## Kurulum

### Backend
```bash
cd backend
uv sync
uv run python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` tanımlanmazsa varsayılan `http://localhost:8000`.  
`ALLOWED_ORIGINS` tanımlanmazsa varsayılan `http://localhost:3000`.

## API Özeti

| Method | Yol | Açıklama |
|---|---|---|
| GET / POST | `/teachers` | Liste / ekle (name + branch) |
| GET / PUT / DELETE | `/teachers/{id}` | Tek kayıt / güncelle (branch cascade) / sil |
| GET / POST | `/classrooms` | Liste / ekle (grade + section + student_count) |
| GET / PUT / DELETE | `/classrooms/{id}` | Tek kayıt / güncelle (name cascade) / sil |
| GET / POST | `/subjects` | Liste / ekle (classroom_ids dahil) |
| GET / PUT / DELETE | `/subjects/{id}` | Tek kayıt / güncelle (tam cascade) / sil |
| POST | `/schedule/generate` | Solver çalıştır, sonucu DB'ye yaz |
| GET | `/schedule` | Son üretilen programı döner |
| POST | `/seed` | Demo veriyi yükle (mevcut veriyi sıfırlayıp örnek set ekler) |
| GET | `/health` | — |

## Geliştirme Durumu

- [x] Veri modelleri (Teacher + branch, Classroom + section + student_count, Subject, ScheduleResult)
- [x] CRUD endpoints + service layer mimarisi
- [x] Cascade update — 6 farklı tetikleyici (branş, sınıf adı, ders adı, öğretmen, sınıf çıkarma, haftalık saat)
- [x] Scheduler algoritması (MRV + backtracking + block-based)
- [x] Frontend — 5 sayfa (Dashboard, Öğretmenler, Sınıflar, Dersler, Program)
- [x] Availability grid (yeşil/kırmızı/siyah overlay)
- [x] Öğretmen sayfası: branş, arama/filtre, ayrı düzenleme + müsaitlik butonları, boş saat sayacı (X/Y)
- [x] Sınıf sayfası: grade + section + öğrenci sayısı, düzenleme dialogu, silme onayı, arama filtresi, buton sağ üst
- [x] Dersler sayfası: tam CRUD (ekle + düzenle + sil); branş-öğretmen bidirectional sync; ClassroomPicker dropdown; arama filtresi (ders adı / öğretmen)
- [x] Program sayfası: dropdown sınıf seçimi (tab yerine); tam gün adları; PDF indirme (tarayıcı print → PDF)
- [x] Dashboard: Öğretmen / Sınıf / Ders / Toplam Öğrenci stat kartları
- [x] Tüm sayfalarda tutarlı UX: ekle butonu sağ üstte, form kart içinde açılır/kapanır, arama çubuğu
- [x] CORS env var
- [x] DB migration: idempotent (init_db'de PRAGMA + ALTER TABLE)
- [x] SQLite performans optimizasyonu (WAL mode, NORMAL sync, 32 MB page cache)
- [x] N+1 sorgu düzeltmesi (subjects lazy-load → tek sorgu; solver selectinload)
- [x] Seed data — Dashboard "Demo Veri Yükle" butonu; 16 sınıf (9-12, A-D), 26 öğretmen, ~%82 doluluk
- [x] Solver sonsuz döngü koruması (3M iterasyon limiti)
- [ ] Deploy (Vercel + Railway)
- [ ] İnfeasible schedule — hangi ders atanamadı detayı

## Kapsam Dışı

Authentication · çoklu kullanıcı · oda/laboratuvar tahsisi · takvim export (.ics) · öğretmen tercihleri (soft constraint) · yedek öğretmen

## AI Kullanımı

Mimari kararlar, algoritma tasarımı, trade-off değerlendirmeleri → benim.  
Claude: boilerplate üretimi, syntax, hata ayıklama, best practice kontrolü.
