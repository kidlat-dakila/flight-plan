from sqlalchemy import select
from sqlalchemy.orm import Session

from pokedex.models import Pokemon


def list_pokemon_of(session: Session, trainer_id: int) -> list[Pokemon]:
    return list(session.scalars(select(Pokemon).where(Pokemon.trainer_id == trainer_id).order_by(Pokemon.name)))
