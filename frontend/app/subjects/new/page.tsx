"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function NewSubjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        cover_emoji: "📚",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await fetchAPI("/subjects/", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            router.push("/subjects");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to create subject");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container mx-auto p-8 max-w-xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Create New Subject</h1>
                <p className="text-slate-500">Organize your study materials.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Subject Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Advanced Physics"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                        id="description"
                        placeholder="What is this subject about?"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="emoji">Cover Emoji</Label>
                    <Input
                        id="emoji"
                        className="text-2xl w-16 text-center"
                        maxLength={2}
                        value={formData.cover_emoji}
                        onChange={(e) => setFormData({ ...formData, cover_emoji: e.target.value })}
                    />
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Subject
                    </Button>
                </div>
            </form>
        </main>
    );
}
