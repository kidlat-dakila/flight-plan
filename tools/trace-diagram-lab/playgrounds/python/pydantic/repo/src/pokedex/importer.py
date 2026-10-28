from pathlib import Path

from pokedex.schemas import Trainer


def read_trainer(path: Path) -> Trainer:
    return Trainer.model_validate_json(path.read_text())
