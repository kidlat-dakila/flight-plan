from pokedex.errors import NotFoundError
from pokedex.trainers.schemas import TrainerCreate, TrainerRead

trainers: dict[int, TrainerRead] = {}


def list_trainers() -> list[TrainerRead]:
    return sorted(trainers.values(), key=lambda trainer: trainer.name)


def find_trainer(trainer_id: int) -> TrainerRead:
    trainer = trainers.get(trainer_id)
    if trainer is None:
        raise NotFoundError("trainer", trainer_id)
    return trainer


def create_trainer(draft: TrainerCreate) -> TrainerRead:
    trainer = TrainerRead(id=len(trainers) + 1, **draft.model_dump())
    trainers[trainer.id] = trainer
    return trainer
