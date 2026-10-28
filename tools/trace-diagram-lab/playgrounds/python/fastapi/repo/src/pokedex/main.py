from fastapi import Depends, FastAPI

from pokedex.errors import NotFoundError, not_found_handler
from pokedex.health.routes import router as health_router
from pokedex.middleware import RequestLogMiddleware
from pokedex.security import verify_api_key
from pokedex.trainers.routes import router as trainers_router

app = FastAPI(title="Pokedex")
app.add_middleware(RequestLogMiddleware)
app.add_exception_handler(NotFoundError, not_found_handler)

app.include_router(health_router)
app.include_router(trainers_router, prefix="/api", dependencies=[Depends(verify_api_key)])
