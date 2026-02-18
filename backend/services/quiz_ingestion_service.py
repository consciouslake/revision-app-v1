import google.generativeai as genai
import os
import json
import hashlib
import uuid
import re
from datetime import datetime
from dotenv import load_dotenv
from pypdf import PdfReader, PdfWriter
from io import BytesIO
from sqlalchemy.orm import Session
from models import MasterQuestion
from services.gemini_file_service import upload_to_gemini, wait_for_files_active

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

# Use 1.5 Flash for speed and cost effectiveness
MODEL_NAME = "gemini-flash-latest" 

# Global In-Memory Status Tracker
# Structure: { task_id: { "status": str, "total_chunks": int, "processed_chunks": int, "questions_count": int, "message": str, "error": str } }
ingestion_status = {}

def get_ingestion_status(task_id: str):
    data = ingestion_status.get(task_id)
    if not data:
        return {
            "task_id": task_id,
            "status": "not_found",
            "total_chunks": 0,
            "processed_chunks": 0,
            "questions_count": 0,
            "message": "Task not found",
            "error": "Invalid Task ID"
        }
    return {**data, "task_id": task_id}

def update_status(task_id: str, **kwargs):
    if task_id in ingestion_status:
        ingestion_status[task_id].update(kwargs)

def compute_question_hash(question_text: str, subject: str) -> str:
    """Computes a SHA256 hash of the normalized question text to detect duplicates."""
    # Remove leading numbering like "1.", "1)", "Q1.", "1 "
    cleaned_text = re.sub(r'^\s*(?:Q\.|Q\s)?\d+[\.\)\s]\s*', '', question_text, flags=re.IGNORECASE)
    normalized_text = re.sub(r'\s+', ' ', cleaned_text).strip().lower()
    content = f"{subject}|{normalized_text}"
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def split_pdf_into_chunks(file_path: str, chunk_size: int = 10, overlap: int = 2) -> list[BytesIO]:
    """
    Splits a PDF into overlapping chunks (BytesIO objects).
    Window slides by (chunk_size - overlap).
    """
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    chunks = []
    
    start = 0
    while start < total_pages:
        end = min(start + chunk_size, total_pages)
        
        writer = PdfWriter()
        for i in range(start, end):
            writer.add_page(reader.pages[i])
            
        chunk_buffer = BytesIO()
        writer.write(chunk_buffer)
        chunk_buffer.seek(0)
        chunks.append(chunk_buffer)
        
        # Stop if we reached end
        if end == total_pages:
            break
            
        # Slide window
        start += (chunk_size - overlap)
        
    return chunks, total_pages

