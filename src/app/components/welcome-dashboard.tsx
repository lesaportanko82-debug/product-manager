import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Play, ArrowRight, Zap, Brain, BookOpen, CheckCircle2,
  Clock, BarChart3, FlaskConical, TrendingUp, Monitor,
} from "lucide-react";
import { courseModules, getAllLessons } from "./course-data";

interface WelcomeDashboardProps {
  name: string;
  completedLessons: Set<string>;
  examScore: number | null;
  onStartLesson: (lessonId: string) => void;
  onOpenDiagnostic: () => void;
}

const LESSON_MINUTES = 5; // avg minutes per lesson

export function WelcomeDashboard({
  name,
  completedLessons,
  examScore,
  onStartLesson,
  onOpenDiagnostic,
}: WelcomeDashboardProps) {
  const allLessons = getAllLessons();
  const totalLessons = allLessons.length;
  const totalModules = courseModules.length;
  const totalTests = allLessons.filter(l => l.lesson.quiz && l.lesson.quiz.length > 0).length;
  const totalPractice = allLessons.filter(l => l.lesson.practice && l.lesson.practice.length > 0).length;

  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const remaining = totalLessons - completedCount;
  const remainingMinutes = remaining * LESSON_MINUTES;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  const remainingStr = remainingHours > 0 ? `~${remainingHours}ч ${remainingMins}м` : `~${remainingMins}м`;

  // Find next unfinished lesson
  const firstLesson = allLessons[0];
  const nextLesson = allLessons.find(l => !completedLessons.has(l.lesson.id)) || firstLesson;
  const isResume = completedCount > 0;

  const displayName = name || "студент";

  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(progressPct), 200);
    return () => clearTimeout(t);
  }, [progressPct]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* ── Desktop recommendation banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-700/40"
        >
          <Monitor className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-amber-800 dark:text-amber-300 leading-relaxed">
            Для максимального комфорта рекомендуем проходить курс с компьютера или ноутбука — так вам будет удобнее работать с материалами и выполнять задания.
          </p>
        </motion.div>

        {/* ── Badge ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 border border-teal-200/60 dark:border-teal-700/40 text-teal-700 dark:text-teal-300 text-sm font-medium">
            <Zap className="w-3.5 h-3.5" />
            {totalModules} модулей · {totalLessons} уроков
          </div>
        </motion.div>

        {/* ── Greeting ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.07 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
            Привет,&nbsp;{displayName}!
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Добро пожаловать в курс по продакт-менеджменту -<br />
            с тестами, практикой и финальным экзаменом
          </p>
        </motion.div>

        {/* ── Determine level FIRST — primary CTA ── */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenDiagnostic}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-3
            bg-violet-600 hover:bg-violet-700
            text-white shadow-lg shadow-violet-500/25 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-medium text-white/70 mb-0.5">Рекомендуем начать с</p>
            <p className="text-base font-semibold text-white leading-tight">
              Проверить свой уровень
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-white/60">17 кейсов</p>
            <ArrowRight className="w-4 h-4 text-white/60 ml-auto mt-0.5" />
          </div>
        </motion.button>

        {/* ── CTA: Start / Resume ── */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.21 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartLesson(nextLesson.lesson.id)}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-3
            bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600
            text-white shadow-lg shadow-teal-500/25 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-medium text-white/70 mb-0.5">
              {isResume ? "Продолжить обучение" : "Приступить к первому уроку"}
            </p>
            <p className="text-base font-semibold text-white leading-tight truncate">
              {nextLesson.lesson.title}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 shrink-0" />
        </motion.button>

        {/* ── Progress card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="w-full rounded-2xl p-5 mb-3"
          style={{ background: "linear-gradient(135deg, #0f4c4c 0%, #0d3d3d 50%, #0a2e2e 100%)" }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-teal-300/70 font-medium mb-1">Ваш прогресс</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white tabular-nums">{progressPct}</span>
                <span className="text-xl font-semibold text-white/60">%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white/80">
                {completedCount} из {totalLessons}
              </p>
              <p className="text-xs text-teal-300/60 flex items-center gap-1 justify-end mt-0.5">
                <Clock className="w-3 h-3" />
                Осталось {remainingStr}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #2dd4bf, #34d399)" }}
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { value: totalModules, label: "Модулей", icon: <BookOpen className="w-3.5 h-3.5" />, color: "text-teal-300" },
              { value: totalLessons, label: "Уроков", icon: <BarChart3 className="w-3.5 h-3.5" />, color: "text-teal-300" },
              { value: totalTests, label: "Тестов", icon: <Brain className="w-3.5 h-3.5" />, color: "text-teal-300" },
              { value: completedCount, label: "Пройдено", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: completedCount > 0 ? "text-emerald-400" : "text-white/40" },
              { value: totalPractice, label: "Практика", icon: <FlaskConical className="w-3.5 h-3.5" />, color: "text-amber-400" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className={`flex justify-center mb-1 ${stat.color} opacity-70`}>{stat.icon}</div>
                <p className={`text-lg font-bold leading-none mb-0.5 ${stat.label === "Пройдено" && completedCount === 0 ? "text-white/40" : stat.label === "Практика" ? "text-amber-400" : "text-white"}`}>
                  {stat.value}
                </p>
                <p className="text-[0.6rem] text-white/40 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Exam score if completed */}
          {examScore !== null && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-teal-300/60">Финальный экзамен</span>
              <span className={`text-sm font-bold ${examScore >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                {examScore}% {examScore >= 80 ? "🏆" : "📝"}
              </span>
            </div>
          )}
        </motion.div>

        {/* Skip link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center mt-5"
        >
          <button
            onClick={() => onStartLesson(nextLesson.lesson.id)}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-2"
          >
            Пропустить и перейти к курсу →
          </button>
        </motion.div>

      </div>
    </div>
  );
}