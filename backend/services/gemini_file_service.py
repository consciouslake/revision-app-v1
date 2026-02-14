import google.generativeai as genai
import os
from dotenv import load_dotenv
import time

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

def upload_to_gemini(path, mime_type=None):
    """Uploads the given file to Gemini."""
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for name in (file.name for file in files):
        file = genai.get_file(name)
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
    print("...all files ready")

def extract_text_via_gemini_vision(file_path: str) -> str:
    """
    Uploads a PDF to Gemini and asks it to extract all text, preserving structure.
    Suitable for Scanned PDFs or OCR-heavy documents.
    """
    try:
        # 1. Upload File
        pdf_file = upload_to_gemini(file_path, mime_type="application/pdf")
        
        # 2. Wait for processing
        wait_for_files_active([pdf_file])
        
        # 3. Generate Content
        # Use a model that supports vision/multimodal
        model = genai.GenerativeModel(model_name="gemini-flash-latest")
        
        prompt = """
        You are an expert document digitizer. 
        Please extract ALL user-visible text from this PDF document.
        
        Rules:
        1. Preserve the original structure (headings, paragraphs, lists).
        2. If there are tables, format them as Markdown tables.
        3. Ignore headers/footers if they are repetitive page numbers.
        4. If images contain text (charts, diagrams), describe the key insight in brackets [Image: ...].
        5. Return ONLY the extracted text/markdown. No intro/outro.
        """
        
        print(f"Generating content for {pdf_file.name}...")
        response = model.generate_content([pdf_file, prompt])
        
        print(f"Gemini Response Feedback: {response.prompt_feedback}")
        if response.text:
            print(f"Gemini extracted {len(response.text)} characters.")
            return response.text
        else:
            print("Gemini response.text is empty.")
            return ""
        
    except Exception as e:
        print(f"Gemini Vision Extraction Failed: {e}")
        # Print full traceback
        import traceback
        traceback.print_exc()
        return ""
