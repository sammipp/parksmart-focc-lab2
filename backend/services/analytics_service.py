import logging
from datetime import datetime, timezone, timedelta

from models.db import db
from models.parking_space import ParkingSpace, SpaceStatus
from models.reservation import Reservation, ReservationStatus
from models.vehicle_session import VehicleSession, SessionStatus
from sqlalchemy import func

logger = logging.getLogger(__name__)


def get_zone_stats():
    """Return per-zone counts of available and occupied spaces."""
    try:
        spaces = ParkingSpace.query.all()
        zones = {}
        zone_name_map = {
            "zone-a": "Zone A (Ground)",
            "zone-b": "Zone B (Floor 1)",
            "zone-c": "Zone C (Floor 2)",
            "zone-d": "Zone D (Rooftop)",
        }
        for space in spaces:
            zid = space.zone_id
            if zid not in zones:
                zname = zone_name_map.get(zid, zid.upper())
                if space.zone and space.zone.name:
                    zname = space.zone.name
                zones[zid] = {
                    "zone_id": zid,
                    "zone_name": zname,
                    "floor": space.floor,
                    "total": 0,
                    "available": 0,
                    "occupied": 0,
                    "reserved": 0,
                    "out_of_service": 0,
                }
            zones[zid]["total"] += 1
            status_val = space.status.value if hasattr(space.status, "value") else str(space.status)
            zones[zid][status_val] = zones[zid].get(status_val, 0) + 1
        return list(zones.values())
    except Exception as exc:
        logger.exception("Error in get_zone_stats: %s", exc)
        raise


def get_overview():
    """Return high-level summary statistics with both short and verbose field names."""
    try:
        total = ParkingSpace.query.count()
        available = ParkingSpace.query.filter_by(status=SpaceStatus.available).count()
        occupied = ParkingSpace.query.filter_by(status=SpaceStatus.occupied).count()
        reserved = ParkingSpace.query.filter_by(status=SpaceStatus.reserved).count()
        out_of_service = ParkingSpace.query.filter_by(status=SpaceStatus.out_of_service).count()
        occupancy_pct = round((occupied / total * 100) if total else 0, 1)

        active_reservations = Reservation.query.filter_by(status=ReservationStatus.active).count()

        today = datetime.now(timezone.utc).replace(tzinfo=None)
        today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        today_entries = VehicleSession.query.filter(
            VehicleSession.entry_time >= today_start
        ).count()
        today_exits = VehicleSession.query.filter(
            VehicleSession.exit_time >= today_start,
            VehicleSession.status == SessionStatus.completed,
        ).count()

        # Simulated revenue from today's completed sessions
        completed_today = VehicleSession.query.filter(
            VehicleSession.exit_time >= today_start,
            VehicleSession.status == SessionStatus.completed,
        ).all()
        today_revenue = round(sum(s.charge or 0 for s in completed_today), 2)

        zone_stats = get_zone_stats()

        return {
            "total_spaces": total,
            "available": available,
            "available_spaces": available,
            "occupied": occupied,
            "occupied_spaces": occupied,
            "reserved": reserved,
            "reserved_spaces": reserved,
            "out_of_service": out_of_service,
            "out_of_service_spaces": out_of_service,
            "occupancy_percent": occupancy_pct,
            "occupancy_percentage": occupancy_pct,
            "active_reservations": active_reservations,
            "today_entries": today_entries,
            "today_exits": today_exits,
            "today_revenue": today_revenue,
            "simulated_daily_revenue": today_revenue,
            "zones": zone_stats,
        }
    except Exception as exc:
        logger.exception("Error in get_overview: %s", exc)
        raise


def get_occupancy_trend(days=7):
    """Return occupancy percentage per day for the last N days."""
    try:
        result = []
        total = ParkingSpace.query.count() or 1
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for i in range(days - 1, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            sessions_that_day = VehicleSession.query.filter(
                VehicleSession.entry_time <= day_end,
                (VehicleSession.exit_time >= day_start) | (VehicleSession.exit_time == None),
            ).count()
            occupancy_pct = round(min(sessions_that_day / total * 100, 100), 1)
            result.append({
                "date": day_start.date().strftime("%b %d"),
                "occupancy_percent": occupancy_pct,
            })
        return result
    except Exception as exc:
        logger.exception("Error in get_occupancy_trend: %s", exc)
        raise


def get_revenue_trend(days=7):
    """Return simulated revenue per day for the last N days."""
    try:
        result = []
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for i in range(days - 1, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            sessions = VehicleSession.query.filter(
                VehicleSession.status == SessionStatus.completed,
                VehicleSession.exit_time >= day_start,
                VehicleSession.exit_time <= day_end,
            ).all()
            revenue = sum(s.charge or 0 for s in sessions)
            result.append({
                "date": day_start.date().strftime("%b %d"),
                "revenue": round(revenue, 2),
            })
        return result
    except Exception as exc:
        logger.exception("Error in get_revenue_trend: %s", exc)
        raise


def get_peak_hours():
    """Return average session counts per hour of the day (0-23)."""
    try:
        sessions = VehicleSession.query.all()
        hour_counts = {h: 0 for h in range(24)}
        for s in sessions:
            if s.entry_time:
                hour_counts[s.entry_time.hour] += 1
        total_days = 7  # normalize over a week window
        return {str(h): round(count / total_days, 2) for h, count in hour_counts.items()}
    except Exception as exc:
        logger.exception("Error in get_peak_hours: %s", exc)
        raise
