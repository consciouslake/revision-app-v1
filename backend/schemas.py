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
    
class Chapter(ChapterBase):
    id: int
    subject_id: int
    raw_text_content: Optional[str] = None
    messages: List[Message] = []

    class Config:
        from_attributes = True
