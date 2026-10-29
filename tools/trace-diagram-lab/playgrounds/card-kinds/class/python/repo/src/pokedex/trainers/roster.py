from .models import Pokemon, Trainer

TRAINERS = [
    Trainer(id=1, name="Ash", team=[Pokemon(name="Pikachu", level=25), Pokemon(name="Charizard", level=36)]),
    Trainer(id=2, name="Misty", team=[Pokemon(name="Starmie", level=30)]),
]


class TrainerRoster:
    def __init__(self) -> None:
        self.trainers_by_id = {trainer.id: trainer for trainer in TRAINERS}

    def find_trainer(self, trainer_id: int) -> Trainer | None:
        return self.trainers_by_id.get(trainer_id)
