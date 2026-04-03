import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic, Clock, ChevronRight, ArrowRight, RotateCcw, Star,
  Brain, Target, BarChart3, MessageSquare, Zap, X, Award,
  Play, Square, Loader2, CheckCircle2, AlertTriangle, TrendingUp
} from "lucide-react";
import { addLocalXP } from "./interactive-progress";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

type InterviewType = "product_sense" | "estimation" | "behavioral" | "metrics" | "system_design";

interface InterviewQuestion {
  id: string;
  type: InterviewType;
  question: string;
  hints: string[];
  timeMinutes: number;
  rubric: string;
}

const INTERVIEW_TYPES: Record<InterviewType, { label: string; icon: React.ElementType; color: string; bg: string; desc: string }> = {
  product_sense: { label: "Product Sense", icon: Brain, color: "text-violet-600", bg: "bg-violet-50", desc: "Дизайн продукта, улучшение фич, определение стратегии" },
  estimation: { label: "Estimation (Ферми)", icon: Target, color: "text-amber-600", bg: "bg-amber-50", desc: "Оценка размера рынка, количественные задачи" },
  behavioral: { label: "Behavioral (STAR)", icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50", desc: "Поведенческие вопросы, ваш опыт и подход" },
  metrics: { label: "Metrics & Analytics", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50", desc: "Определение метрик, анализ данных, North Star" },
  system_design: { label: "System Design для PM", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Архитектура продукта, масштабирование, trade-offs" },
};

const QUESTIONS: InterviewQuestion[] = [
  // Product Sense
  { id: "ps1", type: "product_sense", question: "Вы — PM в Spotify. Как бы вы улучшили функцию Discover Weekly?", hints: ["Кто пользователи?", "Какие JTBD?", "Какие метрики успеха?"], timeMinutes: 8, rubric: "Структура, пользовательский фокус, метрики, креативность решений" },
  { id: "ps2", type: "product_sense", question: "Спроектируйте продукт для пожилых людей, которые хотят научиться пользоваться смартфоном.", hints: ["Сегментация", "Барьеры adoption", "MVP"], timeMinutes: 8, rubric: "Эмпатия, сегментация, MVP-мышление" },
  { id: "ps3", type: "product_sense", question: "Uber Eats теряет ресторанных партнёров. Как PM, что вы предложите?", hints: ["Supply-side проблемы", "Unit-экономика", "Switching costs"], timeMinutes: 8, rubric: "Понимание маркетплейса, supply-side, switching costs" },
  { id: "ps4", type: "product_sense", question: "Вы PM в Google Maps. Придумайте новую фичу для увеличения DAU на 10%.", hints: ["Какие use cases недозакрыты?", "Growth loops"], timeMinutes: 8, rubric: "Креативность, impact-анализ, growth thinking" },
  { id: "ps5", type: "product_sense", question: "Instagram хочет увеличить время в приложении для пользователей 35+. Ваша стратегия?", hints: ["Текущее поведение сегмента", "Потребности vs Gen Z", "Content discovery"], timeMinutes: 8, rubric: "Сегментация, user research мышление, product strategy" },
  { id: "ps6", type: "product_sense", question: "Вы PM в Duolingo. Как снизить отток пользователей после 2-й недели?", hints: ["Кривая обучения", "Мотивационный дизайн", "Social features"], timeMinutes: 8, rubric: "Retention-мышление, геймификация, habit loops" },
  { id: "ps7", type: "product_sense", question: "Спроектируйте MVP фитнес-приложения для людей, которые никогда не занимались спортом.", hints: ["Барьеры входа", "Мотивация новичков", "Aha-moment"], timeMinutes: 8, rubric: "Эмпатия, MVP-скоуп, onboarding design" },
  { id: "ps8", type: "product_sense", question: "Airbnb хочет выйти на рынок долгосрочной аренды (1-12 мес). Как адаптировать продукт?", hints: ["Другие JTBD", "Trust & safety", "Ценообразование"], timeMinutes: 10, rubric: "Стратегическое мышление, adaptation, market analysis" },
  { id: "ps9", type: "product_sense", question: "Вы PM в Notion. Как бы вы улучшили мобильное приложение?", hints: ["Mobile-first JTBD", "Quick capture", "Offline mode"], timeMinutes: 8, rubric: "Платформенное мышление, UX constraints, приоритизация" },
  { id: "ps10", type: "product_sense", question: "Telegram хочет монетизироваться без рекламы. Предложите 3 модели.", hints: ["Premium vs freemium", "B2B vs B2C", "Willingness to pay"], timeMinutes: 8, rubric: "Бизнес-мышление, monetization strategy, user value" },
  // Estimation
  { id: "est1", type: "estimation", question: "Сколько пиццерий в Москве?", hints: ["Top-down vs bottom-up", "Население", "Частота потребления"], timeMinutes: 5, rubric: "Структурный подход, обоснованность допущений, арифметика" },
  { id: "est2", type: "estimation", question: "Оцените TAM для сервиса доставки продуктов в России.", hints: ["Население", "Средний чек", "Пенетрация"], timeMinutes: 6, rubric: "TAM/SAM/SOM, обоснование, bottom-up калькуляция" },
  { id: "est3", type: "estimation", question: "Сколько запросов в секунду обрабатывает поиск Google?", hints: ["Глобальные пользователи", "Частота поиска", "Часовые пояса"], timeMinutes: 5, rubric: "Декомпозиция, реалистичность допущений" },
  { id: "est4", type: "estimation", question: "Сколько денег россияне тратят на кофе навынос каждый день?", hints: ["Городское население", "Средний чек", "% кофе-потребителей"], timeMinutes: 5, rubric: "Сегментация, bottom-up, sanity check" },
  { id: "est5", type: "estimation", question: "Оцените количество активных Telegram-ботов в мире.", hints: ["MAU Telegram", "% создающих ботов", "Типы ботов"], timeMinutes: 6, rubric: "Категоризация, логика рассуждений, order of magnitude" },
  { id: "est6", type: "estimation", question: "Сколько курьеров нужно Яндекс.Еде в Москве в пиковый час?", hints: ["Заказы в час", "Среднее время доставки", "Утилизация"], timeMinutes: 6, rubric: "Операционная логика, queuing theory basics, допущения" },
  { id: "est7", type: "estimation", question: "Оцените рынок онлайн-образования в СНГ.", hints: ["Население", "Сегменты (дети/взрослые/корп)", "ARPU"], timeMinutes: 7, rubric: "TAM breakdown, сегментация, growth trajectory" },
  { id: "est8", type: "estimation", question: "Сколько data-инженеров в России?", hints: ["IT-рынок", "Доля data-команд", "Рост профессии"], timeMinutes: 5, rubric: "Top-down от IT-рынка, cross-check через вакансии" },
  // Behavioral
  { id: "bh1", type: "behavioral", question: "Расскажите о ситуации, когда вам пришлось принять решение без достаточных данных.", hints: ["STAR: Situation, Task, Action, Result", "Что бы сделали иначе?"], timeMinutes: 5, rubric: "Структура STAR, самоанализ, decision-making under uncertainty" },
  { id: "bh2", type: "behavioral", question: "Приведите пример конфликта с инженерной командой. Как вы его разрешили?", hints: ["Контекст конфликта", "Ваши действия", "Результат"], timeMinutes: 5, rubric: "Коммуникация, эмпатия, conflict resolution" },
  { id: "bh3", type: "behavioral", question: "Опишите свой самый неудачный запуск продукта. Чему научились?", hints: ["Что пошло не так?", "Что бы изменили?"], timeMinutes: 5, rubric: "Честность, рефлексия, growth mindset" },
  { id: "bh4", type: "behavioral", question: "Расскажите о ситуации, когда вам пришлось убедить стейкхолдера отказаться от его идеи.", hints: ["Кто стейкхолдер?", "Какие аргументы?", "Data vs intuition"], timeMinutes: 5, rubric: "Stakeholder management, influence without authority, diplomacy" },
  { id: "bh5", type: "behavioral", question: "Приведите пример, когда вы приоритизировали техдолг над новыми фичами.", hints: ["Как обосновали?", "Бизнес-impact", "Результат"], timeMinutes: 5, rubric: "Technical judgment, business communication, trade-off thinking" },
  { id: "bh6", type: "behavioral", question: "Опишите ситуацию, когда данные и интуиция говорили разное. Как поступили?", hints: ["Какие данные?", "Откуда интуиция?", "Итог"], timeMinutes: 5, rubric: "Analytical thinking, bias awareness, decision-making" },
  { id: "bh7", type: "behavioral", question: "Как вы работаете с дедлайнами, когда scope расползается?", hints: ["Конкретный пример", "Как ре-скоупили?", "Коммуникация"], timeMinutes: 5, rubric: "Project management, scope management, transparency" },
  { id: "bh8", type: "behavioral", question: "Расскажите о фиче, которую вы убили, хотя команда её любила.", hints: ["Почему убили?", "Как сообщили?", "Реакция команды"], timeMinutes: 5, rubric: "Courage, data-driven decisions, team management" },
  // Metrics
  { id: "mt1", type: "metrics", question: "Вы PM в Netflix. Какую North Star Metric выберете и почему?", hints: ["Ценность для пользователя", "Связь с бизнесом", "Input vs output metrics"], timeMinutes: 6, rubric: "Понимание NSM, связь с бизнесом, input metrics" },
  { id: "mt2", type: "metrics", question: "Retention D7 упал на 15% после обновления. Как будете расследовать?", hints: ["Сегментация", "Когортный анализ", "A/B тест"], timeMinutes: 6, rubric: "Аналитический подход, root cause analysis, action plan" },
  { id: "mt3", type: "metrics", question: "Определите success metrics для запуска Stories в LinkedIn.", hints: ["Adoption", "Engagement", "Business impact"], timeMinutes: 6, rubric: "Выбор метрик, guardrail metrics, measurement plan" },
  { id: "mt4", type: "metrics", question: "DAU растёт, но revenue падает. Предложите гипотезы и план расследования.", hints: ["Микс пользователей", "Monetization funnel", "Cannibalization"], timeMinutes: 7, rubric: "Diagnostic thinking, metric decomposition, hypothesis generation" },
  { id: "mt5", type: "metrics", question: "Вы PM в Slack. Определите метрики для оценки здоровья workspace.", hints: ["Активность", "Adoption", "Collaboration signals"], timeMinutes: 6, rubric: "B2B metrics, leading indicators, health scores" },
  { id: "mt6", type: "metrics", question: "Как измерить успех рекомендательной системы в e-commerce?", hints: ["CTR vs conversion", "Serendipity", "Revenue attribution"], timeMinutes: 6, rubric: "ML metrics vs business metrics, long-term vs short-term" },
  { id: "mt7", type: "metrics", question: "Конверсия в покупку выросла на 20%, но NPS упал. Что происходит?", hints: ["Dark patterns?", "Качество трафика", "Post-purchase experience"], timeMinutes: 6, rubric: "Guardrail metrics, ethical product thinking, root cause" },
  { id: "mt8", type: "metrics", question: "Постройте дерево метрик для маркетплейса фриланс-услуг.", hints: ["Supply & demand", "Liquidity", "GMV decomposition"], timeMinutes: 7, rubric: "Metric trees, marketplace dynamics, leading indicators" },
  // System Design
  { id: "sd1", type: "system_design", question: "Спроектируйте систему уведомлений для маркетплейса (buyer + seller + admin).", hints: ["Каналы", "Приоритизация", "Персонализация"], timeMinutes: 10, rubric: "Системное мышление, trade-offs, scalability" },
  { id: "sd2", type: "system_design", question: "Как бы вы спроектировали систему рекомендаций для новостного приложения?", hints: ["Холодный старт", "Фильтрация", "Метрики качества"], timeMinutes: 10, rubric: "Понимание ML/рекомендаций, product trade-offs, этика" },
  { id: "sd3", type: "system_design", question: "Спроектируйте систему A/B-тестирования для мобильного приложения с 10M MAU.", hints: ["Рандомизация", "Статистическая мощность", "Feature flags"], timeMinutes: 10, rubric: "Experimentation platform, statistical literacy, engineering trade-offs" },
  { id: "sd4", type: "system_design", question: "Как бы вы спроектировали систему ценообразования для ride-sharing (surge pricing)?", hints: ["Supply/demand balance", "Fairness", "Real-time data"], timeMinutes: 10, rubric: "Economic reasoning, real-time systems, user trust" },
  { id: "sd5", type: "system_design", question: "Спроектируйте систему модерации контента для UGC-платформы.", hints: ["Автоматизация vs ручная", "Типы нарушений", "Appeals"], timeMinutes: 10, rubric: "Content policy, ML + human review, scalability, fairness" },
  { id: "sd6", type: "system_design", question: "Как вы спроектируете онбординг-воронку, которая адаптируется под сегмент пользователя?", hints: ["Сигналы для сегментации", "Branching logic", "Метрики"], timeMinutes: 8, rubric: "Personalization, data-driven onboarding, measurement" },
  { id: "sd7", type: "system_design", question: "Спроектируйте loyalty-программу для сети кофеен с 500 точками.", hints: ["Tiers", "Rewards economics", "Data platform"], timeMinutes: 10, rubric: "Gamification, unit economics of loyalty, CRM integration" },
];

interface EvalResult {
  overallScore: number;
  criteria: Record<string, { score: number; comment: string }>;
  strengths: string[];
  improvements: string[];
  summary: string;
  sampleAnswer?: string;
}

export function InterviewSimulator({ onClose }: { onClose: () => void }) {
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [currentQ, setCurrentQ] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [history, setHistory] = useState<{ qId: string; score: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("interview-history") || "[]"); } catch { return []; }
  });
  const timerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Timer
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timerRef.current);
    }
    if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setTimeExpired(true);
    }
  }, [timerActive, timeLeft]);

  const startQuestion = (q: InterviewQuestion) => {
    setCurrentQ(q);
    setAnswer("");
    setEvalResult(null);
    setEvalError(null);
    setTimeExpired(false);
    setShowHints(false);
    setTimeLeft(q.timeMinutes * 60);
    setTimerActive(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const startRandom = (type: InterviewType) => {
    const available = QUESTIONS.filter(q => q.type === type && !history.find(h => h.qId === q.id));
    const pool = available.length > 0 ? available : QUESTIONS.filter(q => q.type === type);
    const q = pool[Math.floor(Math.random() * pool.length)];
    startQuestion(q);
  };

  const submitAnswer = useCallback(async () => {
    if (!currentQ || answer.trim().length < 150) return;
    setTimerActive(false);
    setEvaluating(true);
    setEvalError(null);
    try {
      const res = await fetch(`${API}/interview-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          questionType: currentQ.type,
          question: currentQ.question,
          answer: answer.trim(),
          rubric: currentQ.rubric,
          timeUsed: currentQ.timeMinutes * 60 - timeLeft,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      if (data.evaluation) {
        setEvalResult(data.evaluation);
        const score = data.evaluation.overallScore || 0;
        const xp = Math.round(score * 5); // increased multiplier: 0-50 XP for a full interview answer
        if (xp > 0) addLocalXP(xp);
        const newHistory = [...history, { qId: currentQ.id, score }];
        setHistory(newHistory);
        try { localStorage.setItem("interview-history", JSON.stringify(newHistory.slice(-50))); } catch {}
      } else {
        setEvalError("Не удалось получить оценку от AI. Попробуйте ещё раз.");
      }
    } catch (err) {
      console.error("Interview evaluation error:", err);
      setEvalError(`Ошибка при отправке ответа на оценку. Проверьте соединение и попробуйте снова.`);
    } finally {
      setEvaluating(false);
    }
  }, [currentQ, answer, timeLeft, history]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const timeWarning = timeLeft > 0 && timeLeft <= 60;
  const timeDisplay = timeExpired ? "0:00" : formatTime(timeLeft);

  // Main menu
  if (!selectedType) {
    const avgScore = history.length > 0 ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length * 10) : 0;
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
        <div className="max-w-[720px] mx-auto px-6 py-10">
          <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
            <X className="w-4 h-4" /> Закрыть
          </button>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-[0.75rem] font-medium mb-4">
              <Mic className="w-3 h-3" /> PM Interview Simulator
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Симулятор собеседования</h1>
            <p className="text-[0.875rem] text-muted-foreground">Практикуйте ответы на реальные вопросы PM-интервью с AI-оценкой</p>
            {history.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-3 px-4 py-2 bg-card rounded-xl border border-border/40 text-[0.8125rem]">
                <span className="text-muted-foreground">Пройдено: <strong>{history.length}</strong></span>
                <span className="text-muted-foreground">Средний балл: <strong className="text-teal-600">{avgScore}%</strong></span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {(Object.entries(INTERVIEW_TYPES) as [InterviewType, typeof INTERVIEW_TYPES[InterviewType]][]).map(([type, cfg]) => {
              const Icon = cfg.icon;
              const typeHistory = history.filter(h => QUESTIONS.find(q => q.id === h.qId)?.type === type);
              const count = QUESTIONS.filter(q => q.type === type).length;
              return (
                <button key={type} onClick={() => setSelectedType(type)} className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/40 hover:border-teal-200 hover:shadow-sm transition-all text-left group dark:hover:border-teal-800">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} dark:bg-opacity-20 flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.875rem] font-semibold">{cfg.label}</p>
                    <p className="text-[0.75rem] text-muted-foreground/60">{cfg.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[0.625rem] text-muted-foreground/40">{typeHistory.length}/{count}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-teal-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Question selection
  if (!currentQ) {
    const cfg = INTERVIEW_TYPES[selectedType];
    const Icon = cfg.icon;
    const questions = QUESTIONS.filter(q => q.type === selectedType);
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
        <div className="max-w-[720px] mx-auto px-6 py-10">
          <button onClick={() => setSelectedType(null)} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" /> Назад
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{cfg.label}</h2>
              <p className="text-[0.75rem] text-muted-foreground">{cfg.desc}</p>
            </div>
          </div>
          <button onClick={() => startRandom(selectedType)} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl p-4 font-medium hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md mb-6">
            <Play className="w-4 h-4" /> Случайный вопрос
          </button>
          <div className="space-y-2">
            {questions.map((q) => {
              const done = history.find(h => h.qId === q.id);
              return (
                <button key={q.id} onClick={() => startQuestion(q)} className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border/40 hover:border-teal-200 transition-all text-left group">
                  {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Play className="w-4 h-4 text-muted-foreground/30 group-hover:text-teal-500 shrink-0" />}
                  <span className="text-[0.8125rem] flex-1">{q.question}</span>
                  <span className="text-[0.625rem] text-muted-foreground/40 shrink-0">{q.timeMinutes} мин</span>
                  {done && <span className="text-[0.625rem] font-bold text-teal-600">{done.score}/10</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active question / evaluation
  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        {/* Timer header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => {
            if (evaluating) return; // prevent leaving during AI evaluation
            setCurrentQ(null);
            setTimerActive(false);
            setEvalError(null);
            setTimeExpired(false);
          }} disabled={evaluating} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4 rotate-180" /> Назад
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.8125rem] font-mono font-semibold ${timeExpired ? "bg-red-100 text-red-600 dark:bg-red-900/30" : timeWarning ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30" : "bg-muted text-foreground"}`}>
            <Clock className="w-3.5 h-3.5" />
            {timeExpired ? "Время!" : timeDisplay}
          </div>
        </div>

        {/* Question */}
        <div className="bg-card rounded-2xl border border-border/40 p-6 mb-4">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.625rem] font-medium mb-3 ${INTERVIEW_TYPES[currentQ.type].bg} ${INTERVIEW_TYPES[currentQ.type].color}`}>
            {INTERVIEW_TYPES[currentQ.type].label}
          </span>
          <p className="text-[0.9375rem] font-medium leading-relaxed">{currentQ.question}</p>
          {showHints && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-400 mb-1">Подсказки:</p>
              <ul className="text-[0.75rem] text-amber-600/80 dark:text-amber-400/80 space-y-0.5">
                {currentQ.hints.map((h, i) => <li key={i}>- {h}</li>)}
              </ul>
            </motion.div>
          )}
        </div>

        {!evalResult ? (
          <>
            {/* Time expired banner */}
            {timeExpired && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-[0.8125rem] text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span><strong>Время вышло!</strong> Вы можете дописать ответ и всё равно отправить на оценку.</span>
              </motion.div>
            )}
            {/* Answer area */}
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Напишите ваш ответ здесь... Структурируйте мысли, используйте фреймворки (STAR, JTBD, RICE, North Star и др.)."
              className="w-full min-h-[200px] p-4 bg-card rounded-2xl border border-border/40 text-[0.875rem] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 dark:bg-slate-800 dark:border-slate-700"
            />
            {/* Error state */}
            {evalError && (
              <div className="mt-3 flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[0.8125rem] text-red-700 dark:text-red-400">{evalError}</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setShowHints(!showHints)} className="text-[0.75rem] text-amber-600 hover:text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {showHints ? "Скрыть подсказки" : "Показать подсказки"}
              </button>
              <button onClick={submitAnswer} disabled={answer.trim().length < 150 || evaluating} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {evaluating ? <><Loader2 className="w-4 h-4 animate-spin" /> Оцениваю...</> : <><Award className="w-4 h-4" /> Отправить на оценку</>}
              </button>
            </div>
            <p className={`text-[0.625rem] mt-2 text-right transition-colors ${answer.trim().length >= 150 ? "text-emerald-500" : "text-muted-foreground/40"}`}>
              {answer.trim().length} символов (мин. 150 для осмысленного ответа)
            </p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-5 mb-4 text-white text-center">
              <div className="text-4xl font-bold mb-1">{evalResult.overallScore}/10</div>
              <p className="text-white/70 text-[0.8125rem]">{evalResult.summary}</p>
            </div>
            {/* Criteria */}
            <div className="bg-card rounded-2xl border border-border/40 p-5 mb-4">
              <h3 className="text-[0.8125rem] font-semibold mb-3">Детальная оценка</h3>
              <div className="space-y-2.5">
                {Object.entries(evalResult.criteria || {}).map(([key, c]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.75rem] font-medium capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-[0.75rem] font-bold">{c.score}/10</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${c.score >= 7 ? "bg-emerald-500" : c.score >= 5 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${c.score * 10}%` }} />
                    </div>
                    <p className="text-[0.6875rem] text-muted-foreground">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <h4 className="text-[0.75rem] font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Сильные стороны</h4>
                <ul className="space-y-1">{evalResult.strengths.map((s, i) => <li key={i} className="text-[0.6875rem] text-emerald-600/80 dark:text-emerald-400/80">+ {s}</li>)}</ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                <h4 className="text-[0.75rem] font-semibold text-amber-700 dark:text-amber-400 mb-2">Что улучшить</h4>
                <ul className="space-y-1">{evalResult.improvements.map((s, i) => <li key={i} className="text-[0.6875rem] text-amber-600/80 dark:text-amber-400/80">- {s}</li>)}</ul>
              </div>
            </div>
            {evalResult.sampleAnswer && (
              <div className="bg-card rounded-xl border border-border/40 p-4 mb-4">
                <h4 className="text-[0.75rem] font-semibold mb-2 text-violet-600">Пример сильного ответа</h4>
                <p className="text-[0.75rem] text-muted-foreground leading-relaxed">{evalResult.sampleAnswer}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setCurrentQ(null); setEvalResult(null); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-muted/50 rounded-xl text-[0.8125rem] font-medium hover:bg-muted transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Другой вопрос
              </button>
              <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-[0.8125rem] font-medium hover:from-teal-600 hover:to-emerald-600 transition-all">
                Готово
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}