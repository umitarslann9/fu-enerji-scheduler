from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.database import get_session
from app.services import seed_service

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("", status_code=201)
def run_seed(session: Session = Depends(get_session)):
    return seed_service.seed(session)
