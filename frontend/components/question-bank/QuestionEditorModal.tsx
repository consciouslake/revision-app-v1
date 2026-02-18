"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface Question {
    id: number;
    question_text: string;
    options: Record<string, string>;
    correct_option: string;
    explanation: string;
    subject: string;
    topic: string;
    image_url?: string;
    option_images?: Record<string, string | null>;
}

interface QuestionEditorModalProps {
    question: Question | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function QuestionEditorModal({ question, isOpen, onClose, onSave }: QuestionEditorModalProps) {
    const [formData, setFormData] = useState<Partial<Question>>({});
    const [loading, setLoading] = useState(false);

    // File refs
    const questionImageRef = useRef<HTMLInputElement>(null);
    const optionImageRefs = {
        A: useRef<HTMLInputElement>(null),
        B: useRef<HTMLInputElement>(null),
        C: useRef<HTMLInputElement>(null),
        D: useRef<HTMLInputElement>(null),
    };

    useEffect(() => {
        if (question) {
            setFormData({ ...question });
        } else {
            setFormData({});
        }
    }, [question, isOpen]);

    const handleChange = (field: keyof Question, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            options: { ...prev.options, [key]: value } as any
        }));
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const form = new FormData();
        form.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/upload-image`, {
                method: "POST",
                body: form
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            // data.url returns relative path "uploads/..."
            // We prefer passing full URL or relative depending on how backend serves.
            // Backend serves /uploads, so "uploads/filename" is correct relative to root if using <img src={API_URL + '/' + url} />
            return data.url;
        } catch (e) {
            console.error(e);
            alert("Image upload failed");
            return null;
        }
    };

    const handleImageUpload = async (file: File, target: "question" | "option", optionKey?: string) => {
        setLoading(true);
        const url = await uploadImage(file);
        setLoading(false);

        if (!url) return;

        if (target === "question") {
            setFormData(prev => ({ ...prev, image_url: url }));
        } else if (target === "option" && optionKey) {
            setFormData(prev => ({
                ...prev,
                option_images: { ...(prev.option_images || {}), [optionKey]: url }
            }));
        }
    };

    const handleSave = async () => {
        if (!formData.question_text || !formData.correct_option) {
            alert("Please fill required fields");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/master/questions/${question?.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question_text: formData.question_text,
                    options: formData.options,
                    correct_option: formData.correct_option,
                    explanation: formData.explanation,
                    image_url: formData.image_url,
                    option_images: formData.option_images
                })
            });

            if (!res.ok) throw new Error("Update failed");

            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Question {question?.id}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">

                    {/* Question Text */}
                    <div className="space-y-2">
                        <Label>Question Text (Markdown/LaTeX supported)</Label>
                        <Textarea
                            value={formData.question_text || ""}
                            onChange={e => handleChange("question_text", e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    {/* Question Image */}
                    <div className="space-y-2">
                        <Label>Question Image</Label>
                        <div className="flex items-center gap-4">
                            {formData.image_url && (
                                <div className="relative">
                                    <img src={`${API_URL}/${formData.image_url}`} className="h-20 w-auto rounded border" />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                        onClick={() => handleChange("image_url", null)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={questionImageRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "question")}
                            />
                            <Button variant="outline" size="sm" onClick={() => questionImageRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2" />
                                {formData.image_url ? "Change Image" : "Upload Image"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {["A", "B", "C", "D"].map((opt) => (
                            <div key={opt} className="space-y-2 border p-3 rounded-md">
                                <div className="flex justify-between items-center">
                                    <Label>Option {opt}</Label>
                                    <input
                                        type="file"
                                        ref={optionImageRefs[opt as keyof typeof optionImageRefs]}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "option", opt)}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => optionImageRefs[opt as keyof typeof optionImageRefs].current?.click()}>
                                        <ImageIcon className="h-4 w-4 text-slate-500" />
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        value={formData.options?.[opt] || ""}
                                        onChange={e => handleOptionChange(opt, e.target.value)}
                                        placeholder={`Option ${opt} text`}
                                    />
                                </div>

                                {formData.option_images?.[opt] && (
                                    <div className="relative mt-2 inline-block">
                                        <img src={`${API_URL}/${formData.option_images[opt]}`} className="h-16 w-auto rounded border" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                                            onClick={() => {
                                                const newImages = { ...formData.option_images };
                                                delete newImages[opt];
                                                setFormData(prev => ({ ...prev, option_images: newImages }));
                                            }}
                                        >
                                            <X className="h-2 w-2" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Correct Option</Label>
                            <Select
                                value={formData.correct_option}
                                onValueChange={(val) => handleChange("correct_option", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Answer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["A", "B", "C", "D"].map(o => <SelectItem key={o} value={o}>Option {o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Topic</Label>
                            <Input value={formData.topic || ""} onChange={e => handleChange("topic", e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Explanation</Label>
                        <Textarea
                            value={formData.explanation || ""}
                            onChange={e => handleChange("explanation", e.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
