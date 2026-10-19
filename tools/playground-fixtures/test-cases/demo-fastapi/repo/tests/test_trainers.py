from fastapi.testclient import TestClient

from pokedex.main import app
from pokedex.settings import API_KEY

client = TestClient(app, headers={"x-api-key": API_KEY})


def test_add_trainer_returns_the_new_trainer():
    response = client.post("/api/trainers/", json={"name": "Ash", "hometown": "Pallet Town"})
    assert response.status_code == 201
    assert response.json()["name"] == "Ash"
