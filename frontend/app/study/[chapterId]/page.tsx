"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import PDFReader from "@/components/PDFReader";
import ChatComponent from "@/components/ChatComponent";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, BookOpen } from "lucide-react";
import Link from "next/link";

interface Chapter {
    id: number;
    title: string;
    pdf_url: string;
    subject_id: number;
}

export default function StudyPage() {
    const params = useParams();
    const chapterId = params.chapterId as string;
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch chapter details
    useEffect(() => {
        if (chapterId) {
            fetchAPI(`/chapters/${chapterId}`)
                .then(setChapter)
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [chapterId]);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!chapter) return <div className="flex h-screen items-center justify-center">Chapter not found</div>;

    // Since we are running locally, the absolute path from backend might be tricky for iframe.
    // The backend saves to `uploads/filename.pdf`.
    // We need to serve this static file.
    // FastAPI implementation: We haven't set up StaticFiles in backend/main.py yet!
    // I must fix backend to serve uploads.
    // For now, let's assume the URL is correct relative to the API.
    const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/${chapter.pdf_url.replace(/\\/g, "/")}`;

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/subjects/${chapter.subject_id}`} className="p-2 hover:bg-slate-100 rounded-md">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="font-semibold text-sm md:text-base truncate max-w-md">{chapter.title}</h1>
                </div>
                <div className="flex text-xs text-slate-400 gap-4">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> PDF Mode</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> AI Tutor Active</span>
                </div>
            </header>

            {/* Main Split View */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={65} minSize={30}>
                        <div className="h-full w-full">
                            <PDFReader url={pdfUrl} />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={35} minSize={20}>
                        <div className="h-full w-full">
                            <ChatComponent chapterId={chapterId} />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
