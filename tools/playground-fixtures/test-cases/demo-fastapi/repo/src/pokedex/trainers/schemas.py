from pydantic import BaseModel, ConfigDict, Field


class TrainerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    hometown: str = Field(min_length=1, max_length=40)


class TrainerRead(TrainerCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
