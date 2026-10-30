import pytest


def test_list_spaces(seeded_app, client):
    """GET /api/spaces returns list of spaces."""
    resp = client.get("/api/spaces/")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    assert "spaces" in data["data"]
    assert data["data"]["total"] > 0


def test_list_spaces_filter_status(seeded_app, client):
    """GET /api/spaces?status=available filters correctly."""
    resp = client.get("/api/spaces/?status=available")
    assert resp.status_code == 200
    data = resp.get_json()
    spaces = data["data"]["spaces"]
    for space in spaces:
        assert space["status"] == "available"


def test_get_space_found(seeded_app, client):
    """GET /api/spaces/A01 returns the specific space."""
    resp = client.get("/api/spaces/A01")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["data"]["id"] == "A01"
    assert data["data"]["slot_number"] == "A01"


def test_get_space_not_found(client):
    """GET /api/spaces/ZZZZ returns 404."""
    resp = client.get("/api/spaces/ZZZZ")
    assert resp.status_code == 404
    data = resp.get_json()
    assert "error" in data


def test_create_space_valid(app, client):
    """POST /api/spaces creates a new space."""
    with app.app_context():
        from models.db import db
        from models.parking_zone import ParkingZone
        if not ParkingZone.query.get("zone-test"):
            zone = ParkingZone(id="zone-test", name="Test Zone", floor="Test Floor")
            db.session.add(zone)
            db.session.commit()

    resp = client.post("/api/spaces/", json={
        "slot_number": "TEST01",
        "zone_id": "zone-test",
        "floor": "Test Floor",
        "vehicle_type": "car",
        "hourly_rate": 45.0,
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["data"]["id"] == "TEST01"
    assert data["data"]["vehicle_type"] == "car"


def test_create_space_invalid(client):
    """POST /api/spaces without required fields returns 422."""
    resp = client.post("/api/spaces/", json={"hourly_rate": 50.0})
    assert resp.status_code == 422
    data = resp.get_json()
    assert "error" in data


def test_create_space_invalid_vehicle_type(client):
    """POST /api/spaces with invalid vehicle_type returns 422."""
    resp = client.post("/api/spaces/", json={
        "slot_number": "TEST99",
        "zone_id": "zone-a",
        "floor": "Ground",
        "vehicle_type": "spaceship",
    })
    assert resp.status_code == 422
