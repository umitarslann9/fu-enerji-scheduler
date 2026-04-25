from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.database import get_session
from app.models.schemas import ClassroomCreate, ClassroomRead, ClassroomUpdate
from app.services import classroom_service

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


@router.get("", response_model=list[ClassroomRead])
def list_classrooms(session: Session = Depends(get_session)):
    return classroom_service.get_all(session)


@router.post("", response_model=ClassroomRead, status_code=201)
def create_classroom(data: ClassroomCreate, session: Session = Depends(get_session)):
    return classroom_service.create(session, data)


@router.get("/{classroom_id}", response_model=ClassroomRead)
def get_classroom(classroom_id: int, session: Session = Depends(get_session)):
    return classroom_service.get_one(session, classroom_id)


@router.put("/{classroom_id}", response_model=ClassroomRead)
def update_classroom(
    classroom_id: int, data: ClassroomUpdate, session: Session = Depends(get_session)
):
    return classroom_service.update(session, classroom_id, data)


@router.delete("/{classroom_id}", status_code=204)
def delete_classroom(classroom_id: int, session: Session = Depends(get_session)):
    classroom_service.delete(session, classroom_id)
