"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { LineChart, LayoutDashboard, TrendingUp, TrendingDown, History } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WeakArea {
    topic: string;
    accuracy: number;
    total_attempts: number;
}

interface AnalyticsData {
    weak_topics: WeakArea[];
    strong_topics: WeakArea[];
}

interface HistoryItem {
    id: number;
    score: number;
    total_questions: number;
    created_at: string;
    topic_summary: string;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, historyRes] = await Promise.all([
                fetch(`${API_URL}/api/master/analytics/weak-areas`),
                fetch(`${API_URL}/api/master/analytics/history`)
            ]);

            const analyticsData = await analyticsRes.json();
            const historyData = await historyRes.json();

            setAnalytics(analyticsData);
            setHistory(historyData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container mx-auto py-8 px-4 space-y-8">
                <div className="flex items-center gap-4">
                    <LayoutDashboard className="h-8 w-8 text-indigo-600" />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Performance Analytics</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weak Areas */}
                    <Card className="border-red-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Needs Attention</CardTitle>
                            <TrendingDown className="h-5 w-5 text-red-500" />
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {analytics?.weak_topics?.length === 0 ? (
                                <p className="text-sm text-slate-500">No weak areas detected yet! Keep practicing.</p>
                            ) : (
                                analytics?.weak_topics?.slice(0, 5).map((item) => (
                                    <div key={item.topic} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{item.topic}</span>
                                            <span className="text-red-600 font-bold">{item.accuracy}%</span>
                                        </div>
                                        <Progress value={item.accuracy} className="h-2 bg-red-100" />
                                        <p className="text-xs text-slate-400">{item.total_attempts} attempts</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Strong Areas */}
                    <Card className="border-green-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Strong Topics</CardTitle>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {analytics?.strong_topics?.length === 0 ? (
                                <p className="text-sm text-slate-500">No data available yet.</p>
                            ) : (
                                analytics?.strong_topics?.slice(0, 5).map((item) => (
                                    <div key={item.topic} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{item.topic}</span>
                                            <span className="text-green-600 font-bold">{item.accuracy}%</span>
                                        </div>
                                        <Progress value={item.accuracy} className="h-2 bg-green-100" />
                                        <p className="text-xs text-slate-400">{item.total_attempts} attempts</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quiz History */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-lg font-medium">Quiz History</CardTitle>
                        <History className="h-5 w-5 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Summary</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Percentage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((h) => {
                                    const percentage = Math.round((h.score / h.total_questions) * 100);
                                    return (
                                        <TableRow key={h.id}>
                                            <TableCell className="text-slate-600">
                                                {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString()}
                                            </TableCell>
                                            <TableCell>{h.topic_summary}</TableCell>
                                            <TableCell>{h.score} / {h.total_questions}</TableCell>
                                            <TableCell className={percentage >= 60 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                {percentage}%
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {history.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">
                                            No quizzes taken yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
