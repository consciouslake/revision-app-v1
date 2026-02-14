
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import Base, engine
import models
from services.gemini_file_service import extract_text_via_gemini_vision
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Setup DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def test_ocr():
    # Fetch Chapter 3
    chapter_id = 3
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    
    if not chapter:
        print(f"Chapter {chapter_id} not found.")
        return

    print(f"Testing OCR for: {chapter.title}")
    print(f"Relative Path: {chapter.pdf_url}")
    
    # Resolve absolute path
    # Assuming the script is run from backend/ directory
    # and uploads might be in backend/uploads or parent/uploads depending on config.
    # The API uses os.path.abspath(db_chapter.pdf_url).
    # Let's check where the file actually is.
    
    full_path = os.path.abspath(chapter.pdf_url)
    print(f"Absolute Path: {full_path}")
    
    if not os.path.exists(full_path):
        print("File does NOT exist at this path!")
        # Try checking relative to backend root if CWD is backend
        alt_path = os.path.join(os.getcwd(), chapter.pdf_url)
        print(f"Checking alt path: {alt_path}")
        if os.path.exists(alt_path):
            full_path = alt_path
            print("Found at alt path.")
        else:
            print("File still not found.")
            return

    # Call the service
    candidates = [
        "gemini-1.5-flash",
        "models/gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro-001",
        "gemini-flash-latest",
        "gemini-pro-vision"
    ]

    load_dotenv()
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

    # Upload file once
    print(f"Uploading file for testing: {full_path}")
    pdf_file = genai.upload_file(full_path, mime_type="application/pdf")
    print(f"File uploaded: {pdf_file.name}")
    
    # Wait for processing
    import time
    while pdf_file.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(2)
        pdf_file = genai.get_file(pdf_file.name)
    print("Ready.")

    for model_name in candidates:
        print(f"\nTrying model: {model_name}...")
        try:
            model = genai.GenerativeModel(model_name=model_name)
            response = model.generate_content([pdf_file, "Extract text"])
            print(f"SUCCESS with {model_name}!")
            print(f"Feedback: {response.prompt_feedback}")
            print(f"Text len: {len(response.text)}")
            break
        except Exception as e:
            print(f"FAILED with {model_name}: {e}")

if __name__ == "__main__":
    test_ocr()
