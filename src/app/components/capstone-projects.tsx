import { useState, useEffect, useCallback } from "react";
import { addLocalXP } from "./interactive-progress";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight, Trophy, Target, BarChart3, Rocket,
  CheckCircle2, ArrowRight, X,
  Briefcase, Calculator, Award
} from "lucide-react";

// ===== Project Definitions =====
interface CapstoneProject {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  afterModules: string;
  fields: { key: string; label: string; placeholder: string; rows: number }[];
  xpReward: number;
}

const CAPSTONE_PROJECTS: CapstoneProject[] = [
  {
    id: "cap-launch",
    title: "Запуск продукта",
    description: "Создайте Lean Canvas и план CustDev-исследования для нового продукта",
    icon: Rocket,
    color: "text-teal-600",
    bg: "bg-teal-50",
    afterModules: "Модули 1–3",
    fields: [
      { key: "problem", label: "Проблема", placeholder: "Какую проблему решает ваш продукт? Для какого сегмента? Как сегмент решает проблему сейчас?", rows: 3 },
      { key: "segment", label: "Целевой сегмент", placeholder: "Опишите целевой сегмент: кто эти люди, сколько их, какие у них характеристики?", rows: 3 },
      { key: "solution", label: "Решение (MVP)", placeholder: "Опишите MVP: какой минимальный продукт проверит вашу гипотезу? Что в него входит?", rows: 3 },
      { key: "custdev", label: "План CustDev", placeholder: "Сколько интервью, какие вопросы, как найдёте респондентов, какие гипотезы проверяете?", rows: 3 },
      { key: "metrics", label: "Метрики успеха", placeholder: "Как вы поймёте, что MVP успешен? Какие метрики будете отслеживать?", rows: 2 },
    ],
    xpReward: 50,
  },
  {
    id: "cap-metrics",
    title: "Метрики и рост",
    description: "Спроектируйте дашборд метрик и стратегию роста для существующего продукта",
    icon: BarChart3,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    afterModules: "Модули 4–6",
    fields: [
      { key: "product", label: "Продукт", placeholder: "Какой продукт анализируете? (реальный или вымышленный) Опишите его кратко.", rows: 2 },
      { key: "northStar", label: "North Star Metric", placeholder: "Какая одна ключевая метрика отражает ценность продукта? Почему именно она?", rows: 3 },
      { key: "dashboard", label: "Дашборд метрик", placeholder: "Опишите 5-7 ключевых метрик для дашборда. Для каждой: название, формула, целевое значение.", rows: 4 },
      { key: "growthStrategy", label: "Стратегия роста", placeholder: "Как будете растить North Star Metric? Опишите 3 рычага роста и конкретные эксперименты.", rows: 4 },
      { key: "experiment", label: "Первый эксперимент", placeholder: "Опишите первый HADI-цикл: гипотеза, действие, данные, выводы.", rows: 3 },
    ],
    xpReward: 50,
  },
  {
    id: "cap-prioritization",
    title: "Приоритизация",
    description: "Проведите RICE-скоринг бэклога и обоснуйте приоритеты",
    icon: Calculator,
    color: "text-amber-600",
    bg: "bg-amber-50",
    afterModules: "Модули 7–9",
    fields: [
      { key: "context", label: "Контекст продукта", placeholder: "Опишите продукт, стадию, команду и текущие цели.", rows: 2 },
      { key: "backlog", label: "Бэклог (5–7 фич)", placeholder: "Перечислите 5-7 фич/инициатив. Для каждой: название, краткое описание, кому помогает.", rows: 5 },
      { key: "rice", label: "RICE-скоринг", placeholder: "Для каждой фичи: Reach (охват), Impact (влияние), Confidence (уверенность), Effort (трудозатраты). Итоговый балл.", rows: 5 },
      { key: "roadmap", label: "Квартальный роадмап", placeholder: "На основе RICE-скоринга составьте роадмап на квартал. Объясните выбор и trade-offs.", rows: 4 },
      { key: "stakeholder", label: "Презентация стейкхолдерам", placeholder: "Как вы объясните приоритеты CEO/CTO? Какие аргументы используете?", rows: 3 },
    ],
    xpReward: 50,
  },
  {
    id: "cap-strategy",
    title: "PM-стратегия",
    description: "Создайте полный one-pager продукта — итоговый проект курса",
    icon: Trophy,
    color: "text-violet-600",
    bg: "bg-violet-50",
    afterModules: "Финальный проект",
    fields: [
      { key: "vision", label: "Видение продукта", placeholder: "Какое будущее создаёт ваш продукт? Как изменится жизнь пользователей?", rows: 3 },
      { key: "jtbd", label: "Job Stories (JTBD)", placeholder: "Опишите 2-3 Job Stories: When [ситуация], I want [мотивация], So that [ожидаемый результат].", rows: 4 },
      { key: "competitive", label: "Конкурентный анализ", placeholder: "Кто конкуренты? В чём ваше unfair advantage? Позиционирование.", rows: 3 },
      { key: "gtm", label: "Go-to-Market стратегия", placeholder: "Каналы привлечения, ценообразование, партнёрства, первые 1000 пользователей.", rows: 4 },
      { key: "metrics", label: "Метрики и KPI", placeholder: "North Star Metric, ключевые input-метрики, целевые значения на 3-6-12 месяцев.", rows: 3 },
      { key: "risks", label: "Риски и митигация", placeholder: "Топ-3 риска и план их митигации.", rows: 3 },
    ],
    xpReward: 100,
  },
];

