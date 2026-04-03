import { motion } from "motion/react";
import { ArrowRight, BookOpen, Clock, Target, Lightbulb, CheckCircle2, Play } from "lucide-react";
import type { Module } from "./course-data";

interface ModuleIntroProps {
  module: Module;
  onStart: () => void;
  lessonCount: number;
}

// Extra "why" copy per module - falls back to module.description
const MODULE_WHY: Record<string, string> = {
  m1: "90% продуктов проваливаются не из-за плохого кода, а потому что решают не ту проблему. Этот модуль - фундамент: без него всё остальное строится на песке.",
  m2: "Клиент выбирает не лучший продукт, а тот, у которого ниже «цена» выбора и переключения. Понять это - значит перестать удивляться, почему «плохие» продукты побеждают «хорошие».",
  m3: "Компании тратят годы на продукты, которые никто не хотел. Проверка гипотез - это система, которая позволяет узнавать правду быстро и дёшево.",
  m4: "Каждая гипотеза о продукте несёт риск. Riskiest Assumption Test помогает найти самое слабое звено и проверить его первым - до того, как вложены месяцы работы.",
  m5: "OODA-цикл пришёл из военной авиации и стал одним из самых мощных инструментов стратегического мышления. Команды, которые думают быстрее конкурентов, побеждают.",
  m6: "Jobs To Be Done меняет угол зрения: не «кто наш клиент», а «какую работу он нанимает наш продукт выполнять». Это объясняет, почему люди покупают то, что покупают.",
  m7: "Интервью - главный инструмент PM. 80% инсайтов, которые меняют направление продукта, рождаются именно здесь. Научиться правильно задавать вопросы - критический скилл.",
  m8: "Большинство команд строят продукт для воображаемого клиента. Поиск сегмента - это процесс нахождения реального человека с реальной болью, который готов платить.",
  m9: "Разные виды интервью решают разные задачи. Экспертное, проблемное, решенческое - у каждого свой скрипт и своя цель. Знать когда и как использовать каждый - ключ к качественным данным.",
  m10: "Хорошее интервью начинается с хорошего респондента. Знать, где их искать - такой же важный навык, как умение их интервьюировать.",
  m11: "Проведение глубинного интервью - это искусство, которому можно научиться. Здесь разбираем структуру, техники и типичные ошибки, которые убивают качество данных.",
  m12: "ABCDX-сегментация и PMF-измерение дают ответ на самый важный вопрос продукта: нашли ли мы product/market fit или ещё нет?",
  m13: "Конверсия и возвращаемость - два самых важных метрика роста. Небольшое улучшение в них даёт экспоненциальный эффект на выручку.",
  m14: "5 пользователей в UX-тесте выявляют 85% проблем интерфейса. UX-тестирование - это быстрый способ спасти разработку от дорогих ошибок.",
  m15: "Приоритизация - одно из самых сложных и важных умений PM. Здесь изучаем фреймворки, которые делают этот процесс объективным и прозрачным.",
};

// Icons by module topic
const MODULE_ICONS: Record<string, string> = {
  m1: "💡", m2: "💰", m3: "🧠", m4: "⚠️", m5: "🔄",
  m6: "🎯", m7: "🎤", m8: "🔍", m9: "📋", m10: "👥",
  m11: "🎙️", m12: "📊", m13: "📈", m14: "🖥️", m15: "⚖️",
  m16: "🗺️", m17: "🚀", m18: "💎", m19: "🤝", m20: "🏗️",
  m21: "📐", m22: "🧪", m23: "🌱", m24: "🏆",
};

const LESSON_MINUTES = 5;

export function ModuleIntroScreen({ module, onStart, lessonCount }: ModuleIntroProps) {
  const emoji = MODULE_ICONS[module.id] || "📚";
  const whyCopy = MODULE_WHY[module.id] || module.description;
  const estimatedMin = lessonCount * LESSON_MINUTES;
  const estimatedHours = Math.floor(estimatedMin / 60);
  const estimatedMins = estimatedMin % 60;
  const timeStr = estimatedHours > 0
    ? `${estimatedHours}ч ${estimatedMins > 0 ? estimatedMins + "м" : ""}`
    : `${estimatedMins}м`;

  // Show first 4 lessons as preview
  const previewLessons = module.lessons.slice(0, 4);
  const hasMore = module.lessons.length > 4;

  return (
    <div className="flex-1 min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">

        {/* Module badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 border border-teal-200/60 dark:border-teal-700/40 text-teal-700 dark:text-teal-300 text-sm font-semibold">
            Модуль {module.number} из 24
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-border/30 overflow-hidden"
        >
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 px-6 pt-7 pb-8 overflow-hidden">
            {/* BG blob */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -left-4 bottom-0 w-20 h-20 rounded-full bg-black/10" />

            <div className="relative">
              <div className="text-5xl mb-3">{emoji}</div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1.5">
                {module.source}
              </p>
              <h1 className="text-white font-bold text-xl leading-tight mb-3">
                {module.title}
              </h1>
              <div className="flex items-center gap-3 text-white/70 text-xs">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {lessonCount} {lessonCount === 1 ? "урок" : lessonCount < 5 ? "урока" : "уроков"}
                </span>
                <span className="w-px h-3 bg-white/30" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{timeStr}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Why this module */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-sm font-semibold text-foreground">Зачем этот модуль?</span>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground leading-relaxed pl-8">
                {whyCopy}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/40" />

            {/* What you'll study */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-sm font-semibold text-foreground">Что изучишь</span>
              </div>
              <div className="space-y-2 pl-8">
                {previewLessons.map((lesson, i) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
                    className="flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-[0.8125rem] text-muted-foreground leading-snug">
                      {lesson.title}
                    </span>
                  </motion.div>
                ))}
                {hasMore && (
                  <p className="text-[0.75rem] text-muted-foreground/50 italic">
                    + ещё {module.lessons.length - 4} {module.lessons.length - 4 === 1 ? "урок" : "урока"}...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6 pt-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl
                bg-gradient-to-r from-teal-500 to-emerald-500
                hover:from-teal-600 hover:to-emerald-600
                text-white font-semibold text-base
                shadow-lg shadow-teal-500/25 transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              Начать модуль {module.number}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}