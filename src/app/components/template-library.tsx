import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, Download, Save, X, ChevronRight, Target,
  BarChart3, Users, Map, Layers, CheckCircle2, Zap, Grid3x3
} from "lucide-react";

interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  rows?: number;
  type?: "text" | "textarea" | "list";
}

interface Template {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  fields: TemplateField[];
  instructions: string;
}

const TEMPLATES: Template[] = [
  {
    id: "lean-canvas",
    title: "Lean Canvas",
    description: "Одностраничный бизнес-план для стартапа",
    icon: Grid3x3, color: "text-teal-600", bg: "bg-teal-50",
    instructions: "Заполните каждую ячейку Lean Canvas. Начните с проблемы и сегмента, затем переходите к решению.",
    fields: [
      { key: "problem", label: "Проблема (Top 3)", placeholder: "1. Основная проблема\n2. Вторая проблема\n3. Третья проблема", rows: 3, type: "textarea" },
      { key: "segments", label: "Сегменты клиентов", placeholder: "Кто ваши ранние пользователи? Опишите ICP.", rows: 2, type: "textarea" },
      { key: "uvp", label: "Уникальное ценностное предложение", placeholder: "Одно предложение: почему вы другие и стоите внимания", rows: 2, type: "textarea" },
      { key: "solution", label: "Решение", placeholder: "Как вы решаете каждую из проблем?", rows: 3, type: "textarea" },
      { key: "channels", label: "Каналы", placeholder: "Как вы достигнете клиентов? (SEO, реферал, PR...)", rows: 2, type: "textarea" },
      { key: "revenue", label: "Потоки доходов", placeholder: "Подписка, транзакция, freemium...", rows: 2, type: "textarea" },
      { key: "costs", label: "Структура расходов", placeholder: "Основные статьи расходов", rows: 2, type: "textarea" },
      { key: "metrics", label: "Ключевые метрики", placeholder: "Activation, Retention, Revenue...", rows: 2, type: "textarea" },
      { key: "advantage", label: "Нечестное преимущество", placeholder: "Что нельзя легко скопировать или купить?", rows: 2, type: "textarea" },
    ],
  },
  {
    id: "prd",
    title: "PRD (Product Requirements Document)",
    description: "Документ требований к продукту",
    icon: FileText, color: "text-violet-600", bg: "bg-violet-50",
    instructions: "Опишите фичу или продукт максимально конкретно. PRD — основной документ для команды разработки.",
    fields: [
      { key: "title", label: "Название фичи/продукта", placeholder: "Краткое название", type: "text" },
      { key: "problem", label: "Проблема", placeholder: "Какую проблему пользователя решаем?", rows: 3, type: "textarea" },
      { key: "goals", label: "Цели и метрики успеха", placeholder: "Чего хотим достичь? Как измерим?", rows: 3, type: "textarea" },
      { key: "userStories", label: "User Stories", placeholder: "Как [пользователь], я хочу [действие], чтобы [результат]", rows: 4, type: "textarea" },
      { key: "scope", label: "Scope (что входит / не входит)", placeholder: "IN: ...\nOUT: ...", rows: 3, type: "textarea" },
      { key: "design", label: "Дизайн / UX flow", placeholder: "Описание основных экранов и flow", rows: 3, type: "textarea" },
      { key: "technical", label: "Технические требования", placeholder: "API, интеграции, ограничения", rows: 2, type: "textarea" },
      { key: "timeline", label: "Timeline и milestones", placeholder: "Фазы, дедлайны, зависимости", rows: 2, type: "textarea" },
      { key: "risks", label: "Риски и mitigation", placeholder: "Что может пойти не так?", rows: 2, type: "textarea" },
    ],
  },
  {
    id: "rice",
    title: "RICE-приоритизация",
    description: "Матрица приоритизации фичей по Reach, Impact, Confidence, Effort",
    icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50",
    instructions: "Перечислите фичи и оцените каждую: Reach (сколько пользователей за период), Impact (0.25–3), Confidence (50–100%), Effort (в человеко-неделях). Score = R × I × C / E.",
    fields: [
      { key: "feature1", label: "Фича 1", placeholder: "Название | R: | I: | C: | E: | Score:", rows: 1, type: "textarea" },
      { key: "feature2", label: "Фича 2", placeholder: "Название | R: | I: | C: | E: | Score:", rows: 1, type: "textarea" },
      { key: "feature3", label: "Фича 3", placeholder: "Название | R: | I: | C: | E: | Score:", rows: 1, type: "textarea" },
      { key: "feature4", label: "Фича 4", placeholder: "Название | R: | I: | C: | E: | Score:", rows: 1, type: "textarea" },
      { key: "feature5", label: "Фича 5", placeholder: "Название | R: | I: | C: | E: | Score:", rows: 1, type: "textarea" },
      { key: "decision", label: "Итоговое решение", placeholder: "Какие фичи берём в спринт и почему?", rows: 3, type: "textarea" },
    ],
  },
  {
    id: "cjm",
    title: "Customer Journey Map",
    description: "Карта пути клиента по этапам взаимодействия",
    icon: Map, color: "text-emerald-600", bg: "bg-emerald-50",
    instructions: "Опишите путь пользователя по этапам: от осознания потребности до retention. Для каждого этапа — действия, мысли, эмоции, боли, возможности.",
    fields: [
      { key: "persona", label: "Персона", placeholder: "Имя, возраст, роль, контекст", rows: 2, type: "textarea" },
      { key: "awareness", label: "Этап 1: Осознание", placeholder: "Действия | Мысли | Эмоции | Боли | Возможности", rows: 3, type: "textarea" },
      { key: "consideration", label: "Этап 2: Рассмотрение", placeholder: "Действия | Мысли | Эмоции | Боли | Возможности", rows: 3, type: "textarea" },
      { key: "acquisition", label: "Этап 3: Приобретение / Регистрация", placeholder: "Действия | Мысли | Эмоции | Боли | Возможности", rows: 3, type: "textarea" },
      { key: "activation", label: "Этап 4: Активация (Aha-moment)", placeholder: "Действия | Мысли | Эмоции | Боли | Возможности", rows: 3, type: "textarea" },
      { key: "retention", label: "Этап 5: Retention", placeholder: "Действия | Мысли | Эмоции | Боли | Возможности", rows: 3, type: "textarea" },
      { key: "referral", label: "Этап 6: Referral / Advocacy", placeholder: "Действия | Мысли | Эмоции | Боли | Возможности", rows: 3, type: "textarea" },
    ],
  },
  {
    id: "okr",
    title: "OKR (Objectives & Key Results)",
    description: "Цели и ключевые результаты на квартал",
    icon: Target, color: "text-amber-600", bg: "bg-amber-50",
    instructions: "Сформулируйте 2-3 Objectives (вдохновляющие, качественные) и по 3-4 Key Results (измеримые, с конкретными числами) для каждого.",
    fields: [
      { key: "objective1", label: "Objective 1", placeholder: "Вдохновляющая цель (качественная)", type: "text" },
      { key: "kr1_1", label: "KR 1.1", placeholder: "Увеличить X с Y до Z", type: "text" },
      { key: "kr1_2", label: "KR 1.2", placeholder: "Достичь N% по метрике M", type: "text" },
      { key: "kr1_3", label: "KR 1.3", placeholder: "Запустить фичу F к дате D", type: "text" },
      { key: "objective2", label: "Objective 2", placeholder: "Вторая вдохновляющая цель", type: "text" },
      { key: "kr2_1", label: "KR 2.1", placeholder: "Измеримый результат", type: "text" },
      { key: "kr2_2", label: "KR 2.2", placeholder: "Измеримый результат", type: "text" },
      { key: "kr2_3", label: "KR 2.3", placeholder: "Измеримый результат", type: "text" },
    ],
  },
  {
    id: "competitive",
    title: "Competitive Analysis",
    description: "Анализ конкурентов и позиционирование",
    icon: Users, color: "text-pink-600", bg: "bg-pink-50",
    instructions: "Проанализируйте 3-4 конкурентов. Для каждого: их сильные/слабые стороны, ценообразование, позиционирование, и ваши преимущества.",
    fields: [
      { key: "market", label: "Рынок и категория", placeholder: "В какой категории вы конкурируете?", type: "text" },
      { key: "comp1", label: "Конкурент 1", placeholder: "Название | Сильные стороны | Слабые стороны | Цена", rows: 2, type: "textarea" },
      { key: "comp2", label: "Конкурент 2", placeholder: "Название | Сильные стороны | Слабые стороны | Цена", rows: 2, type: "textarea" },
      { key: "comp3", label: "Конкурент 3", placeholder: "Название | Сильные стороны | Слабые стороны | Цена", rows: 2, type: "textarea" },
      { key: "positioning", label: "Ваше позиционирование", placeholder: "Чем вы отличаетесь от всех?", rows: 3, type: "textarea" },
      { key: "moat", label: "Конкурентный барьер (moat)", placeholder: "Что защищает от копирования?", rows: 2, type: "textarea" },
    ],
  },
];

