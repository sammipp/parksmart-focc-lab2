import logging
from models.db import db
from models.parking_space import ParkingSpace, SpaceStatus, VehicleType

logger = logging.getLogger(__name__)


def get_all_spaces(status=None, zone=None, vehicle_type=None, page=1, per_page=50):
    """Return paginated list of parking spaces with optional filters."""
    try:
        query = ParkingSpace.query
        if status:
            try:
                status_enum = SpaceStatus(status)
                query = query.filter(ParkingSpace.status == status_enum)
            except ValueError:
                pass
        if zone:
            query = query.filter(ParkingSpace.zone_id == zone)
        if vehicle_type:
            try:
                vtype_enum = VehicleType(vehicle_type)
                query = query.filter(ParkingSpace.vehicle_type == vtype_enum)
            except ValueError:
                pass
        total = query.count()
        spaces = query.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "spaces": [s.to_dict() for s in spaces],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page else 1,
        }
    except Exception as exc:
        logger.exception("Error fetching spaces: %s", exc)
        raise


def get_space_by_id(space_id):
    """Return a single parking space by id or None."""
    try:
        return ParkingSpace.query.get(space_id)
    except Exception as exc:
        logger.exception("Error fetching space %s: %s", space_id, exc)
        raise


def create_space(data):
    """Create a new parking space from dict data."""
    try:
        slot_number = data.get("slot_number", "").strip()
        if not slot_number:
            raise ValueError("slot_number is required")
        zone_id = data.get("zone_id", "").strip()
        if not zone_id:
            raise ValueError("zone_id is required")
        floor = data.get("floor", "").strip()
        if not floor:
            raise ValueError("floor is required")

        vehicle_type_str = data.get("vehicle_type", "car")
        try:
            vehicle_type = VehicleType(vehicle_type_str)
        except ValueError:
            raise ValueError(f"Invalid vehicle_type: {vehicle_type_str}")

        status_str = data.get("status", "available")
        try:
            status = SpaceStatus(status_str)
        except ValueError:
            raise ValueError(f"Invalid status: {status_str}")

        hourly_rate = float(data.get("hourly_rate", 50.0))

        space = ParkingSpace(
            id=slot_number,
            zone_id=zone_id,
            slot_number=slot_number,
            floor=floor,
            vehicle_type=vehicle_type,
            status=status,
            hourly_rate=hourly_rate,
        )
        db.session.add(space)
        db.session.commit()
        logger.info("Created parking space %s", slot_number)
        return space
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error creating space: %s", exc)
        raise


def update_space(space_id, data):
    """Update fields of an existing parking space."""
    try:
        space = ParkingSpace.query.get(space_id)
        if not space:
            return None

        if "floor" in data:
            space.floor = data["floor"]
        if "hourly_rate" in data:
            space.hourly_rate = float(data["hourly_rate"])
        if "vehicle_type" in data:
            try:
                space.vehicle_type = VehicleType(data["vehicle_type"])
            except ValueError:
                raise ValueError(f"Invalid vehicle_type: {data['vehicle_type']}")
        if "status" in data:
            try:
                space.status = SpaceStatus(data["status"])
            except ValueError:
                raise ValueError(f"Invalid status: {data['status']}")
        if "zone_id" in data:
            space.zone_id = data["zone_id"]

        db.session.commit()
        logger.info("Updated parking space %s", space_id)
        return space
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error updating space %s: %s", space_id, exc)
        raise


VALID_TRANSITIONS = {
    SpaceStatus.available: [SpaceStatus.reserved, SpaceStatus.occupied, SpaceStatus.out_of_service],
    SpaceStatus.reserved: [SpaceStatus.available, SpaceStatus.occupied, SpaceStatus.out_of_service],
    SpaceStatus.occupied: [SpaceStatus.available, SpaceStatus.out_of_service],
    SpaceStatus.out_of_service: [SpaceStatus.available],
}


def update_space_status(space_id, status_str):
    """Update only the status of a parking space with transition validation."""
    try:
        space = ParkingSpace.query.get(space_id)
        if not space:
            return None, "Space not found"
        try:
            new_status = SpaceStatus(status_str)
        except ValueError:
            return None, f"Invalid status: {status_str}"

        allowed = VALID_TRANSITIONS.get(space.status, [])
        if new_status not in allowed:
            return (
                None,
                f"Cannot transition from '{space.status.value}' to '{new_status.value}'",
            )

        space.status = new_status
        db.session.commit()
        logger.info("Updated space %s status to %s", space_id, status_str)
        return space, None
    except Exception as exc:
        db.session.rollback()
        logger.exception("Error updating space status %s: %s", space_id, exc)
        raise
