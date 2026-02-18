"use client";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface AnalysisProps {
    results: any; // Session object + questions_pool
    onBack: () => void;
    onReattempt: () => void;
}

export function QuizAnalysis({ results, onBack, onReattempt }: AnalysisProps) {
    const { score, total_questions, answers, questions_pool } = results;
    const percentage = Math.round((score / total_questions) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Score Summary */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold">Quiz Complete! 🏁</h1>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-primary text-4xl font-bold text-primary">
                    {percentage}%
                </div>
                <p className="text-slate-600">
                    You got <span className="font-bold text-primary">{score}</span> out of <span className="font-bold">{total_questions}</span> correct.
                </p>
                <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={onBack}>Back to Dashboard</Button>
                    <Button onClick={onReattempt}>Reattempt Quiz</Button>
                </div>
            </div>

            <div className="border-t pt-8">
                <h2 className="text-xl font-bold mb-6">Detailed Analysis</h2>

                <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                        {questions_pool.map((q: any, i: number) => {
                            const userAnswer = answers[q.id.toString()] || answers[q.id];
                            const isCorrect = userAnswer?.toUpperCase() === q.correct_option?.toUpperCase();

                            return (
                                <Card key={q.id} className={`border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-medium flex gap-2">
                                                    <span className="text-slate-400">#{i + 1}</span>
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {q.question_text}
                                                    </ReactMarkdown>
                                                </CardTitle>
                                            </div>
                                            {isCorrect ? (
                                                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4 bg-slate-50/50 pt-4 rounded-b-lg">
                                        {/* Options Comparison */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className={`p-3 rounded border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                                                <span className="font-semibold block mb-1">Your Answer:</span>
                                                <span className="font-bold text-lg mr-2">{userAnswer || "Skipped"}</span>
                                                {q.options[userAnswer]}
                                            </div>
                                            <div className="p-3 rounded border bg-green-50 border-green-200">
                                                <span className="font-semibold block mb-1">Correct Answer:</span>
                                                <span className="font-bold text-lg mr-2">{q.correct_option}</span>
                                                {q.options[q.correct_option]}
                                            </div>
                                        </div>

                                        {/* Explanation */}
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-800">
                                            <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                                💡 Explanation:
                                            </h4>
                                            <div className="prose-sm max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                    {q.explanation || "No explanation provided."}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
