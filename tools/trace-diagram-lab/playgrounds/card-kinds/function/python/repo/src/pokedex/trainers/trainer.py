from dataclasses import dataclass, field


@dataclass(frozen=True)
class Trainer:
    id: int
    name: str
    hometown: str
    badges: list[str] = field(default_factory=list)
