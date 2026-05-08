import { useState, useEffect } from "react";
import { courseModules } from "./course-data";
import {
  Trophy, Star, Flame, Zap, BookOpen, Award, Target,
  GraduationCap, Crown, Rocket, Shield, Heart,
  ChevronDown, ChevronRight, Sparkles, Lock, Brain,
  Calculator, GitBranch, PenLine, TrendingUp, Gamepad2
} from "lucide-react";
import { getLocalXP, getTotalCompletedBlocks, getXPLevel } from "./interactive-progress";

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  condition: (ctx: BadgeContext) => boolean;
}

interface BadgeContext {
  completedLessons: Set<string>;
  totalLessons: number;
  streak: number;
  quizzesPassed: number;
  examScore: number | null;
  bookmarksCount: number;
  notesCount: number;
  ratingsCount: number;
  xp: number;
  interactiveCompleted: number;
  simBestScore: number;
  simScenariosCompleted: number;
  capstonesCompleted: number;
  commentsCount: number;
}

export const ALL_BADGES: Badge[] = [
  { id: "first-step", title: "Первый шаг", description: "Завершить первый урок", icon: Rocket, color: "text-teal-600", bg: "bg-teal-50", condition: (ctx) => ctx.completedLessons.size >= 1 },
  { id: "five-done", title: "Разгон", description: "Завершить 5 уроков", icon: Zap, color: "text-amber-600", bg: "bg-amber-50", condition: (ctx) => ctx.completedLessons.size >= 5 },
  { id: "ten-done", title: "Десятка", description: "Завершить 10 уроков", icon: Star, color: "text-amber-600", bg: "bg-amber-50", condition: (ctx) => ctx.completedLessons.size >= 10 },
  { id: "twenty-done", title: "Двадцатка", description: "Завершить 20 уроков", icon: Award, color: "text-teal-700", bg: "bg-teal-50", condition: (ctx) => ctx.completedLessons.size >= 20 },
  { id: "half-course", title: "Экватор", description: "Пройти 50% курса", icon: Target, color: "text-teal-600", bg: "bg-teal-50", condition: (ctx) => ctx.completedLessons.size >= ctx.totalLessons * 0.5 },
  { id: "full-course", title: "Выпускник", description: "Пройти весь курс", icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50", condition: (ctx) => ctx.completedLessons.size >= ctx.totalLessons },
  { id: "first-module", title: "Модуль пройден", description: "Полностью завершить любой модуль", icon: BookOpen, color: "text-teal-600", bg: "bg-teal-50", condition: (ctx) => courseModules.some(m => m.lessons.every(l => ctx.completedLessons.has(l.id))) },
  { id: "three-modules", title: "Три модуля", description: "Завершить 3 модуля полностью", icon: Shield, color: "text-cyan-600", bg: "bg-cyan-50", condition: (ctx) => courseModules.filter(m => m.lessons.every(l => ctx.completedLessons.has(l.id))).length >= 3 },
  { id: "five-modules", title: "Пять модулей", description: "Завершить 5 модулей полностью", icon: Crown, color: "text-teal-700", bg: "bg-teal-50", condition: (ctx) => courseModules.filter(m => m.lessons.every(l => ctx.completedLessons.has(l.id))).length >= 5 },
  { id: "streak-3", title: "3 дня подряд", description: "Заниматься 3 дня подряд", icon: Flame, color: "text-orange-600", bg: "bg-orange-50", condition: (ctx) => ctx.streak >= 3 },
  { id: "streak-7", title: "Неделя огня", description: "Заниматься 7 дней подряд", icon: Flame, color: "text-red-600", bg: "bg-red-50", condition: (ctx) => ctx.streak >= 7 },
  { id: "exam-pass", title: "Сдал экзамен", description: "Сдать финальный экзамен (60%+)", icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-50", condition: (ctx) => ctx.examScore !== null && ctx.examScore >= 60 },
  { id: "exam-excellent", title: "Отличник", description: "Сдать экзамен на 90%+", icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50", condition: (ctx) => ctx.examScore !== null && ctx.examScore >= 90 },
  { id: "bookworm", title: "Книгочей", description: "Добавить 5 уроков в закладки", icon: Heart, color: "text-pink-600", bg: "bg-pink-50", condition: (ctx) => ctx.bookmarksCount >= 5 },
  { id: "note-taker", title: "Конспектист", description: "Оставить заметки к 5 урокам", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", condition: (ctx) => ctx.notesCount >= 5 },
  // Chestnut (🌰) & Interactive badges
  { id: "xp-first", title: "Первый каштан", description: "Собрать первые 10 🌰", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50", condition: (ctx) => ctx.xp >= 10 },
  { id: "xp-100", title: "Сотня каштанов", description: "Собрать 100 🌰", icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50", condition: (ctx) => ctx.xp >= 100 },
  { id: "xp-500", title: "Полкорзины", description: "Собрать 500 🌰", icon: Brain, color: "text-violet-600", bg: "bg-violet-50", condition: (ctx) => ctx.xp >= 500 },
  { id: "xp-1000", title: "Полная корзина", description: "Собрать 1000 🌰", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", condition: (ctx) => ctx.xp >= 1000 },
  { id: "interactive-5", title: "Практик", description: "Выполнить 5 интерактивных заданий", icon: PenLine, color: "text-indigo-600", bg: "bg-indigo-50", condition: (ctx) => ctx.interactiveCompleted >= 5 },
  { id: "interactive-20", title: "Мастер практики", description: "Выполнить 20 интерактивных заданий", icon: GitBranch, color: "text-violet-600", bg: "bg-violet-50", condition: (ctx) => ctx.interactiveCompleted >= 20 },
  { id: "interactive-50", title: "Решатель", description: "Выполнить 50 интерактивных заданий", icon: Calculator, color: "text-emerald-600", bg: "bg-emerald-50", condition: (ctx) => ctx.interactiveCompleted >= 50 },
  // Capstone badges
  { id: "capstone-first", title: "Первый проект", description: "Завершить первый capstone-проект", icon: PenLine, color: "text-violet-600", bg: "bg-violet-50", condition: (ctx) => ctx.capstonesCompleted >= 1 },
  { id: "capstone-all", title: "Портфолио PM", description: "Завершить все 4 capstone-проекта", icon: Award, color: "text-violet-700", bg: "bg-violet-50", condition: (ctx) => ctx.capstonesCompleted >= 4 },
  // Peer learning badges
  { id: "peer-helper", title: "Помощник", description: "Оставить 5 комментариев к урокам", icon: GitBranch, color: "text-cyan-600", bg: "bg-cyan-50", condition: (ctx) => ctx.commentsCount >= 5 },
  // Simulator badges
  { id: "sim-complete", title: "Симулятор пройден", description: "Завершить любой сценарий симулятора", icon: Gamepad2, color: "text-teal-600", bg: "bg-teal-50", condition: (ctx) => ctx.simScenariosCompleted >= 1 },
  { id: "sim-pro", title: "PM-профи", description: "Набрать 80%+ в симуляторе", icon: Award, color: "text-indigo-600", bg: "bg-indigo-50", condition: (ctx) => ctx.simBestScore >= 80 },
  { id: "sim-expert", title: "PM-эксперт", description: "Набрать 90%+ в симуляторе", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50", condition: (ctx) => ctx.simBestScore >= 90 },
  { id: "sim-all", title: "Мультисценарист", description: "Пройти все 4 сценария симулятора", icon: Crown, color: "text-violet-600", bg: "bg-violet-50", condition: (ctx) => ctx.simScenariosCompleted >= 4 },
];

export function getStreak(): number {
  try {
    const log = JSON.parse(localStorage.getItem("course-activity-log") || "[]") as string[];
    if (log.length === 0) return 0;
    const uniqueDays = [...new Set(log)].sort().reverse();
    const today = new Date().toISOString().slice(0, 10);
    if (uniqueDays[0] !== today && uniqueDays[0] !== getPreviousDay(today)) return 0;
    let streak = 1;
    for (let i = 0; i < uniqueDays.length - 1; i++) {
      if (uniqueDays[i + 1] === getPreviousDay(uniqueDays[i])) streak++;
      else break;
    }
    return streak;
  } catch { return 0; }
}

function getPreviousDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function logActivity() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const log = JSON.parse(localStorage.getItem("course-activity-log") || "[]") as string[];
    if (!log.includes(today)) {
      log.push(today);
      localStorage.setItem("course-activity-log", JSON.stringify(log));
    }
  } catch {}
}

export function getEarnedBadges(ctx: BadgeContext): Badge[] {
  return ALL_BADGES.filter(b => b.condition(ctx));
}

function getSimStats(): { simBestScore: number; simScenariosCompleted: number } {
  try {
    const data = JSON.parse(localStorage.getItem("sim-results") || "{}");
    const scores = Object.values(data) as number[];
    return {
      simBestScore: scores.length > 0 ? Math.max(...scores) : 0,
      simScenariosCompleted: scores.length,
    };
  } catch {
    return { simBestScore: 0, simScenariosCompleted: 0 };
  }
}

function getCapstoneStats(): { capstonesCompleted: number } {
  try {
    const results = JSON.parse(localStorage.getItem("capstone-results") || "{}");
    return { capstonesCompleted: Object.keys(results).length };
  } catch {
    return { capstonesCompleted: 0 };
  }
}

function getCommentCount(): number {
  try {
    return Number(localStorage.getItem("user-comments-count") || "0");
  } catch { return 0; }
}

export function BadgesPanel({ completedLessons, examScore }: { completedLessons: Set<string>; examScore: number | null }) {
  const [expanded, setExpanded] = useState(false);
  const [xp, setXp] = useState(() => getLocalXP());
  const [interactiveCompleted, setInteractiveCompleted] = useState(() => getTotalCompletedBlocks());
  const [previousBadgeIds, setPreviousBadgeIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("earned-badge-ids");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  // Refresh XP periodically (when user interacts with tasks)
  useEffect(() => {
    const interval = setInterval(() => {
      setXp(getLocalXP());
      setInteractiveCompleted(getTotalCompletedBlocks());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const streak = getStreak();
  const bookmarks = (() => { try { return JSON.parse(localStorage.getItem("course-bookmarks") || "[]").length; } catch { return 0; } })();
  const notes = (() => {
    try {
      const n = JSON.parse(localStorage.getItem("course-notes") || "{}") as Record<string, string>;
      return Object.values(n).filter(v => v?.trim()).length;
    } catch { return 0; }
  })();

  const ctx: BadgeContext = {
    completedLessons, totalLessons, streak, quizzesPassed: 0,
    examScore, bookmarksCount: bookmarks, notesCount: notes, ratingsCount: 0,
    xp, interactiveCompleted,
    ...getSimStats(),
    ...getCapstoneStats(),
    commentsCount: getCommentCount(),
  };

  const earned = getEarnedBadges(ctx);
  const locked = ALL_BADGES.filter(b => !earned.includes(b));
  const levelInfo = getXPLevel(xp);

  // Detect new badges and trigger Совунья celebration
  useEffect(() => {
    const currentBadgeIds = new Set(earned.map(b => b.id));
    const newBadges = earned.filter(b => !previousBadgeIds.has(b.id));
    
    if (newBadges.length > 0) {
      // Trigger mascot celebration for the first new badge
      // Update stored badge IDs
      setPreviousBadgeIds(currentBadgeIds);
      try {
        localStorage.setItem("earned-badge-ids", JSON.stringify([...currentBadgeIds]));
      } catch {}
    }
  }, [earned, previousBadgeIds]);

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm shadow-black/[0.02]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4.5 h-4.5 text-amber-500" />
          <span className="text-[0.875rem] font-semibold">Достижения</span>
          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[0.6875rem] font-bold tabular-nums">
            {earned.length}/{ALL_BADGES.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {xp > 0 && (
            <span className="flex items-center gap-1 text-[0.75rem] text-amber-600 font-semibold">
              🌰 {xp}
            </span>
          )}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[0.75rem] text-orange-600 font-medium">
              <Flame className="w-3.5 h-3.5" />{streak}d
            </span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/30" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/30" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {/* Chestnut Level Bar */}
          {xp > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-100/60">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <span className="text-sm leading-none">🌰</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-800">{levelInfo.title}</p>
                    <p className="text-[0.625rem] text-amber-500">{xp} / {levelInfo.nextLevelXP} 🌰</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[0.625rem] text-amber-500">{interactiveCompleted} заданий</p>
                </div>
              </div>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {earned.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.6875rem] text-muted-foreground/60 mb-2.5 uppercase tracking-widest font-medium">Получены</p>
              <div className="grid grid-cols-5 gap-2">
                {earned.map(b => {
                  const Icon = b.icon;
                  return (
                    <div key={b.id} className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-muted/30 transition-colors cursor-default" title={b.description}>
                      <div className={`w-9 h-9 rounded-xl ${b.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${b.color}`} />
                      </div>
                      <span className="text-[0.5625rem] text-center font-medium leading-tight">{b.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {locked.length > 0 && (
            <div>
              <p className="text-[0.6875rem] text-muted-foreground/40 mb-2.5 uppercase tracking-widest font-medium">Заблокированы</p>
              <div className="grid grid-cols-5 gap-2">
                {locked.map(b => {
                  const Icon = b.icon;
                  return (
                    <div key={b.id} className="flex flex-col items-center gap-1.5 py-2 rounded-xl opacity-30 cursor-default" title={b.description}>
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center relative">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <Lock className="w-2.5 h-2.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <span className="text-[0.5625rem] text-center font-medium leading-tight text-muted-foreground">{b.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}