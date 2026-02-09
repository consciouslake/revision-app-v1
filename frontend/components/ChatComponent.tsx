"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchAPI } from "@/lib/api";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MarkdownComponents: any = {
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-4 mb-2" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-4 mb-2" {...props} />,
    li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
    h1: ({ node, ...props }: any) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-semibold text-indigo-700 dark:text-indigo-400" {...props} />,
    code: ({ node, ...props }: any) => <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
};

interface Message {
    id?: number;
    role: "user" | "ai";
    content: string;
}

export default function ChatComponent({ chapterId }: { chapterId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch chat history on mount
    useEffect(() => {
        if (chapterId) {
            fetchAPI(`/chapters/${chapterId}/messages`)
                .then((data: Message[]) => {
                    setMessages(data);
                })
                .catch(err => console.error("Failed to load chat history", err));
        }
    }, [chapterId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapter_id: chapterId, user_query: userMessage.content }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const data = await response.json();
            const aiMessage: Message = { role: "ai", content: data.response };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "ai", content: "Error: Could not reach the AI tutor." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center gap-2 shadow-sm z-10">
                <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="font-semibold text-sm">AI Tutor</h2>
                    <p className="text-xs text-slate-500">Ask questions about this chapter</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/50 scroll-smooth">
                <div className="space-y-6 pb-4">
                    <AnimatePresence initial={false}>
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center text-center p-8 text-slate-400 mt-10"
                            >
                                <Bot className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No messages yet. Start the conversation!</p>
                            </motion.div>
                        )}
                        {messages.map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-emerald-600 text-white"
                                    }`}>
                                    {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${m.role === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none"
                                    }`}>
                                    {m.role === "ai" ? (
                                        <div className="markdown-body text-sm leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={MarkdownComponents}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                </span>
                                <span className="text-xs text-slate-500">Thinking...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                    }}
                    className="flex gap-2 items-end"
                >
                    <Input
                        className="min-h-[44px] max-h-32 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="h-11 w-11 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
