from sqlalchemy import Column, ForeignKey, String, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.database import Base
from app.models.user import generate_uuid

class DocumentType(enum.Enum):
    LEASE = "LEASE"
    ID = "ID"
    DEED = "DEED"
    BROKER_AGREEMENT = "BROKER_AGREEMENT"

class DocumentVerificationStatus(enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    property_id = Column(String, ForeignKey("properties.id"), nullable=True)
    
    document_type = Column(Enum(DocumentType), nullable=False)
    file_url = Column(String, nullable=False)
    verification_status = Column(Enum(DocumentVerificationStatus), default=DocumentVerificationStatus.PENDING)
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id])
    property = relationship("Property", back_populates="documents")
