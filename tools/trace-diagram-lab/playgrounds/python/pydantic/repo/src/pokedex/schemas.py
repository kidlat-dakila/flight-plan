from pydantic import BaseModel, Field, field_validator

from pokedex.types import POKEMON_TYPES


class PokemonEntry(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    types: list[str] = Field(min_length=1, max_length=2)
    level: int = Field(default=5, ge=1, le=100)

    @field_validator("types")
    @classmethod
    def check_types(cls, types: list[str]) -> list[str]:
        unknown = [name for name in types if name not in POKEMON_TYPES]
        if unknown:
            raise ValueError(f"unknown types: {', '.join(unknown)}")
        return types


class Trainer(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    hometown: str
    team: list[PokemonEntry] = Field(default_factory=list, max_length=6)
