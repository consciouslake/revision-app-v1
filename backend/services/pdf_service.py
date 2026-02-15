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
        # Check if text is mostly empty or garbage (indication of Scanned PDF)
        if len(text.strip()) < 50:
            print("PDF text is empty or too short. Keeping as empty for manual OCR trigger.")
            # We do NOT return vision_text here automatically to save credits.
            # User must use "Reprocess (OCR)" button.
                
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
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
