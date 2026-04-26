"""
Block-based Backtracking Scheduler.

Problem: CSP (Constraint Satisfaction Problem)
  Variables  : her (subject, classroom) çifti için bir veya iki BlockNeed
  Domain     : (gün, başlangıç_period) çiftleri — blok sığabilecek tüm pozisyonlar
  Hard constraints:
    - Öğretmen aynı anda tek yerde olabilir
    - Sınıf aynı anda tek ders alabilir
    - Öğretmen o slotta müsait olmalı (availability matrix)
    - Aynı ders, aynı sınıfta aynı günde yalnızca bir blok (farklı günler)
    - Blok içindeki ders saatleri ard arda (consecutive periods)

Haftalık saat → günlük blok dağılımı (max 2'li bloklar):
  1 saat  → [1]          tek blok
  2 saat  → [2]          tek blok, 2 ard arda
  3 saat  → [2, 1]       iki gün
  4 saat  → [2, 2]       iki gün
  5 saat  → [2, 2, 1]    üç gün
  6 saat  → [2, 2, 2]    üç gün
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from app.models.schemas import Classroom, Lesson, Schedule, Subject, Teacher, parse_availability

DAYS = 5
PERIODS = 8


@dataclass
class BlockNeed:
    """Tek bir güne atanacak ardışık ders bloğu."""
    subject_id: int
    subject_name: str
    teacher_id: int
    teacher_name: str
    classroom_id: int
    classroom_name: str
    availability: list[list[bool]]  # 5×8 teacher availability
    hours: int                       # bu blokta kaç ardışık ders


def _split_into_blocks(weekly_hours: int) -> list[int]:
    """Haftalık saati günlük ardışık bloklara böl (max 2'li bloklar)."""
    if weekly_hours == 1:
        return [1]
    elif weekly_hours == 2:
        return [2]
    elif weekly_hours == 3:
        return [2, 1]
    elif weekly_hours == 4:
        return [2, 2]
    elif weekly_hours == 5:
        return [2, 2, 1]
    elif weekly_hours == 6:
        return [2, 2, 2]
    else:
        # 6 üzeri: 2'li bloklar, kalan tek kalırsa 1'li son blok
        blocks, remaining = [], weekly_hours
        while remaining > 0:
            block = min(2, remaining)
            blocks.append(block)
            remaining -= block
        return blocks


def generate_schedule(
    teachers: list[Teacher],
    classrooms: list[Classroom],
    subjects: list[Subject],
) -> Schedule:
    teacher_map = {t.id: t for t in teachers}

    # --- 1. Expand: her (subject, classroom) için blok listesi oluştur ---
    needs: list[BlockNeed] = []
    for subject in subjects:
        teacher = teacher_map.get(subject.teacher_id)
        if not teacher or teacher.is_on_leave:
            continue
        avail = parse_availability(teacher.availability)
        for classroom in subject.classrooms:
            for hours in _split_into_blocks(subject.weekly_hours):
                needs.append(BlockNeed(
                    subject_id=subject.id,
                    subject_name=subject.name,
                    teacher_id=teacher.id,
                    teacher_name=teacher.name,
                    classroom_id=classroom.id,
                    classroom_name=classroom.name,
                    availability=avail,
                    hours=hours,
                ))

    # --- 2. MRV sort: geçerli (gün, başlangıç) sayısı az olan blok önce ---
    # Sadece öğretmen availability'sine bakılır; çakışma dikkate alınmaz (statik sıralama)
    def available_block_count(need: BlockNeed) -> int:
        return sum(
            1
            for d in range(DAYS)
            for p in range(PERIODS - need.hours + 1)
            if all(need.availability[d][p + offset] for offset in range(need.hours))
        )
    needs.sort(key=available_block_count)

    # --- 3. Backtracking state ---
    teacher_busy: dict[int, set[tuple[int, int]]] = {t.id: set() for t in teachers}
    classroom_busy: dict[int, set[tuple[int, int]]] = {c.id: set() for c in classrooms}
    # (subject_id, classroom_id) → bu güne kadar kullanılan günler
    used_days: dict[tuple[int, int], set[int]] = {}
    assigned: list[tuple[int, int]] = []  # her blok için (gün, başlangıç_period)
    call_count = [0]
    _MAX_CALLS = 3_000_000  # sonsuz döngü koruması

    def get_valid_slots(need: BlockNeed) -> list[tuple[int, int]]:
        blocked = used_days.get((need.subject_id, need.classroom_id), set())
        valid = []
        for d in range(DAYS):
            if d in blocked:
                continue
            for p in range(PERIODS - need.hours + 1):
                if all(
                    need.availability[d][p + off]
                    and (d, p + off) not in teacher_busy[need.teacher_id]
                    and (d, p + off) not in classroom_busy[need.classroom_id]
                    for off in range(need.hours)
                ):
                    valid.append((d, p))

        # Öğretmenin o günkü yüküne göre sırala → haftaya yay
        def teacher_day_load(day: int) -> int:
            return sum(1 for h in range(PERIODS) if (day, h) in teacher_busy[need.teacher_id])

        valid.sort(key=lambda s: (teacher_day_load(s[0]), s[0], s[1]))
        return valid

    def backtrack(index: int) -> bool:
        call_count[0] += 1
        if call_count[0] > _MAX_CALLS:
            return False
        if index == len(needs):
            return True

        need = needs[index]
        for (d, p) in get_valid_slots(need):
            # Place: bloktaki tüm periodları işaretle
            for off in range(need.hours):
                teacher_busy[need.teacher_id].add((d, p + off))
                classroom_busy[need.classroom_id].add((d, p + off))
            key = (need.subject_id, need.classroom_id)
            used_days.setdefault(key, set()).add(d)
            assigned.append((d, p))

            if backtrack(index + 1):
                return True

            # Undo
            for off in range(need.hours):
                teacher_busy[need.teacher_id].discard((d, p + off))
                classroom_busy[need.classroom_id].discard((d, p + off))
            used_days[key].discard(d)
            assigned.pop()

        return False

    is_feasible = backtrack(0)

    lessons = []
    if is_feasible:
        for need, (d, p) in zip(needs, assigned):
            for off in range(need.hours):
                lessons.append(Lesson(
                    subject_id=need.subject_id,
                    subject_name=need.subject_name,
                    teacher_id=need.teacher_id,
                    teacher_name=need.teacher_name,
                    classroom_id=need.classroom_id,
                    classroom_name=need.classroom_name,
                    day=d,
                    period=p + off,
                ))

    return Schedule(
        lessons=lessons,
        generated_at=datetime.now(timezone.utc).isoformat(),
        is_feasible=is_feasible,
        message=(
            "Program başarıyla oluşturuldu."
            if is_feasible
            else "Geçerli program bulunamadı — öğretmen müsaitliklerini ve haftalık saat sayılarını kontrol edin."
        ),
    )
