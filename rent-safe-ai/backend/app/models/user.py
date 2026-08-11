from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Numeric, DateTime, Enum, Text
from sqlalchemy.orm import relationship
import enum
import uuid
from datetime import datetime
from app.db.database import Base

class UserRole(enum.Enum):
    TENANT = "TENANT"
    LANDLORD = "LANDLORD"
    ADMIN = "ADMIN"

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.TENANT)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    properties = relationship("Property", back_populates="owner")
