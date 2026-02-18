
# --------------------------------------------------------------------------------
# MASTER QUIZ MODULE ENDPOINTS
# --------------------------------------------------------------------------------

@app.post("/api/master/ingest")
async def ingest_master_quiz_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests a PDF, extracts questions using Gemini Flash (Bilingual filtered),
    and saves them to the Master Question Bank.
    """
    # 1. Save file temporarily
    file_path = os.path.join(UPLOAD_DIR, f"ingest_{int(time.time())}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 2. Call Ingestion Service
    import time
    start_time = time.time()
    questions_data = ingest_quiz_pdf(file_path)
    
    if not questions_data:
        raise HTTPException(status_code=500, detail="Failed to extract questions from PDF.")

    # 3. Save to DB
    count = 0
    for q_data in questions_data:
        # Validate data minimally
        if "question_text" not in q_data or "options" not in q_data:
            continue
            
        db_question = models.MasterQuestion(
            subject=q_data.get("subject", "General"),
            chapter=q_data.get("chapter", "General"),
            topic=q_data.get("topic", "General"),
            question_text=q_data.get("question_text"),
            options=q_data.get("options"), # JSON
            correct_option=q_data.get("correct_option"),
            explanation=q_data.get("explanation"),
            reference=q_data.get("reference")
        )
        db.add(db_question)
        count += 1
    
    db.commit()
    
    # Optional: cleanup file? Keep for debugging for now.
    
    return {
        "message": f"Successfully ingested {count} questions.",
        "time_taken": round(time.time() - start_time, 2)
    }

@app.get("/api/master/generate", response_model=List[schemas.MasterQuestion])
def generate_master_quiz(
    subject: str = None,
    chapter: str = None,
    topic: str = None,
    count: int = 20,
    db: Session = Depends(get_db)
):
    """
    Generates a random quiz from the Master Bank based on filters.
    """
    query = db.query(models.MasterQuestion)
    
    if subject:
        query = query.filter(models.MasterQuestion.subject == subject)
    if chapter:
        query = query.filter(models.MasterQuestion.chapter == chapter)
    if topic:
        query = query.filter(models.MasterQuestion.topic == topic)
        
    # Randomize and Limit
    questions = query.order_by(func.random()).limit(count).all()
    
    if not questions:
         raise HTTPException(status_code=404, detail="No questions found matching criteria.")
         
    return questions

@app.post("/api/master/submit", response_model=schemas.MasterQuizSession)
def submit_master_quiz(
    session_data: schemas.MasterQuizSessionCreate,
    db: Session = Depends(get_db)
):
    """
    Submits a quiz session, calculates score, and saves history.
    """
    # 1. Fetch all questions to verify answers
    # session_data.answers is {question_id_str: option_char}
    
    score = 0
    total = len(session_data.answers)
    
    if total == 0:
         raise HTTPException(status_code=400, detail="No answers submitted.")

    for q_id, selected_opt in session_data.answers.items():
        # q_id might come as string from JSON keys
        question = db.query(models.MasterQuestion).filter(models.MasterQuestion.id == int(q_id)).first()
        if question and question.correct_option and selected_opt:
            if selected_opt.upper() == question.correct_option.upper():
                score += 1
    
    # 2. Save Session
    db_session = models.MasterQuizSession(
        user_id=session_data.user_id,
        score=score,
        total_questions=total,
        answers=session_data.answers
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return db_session

@app.get("/api/master/filters")
def get_master_quiz_filters(db: Session = Depends(get_db)):
    """
    Returns unique Subjects, Chapters, and Topics available in the bank.
    """
    subjects = db.query(models.MasterQuestion.subject).distinct().all()
    # Flatten list of tuples
    subjects = [s[0] for s in subjects if s[0]]
    
    # We could do cascading filters (get chapters for subject X), but for now return all unique
    data = {"subjects": subjects}
    return data

@app.get("/api/master/filters/chapters")
def get_chapters_by_subject(subject: str, db: Session = Depends(get_db)):
    chapters = db.query(models.MasterQuestion.chapter).filter(models.MasterQuestion.subject == subject).distinct().all()
    return [c[0] for c in chapters if c[0]]

@app.get("/api/master/filters/topics")
def get_topics_by_chapter(chapter: str, db: Session = Depends(get_db)):
    topics = db.query(models.MasterQuestion.topic).filter(models.MasterQuestion.chapter == chapter).distinct().all()
    return [t[0] for t in topics if t[0]]
