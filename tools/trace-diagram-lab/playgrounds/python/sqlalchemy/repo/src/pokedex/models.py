from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from pokedex.database import Base


class Trainer(Base):
    __tablename__ = "trainers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    hometown: Mapped[str] = mapped_column(String(40))
    pokemon: Mapped[list["Pokemon"]] = relationship(back_populates="trainer")


class Pokemon(Base):
    __tablename__ = "pokemon"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    level: Mapped[int] = mapped_column(default=5)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("trainers.id"))
    trainer: Mapped[Trainer] = relationship(back_populates="pokemon")
