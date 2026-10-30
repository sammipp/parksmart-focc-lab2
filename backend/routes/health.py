import logging
import sys
import time
from datetime import datetime, timezone

from flask import Blueprint, jsonify, current_app
from models.db import db
from models.parking_space import ParkingSpace
from models.vehicle_session import VehicleSession, SessionStatus

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)

_start_time = time.time()


@health_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "service": "parksmart-backend",
    }), 200


@health_bp.route("/ready", methods=["GET"])
def ready():
    checks = {}
    overall_ready = True

    # DB check
    try:
        db.session.execute(db.text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as e:
        logger.warning("DB readiness check failed: %s", e)
        checks["db"] = f"error: {str(e)}"
        overall_ready = False

    # Redis check (graceful)
    try:
        redis_client = current_app.extensions.get("redis_client")
        if redis_client:
            redis_client.ping()
            checks["redis"] = "ok"
        else:
            checks["redis"] = "unavailable"
    except Exception as e:
        logger.warning("Redis readiness check failed: %s", e)
        checks["redis"] = "unavailable"

    return jsonify({
        "ready": overall_ready,
        "checks": checks,
    }), 200 if overall_ready else 503


@health_bp.route("/info", methods=["GET"])
def info():
    return jsonify({
        "version": "1.0.0",
        "python_version": sys.version,
        "environment": current_app.config.get("FLASK_ENV", "production"),
        "uptime": round(time.time() - _start_time, 2),
    }), 200


@health_bp.route("/metrics", methods=["GET"])
def metrics():
    from app import metrics_store
    uptime_s = round(time.time() - _start_time, 2)
    req_count = metrics_store.get("request_count", 0)
    err_count = metrics_store.get("error_count", 0)
    latencies = metrics_store.get("latencies", [])
    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

    try:
        spaces_count = ParkingSpace.query.count()
    except Exception:
        spaces_count = 0
    try:
        active_sessions = VehicleSession.query.filter_by(status=SessionStatus.active).count()
    except Exception:
        active_sessions = 0

    return jsonify({
        "request_count": req_count,
        "error_count": err_count,
        "avg_latency_ms": avg_latency,
        "uptime_seconds": uptime_s,
        "db_spaces_count": spaces_count,
        "active_sessions": active_sessions,
    }), 200
