from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import models here so they are registered with SQLAlchemy metadata
from .parking_zone import ParkingZone  # noqa: F401, E402
from .parking_space import ParkingSpace  # noqa: F401, E402
from .reservation import Reservation  # noqa: F401, E402
from .vehicle_session import VehicleSession  # noqa: F401, E402
