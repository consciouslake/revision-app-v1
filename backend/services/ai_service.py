import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    print("Warning: GOOGLE_API_KEY not found in environment variables.")

genai.configure(api_key=API_KEY)

# Use gemini-flash-latest (stable alias which might have better availability)
MODEL_NAME = "gemini-flash-latest"

def ask_gemini(context: str, query: str) -> str:
    """
    Sends the chapter context and user query to Gemini 1.5 Flash.
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # System instruction to define persona
        system_instruction = (
            "You are an expert tutor. Prioritize the 'Summary' section for definitions and core concepts. "
            "Use the 'Raw Text' for specific details. If the answer isn't in the text, admit it.\n"
            "FORMATTING RULES:\n"
            "- Use Markdown for all responses.\n"
            "- Use ## Headings to structure the answer.\n"
            "- Use bullet points for lists and features.\n"
            "- Bold key terms.\n"
            "- Keep paragraphs short and readable."
        )

        prompt = f"""
        {system_instruction}

        Context:
        {context}

        Question:
        {query}
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        error_msg = str(e)
        print(f"Error calling Gemini API: {error_msg}")
        if "429" in error_msg:
            return "Limit exceeded. Please wait a moment and try again."
        return "Sorry, I encountered an error while processing your request."
