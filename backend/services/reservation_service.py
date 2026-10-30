import logging
import uuid
from datetime import datetime, timezone, date

from models.db import db
from models.reservation import Reservation, ReservationStatus
from models.parking_space import ParkingSpace, SpaceStatus

logger = logging.getLogger(__name__)


def get_all_reservations(status=None, date_filter=None, page=1, per_page=50):
    """Return paginated list of reservations with optional filters."""
    try:
        query = Reservation.query
        if status:
            try:
                status_enum = ReservationStatus(status)
                query = query.filter(Reservation.status == status_enum)
            except ValueError:
                pass
        if date_filter:
            try:
                if isinstance(date_filter, str):
                    filter_date = date.fromisoformat(date_filter)
                else:
                    filter_date = date_filter
                day_start = datetime(filter_date.year, filter_date.month, filter_date.day, 0, 0, 0)
                day_end = datetime(filter_date.year, filter_date.month, filter_date.day, 23, 59, 59)
                query = query.filter(
                    Reservation.start_time >= day_start,
                    Reservation.start_time <= day_end,
                )
            except Exception:
                pass
        total = query.count()
        reservations = query.order_by(Reservation.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
        return {
            "reservations": [r.to_dict() for r in reservations],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page else 1,
        }
    except Exception as exc:
        logger.exception("Error fetching reservations: %s", exc)
        raise


def get_reservation_by_id(reservation_id):
    """Return a single reservation by id or None."""
    try:
        return Reservation.query.get(reservation_id)
    except Exception as exc:
        logger.exception("Error fetching reservation %s: %s", reservation_id, exc)
        raise


def create_reservation(data):
    """
    Validate data, check for conflicts, create a Reservation and update space status.
    Returns (reservation, error_message).
    """
    try:
        space_id = data.get("space_id", "").strip()
        if not space_id:
            return None, "space_id is required"
        vehicle_reg = data.get("vehicle_reg", "").strip()
        if not vehicle_reg:
            return None, "vehicle_reg is required"

        start_time_raw = data.get("start_time")
        end_time_raw = data.get("end_time")
        if not start_time_raw or not end_time_raw:
            return None, "start_time and end_time are required"

        try:
            if isinstance(start_time_raw, datetime):
                start_time = start_time_raw
            else:
                start_time = datetime.fromisoformat(str(start_time_raw).replace("Z", "+00:00"))
            if isinstance(end_time_raw, datetime):
                end_time = end_time_raw
            else:
                end_time = datetime.fromisoformat(str(end_time_raw).replace("Z", "+00:00"))
        except ValueError as e:
            return None, f"Invalid datetime format: {e}"

        # Make naive for comparison if needed
        if start_time.tzinfo is not None:
            start_time = start_time.replace(tzinfo=None)
        if end_time.tzinfo is not None:
            end_time = end_time.replace(tzinfo=None)

        if end_time <= start_time:
            return None, "end_time must be after start_time"

        space = ParkingSpace.query.get(space_id)
        if not space:
            return None, f"Space '{space_id}' not found"
        if space.status == SpaceStatus.out_of_service:
            return None, f"Space '{space_id}' is out of service"

        # Conflict check: overlapping active reservations
        conflict = Reservation.query.filter(
            Reservation.space_id == space_id,
            Reservation.status == ReservationStatus.active,
            Reservation.start_time < end_time,
            Reservation.end_time > start_time,
        ).first()
        if conflict:
            return None, f"Space '{space_id}' already has an overlapping active reservation"

        hours = (end_time - start_time).total_seconds() / 3600
        estimated_fee = round(hours * space.hourly_rate, 2)

        reservation = Reservation(
            id=str(uuid.uuid4()),
            space_id=space_id,
            vehicle_reg=vehicle_reg,
            start_time=start_time,
            end_time=end_time,
            status=ReservationStatus.active,
            estimated_fee=estimated_fee,
        )

        # Update space status to reserved only if currently available
        if space.status == SpaceStatus.available:
            space.status = SpaceStatus.reserved

        db.session.add(reservation)
        db.session.commit()
        logger.info("Created reservation %s for space %s", reservation.id, space_id)
        return reservation, None
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error creating reservation: %s", exc)
        raise


def cancel_reservation(reservation_id):
    """Cancel a reservation and free the space if it was reserved."""
    try:
        reservation = Reservation.query.get(reservation_id)
        if not reservation:
            return None, "Reservation not found"
        if reservation.status != ReservationStatus.active:
            return None, f"Reservation is already {reservation.status.value}"

        reservation.status = ReservationStatus.cancelled
        reservation.cancelled_at = datetime.now(timezone.utc).replace(tzinfo=None)

        space = ParkingSpace.query.get(reservation.space_id)
        if space and space.status == SpaceStatus.reserved:
            space.status = SpaceStatus.available

        db.session.commit()
        logger.info("Cancelled reservation %s", reservation_id)
        return reservation, None
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error cancelling reservation %s: %s", reservation_id, exc)
        raise
