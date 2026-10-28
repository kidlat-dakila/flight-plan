from typing import Annotated

from fastapi import Depends, Path

from pokedex.trainers.schemas import TrainerRead
from pokedex.trainers.service import find_trainer


def get_trainer(trainer_id: Annotated[int, Path(gt=0)]) -> TrainerRead:
    return find_trainer(trainer_id)


TrainerDep = Annotated[TrainerRead, Depends(get_trainer)]
