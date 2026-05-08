import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Trophy, BookOpen, Flame, Zap, Star, LogOut,
  CheckCircle2, Target, Award, GraduationCap, Lock,
  Moon, Sun, User, Mail, TrendingUp, BarChart3,
  Repeat, Clock, Shield
} from "lucide-react";
import { type AuthState } from "./auth-modal";
import { getLocalXP, getXPLevel } from "./interactive-progress";
import { getStreak } from "./gamification";
import { ALL_BADGES } from "./gamification";
import { courseModules } from "./course-data";

interface ProfileCabinetProps {
  authState: AuthState;
  completedLessons: Set<string>;
  examScore: number | null;
  bookmarks: Set<string>;
  onClose: () => void;
  onSignOut: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

type Tab = "progress" | "badges" | "settings";

function getBadgeContext(completedLessons: Set<string>, examScore: number | null) {
  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const xp = getLocalXP();
  const streak = getStreak();
  let quizzesPassed = 0;
  let notesCount = 0;
  let ratingsCount = 0;
  let interactiveCompleted = 0;
  let bookmarksCount = 0;
  try {
    const notes = JSON.parse(localStorage.getItem("course-notes") || "{}");
    notesCount = Object.values(notes).filter((v: any) => v?.trim()).length;
    const ratings = JSON.parse(localStorage.getItem("course-ratings") || "{}");
    ratingsCount = Object.keys(ratings).length;
    bookmarksCount = JSON.parse(localStorage.getItem("course-bookmarks") || "[]").length;
    const log = JSON.parse(localStorage.getItem("course-activity-log") || "{}");
    quizzesPassed = log.quizzesPassed || 0;
  } catch {}
  return {
    completedLessons,
    totalLessons,
    streak,
    quizzesPassed,
    examScore,
    bookmarksCount,
    notesCount,
    ratingsCount,
    xp,
    interactiveCompleted,
    simBestScore: 0,
    simScenariosCompleted: 0,
    capstonesCompleted: 0,
    commentsCount: 0,
  };
}

export function ProfileCabinet({
  authState,
  completedLessons,
  examScore,
  bookmarks,
  onClose,
  onSignOut,
  isDark,
  onToggleDark,
}: ProfileCabinetProps) {
  const [tab, setTab] = useState<Tab>("progress");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setXp(getLocalXP());
    setStreak(getStreak());
  }, []);

  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const completed = completedLessons.size;
  const pct = Math.round((completed / totalLessons) * 100);
  const level = getXPLevel(xp);

  const badgeCtx = getBadgeContext(completedLessons, examScore);
  const earnedBadges = ALL_BADGES.filter(b => b.condition(badgeCtx));
  const lockedBadges = ALL_BADGES.filter(b => !b.condition(badgeCtx));

  const displayName = authState.name || authState.email?.split("@")[0] || "Студент";
  const initials = displayName.slice(0, 2).toUpperCase();

  // Extract emoji and text from title like "Росток 🌱"
  const levelEmoji = level.title.split(" ").slice(-1)[0] || "🌱";
  const levelName = level.title.split(" ").slice(0, -1).join(" ") || level.title;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "progress", label: "Прогресс", icon: TrendingUp },
    { id: "badges", label: "Бейджи", icon: Trophy },
    { id: "settings", label: "Настройки", icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        className="relative w-full max-w-[420px] h-full bg-card border-l border-border flex flex-col shadow-2xl shadow-black/20 overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border/60 bg-gradient-to-br from-teal-600 via-emerald-700 to-cyan-700">
          <div className="flex items-start justify-between mb-4">
            <p className="text-white/70 text-[0.75rem] font-medium uppercase tracking-wider">Личный кабинет</p>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-white text-xl font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-lg leading-tight truncate">{displayName}</h2>
              {authState.email && (
                <p className="text-white/60 text-[0.75rem] truncate">{authState.email}</p>
              )}
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/15 rounded-full">
                <span className="text-[0.6875rem] text-white/80">{levelEmoji} {levelName}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Уроков", value: `${completed}/${totalLessons}`, icon: BookOpen },
              { label: "Каштаны 🌰", value: xp.toLocaleString(), icon: Zap },
              { label: "Streak", value: `${streak} 🔥`, icon: Flame },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-2.5 py-2 text-center">
                <div className="text-white font-bold text-[0.875rem]">{s.value}</div>
                <div className="text-white/60 text-[0.625rem] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-border/60 bg-card/80">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[0.8125rem] font-medium transition-all border-b-2 ${
                tab === t.id
                  ? "border-teal-500 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === "progress" && (
              <motion.div key="progress" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 space-y-4">

                {/* Overall progress */}
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/10 rounded-2xl p-4 border border-teal-100 dark:border-teal-800/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[0.8125rem] font-semibold text-foreground">Прогресс курса</span>
                    <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-white/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                    />
                  </div>
                  <p className="text-[0.75rem] text-muted-foreground mt-2">{completed} из {totalLessons} уроков завершено</p>
                </div>

                {/* XP & Level */}
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg">
                      {levelEmoji}
                    </div>
                    <div>
                      <p className="text-[0.8125rem] font-semibold text-foreground">{levelName}</p>
                      <p className="text-[0.75rem] text-muted-foreground">{xp} / {level.nextLevelXP} каштанов</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[0.6875rem] text-muted-foreground">Уровень</p>
                      <p className="text-lg font-bold text-amber-500">{level.level}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, level.progress * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                    />
                  </div>
                </div>

                {/* Exam */}
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${examScore !== null && examScore >= 60 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-700"}`}>
                      <Award className={`w-4 h-4 ${examScore !== null && examScore >= 60 ? "text-emerald-600" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-[0.8125rem] font-semibold text-foreground">Финальный экзамен</p>
                      <p className="text-[0.75rem] text-muted-foreground">
                        {examScore !== null ? `Лучший результат: ${examScore}%` : "Ещё не сдан"}
                      </p>
                    </div>
                    {examScore !== null && examScore >= 60 && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
                    )}
                  </div>
                </div>

                {/* Module breakdown */}
                <div>
                  <h3 className="text-[0.8125rem] font-semibold text-foreground mb-2">По модулям</h3>
                  <div className="space-y-2">
                    {courseModules.slice(0, 8).map(m => {
                      const done = m.lessons.filter(l => completedLessons.has(l.id)).length;
                      const total = m.lessons.length;
                      const p = Math.round((done / total) * 100);
                      return (
                        <div key={m.id} className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <span className="text-[0.5625rem] font-bold text-muted-foreground">{m.number}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[0.6875rem] text-foreground/70 truncate">{m.title}</span>
                              <span className="text-[0.625rem] text-muted-foreground ml-2 shrink-0">{done}/{total}</span>
                            </div>
                            <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${p === 100 ? "bg-emerald-500" : "bg-teal-400"}`}
                                style={{ width: `${p}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {courseModules.length > 8 && (
                      <p className="text-[0.6875rem] text-muted-foreground text-center">
                        + ещё {courseModules.length - 8} модулей
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "badges" && (
              <motion.div key="badges" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[0.8125rem] text-muted-foreground">
                    <span className="font-bold text-foreground text-base">{earnedBadges.length}</span> из {ALL_BADGES.length} получено
                  </p>
                  <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.round((earnedBadges.length / ALL_BADGES.length) * 100)}%` }}
                    />
                  </div>
                </div>

                {earnedBadges.length > 0 && (
                  <>
                    <h3 className="text-[0.75rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Получено</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {earnedBadges.map(b => (
                        <div key={b.id} className={`flex items-center gap-2.5 p-3 rounded-xl border border-border/50 ${b.bg}`}>
                          <div className={`w-8 h-8 rounded-lg ${b.bg} flex items-center justify-center shrink-0`}>
                            <b.icon className={`w-4 h-4 ${b.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[0.75rem] font-semibold text-foreground truncate">{b.title}</p>
                            <p className="text-[0.625rem] text-muted-foreground leading-tight">{b.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {lockedBadges.length > 0 && (
                  <>
                    <h3 className="text-[0.75rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ещё не получено</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {lockedBadges.map(b => (
                        <div key={b.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-border/30 bg-slate-50/50 dark:bg-slate-800/50 opacity-50">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[0.75rem] font-semibold text-foreground truncate">{b.title}</p>
                            <p className="text-[0.625rem] text-muted-foreground leading-tight">{b.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 space-y-3">

                {/* Account info */}
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                  <h3 className="text-[0.8125rem] font-semibold text-foreground">Аккаунт</h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[0.6875rem] text-muted-foreground">Имя</p>
                      <p className="text-[0.8125rem] font-medium text-foreground">{displayName}</p>
                    </div>
                  </div>
                  {authState.email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[0.6875rem] text-muted-foreground">Email</p>
                        <p className="text-[0.8125rem] font-medium text-foreground truncate">{authState.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appearance */}
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                  <h3 className="text-[0.8125rem] font-semibold text-foreground">Интерфейс</h3>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                    <div className="flex items-center gap-3">
                      {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-[0.8125rem] font-medium text-foreground">
                        {isDark ? "Тёмная тема" : "Светлая тема"}
                      </span>
                    </div>
                    <button
                      onClick={onToggleDark}
                      className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? "bg-teal-500" : "bg-slate-200 dark:bg-slate-600"}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Sync status */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[0.8125rem] font-medium text-emerald-700 dark:text-emerald-400">Синхронизация активна</span>
                  </div>
                  <p className="text-[0.75rem] text-emerald-600/70 dark:text-emerald-500/70 mt-1">
                    Прогресс автоматически сохраняется в облаке
                  </p>
                </div>

                {/* Sign out */}
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                    border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-[0.875rem]"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти из аккаунта
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}