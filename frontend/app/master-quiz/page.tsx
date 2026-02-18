"use client";

import { useState } from "react";
import { MasterQuizDashboard } from "../../components/master-quiz/MasterQuizDashboard";
import { ActiveQuizInterface } from "../../components/master-quiz/ActiveQuizInterface";
import { QuizAnalysis } from "../../components/master-quiz/QuizAnalysis";

export default function MasterQuizPage() {
    const [view, setView] = useState<"dashboard" | "quiz" | "analysis">("dashboard");
    const [quizData, setQuizData] = useState<any[]>([]); // Questions
    const [sessionResults, setSessionResults] = useState<any>(null); // Score/History

    const startQuiz = (questions: any[]) => {
        setQuizData(questions);
        setView("quiz");
    };

    const finishQuiz = (results: any) => {
        setSessionResults(results);
        setView("analysis");
    };

    return (
        <div className="container mx-auto py-8">
            {view === "dashboard" && <MasterQuizDashboard onStart={startQuiz} />}
            {view === "quiz" && (
                <ActiveQuizInterface
                    questions={quizData}
                    onFinish={finishQuiz}
                    onCancel={() => setView("dashboard")}
                />
            )}
            {view === "analysis" && (
                <QuizAnalysis
                    results={sessionResults}
                    onBack={() => setView("dashboard")}
                    onReattempt={() => setView("quiz")}
                />
            )}
        </div>
    );
}
