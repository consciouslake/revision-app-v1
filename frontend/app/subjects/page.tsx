"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchAPI } from "@/lib/api";
import { Plus } from "lucide-react";

interface Subject {
    id: number;
    name: string;
    description: string;
    cover_emoji: string;
    chapter_count?: number; // Optional if we add this to API later
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAPI("/subjects/")
            .then(setSubjects)
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="container mx-auto p-8 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">My Subjects</h1>
                    <p className="text-slate-500">Select a subject to start revising.</p>
                </div>
                <Link href="/subjects/new" className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Subject
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((sub) => (
                        <Link key={sub.id} href={`/subjects/${sub.id}`}>
                            <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-slate-200">
                                <CardHeader>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-4xl">{sub.cover_emoji || "📚"}</span>
                                    </div>
                                    <CardTitle>{sub.name}</CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {sub.description || "No description provided."}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                    {subjects.length === 0 && (
                        <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                            <p>No subjects found. Create your first one!</p>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
