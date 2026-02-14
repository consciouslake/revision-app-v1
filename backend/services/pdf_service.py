import pypdf
import io

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a PDF file at the given path."""
    text = ""
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        # Check if text is mostly empty or garbage (indication of Scanned PDF)
        if len(text.strip()) < 50:
            print("PDF text is empty or too short. Attempting Gemini Vision OCR...")
            from services.gemini_file_service import extract_text_via_gemini_vision
            vision_text = extract_text_via_gemini_vision(file_path)
            if vision_text:
                return vision_text
                
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        # Try fallback immediately on error if pypdf fails completely
        try:
             print("pypdf failed. Attempting Gemini Vision OCR...")
             from services.gemini_file_service import extract_text_via_gemini_vision
             return extract_text_via_gemini_vision(file_path)
        except:
             return ""
            
    return text

def extract_text_from_bytes(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes."""
    text = ""
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error reading PDF bytes: {e}")
        return ""
    return text
