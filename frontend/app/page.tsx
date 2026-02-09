"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAPI, deleteSubject } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Layers, Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { EditSubjectDialog } from "@/components/EditSubjectDialog";

interface Subject {
  id: number;
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chapters?: any[];
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const loadSubjects = () => {
    setLoading(true);
    fetchAPI("/subjects/")
      .then((data) => {
        setSubjects(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleDeleteSubject = async (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault(); // Prevent navigation
    if (confirm(`Are you sure you want to delete "${name}"? This will also delete all chapters and messages.`)) {
      try {
        await deleteSubject(id);
        setSubjects(subjects.filter(s => s.id !== id));
      } catch (error) {
        console.error(error);
        alert("Failed to delete subject");
      }
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-indigo-100 dark:selection:bg-indigo-900/30">

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="container mx-auto max-w-6xl px-6 pt-24 pb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>AI-Powered Revision Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white pb-2">
              Recall.
              <span className="block text-4xl md:text-5xl mt-2 font-bold text-slate-500 dark:text-slate-400">
                Study Smarter, Not Harder.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Organize your study materials, upload PDFs, and let our AI tutor help you master every chapter effortlessly.
            </p>

            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/subjects/new">
                <Button size="lg" className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-all duration-300">
                  <Plus className="w-5 h-5 mr-2" />
                  New Subject
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subjects Grid Section */}
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Your Subjects
          </h2>
          {subjects.length > 0 && (
            <Link href="/subjects" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : subjects.length > 0 ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {subjects.slice(0, 6).map((subject) => (
              <motion.div key={subject.id} variants={item} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                <Link href={`/subjects/${subject.id}`} className="block h-full group/card">
                  <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900 group relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingSubject(subject);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                            onClick={(e) => handleDeleteSubject(e, subject.id, subject.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors">
                        {subject.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2 mb-4">
                        {subject.description || "No description provided."}
                      </CardDescription>
                      <div className="flex items-center text-xs font-medium text-slate-500">
                        {subject.chapters?.length || 0} Chapters
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}

            {/* "Add New" Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <Link href="/subjects/new" className="block h-full">
                <Card className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all duration-300 bg-transparent flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px]">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 group-hover:bg-white transition-colors">
                    <Plus className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">Create New Subject</h3>
                </Card>
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="max-w-md mx-auto px-6">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">No subjects yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Get started by creating your first subject to organize your revision materials.
              </p>
              <Link href="/subjects/new">
                <Button size="lg" className="bg-indigo-600 text-white rounded-full">
                  Create First Subject
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-600">
        <p>&copy; {new Date().getFullYear()} Recall Platform. Built for efficient learning.</p>
      </div>

      <EditSubjectDialog
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        subject={editingSubject}
        onSuccess={() => {
          setEditingSubject(null);
          loadSubjects();
        }}
      />
    </main>
  );
}
