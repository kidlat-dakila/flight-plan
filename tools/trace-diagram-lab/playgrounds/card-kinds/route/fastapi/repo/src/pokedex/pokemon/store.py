from dataclasses import dataclass


@dataclass(frozen=True)
class Pokemon:
    id: int
    trainer: str
    name: str
    level: int


party: dict[int, Pokemon] = {}


def list_pokemon(trainer: str) -> list[Pokemon]:
    return [pokemon for pokemon in party.values() if pokemon.trainer == trainer]


def find_pokemon(pokemon_id: int) -> Pokemon | None:
    return party.get(pokemon_id)


def save_pokemon(pokemon: Pokemon) -> Pokemon:
    party[pokemon.id] = pokemon
    return pokemon


def remove_pokemon(pokemon_id: int) -> None:
    party.pop(pokemon_id, None)
