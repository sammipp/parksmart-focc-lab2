import logging
import uuid
from datetime import datetime, timedelta

from models.db import db
from models.parking_zone import ParkingZone
from models.parking_space import ParkingSpace, SpaceStatus, VehicleType
from models.reservation import Reservation, ReservationStatus
from models.vehicle_session import VehicleSession, SessionStatus

logger = logging.getLogger(__name__)


def seed_database(app, database):
    """Seed the database with demo data. Idempotent - checks before inserting."""
    with app.app_context():
        # Idempotency check
        if ParkingZone.query.count() > 0:
            logger.info("Database already seeded, skipping.")
            return

        logger.info("Seeding database with demo data...")

        # ── Zones ─────────────────────────────────────────────────────────────
        zones = [
            ParkingZone(id="zone-a", name="Zone A", floor="Ground", description="Ground floor parking"),
            ParkingZone(id="zone-b", name="Zone B", floor="Floor 1", description="First floor parking"),
            ParkingZone(id="zone-c", name="Zone C", floor="Floor 2", description="Second floor parking"),
            ParkingZone(id="zone-d", name="Zone D", floor="Rooftop", description="Rooftop parking"),
        ]
        for zone in zones:
            database.session.add(zone)

        # ── Spaces ────────────────────────────────────────────────────────────
        spaces_data = [
            # Zone A: A01-A12 (car), A13-A14 (disabled), A15 (truck)
            *[{"id": f"A{i:02d}", "zone_id": "zone-a", "floor": "Ground",
               "vehicle_type": VehicleType.car, "hourly_rate": 50.0} for i in range(1, 13)],
            {"id": "A13", "zone_id": "zone-a", "floor": "Ground", "vehicle_type": VehicleType.disabled, "hourly_rate": 30.0},
            {"id": "A14", "zone_id": "zone-a", "floor": "Ground", "vehicle_type": VehicleType.disabled, "hourly_rate": 30.0},
            {"id": "A15", "zone_id": "zone-a", "floor": "Ground", "vehicle_type": VehicleType.truck, "hourly_rate": 80.0},
            # Zone B: B01-B12 (car), B13-B14 (motorcycle)
            *[{"id": f"B{i:02d}", "zone_id": "zone-b", "floor": "Floor 1",
               "vehicle_type": VehicleType.car, "hourly_rate": 50.0} for i in range(1, 13)],
            {"id": "B13", "zone_id": "zone-b", "floor": "Floor 1", "vehicle_type": VehicleType.motorcycle, "hourly_rate": 20.0},
            {"id": "B14", "zone_id": "zone-b", "floor": "Floor 1", "vehicle_type": VehicleType.motorcycle, "hourly_rate": 20.0},
            # Zone C: C01-C10 (car), C11-C12 (motorcycle)
            *[{"id": f"C{i:02d}", "zone_id": "zone-c", "floor": "Floor 2",
               "vehicle_type": VehicleType.car, "hourly_rate": 50.0} for i in range(1, 11)],
            {"id": "C11", "zone_id": "zone-c", "floor": "Floor 2", "vehicle_type": VehicleType.motorcycle, "hourly_rate": 20.0},
            {"id": "C12", "zone_id": "zone-c", "floor": "Floor 2", "vehicle_type": VehicleType.motorcycle, "hourly_rate": 20.0},
            # Zone D: D01-D05 (car), D06 (truck)
            *[{"id": f"D{i:02d}", "zone_id": "zone-d", "floor": "Rooftop",
               "vehicle_type": VehicleType.car, "hourly_rate": 60.0} for i in range(1, 6)],
            {"id": "D06", "zone_id": "zone-d", "floor": "Rooftop", "vehicle_type": VehicleType.truck, "hourly_rate": 80.0},
        ]

        demo_statuses = {
            "A03": SpaceStatus.occupied,
            "A07": SpaceStatus.reserved,
            "A11": SpaceStatus.out_of_service,
            "B02": SpaceStatus.occupied,
            "B05": SpaceStatus.reserved,
            "C03": SpaceStatus.occupied,
            "D01": SpaceStatus.occupied,
        }

        space_objects = {}
        for sd in spaces_data:
            space = ParkingSpace(
                id=sd["id"],
                zone_id=sd["zone_id"],
                slot_number=sd["id"],
                floor=sd["floor"],
                vehicle_type=sd["vehicle_type"],
                status=demo_statuses.get(sd["id"], SpaceStatus.available),
                hourly_rate=sd["hourly_rate"],
            )
            database.session.add(space)
            space_objects[sd["id"]] = space

        database.session.flush()

        # ── Sample Reservations ───────────────────────────────────────────────
        now = datetime.utcnow()
        reservations_data = [
            # Active reservations
            {"space_id": "A07", "vehicle_reg": "BA1234", "start": now - timedelta(hours=1), "end": now + timedelta(hours=2), "status": ReservationStatus.active, "rate": 50.0},
            {"space_id": "B05", "vehicle_reg": "KA5678", "start": now - timedelta(minutes=30), "end": now + timedelta(hours=3), "status": ReservationStatus.active, "rate": 50.0},
            {"space_id": "D02", "vehicle_reg": "MH9012", "start": now + timedelta(hours=1), "end": now + timedelta(hours=4), "status": ReservationStatus.active, "rate": 60.0},
            # Completed reservations
            {"space_id": "A01", "vehicle_reg": "DL3456", "start": now - timedelta(hours=6), "end": now - timedelta(hours=4), "status": ReservationStatus.completed, "rate": 50.0},
            {"space_id": "B01", "vehicle_reg": "TN7890", "start": now - timedelta(hours=8), "end": now - timedelta(hours=5), "status": ReservationStatus.completed, "rate": 50.0},
            {"space_id": "C01", "vehicle_reg": "GJ2345", "start": now - timedelta(days=1, hours=3), "end": now - timedelta(days=1, hours=1), "status": ReservationStatus.completed, "rate": 50.0},
            {"space_id": "D03", "vehicle_reg": "PB6789", "start": now - timedelta(days=2), "end": now - timedelta(days=1, hours=22), "status": ReservationStatus.completed, "rate": 60.0},
            # Cancelled reservations
            {"space_id": "A02", "vehicle_reg": "RJ1122", "start": now - timedelta(hours=5), "end": now - timedelta(hours=3), "status": ReservationStatus.cancelled, "rate": 50.0},
            {"space_id": "B03", "vehicle_reg": "WB3344", "start": now - timedelta(hours=10), "end": now - timedelta(hours=8), "status": ReservationStatus.cancelled, "rate": 50.0},
            {"space_id": "C04", "vehicle_reg": "UP5566", "start": now - timedelta(days=1, hours=5), "end": now - timedelta(days=1, hours=3), "status": ReservationStatus.cancelled, "rate": 50.0},
        ]

        reservation_objects = []
        for rd in reservations_data:
            hours = (rd["end"] - rd["start"]).total_seconds() / 3600
            estimated_fee = round(hours * rd["rate"], 2)
            cancelled_at = now - timedelta(hours=1) if rd["status"] == ReservationStatus.cancelled else None
            res = Reservation(
                id=str(uuid.uuid4()),
                space_id=rd["space_id"],
                vehicle_reg=rd["vehicle_reg"],
                start_time=rd["start"],
                end_time=rd["end"],
                status=rd["status"],
                estimated_fee=estimated_fee,
                actual_fee=estimated_fee if rd["status"] == ReservationStatus.completed else None,
                cancelled_at=cancelled_at,
            )
            database.session.add(res)
            reservation_objects.append(res)

        database.session.flush()

        # ── Sample Vehicle Sessions ───────────────────────────────────────────
        sessions_data = [
            # Active sessions (vehicles currently parked)
            {"space_id": "A03", "vehicle_reg": "BA9876", "entry": now - timedelta(hours=2), "status": SessionStatus.active},
            {"space_id": "B02", "vehicle_reg": "KA5432", "entry": now - timedelta(hours=1, minutes=15), "status": SessionStatus.active},
            {"space_id": "C03", "vehicle_reg": "MH1098", "entry": now - timedelta(minutes=45), "status": SessionStatus.active},
            {"space_id": "D01", "vehicle_reg": "DL6543", "entry": now - timedelta(hours=3), "status": SessionStatus.active},
            # Completed sessions
            {"space_id": "A04", "vehicle_reg": "TN2109", "entry": now - timedelta(hours=5), "exit": now - timedelta(hours=3), "status": SessionStatus.completed, "rate": 50.0},
            {"space_id": "B04", "vehicle_reg": "GJ8765", "entry": now - timedelta(hours=7), "exit": now - timedelta(hours=5), "status": SessionStatus.completed, "rate": 50.0},
            {"space_id": "C05", "vehicle_reg": "PB4321", "entry": now - timedelta(hours=10), "exit": now - timedelta(hours=8), "status": SessionStatus.completed, "rate": 50.0},
            {"space_id": "D04", "vehicle_reg": "RJ9988", "entry": now - timedelta(days=1, hours=2), "exit": now - timedelta(days=1), "status": SessionStatus.completed, "rate": 60.0},
        ]

        for sd in sessions_data:
            exit_time = sd.get("exit")
            duration_minutes = None
            charge = None
            if exit_time:
                duration_seconds = (exit_time - sd["entry"]).total_seconds()
                duration_minutes = int(duration_seconds / 60)
                rate = sd.get("rate", 50.0)
                charge = round((duration_seconds / 3600) * rate, 2)

            session = VehicleSession(
                id=str(uuid.uuid4()),
                space_id=sd["space_id"],
                vehicle_reg=sd["vehicle_reg"],
                entry_time=sd["entry"],
                exit_time=exit_time,
                duration_minutes=duration_minutes,
                charge=charge,
                status=sd["status"],
            )
            database.session.add(session)

        database.session.commit()
        logger.info("Database seeded successfully.")
