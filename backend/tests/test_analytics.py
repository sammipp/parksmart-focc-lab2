def test_analytics_overview(seeded_app, client):
    """GET /api/analytics/overview returns summary stats."""
    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    overview = data["data"]
    assert "total_spaces" in overview
    assert "available" in overview
    assert "occupied" in overview
    assert "reserved" in overview
    assert "out_of_service" in overview
    assert "occupancy_percent" in overview
    assert "active_reservations" in overview
    assert "today_entries" in overview
    assert "today_exits" in overview
    assert "today_revenue" in overview
    assert overview["total_spaces"] > 0


def test_analytics_occupancy(seeded_app, client):
    """GET /api/analytics/occupancy returns daily occupancy trend."""
    resp = client.get("/api/analytics/occupancy?days=7")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    trend = data["data"]
    assert isinstance(trend, list)
    assert len(trend) == 7
    for entry in trend:
        assert "date" in entry
        assert "occupancy_percent" in entry


def test_analytics_revenue(seeded_app, client):
    """GET /api/analytics/revenue returns daily revenue trend."""
    resp = client.get("/api/analytics/revenue?days=7")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "data" in data
    trend = data["data"]
    assert isinstance(trend, list)
    assert len(trend) == 7
    for entry in trend:
        assert "date" in entry
        assert "revenue" in entry
