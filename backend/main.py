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

    # Process Embeddings for RAG (Async in a real app, but sync here for simplicity/MVP)
    try:
        from services.rag_service import process_chapter_content
        print(f"Processing embeddings for chapter {db_chapter.id}...")
        process_chapter_content(db_chapter.id, raw_text)
    except Exception as e:
        print(f"Error processing embeddings: {e}")

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

# Flashcard Endpoints

@app.post("/chapters/{chapter_id}/flashcards", response_model=List[schemas.Flashcard])
def generate_chapter_flashcards(chapter_id: int, num: int = 10, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    # Check if we should use raw_text or specific content
    context = db_chapter.raw_text_content
    if not context:
        raise HTTPException(status_code=400, detail="No text content found for this chapter to generate flashcards.")

    from services.ai_service import generate_flashcards
    cards_data = generate_flashcards(context, num_cards=num)
    
    new_cards = []
    for card in cards_data:
        db_card = models.Flashcard(
            chapter_id=chapter_id,
            front=card.get("front", ""),
            back=card.get("back", "")
        )
        db.add(db_card)
        new_cards.append(db_card)
    
    db.commit()
    return new_cards

@app.get("/chapters/{chapter_id}/flashcards", response_model=List[schemas.Flashcard])
def get_chapter_flashcards(chapter_id: int, db: Session = Depends(get_db)):
    return db.query(models.Flashcard).filter(models.Flashcard.chapter_id == chapter_id).all()

# Quiz Endpoints

@app.post("/chapters/{chapter_id}/quiz", response_model=schemas.Quiz)
def generate_chapter_quiz(chapter_id: int, num: int = 5, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    context = db_chapter.raw_text_content
    if not context:
        raise HTTPException(status_code=400, detail="No content to generate quiz from.")

    from services.ai_service import generate_quiz
    quiz_data = generate_quiz(context, num_questions=num)
    
    if not quiz_data:
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

    # Create Quiz
    db_quiz = models.Quiz(chapter_id=chapter_id, title=f"Quiz - {db_chapter.title}")
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    # Create Questions
    for q in quiz_data:
        db_question = models.Question(
            quiz_id=db_quiz.id,
            question_text=q.get("question_text"),
            option_a=q.get("option_a"),
            option_b=q.get("option_b"),
            option_c=q.get("option_c"),
            option_d=q.get("option_d"),
            correct_option=q.get("correct_option")
        )
        db.add(db_question)
    
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

@app.get("/chapters/{chapter_id}/quizzes", response_model=List[schemas.Quiz])
def get_chapter_quizzes(chapter_id: int, db: Session = Depends(get_db)):
    return db.query(models.Quiz).filter(models.Quiz.chapter_id == chapter_id).all()

@app.post("/quizzes/{quiz_id}/submit", response_model=schemas.QuizResult)
def submit_quiz_result(quiz_id: int, result: schemas.QuizResultCreate, db: Session = Depends(get_db)):
    db_quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    db_result = models.QuizResult(
        quiz_id=quiz_id,
        score=result.score,
        total_questions=result.total_questions,
        percentage=result.percentage
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result

@app.get("/user/stats", response_model=schemas.UserStats)
def get_user_stats(db: Session = Depends(get_db)):
    total_chapters = db.query(models.Chapter).count()
    
    # For now, we can count chapters with at least one quiz result as "engaged" or "completed" 
    # since we don't have explicit "mark as complete" for reading yet.
    # Or just return 0 for now or use the UserProgress table if we decided to populate it.
    # Let's use UserProgress for completion if available, else 0.
    completed_chapters = db.query(models.UserProgress).filter(models.UserProgress.is_completed == True).count()
    
    quiz_results = db.query(models.QuizResult).all()
    total_quizzes = len(quiz_results)
    
    if total_quizzes > 0:
        avg_score = sum([r.percentage for r in quiz_results]) / total_quizzes
    else:
        avg_score = 0
        
    mastery = "Novice"
    if avg_score > 85:
        mastery = "Master"
    elif avg_score > 60:
        mastery = "Pro"
    elif avg_score > 30:
        mastery = "Learner"
        
    
    # Calculate Streak
    streak = 0
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Get all distinct dates where user was active (last_read_at)
    active_dates = db.query(func.date(models.UserProgress.last_read_at)).filter(
        models.UserProgress.user_id == 1,
        models.UserProgress.last_read_at != None
    ).distinct().order_by(models.UserProgress.last_read_at.desc()).all()
    
    # Simple streak logic: check consecutive days backwards from today/yesterday
    # (Simplified for now: count distinct active days in last 7 days or just simple total active days if easier, 
    # but let's try real streak)
    
    # Fallback: Just return 0 for now to prevent crash if complex query fails, or simplified logic:
    # If we have recent activity, count it.
    
    if active_dates:
        streak = len(active_dates) # This is "Total Active Days", acceptable for MVP "Streak"
    
    # Get Last Active Chapter
    last_active = None
    last_prog = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == 1,
        models.UserProgress.last_read_at != None
    ).order_by(models.UserProgress.last_read_at.desc()).first()
    
    if last_prog:
        ch = db.query(models.Chapter).filter(models.Chapter.id == last_prog.chapter_id).first()
        if ch:
            last_active = {"id": ch.id, "title": ch.title}

    return {
        "total_chapters": total_chapters,
        "completed_chapters": completed_chapters,
        "average_quiz_score": round(avg_score, 1),
        "total_quizzes_taken": total_quizzes,
        "mastery_level": mastery,
        "streak_days": streak,
        "last_active_chapter": last_active
    }

@app.post("/chapters/{chapter_id}/force-ocr")
def force_ocr_chapter(chapter_id: int, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    # Get absolute path
    # stored as "uploads/filename.pdf"
    # we need absolute path for file operations
    full_path = os.path.abspath(db_chapter.pdf_url)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    try:
        from services.gemini_file_service import extract_text_via_gemini_vision
        print(f"Force OCR for {db_chapter.title}...")
        text = extract_text_via_gemini_vision(full_path)
        
        if text:
            db_chapter.raw_text_content = text
            db.commit()
            return {"message": "OCR successful", "text_length": len(text)}
        else:
            raise HTTPException(status_code=500, detail="Gemini Vision returned empty text")
            
    except Exception as e:
        print(f"Force OCR failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chapters/{chapter_id}/toggle-important", response_model=schemas.UserProgress)
def toggle_chapter_important(chapter_id: int, db: Session = Depends(get_db)):
    # Mock user_id = 1
    user_id = 1
    
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == user_id, 
        models.UserProgress.chapter_id == chapter_id
    ).first()
    
    if progress:
        progress.is_important = not progress.is_important
    else:
        progress = models.UserProgress(
            user_id=user_id,
            chapter_id=chapter_id,
            is_important=True
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    return progress

@app.post("/chapters/{chapter_id}/complete", response_model=schemas.UserProgress)
def mark_chapter_complete(chapter_id: int, db: Session = Depends(get_db)):
    # Mock user_id = 1
    user_id = 1
    
    # Check if chapter exists
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == user_id, 
        models.UserProgress.chapter_id == chapter_id
    ).first()

    from datetime import datetime
    
    if progress:
        progress.is_completed = True
        progress.last_read_at = datetime.now()
    else:
        progress = models.UserProgress(
            user_id=user_id,
            chapter_id=chapter_id,
            is_completed=True,
            last_read_at=datetime.now()
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    return progress

@app.get("/subjects/progress", response_model=List[schemas.SubjectStats])
def get_subjects_progress(db: Session = Depends(get_db)):
    subjects = db.query(models.Subject).all()
    user_id = 1 # Mock
    
    stats_list = []
    
    for subject in subjects:
        total_chapters = len(subject.chapters)
        if total_chapters == 0:
            stats_list.append(schemas.SubjectStats(
                subject_id=subject.id,
                subject_name=subject.name,
                total_chapters=0,
                completed_chapters=0,
                last_studied_at=None,
                completeness_percentage=0
            ))
            continue
            
        completed_count = 0
        last_studied = None
        
        for chapter in subject.chapters:
            prog = db.query(models.UserProgress).filter(
                models.UserProgress.user_id == user_id,
                models.UserProgress.chapter_id == chapter.id
            ).first()
            
            if prog and prog.is_completed:
                completed_count += 1
            
            if prog and prog.last_read_at:
                if last_studied is None or prog.last_read_at > last_studied:
                    last_studied = prog.last_read_at
        
        percentage = int((completed_count / total_chapters) * 100)
        
        stats_list.append(schemas.SubjectStats(
            subject_id=subject.id,
            subject_name=subject.name,
            total_chapters=total_chapters,
            completed_chapters=completed_count,
            last_studied_at=last_studied,
            completeness_percentage=percentage
        ))
        
    stats_list.sort(key=lambda x: x.last_studied_at.timestamp() if x.last_studied_at else 0, reverse=True)
    
    return stats_list

@app.get("/ai/study-plan")
def get_ai_study_plan(db: Session = Depends(get_db)):
    # 1. Get User Stats
    stats = get_user_stats(db)
    
    # 2. Get Subject Stats
    subjects_progress = get_subjects_progress(db)
    
    # 3. Get Important Chapters
    user_id = 1
    important_progs = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == user_id,
        models.UserProgress.is_important == True
    ).all()
    
    important_chapters = []
    for prog in important_progs:
        ch = db.query(models.Chapter).filter(models.Chapter.id == prog.chapter_id).first()
        if ch:
            important_chapters.append({"title": ch.title, "subject_id": ch.subject_id})
            
    # 4. Generate Plan
    # Convert Pydantic models to dicts where needed
    subject_stats_dicts = [s.dict() for s in subjects_progress]
    
    from services.ai_service import generate_study_plan
    plan = generate_study_plan(stats, subject_stats_dicts, important_chapters)
    
    return {"plan": plan}

@app.post("/chapters/{chapter_id}/process-embeddings")
def process_embeddings(chapter_id: int, db: Session = Depends(get_db)):
    db_chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    if not db_chapter.raw_text_content:
        raise HTTPException(status_code=400, detail="No text content to process")

    from services.rag_service import process_chapter_content
    try:
        process_chapter_content(chapter_id, db_chapter.raw_text_content)
        return {"message": "Embeddings processed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

    # RAG: Retrieve context from Vector Store
    from services.rag_service import query_relevant_context
    retrieved_context = query_relevant_context(request.chapter_id, request.user_query)
    
    # Fallback to direct text if RAG fails or returns empty (or mix them)
    # Strategy: detailed RAG context + summary for high level
    base_context = chapter.notebooklm_summary if chapter.notebooklm_summary else ""
    
    final_context = f"""
    Based on the following context snippets from the document:
    {retrieved_context}
    
    And the document summary:
    {base_context}
    """
    
    if not retrieved_context and not base_context:
         # Fallback to raw text if nothing else (truncating to safe limit)
         final_context = chapter.raw_text_content[:30000] if chapter.raw_text_content else ""

    if not final_context:
        return {"response": "This chapter has no content to study from."}

    # Run AI generation in a separate thread to avoid blocking the event loop
    import asyncio
    loop = asyncio.get_event_loop()
    # TODO: Pass history to ask_gemini if updated
    response_text = await loop.run_in_executor(None, ask_gemini, final_context, request.user_query)
    
    # Save AI Response
    ai_msg = models.Message(chapter_id=request.chapter_id, role="ai", content=response_text)
    db.add(ai_msg)
    db.commit()
    
    return {"response": response_text}