// ===== Local storage helpers =====
const STORAGE_KEY = "capstone-results";

function loadResults(): Record<string, { fields: Record<string, string>; completedAt: string }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveResult(projectId: string, fields: Record<string, string>) {
  try {
    const all = loadResults();
    all[projectId] = { fields, completedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

// ===== Main Capstone Component =====
export function CapstoneProjectsView({ onClose }: { onClose: () => void }) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState(loadResults);

  const project = CAPSTONE_PROJECTS.find(p => p.id === selectedProject);

  if (project) {
    return (
      <CapstoneEditor
        project={project}
        savedResult={savedResults[project.id]}
        onBack={() => {
          setSavedResults(loadResults());
          setSelectedProject(null);
        }}
      />
    );
  }

  const completedCount = CAPSTONE_PROJECTS.filter(p => savedResults[p.id]).length;
  const totalXP = CAPSTONE_PROJECTS.reduce((sum, p) => sum + (savedResults[p.id] ? p.xpReward : 0), 0);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Назад
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-[0.75rem] font-medium mb-4 dark:bg-violet-900/30 dark:text-violet-400">
              <Briefcase className="w-3 h-3" />
              Capstone Projects
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Проектные работы</h1>
            <p className="text-[0.875rem] text-muted-foreground max-w-md mx-auto">
              Создайте реальные PM-артефакты. Заполните все поля и отметьте проект как завершённый.
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        {completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-6 mb-8 p-4 rounded-2xl bg-card border border-border/40"
          >
            <div className="text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{completedCount}/{CAPSTONE_PROJECTS.length}</p>
              <p className="text-[0.6875rem] text-muted-foreground">Проектов</p>
            </div>
            <div className="w-px h-8 bg-border/30" />
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600 tabular-nums">🌰 {totalXP}</p>
              <p className="text-[0.6875rem] text-muted-foreground">Каштанов</p>
            </div>
          </motion.div>
        )}

        {/* Project Cards */}
        <div className="space-y-3">
          {CAPSTONE_PROJECTS.map((proj, i) => {
            const Icon = proj.icon;
            const isCompleted = !!savedResults[proj.id];

            return (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setSelectedProject(proj.id)}
                  className="w-full text-left rounded-2xl border p-5 transition-all group bg-card border-border/40 hover:border-teal-200 hover:shadow-sm dark:hover:border-teal-700"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl ${proj.bg} flex items-center justify-center shrink-0 dark:bg-opacity-20`}>
                      <Icon className={`w-5 h-5 ${proj.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">{proj.afterModules}</span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[0.5625rem] font-semibold flex items-center gap-1 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Завершён
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[0.5625rem] text-amber-600 font-medium dark:text-amber-400">
                            🌰 +{proj.xpReward}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[0.9375rem] font-semibold mb-1">{proj.title}</h3>
                      <p className="text-[0.75rem] text-muted-foreground/60 leading-relaxed">{proj.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== Project Editor =====
function CapstoneEditor({ project, savedResult, onBack }: {
  project: CapstoneProject;
  savedResult?: { fields: Record<string, string>; completedAt: string };
  onBack: () => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (savedResult?.fields) return savedResult.fields;
    try {
      const saved = localStorage.getItem(`capstone-draft-${project.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [completed, setCompleted] = useState(!!savedResult);
  const [xpToast, setXpToast] = useState<number | null>(null);

  const Icon = project.icon;

  // Auto-save draft to localStorage
  useEffect(() => {
    try { localStorage.setItem(`capstone-draft-${project.id}`, JSON.stringify(fields)); } catch {}
  }, [fields, project.id]);

  // Hide XP toast
  useEffect(() => {
    if (xpToast !== null) {
      const t = setTimeout(() => setXpToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [xpToast]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleComplete = useCallback(() => {
    saveResult(project.id, fields);
    setCompleted(true);

    // Award XP only on first completion
    if (!savedResult) {
      addLocalXP(project.xpReward);
      setXpToast(project.xpReward);
    }
  }, [fields, project, savedResult]);

  const filledCount = project.fields.filter(f => (fields[f.key] || "").trim().length > 10).length;
  const totalFields = project.fields.length;
  const progressPct = Math.round((filledCount / totalFields) * 100);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10 relative">
        {/* XP Toast */}
        <AnimatePresence>
          {xpToast !== null && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 dark:from-amber-900/40 dark:to-yellow-900/30 dark:border-amber-700"
            >
              <span className="text-xl">🌰</span>
              <div>
                <p className="text-[0.8125rem] font-bold text-amber-800 dark:text-amber-300">+{xpToast} каштанов!</p>
                <p className="text-[0.625rem] text-amber-600/60 dark:text-amber-400/60">За проектную работу</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Все проекты
          </button>
        </div>

        {/* Project Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${project.bg} flex items-center justify-center dark:bg-opacity-20`}>
              <Icon className={`w-5 h-5 ${project.color}`} />
            </div>
            <div>
              <span className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">{project.afterModules}</span>
              <h1 className="text-xl font-bold tracking-tight">{project.title}</h1>
            </div>
          </div>
          <p className="text-[0.875rem] text-muted-foreground leading-relaxed">{project.description}</p>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
              <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[0.6875rem] text-muted-foreground/50 tabular-nums">{filledCount}/{totalFields} полей</span>
          </div>
        </motion.div>

        {/* Completed banner */}
        {completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-800/30 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-emerald-800 dark:text-emerald-300">Проект завершён</p>
                <p className="text-[0.75rem] text-emerald-600/60 dark:text-emerald-400/60">Вы можете продолжить редактирование в любой момент</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Fields */}
        <div className="space-y-5 mb-8">
          {project.fields.map((field, i) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <label className="block mb-2">
                <span className="text-[0.8125rem] font-semibold">{field.label}</span>
                {(fields[field.key] || "").length > 0 && (
                  <span className="text-[0.625rem] text-muted-foreground/30 ml-2 tabular-nums">
                    {(fields[field.key] || "").length} символов
                  </span>
                )}
              </label>
              <textarea
                value={fields[field.key] || ""}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows}
                className="w-full px-4 py-3 bg-card border border-border/40 rounded-xl text-[0.8125rem] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-300 placeholder:text-muted-foreground/25 transition-all dark:bg-slate-800/80"
              />
            </motion.div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleComplete}
            disabled={filledCount < 3}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
              completed
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100 dark:shadow-emerald-900/30"
                : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-teal-100 dark:shadow-teal-900/30"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {completed ? "Завершён" : "Оценить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Portfolio Mini Widget (for WelcomeView) =====
export function CapstonePortfolioWidget({ onOpen }: { onOpen: () => void }) {
  const results = loadResults();
  const completedProjects = CAPSTONE_PROJECTS.filter(p => results[p.id]);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-border/40 p-5 bg-gradient-to-br from-violet-50/40 via-white to-teal-50/30 hover:border-violet-200 hover:shadow-sm transition-all group mb-6 dark:from-violet-900/10 dark:via-slate-800/80 dark:to-teal-900/10 dark:border-violet-800/30"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 dark:bg-violet-900/40">
          <Briefcase className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[0.875rem] font-semibold">Проектные работы</h3>
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[0.6875rem] font-bold tabular-nums dark:bg-violet-900/30 dark:text-violet-400">
              {completedProjects.length}/{CAPSTONE_PROJECTS.length}
            </span>
          </div>
          <p className="text-[0.75rem] text-muted-foreground/60">
            {completedProjects.length === 0
              ? "Создавайте PM-артефакты для портфолио"
              : `Завершено ${completedProjects.length} из ${CAPSTONE_PROJECTS.length} проектов`
            }
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
      {completedProjects.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 bg-violet-100 rounded-full overflow-hidden dark:bg-violet-900/30">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${(completedProjects.length / CAPSTONE_PROJECTS.length) * 100}%` }}
            />
          </div>
          <span className="text-[0.625rem] text-muted-foreground/30 tabular-nums">
            {Math.round((completedProjects.length / CAPSTONE_PROJECTS.length) * 100)}%
          </span>
        </div>
      )}
    </button>
  );
}