const LS_KEY = "template-library";

function loadTemplates(): Record<string, Record<string, string>> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveTemplates(data: Record<string, Record<string, string>>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function TemplateLibrary({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const allSaved = loadTemplates();

  const openTemplate = (t: Template) => {
    const existing = allSaved[t.id] || {};
    setFields(existing);
    setSelected(t);
    setSaved(false);
  };

  const handleSave = useCallback(() => {
    if (!selected) return;
    const data = loadTemplates();
    data[selected.id] = fields;
    saveTemplates(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [selected, fields]);

  const handleExport = useCallback(() => {
    if (!selected) return;
    let text = `# ${selected.title}\n\n`;
    selected.fields.forEach(f => {
      text += `## ${f.label}\n${fields[f.key] || "(не заполнено)"}\n\n`;
    });
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selected, fields]);

  if (!selected) {
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
        <div className="max-w-[720px] mx-auto px-6 py-10">
          <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
            <X className="w-4 h-4" /> Закрыть
          </button>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full text-[0.75rem] font-medium mb-4">
              <Layers className="w-3 h-3" /> Библиотека шаблонов
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">PM Шаблоны и артефакты</h1>
            <p className="text-[0.875rem] text-muted-foreground">Заполняйте, сохраняйте и экспортируйте профессиональные PM-документы</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              const hasSaved = !!allSaved[t.id] && Object.values(allSaved[t.id]).some(v => v.trim());
              return (
                <button key={t.id} onClick={() => openTemplate(t)} className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border/40 hover:border-teal-200 hover:shadow-sm transition-all text-left group dark:hover:border-teal-800">
                  <div className={`w-9 h-9 rounded-xl ${t.bg} dark:bg-opacity-20 flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${t.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.8125rem] font-semibold">{t.title}</p>
                      {hasSaved && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <p className="text-[0.6875rem] text-muted-foreground/60 mt-0.5">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const Icon = selected.icon;
  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Назад к шаблонам
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-xl ${selected.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${selected.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{selected.title}</h2>
            <p className="text-[0.75rem] text-muted-foreground">{selected.instructions}</p>
          </div>
        </div>
        <div className="space-y-4 mt-6">
          {selected.fields.map(f => (
            <div key={f.key}>
              <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">{f.label}</label>
              {f.type === "text" ? (
                <input
                  type="text"
                  value={fields[f.key] || ""}
                  onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3.5 py-2.5 bg-card rounded-xl border border-border/40 text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 dark:bg-slate-800 dark:border-slate-700"
                />
              ) : (
                <textarea
                  value={fields[f.key] || ""}
                  onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={f.rows || 3}
                  className="w-full px-3.5 py-2.5 bg-card rounded-xl border border-border/40 text-[0.8125rem] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 dark:bg-slate-800 dark:border-slate-700"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-6 sticky bottom-4">
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-emerald-600 transition-all">
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Сохранено!</> : <><Save className="w-4 h-4" /> Сохранить</>}
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 bg-card border border-border/40 rounded-xl text-[0.8125rem] font-medium hover:bg-muted/50 transition-colors">
            <Download className="w-4 h-4" /> Export .md
          </button>
        </div>
      </div>
    </div>
  );
}
