# Fu Enerji Scheduler — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui client for the timetable API. See the [root README](../README.md) for the full picture.

## Run

```bash
npm install
npm run dev          # → http://localhost:3000
```

The backend must be running on `http://localhost:8000`; point elsewhere with `NEXT_PUBLIC_API_URL`.

## Pages

| Route | Page |
|---|---|
| `/` | Dashboard: stat cards, last schedule status, demo-data loader |
| `/teachers` | Teacher list, add/edit/delete, availability matrix, free-hour counter |
| `/classrooms` | Classroom list (grade + section + student count) |
| `/subjects` | Subject list, branch ↔ teacher sync, classroom assignment |
| `/schedule` | Class timetable: class dropdown + colour-coded weekly grid + PDF |
| `/teacher-schedule` | Teacher timetable: teacher dropdown + weekly grid + PDF |

## Design

Inter font · zinc neutral palette · blue-600 accent · dark mode via `next-themes` · golden-angle timetable colours

## Build

```bash
npm run build
npm start
```
