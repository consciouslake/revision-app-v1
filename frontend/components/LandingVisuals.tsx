"use client";

import { motion } from "framer-motion";
import { Bot, FileText, CheckCircle2 } from "lucide-react";

export function LandingVisuals() {
    return (
        <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center perspective-[2000px]">
            {/* Main App Mockup */}
            <motion.div
                initial={{ rotateX: 20, rotateY: -20, rotateZ: 5, scale: 0.9, opacity: 0 }}
                animate={{ rotateX: 5, rotateY: -15, rotateZ: 2, scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-10 w-[300px] md:w-[600px] aspect-[4/3] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform-gpu"
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* Mock Header */}
                <div className="h-10 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                </div>
                {/* Mock Content */}
                <div className="flex h-full">
                    <div className="w-2/3 border-r border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded" />
                            <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded" />
                            <div className="h-2 w-5/6 bg-slate-50 dark:bg-slate-800 rounded" />
                        </div>
                        <div className="h-32 w-full bg-slate-50 dark:bg-slate-800 rounded-lg mt-4 flex items-center justify-center text-slate-200 dark:text-slate-700">
                            <FileText className="w-12 h-12" />
                        </div>
                    </div>
                    <div className="w-1/3 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600">
                                <Bot className="w-3 h-3" />
                            </div>
                            <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-[8px] text-slate-500">
                            Explain quantum entanglement in simple terms?
                        </div>
                        <div className="bg-indigo-600 p-2 rounded-lg shadow-sm text-[8px] text-white">
                            Imagine two magic coins...
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute top-1/4 -left-4 md:left-10 z-20 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3 w-48"
            >
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                    <div className="text-xs font-bold">Quiz Aced!</div>
                    <div className="text-[10px] text-slate-500">You scored 100%</div>
                </div>
            </motion.div>

            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="absolute bottom-1/3 -right-4 md:right-10 z-20 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 w-40"
            >
                <div className="text-xs font-medium text-slate-500 mb-2">Flashcard Progress</div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "80%" }}
                        transition={{ delay: 1, duration: 1 }}
                        className="h-full bg-indigo-500"
                    />
                </div>
            </motion.div>
        </div>
    );
}
