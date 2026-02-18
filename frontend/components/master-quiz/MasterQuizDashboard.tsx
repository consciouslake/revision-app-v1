import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Loader2, BrainCircuit, Play, BookOpen, GraduationCap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardProps {
    onStart: (questions: any[]) => void;
}

interface TopicStat {
    topic: string;
    count: number;
}

export function MasterQuizDashboard({ onStart }: DashboardProps) {
    // Generation State
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>("");

    const [topics, setTopics] = useState<TopicStat[]>([]);
    const [totalQuestions, setTotalQuestions] = useState(0);

    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");

    // Fetch Filters on Mount
    useEffect(() => {
        fetchFilters();
    }, []);

    const fetchFilters = async () => {
        try {
            const res = await fetch(`${API_URL}/api/master/filters`);
            const data = await res.json();
            setSubjects(data.subjects || []);
        } catch (e) {
            console.error("Failed to fetch filters", e);
        } finally {
            setLoadingFilters(false);
        }
    };

    const handleSubjectChange = (val: string) => {
        setSelectedSubject(val);
        setLoadingFilters(true);
        // Fetch topics for this subject
        fetch(`${API_URL}/api/master/filters?subject=${val}`)
            .then(res => res.json())
            .then(data => {
                setTopics(data.topics || []);
                setTotalQuestions(data.total_questions || 0);
            })
            .catch(e => console.error(e))
            .finally(() => setLoadingFilters(false));
    }

    const handleStartQuiz = async (mode: "full" | "topic", topicName?: string) => {
        setGenerating(true);
        setError("");

        const params = new URLSearchParams();
        if (selectedSubject) params.append("subject", selectedSubject);

        if (mode === "topic" && topicName) {
            params.append("topic", topicName);
        }

        // Count -1 means ALL questions
        params.append("count", "-1");

        try {
            const res = await fetch(`${API_URL}/api/master/generate?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to generate quiz");
            }
            const questions = await res.json();
            if (questions.length === 0) {
                setError("No questions found for this criteria.");
            } else {
                onStart(questions);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Master Quiz</h2>
                    <p className="text-slate-500 mt-1">Select a subject to view available practice modules.</p>
                </div>
                <div className="w-full md:w-64">
                    <Select onValueChange={handleSubjectChange} value={selectedSubject}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!selectedSubject ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No Subject Selected</h3>
                    <p className="text-slate-500">Please select a subject from the dropdown above to continue.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Full Mock Card */}
                    <Card className="border-primary/20 bg-primary/5 hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden"
                        onClick={() => handleStartQuiz("full")}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrainCircuit className="h-24 w-24 text-primary" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <GraduationCap className="h-5 w-5" />
                                Full Subject Mock
                            </CardTitle>
                            <CardDescription>
                                Test your knowledge across the entire subject.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{totalQuestions}</div>
                            <div className="text-sm text-slate-500">Total Questions</div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full group-hover:bg-primary/90" disabled={generating}>
                                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <>Start Mock Exam <Play className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Topic Cards */}
                    {topics.map((t) => (
                        <Card key={t.topic} className="hover:border-slate-300 transition-all hover:shadow-sm cursor-pointer group"
                            onClick={() => handleStartQuiz("topic", t.topic)}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-base font-medium text-slate-800 line-clamp-2 min-h-[3rem]">
                                        {t.topic}
                                    </CardTitle>
                                    <Badge variant="secondary" className="ml-2 shrink-0">
                                        {t.count} Qs
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-slate-400">Topic-wise practice</p>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="outline" size="sm" className="w-full opacity-0 group-hover:opacity-100 transition-opacity" disabled={generating}>
                                    Start Practice
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
