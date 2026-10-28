from ..models import Pokemon
from ..team import Team


def describe_pokemon(pokemon: Pokemon) -> str:
    return f"{pokemon.name} ({'/'.join(pokemon.types)}) Lv. {pokemon.level}"


def describe_team(team: Team) -> str:
    lines = [describe_pokemon(pokemon) for pokemon in team.members]
    return "\n".join([f"{team.trainer.name}'s team", *lines])
