# Recall - AI Revision Platform

## Overview
Recall is a minimalist, high-performance web application for studying and revising chapters. It features a smart PDF reader and an AI tutor powered by Gemini 1.5 Flash.

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL
- **AI**: Gemini 1.5 Flash

## Setup

### Backend
1.  Navigate to `backend`:
    ```bash
    cd backend
    ```
2.  Create and activate virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```

### Frontend
1.  Navigate to `frontend`:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
