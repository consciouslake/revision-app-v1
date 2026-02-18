
# Master Quiz Schemas

class MasterQuestionBase(BaseModel):
    subject: str
    chapter: str
    topic: str
    question_text: str
    options: dict # {"A": "...", "B": "..."}
    correct_option: str
    explanation: str
    reference: Optional[str] = None

class MasterQuestionCreate(MasterQuestionBase):
    pass

class MasterQuestion(MasterQuestionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MasterQuizSessionBase(BaseModel):
    user_id: int = 1
    total_questions: int
    answers: dict = {} # {question_id: "A"}

class MasterQuizSessionCreate(MasterQuizSessionBase):
    pass

class MasterQuizSession(MasterQuizSessionBase):
    id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True
