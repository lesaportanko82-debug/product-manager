import { useState, useEffect, useCallback } from "react";
import { courseModules, getAllLessons } from "./course-data";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain, ChevronRight, Target, Zap, BarChart3,
  Users, MessageSquare, Lightbulb, TrendingUp, CheckCircle2,
  ArrowRight, RotateCcw, Sparkles, Star, Award
} from "lucide-react";

// ===== Diagnostic Quiz Data =====
interface DiagnosticQuestion {
  id: string;
  area: PMArea;
  question: string;
  options: { text: string; score: number }[];
}

type PMArea = "discovery" | "strategy" | "metrics" | "execution" | "communication" | "growth" | "analytics";

const PM_AREAS: Record<PMArea, { label: string; icon: React.ElementType; color: string; bg: string; modules: string[] }> = {
  discovery: { label: "Customer Discovery", icon: Users, color: "text-teal-600", bg: "bg-teal-50", modules: ["m1", "m2", "m6", "m7", "m9", "m10", "m11"] },
  strategy: { label: "Стратегия продукта", icon: Target, color: "text-violet-600", bg: "bg-violet-50", modules: ["m3", "m4", "m8", "m16", "m-network"] },
  metrics: { label: "Метрики и аналитика", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50", modules: ["m5", "m12", "m13", "m17", "m-data"] },
  execution: { label: "Выполнение и приоритизация", icon: Zap, color: "text-amber-600", bg: "bg-amber-50", modules: ["m15", "m18", "m18b", "m18c", "m-sim", "m-aiml"] },
  communication: { label: "Коммуникация и лидерство", icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-50", modules: ["m19", "m18d", "m21", "m22"] },
  growth: { label: "Рост продукта", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", modules: ["m13", "m14", "m20", "m-growth"] },
  analytics: { label: "Продуктовый анализ", icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50", modules: ["m5", "m12", "m17", "m16", "m-data"] },
};

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ===== DISCOVERY (3 вопроса) =====
  {
    id: "dq1", area: "discovery",
    question: "Вы запускаете продукт в новой нише. После 15 CustDev-интервью 80% респондентов говорят, что проблема существует, но только 20% готовы за решение платить. Ваши действия?",
    options: [
      { text: "Строим MVP и запускаем — проблема подтверждена, а платить начнут, когда увидят работающий продукт и поймут ценность на практике", score: 1 },
      { text: "Проводим дополнительную серию интервью с расширенной выборкой, пока не найдём достаточный сегмент, готовый платить", score: 2 },
      { text: "Сегментируем тех 20%: ищем паттерны, уточняем ICP, переформулируем ценностное предложение под них", score: 4 },
      { text: "Пивотим — если willingness to pay низкая, проблема недостаточно болезненна для монетизации", score: 3 },
    ],
  },
  {
    id: "dq2", area: "discovery",
    question: "B2B-продукт: конечные пользователи (операторы), их менеджеры (ЛПР) и IT-отдел (интегрирует). У кого CustDev в первую очередь?",
    options: [
      { text: "У IT — без технического одобрения не пройдём, даже если бизнес-ценность очевидна всем остальным стейкхолдерам", score: 1 },
      { text: "У конечных пользователей — они ежедневно сталкиваются с проблемой и могут описать боли в деталях", score: 2 },
      { text: "У всех трёх параллельно — у каждого свои JTBD, и они могут конфликтовать", score: 4 },
      { text: "У менеджеров — они контролируют бюджет и принимают финальное решение о внедрении продукта", score: 3 },
    ],
  },
  {
    id: "dq3", area: "discovery",
    question: "NPS продукта = 45 (хороший), но churn растёт 3 месяца. Как интерпретируете?",
    options: [
      { text: "NPS хороший — значит, проблема в маркетинге: привлекаем нецелевую аудиторию, которая потом отваливается", score: 3 },
      { text: "NPS — лаговый индикатор. Смотрим churn по когортам, сопоставляем с activation и составом новых пользователей", score: 4 },
      { text: "Парадокс. Опрашиваем уходящих — узнаём, почему они уходят, несмотря на, казалось бы, хороший продукт", score: 1 },
      { text: "NPS ненадёжен, нужно перейти на CSAT или CES для более точного измерения удовлетворённости и выявления проблем", score: 2 },
    ],
  },
  // ===== STRATEGY (3 вопроса) =====
  {
    id: "dq4", area: "strategy",
    question: "CEO просит добавить AI-фичу: «все конкуренты делают». Данных о потребности пользователей нет. Ваш подход?",
    options: [
      { text: "Отказываем — без данных нельзя добавлять фичи. Предлагаем CEO сначала собрать обратную связь от пользователей через опрос", score: 2 },
      { text: "Формулируем гипотезу о Job, проектируем дешёвый тест, готовим CEO обоснование с opportunity cost", score: 4 },
      { text: "Добавляем в роадмап — CEO лучше видит стратегическую картину и рыночные тренды", score: 1 },
      { text: "Проводим исследование: опрос пользователей, анализ use cases конкурентов, оценка технической сложности и ресурсов", score: 3 },
    ],
  },
  {
    id: "dq5", area: "strategy",
    question: "Маркетплейс с PMF на стороне покупателей, но продавцы уходят из-за комиссии. Конкурент предлагает на 40% дешевле. Что делаете?",
    options: [
      { text: "Анализируем unit-экономику, тестируем разные тарифные планы через A/B, ищем оптимальную точку между retention продавцов и прибыльностью", score: 3 },
      { text: "Строим switching costs: инструменты для продавцов, которые конкурент не скопирует снижением комиссии", score: 4 },
      { text: "Снижаем комиссию — удержание supply-стороны маркетплейса критично, без продавцов покупатели тоже уйдут", score: 1 },
      { text: "Вводим тарифную сетку: крупным продавцам — пониженная комиссия, мелким — стандартная", score: 2 },
    ],
  },
  {
    id: "dq6", area: "strategy",
    question: "Собеседование. Вопрос: «Как определяете, когда продукт нужно убить?»",
    options: [
      { text: "Когда retention не выходит на плато, гипотезы исчерпаны, и opportunity cost превышает upside", score: 4 },
      { text: "Когда ключевые метрики — DAU, revenue, engagement — устойчиво падают три и более месяцев подряд без признаков восстановления", score: 1 },
      { text: "Когда CAC стабильно превышает LTV, retention ниже бенчмарка и тренд отрицательный", score: 3 },
      { text: "Когда пользователи массово жалуются, рост остановился и команда теряет мотивацию работать над продуктом", score: 2 },
    ],
  },
  // ===== METRICS (3 вопроса) =====
  {
    id: "dq7", area: "metrics",
    question: "Запустили фичу: DAU +15%, но ARPU −8%. Оценка?",
    options: [
      { text: "Считаем чистый Revenue: если +15% DAU при −8% ARPU даёт общий рост выручки, значит фича работает и можно масштабировать", score: 2 },
      { text: "Сегментируем: ARPU старых vs новых отдельно, retention по когортам, изменения в воронке монетизации", score: 4 },
      { text: "Успех — DAU вырос, значит фича нужна. Revenue нормализуется по мере того, как новые пользователи освоят продукт", score: 1 },
      { text: "Сравниваем LTV новых пользователей с LTV старых, чтобы понять, не привлекаем ли менее ценную аудиторию", score: 3 },
    ],
  },
  {
    id: "dq8", area: "metrics",
    question: "SaaS для малого бизнеса. Выбор North Star Metric?",
    options: [
      { text: "NRR — учитывает churn и expansion, показывая здоровье базы без учёта привлечения новых клиентов", score: 3 },
      { text: "Core actions в неделю на платящего пользователя", score: 4 },
      { text: "Количество активных подписок — отражает масштаб базы и показывает, скольким компаниям мы реально нужны", score: 1 },
      { text: "MRR — прямой показатель финансового здоровья, на который ориентируются инвесторы", score: 2 },
    ],
  },
  {
    id: "dq9", area: "metrics",
    question: "A/B тест: конверсия регистрации +12%, p=0.03. Запускаете?",
    options: [
      { text: "Запускаем на половину трафика и наблюдаем ещё неделю — нужна дополнительная уверенность перед полным раскатом", score: 1 },
      { text: "Проверяем downstream: novelty effect, activation, retention, Simpson's paradox по сегментам", score: 4 },
      { text: "Да — p < 0.05, результат статистически значимый, нет оснований откладывать", score: 2 },
      { text: "Оцениваем практическую значимость: +12% от базы 2% даёт 2.24% — стоит ли инженерных усилий на поддержку?", score: 3 },
    ],
  },
  // ===== EXECUTION (2 вопроса) =====
  {
    id: "dq10", area: "execution",
    question: "Бэклог из 30+ фич. Sales, support и engineering тянут в разные стороны. Как приоритизируете?",
    options: [
      { text: "Выделяем стратегические темы из целей компании, маппим фичи на них", score: 4 },
      { text: "Применяем RICE-скоринг: расставляем баллы по каждой фиче, сортируем по итоговому score и берём сверху", score: 2 },
      { text: "Собираем всех стейкхолдеров, каждый аргументирует приоритетность своих запросов, голосуем и ищем компромисс", score: 1 },
      { text: "Делим на категории: must-have от клиентов, growth-гипотезы из данных, tech debt от инженеров — берём из каждой", score: 3 },
    ],
  },
  {
    id: "dq11", area: "execution",
    question: "2 из 4 разработчиков увольняются за неделю до дедлайна. Действия?",
    options: [
      { text: "Просим оставшихся поработать сверхурочно, параллельно ищем замену через HR и подключаем рекрутинг", score: 1 },
      { text: "Предлагаем стейкхолдерам 2-3 варианта (scope / deadline / quality) с рисками каждого", score: 4 },
      { text: "Пересматриваем scope: вырезаем nice-to-have, оставляем MVP-ядро, корректируем дедлайн", score: 3 },
      { text: "Эскалируем руководству — это risk-level решение, нужны дополнительные ресурсы или пересмотр приоритетов", score: 2 },
    ],
  },
  // ===== COMMUNICATION (2 вопроса) =====
  {
    id: "dq12", area: "communication",
    question: "CPO хочет фичу А, вы считаете фича Б даст больше impact. Данные неоднозначны. Как действуете?",
    options: [
      { text: "Показываем trade-offs, формулируем disagreement. Если CPO настаивает — disagree and commit с метриками проверки", score: 4 },
      { text: "Готовим детальную презентацию с данными, графиками и прогнозами в пользу фичи Б, чтобы убедить CPO", score: 2 },
      { text: "Предлагаем дешёвый эксперимент — протестировать обе гипотезы, прежде чем коммитить ресурсы на полную разработку", score: 3 },
      { text: "Делаем фичу А — у CPO больше контекста о стратегии, рынке и приоритетах компании", score: 1 },
    ],
  },
  {
    id: "dq13", area: "communication",
    question: "Разработчик: «Ваша спецификация — мусор, я не буду это делать». Реакция?",
    options: [
      { text: "Объясняем бизнес-контекст, почему задача важна, какие метрики она двигает и какие пользовательские проблемы решает", score: 3 },
      { text: "Один на один: «Что конкретно не так? Какие ограничения я упустил?»", score: 4 },
      { text: "Эскалируем на тимлида — это неприемлемый тон общения, нарушающий командные нормы коммуникации", score: 1 },
      { text: "Переписываем спецификацию, учитывая его экспертизу — разработчик, вероятно, видит технические проблемы", score: 2 },
    ],
  },
  // ===== GROWTH (2 вопроса) =====
  {
    id: "dq14", area: "growth",
    question: "Retention: D1=40%, D7=15%, D30=5%. На чём фокус?",
    options: [
      { text: "Привлекаем больше пользователей на входе — при большем объёме абсолютные цифры retention будут достаточными", score: 2 },
      { text: "Проверяем, есть ли плато: если кривая не выравнивается — нет PMF, оптимизации роста преждевременны", score: 4 },
      { text: "D30 — самая критичная точка: 95% потеряны, максимальный потенциал возврата инвестиций в улучшения", score: 1 },
      { text: "D1→D7: самое большое падение, улучшаем onboarding, ускоряем Aha-moment в первую неделю", score: 3 },
    ],
  },
  {
    id: "dq15", area: "growth",
    question: "PLG-продукт растёт 5% MoM органически. CEO хочет 20%. Что предлагаете?",
    options: [
      { text: "Декомпозируем: acquisition × activation × retention × referral. Находим рычаг с максимальным compound effect", score: 4 },
      { text: "Увеличиваем бюджет на performance-маркетинг, расширяем каналы привлечения, тестируем новые креативы и аудитории", score: 1 },
      { text: "Ищем viral loops: реферальная программа, sharing-механики, встроенные network effects", score: 3 },
      { text: "Запускаем промо-кампании, временные скидки и бонусы за привлечение друзей", score: 2 },
    ],
  },
  // ===== ANALYTICS (2 вопроса) =====
  {
    id: "dq16", area: "analytics",
    question: "Аналитик показывает: пользователи фичи X в первые 3 дня имеют retention на 60% выше. Вывод?",
    options: [
      { text: "Делаем фичу X обязательным шагом для всех новых пользователей — если она повышает retention, все должны через неё пройти", score: 1 },
      { text: "Направляем всех в фичу X через onboarding — это наш Aha-moment, который нужно усилить", score: 2 },
      { text: "Дизайним рандомизированный эксперимент с nudge к фиче X, проверяя confounders", score: 4 },
      { text: "Корреляция ≠ причинность: мотивированные пользователи и фичу используют, и retention у них выше независимо от неё", score: 3 },
    ],
  },
  {
    id: "dq17", area: "analytics",
    question: "70% не завершают onboarding (5 шагов). Аналитика только на вход и выход. Первый шаг?",
    options: [
      { text: "Трекинг воронки по шагам + записи сессий: смотрим не только «где», но «почему»", score: 4 },
      { text: "Сокращаем до 2 шагов — это очевидное решение: меньше шагов = меньше точек отвала = выше конверсия", score: 1 },
      { text: "Настраиваем аналитику на каждый шаг, находим шаг с максимальным drop-off, оптимизируем его", score: 3 },
      { text: "Делаем onboarding необязательным, чтобы не блокировать доступ к продукту и дать пользователям свободу", score: 2 },
    ],
  },
];

type PMLevel = "junior" | "middle" | "senior";

interface DiagnosticResult {
  level: PMLevel;
  totalScore: number;
  maxScore: number;
  areaScores: Record<PMArea, number>;
  weakAreas: PMArea[];
  strongAreas: PMArea[];
  completedAt: string;
}

// ===== Storage =====
const LS_KEY = "adaptive-learning-profile";

export function getAdaptiveProfile(): DiagnosticResult | null {
  try {
    const data = localStorage.getItem(LS_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveAdaptiveProfile(profile: DiagnosticResult) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
  } catch {}
}

export function clearAdaptiveProfile() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ===== Dynamic PM Level =====
// 30% initial assessment + 40% lesson progress + 30% exam
export interface DynamicLevel {
  level: PMLevel;
  score: number;               // 0–100 composite
  initialLevel: PMLevel | null; // from assessment
  currentLevel: PMLevel;       // dynamic
  changed: boolean;
  label: string;
  color: string;
  bg: string;
}

export function computeDynamicPMLevel(
  completedLessons: number,
  totalLessons: number,
  examScore: number | null  // 0-100
): DynamicLevel {
  const profile = getAdaptiveProfile();

  // 30% — initial assessment (0–100)
  const assessPct = profile
    ? Math.round((profile.totalScore / profile.maxScore) * 100)
    : 0;
  const assessWeight = profile ? 0.30 : 0;

  // 40% — lesson progress (0–100)
  const lessonPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const lessonWeight = 0.40;

  // 30% — exam (0–100)
  const examPct = examScore ?? 0;
  const examWeight = examScore !== null ? 0.30 : 0;

  // Redistribute unused weights to lessons if parts are missing
  const totalWeight = assessWeight + lessonWeight + examWeight;
  const composite = totalWeight > 0
    ? Math.round((assessPct * assessWeight + lessonPct * lessonWeight + examPct * examWeight) / totalWeight)
    : 0;

  const level: PMLevel = composite >= 70 ? "senior" : composite >= 40 ? "middle" : "junior";
  const initialLevel = profile
    ? (profile.totalScore / profile.maxScore >= 0.85 ? "senior" : profile.totalScore / profile.maxScore >= 0.55 ? "middle" : "junior")
    : null;

  const labels: Record<PMLevel, string> = { junior: "Junior PM", middle: "Middle PM", senior: "Senior PM" };
  const colors: Record<PMLevel, string> = { junior: "text-emerald-700 dark:text-emerald-400", middle: "text-teal-700 dark:text-teal-400", senior: "text-violet-700 dark:text-violet-400" };
  const bgs: Record<PMLevel, string> = { junior: "bg-emerald-50 dark:bg-emerald-900/30", middle: "bg-teal-50 dark:bg-teal-900/30", senior: "bg-violet-50 dark:bg-violet-900/30" };

  return {
    level,
    score: composite,
    initialLevel,
    currentLevel: level,
    changed: initialLevel !== null && initialLevel !== level,
    label: labels[level],
    color: colors[level],
    bg: bgs[level],
  };
}

// ===== Diagnostic Quiz Component =====

// Deterministic shuffle based on question id — stable order per question but unpredictable
function shuffleOptions(options: { text: string; score: number }[], seed: string) {
  const hash = Array.from(seed).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.abs((hash * (i + 1) * 2654435761) >> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function DiagnosticQuiz({ onComplete }: { onComplete: (result: DiagnosticResult) => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const question = DIAGNOSTIC_QUESTIONS[currentQ];
  const totalQuestions = DIAGNOSTIC_QUESTIONS.length;
  const progress = Math.round(((currentQ + (answers[question?.id] !== undefined ? 1 : 0)) / totalQuestions) * 100);

  const handleAnswer = useCallback((score: number) => {
    const q = DIAGNOSTIC_QUESTIONS[currentQ];
    setAnswers(prev => ({ ...prev, [q.id]: score }));

    if (currentQ < totalQuestions - 1) {
      setTimeout(() => setCurrentQ(prev => prev + 1), 300);
    } else {
      // Calculate results
      setTimeout(() => {
        const allAnswers = { ...answers, [q.id]: score };
        const areaScores: Record<PMArea, number> = {} as any;
        const areaCounts: Record<PMArea, number> = {} as any;

        for (const dq of DIAGNOSTIC_QUESTIONS) {
          if (!areaScores[dq.area]) { areaScores[dq.area] = 0; areaCounts[dq.area] = 0; }
          areaScores[dq.area] += allAnswers[dq.id] || 0;
          areaCounts[dq.area] += 1;
        }

        // Normalize scores (0-4 per question → percentage)
        for (const area of Object.keys(areaScores) as PMArea[]) {
          areaScores[area] = Math.round((areaScores[area] / (areaCounts[area] * 4)) * 100);
        }

        const totalScore = Object.values(allAnswers).reduce((a, b) => a + b, 0);
        const maxScore = totalQuestions * 4;
        const pct = totalScore / maxScore;

        const level: PMLevel = pct >= 0.85 ? "senior" : pct >= 0.55 ? "middle" : "junior";

        const sortedAreas = (Object.entries(areaScores) as [PMArea, number][])
          .sort((a, b) => a[1] - b[1]);

        const weakAreas = sortedAreas.filter(([, score]) => score < 70).map(([area]) => area).slice(0, 3);
        const strongAreas = sortedAreas.filter(([, score]) => score >= 75).map(([area]) => area).reverse().slice(0, 3);

        const diagResult: DiagnosticResult = {
          level,
          totalScore,
          maxScore,
          areaScores,
          weakAreas,
          strongAreas,
          completedAt: new Date().toISOString(),
        };

        setResult(diagResult);
        setShowResult(true);
        saveAdaptiveProfile(diagResult);
      }, 400);
    }
  }, [currentQ, answers, totalQuestions]);

  const handleComplete = useCallback(() => {
    if (result) onComplete(result);
  }, [result, onComplete]);

  if (showResult && result) {
    return <DiagnosticResultView result={result} onContinue={handleComplete} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-[0.75rem] font-medium mb-4">
          <Brain className="w-3 h-3" />
          Диагностический тест
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Определим ваш уровень</h2>
        <p className="text-[0.875rem] text-muted-foreground">
          Ответьте на {totalQuestions} вопросов, чтобы получить персонализированные рекомендации
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.75rem] text-muted-foreground">Вопрос {currentQ + 1} из {totalQuestions}</span>
          <span className="text-[0.75rem] font-medium text-violet-600 tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-card rounded-2xl border border-border/40 p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              {(() => {
                const AreaIcon = PM_AREAS[question.area].icon;
                return (
                  <span className={`px-2.5 py-1 rounded-lg text-[0.6875rem] font-medium ${PM_AREAS[question.area].bg} ${PM_AREAS[question.area].color}`}>
                    <AreaIcon className="w-3 h-3 inline mr-1" />
                    {PM_AREAS[question.area].label}
                  </span>
                );
              })()}
            </div>
            <p className="text-[0.9375rem] font-medium leading-relaxed mb-6">{question.question}</p>

            <div className="space-y-2.5">
              {shuffleOptions(question.options, question.id).map((opt, i) => {
                const isSelected = answers[question.id] === opt.score;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt.score)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl text-[0.8125rem] transition-all flex items-center gap-3 ${
                      isSelected
                        ? "bg-teal-100 text-teal-900 ring-1 ring-teal-300 font-medium dark:bg-teal-900/30 dark:text-teal-300"
                        : "bg-muted/30 border border-border/40 hover:border-teal-200 hover:bg-teal-50/30 text-foreground dark:hover:bg-teal-900/10"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[0.625rem] font-semibold ${
                      isSelected ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===== Result View =====
function DiagnosticResultView({ result, onContinue }: { result: DiagnosticResult; onContinue: () => void }) {
  const levelConfig = {
    junior: { label: "Junior PM", emoji: "🌱", color: "text-teal-600", bg: "bg-teal-50", desc: "Вы знакомы с основами, но пока мыслите тактически. Курс поможет перейти от «что делать» к «почему и как»" },
    middle: { label: "Middle PM", emoji: "🌳", color: "text-amber-600", bg: "bg-amber-50", desc: "Вы умеете применять фреймворки и аргументировать решения. Фокус — системное мышление и стратегия" },
    senior: { label: "Senior PM", emoji: "🏔️", color: "text-violet-600", bg: "bg-violet-50", desc: "Вы мыслите системно: видите trade-offs, строите эксперименты и управляете неопределённостью" },
  };

  const cfg = levelConfig[result.level];
  const pct = Math.round((result.totalScore / result.maxScore) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      {/* Level Card */}
      <div className="bg-gradient-to-br from-slate-400 via-slate-500 to-teal-500 rounded-2xl p-6 mb-6 shadow-lg text-white text-center">
        <span className="text-4xl mb-3 inline-block">{cfg.emoji}</span>
        <h2 className="text-2xl font-bold mb-1">{cfg.label}</h2>
        <p className="text-white/70 text-[0.875rem] mb-4">{cfg.desc}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
          <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          <span className="text-white/60 text-[0.8125rem]">общий балл</span>
        </div>
      </div>

      {/* Area Breakdown */}
      <div className="bg-card rounded-2xl border border-border/40 p-6 mb-6">
        <h3 className="text-[0.875rem] font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-500" />
          Результаты по областям
        </h3>
        <div className="space-y-3">
          {(Object.entries(result.areaScores) as [PMArea, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([area, score]) => {
              const info = PM_AREAS[area];
              const Icon = info.icon;
              const isWeak = result.weakAreas.includes(area);
              const isStrong = result.strongAreas.includes(area);
              return (
                <div key={area}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                      <span className="text-[0.8125rem] font-medium">{info.label}</span>
                      {isWeak && <span className="text-[0.5625rem] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full font-medium dark:bg-red-900/30">зона роста</span>}
                      {isStrong && <span className="text-[0.5625rem] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium dark:bg-emerald-900/30">сильная</span>}
                    </div>
                    <span className="text-[0.75rem] font-semibold tabular-nums">{score}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className={`h-full rounded-full ${
                        score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-400"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recommendations */}
      {result.weakAreas.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/40 p-6 mb-6">
          <h3 className="text-[0.875rem] font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Рекомендуемые модули
          </h3>
          <p className="text-[0.8125rem] text-muted-foreground mb-4">
            Обратите особое внимание на эти модули — они помогут закрыть зоны роста:
          </p>
          <div className="space-y-2">
            {result.weakAreas.flatMap(area => PM_AREAS[area].modules).filter((v, i, a) => a.indexOf(v) === i).map(modId => {
              const mod = courseModules.find(m => m.id === modId);
              if (!mod) return null;
              return (
                <div key={modId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50/50 border border-amber-100/60 dark:bg-amber-900/10 dark:border-amber-800/30">
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[0.6875rem] text-amber-600/60 font-medium">Модуль {mod.number}</span>
                    <p className="text-[0.8125rem] font-medium truncate">{mod.title}</p>
                  </div>
                  <span className="text-[0.5625rem] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium whitespace-nowrap dark:bg-amber-900/30 dark:text-amber-400">Приоритет</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl p-4 font-medium hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-100 dark:shadow-teal-900/30"
      >
        Начать обучение с учётом результатов
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ===== Recommended Path Widget (for WelcomeView) =====
export function RecommendedPath({ completedLessons, onSelectLesson }: { completedLessons: Set<string>; onSelectLesson: (id: string) => void }) {
  const profile = getAdaptiveProfile();
  if (!profile) return null;

  const allLessons = getAllLessons();

  // Build personalized recommendations based on weak areas
  const weakModuleIds = profile.weakAreas.flatMap(area => PM_AREAS[area]?.modules || []).filter((v, i, a) => a.indexOf(v) === i);

  const recommendations = weakModuleIds
    .flatMap(modId => {
      const mod = courseModules.find(m => m.id === modId);
      if (!mod) return [];
      // Find first incomplete lesson in this module
      const firstIncomplete = mod.lessons.find(l => !completedLessons.has(l.id));
      if (!firstIncomplete) return [];
      const completedCount = mod.lessons.filter(l => completedLessons.has(l.id)).length;
      return [{
        moduleId: modId,
        moduleTitle: mod.title,
        moduleNumber: mod.number,
        lessonId: firstIncomplete.id,
        lessonTitle: firstIncomplete.title,
        progress: Math.round((completedCount / mod.lessons.length) * 100),
        totalLessons: mod.lessons.length,
        completedCount,
      }];
    })
    .slice(0, 3);

  if (recommendations.length === 0) return null;

  const levelEmoji = profile.level === "senior" ? "🏔️" : profile.level === "middle" ? "🌳" : "🌱";

  return (
    <div className="bg-card rounded-2xl border border-border/40 p-5 mb-6 shadow-sm shadow-black/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center dark:bg-violet-900/30">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-[0.875rem] font-semibold">Персональный план</h3>
            <p className="text-[0.6875rem] text-muted-foreground/60">
              {levelEmoji} {profile.level === "senior" ? "Senior" : profile.level === "middle" ? "Middle" : "Junior"} PM — зоны роста
            </p>
          </div>
        </div>
        <button
          onClick={() => { clearAdaptiveProfile(); window.location.reload(); }}
          className="text-[0.6875rem] text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1 transition-colors"
          title="Пройти тест заново"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {recommendations.map(rec => (
          <button
            key={rec.moduleId}
            onClick={() => onSelectLesson(rec.lessonId)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gradient-to-r from-violet-50/50 to-teal-50/30 border border-violet-100/40 hover:border-violet-200 hover:shadow-sm transition-all text-left group dark:from-violet-900/10 dark:to-teal-900/10 dark:border-violet-800/30"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 dark:bg-violet-900/40">
              <span className="text-[0.6875rem] font-bold text-violet-600 dark:text-violet-400">M{rec.moduleNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.8125rem] font-medium truncate">{rec.moduleTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-violet-100 rounded-full overflow-hidden max-w-[80px] dark:bg-violet-900/30">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${rec.progress}%` }} />
                </div>
                <span className="text-[0.625rem] text-muted-foreground/50 tabular-nums">{rec.completedCount}/{rec.totalLessons}</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== Inline Diagnostic Prompt (shows on WelcomeView if no profile) =====
export function DiagnosticPrompt({ onStart }: { onStart: () => void }) {
  const profile = getAdaptiveProfile();
  if (profile) return null;

  return (
    <button
      onClick={onStart}
      className="w-full flex items-center gap-4 bg-gradient-to-r from-violet-50 to-teal-50 dark:from-violet-900/20 dark:to-teal-900/20 border border-violet-100/60 dark:border-violet-800/30 rounded-2xl p-5 mb-6 hover:border-violet-200 dark:hover:border-violet-700 hover:shadow-sm transition-all group text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
        <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.875rem] font-semibold text-violet-900 dark:text-violet-300">Определите свой уровень</p>
        <p className="text-[0.75rem] text-violet-600/60 dark:text-violet-400/60">
          17 ситуационных кейсов · реальная оценка уровня PM
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-violet-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}