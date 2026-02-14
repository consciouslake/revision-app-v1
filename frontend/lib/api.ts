const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "An error occurred");
    }

    return res.json();
}

export async function uploadFile(endpoint: string, formData: FormData) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "An error occurred during upload");
    }

    return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateSubject(id: number, data: any) {
    return fetchAPI(`/subjects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteSubject(id: number) {
    return fetchAPI(`/subjects/${id}`, {
        method: 'DELETE',
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateChapter(id: number, data: any) {
    return fetchAPI(`/chapters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteChapter(id: number) {
    return fetchAPI(`/chapters/${id}`, {
        method: 'DELETE',
    });
}

export async function generateFlashcards(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/flashcards`, {
        method: 'POST',
    });
}

export async function getFlashcards(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/flashcards`);
}

export async function generateQuiz(chapterId: number, numQuestions: number = 5) {
    return fetchAPI(`/chapters/${chapterId}/quiz?num=${numQuestions}`, {
        method: 'POST',
    });
}

export async function getQuizzes(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/quizzes`);
}

export async function processEmbeddings(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/process-embeddings`, {
        method: 'POST',
    });
}

export async function submitQuizResult(quizId: number, score: number, totalQuestions: number, percentage: number) {
    return fetchAPI(`/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
            quiz_id: quizId,
            score,
            total_questions: totalQuestions,
            percentage
        })
    });
}

export async function getUserStats() {
    return fetchAPI(`/user/stats`);
}

export async function markChapterComplete(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/complete`, {
        method: 'POST',
    });
}


export async function getSubjectsProgress() {
    return fetchAPI(`/subjects/progress`);
}

export async function forceOCRChapter(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/force-ocr`, {
        method: 'POST',
    });
}

export async function toggleChapterImportant(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/toggle-important`, {
        method: 'POST',
    });
}

export async function getAIStudyPlan() {
    return fetchAPI(`/ai/study-plan`);
}

export async function getChapterProgress(chapterId: number) {
    return fetchAPI(`/chapters/${chapterId}/progress`);
}
