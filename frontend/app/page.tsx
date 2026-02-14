
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAPI, deleteSubject, getUserStats, getSubjectsProgress } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Plus, Sparkles, Pencil, Trash2, BarChart3, Search, Clock, Calendar, Trophy, Flame, Target, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { EditSubjectDialog } from "@/components/EditSubjectDialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { AIStudyPlan } from "@/components/AIStudyPlan";

interface Subject {
  id: number;
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chapters?: any[];
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userStats, setUserStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [revisionStats, setRevisionStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const loadSubjects = () => {
    setLoading(true);
    // Parallel fetch for subjects and stats
    Promise.all([
      fetchAPI("/subjects/"),
      getUserStats().catch(err => {
        console.error("Failed to fetch stats:", err);
        return null;
      }),
      getSubjectsProgress().catch(err => {
        console.error("Failed to fetch revision stats:", err);
        return [];
      })
    ])
      .then(([subjectsData, statsData, revisionData]) => {
        setSubjects(subjectsData);
        if (statsData) setUserStats(statsData);
        if (revisionData) setRevisionStats(revisionData);
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

  // Helper to get progress for a specific subject
  const getSubjectProgress = (subjectId: number) => {
    const stat = revisionStats.find(s => s.subject_id === subjectId);
    return stat ? stat.completeness_percentage : 0;
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-indigo-100 dark:selection:bg-indigo-900/30 font-sans">

      {/* Hero / Dashboard Section */}
      <section className="pt-8 pb-12 md:pt-12 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="container px-6 mx-auto max-w-7xl">

          {/* Greeting & Date */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">{format(new Date(), 'EEEE, MMMM do')}</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back, <span className="text-indigo-600 dark:text-indigo-400">Student</span>!
              </h1>
            </div>

            {/* Quick Actions / Streak */}
            <div className="flex items-center gap-4">
              {userStats && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full border border-orange-100 dark:border-orange-800">
                  <Flame className="w-5 h-5 fill-orange-500" />
                  <span className="font-bold">{userStats.streak_days || 0} Day Streak</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Subjects */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Subjects</p>
                  <h3 className="text-2xl font-bold mt-1">{subjects.length}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                  <BookOpen className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Mastery Level */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mastery Level</p>
                  <h3 className="text-2xl font-bold mt-1">{userStats?.mastery_level || "Novice"}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Trophy className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Chapters Completed */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Chapters Done</p>
                  <h3 className="text-2xl font-bold mt-1">{userStats?.completed_chapters || 0} <span className="text-sm text-slate-400 font-normal">/ {userStats?.total_chapters || 0}</span></h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                  <Target className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Resume Learning */}
            <Card className="border-indigo-200 dark:border-indigo-800 shadow-sm bg-indigo-50 dark:bg-indigo-950/30 cursor-pointer hover:border-indigo-300 transition-colors group relative overflow-hidden">
              <Link href={userStats?.last_active_chapter ? `/study/${userStats.last_active_chapter.id}` : "/subjects"}>
                <div className="absolute inset-0 bg-indigo-100/50 dark:bg-indigo-900/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <CardContent className="p-6 flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Resume Learning</p>
                    <h3 className="text-lg font-bold mt-1 truncate max-w-[140px]">
                      {userStats?.last_active_chapter?.title || "Start Studying"}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                    <PlayCircle className="w-5 h-5 fill-indigo-700/20" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Main Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Col: AI Study Plan */}
            <div className="lg:col-span-2 h-full min-h-[300px]">
              <AIStudyPlan />
            </div>

            {/* Right Col: Recommended Revision */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  Quick Reviews
                </h3>
              </div>

              {revisionStats.length > 0 ? (
                <div className="space-y-4">
                  {revisionStats.slice(0, 3).map((stat) => (
                    <Link key={stat.subject_id} href={`/subjects/${stat.subject_id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-indigo-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm line-clamp-1">{stat.subject_name}</h4>
                            <span className="text-xs text-slate-400">
                              {stat.last_studied_at ? formatDistanceToNow(new Date(stat.last_studied_at), { addSuffix: true }) : "Never"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Progress</span>
                              <span>{stat.completeness_percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${stat.completeness_percentage}%` }}></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                  <CardContent className="p-6 text-center text-slate-500">
                    <p className="text-sm">No revision history yet. Start studying to see recommendations!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Your Subjects Section */}
      <section className="py-16 md:py-24" id="subjects">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Your Library</h2>
              <p className="text-slate-500 dark:text-slate-400">Manage your subjects and materials.</p>
            </div>
            <Link href="/subjects/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Subject
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : subjects.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {subjects.map((subject) => {
                const progress = getSubjectProgress(subject.id);
                return (
                  <motion.div key={subject.id} variants={item} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Link href={`/subjects/${subject.id}`} className="block h-full group">
                      <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 relative overflow-hidden hover:shadow-xl hover:shadow-indigo-100/50 dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300">
                        <div className="h-full rounded-xl bg-slate-50 dark:bg-slate-950 p-6 flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-xl border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform">
                              {/* Mock Subject Icon based on name content or random */}
                              <span>📚</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-indigo-600 transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingSubject(subject);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-600 transition-colors"
                                onClick={(e) => handleDeleteSubject(e, subject.id, subject.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-lg font-bold mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">{subject.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1">
                            {subject.description || "No description provided."}
                          </p>

                          <div className="space-y-2 pt-4 border-t border-slate-200/50 dark:border-slate-800">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                              <span>{subject.chapters?.length || 0} Chapters</span>
                              <span>{progress}% Finished</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="bg-indigo-500 h-1.5 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">No subjects found</h3>
              <p className="text-slate-500 mb-6">Get started by creating your first subject.</p>
              <Link href="/subjects/new">
                <Button>Create Subject</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

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
