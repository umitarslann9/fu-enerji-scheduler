from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.schemas import Subject, Teacher, TeacherCreate, TeacherUpdate


def get_all(session: Session) -> list[Teacher]:
    return session.exec(select(Teacher)).all()


def get_one(session: Session, teacher_id: int) -> Teacher:
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


def create(session: Session, data: TeacherCreate) -> Teacher:
    teacher = Teacher(**data.model_dump())
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


def update(session: Session, teacher_id: int, data: TeacherUpdate) -> Teacher:
    teacher = get_one(session, teacher_id)
    # exclude_unset: sadece request'te gönderilen alanlar güncellenir
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


def delete(session: Session, teacher_id: int) -> None:
    teacher = get_one(session, teacher_id)
    linked = session.exec(select(Subject).where(Subject.teacher_id == teacher_id)).first()
    if linked:
        raise HTTPException(
            status_code=409,
            detail="Bu öğretmene bağlı dersler var. Önce dersleri silin.",
        )
    session.delete(teacher)
    session.commit()
