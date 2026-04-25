import json

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.schemas import ScheduleResult, Subject, Teacher, TeacherCreate, TeacherUpdate


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
    update_data = data.model_dump(exclude_unset=True)

    new_branch = update_data.get('branch')
    branch_changed = new_branch is not None and new_branch != teacher.branch

    for field, value in update_data.items():
        setattr(teacher, field, value)

    if branch_changed:
        # Bu öğretmene bağlı tüm derslerin adını güncelle
        subjects = session.exec(select(Subject).where(Subject.teacher_id == teacher_id)).all()
        subject_ids = {s.id for s in subjects}
        for subject in subjects:
            subject.name = new_branch
            session.add(subject)

        # Son programdaki subject_name alanlarını da güncelle
        if subject_ids:
            latest = session.exec(
                select(ScheduleResult).order_by(ScheduleResult.id.desc())
            ).first()
            if latest:
                lessons = json.loads(latest.lessons_json)
                for lesson in lessons:
                    if lesson.get('subject_id') in subject_ids:
                        lesson['subject_name'] = new_branch
                latest.lessons_json = json.dumps(lessons)
                session.add(latest)

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
