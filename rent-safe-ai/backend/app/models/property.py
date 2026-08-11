from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Numeric, DateTime, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.database import Base
from app.models.user import generate_uuid

class VerificationStatus(enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class Property(Base):
    __tablename__ = "properties"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    owner_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    address = Column(String, nullable=False)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    property_type = Column(String)
    bedrooms = Column(Integer)
    bathrooms = Column(Float)
    rent_amount = Column(Numeric, nullable=False)
    deposit_amount = Column(Numeric)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    ai_safety_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="properties")
