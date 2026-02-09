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
