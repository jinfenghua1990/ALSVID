from fastapi.testclient import TestClient

from alsvid.main import app


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "alsvid"
