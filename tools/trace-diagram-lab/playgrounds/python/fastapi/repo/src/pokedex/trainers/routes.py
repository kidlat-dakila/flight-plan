from fastapi import APIRouter

from pokedex.trainers.dependencies import TrainerDep
from pokedex.trainers.schemas import TrainerCreate, TrainerRead
from pokedex.trainers.service import create_trainer, list_trainers

router = APIRouter(prefix="/trainers", tags=["trainers"])


@router.get("/", response_model=list[TrainerRead])
def read_trainers():
    return list_trainers()


@router.get("/{trainer_id}", response_model=TrainerRead)
def read_trainer(trainer: TrainerDep):
    return trainer


@router.post("/", response_model=TrainerRead, status_code=201)
def add_trainer(draft: TrainerCreate):
    return create_trainer(draft)
