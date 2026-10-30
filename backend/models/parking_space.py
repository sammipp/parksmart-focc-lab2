from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SAEnum
from datetime import datetime, timezone
import enum
from .db import db


class VehicleType(str, enum.Enum):
    car = "car"
    motorcycle = "motorcycle"
    truck = "truck"
    disabled = "disabled"


class SpaceStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    occupied = "occupied"
    out_of_service = "out_of_service"


class ParkingSpace(db.Model):
    __tablename__ = "parking_spaces"

    id = Column(String(50), primary_key=True)
    zone_id = Column(String(50), ForeignKey("parking_zones.id"), nullable=False)
    slot_number = Column(String(20), nullable=False, unique=True)
    floor = Column(String(50), nullable=False)
    vehicle_type = Column(SAEnum(VehicleType), nullable=False, default=VehicleType.car)
    status = Column(SAEnum(SpaceStatus), nullable=False, default=SpaceStatus.available)
    hourly_rate = Column(Float, nullable=False, default=50.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    zone = db.relationship("ParkingZone", back_populates="spaces")
    reservations = db.relationship("Reservation", back_populates="space", lazy="dynamic")
    sessions = db.relationship("VehicleSession", back_populates="space", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "zone_id": self.zone_id,
            "slot_number": self.slot_number,
            "floor": self.floor,
            "vehicle_type": self.vehicle_type.value if self.vehicle_type else None,
            "status": self.status.value if self.status else None,
            "hourly_rate": self.hourly_rate,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
