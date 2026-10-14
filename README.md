# Fu Enerji Scheduler

**🇬🇧 English · [🇹🇷 Türkçe](README.tr.md)**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000.svg?logo=nextdotjs)](frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688.svg?logo=fastapi)](backend)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg?logo=typescript&logoColor=white)](frontend)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776ab.svg?logo=python&logoColor=white)](backend)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CI](https://github.com/umitarslann9/fu-enerji-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/umitarslann9/fu-enerji-scheduler/actions/workflows/ci.yml)

Weekly school timetable generator for school administrators. You define teachers (each with a 5-day × 8-period availability matrix), classrooms and subjects; a constraint-satisfaction solver written from scratch produces a conflict-free weekly schedule for every class and every teacher, shown as a colour-coded grid and exportable to PDF.

Built in three days as a hiring case study for Fu Enerji: Next.js 16 + TypeScript on the front, FastAPI + SQLModel on the back, and a backtracking solver with no black-box dependencies, so every scheduling decision can be explained.

![Weekly schedule grid](docs/screenshots/schedule.png)

> **Status:** the hosted backend (Railway free tier) is offline, so the Vercel-hosted frontend cannot be used on its own at the moment. Run the project locally with the two commands below. The UI is in Turkish.

## Run locally

**Backend** — Python 3.11+ and [uv](https://docs.astral.sh/uv/):

```bash
cd backend
uv sync
uv run python main.py      # → http://localhost:8000   (Swagger UI at /docs)
```

**Frontend** — Node 20+:

```bash
cd frontend
npm install
npm run dev                # → http://localhost:3000
```

Open http://localhost:3000, press **Demo Veri Yükle** (load demo data) on the dashboard, then go to **Programlar → Program Oluştur** (generate schedule). The demo set has 16 classes, 26 teachers and 26 subjects at roughly 82 % slot occupancy; the solver places all of it in well under a second on a laptop.

Environment variables: `NEXT_PUBLIC_API_URL` for the frontend (default `http://localhost:8000`) and `ALLOWED_ORIGINS` for the backend CORS whitelist (default `http://localhost:3000`, see `backend/.env.example`).

## Features

| Page | What it does |
|---|---|
| Dashboard | Stat cards, status of the last generated schedule, one-click demo data |
| Teachers (*Öğretmenler*) | CRUD · branch · on-leave flag · interactive 5×8 availability matrix · free-hour counter |
| Classrooms (*Sınıflar*) | CRUD · grade + section + student count (the display name such as `9-A` is derived) |
| Subjects (*Dersler*) | CRUD · bidirectional branch ↔ teacher sync · multi-classroom assignment |
| Schedules (*Programlar*) | Weekly grid per class · class dropdown · PDF download |
| Teacher schedules (*Öğretmen Programları*) | Weekly grid per teacher · teacher dropdown · PDF download |

Every list page follows the same pattern: add button top-right, collapsible form, instant search. Dark mode follows the system theme and can be toggled from the navbar.

## Screenshots

| Dashboard | Teachers |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Teachers](docs/screenshots/teachers.png) |

| Subjects | Teacher schedule |
|---|---|
| ![Subjects](docs/screenshots/subjects.png) | ![Teacher schedule](docs/screenshots/teacher-schedule.png) |

![Schedule grid in dark mode](docs/screenshots/schedule-dark.png)

## How the solver works

The problem: for every (subject, classroom) pair, place as many period slots as the weekly hours of the subject so that no teacher and no classroom is in two places at once, and every teacher is available in the slots they get.

```
1. Split      — split weekly hours into daily blocks of at most 2 consecutive periods
                1h=[1]  2h=[2]  3h=[2,1]  4h=[2,2]  5h=[2,2,1]  6h=[2,2,2]

2. Expand     — one BlockNeed per (subject, classroom, block)

3. MRV sort   — order the needs by the number of free slots of the teacher, ascending
                (most constrained first → fail early, backtrack less)

4. Backtrack  — no valid slot for a need? undo the previous assignment and try its next option
                (3-million-iteration cap as an infinite-loop guard)

5. Spread     — rank candidate slots by the existing load of the teacher on that day,
                so blocks spread across the week instead of piling up
```

**Hard constraints:** no teacher clash · no classroom clash · teacher availability matrix · periods inside a block are consecutive · a (subject, classroom) block appears at most once per day.

**Known limitations:** when no solution exists the solver reports infeasibility but not *which* block could not be placed, and teacher preferences (soft constraints) are not modelled. The full decision log (25 design decisions with their rationale) and the step-by-step build log are in [ROADMAP.md](ROADMAP.md) (Turkish).

## Data model

- **Teacher → Subject:** one-to-many; each subject has exactly one teacher, and the `branch` of the teacher names the subject.
- **Classroom:** `grade` + `section` → derived `name` (`9-A`); stores `student_count`.
- **Classroom ↔ Subject:** many-to-many through the `ClassroomSubjectLink` association table.
- **Availability:** 5 × 8 boolean matrix, stored as a JSON string on the teacher.
- **ScheduleResult:** the generated timetable, persisted in SQLite as `lessons_json` together with an `is_feasible` flag.

### Cascade rules

When data changes, the stored schedule is either updated in place or marked stale. Each rule runs inside a single transaction.

| Trigger | Effect |
|---|---|
| Teacher branch changes | Related `Subject.name` rows + `subject_name` inside `lessons_json` |
| Classroom grade/section changes | `Classroom.name` re-derived + `classroom_name` inside `lessons_json` |
| Subject renamed | `subject_name` inside `lessons_json` |
| Subject teacher changes | `lessons_json` updated and `is_feasible = False` (the new teacher may not be free in the old slots) |
| Classroom removed from a subject | Lessons of that classroom removed from `lessons_json` |
| Subject weekly hours change | `is_feasible = False` — regenerate |
| Teacher goes on / returns from leave | `is_feasible = False` — regenerate |

## API

| Method | Path | Description |
|---|---|---|
| GET / POST | `/teachers` | List / create |
| GET / PUT / DELETE | `/teachers/{id}` | Read / partial update / delete (409 while the teacher still has subjects) |
| GET / POST | `/classrooms` | List / create |
| GET / PUT / DELETE | `/classrooms/{id}` | Read / update / delete |
| GET / POST | `/subjects` | List / create |
| GET / PUT / DELETE | `/subjects/{id}` | Read / update / delete |
| POST | `/schedule/generate` | Run the solver and persist the result |
| GET | `/schedule` | Return the last generated schedule |
| POST | `/seed` | Load demo data (resets existing data) |
| GET | `/health` | Health check |

Interactive docs are served by FastAPI at `/docs`.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui | App Router, typed API client, Vercel-friendly |
| Backend | FastAPI + SQLModel + SQLite | Pydantic validation, async, router → service → DB layering |
| Scheduler | CSP + backtracking, written from scratch | No black box; every decision is defensible |
| Deploy (original) | Vercel (frontend) + Railway (backend) | Python functions on Vercel were too limited; Railway offered a persistent volume |

## Project structure

```
fu-enerji-scheduler/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Dashboard
│   │   ├── providers.tsx           # next-themes ThemeProvider
│   │   ├── teachers/               # Teacher CRUD + availability matrix
│   │   ├── classrooms/             # Classroom CRUD
│   │   ├── subjects/               # Subject CRUD + branch ↔ teacher sync
│   │   ├── schedule/               # Weekly grid per class
│   │   └── teacher-schedule/       # Weekly grid per teacher
│   ├── components/
│   │   ├── nav.tsx                 # Navigation + dark-mode toggle
│   │   └── availability-grid.tsx   # Interactive 5×8 availability matrix
│   └── lib/
│       ├── api.ts                  # Typed fetch client
│       └── types.ts                # TypeScript mirrors of the backend schemas
├── backend/
│   ├── main.py                     # uvicorn entry point
│   ├── tests/
│   └── app/
│       ├── main.py                 # FastAPI app + CORS
│       ├── db/database.py          # SQLite engine + idempotent migration
│       ├── models/schemas.py       # SQLModel tables + Pydantic schemas
│       ├── routers/                # teachers / classrooms / subjects / schedule / seed
│       ├── services/               # Business logic + cascade updates
│       └── scheduler/solver.py     # CSP + backtracking solver
├── docs/screenshots/
├── ROADMAP.md                      # Decision log + build log (Turkish)
└── LICENSE
```

## Design system

- **Font:** Inter 400/500/600 via `next/font` (no layout shift)
- **Colours:** zinc neutral scale with a single blue-600 accent
- **Dark mode:** `next-themes` with `attribute="class"`, follows the system theme, Sun/Moon toggle in the navbar
- **Timetable colours:** golden-angle hue stepping (`i × 137.5° mod 360°`), so even 26 subjects get clearly distinct colours

## Out of scope

Authentication · multiple users · room/lab allocation · calendar export (.ics) · teacher preferences (soft constraints) · substitute teachers

## AI usage

Architecture, algorithm design and trade-off decisions are my own. Claude Code was used for boilerplate, syntax, debugging and best-practice checks.

## License

[MIT](LICENSE) © 2026 Ümit Arslan
