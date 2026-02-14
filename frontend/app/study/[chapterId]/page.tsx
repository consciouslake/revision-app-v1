"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchAPI, processEmbeddings, markChapterComplete, forceOCRChapter, toggleChapterImportant } from "@/lib/api";
import PDFReader from "@/components/PDFReader";
import ChatComponent from "@/components/ChatComponent";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, BookOpen, Brain, Trophy, Loader2, Database, CheckCircle, ScanEye } from "lucide-react";
import Link from "next/link";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { QuizComponent } from "@/components/QuizComponent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const [processing, setProcessing] = useState(false);
    const [isImportant, setIsImportant] = useState(false);

    // Fetch chapter details
    useEffect(() => {
        if (chapterId) {
            Promise.all([
                fetchAPI(`/chapters/${chapterId}`),
                fetchAPI(`/chapters/${chapterId}/progress`).catch(() => null)
            ])
                .then(([chapterData, progressData]) => {
                    setChapter(chapterData);
                    if (progressData) {
                        setIsImportant(progressData.is_important);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [chapterId]);

    const handleProcessEmbeddings = async () => {
        setProcessing(true);
        try {
            await processEmbeddings(Number(chapterId));
            alert("Embeddings processed! AI chat will now be smarter.");
        } catch (error) {
            console.error(error);
            alert("Failed to process embeddings.");
        } finally {
            setProcessing(false);
        }
    };

    const handleForceOCR = async () => {
        if (!confirm("This will use AI Vision to re-read the PDF. This may take 10-20 seconds. Continue?")) return;
        setProcessing(true);
        try {
            await forceOCRChapter(Number(chapterId));
            alert("Success! The AI has re-read the document using Vision. Please refresh the page.");
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("Failed to re-process document. Check server logs.");
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkComplete = async () => {
        try {
            await markChapterComplete(Number(chapterId));
            alert("Chapter marked as complete!");
        } catch (error) {
            console.error(error);
            alert("Failed to mark chapter as complete.");
        }
    };

    const handleToggleImportant = async () => {
        try {
            const updated = await fetchAPI(`/chapters/${chapterId}/toggle-important`, { method: 'POST' });
            setIsImportant(updated.is_important);
        } catch (error) {
            console.error(error);
            alert("Failed to update status.");
        }
    };

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
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/subjects/${chapter.subject_id}`} className="p-2 hover:bg-slate-100 rounded-md">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="font-semibold text-sm md:text-base truncate max-w-md">{chapter.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleImportant}
                        className={`text-xs ${isImportant ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-slate-400 hover:text-amber-500"}`}
                    >
                        <Trophy className={`w-4 h-4 mr-1 ${isImportant ? "fill-amber-500" : ""}`} />
                        {isImportant ? "Important" : "Mark Important"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleForceOCR}
                        disabled={processing}
                        className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                    >
                        <ScanEye className="w-3 h-3 mr-1" />
                        Reprocess (OCR)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkComplete}
                        className="text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700"
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Complete
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleProcessEmbeddings}
                        disabled={processing}
                        className="text-xs text-slate-500 hover:text-indigo-600"
                    >
                        {processing ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                            <Database className="w-3 h-3 mr-1" />
                        )}
                        {processing ? "Indexing..." : "Index for AI"}
                    </Button>
                    <div className="flex text-xs text-slate-400 gap-4">
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> PDF Mode</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> AI Tutor Active</span>
                    </div>
                </div>
            </header>

            {/* Main Split View */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel defaultSize={65} minSize={30}>
                        <div className="h-full w-full">
                            <PDFReader url={pdfUrl} />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={35} minSize={20}>
                        <Tabs defaultValue="chat" className="h-full flex flex-col bg-white">
                            <div className="border-b border-slate-200 px-4 py-2 bg-slate-50">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="chat" className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Chat
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        History
                                    </TabsTrigger>
                                    <TabsTrigger value="flashcards" className="flex items-center gap-2">
                                        <Brain className="w-4 h-4" />
                                        Flashcards
                                    </TabsTrigger>
                                    <TabsTrigger value="quiz" className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        Quiz
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="chat" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 border-0">
                                <ChatComponent chapterId={String(chapterId)} mode="chat" />
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 border-0">
                                <ChatComponent chapterId={String(chapterId)} mode="history" />
                            </TabsContent>

                            <TabsContent value="flashcards" className="flex-1 overflow-y-auto bg-slate-50/50 p-4 m-0 data-[state=active]:flex flex-col">
                                <FlashcardDeck chapterId={Number(chapterId)} />
                            </TabsContent>

                            <TabsContent value="quiz" className="flex-1 overflow-y-auto bg-slate-50/50 p-4 m-0 data-[state=active]:flex flex-col">
                                <QuizComponent chapterId={Number(chapterId)} />
                            </TabsContent>
                        </Tabs>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
