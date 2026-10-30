import logging
import uuid
from datetime import datetime, timezone

from models.db import db
from models.vehicle_session import VehicleSession, SessionStatus
from models.parking_space import ParkingSpace, SpaceStatus

logger = logging.getLogger(__name__)


def get_active_vehicles():
    """Return all currently active vehicle sessions."""
    try:
        sessions = VehicleSession.query.filter_by(status=SessionStatus.active).all()
        return [s.to_dict() for s in sessions]
    except Exception as exc:
        logger.exception("Error fetching active vehicles: %s", exc)
        raise


def get_vehicle_history(page=1, per_page=50):
    """Return paginated completed vehicle sessions."""
    try:
        query = VehicleSession.query.filter_by(status=SessionStatus.completed)
        total = query.count()
        sessions = (
            query.order_by(VehicleSession.exit_time.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "sessions": [s.to_dict() for s in sessions],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page else 1,
        }
    except Exception as exc:
        logger.exception("Error fetching vehicle history: %s", exc)
        raise


def record_entry(data):
    """Record a vehicle entry. Returns (session, error_message)."""
    try:
        space_id = data.get("space_id", "").strip()
        if not space_id:
            return None, "space_id is required"
        vehicle_reg = data.get("vehicle_reg", "").strip()
        if not vehicle_reg:
            return None, "vehicle_reg is required"

        space = ParkingSpace.query.get(space_id)
        if not space:
            return None, f"Space '{space_id}' not found"
        if space.status == SpaceStatus.out_of_service:
            return None, f"Space '{space_id}' is out of service"
        if space.status == SpaceStatus.occupied:
            return None, f"Space '{space_id}' is already occupied"

        reservation_id = data.get("reservation_id")
        entry_time_raw = data.get("entry_time")
        if entry_time_raw:
            try:
                if isinstance(entry_time_raw, datetime):
                    entry_time = entry_time_raw
                else:
                    entry_time = datetime.fromisoformat(str(entry_time_raw).replace("Z", "+00:00"))
                if entry_time.tzinfo is not None:
                    entry_time = entry_time.replace(tzinfo=None)
            except ValueError:
                entry_time = datetime.now(timezone.utc).replace(tzinfo=None)
        else:
            entry_time = datetime.now(timezone.utc).replace(tzinfo=None)

        session = VehicleSession(
            id=str(uuid.uuid4()),
            space_id=space_id,
            reservation_id=reservation_id or None,
            vehicle_reg=vehicle_reg,
            entry_time=entry_time,
            status=SessionStatus.active,
        )
        space.status = SpaceStatus.occupied
        db.session.add(session)
        db.session.commit()
        logger.info("Recorded entry for vehicle %s at space %s", vehicle_reg, space_id)
        return session, None
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error recording entry: %s", exc)
        raise


def record_exit(data):
    """Record a vehicle exit. Returns (session, error_message)."""
    try:
        space_id = data.get("space_id", "").strip() if data.get("space_id") else None
        session_id = data.get("session_id", "").strip() if data.get("session_id") else None

        if not space_id and not session_id:
            return None, "Either space_id or session_id is required"

        session = None
        if session_id:
            session = VehicleSession.query.filter_by(
                id=session_id, status=SessionStatus.active
            ).first()
        if not session and space_id:
            session = VehicleSession.query.filter_by(
                space_id=space_id, status=SessionStatus.active
            ).first()

        if not session:
            return None, "No active session found"

        exit_time = datetime.now(timezone.utc).replace(tzinfo=None)
        session.exit_time = exit_time
        duration_seconds = (exit_time - session.entry_time).total_seconds()
        session.duration_minutes = int(duration_seconds / 60)

        space = ParkingSpace.query.get(session.space_id)
        hourly_rate = space.hourly_rate if space else 50.0
        session.charge = round((duration_seconds / 3600) * hourly_rate, 2)
        session.status = SessionStatus.completed

        if space:
            space.status = SpaceStatus.available

        db.session.commit()
        logger.info("Recorded exit for session %s, charge %.2f", session.id, session.charge)
        return session, None
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error recording exit: %s", exc)
        raise
