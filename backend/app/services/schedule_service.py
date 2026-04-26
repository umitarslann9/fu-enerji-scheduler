import json

from fastapi import HTTPException
from sqlalchemy.orm import selectinload
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
    # selectinload: tek sorguda tüm subject.classrooms ilişkilerini yükle
    subjects = session.exec(
        select(Subject).options(selectinload(Subject.classrooms))
    ).all()

    if not teachers or not classrooms or not subjects:
        raise HTTPException(
            status_code=422,
            detail="Program oluşturmak için en az bir öğretmen, sınıf ve ders gereklidir.",
        )

    try:
        schedule = generate_schedule(teachers, classrooms, subjects)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Solver hatası: {exc}") from exc

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
