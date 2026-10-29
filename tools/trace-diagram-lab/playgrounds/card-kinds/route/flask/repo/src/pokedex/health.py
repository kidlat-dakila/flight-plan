from flask import Blueprint

bp = Blueprint("health", __name__)


@bp.get("/health")
def read_health():
    return {"status": "ok"}
