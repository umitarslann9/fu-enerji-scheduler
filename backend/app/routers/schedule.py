from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db.database import get_session
from app.models.schemas import Schedule
from app.services import schedule_service

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.post("/generate", response_model=Schedule, status_code=201)
def generate(session: Session = Depends(get_session)):
    return schedule_service.run_generate(session)


@router.get("", response_model=Schedule)
def get_latest(session: Session = Depends(get_session)):
    schedule = schedule_service.get_latest(session)
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule generated yet")
    return schedule
