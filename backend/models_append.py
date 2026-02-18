
class MasterQuestion(Base):
    __tablename__ = "master_questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    chapter = Column(String, index=True)
    topic = Column(String, index=True)
    question_text = Column(Text)
    options = Column(JSON) # Stores {"A": "...", "B": "...", ...}
    correct_option = Column(String) # "A", "B", "C", "D"
    explanation = Column(Text)
    reference = Column(String, nullable=True) # Source PDF or page number
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MasterQuizSession(Base):
    __tablename__ = "master_quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1) # Mock user for now
    score = Column(Integer, default=0)
    total_questions = Column(Integer)
    answers = Column(JSON) # Stores {question_id: "A", ...}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
