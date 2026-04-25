from fastapi import HTTPException
from sqlalchemy import delete as sql_delete
from sqlmodel import Session, select

from app.models.schemas import (
    Classroom,
    ClassroomSubjectLink,
    Subject,
    SubjectCreate,
    SubjectRead,
    Teacher,
)


def _to_read(subject: Subject) -> SubjectRead:
    """ORM nesnesini SubjectRead'e çevirir; classroom_ids ilişkiden doldurulur."""
    return SubjectRead(
        id=subject.id,
        name=subject.name,
        weekly_hours=subject.weekly_hours,
        teacher_id=subject.teacher_id,
        classroom_ids=[c.id for c in subject.classrooms],
    )


def get_all(session: Session) -> list[SubjectRead]:
    subjects = session.exec(select(Subject)).all()
    return [_to_read(s) for s in subjects]


def get_one(session: Session, subject_id: int) -> SubjectRead:
    subject = session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return _to_read(subject)


def create(session: Session, data: SubjectCreate) -> SubjectRead:
    if not session.get(Teacher, data.teacher_id):
        raise HTTPException(status_code=404, detail="Teacher not found")

    # classroom_ids'deki her sınıfın var olduğunu doğrula
    classrooms = []
    for cid in data.classroom_ids:
        classroom = session.get(Classroom, cid)
        if not classroom:
            raise HTTPException(status_code=404, detail=f"Classroom {cid} not found")
        classrooms.append(classroom)

    # classroom_ids SubjectBase'de yok, explicit oluşturuyoruz
    subject = Subject(
        name=data.name,
        weekly_hours=data.weekly_hours,
        teacher_id=data.teacher_id,
    )
    session.add(subject)
    session.flush()  # ID üret ama commit etme

    for classroom in classrooms:
        session.add(ClassroomSubjectLink(classroom_id=classroom.id, subject_id=subject.id))
    session.commit()
    session.refresh(subject)

    return _to_read(subject)


def delete(session: Session, subject_id: int) -> None:
    subject = session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Association link'leri önce sil; cascade yoksa FK kısıtı ihlal olur
    session.execute(
        sql_delete(ClassroomSubjectLink).where(ClassroomSubjectLink.subject_id == subject_id)
    )
    session.delete(subject)
    session.commit()
