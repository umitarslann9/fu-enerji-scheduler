from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.database import get_session
from app.models.schemas import SubjectCreate, SubjectRead, SubjectUpdate
from app.services import subject_service

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectRead])
def list_subjects(session: Session = Depends(get_session)):
    return subject_service.get_all(session)


@router.post("", response_model=SubjectRead, status_code=201)
def create_subject(data: SubjectCreate, session: Session = Depends(get_session)):
    return subject_service.create(session, data)


@router.get("/{subject_id}", response_model=SubjectRead)
def get_subject(subject_id: int, session: Session = Depends(get_session)):
    return subject_service.get_one(session, subject_id)


@router.put("/{subject_id}", response_model=SubjectRead)
def update_subject(subject_id: int, data: SubjectUpdate, session: Session = Depends(get_session)):
    return subject_service.update(session, subject_id, data)


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: int, session: Session = Depends(get_session)):
    subject_service.delete(session, subject_id)
