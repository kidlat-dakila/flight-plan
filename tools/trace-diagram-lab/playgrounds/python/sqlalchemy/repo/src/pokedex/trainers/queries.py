from sqlalchemy import select
from sqlalchemy.orm import Session

from pokedex.models import Trainer


def list_trainers(session: Session) -> list[Trainer]:
    return list(session.scalars(select(Trainer).order_by(Trainer.name)))


def find_trainer(session: Session, trainer_id: int) -> Trainer:
    return session.scalars(select(Trainer).where(Trainer.id == trainer_id)).one()
