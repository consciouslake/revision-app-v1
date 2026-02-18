from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, get_db, Base, SessionLocal
import models
import schemas
from typing import List
import shutil
import os
from services.pdf_service import extract_text_from_pdf
from services.ai_service import ask_gemini
from services.quiz_ingestion_service import process_pdf_ingestion, get_ingestion_status
from sqlalchemy.sql.expression import func
import uuid

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recall API")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://140.245.249.65:3000", # Oracle Cloud Frontend
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

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

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

    # Process Embeddings for RAG - REMOVED for manual trigger to save credits
    # User must click "Index for AI" to generate embeddings.
    print(f"Chapter {db_chapter.id} created. RAG indexing skipped (manual trigger required).")

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
    db.delete(db_chapter)
    db.commit()
    return {"message": "Chapter deleted successfully"}

@app.get("/chapters/{chapter_id}/progress", response_model=schemas.UserProgress)
def get_chapter_progress(chapter_id: int, db: Session = Depends(get_db)):
    # Mock user_id = 1
    prog = db.query(models.UserProgress).filter(
        models.UserProgress.chapter_id == chapter_id,
        models.UserProgress.user_id == 1
    ).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Progress not found")
    return prog

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

@app.post("/api/master/ingest", response_model=schemas.IngestionStatus)
async def ingest_master_quiz(
    background_tasks: BackgroundTasks,
    subject: str = Form(...),
    file: UploadFile = File(...)
):
    task_id = str(uuid.uuid4())
    
    # Save file temporarily
    file_path = os.path.join(UPLOAD_DIR, f"{task_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Start Background Task
    background_tasks.add_task(process_pdf_ingestion, task_id, file_path, subject, SessionLocal)
    
    return {
        "task_id": task_id,
        "status": "processing",
        "total_chunks": 0,
        "processed_chunks": 0,
        "questions_count": 0,
        "message": "Ingestion started in background."
    }

@app.get("/api/master/ingest/{task_id}/status", response_model=schemas.IngestionStatus)
def get_ingestion_status_endpoint(task_id: str):
    return get_ingestion_status(task_id)

@app.get("/api/master/filters")
def get_master_filters(subject: str = None, db: Session = Depends(get_db)):
    if subject:
        # Get topics with counts for this subject
        results = db.query(models.MasterQuestion.topic, func.count(models.MasterQuestion.id))\
            .filter(models.MasterQuestion.subject == subject)\
            .group_by(models.MasterQuestion.topic)\
            .all()
        
        # Determine total questions for the subject
        total_questions = sum([r[1] for r in results])
        
        # Format: [{"topic": "Algebra", "count": 15}, ...]
        topics_data = [{"topic": r[0], "count": r[1]} for r in results if r[0]]
        
        return {
            "topics": sorted(topics_data, key=lambda x: x["topic"]),
            "total_questions": total_questions
        }
    else:
        # Get distinct subjects with total count
        results = db.query(models.MasterQuestion.subject, func.count(models.MasterQuestion.id))\
            .group_by(models.MasterQuestion.subject)\
            .all()
            
        subjects_data = [{"subject": r[0], "count": r[1]} for r in results if r[0]]
        return {"subjects": sorted([s["subject"] for s in subjects_data])}

@app.get("/api/master/generate", response_model=List[schemas.MasterQuestion])
def generate_master_quiz(
    subject: str,
    topic: str = None,
    count: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(models.MasterQuestion).filter(models.MasterQuestion.subject == subject)
    
    if topic and topic != "All":
        query = query.filter(models.MasterQuestion.topic == topic)
        
    # If count is -1 or 0, return ALL questions (Full Mock or Full Topic)
    if count <= 0:
        questions = query.all()
    else:
        # Randomized subset
        questions = query.order_by(func.random()).limit(count).all()
        
    return questions

    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

# --- Master Quiz Editor & Analytics ---

@app.get("/api/master/questions", response_model=List[schemas.MasterQuestion])
def get_all_master_questions(
    skip: int = 0, 
    limit: int = 50, 
    subject: str = None, 
    topic: str = None, 
    search: str = None,
    db: Session = Depends(get_db)
):
    q = db.query(models.MasterQuestion)
    if subject and subject != "All":
        q = q.filter(models.MasterQuestion.subject == subject)
    if topic and topic != "All":
        q = q.filter(models.MasterQuestion.topic == topic)
    if search:
        q = q.filter(models.MasterQuestion.question_text.ilike(f"%{search}%"))
        
    return q.order_by(models.MasterQuestion.id.desc()).offset(skip).limit(limit).all()

@app.put("/api/master/questions/{question_id}", response_model=schemas.MasterQuestion)
def update_master_question(question_id: int, updates: schemas.MasterQuestionUpdate, db: Session = Depends(get_db)):
    q = db.query(models.MasterQuestion).filter(models.MasterQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    data = updates.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(q, key, value)
    
    db.commit()
    db.refresh(q)
    return q

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # Save file
    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return relative URL
    return {"url": f"uploads/{safe_filename}"}

@app.get("/api/master/analytics/weak-areas", response_model=schemas.AnalyticsResponse)
def get_weak_areas(db: Session = Depends(get_db)):
    # Mock user_id = 1
    sessions = db.query(models.MasterQuizSession).filter(models.MasterQuizSession.user_id == 1).all()
    
    topic_stats = {} # {topic: {total: 0, correct: 0}}
    
    # 1. Collect all answers
    all_answers = [] # [(q_id, user_ans)]
    for s in sessions:
        if s.answers:
            for q_id, ans in s.answers.items():
                all_answers.append((int(q_id), ans))
                
    if not all_answers:
         return {"weak_topics": [], "strong_topics": []}

    # 2. Bulk fetch questions to avoid N+1
    q_ids = [gid for gid, _ in all_answers]
    questions = db.query(models.MasterQuestion).filter(models.MasterQuestion.id.in_(q_ids)).all()
    q_map = {q.id: q for q in questions}
    
    # 3. Calculate Stats
    for q_id, user_ans in all_answers:
        q = q_map.get(q_id)
        if not q: continue
        
        topic = q.topic or "General"
        if topic not in topic_stats:
            topic_stats[topic] = {"total": 0, "correct": 0}
            
        topic_stats[topic]["total"] += 1
        if user_ans == q.correct_option:
             topic_stats[topic]["correct"] += 1
             
    # 4. Format Result
    weak = []
    strong = []
    
    for topic, stats in topic_stats.items():
        acc = int((stats["correct"] / stats["total"]) * 100)
        item = schemas.WeakArea(topic=topic, accuracy=acc, total_attempts=stats["total"])
        
        if acc < 60:
            weak.append(item)
        else:
            strong.append(item)
            
    # Sort weak by lowest accuracy
    weak.sort(key=lambda x: x.accuracy)
    # Sort strong by highest accuracy
    strong.sort(key=lambda x: x.accuracy, reverse=True)
    
    return {"weak_topics": weak, "strong_topics": strong}

@app.get("/api/master/analytics/history", response_model=List[schemas.HistoryItem])
def get_quiz_history(db: Session = Depends(get_db)):
    sessions = db.query(models.MasterQuizSession).filter(models.MasterQuizSession.user_id == 1).order_by(models.MasterQuizSession.created_at.desc()).all()
    
    history = []
    for s in sessions:
        # Infer topic from first question? Or better, store topic in session? 
        # For now, "Mixed" or check first answer's question topic if we want to be fancy.
        # Let's keep it simple: "Mixed Practice"
        summary = "Generic Quiz"
        # If we want to check topic, we'd need to query. Let's skip for perf now.
        
        history.append(schemas.HistoryItem(
            id=s.id,
            score=s.score,
            total_questions=s.total_questions,
            created_at=s.created_at,
            topic_summary=summary
        ))
        
    return history


@app.post("/api/master/submit", response_model=schemas.MasterQuizSession)
def submit_master_quiz(session: schemas.MasterQuizSessionCreate, db: Session = Depends(get_db)):
    # Mock user_id = 1
    db_session = models.MasterQuizSession(
        user_id=1,
        score=session.score,
        total_questions=session.total_questions,
        answers=session.answers
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.delete("/api/master/questions/batch")
def delete_master_questions_batch(request: schemas.BatchDeleteRequest, db: Session = Depends(get_db)):
    if not request.question_ids:
        return {"message": "No questions provided"}
        
    # Chunking deletes if list is huge (optional, but safe)
    # For now, direct delete
    stmt = models.MasterQuestion.__table__.delete().where(models.MasterQuestion.id.in_(request.question_ids))
    result = db.execute(stmt)
    db.commit()
    
    return {"message": f"Deleted {result.rowcount} questions successfully"}
