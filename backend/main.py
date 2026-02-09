from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, get_db, Base
import models
import schemas
from typing import List
import shutil
import os
from services.pdf_service import extract_text_from_pdf
from services.ai_service import ask_gemini

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recall API")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Recall API"}

@app.post("/subjects/", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db)):
    db_subject = models.Subject(**subject.dict())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@app.get("/subjects/", response_model=List[schemas.Subject])
def read_subjects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subjects = db.query(models.Subject).offset(skip).limit(limit).all()
    return subjects

@app.put("/subjects/{subject_id}", response_model=schemas.Subject)
def update_subject(subject_id: int, subject: schemas.SubjectUpdate, db: Session = Depends(get_db)):
    db_subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    update_data = subject.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_subject, key, value)
    
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@app.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    db_subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not db_subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    db.delete(db_subject)
    db.commit()
    return {"message": "Subject deleted successfully"}

@app.post("/chapters/", response_model=schemas.Chapter)
async def create_chapter(
    subject_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Save file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract text
    raw_text = extract_text_from_pdf(file_path)
    
    # Create DB entry
    # Store relative path for API access (e.g., "uploads/file.pdf")
    relative_path = f"uploads/{file.filename}"
    
    db_chapter = models.Chapter(
        subject_id=subject_id,
        title=title,
        pdf_url=relative_path, 
        raw_text_content=raw_text
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    return db_chapter

@app.get("/chapters/{chapter_id}", response_model=schemas.Chapter)
def read_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@app.put("/chapters/{chapter_id}", response_model=schemas.Chapter)
def update_chapter(chapter_id: int, chapter: schemas.ChapterUpdate, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = chapter.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_chapter, key, value)
    
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    return db_chapter

@app.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: int, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    db.delete(db_chapter)
    db.commit()
    return {"message": "Chapter deleted successfully"}

@app.get("/chapters/{chapter_id}/messages", response_model=List[schemas.Message])
def read_messages(chapter_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.Message).filter(models.Message.chapter_id == chapter_id).order_by(models.Message.created_at).all()
    return messages

@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat_endpoint(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == request.chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Save User Message
    user_msg = models.Message(chapter_id=request.chapter_id, role="user", content=request.user_query)
    db.add(user_msg)
    db.commit()

    # Use raw_text_content or notebooklm_summary context
    context = chapter.notebooklm_summary if chapter.notebooklm_summary else chapter.raw_text_content
    
    if not context:
        return {"response": "This chapter has no content to study from."}

    # Fetch recent history for context (optional, improved AI context)
    # history = db.query(models.Message).filter(models.Message.chapter_id == request.chapter_id).order_by(models.Message.created_at.desc()).limit(10).all()
    # history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in reversed(history)])
    
    # Run AI generation in a separate thread to avoid blocking the event loop
    import asyncio
    loop = asyncio.get_event_loop()
    # TODO: Pass history to ask_gemini if updated
    response_text = await loop.run_in_executor(None, ask_gemini, context[:30000], request.user_query)
    
    # Save AI Response
    ai_msg = models.Message(chapter_id=request.chapter_id, role="ai", content=response_text)
    db.add(ai_msg)
    db.commit()
    
    return {"response": response_text}
