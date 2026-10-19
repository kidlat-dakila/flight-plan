from fastapi import APIRouter

from pokedex.database import SessionDep
from pokedex.trainers.schemas import TrainerCreate, TrainerRead
from pokedex.trainers.service import create_trainer, find_trainer, list_trainers

router = APIRouter(prefix="/trainers", tags=["trainers"])


@router.get("/", response_model=list[TrainerRead])
def read_trainers(session: SessionDep):
    return list_trainers(session)


@router.get("/{trainer_id}", response_model=TrainerRead)
def read_trainer(trainer_id: int, session: SessionDep):
    return find_trainer(session, trainer_id)


@router.post("/", response_model=TrainerRead, status_code=201)
def add_trainer(draft: TrainerCreate, session: SessionDep):
    return create_trainer(session, draft)
