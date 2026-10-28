from flask import Blueprint, Flask

from pokedex.health import bp as health_bp

app = Flask(__name__)
api = Blueprint("api", __name__, url_prefix="/api")

api.register_blueprint(health_bp)
app.register_blueprint(api)
