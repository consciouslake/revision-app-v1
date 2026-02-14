from pydantic import BaseModel
from typing import Optional, List

class SubjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_emoji: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_emoji: Optional[str] = None

class Subject(SubjectBase):
    id: int
    chapters: List['Chapter'] = []

    class Config:
        from_attributes = True

class ChapterBase(BaseModel):
    title: str
    pdf_url: Optional[str] = None
    notebooklm_summary: Optional[str] = None

class ChapterCreate(ChapterBase):
    subject_id: int

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    notebooklm_summary: Optional[str] = None

from datetime import datetime

class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    chapter_id: int

class Message(MessageBase):
    id: int
    chapter_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    chapter_id: int
    user_query: str

class ChatResponse(BaseModel):
    response: str

class FlashcardBase(BaseModel):
    front: str
    back: str

class FlashcardCreate(FlashcardBase):
    pass

class Flashcard(FlashcardBase):
    id: int
    chapter_id: int

    class Config:
        from_attributes = True

# Quiz Schemas
class QuestionBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: int
    quiz_id: int

    class Config:
        from_attributes = True

class QuizBase(BaseModel):
    title: str

class Quiz(QuizBase):
    id: int
    chapter_id: int
    questions: List[Question] = []
    created_at: datetime

    class Config:
        from_attributes = True

class QuizResultBase(BaseModel):
    score: int
    total_questions: int
    percentage: int

class QuizResultCreate(QuizResultBase):
    quiz_id: int

class QuizResult(QuizResultBase):
    id: int
    quiz_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserStats(BaseModel):
    total_chapters: int
    completed_chapters: int
    average_quiz_score: float
    total_quizzes_taken: int
    mastery_level: str # "Novice", "Learner", "Pro", "Master"
    streak_days: int = 0
    last_active_chapter: Optional[dict] = None

class Chapter(ChapterBase):
    id: int
    subject_id: int
    raw_text_content: Optional[str] = None
    messages: List[Message] = []
    flashcards: List[Flashcard] = []
    quizzes: List[Quiz] = []

    class Config:
        from_attributes = True

class UserProgressBase(BaseModel):
    is_completed: bool
    is_important: bool = False
    last_read_position: int

class UserProgressCreate(UserProgressBase):
    chapter_id: int

class UserProgress(UserProgressBase):
    user_id: int
    chapter_id: int
    last_read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SubjectStats(BaseModel):
    subject_id: int
    subject_name: str
    total_chapters: int
    completed_chapters: int
    last_studied_at: Optional[datetime] = None
    completeness_percentage: int
