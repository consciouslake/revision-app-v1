
"use client";

import { useEffect, useState } from "react";
import { getAIStudyPlan } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

export function AIStudyPlan() {
    const [plan, setPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchPlan = async () => {
        setLoading(true);
        try {
            const data = await getAIStudyPlan();
            setPlan(data.plan);
        } catch (error) {
            console.error(error);
            setPlan("Could not generate plan at this time.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="h-full border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-white to-indigo-50 dark:from-slate-900 dark:to-indigo-950/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <Sparkles className="w-24 h-24 text-indigo-600" />
            </div>

            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center text-indigo-700 dark:text-indigo-400">
                    <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                    AI Study Coach
                </CardTitle>
                {plan && (
                    <Button variant="ghost" size="icon" onClick={fetchPlan} disabled={loading} className="h-8 w-8 text-slate-400">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-xs">Analyzing your progress & marking important chapters...</p>
                    </div>
                ) : !plan ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        <p className="text-sm text-slate-500 text-center max-w-xs">
                            Get a personalized daily study plan based on your weak areas and important chapters.
                        </p>
                        <Button onClick={fetchPlan} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Study Plan
                        </Button>
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        <ReactMarkdown>{plan || ""}</ReactMarkdown>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
