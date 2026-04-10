import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  GraduationCap, Users, Target, Layers, Rocket, Award,
  ChevronDown, Lightbulb, TrendingUp, Search, MessageSquare,
  BarChart3, Brain, BookOpen, Star, CheckCircle2,
  Sparkles, Shield, Puzzle, Compass, Zap, Trophy,
  FileText, Bot, BookMarked, Repeat, LayoutDashboard,
  ArrowRight, Play, Quote, ThumbsUp,
  Clock, MousePointerClick, Gamepad2, Flame,
  Moon, Command, CalendarDays, MessageCircle, Briefcase,
  Layout, Swords, FlaskConical
} from "lucide-react";
import { courseModules } from "./course-data";

/* ── helpers ──────────────────────────────────────────────── */

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-border/30 px-5 py-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{value}</p>
      <p className="text-[0.75rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function FeatureTag({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-border/40 px-3 py-2 text-[0.8125rem] text-foreground shadow-sm">
      <span className="text-teal-600 dark:text-teal-400 shrink-0">{icon}</span>
      {text}
    </div>
  );
}

function AudienceCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-md transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:from-teal-100 group-hover:to-emerald-100 dark:group-hover:from-teal-900/50 dark:group-hover:to-emerald-900/50 transition-colors">
          {icon}
        </div>
        <h4 className="text-[0.9375rem] font-semibold">{title}</h4>
      </div>
      <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── review data ──────────────────────────────────────────── */

const reviews = [
  {
    name: "Алексей К.",
    role: "Product Manager, fintech-стартап",
    text: "Курс дал мне системную базу, которой не хватало после 2 лет работы. PM-Коуч разобрал мой реальный кейс с churn — сразу понял, что делать.",
    rating: 5,
    avatar: "А",
    color: "bg-teal-500",
  },
  {
    name: "Мария С.",
    role: "Основатель EdTech-стартапа",
    text: "Благодаря курсу переосмыслила подход к продукту. Capstone-проект помог оформить портфолио. Стейкхолдер-симуляция — как реальный питч инвестору.",
    rating: 5,
    avatar: "М",
    color: "bg-emerald-500",
  },
  {
    name: "Дмитрий В.",
    role: "UX-дизайнер, ex-Яндекс",
    text: "Как дизайнеру мне было важно понять продуктовую логику. Adaptive Learning подобрал программу под мой уровень. Spaced repetition и стрик-календарь — огненные фичи.",
    rating: 5,
    avatar: "Д",
    color: "bg-slate-600",
  },
  {
    name: "Елена Р.",
    role: "Product Lead, B2B SaaS",
    text: "Финальный экзамен с AI-проверкой кейсов — это что-то новое. Peer Learning позволяет видеть инсайты других студентов. Рекомендую всем в команде.",
    rating: 5,
    avatar: "Е",
    color: "bg-cyan-600",
  },
  {
    name: "Артём Н.",
    role: "Junior PM, переход из разработки",
    text: "Перешёл в продакт из бэкенд-разработки. Диагностический квиз определил мой уровень, а Roadmap показал, что учить дальше. Глоссарий и карточки — must have.",
    rating: 5,
    avatar: "А",
    color: "bg-emerald-600",
  },
  {
    name: "Ольга П.",
    role: "CPO, маркетплейс",
    text: "Использую как пособие для онбординга PM. PM-Коуч генерирует Lean Canvas и RICE-таблицы под конкретный кейс — экономит часы работы. Тёмная тема — отдельный кайф.",
    rating: 5,
    avatar: "О",
    color: "bg-amber-500",
  },
];

const socialProof = [
  { value: "4.8/5", label: "средняя оценка" },
  { value: "92%", label: "дошли до сертификата" },
  { value: "87%", label: "применяют на практике" },
];

/* ── accordion section ────────────────────────────────────── */

