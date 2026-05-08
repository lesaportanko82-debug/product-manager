import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Timer, CheckCircle2, XCircle, ArrowRight,
  Trophy, Flame, Star, RefreshCw, Clock
} from "lucide-react";
import { addLocalXP } from "./interactive-progress";

// ===== Question Pool (spanning all course topics) =====
interface ChallengeQ {
  id: string;
  topic: string;
  question: string;
  choices: { text: string; correct: boolean; feedback: string }[];
}

const QUESTION_POOL: ChallengeQ[] = [
  // CustDev
  { id: "dc1", topic: "CustDev", question: "Какой главный принцип CustDev-интервью?", choices: [
    { text: "Задавать закрытые вопросы для чётких ответов", correct: false, feedback: "Закрытые вопросы ограничивают инсайты." },
    { text: "Спрашивать о прошлом опыте, а не гипотетическом будущем", correct: true, feedback: "Верно! Прошлое поведение — лучший предиктор будущего." },
    { text: "Предлагать своё решение и спрашивать мнение", correct: false, feedback: "Это bias — «продажа» вместо исследования." },
    { text: "Проводить минимум 50 интервью для статистической значимости", correct: false, feedback: "CustDev — качественный метод, 8-12 интервью достаточно." },
  ]},
  { id: "dc2", topic: "CustDev", question: "Что такое Compliance Bias в CustDev?", choices: [
    { text: "Респондент соглашается с исследователем из вежливости", correct: true, feedback: "Именно! Люди склонны говорить «да» из вежливости. Поэтому спрашиваем о действиях, не мнениях." },
    { text: "Исследователь выбирает только подтверждающие данные", correct: false, feedback: "Это Confirmation Bias исследователя, не респондента." },
    { text: "Респондент врёт о своих привычках", correct: false, feedback: "Это не ложь, а социально желаемое поведение." },
    { text: "Маленькая выборка искажает результаты", correct: false, feedback: "Это проблема выборки, не Compliance Bias." },
  ]},
  // JTBD
  { id: "jt1", topic: "JTBD", question: "Формат Job Story:", choices: [
    { text: "Как [персона], я хочу [действие], чтобы [результат]", correct: false, feedback: "Это User Story, не Job Story." },
    { text: "Когда [ситуация], я хочу [мотивация], чтобы [ожидаемый результат]", correct: true, feedback: "Верно! Job Story фокусируется на контексте, а не персоне." },
    { text: "[Кто] + [что делает] + [зачем]", correct: false, feedback: "Это упрощённый формат User Story." },
    { text: "[Проблема] → [Решение] → [Метрика]", correct: false, feedback: "Это скорее формат гипотезы." },
  ]},
  // Метрики
  { id: "me1", topic: "Метрики", question: "Формула LTV при известном Churn Rate:", choices: [
    { text: "LTV = ARPU × Lifetime", correct: false, feedback: "Не учитывает маржу." },
    { text: "LTV = (ARPU × Маржа) / Churn Rate", correct: true, feedback: "Правильно! Базовая формула LTV." },
    { text: "LTV = Revenue / Users", correct: false, feedback: "Это ARPU, не LTV." },
    { text: "LTV = CAC × 3", correct: false, feedback: "Правило LTV/CAC > 3, но это не формула LTV." },
  ]},
  { id: "me2", topic: "Метрики", question: "North Star Metric должна отражать:", choices: [
    { text: "Только рост выручки", correct: false, feedback: "NSM — не только про бизнес, но и про ценность для пользователя." },
    { text: "Пересечение ценности для пользователя и роста бизнеса", correct: true, feedback: "Именно! NSM — мост между product value и business growth." },
    { text: "Количество активных пользователей", correct: false, feedback: "DAU/MAU — input metric, не всегда NSM." },
    { text: "Удовлетворённость клиентов", correct: false, feedback: "Satisfaction важна, но это lagging indicator." },
  ]},
  { id: "me3", topic: "Метрики", question: "CAC Payback Period при CAC = $600 и MRR = $100:", choices: [
    { text: "3 месяца", correct: false, feedback: "600/100 = 6, не 3." },
    { text: "6 месяцев", correct: true, feedback: "CAC Payback = CAC / MRR = 600/100 = 6 мес." },
    { text: "12 месяцев", correct: false, feedback: "Пересчитайте: 600/100." },
    { text: "Невозможно без Churn", correct: false, feedback: "Churn нужен для LTV, не для Payback." },
  ]},
  // RICE
  { id: "ri1", topic: "RICE", question: "В формуле RICE Confidence 80% записывается как:", choices: [
    { text: "80", correct: false, feedback: "Confidence — коэффициент от 0 до 1." },
    { text: "0.8", correct: true, feedback: "Верно! 80% = 0.8 в формуле RICE." },
    { text: "8", correct: false, feedback: "Это не та шкала." },
    { text: "0.08", correct: false, feedback: "80%, не 8%." },
  ]},
  // Scrum
  { id: "sc1", topic: "Scrum", question: "Что делать, если в середине спринта выясняется, что задача больше ожидаемого?", choices: [
    { text: "Продлить спринт", correct: false, feedback: "Спринт — timebox. Длительность фиксирована." },
    { text: "Убрать менее приоритетную задачу из спринта", correct: true, feedback: "Верно! Scope гибкий, sprint goal и timebox — нет." },
    { text: "Работать сверхурочно", correct: false, feedback: "Устойчивый темп (sustainable pace) — принцип Agile." },
    { text: "Отменить спринт", correct: false, feedback: "Sprint Cancellation — крайняя мера, когда цель неактуальна." },
  ]},
  { id: "sc2", topic: "Scrum", question: "Кто отвечает за приоритизацию бэклога в Scrum?", choices: [
    { text: "Scrum Master", correct: false, feedback: "SM — фасилитатор процесса, не владелец бэклога." },
    { text: "Product Owner", correct: true, feedback: "PO владеет бэклогом и приоритизирует его." },
    { text: "Команда разработки", correct: false, feedback: "Команда оценивает и декомпозирует, но не приоритизирует." },
    { text: "Стейкхолдеры", correct: false, feedback: "Стейкхолдеры дают input, но PO принимает решение." },
  ]},
  // A/B тесты
  { id: "ab1", topic: "A/B-тесты", question: "p-value = 0.03 означает:", choices: [
    { text: "Вероятность, что вариант B лучше — 97%", correct: false, feedback: "p-value — не вероятность того, что гипотеза верна." },
    { text: "Если нет разницы, шанс увидеть такой результат — 3%", correct: true, feedback: "Верно! p-value — вероятность данных при H0." },
    { text: "Эффект составляет 3%", correct: false, feedback: "p-value — не размер эффекта." },
    { text: "Нужно ещё 3% данных", correct: false, feedback: "p-value не связан с объёмом данных напрямую." },
  ]},
  { id: "ab2", topic: "A/B-тесты", question: "Что такое «peeking» в A/B-тестировании?", choices: [
    { text: "Подглядывание за действиями конкурентов", correct: false, feedback: "Peeking — термин из статистики тестов." },
    { text: "Проверка результатов до окончания эксперимента и принятие решения по промежуточным данным", correct: true, feedback: "Peeking увеличивает вероятность ложно-положительного результата!" },
    { text: "Предоставление контрольной группе доступа к тестовому варианту", correct: false, feedback: "Это contamination, не peeking." },
    { text: "Запуск теста без контрольной группы", correct: false, feedback: "Это отсутствие контроля, не peeking." },
  ]},
  // CJM
  { id: "cj1", topic: "CJM", question: "Главная цель Customer Journey Map:", choices: [
    { text: "Красиво визуализировать путь клиента", correct: false, feedback: "Визуализация — средство, не цель." },
    { text: "Найти точки боли и возможности для улучшения опыта", correct: true, feedback: "CJM помогает найти pain points и moments of delight." },
    { text: "Описать все экраны приложения", correct: false, feedback: "Это User Flow, не CJM." },
    { text: "Показать воронку конверсии", correct: false, feedback: "Воронка — часть, но CJM шире: эмоции, точки контакта, боли." },
  ]},
  // Unit-экономика
  { id: "ue1", topic: "Unit-экономика", question: "Оптимальное соотношение LTV/CAC:", choices: [
    { text: "LTV/CAC > 1", correct: false, feedback: "> 1 — минимальный порог, не оптимум." },
    { text: "LTV/CAC > 3", correct: true, feedback: "Правило ×3: LTV/CAC > 3 — здоровый бизнес." },
    { text: "LTV/CAC > 10", correct: false, feedback: "> 10 значит вы недоинвестируете в рост!" },
    { text: "LTV = CAC", correct: false, feedback: "При LTV = CAC прибыль = 0." },
  ]},
  // Стейкхолдеры
  { id: "st1", topic: "Стейкхолдеры", question: "Главный приём при возражении стейкхолдера:", choices: [
    { text: "Настоять на своём с данными", correct: false, feedback: "Агрессивный подход создаёт конфликт." },
    { text: "Переключить фрейм: показать метрику, которая важна именно этому стейкхолдеру", correct: true, feedback: "Reframing — ключ к влиянию. CFO → LTV, CTO → tech debt, CEO → growth." },
    { text: "Согласиться и сделать по-своему", correct: false, feedback: "Подрывает доверие." },
    { text: "Отложить обсуждение", correct: false, feedback: "Прокрастинация усугубляет проблему." },
  ]},
  // Growth
  { id: "gr1", topic: "Growth", question: "Самый устойчивый growth loop:", choices: [
    { text: "Paid acquisition (реклама)", correct: false, feedback: "Paid — не loop, а линейный канал. Зависимость от бюджета." },
    { text: "Referral: пользователь приводит нового пользователя, который приводит ещё", correct: true, feedback: "Referral — self-reinforcing цикл с низким CAC." },
    { text: "PR и пресс-релизы", correct: false, feedback: "PR — разовый spike, не sustainable growth." },
    { text: "Холодные продажи", correct: false, feedback: "Outbound = линейная зависимость от headcount." },
  ]},
  // Product Strategy
  { id: "ps1", topic: "Стратегия", question: "Что такое Product-Market Fit (PMF)?", choices: [
    { text: "Продукт нравится фаундеру", correct: false, feedback: "Мнение фаундера ≠ PMF." },
    { text: "Пользователи готовы платить и возвращаются, рынок тянет продукт вперёд", correct: true, feedback: "PMF = pull from market. Рост органический, retention высокий." },
    { text: "MVP запущен в production", correct: false, feedback: "Запуск ≠ fit. Нужна валидация." },
    { text: "Продукт дешевле конкурентов", correct: false, feedback: "Цена — не показатель PMF." },
  ]},
  // Marketplace
  { id: "mp1", topic: "Маркетплейс", question: "Главный risk маркетплейса:", choices: [
    { text: "Конкуренция", correct: false, feedback: "Конкуренция важна, но не экзистенциальна для маркетплейса." },
    { text: "Disintermediation — участники обходят платформу", correct: true, feedback: "Продавцы и покупатели могут уйти из платформы. Нужно создавать ценность, которую нельзя получить офлайн." },
    { text: "Технические сбои", correct: false, feedback: "Техпроблемы решаемы, disintermediation — экзистенциальна." },
    { text: "Регуляторные ограничения", correct: false, feedback: "Зависит от ниши, но не главный risk для большинства." },
  ]},
  // B2B
  { id: "bb1", topic: "B2B SaaS", question: "CAC Payback для B2B SaaS считается хорошим, если:", choices: [
    { text: "< 3 месяцев", correct: false, feedback: "Для B2B SaaS 3 мес — нереалистично (длинный sales cycle)." },
    { text: "< 12 месяцев", correct: true, feedback: "< 12 мес — отлично для B2B SaaS. Bessemer рекомендует < 18 мес." },
    { text: "< 36 месяцев", correct: false, feedback: "3 года — слишком долго, cash flow проблемы." },
    { text: "Не важно, главное LTV/CAC > 3", correct: false, feedback: "LTV/CAC и Payback — разные метрики. Payback про cash flow." },
  ]},
  // Prioritization
  { id: "pr1", topic: "Приоритизация", question: "Когда НЕ стоит использовать RICE:", choices: [
    { text: "Когда бэклог маленький (< 5 задач)", correct: false, feedback: "Даже для 5 задач RICE полезен." },
    { text: "Когда решение стратегическое и не поддаётся количественной оценке", correct: true, feedback: "RICE — для тактических решений. Стратегические требуют фреймворков типа Opportunity Scoring." },
    { text: "Когда нет данных о Reach", correct: false, feedback: "Reach можно оценить экспертно." },
    { text: "Когда CEO уже решил", correct: false, feedback: "Даже при решении CEO полезно иметь data-driven оценку." },
  ]},
  // Hypothesis
  { id: "hy1", topic: "Гипотезы", question: "Формат HADI-цикла:", choices: [
    { text: "Hypothesis → Analysis → Design → Implementation", correct: false, feedback: "Это не HADI." },
    { text: "Hypothesis → Action → Data → Insights", correct: true, feedback: "HADI: Гипотеза → Действие → Данные → Инсайты → новая Гипотеза." },
    { text: "How → Act → Do → Iterate", correct: false, feedback: "Это не HADI." },
    { text: "Hack → Analyze → Deploy → Improve", correct: false, feedback: "Это не HADI." },
  ]},
];

