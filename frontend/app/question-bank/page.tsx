"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionEditorModal } from "@/components/question-bank/QuestionEditorModal";
import { ArrowLeft, ArrowRight, Search, Edit, Upload, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function QuestionBankPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [search, setSearch] = useState("");
    const [subject, setSubject] = useState("All");
    const [subjects, setSubjects] = useState<string[]>([]);

    const [editingQuestion, setEditingQuestion] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Ingestion State
    const [ingesting, setIngesting] = useState(false);
    const [ingestMsg, setIngestMsg] = useState("");
    const [ingestTaskId, setIngestTaskId] = useState<string | null>(null);
    const [ingestStatus, setIngestStatus] = useState<any>(null);
    const [selectedIngestSubject, setSelectedIngestSubject] = useState<string>("");

    // Polling Effect for Ingestion
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (ingestTaskId) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_URL}/api/master/ingest/${ingestTaskId}/status`);
                    if (res.ok) {
                        const status = await res.json();
                        setIngestStatus(status);

                        if (status.status === "completed") {
                            setIngestMsg(`Success! ${status.message}`);
                            setIngesting(false);
                            setIngestTaskId(null);
                            fetchSubjects(); // Refresh subjects
                            fetchQuestions(); // Refresh questions
                        } else if (status.status === "failed") {
                            setIngestMsg(`Error: ${status.error}`);
                            setIngesting(false);
                            setIngestTaskId(null);
                        } else {
                            const pct = status.total_chunks > 0 ? Math.round((status.processed_chunks / status.total_chunks) * 100) : 0;
                            setIngestMsg(`Processing chunk ${status.processed_chunks + 1}/${status.total_chunks}... (${pct}%)`);
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [ingestTaskId]);

    const handleIngest = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!selectedIngestSubject) {
            alert("Please enter a subject name first.");
            return;
        }

        setIngesting(true);
        setIngestMsg("Uploading PDF...");
        setIngestStatus(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("subject", selectedIngestSubject);

        try {
            const res = await fetch(`${API_URL}/api/master/ingest`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setIngestTaskId(data.task_id);
                setIngestMsg("Ingestion started...");
            } else {
                setIngestMsg(`Error: ${data.detail}`);
                setIngesting(false);
            }
        } catch (e) {
            setIngestMsg("Failed to upload file.");
            setIngesting(false);
        }
    };

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        fetchQuestions();
        setSelectedIds([]); // Reset selection on fetch
    }, [page, search, subject]);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(`${API_URL}/api/master/filters`);
            const data = await res.json();
            setSubjects(data.subjects || []);
        } catch (e) {
            console.error("Failed to fetch subjects", e);
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/api/master/questions?skip=${page * limit}&limit=${limit}`;
            if (subject && subject !== "All") url += `&subject=${encodeURIComponent(subject)}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await fetch(url);
            const data = await res.json();
            setQuestions(data);
        } catch (e) {
            console.error("Failed to fetch questions", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(questions.map(q => q.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} questions?`)) return;

        try {
            const res = await fetch(`${API_URL}/api/master/questions/batch`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question_ids: selectedIds })
            });

            if (res.ok) {
                alert("Questions deleted successfully.");
                setSelectedIds([]);
                fetchQuestions(); // Refresh
                fetchSubjects(); // Might need to refresh counts if we had them
            } else {
                alert("Failed to delete questions.");
            }
        } catch (e) {
            console.error("Delete failed", e);
            alert("Error deleting questions.");
        }
    };

    const handleEdit = (q: any) => {
        setEditingQuestion(q);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingQuestion(null);
    };

    const handleSave = () => {
        fetchQuestions(); // Refresh list
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Question Bank (Updated)</h1>
                    {selectedIds.length > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Expand Question Bank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Label>Upload PDF (Exam Papers)</Label>
                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                    <Label htmlFor="pdf-upload" className="cursor-pointer">
                                        <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                                        <span className="block text-sm font-medium text-slate-900">
                                            Click to Upload PDF
                                        </span>
                                        <input
                                            id="pdf-upload"
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={handleIngest}
                                            disabled={ingesting}
                                        />
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Target Subject</Label>
                                    <Input
                                        placeholder="Enter Subject Name (e.g., Physics)"
                                        value={selectedIngestSubject}
                                        onChange={(e) => setSelectedIngestSubject(e.target.value)}
                                    />
                                </div>

                                {ingesting && (
                                    <div className="space-y-2">
                                        <div className="text-sm text-blue-600 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {ingestMsg}
                                        </div>
                                        {ingestStatus?.total_chunks > 0 && (
                                            <Progress value={(ingestStatus.processed_chunks / ingestStatus.total_chunks) * 100} />
                                        )}
                                    </div>
                                )}

                                {!ingesting && ingestMsg && (
                                    <div className={`text-sm font-medium ${ingestMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
                                        {ingestMsg}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Filters & Search</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search question text..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <Select value={subject} onValueChange={setSubject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Subjects</SelectItem>
                                    {subjects.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white rounded-md border shadow">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <input
                                        type="checkbox"
                                        role="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                                        checked={questions.length > 0 && selectedIds.length === questions.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </TableHead>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead className="w-[150px]">Subject</TableHead>
                                <TableHead className="w-[150px]">Topic</TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : questions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No questions found.</TableCell>
                                </TableRow>
                            ) : (
                                questions.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                role="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                                                checked={selectedIds.includes(q.id)}
                                                onChange={(e) => handleSelectOne(q.id, e.target.checked)}
                                            />
                                        </TableCell>
                                        <TableCell>{q.id}</TableCell>
                                        <TableCell>{q.subject}</TableCell>
                                        <TableCell className="truncate max-w-[150px]">{q.topic}</TableCell>
                                        <TableCell className="truncate max-w-[400px]">
                                            {q.question_text.substring(0, 100)}...
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(q)}>
                                                <Edit className="h-4 w-4 mr-1" /> Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0 || loading}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                    </Button>
                    <span className="text-sm text-slate-500">Page {page + 1}</span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={questions.length < limit || loading}
                    >
                        Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </main>

            <QuestionEditorModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handleSave}
                question={editingQuestion}
            />
        </div>
    );
}
