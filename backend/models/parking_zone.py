from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from .db import db


class ParkingZone(db.Model):
    __tablename__ = "parking_zones"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    floor = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    spaces = db.relationship("ParkingSpace", back_populates="zone", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "floor": self.floor,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