// ===== Daily seed (deterministic per day) =====
function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTodayKey(): string {
  return `daily-challenge-${new Date().toISOString().slice(0, 10)}`;
}

function getDailyQuestions(): ChallengeQ[] {
  const seed = getDailySeed();
  const shuffled = seededShuffle(QUESTION_POOL, seed);
  return shuffled.slice(0, 3);
}

interface DailySave {
  answers: (number | null)[];
  timeLeft: number;
  completed: boolean;
  score: number;
  xpAwarded: boolean;
}

function loadDaily(): DailySave | null {
  try {
    const data = localStorage.getItem(getTodayKey());
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveDaily(data: DailySave) {
  try { localStorage.setItem(getTodayKey(), JSON.stringify(data)); } catch {}
}

// ===== Streak tracking =====
function getDailyChallengeStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem("daily-challenge-streak") || "{}");
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (data.lastDate === today) return data.streak || 0;
    if (data.lastDate === yesterday) return data.streak || 0;
    return 0;
  } catch { return 0; }
}

function recordDailyChallengeStreak() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const data = JSON.parse(localStorage.getItem("daily-challenge-streak") || "{}");
    if (data.lastDate === today) return; // already recorded
    const streak = data.lastDate === yesterday ? (data.streak || 0) + 1 : 1;
    localStorage.setItem("daily-challenge-streak", JSON.stringify({ lastDate: today, streak }));
  } catch {}
}

