import logging
import time

from flask import Blueprint, jsonify, current_app
from models.db import db
from models.parking_space import ParkingSpace
from models.vehicle_session import VehicleSession, SessionStatus
from models.reservation import Reservation, ReservationStatus

logger = logging.getLogger(__name__)

system_bp = Blueprint("system", __name__)

_start_time = time.time()


@system_bp.route("/status", methods=["GET"])
def system_status():
    uptime = round(time.time() - _start_time, 2)

    # DB status
    try:
        db.session.execute(db.text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Redis status (graceful)
    try:
        redis_client = current_app.extensions.get("redis_client")
        if redis_client:
            redis_client.ping()
            redis_status = "ok"
        else:
            redis_status = "unavailable"
    except Exception:
        redis_status = "unavailable"

    try:
        spaces_count = ParkingSpace.query.count()
    except Exception:
        spaces_count = 0
    try:
        active_sessions = VehicleSession.query.filter_by(status=SessionStatus.active).count()
    except Exception:
        active_sessions = 0
    try:
        active_reservations = Reservation.query.filter_by(status=ReservationStatus.active).count()
    except Exception:
        active_reservations = 0

    return jsonify({
        "uptime": uptime,
        "version": "1.0.0",
        "db_status": db_status,
        "redis_status": redis_status,
        "spaces_count": spaces_count,
        "active_sessions": active_sessions,
        "active_reservations": active_reservations,
    }), 200
