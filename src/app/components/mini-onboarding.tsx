import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain, Trophy, Zap, ArrowRight, CheckCircle2,
  Target, Repeat, Bot, BookOpen, GraduationCap, Flame
} from "lucide-react";
import { OwlMascot, type OwlMood } from "./ai-assistant";

interface MiniOnboardingProps {
  name: string;
  onComplete: () => void;
}

type Step = {
  mood: OwlMood;
  title: (name: string) => string;
  subtitle: string;
  desc: string;
  features?: { icon: any; text: string; color: string; bg: string }[] | null;
  stats?: { value: string; label: string }[];
  wow?: boolean;
};

const STEPS: Step[] = [
  {
    mood: "happy",
    title: (name: string) => `Привет, ${name || "будущий PM"}!`,
    subtitle: "Добро пожаловать в PM Академию",
    desc: "Перед тобой полный курс по продакт-менеджменту — от основ до реальных кейсов. AI-коуч Ёжуня поможет разобраться с любым вопросом.",
    features: null,
  },
  {
    mood: "thinking",
    title: () => "Что тебя ждёт",
    subtitle: "24 модуля · 60+ уроков · AI-коуч · Сертификат",
    desc: "Практика, а не лекции. Каждый урок - конкретные фреймворки и задания для реального продакт-менеджера.",
    features: [
      { icon: Bot, text: "AI-Ёжуня отвечает на вопросы 24/7", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20" },
      { icon: Repeat, text: "Spaced repetition закрепляет знания", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
      { icon: Trophy, text: "Геймификация: бейджи и уровни", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
      { icon: Target, text: "Capstone-проекты с AI-фидбэком", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
      { icon: Brain, text: "Адаптивные тесты и квизы", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/20" },
      { icon: GraduationCap, text: "Сертификат по окончании курса", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
    ],
  },
  {
    mood: "surprised",
    wow: true,
    title: () => "А ты знал?",
    subtitle: "Один факт, который удивит",
    desc: "В среднем выпускники наших потоков ускоряют переход в PM-роль в 3 раза — а 84% находят первую работу в продакте в течение полугода после курса.",
    stats: [
      { value: "×3",  label: "быстрее в PM-роли" },
      { value: "84%", label: "трудоустройство" },
      { value: "60+", label: "практических уроков" },
    ],
  },
  {
    mood: "encouraging",
    title: () => "Готов стартовать?",
    subtitle: "Прогресс сохраняется автоматически в облаке",
    desc: "Учись в своём темпе. Возвращайся с любого устройства - курс всегда ждёт тебя с того места, где ты остановился.",
    features: null,
    stats: [
      { value: "4.8/5", label: "средняя оценка" },
      { value: "92%", label: "до сертификата" },
    ],
  },
];

export function MiniOnboarding({ name, onComplete }: MiniOnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const total = STEPS.length;

  // Guard: if step somehow goes out of bounds, bail out cleanly
  if (!current) {
    onComplete();
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50/40 to-slate-50 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900 flex flex-col items-center justify-center p-6">

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === step ? 32 : 12, opacity: i <= step ? 1 : 0.35 }}
            transition={{ duration: 0.3 }}
            className={`h-1.5 rounded-full ${i <= step ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[500px]"
        >
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-teal-500/10 dark:shadow-black/40 border border-border/40 overflow-hidden">

            {/* Colored top strip */}
            <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" style={{ width: `${((step + 1) / total) * 100}%`, transition: "width 0.4s ease" }} />

            <div className="p-8 sm:p-10 text-center">
              {/* Hedgehog mascot with mood */}
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 16, delay: 0.1 }}
                className={`mb-5 mx-auto flex items-center justify-center ${
                  current.wow
                    ? "w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/20 shadow-inner"
                    : ""
                }`}
                style={{ width: 112, height: 112 }}
              >
                <OwlMascot size={current.wow ? 100 : 96} mood={current.mood} animate />
              </motion.div>

              <h1 className="text-2xl sm:text-[1.625rem] font-bold text-foreground mb-2 leading-tight">
                {current.title(name)}
              </h1>
              <p className="text-[0.8125rem] font-semibold text-teal-600 dark:text-teal-400 mb-4">
                {current.subtitle}
              </p>
              <p className="text-[0.875rem] text-muted-foreground leading-relaxed mb-7">
                {current.desc}
              </p>

              {/* Features grid (step 2) */}
              {current.features && (
                <div className="grid grid-cols-2 gap-2.5 mb-7 text-left">
                  {current.features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl ${f.bg}`}
                    >
                      <f.icon className={`w-4 h-4 ${f.color} shrink-0`} />
                      <span className="text-[0.75rem] font-medium text-foreground/80 leading-tight">{f.text}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Stats */}
              {current.stats && (
                <div className={`grid gap-4 mb-7 ${current.stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {current.stats.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className={`text-center ${current.wow ? "p-3 rounded-xl bg-teal-50/60 dark:bg-teal-900/20 border border-teal-100/60 dark:border-teal-800/40" : ""}`}
                    >
                      <div className={`font-bold ${current.wow ? "text-2xl text-teal-700 dark:text-teal-300" : "text-xl text-foreground"}`}>{s.value}</div>
                      <div className="text-[0.6875rem] text-muted-foreground mt-0.5">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* CTA button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (isLast) onComplete();
                  else setStep(s => Math.min(s + 1, STEPS.length - 1));
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl
                  bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-[0.9375rem]
                  hover:from-teal-700 hover:to-emerald-700 transition-all
                  shadow-lg shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLast ? (
                  <><CheckCircle2 className="w-5 h-5" /> Начать обучение</>
                ) : (
                  <>Далее <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>

              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="mt-3 text-[0.75rem] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  ← Назад
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Step label */}
      <p className="mt-6 text-[0.75rem] text-muted-foreground/50">
        Шаг {step + 1} из {total}
      </p>
    </div>
  );
}