from fastapi import FastAPI

from pokedex.health.routes import router as health_router

app = FastAPI(title="Pokedex")

app.include_router(health_router)
