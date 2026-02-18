"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ActiveQuizProps {
    questions: any[];
    onFinish: (result: any) => void;
    onCancel: () => void;
}

export function ActiveQuizInterface({ questions, onFinish, onCancel }: ActiveQuizProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({}); // {q_id: "A"}
    const [submitting, setSubmitting] = useState(false);

    // Timer state could be added here

    const currentQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    const handleSelect = (option: string) => {
        setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Calculate score locally
            let calculatedScore = 0;
            questions.forEach(q => {
                if (answers[q.id] === q.correct_option) {
                    calculatedScore++;
                }
            });

            const payload = {
                score: calculatedScore,
                total_questions: questions.length,
                answers: answers
            };

            const res = await fetch(`${API_URL}/api/master/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                console.error("Submission Failed:", errData);
                alert("Failed to submit quiz. Please try again.");
                setSubmitting(false);
                return;
            }

            const result = await res.json();

            // Inject the full question data into result for analysis (since backend only returns score/session)
            // Or we can pass the questions list along with the result to the analysis component
            onFinish({ ...result, questions_pool: questions });

        } catch (e) {
            console.error("Submit failed", e);
        } finally {
            setSubmitting(false);
        }
    };


    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input (though we don't have inputs here, good practice)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case "a": handleSelect("A"); break;
                case "b": handleSelect("B"); break;
                case "c": handleSelect("C"); break;
                case "d": handleSelect("D"); break;
                case "enter":
                    if (currentIndex === questions.length - 1) handleSubmit();
                    else handleNext();
                    break;
                case "arrowright": handleNext(); break;
                case "arrowleft": handlePrev(); break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, questions.length, answers]); // Re-bind when index changes

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200 mb-6 -mx-4 px-4 shadow-sm">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="ghost" onClick={onCancel} size="sm" className="text-slate-500 hover:text-slate-900">
                            Cancel
                        </Button>
                        <div className="text-sm font-semibold text-slate-700">
                            Question <span className="text-primary text-base">{currentIndex + 1}</span> / {questions.length}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-medium">
                            <Clock className="h-4 w-4" />
                            <span>Practice Mode</span>
                        </div>
                    </div>
                    <Progress value={progress} className="h-2 w-full transition-all duration-500 ease-out" />
                </div>
            </div>

            {/* Question Card */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <Card className="min-h-[500px] flex flex-col shadow-md border-slate-200 lg:col-span-2">
                    <CardHeader className="bg-white pb-8">
                        {/* Render Question with Latex support */}
                        <div className="prose dark:prose-invert max-w-none text-xl font-medium leading-relaxed text-slate-800">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {currentQ.question_text}
                            </ReactMarkdown>
                        </div>
                        {currentQ.image_url && (
                            <div className="mt-6 flex justify-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <img
                                    src={`${API_URL}/${currentQ.image_url}`}
                                    alt="Question Diagram"
                                    className="max-h-[400px] rounded shadow-sm"
                                />
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="flex-1 space-y-3 bg-slate-50/30 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {["A", "B", "C", "D"].map((opt) => (
                                <div
                                    key={opt}
                                    onClick={() => handleSelect(opt)}
                                    className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 flex items-start gap-4 group ${answers[currentQ.id] === opt
                                            ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                        }`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${answers[currentQ.id] === opt
                                            ? "bg-primary text-white shadow-sm"
                                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                        }`}>
                                        {opt}
                                    </div>
                                    <div className="pt-1 text-slate-700 font-medium">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {currentQ.options[opt] || ""}
                                        </ReactMarkdown>
                                        {currentQ.option_images && currentQ.option_images[opt] && (
                                            <div className="mt-3">
                                                <img
                                                    src={`${API_URL}/${currentQ.option_images[opt]}`}
                                                    alt={`Option ${opt}`}
                                                    className="max-h-[150px] rounded border bg-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {answers[currentQ.id] === opt && (
                                        <div className="absolute top-4 right-4">
                                            <CheckCircle className="h-5 w-5 text-primary" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between border-t p-6 bg-white">
                        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="w-32">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>

                        <div className="text-xs text-slate-400 hidden md:block">
                            Press <kbd className="px-1 py-0.5 rounded border bg-slate-100 font-mono">Enter</kbd> for Next
                        </div>

                        {currentIndex === questions.length - 1 ? (
                            <Button onClick={handleSubmit} disabled={submitting} className="w-32 bg-green-600 hover:bg-green-700">
                                {submitting ? "Submitting..." : "Submit Quiz"}
                            </Button>
                        ) : (
                            <Button onClick={handleNext} className="w-32">
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

