from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Numeric, DateTime, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from geoalchemy2 import Geometry
from app.db.database import Base
from app.models.user import generate_uuid

class VerificationStatus(enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class OccupancyStatus(enum.Enum):
    VACANT = "VACANT"
    OCCUPIED = "OCCUPIED"
    UNDER_NOTICE = "UNDER_NOTICE"
    UNAVAILABLE = "UNAVAILABLE"

class AdminReviewStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"

class Property(Base):
    __tablename__ = "properties"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    owner_id = Column(String, ForeignKey("users.id"))
    broker_id = Column(String, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    address = Column(String, nullable=False)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    
    # Store location as PostGIS Geometry (Point)
    location = Column(Geometry(geometry_type='POINT', srid=4326))
    
    property_type = Column(String)
    bedrooms = Column(Integer)
    bathrooms = Column(Float)
    rent_amount = Column(Numeric, nullable=False)
    deposit_amount = Column(Numeric)
    
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    occupancy_status = Column(Enum(OccupancyStatus), default=OccupancyStatus.VACANT)
    admin_review_status = Column(Enum(AdminReviewStatus), default=AdminReviewStatus.PENDING)
    
    is_owner_verified = Column(Boolean, default=False)
    is_broker_authorized = Column(Boolean, default=False)
    
    ai_safety_score = Column(Integer, default=0)
    fraud_risk_score = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="properties")
    broker = relationship("User", foreign_keys=[broker_id])
    occupancy_history = relationship("OccupancyHistory", back_populates="property")
    documents = relationship("Document", back_populates="property")
