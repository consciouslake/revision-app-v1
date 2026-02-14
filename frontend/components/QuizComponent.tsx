"use client";

import { useState, useEffect } from "react";
import { generateQuiz, getQuizzes, submitQuizResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
}

interface Quiz {
    id: number;
    title: string;
    questions: Question[];
}

interface QuizComponentProps {
    chapterId: number;
}

export function QuizComponent({ chapterId }: QuizComponentProps) {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [numQuestions, setNumQuestions] = useState(5);

    useEffect(() => {
        loadQuiz();
    }, [chapterId]);

    const loadQuiz = async () => {
        try {
            const quizzes = await getQuizzes(chapterId);
            if (quizzes && quizzes.length > 0) {
                // For now, simple logic: just load the most recent quiz
                // In future, list all quizzes
                setQuiz(quizzes[quizzes.length - 1]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const newQuiz = await generateQuiz(chapterId, numQuestions);
            setQuiz(newQuiz);
            resetQuiz();
        } catch (error) {
            console.error(error);
            alert("Failed to generate quiz");
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResults(false);
        setSelectedOption(null);
        setIsAnswered(false);
    };

    const handleOptionSelect = (option: string) => {
        if (isAnswered) return;
        setSelectedOption(option);
    };

    const checkAnswer = () => {
        if (!quiz || !selectedOption) return;

        const currentQuestion = quiz.questions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.correct_option;

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        setIsAnswered(true);
    };

    const nextQuestion = async () => {
        if (!quiz) return;

        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            // Quiz finished, show results and submit score
            const totalQuestions = quiz.questions.length;
            const percentage = Math.round((score / totalQuestions) * 100);
            try {
                await submitQuizResult(quiz.id, score, totalQuestions, percentage);
            } catch (error) {
                console.error("Failed to save quiz result:", error);
            }
            setShowResults(true);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">Generating AI Quiz...</p>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-6">
                <Trophy className="w-12 h-12 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Quizzes Yet</h3>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                    Test your knowledge. Generate an interactive quiz based on this chapter.
                </p>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Questions:</span>
                    <select
                        className="p-1 border rounded text-sm bg-white dark:bg-slate-800"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                    </select>
                </div>

                <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Quiz
                </Button>
            </div>
        );
    }

    if (showResults) {
        const percentage = Math.round((score / quiz.questions.length) * 100);
        return (
            <div className="flex flex-col items-center justify-center space-y-6 py-8 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                    <Trophy className="w-20 h-20 text-yellow-500" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">Quiz Completed!</h3>
                    <p className="text-slate-500">You scored {score} out of {quiz.questions.length}</p>
                </div>

                <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-3xl font-bold text-indigo-600">{percentage}%</p>

                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Questions:</span>
                        <select
                            className="p-1 border rounded text-sm bg-white dark:bg-slate-800"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={20}>20</option>
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={resetQuiz}>Retry Quiz</Button>
                        <Button onClick={handleGenerate}>Generate New Quiz</Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const options = [
        { key: "A", text: currentQuestion.option_a },
        { key: "B", text: currentQuestion.option_b },
        { key: "C", text: currentQuestion.option_c },
        { key: "D", text: currentQuestion.option_d },
    ];

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-slate-500">
                    Question {currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
                <span className="text-sm font-medium text-indigo-600">
                    Score: {score}
                </span>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg leading-relaxed">
                        {currentQuestion.question_text}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {options.map((option) => {
                        let optionStyle = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800";

                        if (isAnswered) {
                            if (option.key === currentQuestion.correct_option) {
                                optionStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400";
                            } else if (selectedOption === option.key) {
                                optionStyle = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
                            } else {
                                optionStyle = "opacity-50";
                            }
                        } else if (selectedOption === option.key) {
                            optionStyle = "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600";
                        }

                        return (
                            <div
                                key={option.key}
                                onClick={() => handleOptionSelect(option.key)}
                                className={cn(
                                    "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-between",
                                    optionStyle
                                )}
                            >
                                <span className="font-medium">{option.text}</span>
                                {isAnswered && option.key === currentQuestion.correct_option && (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                )}
                                {isAnswered && selectedOption === option.key && selectedOption !== currentQuestion.correct_option && (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                )}
                            </div>
                        );
                    })}
                </CardContent>
                <CardFooter className="flex justify-end pt-2">
                    {!isAnswered ? (
                        <Button
                            onClick={checkAnswer}
                            disabled={!selectedOption}
                            className="w-full sm:w-auto"
                        >
                            Check Answer
                        </Button>
                    ) : (
                        <Button
                            onClick={nextQuestion}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
                        >
                            {currentQuestionIndex < quiz.questions.length - 1 ? (
                                <>Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
                            ) : (
                                "See Results"
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
