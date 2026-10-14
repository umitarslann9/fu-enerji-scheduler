# Fu Enerji Scheduler — Backend

FastAPI + SQLModel + SQLite service: CRUD for teachers, classrooms and subjects, the CSP/backtracking timetable solver, and a demo-data seeder. See the [root README](../README.md) for the full picture.

## Run

```bash
uv sync
uv run python main.py        # → http://localhost:8000, Swagger UI at /docs
```

Environment variables (copy `.env.example` to `.env` to set them locally):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Listening port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS whitelist |

## Layout

| Path | Role |
|---|---|
| `app/main.py` | FastAPI app, CORS, router registration, `/health` |
| `app/routers/` | HTTP layer only: teachers, classrooms, subjects, schedule, seed |
| `app/services/` | Business logic and cascade updates, one transaction per operation |
| `app/scheduler/solver.py` | CSP + backtracking solver (Split → Expand → MRV sort → Backtrack → Spread) |
| `app/db/database.py` | SQLite engine (WAL mode) + idempotent migration |
| `app/models/schemas.py` | SQLModel tables and Pydantic request/response schemas |

## Test

```bash
uv run pytest
```
