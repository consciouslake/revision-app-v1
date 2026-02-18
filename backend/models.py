from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, JSON
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
    flashcards = relationship("Flashcard", back_populates="chapter", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="chapter", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    front = Column(Text)
    back = Column(Text)

    chapter = relationship("Chapter", back_populates="flashcards")

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    title = Column(String, default="Chapter Quiz")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chapter = relationship("Chapter", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    results = relationship("QuizResult", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(Text)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_option = Column(String) # "A", "B", "C", "D"

    quiz = relationship("Quiz", back_populates="questions")

class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    score = Column(Integer)
    total_questions = Column(Integer)
    percentage = Column(Integer) # Store as integer percentage 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quiz = relationship("Quiz", back_populates="results")

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
    is_important = Column(Boolean, default=False)
    last_read_position = Column(Integer, default=0)
    last_read_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class MasterQuestion(Base):
    __tablename__ = "master_questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    chapter = Column(String, index=True)
    topic = Column(String, index=True)
    question_text = Column(Text)
    options = Column(JSON) # {"A": "...", "B": "..."}
    correct_option = Column(String)
    explanation = Column(Text)
    difficulty = Column(String, nullable=True)
    question_hash = Column(String, unique=True, index=True) # For deduplication
    image_url = Column(String, nullable=True) # URL to question image
    option_images = Column(JSON, nullable=True) # {"A": "url", "B": "url"}

class MasterQuizSession(Base):
    __tablename__ = "master_quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1) # Mock user id
    score = Column(Integer)
    total_questions = Column(Integer)
    answers = Column(JSON) # {q_id: selected_option}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
