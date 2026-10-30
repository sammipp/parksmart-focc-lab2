from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, Enum as SAEnum
from datetime import datetime, timezone
import enum
import uuid
from .db import db


class SessionStatus(str, enum.Enum):
    active = "active"
    completed = "completed"


class VehicleSession(db.Model):
    __tablename__ = "vehicle_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id = Column(String(50), ForeignKey("parking_spaces.id"), nullable=False)
    reservation_id = Column(String(36), ForeignKey("reservations.id"), nullable=True)
    vehicle_reg = Column(String(50), nullable=False)
    entry_time = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    exit_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    charge = Column(Float, nullable=True)
    status = Column(SAEnum(SessionStatus), nullable=False, default=SessionStatus.active)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    space = db.relationship("ParkingSpace", back_populates="sessions")
    reservation = db.relationship("Reservation", back_populates="session")

    def to_dict(self):
        return {
            "id": self.id,
            "space_id": self.space_id,
            "reservation_id": self.reservation_id,
            "vehicle_reg": self.vehicle_reg,
            "entry_time": self.entry_time.isoformat() if self.entry_time else None,
            "exit_time": self.exit_time.isoformat() if self.exit_time else None,
            "duration_minutes": self.duration_minutes,
            "charge": self.charge,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
