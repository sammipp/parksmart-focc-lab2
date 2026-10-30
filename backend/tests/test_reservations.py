from datetime import datetime, timedelta


def test_list_reservations(seeded_app, client):
    """GET /api/reservations returns list of reservations."""
    resp = client.get("/api/reservations/")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    assert "reservations" in data["data"]
    assert data["data"]["total"] > 0


def test_create_reservation_valid(seeded_app, client):
    """POST /api/reservations creates a new reservation."""
    start = (datetime.utcnow() + timedelta(hours=10)).isoformat()
    end = (datetime.utcnow() + timedelta(hours=12)).isoformat()
    resp = client.post("/api/reservations/", json={
        "space_id": "A01",
        "vehicle_reg": "TEST1234",
        "start_time": start,
        "end_time": end,
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["data"]["vehicle_reg"] == "TEST1234"
    assert data["data"]["status"] == "active"
    assert data["data"]["estimated_fee"] > 0


def test_create_reservation_invalid_data(client):
    """POST /api/reservations without required fields returns 422."""
    resp = client.post("/api/reservations/", json={"vehicle_reg": "ABC123"})
    assert resp.status_code == 422
    data = resp.get_json()
    assert "error" in data


def test_create_reservation_bad_times(client):
    """POST /api/reservations with end_time before start_time returns 422."""
    start = (datetime.utcnow() + timedelta(hours=5)).isoformat()
    end = (datetime.utcnow() + timedelta(hours=2)).isoformat()
    resp = client.post("/api/reservations/", json={
        "space_id": "A02",
        "vehicle_reg": "XYZ999",
        "start_time": start,
        "end_time": end,
    })
    assert resp.status_code == 422


def test_create_reservation_conflict(seeded_app, client):
    """POST /api/reservations with overlapping times returns 409."""
    # First reservation
    start = (datetime.utcnow() + timedelta(hours=20)).isoformat()
    end = (datetime.utcnow() + timedelta(hours=22)).isoformat()
    resp1 = client.post("/api/reservations/", json={
        "space_id": "C09",
        "vehicle_reg": "CONF001",
        "start_time": start,
        "end_time": end,
    })
    assert resp1.status_code == 201

    # Overlapping reservation
    start2 = (datetime.utcnow() + timedelta(hours=21)).isoformat()
    end2 = (datetime.utcnow() + timedelta(hours=23)).isoformat()
    resp2 = client.post("/api/reservations/", json={
        "space_id": "C09",
        "vehicle_reg": "CONF002",
        "start_time": start2,
        "end_time": end2,
    })
    assert resp2.status_code == 409


def test_cancel_reservation(seeded_app, client, app):
    """PATCH /api/reservations/<id>/cancel cancels a reservation."""
    # Create a reservation to cancel
    start = (datetime.utcnow() + timedelta(hours=30)).isoformat()
    end = (datetime.utcnow() + timedelta(hours=32)).isoformat()
    create_resp = client.post("/api/reservations/", json={
        "space_id": "A06",
        "vehicle_reg": "CANC001",
        "start_time": start,
        "end_time": end,
    })
    assert create_resp.status_code == 201
    res_id = create_resp.get_json()["data"]["id"]

    cancel_resp = client.patch(f"/api/reservations/{res_id}/cancel")
    assert cancel_resp.status_code == 200
    data = cancel_resp.get_json()
    assert data["data"]["status"] == "cancelled"


def test_cancel_nonexistent_reservation(client):
    """PATCH /api/reservations/<bad-id>/cancel returns 404."""
    resp = client.patch("/api/reservations/nonexistent-id-12345/cancel")
    assert resp.status_code == 404
