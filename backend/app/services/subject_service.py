import json

from fastapi import HTTPException
from sqlalchemy import delete as sql_delete
from sqlmodel import Session, select

from app.models.schemas import (
    Classroom,
    ClassroomSubjectLink,
    ScheduleResult,
    Subject,
    SubjectCreate,
    SubjectRead,
    SubjectUpdate,
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
    # Tek sorguda tüm bağlantıları çek — her subject için ayrı lazy-load yerine
    links = session.exec(select(ClassroomSubjectLink)).all()
    cids_map: dict[int, list[int]] = {}
    for lnk in links:
        if lnk.subject_id is not None and lnk.classroom_id is not None:
            cids_map.setdefault(lnk.subject_id, []).append(lnk.classroom_id)
    return [
        SubjectRead(
            id=s.id,
            name=s.name,
            weekly_hours=s.weekly_hours,
            teacher_id=s.teacher_id,
            classroom_ids=cids_map.get(s.id, []),
        )
        for s in subjects
    ]


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


def update(session: Session, subject_id: int, data: SubjectUpdate) -> SubjectRead:
    subject = session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_data = data.model_dump(exclude_unset=True)

    # Validate teacher exists if being changed
    new_teacher: Teacher | None = None
    if 'teacher_id' in update_data:
        new_teacher = session.get(Teacher, update_data['teacher_id'])
        if not new_teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

    # Validate classrooms exist if being changed
    if 'classroom_ids' in update_data:
        for cid in update_data['classroom_ids']:
            if not session.get(Classroom, cid):
                raise HTTPException(status_code=404, detail=f"Classroom {cid} not found")

    # Track what changes for cascade
    name_changed = 'name' in update_data and update_data['name'] != subject.name
    teacher_changed = 'teacher_id' in update_data and update_data['teacher_id'] != subject.teacher_id
    hours_changed = 'weekly_hours' in update_data and update_data['weekly_hours'] != subject.weekly_hours
    classroom_ids_changed = 'classroom_ids' in update_data

    # Handle classroom link changes and compute removed set before any commit
    removed_classroom_ids: set[int] = set()
    if classroom_ids_changed:
        current_links = session.exec(
            select(ClassroomSubjectLink).where(ClassroomSubjectLink.subject_id == subject_id)
        ).all()
        old_cids = {lnk.classroom_id for lnk in current_links if lnk.classroom_id is not None}
        new_cids = set(update_data['classroom_ids'])
        removed_classroom_ids = old_cids - new_cids
        added_cids = new_cids - old_cids

        for cid in removed_classroom_ids:
            session.execute(
                sql_delete(ClassroomSubjectLink).where(
                    ClassroomSubjectLink.subject_id == subject_id,
                    ClassroomSubjectLink.classroom_id == cid,
                )
            )
        for cid in added_cids:
            session.add(ClassroomSubjectLink(classroom_id=cid, subject_id=subject_id))

    # Apply scalar field updates
    for field in ('name', 'weekly_hours', 'teacher_id'):
        if field in update_data:
            setattr(subject, field, update_data[field])
    session.add(subject)
    session.flush()

    # Cascade to latest ScheduleResult when anything schedule-relevant changed
    if name_changed or teacher_changed or classroom_ids_changed or hours_changed:
        latest = session.exec(
            select(ScheduleResult).order_by(ScheduleResult.id.desc())
        ).first()
        if latest:
            lessons = json.loads(latest.lessons_json)

            if name_changed:
                for lesson in lessons:
                    if lesson.get('subject_id') == subject_id:
                        lesson['subject_name'] = update_data['name']

            if teacher_changed and new_teacher:
                for lesson in lessons:
                    if lesson.get('subject_id') == subject_id:
                        lesson['teacher_id'] = new_teacher.id
                        lesson['teacher_name'] = new_teacher.name
                latest.is_feasible = False
                latest.message = (
                    "Ders öğretmeni değiştiği için program geçerliliğini yitirdi. "
                    "Lütfen yeniden oluşturun."
                )

            if removed_classroom_ids:
                lessons = [
                    l for l in lessons
                    if not (
                        l.get('subject_id') == subject_id
                        and l.get('classroom_id') in removed_classroom_ids
                    )
                ]

            if hours_changed:
                latest.is_feasible = False
                latest.message = (
                    "Ders saati değiştiği için program geçerliliğini yitirdi. "
                    "Lütfen yeniden oluşturun."
                )

            latest.lessons_json = json.dumps(lessons)
            session.add(latest)

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
