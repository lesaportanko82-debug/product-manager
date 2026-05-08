import { useState, useMemo } from "react";
import { courseModules } from "./course-data";
import { BookOpen, Search, X, ChevronDown, ChevronRight, ArrowUpRight } from "lucide-react";

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
  lessonRefs: { lessonId: string; lessonTitle: string; moduleTitle: string }[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { term: "JTBD (Jobs To Be Done)", definition: "Фреймворк, описывающий «работу», которую клиент «нанимает» продукт выполнить. Фокус на потребности, а не на демографии.", category: "Фреймворки", lessonRefs: [] },
  { term: "Job Story", definition: "Формат описания потребности: When [ситуация], I want to [мотивация], so I can [ожидаемый результат].", category: "Фреймворки", lessonRefs: [] },
  { term: "PMF (Product-Market Fit)", definition: "Состояние, когда продукт решает реальную потребность сегмента настолько хорошо, что клиенты сами рекомендуют его и возвращаются.", category: "Метрики", lessonRefs: [] },
  { term: "MVP (Minimum Viable Product)", definition: "Минимально жизнеспособный продукт - версия с минимальным набором функций, достаточным для проверки гипотезы на реальных пользователях.", category: "Разработка", lessonRefs: [] },
  { term: "HADI-цикл", definition: "Hypothesis → Action → Data → Insights. Цикл проверки гипотез: сформулировать гипотезу, выполнить действие, собрать данные, извлечь инсайт.", category: "Фреймворки", lessonRefs: [] },
  { term: "OODA-цикл", definition: "Observe → Orient → Decide → Act. Цикл принятия решений из военной стратегии, адаптированный для продуктовой работы.", category: "Фреймворки", lessonRefs: [] },
  { term: "RICE", definition: "Reach × Impact × Confidence / Effort. Метод приоритизации фич и задач.", category: "Приоритизация", lessonRefs: [] },
  { term: "ICE", definition: "Impact × Confidence × Ease. Упрощённый метод приоритизации.", category: "Приоритизация", lessonRefs: [] },
  { term: "MoSCoW", definition: "Must have, Should have, Could have, Won't have. Метод категоризации требований по приоритету.", category: "Приоритизация", lessonRefs: [] },
  { term: "TAM / SAM / SOM", definition: "Total Addressable Market / Serviceable Addressable Market / Serviceable Obtainable Market. Три уровня оценки размера рынка.", category: "Стратегия", lessonRefs: [] },
  { term: "Transaction Cost (TC)", definition: "Совокупные затраты клиента (деньги, время, нервы) на выполнение работы. Продукт побеждает, если снижает TC относительно альтернатив.", category: "Экономика", lessonRefs: [] },
  { term: "Customer Obsession", definition: "Культурный принцип (Amazon и др.): все решения начинаются с клиента и идут в обратном направлении.", category: "Культура", lessonRefs: [] },
  { term: "Working Backwards", definition: "Процесс Amazon: начинать с пресс-релиза о готовом продукте и двигаться к разработке.", category: "Процессы", lessonRefs: [] },
  { term: "CustDev (Customer Development)", definition: "Методология Стива Бланка: систематический процесс поиска и валидации бизнес-модели через общение с клиентами.", category: "Исследования", lessonRefs: [] },
  { term: "SISP", definition: "Solution In Search of a Problem - антипаттерн, когда команда создаёт решение и потом ищет для него проблему.", category: "Антипаттерны", lessonRefs: [] },
  { term: "North Star Metric", definition: "Единственная ключевая метрика, которая лучше всего отражает ценность продукта для клиента.", category: "Метрики", lessonRefs: [] },
  { term: "Unit Economics", definition: "Экономика одной единицы: LTV (Lifetime Value), CAC (Customer Acquisition Cost), их соотношение.", category: "Экономика", lessonRefs: [] },
  { term: "LTV (Lifetime Value)", definition: "Пожизненная ценность клиента - суммарный доход, который приносит один клиент за всё время использования продукта.", category: "Метрики", lessonRefs: [] },
  { term: "CAC (Customer Acquisition Cost)", definition: "Стоимость привлечения одного клиента.", category: "Метрики", lessonRefs: [] },
  { term: "Retention", definition: "Удержание пользователей - процент клиентов, которые возвращаются к продукту через определённый период.", category: "Метрики", lessonRefs: [] },
  { term: "Churn Rate", definition: "Показатель оттока - процент клиентов, которые перестали использовать продукт за период.", category: "Метрики", lessonRefs: [] },
  { term: "A/B тест", definition: "Контролируемый эксперимент, где две группы пользователей видят разные версии продукта для сравнения эффективности.", category: "Эксперименты", lessonRefs: [] },
  { term: "OKR (Objectives & Key Results)", definition: "Система постановки целей: амбициозная цель (Objective) + 3-5 измеримых результатов (Key Results).", category: "Управление", lessonRefs: [] },
  { term: "Roadmap", definition: "Дорожная карта продукта - стратегический план развития с приоритизированными инициативами и временными рамками.", category: "Управление", lessonRefs: [] },
  { term: "User Story", definition: "Формат описания требований: As a [role], I want [feature], so that [benefit].", category: "Разработка", lessonRefs: [] },
  { term: "Sprint", definition: "Фиксированный временной отрезок (обычно 1-2 недели) в Scrum, в течение которого команда создаёт инкремент продукта.", category: "Процессы", lessonRefs: [] },
  { term: "Backlog", definition: "Приоритизированный список задач и фич, которые нужно реализовать.", category: "Процессы", lessonRefs: [] },
  { term: "Persona", definition: "Архетип целевого пользователя с описанием целей, болей, поведения и контекста.", category: "Исследования", lessonRefs: [] },
  { term: "Value Proposition", definition: "Ценностное предложение — описание того, какую ценность продукт создаёт для клиента и почему выбрать именно его.", category: "Стратегия", lessonRefs: [] },
  { term: "Pivot", definition: "Стратегический разворот - изменение направления развития продукта на основе полученных данных.", category: "Стратегия", lessonRefs: [] },
];

