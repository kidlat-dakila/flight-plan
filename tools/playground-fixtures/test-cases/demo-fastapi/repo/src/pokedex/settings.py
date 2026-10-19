import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./pokedex.db")
API_KEY = os.environ.get("POKEDEX_API_KEY", "dev-key")
