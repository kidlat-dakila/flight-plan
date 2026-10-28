from dataclasses import dataclass


@dataclass(frozen=True)
class Pokemon:
    name: str
    level: int


@dataclass(frozen=True)
class Trainer:
    id: int
    name: str
    team: list[Pokemon]
