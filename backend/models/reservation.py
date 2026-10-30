from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SAEnum
from datetime import datetime, timezone
import enum
import uuid
from .db import db


class ReservationStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id = Column(String(50), ForeignKey("parking_spaces.id"), nullable=False)
    vehicle_reg = Column(String(50), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(
        SAEnum(ReservationStatus), nullable=False, default=ReservationStatus.active
    )
    estimated_fee = Column(Float, nullable=False, default=0.0)
    actual_fee = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    cancelled_at = Column(DateTime, nullable=True)

    space = db.relationship("ParkingSpace", back_populates="reservations")
    session = db.relationship(
        "VehicleSession", back_populates="reservation", uselist=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "space_id": self.space_id,
            "vehicle_reg": self.vehicle_reg,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "status": self.status.value if self.status else None,
            "estimated_fee": self.estimated_fee,
            "actual_fee": self.actual_fee,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
        }
