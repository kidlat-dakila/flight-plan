from sqlalchemy.orm import Session

from pokedex.database import engine
from pokedex.pokemon.queries import list_pokemon_of
from pokedex.trainers.queries import find_trainer


def team_report(trainer_id: int) -> str:
    with Session(engine) as session:
        trainer = find_trainer(session, trainer_id)
        lines = [f"{pokemon.name} Lv. {pokemon.level}" for pokemon in list_pokemon_of(session, trainer_id)]
    return "\n".join([f"{trainer.name} of {trainer.hometown}", *lines])
