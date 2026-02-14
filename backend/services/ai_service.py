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

def generate_flashcards(context: str, num_cards: int = 10) -> list[dict]:
    """
    Generates flashcards from the given context.
    Returns a list of dicts with 'front' and 'back' keys.
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = f"""
        You are an expert tutor used to help students revise.
        Create {num_cards} concise flashcards based on the following text.
        
        Focus on:
        - Key definitions
        - Important concepts
        - Formulas or dates (if applicable)
        
        Return the response AS A VALID JSON LIST of objects, where each object has:
        - "front": The question or term
        - "back": The answer or definition
        
        Do not include any markdown formatting like ```json ... ```. Just return the raw JSON string.
        
        Context:
        {context[:30000]} 
        """
        # Truncate context to avoid token limits if necessary, though 1.5 flash has 1M context.
        # Keeping safe at 30k chars for now.

        response = model.generate_content(prompt)
        import json
        
        # Clean potential markdown
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        return []

def generate_quiz(context: str, num_questions: int = 5) -> list[dict]:
    """
    Generates a quiz from the given context.
    Returns a list of dicts with question_text, options, and correct_option.
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = f"""
        You are an expert tutor. Create a multiple-choice quiz with {num_questions} questions based on the following text.
        
        Return the response AS A VALID JSON LIST of objects, where each object has:
        - "question_text": The question string
        - "option_a": Option A string
        - "option_b": Option B string
        - "option_c": Option C string
        - "option_d": Option D string
        - "correct_option": The correct option char ("A", "B", "C", or "D")
        
        Do not include any markdown formatting like ```json ... ```. Just return the raw JSON string.
        
        Context:
        {context[:30000]}
        """

        response = model.generate_content(prompt)
        import json
        
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return []

def generate_study_plan(user_stats: dict, subject_stats: list[dict], important_chapters: list[dict]) -> str:
    """
    Generates a personalized study plan using Gemini.
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Construct summary of progress
        subjects_summary = "\n".join([
            f"- {s['subject_name']}: {s['completed_chapters']}/{s['total_chapters']} chapters completed. Last studied: {s['last_studied_at'] or 'Never'}"
            for s in subject_stats
        ])
        
        important_summary = "None"
        if important_chapters:
            important_summary = "\n".join([f"- {c['title']} (Subject ID: {c['subject_id']})" for c in important_chapters])
            
        prompt = f"""
        You are an expert AI Study Coach. Your goal is to motivate the student and provide a specific, actionable daily plan.
        
        Student Stats:
        - Mastery Level: {user_stats.get('mastery_level', 'Novice')}
        - Current Streak: {user_stats.get('streak_days', 0)} days
        - Avg Quiz Score: {user_stats.get('average_quiz_score', 0)}%
        
        Subject Progress:
        {subjects_summary}
        
        Chapters Marked as IMPORTANT (Prioritize these):
        {important_summary}
        
        Task:
        1. Acknowledge their streak (if > 0) or encourage them to start one.
        2. Suggest 2-3 specific actions for today. prioritize "Important" chapters first, then subjects with low progress or not studied recently.
        3. End with a short, punchy motivational quote.
        
        Format:
        Return a clean Markdown response. Use bolding for emphasis. 
        Do NOT use headers like "## Study Plan". Just give the content directly.
        Keep it under 150 words.
        """
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating study plan: {e}")
        return "Focus on your lowest performing subjects today! You got this."
