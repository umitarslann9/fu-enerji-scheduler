import json

from fastapi import HTTPException
from sqlalchemy import delete as sql_delete
from sqlmodel import Session, select

from app.models.schemas import (
    Classroom,
    ClassroomCreate,
    ClassroomSubjectLink,
    ClassroomUpdate,
    ScheduleResult,
)


def get_all(session: Session) -> list[Classroom]:
    return session.exec(select(Classroom)).all()


def get_one(session: Session, classroom_id: int) -> Classroom:
    classroom = session.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom


def create(session: Session, data: ClassroomCreate) -> Classroom:
    classroom = Classroom(
        grade=data.grade,
        section=data.section,
        student_count=data.student_count,
        name=f"{data.grade}-{data.section}",
    )
    session.add(classroom)
    session.commit()
    session.refresh(classroom)
    return classroom


def update(session: Session, classroom_id: int, data: ClassroomUpdate) -> Classroom:
    classroom = get_one(session, classroom_id)
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(classroom, field, value)

    new_name = f"{classroom.grade}-{classroom.section}"
    name_changed = new_name != classroom.name
    classroom.name = new_name

    if name_changed:
        latest = session.exec(
            select(ScheduleResult).order_by(ScheduleResult.id.desc())
        ).first()
        if latest:
            lessons = json.loads(latest.lessons_json)
            for lesson in lessons:
                if lesson.get('classroom_id') == classroom_id:
                    lesson['classroom_name'] = new_name
            latest.lessons_json = json.dumps(lessons)
            session.add(latest)

    session.add(classroom)
    session.commit()
    session.refresh(classroom)
    return classroom


def delete(session: Session, classroom_id: int) -> None:
    classroom = get_one(session, classroom_id)
    session.execute(
        sql_delete(ClassroomSubjectLink).where(ClassroomSubjectLink.classroom_id == classroom_id)
    )
    session.delete(classroom)
    session.commit()