interface AccordionItem {
  id: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

function AccordionSection({ item, isOpen, onToggle }: { item: AccordionItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        isOpen
          ? "border-teal-200/80 dark:border-teal-700/60 shadow-md shadow-teal-500/[0.06] bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-800/80"
          : "border-border/40 bg-white dark:bg-slate-800 hover:border-teal-200/60 dark:hover:border-teal-700/40 hover:shadow-sm"
      }`}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 sm:p-5 text-left group">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
          isOpen ? `bg-gradient-to-br ${item.gradient} text-white shadow-lg shadow-teal-500/20` : item.iconBg
        }`}>
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[0.9375rem] font-semibold leading-tight">{item.title}</h3>
          <p className="text-[0.75rem] text-muted-foreground leading-relaxed mt-0.5 line-clamp-1">{item.subtitle}</p>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="shrink-0">
          <ChevronDown className={`w-4.5 h-4.5 transition-colors ${isOpen ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/40"}`} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-1">
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-5" />
              {item.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── main landing ─────────────────────────────────────────── */

interface CourseLandingProps {
  onStart: () => void;
}

export function CourseLanding({ onStart }: CourseLandingProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["about"]));
  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const totalQuizzes = courseModules.reduce((a, m) => a + m.lessons.filter(l => l.quiz && l.quiz.length > 0).length, 0);

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* accordion items */
  const sections: AccordionItem[] = [
    {
      id: "about",
      icon: <Compass className="w-5 h-5" />,
      gradient: "from-teal-600 to-emerald-600",
      iconBg: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
      title: "О чём этот курс",
      subtitle: "Фундаментальные знания и практические навыки продакт-менеджмента",
      content: (
        <div className="space-y-5">
          <p className="text-[0.875rem] text-foreground leading-relaxed">
            Это комплексный курс по продакт-менеджменту, который охватывает весь путь создания продукта — от поиска потребности клиента до масштабирования. Курс построен на реальных фреймворках, исследованиях и кейсах из практики ведущих компаний.
          </p>
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-teal-100/60 dark:border-teal-800/30">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.8125rem] font-semibold mb-1">Ключевая идея курса</p>
                <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
                  70-90% стартапов проваливаются, главная причина — продукт не нужен клиенту. Этот курс учит строить продукты, которые решают реальные потребности, через системный подход: гипотезы, исследования, эксперименты и данные.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "audience",
      icon: <Users className="w-5 h-5" />,
      gradient: "from-emerald-600 to-teal-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      title: "Для кого этот курс",
      subtitle: "Продакт-менеджеры, основатели, UX-специалисты и все, кто строит продукты",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AudienceCard icon={<Rocket className="w-4 h-4" />} title="Начинающие продакты" description="Хотите войти в продакт-менеджмент и получить системную базу знаний — от JTBD до приоритизации фич" />
            <AudienceCard icon={<TrendingUp className="w-4 h-4" />} title="Опытные PM" description="Хотите структурировать знания, освоить новые фреймворки и подготовиться к собеседованиям" />
            <AudienceCard icon={<Sparkles className="w-4 h-4" />} title="Основатели стартапов" description="Строите продукт и хотите избежать типичных ошибок — от преждевременного масштабирования до SISP" />
            <AudienceCard icon={<Puzzle className="w-4 h-4" />} title="Дизайнеры и аналитики" description="Работаете рядом с продуктовой командой и хотите глубже понимать продуктовую логику" />
          </div>
          <div className="bg-amber-50/80 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100/60 dark:border-amber-800/20">
            <p className="text-[0.8125rem] text-amber-900 dark:text-amber-300 leading-relaxed flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span><b>Не требуется</b> предварительный опыт в продакт-менеджменте. Диагностический квиз определит ваш уровень и подберёт персональную программу.</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "skills",
      icon: <Brain className="w-5 h-5" />,
      gradient: "from-slate-700 to-slate-800",
      iconBg: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
      title: "Чему вы научитесь",
      subtitle: "Практические навыки для создания успешных продуктов",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
          {[
            "Находить сегмент с реальной потребностью",
            "Проводить JTBD и проблемные интервью",
            "Формулировать и проверять гипотезы (RAT, HADI)",
            "Считать Transaction Cost и снижать его",
            "Применять OODA-цикл для быстрых решений",
            "Искать Product/Market Fit (тест Шона Эллиса)",
            "Приоритизировать фичи по RICE и ROI",
            "Анализировать рынок (SWOT, PEST, TAM/SAM/SOM)",
            "Проводить UX-тесты и A/B-эксперименты",
            "Создавать прототипы и User Flow",
            "Работать с метриками (LTV, CAC, ARPU, NPS)",
            "Управлять командой по Scrum, Kanban, OKR",
            "Строить воронки и растить конверсию",
            "Рассчитывать юнит-экономику и ценообразование",
            "Составлять PRD, Design Docs и Go-to-Market план",
            "Составлять CJM и карты эмпатии",
          ].map((skill, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <span className="text-[0.8125rem] text-foreground leading-relaxed">{skill}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "structure",
      icon: <Layers className="w-5 h-5" />,
      gradient: "from-cyan-600 to-teal-600",
      iconBg: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
      title: "Структура курса",
      subtitle: `${courseModules.length} модулей — от потребности клиента до прототипирования и лидерства`,
      content: (
        <div className="space-y-4">
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
            Курс разбит на тематические модули. Каждый содержит теорию, примеры, тесты и практику:
          </p>
          <div className="space-y-1.5">
            {[
              { block: "Фундамент", modules: "1-5", desc: "Потребность клиента, Transaction Cost, гипотезы, RAT, OODA-цикл", color: "bg-teal-500" },
              { block: "Исследования", modules: "6-11", desc: "JTBD, типы интервью, поиск сегментов, рекрутинг респондентов", color: "bg-emerald-500" },
              { block: "Продукт", modules: "12-15", desc: "Product/Market Fit, воронки роста, UX-тесты, приоритизация", color: "bg-slate-500" },
              { block: "Стратегия и OKR", modules: "16-17, 35", desc: "Жизненный цикл, SWOT, PEST, TAM/SAM/SOM, OKR для продуктовых команд", color: "bg-cyan-500" },
              { block: "Прототипирование и UX", modules: "18-22", desc: "UX/UI дизайн, User Flow, AI-инструменты, SQL/API, Agile/Scrum", color: "bg-amber-500" },
              { block: "Рост и аналитика", modules: "23-32", desc: "Growth, аналитика, PMF-поиск, A/B-тесты, retention", color: "bg-violet-500" },
              { block: "Экономика и GTM", modules: "33-34, 36", desc: "Ценообразование, юнит-экономика, Go-to-Market стратегия", color: "bg-rose-500" },
              { block: "Документация и Legacy", modules: "37-38", desc: "PRD, Design Docs, работа с Legacy-продуктами", color: "bg-indigo-500" },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-3.5">
                <div className={`w-1 self-stretch rounded-full ${b.color} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[0.8125rem] font-semibold">{b.block}</span>
                    <span className="text-[0.6875rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">модули {b.modules}</span>
                  </div>
                  <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-teal-100/60 dark:border-teal-800/30 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
            <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
              <b className="text-foreground">Финальный экзамен</b> — 30 тестовых вопросов и 4 бизнес-кейса с AI-проверкой. Таймер на 60 минут, оценка по 5 критериям.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "coach",
      icon: <Sparkles className="w-5 h-5" />,
      gradient: "from-teal-500 to-emerald-500",
      iconBg: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
      title: "PM-Коуч — AI-наставник",
      subtitle: "Разбор кейсов, стейкхолдер-симуляция, генерация артефактов",
      content: (
        <div className="space-y-4">
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
            Персональный AI-коуч, который работает по сократовскому методу — задаёт вопросы, помогает самостоятельно найти решение, а затем выдаёт структурированный разбор.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <MessageCircle className="w-4 h-4" />, title: "Разбор кейса", desc: "Опишите продукт и задачу — получите фреймворки, план действий и North Star метрику" },
              { icon: <Swords className="w-4 h-4" />, title: "Стейкхолдер-симуляция", desc: "Защитите решение перед CEO, CTO, инвестором или Head of Sales — как на реальной встрече" },
              { icon: <Layout className="w-4 h-4" />, title: "Артефакты", desc: "Lean Canvas, RICE-таблица, CJM и Impact Map — заполненные под ваш конкретный кейс" },
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">{f.icon}</div>
                  <span className="text-[0.8125rem] font-semibold">{f.title}</span>
                </div>
                <p className="text-[0.75rem] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "interactive",
      icon: <Gamepad2 className="w-5 h-5" />,
      gradient: "from-emerald-600 to-cyan-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      title: "Интерактивная практика",
      subtitle: "Симуляторы, ежедневные челленджи, чат-кейсы и capstone-проекты",
      content: (
        <div className="space-y-4">
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
            Теория без практики не работает. Курс включает 4 типа интерактивных тренажёров:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: <FlaskConical className="w-4 h-4" />, title: "Проект-симулятор", desc: "4 реалистичных сценария: управляйте продуктом, принимайте решения, работайте с метриками", color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30" },
              { icon: <MessageSquare className="w-4 h-4" />, title: "Чат-симуляция", desc: "Тренируйте переговоры с клиентами и стейкхолдерами в формате реального чата", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30" },
              { icon: <Zap className="w-4 h-4" />, title: "Ежедневный челлендж", desc: "Каждый день — новое продуктовое задание, которое помогает поддерживать навык", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" },
              { icon: <Briefcase className="w-4 h-4" />, title: "Capstone-проекты", desc: "4 больших проекта для портфолио: от MVP-гипотезы до стратегии масштабирования", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" },
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${f.color}`}>{f.icon}</div>
                  <span className="text-[0.8125rem] font-semibold">{f.title}</span>
                </div>
                <p className="text-[0.75rem] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "features",
      icon: <Rocket className="w-5 h-5" />,
      gradient: "from-emerald-600 to-green-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      title: "Платформа и инструменты",
      subtitle: "AI-помощник, геймификация, адаптивное обучение, тёмная тема и 20+ инструментов",
      content: (
        <div className="space-y-5">
          <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
            Это полноценная обучающая платформа с 20+ интерактивными инструментами:
          </p>
          <div className="flex flex-wrap gap-2">
            <FeatureTag icon={<Bot className="w-3.5 h-3.5" />} text="AI-ассистент (сова)" />
            <FeatureTag icon={<Sparkles className="w-3.5 h-3.5" />} text="PM-Коуч" />
            <FeatureTag icon={<Brain className="w-3.5 h-3.5" />} text="Adaptive Learning" />
            <FeatureTag icon={<Users className="w-3.5 h-3.5" />} text="Peer Learning" />
            <FeatureTag icon={<Repeat className="w-3.5 h-3.5" />} text="Spaced Repetition (SM-2)" />
            <FeatureTag icon={<FileText className="w-3.5 h-3.5" />} text="Заметки к урокам" />
            <FeatureTag icon={<BookMarked className="w-3.5 h-3.5" />} text="Закладки" />
            <FeatureTag icon={<Search className="w-3.5 h-3.5" />} text="Глоссарий" />
            <FeatureTag icon={<BarChart3 className="w-3.5 h-3.5" />} text="График прогресса" />
            <FeatureTag icon={<Award className="w-3.5 h-3.5" />} text="15+ бейджей" />
            <FeatureTag icon={<Flame className="w-3.5 h-3.5" />} text="Streak Calendar" />
            <FeatureTag icon={<Clock className="w-3.5 h-3.5" />} text="Помодоро-таймер" />
            <FeatureTag icon={<Command className="w-3.5 h-3.5" />} text="Command Palette (⌘K)" />
            <FeatureTag icon={<Moon className="w-3.5 h-3.5" />} text="Тёмная тема" />
            <FeatureTag icon={<LayoutDashboard className="w-3.5 h-3.5" />} text="Leaderboard" />
            <FeatureTag icon={<GraduationCap className="w-3.5 h-3.5" />} text="Сертификат" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[0.8125rem] font-semibold">Adaptive Learning</span>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
                Диагностический квиз из 17 ситуационных кейсов определяет ваш уровень и строит персональный маршрут обучения.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[0.8125rem] font-semibold">Peer Learning</span>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
                Комментарии, инсайты и вопросы под каждым уроком. Учитесь вместе — лайкайте лучшие идеи других студентов.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[0.8125rem] font-semibold">Геймификация</span>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
                Система каштанов с 9 уровнями, 15+ бейджей, стрик-календарь и лидерборд — учиться интересно и мотивирующе.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[0.8125rem] font-semibold">AI-ассистент</span>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
                Сова-маскот ответит на вопросы по теме урока, поможет разобраться в сложных концепциях и даст примеры.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  /* ── render ─────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* bg decorations */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/80 dark:from-teal-950/30 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-teal-200/30 dark:from-teal-800/20 via-emerald-100/20 dark:via-emerald-900/10 to-transparent blur-3xl -translate-y-1/2" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-emerald-100/20 dark:bg-emerald-900/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            {/* badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-teal-200/60 dark:border-teal-700/40 rounded-full text-[0.8125rem] font-medium text-teal-700 dark:text-teal-300 mb-8 shadow-sm">
              <Zap className="w-4 h-4" />
              {courseModules.length} модулей &middot; {totalLessons} уроков &middot; {totalQuizzes}+ тестов &middot; AI-коуч
            </div>

            {/* title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.1]">
              Полный курс по
              <span className="block bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-500 bg-clip-text text-transparent">
                продакт-менеджменту
              </span>
            </h1>

            {/* subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              От Customer Discovery до масштабирования. AI-коуч, стейкхолдер-симуляция, capstone-проекты, 200+ интерактивных упражнений и сертификат.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <button
                onClick={onStart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl text-[1rem] font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 group"
              >
                <Play className="w-5 h-5 fill-current" />
                Начать обучение
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a
                href="#program"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-slate-800 border border-border/60 text-foreground rounded-2xl text-[0.9375rem] font-medium hover:bg-muted/50 dark:hover:bg-slate-700 transition-all shadow-sm"
              >
                <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                Программа курса
              </a>
            </div>

            {/* social proof mini strip */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {socialProof.map((item, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-bold text-foreground tabular-nums">{item.value}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────────── */}
      <FadeInSection>
        <section className="max-w-4xl mx-auto px-6 -mt-4 mb-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={`${courseModules.length}`} label="модулей" icon={<Layers className="w-5 h-5" />} />
            <StatCard value={`${totalLessons}`} label="уроков" icon={<BookOpen className="w-5 h-5" />} />
            <StatCard value="200+" label="интерактивных блоков" icon={<Gamepad2 className="w-5 h-5" />} />
            <StatCard value="20+" label="инструментов" icon={<Rocket className="w-5 h-5" />} />
          </div>
        </section>
      </FadeInSection>

      {/* ─── PM COACH HIGHLIGHT ───────────────────────────── */}
      <FadeInSection>
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <div className="relative bg-gradient-to-br from-slate-50 to-teal-50/50 dark:from-slate-800 dark:to-teal-900/20 rounded-3xl border border-teal-100/60 dark:border-teal-800/30 p-8 sm:p-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-teal-200/20 dark:bg-teal-800/10 blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-[0.75rem] font-medium mb-5">
                <Sparkles className="w-3.5 h-3.5" /> Новое
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">PM-Коуч</h2>
                  <p className="text-[0.9375rem] text-muted-foreground leading-relaxed mb-5">
                    AI-наставник, который разберёт ваш реальный продуктовый кейс. Сократовские вопросы, структурированный анализ, ролевые переговоры со стейкхолдерами и готовые артефакты.
                  </p>
                  <div className="space-y-2.5">
                    {[
                      "Разбор кейса с фреймворками и планом действий",
                      "Стейкхолдер-симуляция: CEO, CTO, инвестор, Sales",
                      "Генерация Lean Canvas, RICE, CJM, Impact Map",
                      "Привязка к урокам курса для глубокого изучения",
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <span className="text-[0.8125rem] text-foreground leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: MessageCircle, label: "Сократовский диалог", desc: "Коуч задаёт наводящие вопросы", color: "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" },
                    { icon: Swords, label: "Питч стейкхолдерам", desc: "4 роли с разными приоритетами", color: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300" },
                    { icon: Layout, label: "Готовые артефакты", desc: "Визуальные шаблоны под ваш кейс", color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3.5 bg-white dark:bg-slate-800 rounded-xl border border-border/40 p-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[0.8125rem] font-semibold">{item.label}</p>
                          <p className="text-[0.6875rem] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ─── IMAGE STRIP ──────────────────────────────────── */}
      <FadeInSection>
        <section className="max-w-5xl mx-auto px-6 mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl overflow-hidden">
            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1564406284435-c53cd4bbfa8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHdvcmtpbmclMjBsYXB0b3AlMjBjb2ZmZWUlMjBzaG9wfGVufDF8fHx8MTc3MzA3OTc4Mnww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Продакт-менеджер за работой"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-[0.75rem] font-semibold">Практика</p>
                <p className="text-[0.6875rem] text-white/70">Реальные навыки PM</p>
              </div>
            </div>
            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1762784574847-16c5100cd1ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwYnJhaW5zdG9ybWluZyUyMHdoaXRlYm9hcmQlMjBtb2Rlcm4lMjBvZmZpY2V8ZW58MXx8fHwxNzczMDgxMTU2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Команда на встрече"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-[0.75rem] font-semibold">Интервью</p>
                <p className="text-[0.6875rem] text-white/70">JTBD и Customer Discovery</p>
              </div>
            </div>
            <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1711097383282-28097ae16b1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwY2hhcnRzJTIwbGFwdG9wJTIwc2NyZWVuJTIwd29ya3NwYWNlfGVufDF8fHx8MTc3MzA3OTc4M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Аналитика продукта"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-[0.75rem] font-semibold">Метрики</p>
                <p className="text-[0.6875rem] text-white/70">LTV, CAC, воронки</p>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ─── PROGRAM (ACCORDION) ──────────────────────────── */}
      <FadeInSection>
        <section id="program" className="max-w-3xl mx-auto px-6 mb-20 scroll-mt-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-[0.75rem] font-medium mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              Подробнее о курсе
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Программа и возможности</h2>
            <p className="text-muted-foreground text-[0.9375rem] max-w-lg mx-auto">
              Нажмите на любой блок, чтобы узнать подробнее
            </p>
          </div>
          <div className="space-y-2.5">
            {sections.map(s => (
              <AccordionSection key={s.id} item={s} isOpen={openSections.has(s.id)} onToggle={() => toggle(s.id)} />
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* ─── WHAT YOU GET ─────────────────────────────────── */}
      <FadeInSection>
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-[0.75rem] font-medium mb-4">
              <Award className="w-3.5 h-3.5" />
              Результат
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Что вы получите</h2>
            <p className="text-muted-foreground text-[0.9375rem] max-w-lg mx-auto">
              Системные знания, портфолио проектов, навыки переговоров и сертификат
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: <GraduationCap className="w-6 h-6" />, title: "Системная база", desc: "Полное понимание продуктового процесса — от Customer Discovery до масштабирования", color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30" },
              { icon: <Briefcase className="w-6 h-6" />, title: "Портфолио", desc: "4 capstone-проекта + разборы PM-Коуча с артефактами для собеседований", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" },
              { icon: <Swords className="w-6 h-6" />, title: "Навык питча", desc: "Практика защиты решений перед CEO, CTO, инвестором и Head of Sales", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30" },
              { icon: <Trophy className="w-6 h-6" />, title: "Сертификат", desc: "Именной сертификат с результатом финального экзамена из 34 заданий", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mx-auto mb-4`}>
                  {item.icon}
                </div>
                <h4 className="text-[1rem] font-semibold mb-2">{item.title}</h4>
                <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* ─── REVIEWS / SOCIAL PROOF ───────────────────────── */}
      <FadeInSection>
        <section className="max-w-5xl mx-auto px-6 mb-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-[0.75rem] font-medium mb-4">
              <ThumbsUp className="w-3.5 h-3.5" />
              Отзывы
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Что говорят студенты</h2>
            <p className="text-muted-foreground text-[0.9375rem] max-w-lg mx-auto">
              Реальные отзывы от продакт-менеджеров, основателей и дизайнеров
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: review.rating }).map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* quote */}
                <div className="flex-1 mb-4">
                  <Quote className="w-4 h-4 text-teal-200 dark:text-teal-700 mb-1" />
                  <p className="text-[0.8125rem] text-foreground leading-relaxed">{review.text}</p>
                </div>

                {/* author */}
                <div className="flex items-center gap-3 pt-3 border-t border-border/30">
                  <div className={`w-9 h-9 rounded-full ${review.color} flex items-center justify-center text-white text-[0.8125rem] font-bold shrink-0`}>
                    {review.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-semibold truncate">{review.name}</p>
                    <p className="text-[0.6875rem] text-muted-foreground truncate">{review.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* trust bar */}
          <div className="mt-8 bg-gradient-to-r from-teal-50/80 to-emerald-50/80 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-100/40 dark:border-teal-800/30 p-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            {socialProof.map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-foreground tabular-nums">{item.value}</p>
                <p className="text-[0.75rem] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* ─── FINAL CTA ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <FadeInSection>
          <div className="relative bg-gradient-to-br from-teal-600 via-emerald-700 to-cyan-600 rounded-3xl p-8 sm:p-12 text-white overflow-hidden">
            {/* bg glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-6">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Готовы начать?</h2>
              <p className="text-white/70 text-[0.9375rem] max-w-md mx-auto mb-8 leading-relaxed">
                Прогресс сохраняется автоматически. AI-коуч, адаптивная программа, симуляторы и 200+ интерактивных упражнений — всё включено.
              </p>
              <button
                onClick={onStart}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-teal-700 rounded-2xl text-[1rem] font-semibold hover:bg-teal-50 transition-all shadow-xl shadow-black/10 hover:-translate-y-0.5 group"
              >
                <Play className="w-5 h-5 fill-teal-700" />
                Начать обучение бесплатно
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <p className="mt-4 text-[0.75rem] text-white/40">24 часа бесплатно</p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.75rem] text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-foreground">Продакт-менеджмент</span>
          </div>
          <p>{courseModules.length} модулей &middot; {totalLessons} уроков &middot; 20+ инструментов &middot; AI-коуч</p>
        </div>
      </footer>
    </div>
  );
}