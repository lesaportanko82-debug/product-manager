import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { courseModules, getAllLessons, isModuleUnlocked, courseBlocks, type QuizQuestion } from "./course-data";
import { RichContent, extractHeadings } from "./rich-content";
import { renderInteractiveBlocks } from "./interactive-content";
import { sendWebhook } from "./webhook";
import { logActivity } from "./gamification";
import { logProgress } from "./progress-chart";
import { BadgesPanel } from "./gamification";
import { ProgressChart } from "./progress-chart";
import { ShareProgressButton } from "./share-progress";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import { LearningRoadmap } from "./learning-roadmap";
import { ModuleProgressRing } from "./celebrations";
import { DailyChallenge } from "./daily-challenge";
import { getUserName } from "./user-name";
import { getStreak } from "./gamification";
import { getLocalXP, getXPLevel, getSessionId } from "./interactive-progress";
import { DiagnosticPrompt, RecommendedPath } from "./adaptive-learning";
import { LessonDiscussion } from "./peer-learning";
import { CapstonePortfolioWidget } from "./capstone-projects";
import { PMCoachWidget } from "./pm-coach";
import { NotebookTextarea, NotebookWidget } from "./practice-notebook";
import { LESSON_DIAGRAMS } from "./framework-diagrams";
import { getSimulatorStats } from "./project-simulator";
import {
  BookOpen, CheckCircle, ChevronLeft, ChevronRight, ChevronDown, Clock,
  Lightbulb, ListChecks, Target, Award, Sparkles, HelpCircle,
  XCircle, CheckCircle2, RotateCcw, GraduationCap, Trophy,
  Bookmark, BookmarkCheck, Star, StickyNote, ArrowRight,
  Zap, Play, Map, List, Save, Square, CheckSquare, Home, Lock,
  AlertTriangle, Layers
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

// Reusable scroll-in animation wrapper
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface LessonViewProps {
  lessonId: string;
  onSelectLesson: (lessonId: string) => void;
  completedLessons: Set<string>;
  onToggleComplete: (lessonId: string) => void;
  onOpenFinalExam?: () => void;
  bookmarks: Set<string>;
  onToggleBookmark: (lessonId: string) => void;
  onOpenDiagnostic?: () => void;
  onOpenCapstone?: () => void;
  onOpenCoach?: () => void;
  onOpenNotebook?: () => void;
  onOpenInterview?: () => void;
  onOpenTemplates?: () => void;
  onOpenAnalytics?: () => void;
  onOpenDataExercises?: () => void;
  onOpenPortfolio?: () => void;
  onOpenResumeReview?: () => void;
  onOpenCompetencyRadar?: () => void;
  onOpenOnboarding?: () => void;
}

function QuizSection({ quiz, title, lessonId, lessonTitle }: { quiz: QuizQuestion[]; title?: string; lessonId: string; lessonTitle: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSelect = useCallback((questionIndex: number, optionIndex: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  }, [showResults]);

  const handleCheck = useCallback(() => {
    setShowResults(true);
    const correct = quiz.filter((q, i) => answers[i] === q.correctIndex).length;
    sendWebhook({ type: "quiz_completed", lessonId, lessonTitle, score: correct, total: quiz.length });
  }, [quiz, answers, lessonId, lessonTitle]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setShowResults(false);
  }, []);

  const totalAnswered = Object.keys(answers).length;
  const correctCount = showResults
    ? quiz.filter((q, i) => answers[i] === q.correctIndex).length
    : 0;

  return (
    <div className="rounded-2xl border border-teal-100/60 dark:border-teal-800/40 bg-gradient-to-b from-teal-50/30 to-white dark:from-teal-900/20 dark:to-slate-800/80 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-teal-100/40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="text-[0.9375rem] font-semibold text-teal-800 dark:text-teal-200">{title || "Проверьте знания"}</h3>
          <p className="text-[0.75rem] text-teal-500/60 dark:text-teal-400/60">{quiz.length} вопросов</p>
        </div>
        {showResults && (
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-[0.75rem] font-semibold ${
              correctCount === quiz.length
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : correctCount >= quiz.length * 0.6
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            }`}>
              {correctCount}/{quiz.length}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        {quiz.map((q, qi) => {
          const selected = answers[qi];
          const isCorrect = showResults && selected === q.correctIndex;
          const isWrong = showResults && selected !== undefined && selected !== q.correctIndex;

          return (
            <div key={qi} className={`rounded-xl p-4 transition-all ${
              showResults
                ? isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800' : isWrong ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800' : 'bg-white dark:bg-slate-800 ring-1 ring-border/50'
                : 'bg-white dark:bg-slate-800 ring-1 ring-border/30'
            }`}>
              <p className="text-[0.875rem] font-medium mb-3 leading-relaxed">{qi + 1}. {q.question}</p>
              {!showResults && selected === undefined && (
                <p className="text-[0.6875rem] text-teal-500/70 mb-2 flex items-center gap-1.5 font-medium">
                  <ChevronRight className="w-3 h-3 animate-pulse" />
                  Выберите один вариант ответа
                </p>
              )}
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrectOption = showResults && oi === q.correctIndex;
                  return (
                    <button
                      key={oi}
                      onClick={() => handleSelect(qi, oi)}
                      disabled={showResults}
                      aria-pressed={answers[qi] === oi}
                      aria-label={`Вариант ${String.fromCharCode(65 + oi)}: ${opt}`}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[0.8125rem] transition-all flex items-center gap-3 cursor-pointer ${
                        showResults
                          ? isCorrectOption
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 font-medium'
                            : isSelected
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            : 'bg-transparent text-muted-foreground'
                          : isSelected
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100 ring-1 ring-teal-300 dark:ring-teal-700 font-medium shadow-sm'
                          : 'bg-white dark:bg-slate-700/50 border border-border/60 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/40 dark:hover:bg-teal-900/20 hover:shadow-sm text-foreground'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.625rem] font-semibold ${
                        showResults
                          ? isCorrectOption
                            ? 'bg-emerald-500 text-white'
                            : isSelected
                            ? 'bg-red-400 text-white'
                            : 'bg-muted text-muted-foreground'
                          : isSelected
                          ? 'bg-teal-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {showResults ? (isCorrectOption ? <CheckCircle2 className="w-3 h-3" /> : isSelected ? <XCircle className="w-3 h-3" /> : String.fromCharCode(65 + oi)) : String.fromCharCode(65 + oi)}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {showResults && q.explanation && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-[0.8125rem] text-muted-foreground leading-relaxed flex gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-6 pb-5 flex items-center gap-3">
        {!showResults ? (
          <>
            <button
              onClick={handleCheck}
              disabled={totalAnswered < quiz.length}
              className="px-5 py-2.5 bg-teal-500 text-white rounded-xl text-[0.8125rem] font-medium hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-teal-100 dark:shadow-teal-900/30"
            >
              Проверить ответы
            </button>
            {totalAnswered < quiz.length && (
              <span className="text-[0.6875rem] text-muted-foreground/50 tabular-nums">
                {totalAnswered}/{quiz.length} ответов
              </span>
            )}
          </>
        ) : (

          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-muted text-foreground rounded-xl text-[0.8125rem] font-medium hover:bg-accent transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Пройти заново
          </button>
        )}
      </div>
    </div>
  );
}


// ===== Mini Table of Contents =====
function LessonTOC({ content, containerRef }: { content: string[]; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const headings = extractHeadings(content);
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState("");

  // Track scroll position to highlight active heading
  useEffect(() => {
    const container = containerRef.current;
    if (!container || headings.length === 0) return;
    const onScroll = () => {
      const els = headings.map(h => container.querySelector(`#${CSS.escape(h.id)}`)).filter(Boolean) as HTMLElement[];
      let current = "";
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = el.id;
      }
      setActiveId(current);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [headings, containerRef]);

  if (headings.length < 2) return null;

  const scrollTo = (id: string) => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/40 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground hover:border-teal-200 transition-all w-full group"
      >
        <List className="w-3.5 h-3.5 text-teal-500" />
        <span className="flex-1 text-left">Содержание</span>
        <span className="text-[0.625rem] text-muted-foreground/50">{headings.length} разделов</span>
        <ChevronRight className={`w-3 h-3 text-muted-foreground/40 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <nav className="mt-2 bg-card rounded-xl border border-border/40 p-3 space-y-0.5 max-h-[300px] overflow-y-auto">
              {headings.map((h, i) => (
                <button
                  key={`${h.id}-${i}`}
                  onClick={() => scrollTo(h.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[0.75rem] transition-all truncate ${
                    h.level === 3 ? 'pl-5' : ''
                  } ${
                    activeId === h.id
                      ? 'bg-teal-50 text-teal-700 font-medium dark:bg-teal-900/30 dark:text-teal-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LessonView({ lessonId, onSelectLesson, completedLessons, onToggleComplete, onOpenFinalExam, bookmarks, onToggleBookmark, onOpenDiagnostic, onOpenCapstone, onOpenCoach, onOpenNotebook, onOpenInterview, onOpenTemplates, onOpenAnalytics, onOpenDataExercises, onOpenPortfolio, onOpenResumeReview, onOpenCompetencyRadar, onOpenOnboarding }: LessonViewProps) {
  const allLessons = getAllLessons();
  const currentIndex = allLessons.findIndex(l => l.lesson.id === lessonId);
  const current = allLessons[currentIndex];
  const prevIndexRef = useRef(currentIndex);
  const [slideDirection, setSlideDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll(current ? { container: containerRef } : {});
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  // Track direction of navigation
  useEffect(() => {
    if (currentIndex >= 0 && prevIndexRef.current >= 0) {
      setSlideDirection(currentIndex > prevIndexRef.current ? 1 : currentIndex < prevIndexRef.current ? -1 : 0);
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Scroll to top when lesson changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [lessonId]);

  // Show WelcomeView with animated transition
  if (!current) {
    return <WelcomeView completedLessons={completedLessons} onSelectLesson={onSelectLesson} onOpenFinalExam={onOpenFinalExam} onOpenDiagnostic={onOpenDiagnostic} onOpenCapstone={onOpenCapstone} onOpenCoach={onOpenCoach} onOpenNotebook={onOpenNotebook} onOpenInterview={onOpenInterview} onOpenTemplates={onOpenTemplates} onOpenAnalytics={onOpenAnalytics} onOpenDataExercises={onOpenDataExercises} onOpenPortfolio={onOpenPortfolio} onOpenResumeReview={onOpenResumeReview} onOpenCompetencyRadar={onOpenCompetencyRadar} />;
  }

  const { module, lesson } = current;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLessonCandidate = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  
  // Always allow forward navigation — module locks affect sidebar display only,
  // not the prev/next navigation arrows (UX best practice per Coursera / Khan Academy).
  const nextLesson = nextLessonCandidate ?? null;

  const isCompleted = completedLessons.has(lesson.id);
  const isBookmarked = bookmarks.has(lesson.id);

  const wordCount = lesson.content.join(' ').split(/\s+/).length;
  const readingTime = Math.max(2, Math.ceil(wordCount / 200));

  // Module progress for nav bar
  const currentModuleLessons = module.lessons;
  const currentModuleCompleted = currentModuleLessons.filter(l => completedLessons.has(l.id)).length;
  const currentModuleTotal = currentModuleLessons.length;
  // Projected progress after marking current lesson done
  const projectedCompleted = Math.min(currentModuleCompleted + (isCompleted ? 0 : 1), currentModuleTotal);
  const modulePct = Math.round((projectedCompleted / currentModuleTotal) * 100);

  // Cross-module navigation flag
  const isCrossModule = !!(nextLesson && nextLesson.module.id !== module.id);
  const currentModuleNotDone = currentModuleCompleted < currentModuleTotal;

  // Auto-mark current as done and navigate
  const handleNext = useCallback(() => {
    if (!nextLesson) return;
    if (!isCompleted) onToggleComplete(lesson.id);
    onSelectLesson(nextLesson.lesson.id);
  }, [nextLesson, isCompleted, lesson.id, onToggleComplete, onSelectLesson]);

  return (
    <div ref={containerRef} className="flex-1 min-h-screen max-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50 overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-1.5 min-w-0 text-[0.8125rem]">
            <button
              onClick={() => onSelectLesson("")}
              className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-teal-600 transition-colors shrink-0"
              title="На главную"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Главная</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
            <button
              onClick={() => {
                const firstLesson = courseModules.find(m => m.id === module.id)?.lessons[0];
                if (firstLesson) onSelectLesson(firstLesson.id);
              }}
              className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-teal-600 transition-colors shrink-0"
            >
              <span className="px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded text-[0.625rem] font-semibold tracking-wide">
                M{module.number}
              </span>
              <span className="hidden md:inline truncate max-w-[120px]">{module.title}</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
            <span className="text-foreground font-medium truncate">{lesson.title}</span>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {/* Reading time — shown in header, where it's most useful (before reading) */}
            <span className="hidden md:flex items-center gap-1 text-[0.6875rem] text-muted-foreground/50 bg-muted/50 dark:bg-slate-800/60 px-2 py-1 rounded-md">
              <Clock className="w-3 h-3" />
              {readingTime} мин
            </span>
            <ModuleProgressRing moduleId={module.id} completedLessons={completedLessons} />
            <button
              onClick={() => onToggleBookmark(lesson.id)}
              className={`p-1.5 rounded-lg transition-all ${
                isBookmarked ? 'text-teal-600' : 'text-muted-foreground/40 hover:text-muted-foreground'
              }`}
              title={isBookmarked ? "Убрать из закладок" : "В закладки"}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-teal-100" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onToggleComplete(lesson.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all ${
                isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                  : 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50'
              }`}
            >
              {isCompleted
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <CheckCircle className="w-3.5 h-3.5 opacity-40" />}
              {isCompleted ? "Пройден" : "Отметить"}
            </button>
          </div>
        </div>
        <motion.div
          className="h-[2px] bg-gradient-to-r from-teal-500 to-emerald-500 origin-left"
          style={{ scaleX }}
        />
      </div>

      {/* Content with slide transition */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={lessonId}
          initial={{ opacity: 0, x: slideDirection * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slideDirection * -60 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-[720px] mx-auto px-6 py-10"
        >
          {/* Title */}
          <motion.h1
            key={lessonId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-bold leading-tight tracking-tight mb-8"
          >
            {lesson.title}
          </motion.h1>

          {/* Table of Contents */}
          <LessonTOC content={lesson.content} containerRef={containerRef} />

          {/* Interactive content: before */}
          <FadeIn>{renderInteractiveBlocks(lesson.id, "before")}</FadeIn>

          {/* Main content */}
          <FadeIn delay={0.05}>
            <article className="mb-10">
              <RichContent content={lesson.content} />
            </article>
          </FadeIn>

          {/* Animated framework diagrams */}
          {LESSON_DIAGRAMS[lesson.id] && (
            <FadeIn delay={0.1}>
              {LESSON_DIAGRAMS[lesson.id].map((DiagramComponent, idx) => (
                <DiagramComponent key={idx} />
              ))}
            </FadeIn>
          )}

          {/* Interactive content: middle */}
          <FadeIn>{renderInteractiveBlocks(lesson.id, "middle")}</FadeIn>

          {/* Key Points */}
          {lesson.keyPoints && lesson.keyPoints.length > 0 && (
            <FadeIn>
              <div className="rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100/80 dark:border-teal-800/40 p-6 mb-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                    <Lightbulb className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-[0.875rem] font-semibold text-teal-800 dark:text-teal-200">Ключевые тезисы</h3>
                </div>
                <ul className="space-y-2.5">
                  {lesson.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[0.8125rem]">
                      <CheckCircle className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0 mt-0.5" />
                      <span className="text-teal-900/80 dark:text-teal-100/75 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          )}

          {/* Examples */}
          {lesson.examples && lesson.examples.length > 0 && (
            <FadeIn>
              <div className="rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-800/40 p-6 mb-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-[0.875rem] font-semibold text-amber-900 dark:text-amber-200">Примеры</h3>
                </div>
                <ul className="space-y-3">
                  {lesson.examples.map((example, i) => (
                    <li key={i} className="text-[0.8125rem] text-amber-900/80 dark:text-amber-200/70 pl-4 border-l-2 border-amber-200 dark:border-amber-700/50 leading-relaxed">
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          )}

          {/* Practice */}
          {lesson.practice && lesson.practice.length > 0 && (
            <FadeIn>
              <PracticeSection lessonId={lesson.id} tasks={lesson.practice} />
            </FadeIn>
          )}

          {/* Interactive content: after */}
          <FadeIn>{renderInteractiveBlocks(lesson.id, "after")}</FadeIn>

          {/* Quiz */}
          {lesson.quiz && lesson.quiz.length > 0 && (
            <FadeIn>
              <QuizSection quiz={lesson.quiz} lessonId={lesson.id} lessonTitle={lesson.title} />
            </FadeIn>
          )}

          {/* Notes */}
          <FadeIn>
            <NoteSection lessonId={lesson.id} />
          </FadeIn>

          {/* Rating */}
          <FadeIn>
            <RatingSection lessonId={lesson.id} lessonTitle={lesson.title} />
          </FadeIn>

          {/* Peer Learning: Discussion */}
          <FadeIn>
            <LessonDiscussion lessonId={lesson.id} />
          </FadeIn>

          {/* Meta info */}
          <FadeIn>
            <div className="flex items-center justify-center gap-4 text-[0.75rem] text-muted-foreground/40 mb-8">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{readingTime} мин</span>
              <span>{wordCount} слов</span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted/60 rounded text-[0.625rem] font-mono border border-border/30">←</kbd>
                <kbd className="px-1 py-0.5 bg-muted/60 rounded text-[0.625rem] font-mono border border-border/30">→</kbd>
                навигация
              </span>
            </div>
          </FadeIn>

          {/* Navigation */}
          <FadeIn>
            <div className="pt-4 border-t border-border/30 space-y-3">

              {/* Cross-module soft warning */}
              <AnimatePresence>
                {isCrossModule && currentModuleNotDone && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[0.75rem] text-amber-800 dark:text-amber-300 font-medium leading-snug">
                        Вы переходите в следующий модуль, но ещё не завершили текущий
                      </p>
                      <p className="text-[0.6875rem] text-amber-600/70 dark:text-amber-400/60 mt-0.5 leading-relaxed">
                        Пройдено {currentModuleCompleted} из {currentModuleTotal} уроков модуля «{module.title}» - вы всегда можете вернуться.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Module progress strip */}
              <div className="flex items-center gap-2">
                <Layers className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                    initial={{ width: `${Math.round((currentModuleCompleted / currentModuleTotal) * 100)}%` }}
                    animate={{ width: `${modulePct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[0.625rem] text-muted-foreground/40 tabular-nums shrink-0">
                  {projectedCompleted}/{currentModuleTotal}
                </span>
              </div>

              {/* Prev / Next buttons — py-3 ensures ≥44px touch targets per Apple HIG */}
              <div className="flex items-stretch justify-between gap-3">
                {prevLesson ? (
                  <button
                    onClick={() => onSelectLesson(prevLesson.lesson.id)}
                    className="flex items-center gap-2 py-3 px-3 rounded-xl border border-border/40 bg-card hover:border-teal-300/60 dark:hover:border-teal-700/50 hover:bg-teal-50/30 dark:hover:bg-teal-900/20 transition-all max-w-[48%] group"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0 text-muted-foreground/50 group-hover:text-teal-600 group-hover:-translate-x-0.5 transition-all" />
                    <div className="text-left min-w-0">
                      <span className="text-[0.625rem] text-muted-foreground/40 block font-medium uppercase tracking-wide">Назад</span>
                      <span className="truncate text-[0.8125rem] text-foreground/80 block leading-tight mt-0.5">{prevLesson.lesson.title}</span>
                    </div>
                  </button>
                ) : <div />}

                {nextLesson ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 py-3 px-3 rounded-xl border border-teal-200/60 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-900/20 hover:bg-teal-100/60 dark:hover:bg-teal-900/40 hover:border-teal-300/80 dark:hover:border-teal-700/70 transition-all max-w-[48%] text-right group ml-auto"
                  >
                    <div className="text-right min-w-0">
                      <div className="flex items-center justify-end gap-1.5 mb-0.5">
                        <span className="text-[0.625rem] text-teal-500/70 dark:text-teal-400/60 font-medium uppercase tracking-wide">
                          {isCrossModule ? `Модуль ${nextLesson.module.number}` : "Далее"}
                        </span>
                        {isCrossModule && (
                          <span className="px-1.5 py-px bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded text-[0.5625rem] font-semibold leading-tight">
                            М{nextLesson.module.number}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-[0.8125rem] text-teal-900/80 dark:text-teal-100/80 block leading-tight font-medium">{nextLesson.lesson.title}</span>
                      {!isCompleted && (
                        <span className="text-[0.625rem] text-teal-500/50 dark:text-teal-400/40 block mt-0.5 leading-tight">
                          ✓ урок отметится пройденным
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-teal-500 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ) : <div />}
              </div>

            </div>
          </FadeIn>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PracticeSection({ lessonId, tasks }: { lessonId: string; tasks: string[] }) {
  const STORAGE_KEY = "course-practice";

  const loadFromLocal = useCallback((): number[] => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const arr = data[lessonId];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }, [lessonId]);

  const [completed, setCompleted] = useState<Set<number>>(() => new Set(loadFromLocal()));
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadingServer, setLoadingServer] = useState(true);
  const [chestnutToast, setChestnutToast] = useState<{ amount: number; allDone: boolean } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<Set<number>>(completed);

  // Keep ref in sync
  useEffect(() => { completedRef.current = completed; }, [completed]);

  // Load from server on mount (fallback to localStorage)
  useEffect(() => {
    let cancelled = false;
    const sessionId = getSessionId();
    setLoadingServer(true);

    fetch(`${API_BASE}/practice/${sessionId}/${lessonId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.practice?.completed && Array.isArray(data.practice.completed)) {
          setCompleted(new Set(data.practice.completed));
          // Sync to localStorage
          try {
            const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            local[lessonId] = data.practice.completed;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
          } catch {}
          setSyncStatus("saved");
        } else {
          // Server has nothing — use localStorage
          setCompleted(new Set(loadFromLocal()));
        }
      })
      .catch(() => {
        if (!cancelled) setCompleted(new Set(loadFromLocal()));
      })
      .finally(() => { if (!cancelled) setLoadingServer(false); });

    return () => { cancelled = true; };
  }, [lessonId, loadFromLocal]);

  // Reset toast after delay
  useEffect(() => {
    if (!chestnutToast) return;
    const t = setTimeout(() => setChestnutToast(null), 3500);
    return () => clearTimeout(t);
  }, [chestnutToast]);

  // Debounced auto-save function
  const doSave = useCallback(async (currentCompleted: Set<number>) => {
    const arr = Array.from(currentCompleted);

    // Save to localStorage immediately
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (arr.length > 0) data[lessonId] = arr;
      else delete data[lessonId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}

    // Save to server
    setSyncStatus("saving");
    try {
      const sessionId = getSessionId();
      const res = await fetch(`${API_BASE}/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ sessionId, lessonId, completed: arr, total: tasks.length }),
      });
      const result = await res.json();

      if (result.xpAwarded && result.xpAwarded > 0) {
        setChestnutToast({ amount: result.xpAwarded, allDone: result.allDone });
      }
      setSyncStatus("saved");
    } catch (err) {
      console.log(`Error saving practice to server: ${err}`);
      setSyncStatus("error");
    }
  }, [lessonId, tasks.length]);

  const handleToggle = useCallback((index: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);

      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { doSave(next); }, 800);

      return next;
    });
    setSyncStatus("idle");
  }, [doSave]);

  // Cleanup debounce on unmount — flush to localStorage
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        const arr = Array.from(completedRef.current);
        try {
          const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          if (arr.length > 0) data[lessonId] = arr;
          else delete data[lessonId];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    };
  }, [lessonId]);

  const handleReset = useCallback(() => {
    setCompleted(new Set());
    setSyncStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { doSave(new Set()); }, 800);
  }, [doSave]);

  const completedCount = completed.size;
  const allDone = completedCount === tasks.length;
  const progressPct = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/80 dark:border-emerald-800/30 overflow-hidden mb-6 relative">
      {/* Chestnut Toast */}
      <AnimatePresence>
        {chestnutToast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-3 right-3 z-10"
          >
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-lg border backdrop-blur-sm ${
              chestnutToast.allDone
                ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-amber-100/50"
                : "bg-gradient-to-r from-orange-50 to-amber-50 border-amber-200 shadow-amber-100/50"
            }`}>
              <span className="text-lg leading-none">🌰</span>
              <div>
                <p className="text-[0.75rem] font-bold leading-tight text-amber-800">
                  +{chestnutToast.amount} 🌰
                </p>
                <p className="text-[0.625rem] leading-tight text-amber-600/70">
                  {chestnutToast.allDone ? "Все задания выполнены! 🦉" : "За практику"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
            <ListChecks className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-[0.875rem] font-semibold text-emerald-900 dark:text-emerald-100">Практические задания</h3>
            <p className="text-[0.6875rem] text-emerald-600/50 dark:text-emerald-400/60">
              {loadingServer ? "Загрузка..." : `${completedCount} из ${tasks.length} выполнено`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-save status */}
          <AnimatePresence mode="wait">
            {syncStatus === "saving" && (
              <motion.span
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[0.625rem] text-amber-500 font-medium"
              >
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="inline-block">
                  <RotateCcw className="w-3 h-3" />
                </motion.span>
              </motion.span>
            )}
            {syncStatus === "saved" && (
              <motion.span
                key="saved"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[0.625rem] text-emerald-500 font-medium"
              >
                <CheckCircle2 className="w-3 h-3" />
              </motion.span>
            )}
          </AnimatePresence>
          {allDone && !loadingServer && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[0.6875rem] font-semibold flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Все готово
            </motion.span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-6 mb-4">
        <div className="h-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Tasks list */}
      <div className="px-6 space-y-2 pb-4">
        {tasks.map((task, i) => {
          const isDone = completed.has(i);
          return (
            <div key={i} className={`rounded-xl transition-all ${
              isDone
                ? "bg-emerald-100/60 ring-1 ring-emerald-200/50"
                : "bg-white dark:bg-slate-800 ring-1 ring-emerald-100 dark:ring-emerald-800/30"
            } ${loadingServer ? "opacity-60" : ""}`}>
              <button
                onClick={() => handleToggle(i)}
                disabled={loadingServer}
                className="w-full text-left flex items-start gap-3 px-3.5 py-3 group"
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-slate-700 border-2 border-emerald-200 dark:border-emerald-700 group-hover:border-emerald-400"
                }`}>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
                <span className={`text-[0.8125rem] leading-relaxed transition-colors ${
                  isDone
                    ? "text-emerald-700/60 dark:text-emerald-400/60 line-through"
                    : "text-emerald-900/80 dark:text-emerald-200/80"
                }`}>
                  {task}
                </span>
              </button>
              <div className="px-3.5 pb-3">
                <NotebookTextarea lessonId={lessonId} taskIndex={i} taskText={task} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 pb-5 flex items-center gap-2.5">
        {completedCount > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.75rem] font-medium text-emerald-600/60 dark:text-emerald-400/60 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Сбросить
          </button>
        )}
        <span className="text-[0.625rem] text-emerald-400/60 dark:text-emerald-500/40 ml-auto">
          автосохранение
        </span>
      </div>
    </div>
  );
}

function NoteSection({ lessonId }: { lessonId: string }) {
  const [note, setNote] = useState(() => {
    try {
      const notes = JSON.parse(localStorage.getItem("course-notes") || "{}");
      return notes[lessonId] || "";
    } catch { return ""; }
  });
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Reload note when lesson changes
  useEffect(() => {
    try {
      const notes = JSON.parse(localStorage.getItem("course-notes") || "{}");
      setNote(notes[lessonId] || "");
    } catch { setNote(""); }
    setSaved(false);
    setExpanded(false);
  }, [lessonId]);

  const saveNote = useCallback((text: string) => {
    try {
      const notes = JSON.parse(localStorage.getItem("course-notes") || "{}");
      if (text.trim()) {
        notes[lessonId] = text;
      } else {
        delete notes[lessonId];
      }
      localStorage.setItem("course-notes", JSON.stringify(notes));
    } catch {}

    const sessionId = getSessionId();
    fetch(`${API_BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ sessionId, lessonId, note: text }),
    }).catch(() => {});
  }, [lessonId]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNote(text);
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveNote(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
  }, [saveNote]);

  const hasNote = note.trim().length > 0;

  return (
    <div className="rounded-xl border border-border/40 bg-white dark:bg-slate-800 mb-6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <StickyNote className="w-4 h-4 text-amber-500" />
          <span className="text-[0.8125rem] font-medium text-foreground">Заметки</span>
          {/* Dot indicator — much cleaner than raw character count */}
          {hasNote && !expanded && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[0.625rem] text-emerald-500 font-medium">
              <CheckCircle2 className="w-3 h-3" />Сохранено
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <textarea
                value={note}
                onChange={handleChange}
                placeholder="Ваши заметки к уроку..."
                aria-label="Заметки к уроку"
                className="w-full min-h-[100px] p-3 bg-muted/20 border border-border/40 rounded-lg text-[0.8125rem] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 placeholder:text-muted-foreground/30 transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RatingSection({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const [rating, setRating] = useState(() => {
    try {
      const ratings = JSON.parse(localStorage.getItem("course-ratings") || "{}");
      return ratings[lessonId] || 0;
    } catch { return 0; }
  });
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleRate = useCallback((value: number) => {
    setRating(value);
    try {
      const ratings = JSON.parse(localStorage.getItem("course-ratings") || "{}");
      ratings[lessonId] = value;
      localStorage.setItem("course-ratings", JSON.stringify(ratings));
    } catch {}

    const sessionId = getSessionId();
    fetch(`${API_BASE}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ sessionId, lessonId, rating: value }),
    }).catch(() => {});

    sendWebhook({ type: "lesson_rated" as any, lessonId, lessonTitle, rating: value } as any);
  }, [lessonId, lessonTitle]);

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <span className="text-[0.8125rem] text-muted-foreground/60">Оцените урок</span>
      {/* Each star button: p-2 gives ~36px touch target (HIG recommends 44pt, MD3 48dp) */}
      {/* Using role="group" for the set, individual aria-label per star */}
      <div className="flex items-center gap-0" role="group" aria-label="Оценка урока">
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            onClick={() => handleRate(v)}
            onMouseEnter={() => setHoveredStar(v)}
            onMouseLeave={() => setHoveredStar(0)}
            aria-label={`${v} из 5 звёзд`}
            aria-pressed={rating === v}
            className="p-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Star className={`w-5 h-5 transition-colors ${
              v <= (hoveredStar || rating)
                ? "text-amber-400 fill-amber-400"
                : "text-border"
            }`} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <span className="text-[0.75rem] text-muted-foreground/50 tabular-nums">{rating}/5</span>
      )}
    </div>
  );
}

function getPracticeStats(): { completedTasks: number; totalTasks: number; lessonsWithProgress: number; lessonsTotal: number } {
  const allLessons = getAllLessons();
  let completedTasks = 0;
  let totalTasks = 0;
  let lessonsWithProgress = 0;
  let lessonsTotal = 0;

  try {
    const data = JSON.parse(localStorage.getItem("course-practice") || "{}");
    for (const { lesson } of allLessons) {
      if (lesson.practice && lesson.practice.length > 0) {
        lessonsTotal++;
        totalTasks += lesson.practice.length;
        const done = data[lesson.id];
        if (Array.isArray(done) && done.length > 0) {
          completedTasks += done.length;
          lessonsWithProgress++;
        }
      }
    }
  } catch {}

  return { completedTasks, totalTasks, lessonsWithProgress, lessonsTotal };
}

// ===== Streak Calendar (Activity Heatmap) =====
function StreakCalendar({ streak, xp, xpLevel }: { streak: number; xp: number; xpLevel: { title: string; level: number; progress: number; nextLevelXP: number } }) {
  // Parse localStorage once per mount — combines activityDays + lastStudied in one JSON.parse
  const { activityDays, lastStudied } = useMemo(() => {
    try {
      const log = JSON.parse(localStorage.getItem("course-activity-log") || "[]") as string[];
      const activityDays = new Set(log);
      const lastStudied = log.length > 0 ? [...new Set(log)].sort().reverse()[0] : null;
      return { activityDays, lastStudied };
    } catch {
      return { activityDays: new Set<string>(), lastStudied: null };
    }
  }, []);

  // Generate calendar grid once per mount
  const { weeks, todayStr } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const endDay = new Date(now);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 83);
    const weeks: string[][] = [];
    for (let w = 0; w < 12; w++) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDay);
        date.setDate(startDay.getDate() + w * 7 + d);
        week.push(date.toISOString().slice(0, 10));
      }
      weeks.push(week);
    }
    return { weeks, todayStr };
  }, []);

  const formatLastStudied = (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr === today) return "Сегодня";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().slice(0, 10)) return "Вчера";
    const d = new Date(dateStr);
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const getCellColor = (dateStr: string) => {
    if (dateStr > todayStr) return "bg-slate-100/40 dark:bg-slate-700/20";
    if (activityDays.has(dateStr)) return "bg-teal-500 dark:bg-teal-400";
    return "bg-slate-100 dark:bg-slate-700";
  };

  const dayLabels = ["Пн", "", "Ср", "", "Пт", "", ""];

  if (activityDays.size === 0 && xp === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-border/40 p-5 mb-6 shadow-sm shadow-black/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">📅</span>
          <div>
            <h3 className="text-[0.875rem] font-semibold">Активность</h3>
            {lastStudied && (
              <p className="text-[0.6875rem] text-muted-foreground/60">
                Последнее занятие: {formatLastStudied(lastStudied)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {xp > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100/60">
              <span className="text-xs leading-none">🌰</span>
              <span className="text-[0.75rem] font-bold text-amber-700 tabular-nums">{xp}</span>
            </div>
          )}
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100/60">
              <span className="text-xs leading-none">🔥</span>
              <span className="text-[0.75rem] font-bold text-orange-600 tabular-nums">{streak}d</span>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1 shrink-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[14px] flex items-center">
              <span className="text-[0.625rem] text-muted-foreground/40 leading-none w-[14px]">{label}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((dateStr) => (
              <div
                key={dateStr}
                className={`w-[14px] h-[14px] rounded-[3px] transition-colors ${getCellColor(dateStr)} ${dateStr === todayStr ? 'ring-1 ring-teal-400 ring-offset-1' : ''}`}
                title={`${dateStr}${activityDays.has(dateStr) ? ' ✓' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-[0.625rem] text-muted-foreground/50">
          <div className="w-[10px] h-[10px] rounded-[2px] bg-slate-100 dark:bg-slate-700" />
          <span>Нет</span>
          <div className="w-[10px] h-[10px] rounded-[2px] bg-teal-500 dark:bg-teal-400" />
          <span>Занятие</span>
        </div>
        <span className="text-[0.625rem] text-muted-foreground/50 tabular-nums">
          {activityDays.size} дн. активности
        </span>
      </div>

      {/* XP Level bar */}
      {xp > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[0.6875rem] font-semibold text-amber-800 dark:text-amber-300">🌰 {xpLevel.title}</span>
            <span className="text-[0.625rem] text-amber-500 dark:text-amber-400 tabular-nums">Уровень {xpLevel.level} • {xp}/{xpLevel.nextLevelXP}</span>
          </div>
          <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(xpLevel.progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Static course stats — computed once at module level since courseModules never changes
const _TOTAL_LESSONS_WV = getAllLessons().length;
const _TOTAL_QUIZZES_WV = courseModules.reduce((a, m) => a + m.lessons.filter(l => l.quiz && l.quiz.length > 0).length, 0);
const _TOTAL_PRACTICE_WV = courseModules.reduce((a, m) => a + m.lessons.filter(l => l.practice && l.practice.length > 0).length, 0);

function WelcomeView({ completedLessons, onSelectLesson, onOpenFinalExam, onOpenDiagnostic, onOpenCapstone, onOpenCoach, onOpenNotebook, onOpenInterview, onOpenTemplates, onOpenAnalytics, onOpenDataExercises, onOpenPortfolio, onOpenResumeReview, onOpenCompetencyRadar }: { completedLessons: Set<string>, onSelectLesson: (id: string) => void, onOpenFinalExam?: () => void, onOpenDiagnostic?: () => void, onOpenCapstone?: () => void, onOpenCoach?: () => void, onOpenNotebook?: () => void, onOpenInterview?: () => void, onOpenTemplates?: () => void, onOpenAnalytics?: () => void, onOpenDataExercises?: () => void, onOpenPortfolio?: () => void, onOpenResumeReview?: () => void, onOpenCompetencyRadar?: () => void }) {
  const [dashboardView, setDashboardView] = useState<"list" | "map">("list");
  const totalLessons = _TOTAL_LESSONS_WV;
  const progress = Math.round((completedLessons.size / totalLessons) * 100);
  const totalQuizzes = _TOTAL_QUIZZES_WV;
  const totalPractice = _TOTAL_PRACTICE_WV;
  // practiceStats reads localStorage — memoize to avoid re-reading on every WelcomeView render
  const practiceStats = useMemo(() => getPracticeStats(), []);
  const userName = getUserName();
  const streak = getStreak();
  const localXP = getLocalXP();
  const xpLevel = getXPLevel(localXP);

  // Estimated time remaining
  const remainingLessons = totalLessons - completedLessons.size;
  const avgReadingTime = 6;
  const estimatedMinutes = remainingLessons * avgReadingTime;
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const estimatedMins = estimatedMinutes % 60;
  const estimatedTimeStr = remainingLessons > 0 
    ? (estimatedHours > 0 ? `~${estimatedHours}ч ${estimatedMins > 0 ? `${estimatedMins}м` : ''}` : `~${estimatedMins}м`)
    : null;

  // Find next incomplete lesson
  const allLessons = getAllLessons();
  const nextLesson = allLessons.find(l => {
    if (completedLessons.has(l.lesson.id)) return false;
    // Only suggest lessons from unlocked modules
    return isModuleUnlocked(l.module, completedLessons);
  });

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-100 via-teal-50/40 to-emerald-50/30 dark:from-slate-900 dark:via-teal-950/30 dark:to-emerald-950/20">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-[0.75rem] font-medium mb-6">
            <Zap className="w-3 h-3" />
            {courseModules.length} модулей &middot; {totalLessons} уроков
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            {userName !== "Вы" ? `Привет, ${userName}!` : "Продакт-менеджмент"}
          </h1>
          <p className="text-muted-foreground text-[0.9375rem] leading-relaxed max-w-md mx-auto">
            {userName !== "Вы"
              ? "Добро пожаловать в курс по продакт-менеджменту - с тестами, практикой и финальным экзаменом"
              : "Полный курс по продакт-менеджменту с тестами, практикой и финальным экзаменом"}
          </p>
        </motion.div>

        {/* START button — only for brand-new users with 0 completed lessons */}
        {nextLesson && completedLessons.size === 0 && (
          <FadeIn>
            <button
              onClick={() => onSelectLesson(nextLesson.lesson.id)}
              className="w-full flex items-center gap-4 bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-600 dark:to-emerald-600 text-white rounded-2xl p-5 mb-6 hover:from-teal-600 hover:to-emerald-600 dark:hover:from-teal-500 dark:hover:to-emerald-500 transition-all shadow-md shadow-teal-100 dark:shadow-teal-950/30 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[0.6875rem] text-white/60 font-medium">Начните с первого урока</p>
                <p className="text-[0.875rem] font-medium truncate">{nextLesson.lesson.title}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </FadeIn>
        )}

        {/* Progress card */}
        <FadeIn>
          <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 dark:from-teal-800 dark:via-teal-900 dark:to-emerald-900 rounded-2xl border border-teal-500/30 dark:border-teal-600/20 p-6 mb-6 shadow-lg shadow-teal-900/20 dark:shadow-black/30 relative overflow-hidden">
            {/* Subtle decorative pattern */}
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            <div className="relative">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[0.75rem] text-teal-100/70 mb-0.5">Ваш прогресс</p>
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-white">{progress}<span className="text-lg text-teal-100/60">%</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[0.75rem] text-teal-100/70 tabular-nums">{completedLessons.size} из {totalLessons}</p>
                  {estimatedTimeStr && (
                    <p className="text-[0.6875rem] text-teal-100/50 tabular-nums mt-0.5">Осталось {estimatedTimeStr}</p>
                  )}
                </div>
              </div>
              <div className="h-2.5 bg-white/15 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Stats grid — 3-col on mobile, 5-col on sm+ */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-5 pt-5 border-t border-teal-400/20">
                <div className="text-center">
                  <p className="text-lg font-bold text-white tabular-nums">{courseModules.length}</p>
                  <p className="text-[0.6875rem] text-teal-100/60">Модулей</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white tabular-nums">{totalLessons}</p>
                  <p className="text-[0.6875rem] text-teal-100/60">Уроков</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-200 tabular-nums">{totalQuizzes}</p>
                  <p className="text-[0.6875rem] text-teal-100/60">Тестов</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-200 tabular-nums">{completedLessons.size}</p>
                  <p className="text-[0.6875rem] text-teal-100/60">Пройдено</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-200 tabular-nums">{practiceStats.completedTasks}</p>
                  <p className="text-[0.6875rem] text-teal-100/60">Практика</p>
                </div>
              </div>

              {/* Practice progress detail */}
              {practiceStats.completedTasks > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-white/10 border border-teal-400/15 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm leading-none">🌰</span>
                      <span className="text-[0.75rem] font-semibold text-amber-200">Практические задания</span>
                    </div>
                    <span className="text-[0.6875rem] text-amber-200/80 font-medium tabular-nums">
                      {practiceStats.completedTasks}/{practiceStats.totalTasks}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${practiceStats.totalTasks > 0 ? Math.round((practiceStats.completedTasks / practiceStats.totalTasks) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-[0.625rem] text-teal-100/40 mt-1.5">
                    Выполнено в {practiceStats.lessonsWithProgress} из {practiceStats.lessonsTotal} уроков с практикой
                  </p>
                </div>
              )}

              {/* Simulator progress */}
              {(() => {
                const simStats = getSimulatorStats();
                if (simStats.completed === 0) return null;
                return (
                  <div className="mt-3 p-3 rounded-xl bg-white/10 border border-teal-400/15 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-none">🎮</span>
                        <span className="text-[0.75rem] font-semibold text-cyan-200">PM-Симулятор</span>
                      </div>
                      <span className="text-[0.6875rem] text-cyan-200/80 font-medium tabular-nums">
                        {simStats.completed}/{simStats.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-teal-300 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((simStats.completed / simStats.total) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[0.625rem] text-teal-100/40">
                        {simStats.completed === 1 ? "Пройден 1 сценарий" : `Пройдено ${simStats.completed} сценария`}
                        {simStats.bestScore > 0 && <span className="text-emerald-300/60"> &middot; лучший: {simStats.bestScore}%</span>}
                      </p>
                      <p className="text-[0.625rem] text-teal-200/40 font-medium">
                        {simStats.total - simStats.completed > 0 ? `Доступно ещё: ${simStats.total - simStats.completed}` : "Все пройдены!"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </FadeIn>

        {/* Streak Calendar & Quick Stats */}
        <FadeIn delay={0.05}>
          <StreakCalendar streak={streak} xp={localXP} xpLevel={xpLevel} />
        </FadeIn>

        {/* Adaptive Learning: Diagnostic Prompt or Recommended Path */}
        <FadeIn delay={0.07}>
          {onOpenDiagnostic && <DiagnosticPrompt onStart={onOpenDiagnostic} />}
          <RecommendedPath completedLessons={completedLessons} onSelectLesson={onSelectLesson} />
        </FadeIn>

        {/* Continue button — only for users who have already started */}
        {nextLesson && completedLessons.size > 0 && (
          <FadeIn delay={0.1}>
            <button
              onClick={() => onSelectLesson(nextLesson.lesson.id)}
              className="w-full flex items-center gap-4 bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-600 dark:to-emerald-600 text-white rounded-2xl p-5 mb-6 hover:from-teal-600 hover:to-emerald-600 dark:hover:from-teal-500 dark:hover:to-emerald-500 transition-all shadow-md shadow-teal-100 dark:shadow-teal-950/30 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[0.6875rem] text-white/60 font-medium">Продолжить обучение</p>
                <p className="text-[0.875rem] font-medium truncate">{nextLesson.lesson.title}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </FadeIn>
        )}

        {/* Daily Challenge */}
        <FadeIn delay={0.15}>
          <div className="mb-4">
            <DailyChallenge />
          </div>
        </FadeIn>

        {/* Badges */}
        <FadeIn>
          <div className="mb-4">
            <BadgesPanel completedLessons={completedLessons} examScore={null} />
          </div>
        </FadeIn>

        {/* Capstone Projects */}
        {onOpenCapstone && (
          <FadeIn>
            <CapstonePortfolioWidget onOpen={onOpenCapstone} />
          </FadeIn>
        )}

        {/* PM-Coach */}
        {onOpenCoach && (
          <FadeIn>
            <div className="mb-4">
              <PMCoachWidget onOpenCoach={onOpenCoach} />
            </div>
          </FadeIn>
        )}

        {/* Notebook */}
        {onOpenNotebook && (
          <FadeIn>
            <div className="mb-4">
              <NotebookWidget onOpen={onOpenNotebook} />
            </div>
          </FadeIn>
        )}

        {/* Quick Access Tools Grid */}
        <FadeIn delay={0.12}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {onOpenInterview && (
              <button onClick={onOpenInterview} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-amber-200 hover:shadow-sm transition-all text-left group dark:hover:border-amber-800">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0"><span className="text-sm">🎤</span></div>
                <div><p className="text-[0.75rem] font-semibold">Интервью</p><p className="text-[0.625rem] text-muted-foreground/50">Симулятор</p></div>
              </button>
            )}
            {onOpenTemplates && (
              <button onClick={onOpenTemplates} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-teal-200 hover:shadow-sm transition-all text-left group dark:hover:border-teal-800">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0"><span className="text-sm">📋</span></div>
                <div><p className="text-[0.75rem] font-semibold">Шаблоны</p><p className="text-[0.625rem] text-muted-foreground/50">PM-артефакты</p></div>
              </button>
            )}
            {onOpenAnalytics && (
              <button onClick={onOpenAnalytics} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-cyan-200 hover:shadow-sm transition-all text-left group dark:hover:border-cyan-800">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center shrink-0"><span className="text-sm">📊</span></div>
                <div><p className="text-[0.75rem] font-semibold">Аналитика</p><p className="text-[0.625rem] text-muted-foreground/50">Дашборд</p></div>
              </button>
            )}
            {onOpenDataExercises && (
              <button onClick={onOpenDataExercises} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-emerald-200 hover:shadow-sm transition-all text-left group dark:hover:border-emerald-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0"><span className="text-sm">🧮</span></div>
                <div><p className="text-[0.75rem] font-semibold">Задачи</p><p className="text-[0.625rem] text-muted-foreground/50">Real Data</p></div>
              </button>
            )}
            {onOpenPortfolio && (
              <button onClick={onOpenPortfolio} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-violet-200 hover:shadow-sm transition-all text-left group dark:hover:border-violet-800">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0"><span className="text-sm">💼</span></div>
                <div><p className="text-[0.75rem] font-semibold">Портфолио</p><p className="text-[0.625rem] text-muted-foreground/50">PM-профиль</p></div>
              </button>
            )}
            {onOpenResumeReview && (
              <button onClick={onOpenResumeReview} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-pink-200 hover:shadow-sm transition-all text-left group dark:hover:border-pink-800">
                <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center shrink-0"><span className="text-sm">📄</span></div>
                <div><p className="text-[0.75rem] font-semibold">Резюме AI</p><p className="text-[0.625rem] text-muted-foreground/50">Проверка CV</p></div>
              </button>
            )}
            {onOpenCompetencyRadar && (
              <button onClick={onOpenCompetencyRadar} className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/40 hover:border-blue-200 hover:shadow-sm transition-all text-left group dark:hover:border-blue-800">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><span className="text-sm">🎯</span></div>
                <div><p className="text-[0.75rem] font-semibold">Компетенции</p><p className="text-[0.625rem] text-muted-foreground/50">PM Radar</p></div>
              </button>
            )}
          </div>
        </FadeIn>

        {/* Progress Chart */}
        <FadeIn>
          <div className="mb-4">
            <ProgressChart completedLessons={completedLessons} totalLessons={totalLessons} />
          </div>
        </FadeIn>

        {/* Share */}
        <FadeIn>
          <div className="flex justify-end mb-6">
            <ShareProgressButton completedLessons={completedLessons} examScore={null} />
          </div>
        </FadeIn>

        {/* View toggle + Module cards / Roadmap */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[0.875rem] font-semibold text-muted-foreground uppercase tracking-wide">Модули курса</h2>
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setDashboardView("list")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.6875rem] font-medium transition-all ${
                  dashboardView === "list"
                    ? "bg-white dark:bg-slate-700 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3 h-3" />
                Список
              </button>
              <button
                onClick={() => setDashboardView("map")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.6875rem] font-medium transition-all ${
                  dashboardView === "map"
                    ? "bg-white dark:bg-slate-700 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Map className="w-3 h-3" />
                Карта
              </button>
            </div>
          </div>

          {dashboardView === "map" ? (
            <FadeIn>
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-border/40 p-6 overflow-hidden">
                <LearningRoadmap completedLessons={completedLessons} onSelectLesson={onSelectLesson} />
              </div>
            </FadeIn>
          ) : (
            <>
              {(() => {
                return courseBlocks.map((block, bi) => {
                  const blockModules = courseModules.filter(m => m.number >= block.range[0] && m.number <= block.range[1]);
                  if (blockModules.length === 0) return null;
                  const completedModulesCount = blockModules.filter(m => m.lessons.every(l => completedLessons.has(l.id))).length;
                  const totalBlockLessons = blockModules.reduce((a, m) => a + m.lessons.length, 0);
                  const completedBlockLessons = blockModules.reduce((a, m) => a + m.lessons.filter(l => completedLessons.has(l.id)).length, 0);
                  const blockPct = totalBlockLessons > 0 ? Math.round((completedBlockLessons / totalBlockLessons) * 100) : 0;
                  const isBlockComplete = completedBlockLessons === totalBlockLessons;

                  return (
                    <FadeIn key={bi} delay={bi * 0.04}>
                      <div className="space-y-2">
                        {/* Block header */}
                        <div className="flex items-center gap-3 pt-4 pb-1 px-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                            isBlockComplete ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-teal-50 dark:bg-teal-900/20'
                          }`}>
                            {block.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[0.625rem] text-muted-foreground/50 font-bold">{bi + 1}</span>
                              <h3 className="text-[0.9375rem] font-semibold truncate">{block.name}</h3>
                              {completedModulesCount > 0 && (
                                <span className={`text-[0.625rem] px-2 py-0.5 rounded-full font-bold tabular-nums ${
                                  isBlockComplete
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                                }`}>
                                  {completedModulesCount}/{blockModules.length}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[160px]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${isBlockComplete ? 'bg-emerald-500' : 'bg-teal-400'}`}
                                  style={{ width: `${blockPct}%` }}
                                />
                              </div>
                              <span className="text-[0.625rem] text-muted-foreground/40 tabular-nums">{completedBlockLessons}/{totalBlockLessons}</span>
                            </div>
                          </div>
                        </div>

                        {/* Module cards inside block */}
                        {blockModules.map((module) => {
                          const mi = courseModules.indexOf(module);
                          const completed = module.lessons.filter(l => completedLessons.has(l.id)).length;
                          const isModuleComplete = completed === module.lessons.length;
                          const firstIncomplete = module.lessons.find(l => !completedLessons.has(l.id));
                          const pct = Math.round((completed / module.lessons.length) * 100);
                          const isUnlocked = isModuleUnlocked(module, completedLessons);

                          return (
                            <button
                              key={module.id}
                              onClick={() => isUnlocked ? onSelectLesson(firstIncomplete?.id || module.lessons[0].id) : undefined}
                              className={`w-full text-left rounded-xl border p-4 transition-all flex items-center gap-4 group ${
                                !isUnlocked
                                  ? 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 opacity-60 cursor-not-allowed'
                                  : 'bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-800 dark:via-slate-800/80 dark:to-teal-900/30 border-slate-200/60 dark:border-slate-700/60 hover:border-teal-200 hover:shadow-sm'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                !isUnlocked
                                  ? 'bg-slate-100 text-slate-400'
                                  : isModuleComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'
                              }`}>
                                {!isUnlocked ? <Lock className="w-5 h-5" /> : isModuleComplete ? <Trophy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">Модуль {module.number}</span>
                                  {!isUnlocked && (
                                    <span className="text-[0.625rem] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full font-medium">
                                      Заблокирован
                                    </span>
                                  )}
                                </div>
                                <h4 className={`text-[0.875rem] font-medium truncate ${!isUnlocked ? 'text-muted-foreground' : ''}`}>{module.title}</h4>
                                {isUnlocked ? (
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden max-w-[120px]">
                                      <div
                                        className={`h-full rounded-full transition-all ${isModuleComplete ? 'bg-emerald-500' : 'bg-teal-500'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[0.6875rem] text-muted-foreground/50 tabular-nums">{completed}/{module.lessons.length}</span>
                                  </div>
                                ) : (
                                  <p className="text-[0.6875rem] text-muted-foreground/40 mt-1">
                                    Пройди модуль {mi > 0 ? courseModules[mi - 1].number : ''} для открытия
                                  </p>
                                )}
                              </div>
                              {isUnlocked ? (
                                <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-slate-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </FadeIn>
                  );
                });
              })()}

              {/* Final Exam Card */}
              {onOpenFinalExam && (() => {
                const allModulesComplete = courseModules.every(m => m.lessons.every(l => completedLessons.has(l.id)));
                return (
                  <FadeIn>
                    <button
                      onClick={() => allModulesComplete ? onOpenFinalExam() : undefined}
                      className={`w-full text-left rounded-xl border p-4 transition-all flex items-center gap-4 group ${
                        allModulesComplete
                          ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200/60 hover:border-teal-300 hover:shadow-sm'
                          : 'bg-slate-50 border-border/30 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        allModulesComplete ? 'bg-teal-100' : 'bg-slate-100'
                      }`}>
                        {allModulesComplete ? <Sparkles className="w-5 h-5 text-teal-700" /> : <Lock className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-[0.875rem] font-semibold ${allModulesComplete ? 'text-teal-900' : 'text-muted-foreground'}`}>Финальный экзамен</h4>
                        <p className={`text-[0.75rem] ${allModulesComplete ? 'text-teal-600/60' : 'text-muted-foreground/40'}`}>
                          {allModulesComplete ? 'Итоговый тест по всем модулям курса' : 'Пройдите все модули для открытия'}
                        </p>
                      </div>
                      {allModulesComplete ? (
                        <Award className="w-5 h-5 text-teal-300 group-hover:text-teal-500 transition-colors shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  </FadeIn>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}