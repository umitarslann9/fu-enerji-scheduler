"""
Greedy + Backtracking scheduler.

Problem: CSP (Constraint Satisfaction Problem)
  Variables : her atanacak ders saati (SlotNeed)
  Domain    : 5x8 = 40 zaman dilimi (gün × period)
  Constraints (hard):
    - Öğretmen aynı anda tek yerde olabilir
    - Sınıf aynı anda tek ders alabilir
    - Öğretmen o slotta müsait olmalı
    - Aynı ders aynı sınıfta günde max 3 saat (MAX_DAILY)

Algoritma:
  1. Tüm (subject, classroom) çiftlerini weekly_hours kadar SlotNeed'e aç
  2. MRV heuristic ile sırala: en az müsait slota sahip öğretmenin dersi önce
  3. Backtracking: geçerli slot yoksa bir önceki atamaya geri dön
  4. Slot sıralama: günde zaten atama sayısına göre → haftaya yay (round-robin etkisi)
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from app.models.schemas import Classroom, Lesson, Schedule, Subject, Teacher, parse_availability

DAYS = 5
PERIODS = 8
MAX_DAILY = 3  # aynı dersten aynı sınıfta günde maksimum saat


@dataclass
class SlotNeed:
    """Tek bir atanması gereken ders saati."""
    subject_id: int
    subject_name: str
    teacher_id: int
    teacher_name: str
    classroom_id: int
    classroom_name: str
    availability: list[list[bool]]  # 5x8 teacher availability


def generate_schedule(
    teachers: list[Teacher],
    classrooms: list[Classroom],
    subjects: list[Subject],
) -> Schedule:
    teacher_map = {t.id: t for t in teachers}

    # --- 1. Expand: her (subject, classroom) için weekly_hours adet SlotNeed ---
    needs: list[SlotNeed] = []
    for subject in subjects:
        teacher = teacher_map.get(subject.teacher_id)
        if not teacher:
            continue
        avail = parse_availability(teacher.availability)
        for classroom in subject.classrooms:
            for _ in range(subject.weekly_hours):
                needs.append(SlotNeed(
                    subject_id=subject.id,
                    subject_name=subject.name,
                    teacher_id=teacher.id,
                    teacher_name=teacher.name,
                    classroom_id=classroom.id,
                    classroom_name=classroom.name,
                    availability=avail,
                ))

    # --- 2. MRV sort: müsait slot sayısı az olan önce ---
    # Erken fail → daha az backtracking
    def available_count(need: SlotNeed) -> int:
        return sum(
            need.availability[d][p]
            for d in range(DAYS)
            for p in range(PERIODS)
        )
    needs.sort(key=available_count)

    # --- 3. Backtracking state ---
    teacher_busy: dict[int, set[tuple[int, int]]] = {t.id: set() for t in teachers}
    classroom_busy: dict[int, set[tuple[int, int]]] = {c.id: set() for c in classrooms}
    # (subject_id, classroom_id, day) → atama sayısı
    daily_count: dict[tuple[int, int, int], int] = {}
    assigned: list[tuple[int, int]] = []  # her need için seçilen (day, period)

    def get_valid_slots(need: SlotNeed) -> list[tuple[int, int]]:
        valid = []
        for d in range(DAYS):
            for p in range(PERIODS):
                if not need.availability[d][p]:
                    continue
                if (d, p) in teacher_busy[need.teacher_id]:
                    continue
                if (d, p) in classroom_busy[need.classroom_id]:
                    continue
                if daily_count.get((need.subject_id, need.classroom_id, d), 0) >= MAX_DAILY:
                    continue
                valid.append((d, p))

        # Round-robin spread: günde zaten az atama olanı tercih et
        # → dersler haftaya doğal olarak yayılır
        valid.sort(key=lambda s: (
            daily_count.get((need.subject_id, need.classroom_id, s[0]), 0),
            s[0],   # day
            s[1],   # period
        ))
        return valid

    def backtrack(index: int) -> bool:
        if index == len(needs):
            return True

        need = needs[index]
        for (d, p) in get_valid_slots(need):
            # Place
            teacher_busy[need.teacher_id].add((d, p))
            classroom_busy[need.classroom_id].add((d, p))
            key = (need.subject_id, need.classroom_id, d)
            daily_count[key] = daily_count.get(key, 0) + 1
            assigned.append((d, p))

            if backtrack(index + 1):
                return True

            # Undo
            teacher_busy[need.teacher_id].discard((d, p))
            classroom_busy[need.classroom_id].discard((d, p))
            daily_count[key] -= 1
            assigned.pop()

        return False

    is_feasible = backtrack(0)

    lessons = []
    if is_feasible:
        for need, (d, p) in zip(needs, assigned):
            lessons.append(Lesson(
                subject_id=need.subject_id,
                subject_name=need.subject_name,
                teacher_id=need.teacher_id,
                teacher_name=need.teacher_name,
                classroom_id=need.classroom_id,
                classroom_name=need.classroom_name,
                day=d,
                period=p,
            ))

    return Schedule(
        lessons=lessons,
        generated_at=datetime.now(timezone.utc).isoformat(),
        is_feasible=is_feasible,
        message=(
            "Schedule generated successfully."
            if is_feasible
            else "No feasible schedule found — check teacher availability and weekly hours."
        ),
    )
