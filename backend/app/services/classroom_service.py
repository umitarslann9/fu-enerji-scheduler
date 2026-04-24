from fastapi import HTTPException
from sqlalchemy import delete as sql_delete
from sqlmodel import Session, select

from app.models.schemas import Classroom, ClassroomCreate, ClassroomSubjectLink


def get_all(session: Session) -> list[Classroom]:
    return session.exec(select(Classroom)).all()


def get_one(session: Session, classroom_id: int) -> Classroom:
    classroom = session.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom


def create(session: Session, data: ClassroomCreate) -> Classroom:
    classroom = Classroom(**data.model_dump())
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
