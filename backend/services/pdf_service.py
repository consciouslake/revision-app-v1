import pypdf
import io

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a PDF file at the given path."""
    text = ""
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
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
