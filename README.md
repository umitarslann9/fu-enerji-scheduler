# Fu Enerji Scheduler

Ders programı otomatik oluşturma uygulaması.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** FastAPI + SQLModel + SQLite
- **Scheduler:** Greedy + Backtracking (custom implementation)

## Proje Yapısı

\`\`\`
fu-enerji-scheduler/
├── frontend/          # Next.js 14 app
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI entry point
│   │   ├── db/            # Database connection
│   │   ├── models/        # SQLModel schemas (Teacher, Classroom, Subject, Lesson)
│   │   ├── routers/       # API endpoints (CRUD)
│   │   └── scheduler/     # Core scheduling algorithm
│   ├── tests/
│   └── scheduler.db
└── ROADMAP.md         # Yol haritası ve kararlar
\`\`\`

## Veri Modeli Kararları

- **Teacher → Subject:** 1-to-many (her ders tek öğretmen)
- **Classroom ↔ Subject:** many-to-many (ClassroomSubjectLink association table)
- **Availability:** 5 gün × 8 period boolean matrix, JSON string olarak DB'de
- **Günde max:** aynı dersten 3 saat (4+ saatlik dersler 2+ güne bölünür)

## Kurulum

### Backend
\`\`\`powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
\`\`\`

### Frontend
\`\`\`powershell
cd frontend
npm install
npm run dev
\`\`\`

## Geliştirme Durumu

- [x] Veri modelleri
- [x] Database bağlantısı
- [ ] CRUD endpoints
- [ ] Scheduler algoritması
- [ ] Frontend sayfaları
- [ ] Deploy