// Strip em-dashes from glossary definitions at load time
GLOSSARY_TERMS.forEach(t => { t.definition = t.definition.replace(/—/g, "-"); });

function enrichTerms(): GlossaryTerm[] {
  return GLOSSARY_TERMS.map(t => {
    const refs: GlossaryTerm["lessonRefs"] = [];
    const searchTerm = t.term.split("(")[0].trim().toLowerCase();
    const altTerms = t.term.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
    courseModules.forEach(module => {
      module.lessons.forEach(lesson => {
        const contentStr = lesson.content.join(" ").toLowerCase();
        const titleStr = lesson.title.toLowerCase();
        if (contentStr.includes(searchTerm) || titleStr.includes(searchTerm) ||
            (altTerms && (contentStr.includes(altTerms) || titleStr.includes(altTerms)))) {
          refs.push({ lessonId: lesson.id, lessonTitle: lesson.title, moduleTitle: module.title });
        }
      });
    });
    return { ...t, lessonRefs: refs };
  });
}

const CATEGORIES = [...new Set(GLOSSARY_TERMS.map(t => t.category))];

interface GlossaryProps {
  onSelectLesson: (lessonId: string) => void;
  onClose: () => void;
}

export function Glossary({ onSelectLesson, onClose }: GlossaryProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const enrichedTerms = useMemo(() => enrichTerms(), []);

  const filtered = useMemo(() => {
    let terms = enrichedTerms;
    if (selectedCategory) terms = terms.filter(t => t.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      terms = terms.filter(t => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
    }
    return terms.sort((a, b) => a.term.localeCompare(b.term, "ru"));
  }, [search, selectedCategory, enrichedTerms]);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <span className="text-[0.875rem] font-semibold">Глоссарий</span>
            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[0.6875rem] tabular-nums">
              {filtered.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Найти термин..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-card border border-border/40 rounded-xl text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 placeholder:text-muted-foreground/30 transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all ${
              !selectedCategory ? "bg-teal-500 text-white shadow-sm shadow-teal-100" : "bg-white dark:bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Все
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all ${
                selectedCategory === cat ? "bg-teal-500 text-white shadow-sm shadow-teal-100" : "bg-white dark:bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Terms */}
        <div className="space-y-2">
          {filtered.map(term => {
            const isExpanded = expandedTerm === term.term;
            return (
              <div key={term.term} className="bg-white dark:bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm shadow-black/[0.01] hover:border-border/60 transition-all">
                <button
                  onClick={() => setExpandedTerm(isExpanded ? null : term.term)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[0.875rem] font-semibold">{term.term}</span>
                      <span className="px-1.5 py-0.5 bg-muted text-muted-foreground/70 rounded text-[0.625rem] font-medium">
                        {term.category}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-[0.8125rem] text-muted-foreground/60 truncate">{term.definition}</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/30 shrink-0 ml-2" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 ml-2" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-[0.875rem] leading-relaxed text-foreground/80">{term.definition}</p>
                    {term.lessonRefs.length > 0 && (
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-[0.6875rem] text-muted-foreground/50 mb-2 uppercase tracking-wider font-medium">Упоминается в</p>
                        <div className="space-y-1">
                          {term.lessonRefs.slice(0, 5).map(ref => (
                            <button
                              key={ref.lessonId}
                              onClick={() => { onSelectLesson(ref.lessonId); onClose(); }}
                              className="w-full flex items-center gap-2 text-[0.8125rem] text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-2 py-1.5 rounded-lg transition-colors text-left group"
                            >
                              <ArrowUpRight className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" />
                              <span className="truncate">{ref.lessonTitle}</span>
                            </button>
                          ))}
                          {term.lessonRefs.length > 5 && (
                            <p className="text-[0.625rem] text-muted-foreground/40 pl-5">
                              +{term.lessonRefs.length - 5} уроков
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-8 h-8 text-muted-foreground/15 mx-auto mb-3" />
            <p className="text-[0.875rem] text-muted-foreground/40">Термин не найден</p>
          </div>
        )}
      </div>
    </div>
  );
}