def process_pdf_ingestion(task_id: str, file_path: str, subject: str, db_session_factory):
    """
    Background Task:
    1. Split PDF
    2. Iterate Chunks -> Gemini -> DB
    3. track progress
    """
    ingestion_status[task_id] = {
        "status": "processing",
        "total_chunks": 0,
        "processed_chunks": 0,
        "questions_count": 0,
        "message": "Initializing...",
        "error": None
    }
    
    try:
        print(f"[{task_id}] Starting ingestion for {file_path}")
        update_status(task_id, message="Splitting PDF into chunks...")
        
        # 1. Split PDF
        chunks, total_pages = split_pdf_into_chunks(file_path, chunk_size=10, overlap=2)
        total_chunks = len(chunks)
        update_status(task_id, total_chunks=total_chunks, message=f"Created {total_chunks} chunks from {total_pages} pages.")
        
        # 2. Process Loop
        db = db_session_factory()
        unique_questions_added = 0
        
        try:
            model = genai.GenerativeModel(model_name=MODEL_NAME)
            
            for index, chunk_buffer in enumerate(chunks):
                chunk_num = index + 1
                update_status(task_id, message=f"Processing chunk {chunk_num}/{total_chunks}...")
                
                # Save chunk to temp file for upload (Gemini requires file or bytes? UploadFile requires path)
                # upload_to_gemini takes path. Let's save temp chunk.
                chunk_filename = f"temp_chunk_{task_id}_{chunk_num}.pdf"
                with open(chunk_filename, "wb") as f:
                    f.write(chunk_buffer.getbuffer())
                
                try:
                    # Upload
                    gemini_file = upload_to_gemini(chunk_filename, mime_type="application/pdf")
                    wait_for_files_active([gemini_file])
                    
                    # Generate
                    prompt = f"""
                    You are an expert Question Extractor.
                    Target Subject: {subject}
                    
                    Extract ALL multiple-choice questions from this text.
                    
                    STRICT RULES:
                    1. **Language**: English Only. Flatten bilingual questions to English.
                    2. **JSON Only**: Output a VALID JSON LIST. No markdown.
                    3. **Incomplete Questions**: IGNORE any question that is cut off at the start or end of the text (due to page splitting).
                    4. **Math**: Preserve formatting, use LaTeX for math.
                    5. **Visuals**:
                        - If a question refers to an image/graph (e.g. "Refer to the figure"), **TRANSCODE** it into text. 
                        - Describe the graph/image in detail within the `question_text` so the question is solvable without the image.
                        - Example: "Given a graph showing Velocity vs Time where the line goes from (0,0) to (5,10)..."
                    6. **Structure**:
                    [
                        {{
                            "question_text": "...",
                            "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
                            "correct_option": "A",
                            "explanation": "...",
                            "chapter": "Detected Chapter Name",
                            "topic": "Detected Topic",
                            "image_url": null,
                            "option_images": null
                        }}
                    ]
                    """
                    
                    response = model.generate_content([gemini_file, prompt])
                    text = response.text.strip()
                    if text.startswith("```json"): text = text[7:]
                    if text.endswith("```"): text = text[:-3]
                    text = text.strip()
                    
                    new_questions = json.loads(text)
                    
                    # Deduplicate and Save
                    count_in_chunk = 0
                    for q_data in new_questions:
                        q_text = q_data.get("question_text", "")
                        q_hash = compute_question_hash(q_text, subject)
                        
                            # Check DB for duplicate hash (Optional optimization: check DB)
                        # For now, we perform local check if we want, but better to just insert and maybe handle error?
                        # Or query DB.
                        # Let's simple query:
                        exists = db.query(MasterQuestion).filter(MasterQuestion.question_hash == q_hash).first()
                        if not exists:
                            # Create
                            new_q = MasterQuestion(
                                subject=subject,
                                chapter=q_data.get("chapter", "General"),
                                topic=q_data.get("topic", "General"),
                                question_text=q_text,
                                options=q_data.get("options"),
                                correct_option=q_data.get("correct_option"),
                                explanation=q_data.get("explanation"),
                                question_hash=q_hash,
                                image_url=q_data.get("image_url"),
                                option_images=q_data.get("option_images")
                            )
                            db.add(new_q)
                            try:
                                db.commit()
                                count_in_chunk += 1
                                unique_questions_added += 1
                            except Exception as e:
                                db.rollback()
                                print(f"[{task_id}] Duplicate or Error inserting question: {e}")
                    
                    print(f"[{task_id}] Chunk {chunk_num}: Extracted {len(new_questions)}, Added {count_in_chunk} unique.")
                    
                except Exception as e:
                    print(f"[{task_id}] Error processing chunk {chunk_num}: {e}")
                    # Continue to next chunk
                finally:
                    # Cleanup temp file
                    if os.path.exists(chunk_filename):
                        os.remove(chunk_filename)
                        
                update_status(task_id, processed_chunks=chunk_num, questions_count=unique_questions_added)
            
            update_status(task_id, status="completed", message=f"Ingestion Complete. Added {unique_questions_added} questions.")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"[{task_id}] Critical Failure: {e}")
        import traceback
        traceback.print_exc()
        update_status(task_id, status="failed", error=str(e))

