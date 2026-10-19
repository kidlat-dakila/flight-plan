from sqlalchemy import select
from sqlalchemy.orm import Session

from pokedex.errors import NotFoundError
from pokedex.trainers.models import Trainer
from pokedex.trainers.schemas import TrainerCreate


def list_trainers(session: Session) -> list[Trainer]:
    return list(session.scalars(select(Trainer).order_by(Trainer.name)))


def find_trainer(session: Session, trainer_id: int) -> Trainer:
    trainer = session.get(Trainer, trainer_id)
    if trainer is None:
        raise NotFoundError("trainer", trainer_id)
    return trainer


def create_trainer(session: Session, draft: TrainerCreate) -> Trainer:
    trainer = Trainer(**draft.model_dump())
    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    return trainer
