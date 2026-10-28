from sqlalchemy import text
from sqlalchemy.orm import Session

from pokedex.database import engine


def database_is_up() -> bool:
    with Session(engine) as session:
        return session.scalar(text("SELECT 1")) == 1
