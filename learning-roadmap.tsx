import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { courseModules } from "./course-data";
import {
  BookOpen, Trophy, Star, ChevronRight, Zap, Target,
  CheckCircle, Lock, Sparkles, Crown, Award, Play,
  Layers, BarChart3, Search, TrendingUp, Briefcase,
  MessageCircle, Rocket, GraduationCap, Brain, ClipboardList,
  Mic, Monitor, Repeat, Network, DollarSign, Compass,
  AlertTriangle, RefreshCw, MessageSquare, Users, Grid3x3
} from "lucide-react";

interface LearningRoadmapProps {
  completedLessons: Set<string>;
  onSelectLesson: (lessonId: string) => void;
}

const MILESTONE_EVERY = 5; // milestone every 5 modules

// Extended icon list to cover all 30 modules
const moduleIcons = [
  Zap, DollarSign, Brain, AlertTriangle, RefreshCw,
  Target, MessageSquare, Search, ClipboardList, Users,
  Mic, CheckCircle, TrendingUp, Monitor, BarChart3,
  Grid3x3, Search, Monitor, Layers, ClipboardList,
  Brain, MessageCircle, Rocket, Briefcase, Rocket,
  GraduationCap, Repeat, Network, Brain, BarChart3
];

export function LearningRoadmap({ completedLessons, onSelectLesson }: LearningRoadmapProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Compute per-module stats
  const moduleStats = useMemo(() =>
    courseModules.map((m, i) => {
      const completed = m.lessons.filter(l => completedLessons.has(l.id)).length;
      const total = m.lessons.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isComplete = completed === total && total > 0;
      const firstIncomplete = m.lessons.find(l => !completedLessons.has(l.id));
      const quizCount = m.lessons.filter(l => l.quiz && l.quiz.length > 0).length;
      const practiceCount = m.lessons.filter(l => l.practice && l.practice.length > 0).length;
      return { ...m, completed, total, pct, isComplete, firstIncomplete, quizCount, practiceCount, index: i };
    })
  , [completedLessons]);

  // Aggregate totals
  const totals = useMemo(() => {
    const totalModules = courseModules.length;
    const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
    const totalQuizzes = courseModules.reduce((a, m) => a + m.lessons.filter(l => l.quiz && l.quiz.length > 0).length, 0);
    const totalPractice = courseModules.reduce((a, m) => a + m.lessons.filter(l => l.practice && l.practice.length > 0).length, 0);
    const completedCount = completedLessons.size;
    const completedModules = moduleStats.filter(m => m.isComplete).length;
    const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    return { totalModules, totalLessons, totalQuizzes, totalPractice, completedCount, completedModules, progressPct };
  }, [completedLessons, moduleStats]);

  // Find current module (first not fully completed)
  const currentModuleIndex = moduleStats.findIndex(m => !m.isComplete);

  // Calculate path coordinates for the winding road
  const getNodePosition = (index: number) => {
    const verticalSpacing = 110;
    const row = index;
    const isLeftSide = row % 2 === 0;
    const x = isLeftSide ? 25 : 75;
    const y = 60 + row * verticalSpacing;
    return { x, y, isLeftSide };
  };

  const totalHeight = 60 + courseModules.length * 110 + 40;

  return (
    <div>
      {/* Summary header */}
      <div className="mb-6 pb-5 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-[0.875rem] font-semibold text-foreground">Карта курса</h3>
              <p className="text-[0.6875rem] text-muted-foreground">
                {totals.completedModules} из {totals.totalModules} модулей пройдено
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">{totals.progressPct}%</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${totals.progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm font-bold text-foreground tabular-nums">{totals.totalModules}</p>
            <p className="text-[0.5625rem] text-muted-foreground">Модулей</p>
          </div>
          <div className="text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm font-bold text-foreground tabular-nums">{totals.totalLessons}</p>
            <p className="text-[0.5625rem] text-muted-foreground">Уроков</p>
          </div>
          <div className="text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{totals.totalQuizzes}</p>
            <p className="text-[0.5625rem] text-muted-foreground">Тестов</p>
          </div>
          <div className="text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totals.totalPractice}</p>
            <p className="text-[0.5625rem] text-muted-foreground">Практик</p>
          </div>
        </div>
      </div>

      {/* Roadmap path */}
      <div className="relative w-full" style={{ minHeight: totalHeight }}>
        {/* SVG Path connecting nodes */}
        <svg
          className="absolute inset-0 w-full pointer-events-none"
          style={{ height: totalHeight }}
          viewBox={`0 0 100 ${totalHeight}`}
          preserveAspectRatio="none"
        >
          {/* Background path (full) */}
          {courseModules.map((_, i) => {
            if (i === 0) return null;
            const prev = getNodePosition(i - 1);
            const curr = getNodePosition(i);
            const midY = (prev.y + curr.y) / 2;
            return (
              <path
                key={`bg-${i}`}
                d={`M ${prev.x} ${prev.y} C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`}
                fill="none"
                stroke="rgb(226 232 240)"
                strokeWidth="0.6"
                strokeDasharray="2 2"
              />
            );
          })}
          {/* Progress path (completed) */}
          {courseModules.map((_, i) => {
            if (i === 0) return null;
            const isCompleted = moduleStats[i - 1]?.isComplete;
            if (!isCompleted) return null;
            const prev = getNodePosition(i - 1);
            const curr = getNodePosition(i);
            const midY = (prev.y + curr.y) / 2;
            return (
              <motion.path
                key={`progress-${i}`}
                d={`M ${prev.x} ${prev.y} C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="0.8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            );
          })}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(20 184 166)" />
              <stop offset="100%" stopColor="rgb(16 185 129)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Module nodes */}
        {moduleStats.map((mod, i) => {
          const pos = getNodePosition(i);
          const isCurrent = i === currentModuleIndex;
          const isHovered = hoveredModule === mod.id;
          const isSelected = selectedModule === mod.id;
          const isMilestone = (i + 1) % MILESTONE_EVERY === 0;
          const Icon = moduleIcons[i] || BookOpen;

          return (
            <div key={mod.id}>
              {/* Milestone marker */}
              {isMilestone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 + 0.3 }}
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: pos.y - 42,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-semibold ${
                    mod.isComplete
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  }`}>
                    <Crown className="w-3 h-3" />
                    Этап {Math.floor((i + 1) / MILESTONE_EVERY)}
                  </div>
                </motion.div>
              )}

              {/* Node */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 20 }}
                className="absolute"
                style={{
                  left: `${pos.x}%`,
                  top: pos.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <button
                  onClick={() => {
                    setSelectedModule(isSelected ? null : mod.id);
                  }}
                  onMouseEnter={() => setHoveredModule(mod.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    mod.isComplete
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30 scale-100"
                      : isCurrent
                      ? "bg-gradient-to-br from-teal-400 to-cyan-400 text-white shadow-lg shadow-teal-100 dark:shadow-teal-900/30 scale-110"
                      : "bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-500 hover:border-teal-200 dark:hover:border-teal-700 hover:text-teal-400"
                  } ${isHovered ? "scale-115 shadow-xl" : ""}`}
                >
                  {mod.isComplete ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : isCurrent ? (
                    <Play className="w-6 h-6 fill-current" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}

                  {/* Current pulse */}
                  {isCurrent && (
                    <span className="absolute -inset-1 rounded-2xl border-2 border-teal-300 animate-ping opacity-30" />
                  )}

                  {/* Module number badge */}
                  <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[0.5625rem] font-bold flex items-center justify-center ${
                    mod.isComplete
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-teal-600 text-white"
                      : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                  }`}>
                    {mod.number}
                  </span>

                  {/* Progress ring */}
                  {!mod.isComplete && mod.pct > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="25" fill="none" stroke="rgb(20 184 166 / 0.2)" strokeWidth="2.5" />
                      <circle
                        cx="28" cy="28" r="25" fill="none"
                        stroke="rgb(20 184 166)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={`${(mod.pct / 100) * 157} 157`}
                      />
                    </svg>
                  )}
                </button>

                {/* Module title - positioned to the side */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    pos.isLeftSide ? "left-[calc(100%+16px)]" : "right-[calc(100%+16px)]"
                  } whitespace-nowrap`}
                >
                  <p className={`text-[0.75rem] font-semibold ${
                    mod.isComplete ? "text-emerald-700 dark:text-emerald-400" : isCurrent ? "text-teal-700 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
                  }`}>
                    {mod.title}
                  </p>
                  <p className={`text-[0.625rem] ${
                    mod.isComplete ? "text-emerald-500 dark:text-emerald-500/70" : "text-slate-300 dark:text-slate-600"
                  }`}>
                    {mod.completed}/{mod.total} уроков
                    {mod.quizCount > 0 && <span className="text-muted-foreground/50"> &middot; {mod.quizCount} тест.</span>}
                  </p>
                </div>
              </motion.div>

              {/* Hover tooltip with details */}
              <AnimatePresence>
                {isHovered && !isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg border border-border/60 shadow-lg shadow-black/8 px-3 py-2 w-52 pointer-events-none"
                    style={{
                      left: `${pos.x}%`,
                      top: pos.y + 40,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <p className="text-[0.6875rem] font-semibold text-foreground truncate mb-1">{mod.title}</p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${mod.isComplete ? "bg-emerald-500" : "bg-teal-500"}`}
                          style={{ width: `${mod.pct}%` }}
                        />
                      </div>
                      <span className="text-[0.5625rem] text-muted-foreground tabular-nums">{mod.pct}%</span>
                    </div>
                    <div className="flex items-center gap-3 text-[0.5625rem] text-muted-foreground/70">
                      <span>{mod.total} уроков</span>
                      <span>{mod.quizCount} тестов</span>
                      <span>{mod.practiceCount} практик</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded lesson list */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-20 bg-white dark:bg-slate-800 rounded-xl border border-border/60 shadow-xl shadow-black/10 p-3 w-72"
                    style={{
                      left: `${pos.x}%`,
                      top: pos.y + 44,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.625rem] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">M{mod.number}</span>
                        <span className="text-[0.75rem] font-semibold text-foreground truncate">{mod.title}</span>
                      </div>
                      <span className="text-[0.5625rem] text-muted-foreground tabular-nums shrink-0">{mod.completed}/{mod.total}</span>
                    </div>
                    <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                      {mod.lessons.map(lesson => {
                        const done = completedLessons.has(lesson.id);
                        const hasQuiz = lesson.quiz && lesson.quiz.length > 0;
                        const hasPractice = lesson.practice && lesson.practice.length > 0;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              onSelectLesson(lesson.id);
                              setSelectedModule(null);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors group"
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              done ? "bg-emerald-500 text-white" : "border border-border/60"
                            }`}>
                              {done && <CheckCircle className="w-2.5 h-2.5" />}
                            </div>
                            <span className={`text-[0.75rem] truncate flex-1 ${
                              done ? "text-muted-foreground" : "text-foreground"
                            }`}>
                              {lesson.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {hasQuiz && <span className="text-[0.5rem] text-cyan-500">Q</span>}
                              {hasPractice && <span className="text-[0.5rem] text-emerald-500">P</span>}
                            </div>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-teal-500 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                    {mod.firstIncomplete && (
                      <button
                        onClick={() => {
                          onSelectLesson(mod.firstIncomplete!.id);
                          setSelectedModule(null);
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg text-[0.75rem] font-medium hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Продолжить
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
