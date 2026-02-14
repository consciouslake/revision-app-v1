"use client";

import { useState, useEffect } from "react";
import { generateFlashcards, getFlashcards } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Flashcard {
    id: number;
    front: string;
    back: string;
}

interface FlashcardDeckProps {
    chapterId: number;
}

export function FlashcardDeck({ chapterId }: FlashcardDeckProps) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        loadFlashcards();
    }, [chapterId]);

    const loadFlashcards = async () => {
        try {
            const data = await getFlashcards(chapterId);
            setFlashcards(data);
        } catch (error) {
            console.error("Failed to load flashcards", error);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const data = await generateFlashcards(chapterId);
            setFlashcards(data);
            setCurrentIndex(0);
            setIsFlipped(false);
        } catch (error) {
            console.error("Failed to generate flashcards", error);
            alert("Failed to generate flashcards. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">Generating AI Flashcards...</p>
            </div>
        );
    }

    if (flashcards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-6">
                <Brain className="w-12 h-12 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Flashcards Yet</h3>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                    Generate AI-powered flashcards from this chapter to boost your recall.
                </p>
                <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Flashcards
                </Button>
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];

    return (
        <div className="flex flex-col items-center space-y-6 w-full max-w-2xl mx-auto py-8">
            <div className="flex items-center justify-between w-full px-2">
                <span className="text-sm font-medium text-slate-500">
                    Card {currentIndex + 1} of {flashcards.length}
                </span>
                <Button variant="ghost" size="sm" onClick={handleGenerate} className="text-indigo-600 hover:text-indigo-700">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                </Button>
            </div>

            <div
                className="relative w-full aspect-[3/2] perspective-1000 cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div
                    className="w-full h-full relative"
                    style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        transition: "transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)"
                    }}
                >
                    {/* Front */}
                    <Card
                        className="absolute inset-0 w-full h-full flex items-center justify-center p-8 text-center"
                        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                    >
                        <CardContent className="p-0">
                            <span className="absolute top-4 left-4 text-xs font-bold text-indigo-500 uppercase tracking-wider">Question</span>
                            <h3 className="text-xl md:text-2xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                                {currentCard.front}
                            </h3>
                            <p className="absolute bottom-4 text-xs text-slate-400">Click to flip</p>
                        </CardContent>
                    </Card>

                    {/* Back */}
                    <Card
                        className="absolute inset-0 w-full h-full bg-indigo-600 dark:bg-indigo-800 border-transparent text-white flex items-center justify-center p-8 text-center"
                        style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)"
                        }}
                    >
                        <CardContent className="p-0">
                            <span className="absolute top-4 left-4 text-xs font-bold text-indigo-200 uppercase tracking-wider">Answer</span>
                            <p className="text-lg md:text-xl font-medium leading-relaxed">
                                {currentCard.back}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="h-10 w-10"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex gap-1.5">
                    {flashcards.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-2 h-2 rounded-full transition-colors",
                                i === currentIndex ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                            )}
                        />
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentIndex === 0 && flashcards.length === 1 || currentIndex === flashcards.length - 1}
                    className="h-10 w-10"
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}
