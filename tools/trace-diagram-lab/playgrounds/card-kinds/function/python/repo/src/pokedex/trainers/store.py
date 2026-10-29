from .trainer import Trainer

TRAINERS_BY_ID: dict[int, Trainer] = {
    2: Trainer(id=2, name="Misty", hometown="Cerulean City", badges=["Cascade Badge"]),
    1: Trainer(id=1, name="Ash", hometown="Pallet Town", badges=["Boulder Badge", "Cascade Badge"]),
}


def load_trainers() -> list[Trainer]:
    return list(TRAINERS_BY_ID.values())


def save_trainer(trainer: Trainer) -> None:
    TRAINERS_BY_ID[trainer.id] = trainer
