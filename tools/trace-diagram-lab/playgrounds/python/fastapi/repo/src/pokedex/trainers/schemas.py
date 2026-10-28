from pydantic import BaseModel, Field


class TrainerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    hometown: str = Field(min_length=1, max_length=40)


class TrainerRead(TrainerCreate):
    id: int
    badges: list[str] = Field(default_factory=list)
