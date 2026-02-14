
# 🧠 Recall: AI-Powered Revision Platform

Recall is an intelligent study companion that transforms static PDF notes into an interactive learning experience. It uses advanced AI to turn your study materials into personalized quizzes, flashcards, and a 24/7 expert tutor.

![Dashboard Preview](frontend/public/dashboard-preview.png) *[Placeholder for Screenshot]*

---

## 🚀 Key Features

*   **📚 Smart Library**: Organize your study materials by subject and chapter.
*   **🤖 AI Tutor**: Chat with your PDF. Ask questions, get summaries, and clarify doubts instantly.
*   **⚡ Auto-Flashcards**: One-click generation of flashcards for active recall.
*   **📝 Instant Quizzes**: Test your knowledge with AI-generated multiple-choice questions.
*   **🔥 Streak & Progress Tracking**: Gamified dashboard with daily streaks, mastery levels, and visual progress bars.
*   **📅 AI Study Coach**: Generates a personalized daily study plan based on your weak areas and "Important" marked chapters.
*   **👁️ Smart PDF Scanning**: Automatically detects scanned/image-based PDFs (like NotebookLM exports) and uses **Gemini Vision** to read them perfectly.

---

## 🛠️ Technology Stack

We use a modern, robust stack designed for speed, scalability, and AI integration.

### **Frontend** (Client-Side)
*   **Framework**: [Next.js 16](https://nextjs.org/) (React 19) - For server-side rendering and high performance.
*   **Language**: TypeScript - Ensures type safety and cleaner code.
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS for rapid, beautiful UI development.
*   **UI Components**: [Shadcn/UI](https://ui.shadcn.com/) (Radix Primitives) - Accessible, customizable, and professional-grade components.
*   **Animations**: [Framer Motion](https://www.framer.com/motion/) - Smooth, complex animations for a premium feel.
*   **PDF Rendering**: `react-pdf` - Renders PDF documents directly in the browser.

### **Backend** (Server-Side)
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) - High-performance Python web framework, ideal for ML/AI backends.
*   **Database**: SQLite (with SQLAlchemy ORM) - Lightweight, zero-config relational database.
*   **AI Engine**: [Google Gemini 1.5 Flash](https://deepmind.google/technologies/gemini/) - A multimodal model optimized for speed and high-volume context processing.

---

## 🧠 AI Modules & Architecture

The core of Recall is its AI Service layer (`backend/services/`), which orchestrates calls to Google Gemini.

### 1. **Contextual Chat Engine** (`ask_gemini`)
*   **Function**: Acts as a Socratic tutor.
*   **Logic**: Injects the specific chapter's text into the system prompt. Usage of "System Instructions" ensures the AI prioritizes the provided text over general knowledge, reducing hallucinations.

### 2. **Active Recall Generators**
*   **Flashcards** (`generate_flashcards`): Extracts definitions and key dates, outputting strictly structured JSON.
*   **Quizzes** (`generate_quiz`): Generates distractors (wrong answers) and correct answers to test deep understanding.

### 3. **The "Study Coach" Agent** (`generate_study_plan`)
*   **Function**: Acts as a personal mentor.
*   **Logic**: Analyzes `UserProgress` table (streaks, last active dates, "Important" flags). It constructs a motivational prompt to suggest specific daily actions (e.g., "Review Chapter 3 because you marked it Important").

### 4. **Smart Vision Scanner** (`gemini_file_service`)
*   **Problem**: Standard Python libraries (`pypdf`) cannot read text from scanned images or complex layouts.
*   **Solution**: If text extraction fails, the system seamlessly uploads the PDF to **Gemini Vision**. The model "sees" the document (charts, handwriting, diagrams) and transcribes it with high fidelity.

---

## 🗄️ Database Schema

We use a normalized relational schema to ensure data integrity.

*   **Subjects**: Top-level containers (e.g., "Biology", "History").
*   **Chapters**: Individual PDF units. Stores `raw_text_content` for AI context.
*   **UserProgress**: Tracks `last_read_position`, `is_completed`, `streak_days`, and the new `is_important` flag used by the Study Coach.
*   **Interactions**: `Messages` (Chat history), `Flashcards`, `Quizzes` (Questions + Results).

---

## 💡 Why This Stack?

1.  **FastAPI + Next.js**: The industry standard for "Modern AI Wrappers". Python handles the heavy AI logic, while Next.js delivers a responsive, app-like frontend.
2.  **Gemini 1.5 Flash**: Chosen over GPT-4 for its massive context window (1M tokens) and speed—critical for reading entire textbooks in seconds.
3.  **Local First**: SQLite ensures user data is private and the app is easy to deploy locally without expensive cloud DBs.

---

## 🏃‍♂️ Getting Started

### Prerequisites
*   Node.js 18+
*   Python 3.10+
*   Google Gemini API Key

### Installation

1.  **Clone the repo**
2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  **Backend Setup**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # or venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```

### Usage
Open `http://localhost:3002` and create your first Subject!
