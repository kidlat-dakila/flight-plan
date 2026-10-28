from dataclasses import dataclass, field


@dataclass(frozen=True)
class Pokemon:
    name: str
    types: tuple[str, ...]
    level: int = 5


@dataclass
class Trainer:
    name: str
    hometown: str
    badges: list[str] = field(default_factory=list)
