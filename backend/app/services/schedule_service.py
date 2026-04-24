import json

from sqlmodel import Session, select

from app.models.schemas import (
    Classroom,
    Lesson,
    Schedule,
    ScheduleResult,
    Subject,
    Teacher,
)
from app.scheduler.solver import generate_schedule


def run_generate(session: Session) -> Schedule:
    teachers = session.exec(select(Teacher)).all()
    classrooms = session.exec(select(Classroom)).all()
    subjects = session.exec(select(Subject)).all()

    schedule = generate_schedule(teachers, classrooms, subjects)

    result = ScheduleResult(
        lessons_json=json.dumps([lesson.model_dump() for lesson in schedule.lessons]),
        generated_at=schedule.generated_at,
        is_feasible=schedule.is_feasible,
        message=schedule.message,
    )
    session.add(result)
    session.commit()

    return schedule


def get_latest(session: Session) -> Schedule | None:
    result = session.exec(
        select(ScheduleResult).order_by(ScheduleResult.id.desc())
    ).first()

    if not result:
        return None

    lessons = [Lesson(**data) for data in json.loads(result.lessons_json)]
    return Schedule(
        lessons=lessons,
        generated_at=result.generated_at,
        is_feasible=result.is_feasible,
        message=result.message,
    )
