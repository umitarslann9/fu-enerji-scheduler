from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.database import get_session
from app.models.schemas import TeacherCreate, TeacherRead, TeacherUpdate
from app.services import teacher_service

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.get("", response_model=list[TeacherRead])
def list_teachers(session: Session = Depends(get_session)):
    return teacher_service.get_all(session)


@router.post("", response_model=TeacherRead, status_code=201)
def create_teacher(data: TeacherCreate, session: Session = Depends(get_session)):
    return teacher_service.create(session, data)


@router.get("/{teacher_id}", response_model=TeacherRead)
def get_teacher(teacher_id: int, session: Session = Depends(get_session)):
    return teacher_service.get_one(session, teacher_id)


@router.put(
    "/{teacher_id}",
    response_model=TeacherRead,
    description="Partial update — only provided fields are changed (PATCH semantics over PUT verb).",
)
def update_teacher(
    teacher_id: int, data: TeacherUpdate, session: Session = Depends(get_session)
):
    return teacher_service.update(session, teacher_id, data)


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, session: Session = Depends(get_session)):
    teacher_service.delete(session, teacher_id)
