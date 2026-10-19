from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from pokedex.database import Base


class Trainer(Base):
    __tablename__ = "trainers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    hometown: Mapped[str] = mapped_column(String(40))
