"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI, uploadFile, deleteChapter } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import { Loader2, FileText, Upload, BookOpen, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditChapterDialog } from "@/components/EditChapterDialog";

interface Chapter {
    id: number;
    title: string;
    pdf_url: string;
}

interface Subject {
    id: number;
    name: string;
    description?: string;
    chapters: Chapter[];
}

export default function SubjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const subjectId = params.id;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

    // Upload Form State
    const [chapterTitle, setChapterTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const loadSubject = useCallback(() => {
        if (subjectId) {
            setLoading(true);
            fetchAPI(`/subjects/`)
                .then((data: Subject[]) => {
                    const sub = data.find(s => s.id === Number(subjectId));
                    if (sub) setSubject(sub);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [subjectId]);

    useEffect(() => {
        loadSubject();
    }, [loadSubject]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !chapterTitle || !subjectId) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("subject_id", subjectId as string);
        formData.append("title", chapterTitle);
        formData.append("file", file);

        try {
            await uploadFile("/chapters/", formData);
            // Refresh data
            loadSubject();

            // Reset form and close sheet
            setChapterTitle("");
            setFile(null);
            setIsSheetOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to upload chapter.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteChapter = async (e: React.MouseEvent, id: number, title: string) => {
        e.preventDefault();
        if (confirm(`Are you sure you want to delete "${title}"? This will delete the PDF and all chat history.`)) {
            try {
                await deleteChapter(id);
                // Optimistic update or reload
                if (subject) {
                    setSubject({
                        ...subject,
                        chapters: subject.chapters.filter(c => c.id !== id)
                    });
                }
            } catch (error) {
                console.error(error);
                alert("Failed to delete chapter");
                loadSubject(); // Fallback
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4">
                <h2 className="text-xl font-semibold">Subject not found</h2>
                <Button variant="outline" onClick={() => router.push('/subjects')}>Go Back</Button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="container mx-auto max-w-5xl px-6 py-8">
                    <Link href="/subjects" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Subjects
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                {subject.name}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 max-w-xl">
                                {subject.description || "Manage your chapters, upload revisions, and start your AI-powered study sessions here."}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                                    <BookOpen className="w-4 h-4" />
                                    {subject.chapters?.length || 0} Chapters
                                </span>
                            </div>
                        </div>

                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02]">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add New Chapter
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-md">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="text-xl">Upload Chapter</SheetTitle>
                                    <SheetDescription>
                                        Add a new PDF chapter to <strong>{subject.name}</strong>. The AI will process it for study.
                                    </SheetDescription>
                                </SheetHeader>
                                <form onSubmit={handleUpload} className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="title" className="text-base font-medium">Chapter Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Thermodynamics and Kinetics"
                                            value={chapterTitle}
                                            onChange={(e) => setChapterTitle(e.target.value)}
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="file" className="text-base font-medium">PDF Document</Label>
                                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group">
                                            <input
                                                id="file"
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                required
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {file ? file.name : "Click to browse or drag file"}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">PDFs only, up to 10MB</p>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-11 text-base" disabled={uploading}>
                                        {uploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            "Upload & Process"
                                        )}
                                    </Button>
                                </form>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="container mx-auto max-w-5xl px-6 py-10">

                {subject.chapters && subject.chapters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subject.chapters.map((chapter) => (
                            <Link key={chapter.id} href={`/study/${chapter.id}`} className="group/card block focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl relative">
                                <Card className="h-full border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 group-hover/card:-translate-y-1">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400 mb-3 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-colors duration-200">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            {/* Actions */}
                                            <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEditingChapter(chapter);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteChapter(e, chapter.id, chapter.title);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-semibold leading-tight line-clamp-2 group-hover/card:text-indigo-600 transition-colors">
                                            {chapter.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-sm">
                                            Ready for revision. Click to open reader & AI tutor.
                                        </CardDescription>
                                        <div className="mt-4 flex items-center text-xs font-medium text-indigo-600 opacity-0 group-hover/card:opacity-100 transition-opacity transform translate-y-2 group-hover/card:translate-y-0 duration-200">
                                            Start Studying <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-full shadow-sm mb-4">
                            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No chapters yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
                            This subject is empty. Upload your first PDF chapter to start building your revision library.
                        </p>
                        <Button onClick={() => setIsSheetOpen(true)} variant="outline">
                            Upload Chapter
                        </Button>
                    </div>
                )}
            </div>

            <EditChapterDialog
                open={!!editingChapter}
                onOpenChange={(open) => !open && setEditingChapter(null)}
                chapter={editingChapter}
                onSuccess={() => {
                    setEditingChapter(null);
                    loadSubject();
                }}
            />
        </main>
    );
}
