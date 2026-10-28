from typing import Annotated

from fastapi import Header, HTTPException

from pokedex.settings import API_KEY


def verify_api_key(x_api_key: Annotated[str, Header()]) -> None:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="invalid API key")