// ===== Constants =====
const TIMER_SECONDS = 90; // 1.5 minutes for 3 questions
const XP_PER_CORRECT = 15;
const XP_BONUS_PERFECT = 30;
const XP_BONUS_FAST = 10; // if > 30s remaining

// ===== Component =====
export function DailyChallenge() {
  const questions = getDailyQuestions();
  const saved = loadDaily();
  const [streak, setStreak] = useState(() => getDailyChallengeStreak());

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(saved?.answers || [null, null, null]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(saved?.completed ? 0 : (saved?.timeLeft ?? TIMER_SECONDS));
  const [completed, setCompleted] = useState(saved?.completed || false);
  const [started, setStarted] = useState(saved !== null && !saved.completed && saved.answers.some(a => a !== null));
  const [xpAwarded, setXpAwarded] = useState(saved?.xpAwarded || false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume to the right question if saved progress
  useEffect(() => {
    if (saved && !saved.completed) {
      const nextUnanswered = saved.answers.findIndex(a => a === null);
      if (nextUnanswered >= 0) setCurrentQ(nextUnanswered);
    }
  }, []);

  // Timer
  useEffect(() => {
    if (!started || completed || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Time's up — complete with current answers
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, completed]);

  // Save state changes
  useEffect(() => {
    if (started || completed) {
      const score = answers.reduce((s, a, i) => {
        if (a !== null && questions[i].choices[a].correct) return s + 1;
        return s;
      }, 0);
      saveDaily({ answers, timeLeft, completed, score, xpAwarded });
    }
  }, [answers, timeLeft, completed, xpAwarded]);

  // Award XP on completion
  useEffect(() => {
    if (completed && !xpAwarded) {
      const score = answers.reduce((s, a, i) => {
        if (a !== null && questions[i].choices[a].correct) return s + 1;
        return s;
      }, 0);
      let xp = score * XP_PER_CORRECT;
      if (score === 3) xp += XP_BONUS_PERFECT;
      if (timeLeft > 30) xp += XP_BONUS_FAST;
      if (xp > 0) addLocalXP(xp);
      if (score > 0) {
        recordDailyChallengeStreak();
        setStreak(getDailyChallengeStreak());
      }
      setXpAwarded(true);
    }
  }, [completed]);

  const handleStart = useCallback(() => {
    setStarted(true);
  }, []);

  const handleSelect = useCallback((idx: number) => {
    if (showFeedback || completed) return;
    setSelectedChoice(idx);
  }, [showFeedback, completed]);

  const handleConfirm = useCallback(() => {
    if (selectedChoice === null) return;
    setShowFeedback(true);
    setAnswers(prev => {
      const next = [...prev];
      next[currentQ] = selectedChoice;
      return next;
    });
  }, [selectedChoice, currentQ]);

  const handleNext = useCallback(() => {
    setSelectedChoice(null);
    setShowFeedback(false);
    if (currentQ < 2) {
      setCurrentQ(prev => prev + 1);
    } else {
      setCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [currentQ]);

  const score = answers.reduce((s, a, i) => {
    if (a !== null && questions[i].choices[a].correct) return s + 1;
    return s;
  }, 0);

  const totalXP = (() => {
    let xp = score * XP_PER_CORRECT;
    if (score === 3) xp += XP_BONUS_PERFECT;
    if (timeLeft > 30) xp += XP_BONUS_FAST;
    return xp;
  })();

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;

  // ===== Not started =====
  if (!started && !completed) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-[0.875rem] font-semibold">Ежедневный челлендж</h3>
              <p className="text-[0.6875rem] text-muted-foreground/60">3 вопроса · {TIMER_SECONDS} сек · до {XP_PER_CORRECT * 3 + XP_BONUS_PERFECT + XP_BONUS_FAST} 🌰</p>
              <p className="text-[0.5625rem] text-muted-foreground/40">+{XP_BONUS_PERFECT} 🌰 за 3/3 верных · +{XP_BONUS_FAST} 🌰 за скорость (&gt;30 сек остатка)</p>
            </div>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-[0.625rem] font-bold text-orange-600 tabular-nums">{streak}d</span>
            </div>
          )}
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 text-[0.75rem] text-muted-foreground/50 mb-3">
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {TIMER_SECONDS} сек</span>
            <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {XP_PER_CORRECT} 🌰/ответ</span>
            <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> бонус за 3/3</span>
          </div>
          <button
            onClick={handleStart}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm flex items-center justify-center gap-2 group"
          >
            Начать
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // ===== Completed =====
  if (completed) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              score === 3 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-amber-400 to-orange-400'
            }`}>
              {score === 3 ? <Trophy className="w-4.5 h-4.5 text-white" /> : <Zap className="w-4.5 h-4.5 text-white" />}
            </div>
            <div>
              <h3 className="text-[0.875rem] font-semibold">
                {score === 3 ? "Идеально!" : score >= 2 ? "Хорошо!" : score === 1 ? "Неплохо" : "Попробуйте завтра"}
              </h3>
              <p className="text-[0.6875rem] text-muted-foreground/60">
                {score}/3 правильно · +{totalXP} 🌰
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2 mb-3">
            {questions.map((q, i) => {
              const answer = answers[i];
              const isCorrect = answer !== null && q.choices[answer].correct;
              return (
                <div key={q.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${
                  answer === null ? 'bg-muted/30' : isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    answer === null ? 'bg-muted' : isCorrect ? 'bg-emerald-500' : 'bg-red-400'
                  }`}>
                    {answer === null ? <Clock className="w-2.5 h-2.5 text-muted-foreground" /> 
                      : isCorrect ? <CheckCircle2 className="w-3 h-3 text-white" /> 
                      : <XCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.75rem] font-medium leading-snug">{q.question}</p>
                    <p className="text-[0.625rem] text-muted-foreground/60 mt-0.5">
                      {answer !== null ? q.choices[answer].feedback : "Время истекло"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground/40">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Новый челлендж завтра
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-orange-500 font-medium">
                <Flame className="w-3 h-3" /> Серия: {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== Active quiz =====
  const q = questions[currentQ];

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 overflow-hidden relative">
      {/* Timer bar */}
      <div className="h-1 bg-muted/30">
        <motion.div
          className={`h-full rounded-r-full transition-colors ${
            timeLeft > 30 ? 'bg-emerald-400' : timeLeft > 10 ? 'bg-amber-400' : 'bg-red-400'
          }`}
          style={{ width: `${timerPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[0.75rem] font-semibold text-muted-foreground">
              Вопрос {currentQ + 1}/3
            </span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[0.5625rem] font-medium">{q.topic}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.75rem] font-bold tabular-nums ${
            timeLeft > 30 ? 'bg-emerald-50 text-emerald-600' : timeLeft > 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600 animate-pulse'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Question dots */}
        <div className="flex gap-1.5 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i} className={`flex-1 h-1 rounded-full ${
              answers[i] !== null
                ? questions[i].choices[answers[i]!].correct ? 'bg-emerald-400' : 'bg-red-300'
                : i === currentQ ? 'bg-amber-400' : 'bg-muted/50'
            }`} />
          ))}
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h4 className="text-[0.875rem] font-semibold mb-3 leading-relaxed">{q.question}</h4>

            <div className="space-y-1.5 mb-4">
              {q.choices.map((choice, ci) => {
                const isSelected = selectedChoice === ci;
                const isAnswered = showFeedback;
                const isCorrect = choice.correct;
                const wasChosen = isAnswered && selectedChoice === ci;

                return (
                  <button key={ci}
                    onClick={() => handleSelect(ci)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[0.8125rem] transition-all flex items-start gap-2.5 ${
                      isAnswered
                        ? isCorrect ? 'bg-emerald-50 ring-1 ring-emerald-300 text-emerald-900'
                          : wasChosen ? 'bg-red-50 ring-1 ring-red-300 text-red-900'
                          : 'bg-white/60 text-muted-foreground/50 ring-1 ring-border/10'
                        : isSelected ? 'bg-amber-50 ring-2 ring-amber-400 shadow-sm'
                        : 'bg-white dark:bg-card ring-1 ring-border/30 hover:ring-amber-200 cursor-pointer'
                    }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.625rem] font-bold ${
                      isAnswered
                        ? isCorrect ? 'bg-emerald-500 text-white' : wasChosen ? 'bg-red-400 text-white' : 'bg-muted text-muted-foreground/40'
                        : isSelected ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground/40'
                    }`}>
                      {isAnswered ? (isCorrect ? <CheckCircle2 className="w-3 h-3" /> : wasChosen ? <XCircle className="w-3 h-3" /> : String.fromCharCode(65 + ci)) : String.fromCharCode(65 + ci)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="leading-relaxed">{choice.text}</span>
                      {isAnswered && (wasChosen || isCorrect) && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          className="text-[0.6875rem] leading-relaxed mt-1.5 pt-1.5 border-t border-current/10">
                          {choice.feedback}
                        </motion.p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex justify-end">
          {!showFeedback ? (
            <button onClick={handleConfirm} disabled={selectedChoice === null}
              className="px-5 py-2 bg-amber-500 text-white rounded-lg text-[0.8125rem] font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
              Ответить
            </button>
          ) : (
            <button onClick={handleNext}
              className="px-5 py-2 bg-amber-500 text-white rounded-lg text-[0.8125rem] font-medium hover:bg-amber-600 transition-all shadow-sm flex items-center gap-1.5 group">
              {currentQ < 2 ? "Далее" : "Результат"}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
