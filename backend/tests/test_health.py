def test_health(client):
    """GET /api/health returns 200 with status healthy."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "parksmart-backend"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data


def test_ready(client):
    """GET /api/ready returns ready status with db check."""
    resp = client.get("/api/ready")
    assert resp.status_code in (200, 503)
    data = resp.get_json()
    assert "ready" in data
    assert "checks" in data
    assert "db" in data["checks"]
    assert "redis" in data["checks"]


def test_info(client):
    """GET /api/info returns version and environment info."""
    resp = client.get("/api/info")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "version" in data
    assert "python_version" in data
    assert "environment" in data
    assert "uptime" in data


def test_metrics(client):
    """GET /api/metrics returns metric counters."""
    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "request_count" in data
    assert "error_count" in data
    assert "avg_latency_ms" in data
    assert "uptime_seconds" in data
    assert "db_spaces_count" in data
    assert "active_sessions" in data
