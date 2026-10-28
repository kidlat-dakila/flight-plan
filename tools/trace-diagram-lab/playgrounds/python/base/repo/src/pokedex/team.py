from .models import Pokemon, Trainer
from .rules import has_room


class TeamFullError(Exception):
    pass


class Team:
    def __init__(self, trainer: Trainer):
        self.trainer = trainer
        self.members: list[Pokemon] = []

    def add(self, pokemon: Pokemon) -> None:
        if not has_room(len(self.members)):
            raise TeamFullError(self.trainer.name)
        self.members.append(pokemon)

    def strongest(self) -> Pokemon | None:
        return max(self.members, key=lambda pokemon: pokemon.level, default=None)
