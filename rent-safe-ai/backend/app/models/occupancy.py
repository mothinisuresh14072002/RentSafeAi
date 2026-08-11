from sqlalchemy import Column, ForeignKey, String, DateTime, Enum, Numeric
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.database import Base
from app.models.user import generate_uuid

class OccupancyHistoryStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"

class OccupancyHistory(Base):
    __tablename__ = "occupancy_history"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    property_id = Column(String, ForeignKey("properties.id"), nullable=False)
    tenant_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    status = Column(Enum(OccupancyHistoryStatus), default=OccupancyHistoryStatus.ACTIVE)
    rent_amount = Column(Numeric)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    property = relationship("Property", back_populates="occupancy_history")
    tenant = relationship("User", foreign_keys=[tenant_id])
