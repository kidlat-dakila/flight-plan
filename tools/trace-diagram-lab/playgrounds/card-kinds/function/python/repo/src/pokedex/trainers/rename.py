from dataclasses import replace

from .store import load_trainers, save_trainer
from .trainer import Trainer


def rename_trainer(trainer_id: int, name: str) -> Trainer:
    trainer = next(stored for stored in load_trainers() if stored.id == trainer_id)
    renamed = replace(trainer, name=name)
    save_trainer(renamed)
    return renamed
