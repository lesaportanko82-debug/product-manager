import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { courseModules } from "./course-data";
import {
  BookOpen, Save, CheckCircle2, Loader2, ChevronDown, ChevronRight,
  Sparkles, ArrowLeft, FileText, Pencil, Trophy, Star, AlertTriangle,
  TrendingUp, Lightbulb, X, Send, Clock, ArrowRight, Notebook
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

// ===== Types =====
export interface NotebookEntry {
  text: string;
  savedAt: string;
  taskText: string;
}

export interface ModuleReview {
  moduleId: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  xpAdjustment: number;
  reviewedAt: string;
}

// ===== Storage =====
const NB_KEY = "practice-notebook";
const NB_REVIEWS_KEY = "practice-notebook-reviews";

export function getNotebookEntries(): Record<string, Record<number, NotebookEntry>> {
  try {
    return JSON.parse(localStorage.getItem(NB_KEY) || "{}");
  } catch { return {}; }
}

export function getNotebookEntry(lessonId: string, taskIndex: number): NotebookEntry | null {
  const all = getNotebookEntries();
  return all[lessonId]?.[taskIndex] || null;
}

export function saveNotebookEntry(lessonId: string, taskIndex: number, text: string, taskText: string): void {
  try {
    const all = getNotebookEntries();
    if (!all[lessonId]) all[lessonId] = {};
    all[lessonId][taskIndex] = { text, savedAt: new Date().toISOString(), taskText };
    localStorage.setItem(NB_KEY, JSON.stringify(all));
  } catch {}
}

export function getModuleReviews(): Record<string, ModuleReview> {
  try {
    return JSON.parse(localStorage.getItem(NB_REVIEWS_KEY) || "{}");
  } catch { return {}; }
}

function saveModuleReview(review: ModuleReview): void {
  try {
    const all = getModuleReviews();
    all[review.moduleId] = review;
    localStorage.setItem(NB_REVIEWS_KEY, JSON.stringify(all));
  } catch {}
}

function getSessionId(): string {
  try { return localStorage.getItem("exam-session-id") || "anon"; } catch { return "anon"; }
}

// Get all entries for a specific module
function getModuleEntries(moduleId: string): { lessonId: string; lessonTitle: string; taskIndex: number; entry: NotebookEntry }[] {
  const all = getNotebookEntries();
  const module = courseModules.find(m => m.id === moduleId);
  if (!module) return [];
  const result: { lessonId: string; lessonTitle: string; taskIndex: number; entry: NotebookEntry }[] = [];
  for (const lesson of module.lessons) {
    const entries = all[lesson.id];
    if (entries) {
      for (const [idx, entry] of Object.entries(entries)) {
        result.push({ lessonId: lesson.id, lessonTitle: lesson.title, taskIndex: parseInt(idx), entry });
      }
    }
  }
  return result.sort((a, b) => {
    const la = module.lessons.findIndex(l => l.id === a.lessonId);
    const lb = module.lessons.findIndex(l => l.id === b.lessonId);
    return la !== lb ? la - lb : a.taskIndex - b.taskIndex;
  });
}

// Count stats
export function getNotebookStats(): { totalEntries: number; totalModulesWithEntries: number; reviewedModules: number } {
  const all = getNotebookEntries();
  const reviews = getModuleReviews();
  let totalEntries = 0;
  const modulesWithEntries = new Set<string>();
  for (const [lessonId, entries] of Object.entries(all)) {
    const count = Object.keys(entries).length;
    if (count > 0) {
      totalEntries += count;
      const mod = courseModules.find(m => m.lessons.some(l => l.id === lessonId));
      if (mod) modulesWithEntries.add(mod.id);
    }
  }
  return { totalEntries, totalModulesWithEntries: modulesWithEntries.size, reviewedModules: Object.keys(reviews).length };
}


// ===== Inline Notebook Textarea (used inside PracticeSection) =====
export function NotebookTextarea({ lessonId, taskIndex, taskText }: { lessonId: string; taskIndex: number; taskText: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasSavedEntry, setHasSavedEntry] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const entry = getNotebookEntry(lessonId, taskIndex);
    if (entry) {
      setText(entry.text);
      setHasSavedEntry(true);
    } else {
      setText("");
      setHasSavedEntry(false);
    }
  }, [lessonId, taskIndex]);

  const handleSave = useCallback(() => {
    if (!text.trim()) return;
    saveNotebookEntry(lessonId, taskIndex, text.trim(), taskText);
    setSaved(true);
    setHasSavedEntry(true);
    setTimeout(() => setSaved(false), 2000);
  }, [text, lessonId, taskIndex, taskText]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  return (
    <div className="mt-2">
      {!isOpen ? (
        <button
          onClick={handleOpen}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.6875rem] font-medium transition-all ${
            hasSavedEntry
              ? "text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20 hover:bg-teal-50 dark:hover:bg-teal-900/30"
              : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700/50"
          }`}
        >
          <Pencil className="w-3 h-3" />
          {hasSavedEntry ? "Редактировать ответ" : "Написать ответ в тетрадь"}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-white dark:bg-slate-800 border border-teal-100/60 dark:border-teal-800/30 rounded-xl p-3 mt-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setSaved(false); }}
              placeholder="Напишите ваш ответ здесь..."
              rows={4}
              className="w-full bg-slate-50/50 dark:bg-slate-700/30 border border-border/30 rounded-lg px-3 py-2.5 text-[0.8125rem] placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800 resize-y min-h-[80px] transition-all"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-[0.6875rem] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                Свернуть
              </button>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[0.6875rem] text-teal-600 dark:text-teal-400 font-medium"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Сохранено
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[0.6875rem] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-3 h-3" /> Сохранить
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}


// ===== Full Notebook Page View =====
export function PracticeNotebook({ onClose, completedLessons }: { onClose: () => void; completedLessons: Set<string> }) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [reviewingModule, setReviewingModule] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviews, setReviews] = useState<Record<string, ModuleReview>>(getModuleReviews);
  const [xpToast, setXpToast] = useState<{ moduleId: string; amount: number; isPositive: boolean } | null>(null);

  const toggleModule = useCallback((id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Collect modules that have notebook entries
  const modulesWithEntries = courseModules.filter(m => {
    const entries = getModuleEntries(m.id);
    return entries.length > 0;
  }).map(m => {
    const entries = getModuleEntries(m.id);
    const allLessonsCompleted = m.lessons.every(l => completedLessons.has(l.id));
    const hasPractice = m.lessons.some(l => l.practice && l.practice.length > 0);
    const review = reviews[m.id] || null;
    return { module: m, entries, allLessonsCompleted, hasPractice, review };
  });

  const totalEntries = modulesWithEntries.reduce((a, m) => a + m.entries.length, 0);

  // AI Review for a module
  const handleRequestReview = useCallback(async (moduleId: string) => {
    const entries = getModuleEntries(moduleId);
    if (entries.length === 0) return;
    const module = courseModules.find(m => m.id === moduleId);
    if (!module) return;

    setReviewLoading(true);
    setReviewingModule(moduleId);

    try {
      const res = await fetch(`${API_BASE}/notebook-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          sessionId: getSessionId(),
          moduleId,
          moduleTitle: module.title,
          entries: entries.map(e => ({
            lessonTitle: e.lessonTitle,
            taskText: e.entry.taskText,
            answer: e.entry.text,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.log("Notebook review error:", data.error);
        return;
      }
      const review: ModuleReview = {
        moduleId,
        feedback: data.feedback || "",
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        xpAdjustment: data.xpAdjustment || 0,
        reviewedAt: new Date().toISOString(),
      };
      saveModuleReview(review);
      setReviews(prev => ({ ...prev, [moduleId]: review }));
      setXpToast({ moduleId, amount: review.xpAdjustment, isPositive: review.xpAdjustment >= 0 });
      setTimeout(() => setXpToast(null), 4000);

      // Save XP adjustment to server
      if (review.xpAdjustment !== 0) {
        try {
          const xpKey = `xp:${getSessionId()}`;
          // We'll just POST the adjustment to the practice endpoint approach
          await fetch(`${API_BASE}/notebook-xp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
            body: JSON.stringify({ sessionId: getSessionId(), moduleId, xpAdjustment: review.xpAdjustment }),
          });
        } catch (e) { console.log("Error saving notebook XP:", e); }
      }
    } catch (err) {
      console.log("Notebook review error:", err);
    } finally {
      setReviewLoading(false);
      setReviewingModule(null);
    }
  }, []);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[820px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Назад к курсу
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-[0.75rem] font-medium mb-4">
            <Notebook className="w-3.5 h-3.5" /> Интерактивная тетрадь
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Тетрадь практики</h1>
          <p className="text-[0.9375rem] text-muted-foreground max-w-md mx-auto leading-relaxed">
            Все ваши ответы на практические задания. По завершении модуля отправьте тетрадь на AI-проверку.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{totalEntries}</p>
            <p className="text-[0.6875rem] text-muted-foreground">записей</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{modulesWithEntries.length}</p>
            <p className="text-[0.6875rem] text-muted-foreground">модулей</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{Object.keys(reviews).length}</p>
            <p className="text-[0.6875rem] text-muted-foreground">проверено AI</p>
          </div>
        </div>

        {/* XP Toast */}
        <AnimatePresence>
          {xpToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-6 right-6 z-50"
            >
              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
                xpToast.isPositive
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40 border-emerald-200 dark:border-emerald-700"
                  : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/40 border-amber-200 dark:border-amber-700"
              }`}>
                <span className="text-lg">{xpToast.isPositive ? "🌰" : "⚠️"}</span>
                <div>
                  <p className={`text-[0.8125rem] font-bold ${xpToast.isPositive ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
                    {xpToast.isPositive ? "+" : ""}{xpToast.amount} 🌰
                  </p>
                  <p className={`text-[0.625rem] ${xpToast.isPositive ? "text-emerald-600/60 dark:text-emerald-400/60" : "text-amber-600/60 dark:text-amber-400/60"}`}>
                    {xpToast.isPositive ? "Бонус за качество!" : "Есть что доработать"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {modulesWithEntries.length === 0 && (
          <div className="text-center py-16">
            <Notebook className="w-14 h-14 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="text-[1rem] font-semibold mb-2 text-muted-foreground/60">Тетрадь пуста</h3>
            <p className="text-[0.8125rem] text-muted-foreground/40 max-w-sm mx-auto">
              Откройте любой урок с практическими заданиями и напишите ваши ответы в тетрадь
            </p>
          </div>
        )}

        {/* Modules list */}
        <div className="space-y-4">
          {modulesWithEntries.map(({ module, entries, allLessonsCompleted, review }) => {
            const isExpanded = expandedModules.has(module.id);
            const isReviewing = reviewingModule === module.id;
            const canReview = entries.length >= 2;
            const hasReview = !!review;

            return (
              <div key={module.id} className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl overflow-hidden">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center gap-3.5 p-5 text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    hasReview ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : allLessonsCompleted ? "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}>
                    {hasReview ? <CheckCircle2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.875rem] font-semibold truncate">{module.title}</p>
                    <p className="text-[0.6875rem] text-muted-foreground/50">
                      {entries.length} {entries.length === 1 ? "запись" : entries.length < 5 ? "записи" : "записей"}
                      {hasReview && <span className="ml-2 text-emerald-500">• Проверено AI</span>}
                    </p>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/30" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/30" />}
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="h-px bg-border/40 mb-4" />

                        {/* Entries */}
                        <div className="space-y-3 mb-5">
                          {entries.map((e, i) => (
                            <div key={`${e.lessonId}-${e.taskIndex}`} className="bg-slate-50/50 dark:bg-slate-700/20 rounded-xl p-4 border border-border/20">
                              <div className="flex items-start gap-2 mb-2">
                                <div className="w-5 h-5 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[0.5625rem] font-bold text-teal-600 dark:text-teal-400">{i + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[0.6875rem] text-muted-foreground/50 mb-0.5">{e.lessonTitle}</p>
                                  <p className="text-[0.75rem] font-medium text-foreground/70 leading-relaxed">{e.entry.taskText}</p>
                                </div>
                              </div>
                              <div className="ml-7 mt-2 bg-white dark:bg-slate-800 rounded-lg border border-border/30 p-3">
                                <p className="text-[0.8125rem] text-foreground leading-relaxed whitespace-pre-wrap">{e.entry.text}</p>
                                <p className="text-[0.5625rem] text-muted-foreground/30 mt-2 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(e.entry.savedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI Review section */}
                        {hasReview ? (
                          <ReviewCard review={review!} />
                        ) : (
                          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/15 dark:to-emerald-900/15 border border-teal-100/60 dark:border-teal-800/30 rounded-xl p-5">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              </div>
                              <div>
                                <p className="text-[0.875rem] font-semibold text-teal-900 dark:text-teal-300 mb-1">AI-проверка тетради</p>
                                <p className="text-[0.75rem] text-teal-600/60 dark:text-teal-400/60 leading-relaxed">
                                  AI-помощник проверит ваши ответы в контексте курса и начислит бонусные баллы за качество выполнения.
                                  {!canReview && " Напишите ответы минимум на 2 задания для отправки на проверку."}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRequestReview(module.id)}
                              disabled={!canReview || reviewLoading}
                              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl py-3 text-[0.8125rem] font-medium hover:from-teal-600 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {isReviewing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> AI проверяет...</>
                              ) : (
                                <><Send className="w-4 h-4" /> Отправить на проверку</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ===== Review Card =====
function ReviewCard({ review }: { review: ModuleReview }) {
  const isPositive = review.xpAdjustment >= 0;
  return (
    <div className={`rounded-xl p-5 border ${
      isPositive
        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/60 dark:border-emerald-800/30"
        : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100/60 dark:border-amber-800/30"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isPositive ? "text-emerald-500" : "text-amber-500"}`} />
          <span className="text-[0.875rem] font-semibold">Результат AI-проверки</span>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.75rem] font-bold ${
          isPositive
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
        }`}>
          {isPositive ? "+" : ""}{review.xpAdjustment} 🌰
        </div>
      </div>

      <p className="text-[0.8125rem] text-foreground/80 leading-relaxed mb-3">{review.feedback}</p>

      {review.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-[0.6875rem] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Сильные стороны
          </p>
          <div className="space-y-1">
            {review.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[0.75rem] text-foreground/70">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {review.improvements.length > 0 && (
        <div>
          <p className="text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Что улучшить
          </p>
          <div className="space-y-1">
            {review.improvements.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[0.75rem] text-foreground/70">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[0.5625rem] text-muted-foreground/30 mt-3 flex items-center gap-1">
        <Clock className="w-2.5 h-2.5" />
        Проверено {new Date(review.reviewedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}


// ===== Widget for WelcomeView =====
export function NotebookWidget({ onOpen }: { onOpen: () => void }) {
  const stats = getNotebookStats();
  if (stats.totalEntries === 0) return null;

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-100/60 dark:border-teal-800/30 rounded-2xl p-5 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all group text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
        <Notebook className="w-5 h-5 text-teal-600 dark:text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.875rem] font-semibold text-teal-900 dark:text-teal-300">Тетрадь практики</p>
        <p className="text-[0.75rem] text-teal-600/60 dark:text-teal-400/60">
          {stats.totalEntries} {stats.totalEntries === 1 ? "запись" : stats.totalEntries < 5 ? "записи" : "записей"} в {stats.totalModulesWithEntries} {stats.totalModulesWithEntries === 1 ? "модуле" : "модулях"}
          {stats.reviewedModules > 0 && ` • ${stats.reviewedModules} проверено`}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-teal-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}