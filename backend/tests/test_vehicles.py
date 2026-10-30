def test_active_vehicles(seeded_app, client):
    """GET /api/vehicles/active returns active sessions."""
    resp = client.get("/api/vehicles/active")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    assert isinstance(data["data"], list)


def test_vehicle_entry(seeded_app, client):
    """POST /api/vehicles/entry records a vehicle entry."""
    resp = client.post("/api/vehicles/entry", json={
        "space_id": "B06",
        "vehicle_reg": "ENTRY001",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["data"]["vehicle_reg"] == "ENTRY001"
    assert data["data"]["space_id"] == "B06"
    assert data["data"]["status"] == "active"
    assert data["data"]["entry_time"] is not None


def test_vehicle_entry_invalid(client):
    """POST /api/vehicles/entry without space_id returns 422."""
    resp = client.post("/api/vehicles/entry", json={"vehicle_reg": "NOSPACE"})
    assert resp.status_code == 422


def test_vehicle_entry_nonexistent_space(client):
    """POST /api/vehicles/entry with nonexistent space returns 404."""
    resp = client.post("/api/vehicles/entry", json={
        "space_id": "ZZZZZ",
        "vehicle_reg": "GHOST001",
    })
    assert resp.status_code == 404


def test_vehicle_exit(seeded_app, client):
    """POST /api/vehicles/exit records a vehicle exit and calculates charge."""
    # First record an entry
    entry_resp = client.post("/api/vehicles/entry", json={
        "space_id": "B07",
        "vehicle_reg": "EXIT001",
    })
    assert entry_resp.status_code == 201
    session_id = entry_resp.get_json()["data"]["id"]

    # Then record exit by session_id
    exit_resp = client.post("/api/vehicles/exit", json={"session_id": session_id})
    assert exit_resp.status_code == 200
    data = exit_resp.get_json()
    assert data["data"]["status"] == "completed"
    assert data["data"]["exit_time"] is not None
    assert data["data"]["charge"] is not None


def test_vehicle_exit_no_active_session(client):
    """POST /api/vehicles/exit for unknown session returns 404."""
    resp = client.post("/api/vehicles/exit", json={"session_id": "nonexistent-session-xyz"})
    assert resp.status_code == 404


def test_vehicle_history(seeded_app, client):
    """GET /api/vehicles/history returns completed sessions."""
    resp = client.get("/api/vehicles/history")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    assert "sessions" in data["data"]
