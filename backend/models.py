from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    cover_emoji = Column(String, nullable=True)

    chapters = relationship("Chapter", back_populates="subject", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    title = Column(String, index=True)
    pdf_url = Column(Text, nullable=True)
    raw_text_content = Column(Text, nullable=True)
    notebooklm_summary = Column(Text, nullable=True)

    subject = relationship("Subject", back_populates="chapters")
    messages = relationship("Message", back_populates="chapter", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    role = Column(String) # "user" or "ai"
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chapter = relationship("Chapter", back_populates="messages")

class UserProgress(Base):
    __tablename__ = "user_progress"

    user_id = Column(Integer, primary_key=True) # Mock user ID
    chapter_id = Column(Integer, ForeignKey("chapters.id"), primary_key=True)
    is_completed = Column(Boolean, default=False)
    last_read_position = Column(Integer, default=0)
