import { useState } from "react";
import {
  Rocket, Zap, Star, Award, Target, GraduationCap, BookOpen,
  Shield, Crown, Flame, Trophy, Heart, Sparkles, Brain,
  Calculator, GitBranch, PenLine, TrendingUp, Gamepad2,
  Lock, ArrowRight, ChevronRight, ChevronDown, Play,
  Search, Bookmark, Check, X, Copy, Download,
  Sun, Moon, Bell, Settings, User, Menu, Home,
  BarChart3, Map, List, Filter, Plus, Minus,
  CheckCircle2, XCircle, AlertTriangle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DarkModeToggle } from "./dark-mode";

// ===== Section wrapper =====
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-[0.8125rem] text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ColorSwatch({ name, value, className }: { name: string; value: string; className: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="group text-left"
    >
      <div className={`w-full h-16 rounded-xl border border-border/30 shadow-sm ${className} transition-transform group-hover:scale-[1.03]`} />
      <p className="text-[0.6875rem] font-semibold mt-1.5 text-foreground truncate">{name}</p>
      <p className="text-[0.625rem] text-muted-foreground font-mono truncate">{copied ? "Copied!" : value}</p>
    </button>
  );
}

// ===== Main UI Kit =====
export function UIKit({ isDark, onToggleDark, onClose }: { isDark: boolean; onToggleDark: () => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "buttons" | "cards" | "inputs" | "badges" | "states" | "misc">("colors");

  const tabs = [
    { id: "colors" as const, label: "Цвета" },
    { id: "typography" as const, label: "Типографика" },
    { id: "buttons" as const, label: "Кнопки" },
    { id: "cards" as const, label: "Карточки" },
    { id: "inputs" as const, label: "Инпуты" },
    { id: "badges" as const, label: "Бейджи" },
    { id: "states" as const, label: "Состояния" },
    { id: "misc" as const, label: "Разное" },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-[960px] max-h-[90vh] bg-background rounded-2xl border border-border/60 shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">UI Kit</h1>
              <p className="text-[0.6875rem] text-muted-foreground">Компоненты и стили платформы</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border/30 overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "colors" && <ColorsSection />}
          {activeTab === "typography" && <TypographySection />}
          {activeTab === "buttons" && <ButtonsSection />}
          {activeTab === "cards" && <CardsSection />}
          {activeTab === "inputs" && <InputsSection />}
          {activeTab === "badges" && <BadgesSection />}
          {activeTab === "states" && <StatesSection />}
          {activeTab === "misc" && <MiscSection isDark={isDark} onToggleDark={onToggleDark} />}
        </div>
      </motion.div>
    </div>
  );
}

// ===== Colors =====
function ColorsSection() {
  return (
    <>
      <Section title="Основная палитра" description="CSS-переменные из theme.css — адаптируются к светлой/тёмной теме">
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          <ColorSwatch name="Background" value="var(--background)" className="bg-background" />
          <ColorSwatch name="Foreground" value="var(--foreground)" className="bg-foreground" />
          <ColorSwatch name="Card" value="var(--card)" className="bg-card" />
          <ColorSwatch name="Primary" value="var(--primary)" className="bg-primary" />
          <ColorSwatch name="Secondary" value="var(--secondary)" className="bg-secondary" />
          <ColorSwatch name="Muted" value="var(--muted)" className="bg-muted" />
          <ColorSwatch name="Accent" value="var(--accent)" className="bg-accent" />
          <ColorSwatch name="Destructive" value="var(--destructive)" className="bg-destructive" />
          <ColorSwatch name="Border" value="var(--border)" className="bg-border" />
          <ColorSwatch name="Ring" value="var(--ring)" className="bg-ring" />
          <ColorSwatch name="Sidebar" value="var(--sidebar)" className="bg-sidebar" />
          <ColorSwatch name="Sidebar Accent" value="var(--sidebar-accent)" className="bg-sidebar-accent" />
        </div>
      </Section>

      <Section title="Teal / Emerald / Cyan" description="Основная цветовая гамма платформы">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {[
            { shade: "50", cls: "bg-teal-50" },
            { shade: "100", cls: "bg-teal-100" },
            { shade: "200", cls: "bg-teal-200" },
            { shade: "300", cls: "bg-teal-300" },
            { shade: "400", cls: "bg-teal-400" },
            { shade: "500", cls: "bg-teal-500" },
            { shade: "600", cls: "bg-teal-600" },
            { shade: "700", cls: "bg-teal-700" },
            { shade: "800", cls: "bg-teal-800" },
            { shade: "900", cls: "bg-teal-900" },
          ].map(c => (
            <div key={`teal-${c.shade}`}>
              <div className={`h-10 rounded-lg ${c.cls}`} />
              <p className="text-[0.5rem] text-muted-foreground text-center mt-1">teal-{c.shade}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mt-3">
          {[
            { shade: "50", cls: "bg-emerald-50" },
            { shade: "100", cls: "bg-emerald-100" },
            { shade: "200", cls: "bg-emerald-200" },
            { shade: "300", cls: "bg-emerald-300" },
            { shade: "400", cls: "bg-emerald-400" },
            { shade: "500", cls: "bg-emerald-500" },
            { shade: "600", cls: "bg-emerald-600" },
            { shade: "700", cls: "bg-emerald-700" },
            { shade: "800", cls: "bg-emerald-800" },
            { shade: "900", cls: "bg-emerald-900" },
          ].map(c => (
            <div key={`emerald-${c.shade}`}>
              <div className={`h-10 rounded-lg ${c.cls}`} />
              <p className="text-[0.5rem] text-muted-foreground text-center mt-1">em-{c.shade}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mt-3">
          {[
            { shade: "50", cls: "bg-slate-50" },
            { shade: "100", cls: "bg-slate-100" },
            { shade: "200", cls: "bg-slate-200" },
            { shade: "300", cls: "bg-slate-300" },
            { shade: "400", cls: "bg-slate-400" },
            { shade: "500", cls: "bg-slate-500" },
            { shade: "600", cls: "bg-slate-600" },
            { shade: "700", cls: "bg-slate-700" },
            { shade: "800", cls: "bg-slate-800" },
            { shade: "900", cls: "bg-slate-900" },
          ].map(c => (
            <div key={`slate-${c.shade}`}>
              <div className={`h-10 rounded-lg ${c.cls}`} />
              <p className="text-[0.5rem] text-muted-foreground text-center mt-1">sl-{c.shade}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Акцентные цвета" description="Для бейджей, уведомлений и геймификации">
        <div className="grid grid-cols-6 gap-3">
          <ColorSwatch name="Amber-500" value="#f59e0b" className="bg-amber-500" />
          <ColorSwatch name="Orange-500" value="#f97316" className="bg-orange-500" />
          <ColorSwatch name="Red-500" value="#ef4444" className="bg-red-500" />
          <ColorSwatch name="Pink-500" value="#ec4899" className="bg-pink-500" />
          <ColorSwatch name="Violet-500" value="#8b5cf6" className="bg-violet-500" />
          <ColorSwatch name="Cyan-500" value="#06b6d4" className="bg-cyan-500" />
        </div>
      </Section>

      <Section title="Градиенты" description="Используемые градиенты в карточках и фонах">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="h-20 rounded-xl bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50 border border-border/30" />
            <p className="text-[0.6875rem] font-medium mt-1.5">WelcomeView / LessonView фон</p>
            <p className="text-[0.5625rem] text-muted-foreground font-mono">from-slate-200 via-slate-100 to-teal-100/50</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-gradient-to-br from-slate-400 via-slate-500 to-teal-500 border border-border/30" />
            <p className="text-[0.6875rem] font-medium mt-1.5">Карточка прогресса</p>
            <p className="text-[0.5625rem] text-muted-foreground font-mono">from-slate-400 via-slate-500 to-teal-500</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-800 dark:via-slate-800/80 dark:to-teal-900/30 border border-border/30" />
            <p className="text-[0.6875rem] font-medium mt-1.5">Карточки модулей</p>
            <p className="text-[0.5625rem] text-muted-foreground font-mono">from-slate-50 via-white to-teal-50/40</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 border border-border/30" />
            <p className="text-[0.6875rem] font-medium mt-1.5">CTA кнопка «Продолжить»</p>
            <p className="text-[0.5625rem] text-muted-foreground font-mono">from-teal-500 to-emerald-500</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-100/60 dark:border-amber-800/40" />
            <p className="text-[0.6875rem] font-medium mt-1.5">XP / Каштаны виджет</p>
            <p className="text-[0.5625rem] text-muted-foreground font-mono">from-amber-50/80 to-orange-50/60</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/20 border border-teal-200/60" />
            <p className="text-[0.6875rem] font-medium mt-1.5">Финальный экзамен</p>
            <p className="text-[0.5625rem] text-muted-foreground font-mono">from-teal-50 to-emerald-50</p>
          </div>
        </div>
      </Section>
    </>
  );
}

// ===== Typography =====
function TypographySection() {
  return (
    <>
      <Section title="Заголовки" description="Межстрочные Inter, tracking-tight на h1/h2">
        <div className="space-y-4 bg-card rounded-xl border border-border/40 p-6">
          <div className="border-b border-border/20 pb-3">
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">h1 — text-3xl / font-bold / tracking-tight</p>
            <h1 className="text-3xl font-bold tracking-tight">Продакт-менеджмент</h1>
          </div>
          <div className="border-b border-border/20 pb-3">
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">h2 — text-xl / font-semibold</p>
            <h2 className="text-xl font-semibold">Модули курса</h2>
          </div>
          <div className="border-b border-border/20 pb-3">
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">h3 — text-lg / font-semibold</p>
            <h3 className="text-lg font-semibold">Ключевые метрики</h3>
          </div>
          <div className="border-b border-border/20 pb-3">
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">h4 — text-base / font-semibold</p>
            <h4 className="text-base font-semibold">Unit-экономика продукта</h4>
          </div>
          <div className="border-b border-border/20 pb-3">
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">Body — text-[0.9375rem] / text-slate-700</p>
            <p className="text-[0.9375rem] text-slate-700 dark:text-slate-300 leading-relaxed">
              Продакт-менеджер — это человек, отвечающий за стратегию и развитие продукта. Он принимает решения на основе данных, пользовательских исследований и бизнес-целей.
            </p>
          </div>
          <div className="border-b border-border/20 pb-3">
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">Small / Caption — text-[0.75rem]</p>
            <p className="text-[0.75rem] text-muted-foreground">Пройдено 12 из 64 уроков • ~3ч 20м осталось</p>
          </div>
          <div>
            <p className="text-[0.625rem] text-muted-foreground/50 font-mono mb-1">Micro — text-[0.625rem]</p>
            <p className="text-[0.625rem] text-muted-foreground/50 uppercase tracking-wider font-medium">Модуль 3 • 8 уроков</p>
          </div>
        </div>
      </Section>

      <Section title="Форматирование текста" description="Стили из rich-content.tsx">
        <div className="bg-card rounded-xl border border-border/40 p-6 space-y-3">
          <p className="text-[0.9375rem] text-slate-700 dark:text-slate-300">
            Текст с <span className="font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1 py-0.5 rounded-md text-[0.875rem]">42%</span> подсветкой метрик и <span className="font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1 py-0.5 rounded-md text-[0.875rem]">$2.5M ARR</span> валют
          </p>
          <p className="text-[0.9375rem] text-slate-700 dark:text-slate-300">
            Поддержка <strong className="font-semibold text-foreground">жирного текста</strong> и <em className="italic text-teal-700 dark:text-teal-400">курсива</em>
          </p>
          <p className="text-[0.9375rem] text-slate-700 dark:text-slate-300">
            Инлайн-код: <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-[0.8125rem] font-mono">const cac = totalSpend / newUsers</code>
          </p>
          <blockquote className="border-l-4 border-teal-300 dark:border-teal-600 bg-teal-50/40 dark:bg-teal-900/20 pl-4 pr-4 py-3 rounded-r-lg">
            <p className="text-[0.9375rem] text-slate-600 dark:text-slate-300 italic">«Продукт, который решает реальную проблему, найдёт свою аудиторию» — цитата</p>
          </blockquote>
          <div className="flex items-center gap-3 py-3 px-4 bg-gradient-to-r from-slate-50/80 to-teal-50/40 dark:from-slate-800/80 dark:to-teal-900/30 rounded-xl border border-slate-100/60 dark:border-slate-700/60">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-teal-400 to-emerald-400" />
            <p className="text-[0.875rem] font-semibold text-foreground">Кейс-разделитель</p>
          </div>
        </div>
      </Section>
    </>
  );
}

// ===== Buttons =====
function ButtonsSection() {
  return (
    <>
      <Section title="Кнопки — Primary" description="Основные CTA кнопки">
        <div className="flex flex-wrap gap-3 items-center">
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium text-[0.875rem] hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-100 dark:shadow-teal-900/30 flex items-center gap-2">
            <Play className="w-4 h-4 fill-current" /> Продолжить
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-teal-500 text-white font-medium text-[0.875rem] hover:bg-teal-600 transition-all">
            Проверить
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-teal-500/90 text-white font-medium text-[0.875rem] opacity-50 cursor-not-allowed">
            Disabled
          </button>
        </div>
      </Section>

      <Section title="Кнопки — Secondary & Ghost">
        <div className="flex flex-wrap gap-3 items-center">
          <button className="px-4 py-2 rounded-xl bg-card border border-border/40 text-[0.8125rem] font-medium text-foreground hover:border-teal-200 hover:bg-muted/50 transition-all flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5" /> Закладка
          </button>
          <button className="px-4 py-2 rounded-xl bg-muted/50 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Фильтр
          </button>
          <button className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            Ghost
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </Section>

      <Section title="Кнопки — Pill / Tag">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full text-[0.75rem] font-medium">
            <Zap className="w-3 h-3" /> 10 модулей
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[0.6875rem] font-medium border border-amber-100/60 dark:border-amber-800/40">
            🌰 245
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[0.625rem] font-medium">
            <Check className="w-2.5 h-2.5" /> Пройдено
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full text-[0.5625rem] font-medium">
            Заблокирован
          </span>
        </div>
      </Section>

      <Section title="Табы / Переключатели">
        <div className="flex items-center bg-muted/50 rounded-lg p-0.5 w-fit">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.6875rem] font-medium bg-white dark:bg-slate-700 text-foreground shadow-sm">
            <List className="w-3 h-3" /> Список
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.6875rem] font-medium text-muted-foreground hover:text-foreground">
            <Map className="w-3 h-3" /> Карта
          </button>
        </div>
      </Section>
    </>
  );
}

// ===== Cards =====
function CardsSection() {
  return (
    <>
      <Section title="Карточка прогресса" description="Тёмный градиент с белым текстом">
        <div className="bg-gradient-to-br from-slate-400 via-slate-500 to-teal-500 rounded-2xl border border-slate-300/40 p-6 shadow-lg shadow-black/10 max-w-md">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[0.75rem] text-white/70 mb-0.5">Ваш прогресс</p>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-white">42<span className="text-lg text-white/60">%</span></p>
            </div>
            <div className="text-right">
              <p className="text-[0.75rem] text-white/70 tabular-nums">27 из 64</p>
              <p className="text-[0.6875rem] text-white/50 tabular-nums mt-0.5">Осталось ~3ч 42м</p>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full w-[42%]" />
          </div>
          <div className="grid grid-cols-5 gap-2 mt-5 pt-5 border-t border-white/15">
            {[
              { val: "10", lbl: "Модулей" },
              { val: "64", lbl: "Уроков" },
              { val: "32", lbl: "Тестов", cls: "text-cyan-100" },
              { val: "27", lbl: "Пройдено", cls: "text-emerald-100" },
              { val: "15", lbl: "Практика", cls: "text-amber-100" },
            ].map(s => (
              <div key={s.lbl} className="text-center">
                <p className={`text-lg font-bold tabular-nums ${s.cls || "text-white"}`}>{s.val}</p>
                <p className="text-[0.6875rem] text-white/60">{s.lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Карточки модулей" description="Разблокированные и заблокированные">
        <div className="space-y-2 max-w-lg">
          {/* Unlocked */}
          <div className="w-full text-left rounded-xl border p-4 flex items-center gap-4 group bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-800 dark:via-slate-800/80 dark:to-teal-900/30 border-slate-200/60 dark:border-slate-700/60 hover:border-teal-200 hover:shadow-sm transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">Модуль 1</span>
              </div>
              <h4 className="text-[0.875rem] font-medium truncate">Основы продакт-менеджмента</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full rounded-full bg-teal-500 w-[60%]" />
                </div>
                <span className="text-[0.6875rem] text-muted-foreground/50 tabular-nums">5/8</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-teal-500 transition-all shrink-0" />
          </div>

          {/* Completed */}
          <div className="w-full text-left rounded-xl border p-4 flex items-center gap-4 bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-800 dark:via-slate-800/80 dark:to-teal-900/30 border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">Модуль 2</span>
              </div>
              <h4 className="text-[0.875rem] font-medium truncate">Исследования и аналитика</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full rounded-full bg-emerald-500 w-full" />
                </div>
                <span className="text-[0.6875rem] text-muted-foreground/50 tabular-nums">6/6</span>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          {/* Locked */}
          <div className="w-full text-left rounded-xl border p-4 flex items-center gap-4 bg-slate-100/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 opacity-60 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">Модуль 5</span>
                <span className="text-[0.5625rem] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full font-medium">Заблокирован</span>
              </div>
              <h4 className="text-[0.875rem] font-medium truncate text-muted-foreground">Метрики и KPI</h4>
              <p className="text-[0.6875rem] text-muted-foreground/40 mt-1">Пройдите модуль 4 для открытия</p>
            </div>
            <Lock className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
          </div>
        </div>
      </Section>

      <Section title="XP / Каштаны виджет" description="Отображение прогресса уровня">
        <div className="max-w-[260px]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-100/60 dark:border-amber-800/40">
            <span className="text-sm leading-none">🌰</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[0.625rem] font-bold text-amber-800 dark:text-amber-300 truncate">Деревце 🌳</span>
                <span className="text-[0.625rem] text-amber-600 dark:text-amber-400 font-semibold tabular-nums">125</span>
              </div>
              <div className="h-1 bg-amber-100 dark:bg-amber-800/40 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full w-[56%]" />
              </div>
            </div>
            <div className="flex items-center gap-0.5 pl-1.5 border-l border-amber-200/60 dark:border-amber-700/40">
              <span className="text-[0.625rem] text-orange-500">🔥</span>
              <span className="text-[0.625rem] font-bold text-orange-600 dark:text-orange-400 tabular-nums">5</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Финальный экзамен" description="Разблокированное и заблокированное состояние">
        <div className="space-y-2 max-w-lg">
          <div className="w-full text-left rounded-xl border p-4 flex items-center gap-4 group bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/20 border-teal-200/60 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-100 dark:bg-teal-800/40">
              <Sparkles className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[0.875rem] font-semibold text-teal-900 dark:text-teal-300">Финальный экзамен</h4>
              <p className="text-[0.75rem] text-teal-600/60 dark:text-teal-400/60">Итоговый тест по всем модулям курса</p>
            </div>
            <Award className="w-5 h-5 text-teal-300 dark:text-teal-600 group-hover:text-teal-500 transition-colors shrink-0" />
          </div>
        </div>
      </Section>
    </>
  );
}

// ===== Inputs =====
function InputsSection() {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <Section title="Поля ввода" description="Поиск, текстовые поля">
        <div className="space-y-3 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Поиск уроков..."
              className="w-full pl-9 pr-8 py-2 text-[0.8125rem] bg-slate-50 dark:bg-slate-800 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:bg-white dark:focus:bg-slate-700 placeholder:text-muted-foreground/40 transition-all"
            />
          </div>
          <input
            type="text"
            placeholder="Ваше имя"
            className="w-full px-4 py-2.5 text-[0.875rem] bg-card border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/30 placeholder:text-muted-foreground/40"
          />
          <textarea
            placeholder="Заметка к уроку..."
            rows={3}
            className="w-full px-4 py-2.5 text-[0.875rem] bg-card border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/30 placeholder:text-muted-foreground/40 resize-none"
          />
        </div>
      </Section>

      <Section title="Квиз-опции" description="Выбор ответа — нейтральный, выбранный, правильный, неправильный">
        <div className="space-y-2 max-w-md">
          {/* Neutral */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card hover:border-teal-200 cursor-pointer transition-all">
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-[0.625rem] font-semibold">A</span>
            <span className="text-[0.875rem] leading-relaxed">Product-Market Fit</span>
          </div>
          {/* Selected */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-teal-300 dark:border-teal-600 bg-teal-50/50 dark:bg-teal-900/20 cursor-pointer">
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-teal-500 text-white text-[0.625rem] font-semibold">B</span>
            <span className="text-[0.875rem] leading-relaxed">Customer Development</span>
          </div>
          {/* Correct */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500 text-white"><CheckCircle2 className="w-3 h-3" /></span>
            <span className="text-[0.875rem] leading-relaxed">MVP (правильный ответ)</span>
          </div>
          {/* Wrong */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-red-400 text-white"><XCircle className="w-3 h-3" /></span>
            <span className="text-[0.875rem] leading-relaxed text-muted-foreground">Lean Canvas</span>
          </div>
        </div>
      </Section>

      <Section title="Чекбокс / Переключатель">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} className="w-4 h-4 rounded accent-teal-500" />
            <span className="text-[0.8125rem]">Отметить урок</span>
          </label>
        </div>
      </Section>
    </>
  );
}

// ===== Badges =====
function BadgesSection() {
  const badgeShowcase = [
    { icon: Rocket, title: "Первый шаг", desc: "Завершить первый урок", color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/30", earned: true },
    { icon: Zap, title: "Разгон", desc: "Завершить 5 уроков", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30", earned: true },
    { icon: Star, title: "Десятка", desc: "Завершить 10 уроков", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30", earned: true },
    { icon: Target, title: "Экватор", desc: "Пройти 50% курса", color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/30", earned: false },
    { icon: GraduationCap, title: "Выпускник", desc: "Пройти весь курс", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", earned: false },
    { icon: Flame, title: "3 дня подряд", desc: "Streak 3 дня", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", earned: true },
    { icon: Trophy, title: "Сдал экзамен", desc: "60%+", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20", earned: false },
    { icon: Crown, title: "Отличник", desc: "90%+ экзамен", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20", earned: false },
    { icon: Heart, title: "Книгочей", desc: "5 закладок", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20", earned: true },
    { icon: Sparkles, title: "Первый каштан", desc: "10 🌰", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30", earned: true },
    { icon: Brain, title: "Полкорзины", desc: "500 🌰", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20", earned: false },
    { icon: Gamepad2, title: "Симулятор", desc: "Завершить сценарий", color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/30", earned: false },
  ];

  return (
    <Section title="Бейджи" description={`${badgeShowcase.length} штук — заработанные и заблокированные`}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {badgeShowcase.map(b => {
          const Icon = b.icon;
          return (
            <div
              key={b.title}
              className={`rounded-xl border p-3 text-center transition-all ${
                b.earned
                  ? "border-border/40 bg-card"
                  : "border-border/20 bg-muted/30 opacity-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${b.bg} ${b.color} flex items-center justify-center mx-auto mb-2`}>
                {b.earned ? <Icon className="w-5 h-5" /> : <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
              </div>
              <p className="text-[0.75rem] font-semibold truncate">{b.title}</p>
              <p className="text-[0.5625rem] text-muted-foreground truncate">{b.desc}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ===== States =====
function StatesSection() {
  return (
    <>
      <Section title="Алерты / Уведомления" description="Toast-стили и inline-уведомления">
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[0.8125rem] text-emerald-800 dark:text-emerald-300">Урок успешно завершён! +10 🌰</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-[0.8125rem] text-amber-800 dark:text-amber-300">Пройдите предыдущий модуль для открытия</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40">
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-[0.8125rem] text-red-800 dark:text-red-300">Ошибка при сохранении прогресса</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200/60 dark:border-teal-800/40">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <p className="text-[0.8125rem] text-teal-800 dark:text-teal-300">Используйте ⌘K для быстрого поиска</p>
          </div>
        </div>
      </Section>

      <Section title="Прогресс-бары" description="Различные стили индикаторов прогресса">
        <div className="space-y-4 max-w-sm">
          <div>
            <p className="text-[0.6875rem] text-muted-foreground mb-1.5">Основной (teal)</p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full w-[65%] transition-all" />
            </div>
          </div>
          <div>
            <p className="text-[0.6875rem] text-muted-foreground mb-1.5">Тонкий (3px)</p>
            <div className="h-[3px] bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full w-[40%]" />
            </div>
          </div>
          <div>
            <p className="text-[0.6875rem] text-muted-foreground mb-1.5">XP amber</p>
            <div className="h-1.5 bg-amber-100 dark:bg-amber-800/40 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full w-[55%]" />
            </div>
          </div>
          <div>
            <p className="text-[0.6875rem] text-muted-foreground mb-1.5">На тёмном фоне</p>
            <div className="bg-slate-500 rounded-lg p-3">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full w-[42%]" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-[0.6875rem] text-muted-foreground mb-1.5">Завершён (emerald)</p>
            <div className="h-[3px] bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-full" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Heatmap ячейки" description="Streak Calendar (GitHub-стиль)">
        <div className="flex gap-1 items-center">
          <div className="w-4 h-4 rounded-[3px] bg-slate-100 dark:bg-slate-700" />
          <div className="w-4 h-4 rounded-[3px] bg-teal-200" />
          <div className="w-4 h-4 rounded-[3px] bg-teal-400" />
          <div className="w-4 h-4 rounded-[3px] bg-teal-500" />
          <div className="w-4 h-4 rounded-[3px] bg-teal-500 ring-1 ring-teal-400 ring-offset-1 dark:ring-offset-slate-800" />
          <span className="text-[0.625rem] text-muted-foreground ml-2">пусто → активный → сегодня</span>
        </div>
      </Section>

      <Section title="Стримы XP уровней" description="9 уровней системы каштанов">
        <div className="grid grid-cols-3 gap-2">
          {[
            { lvl: 1, title: "Росток 🌱", xp: "0–30" },
            { lvl: 2, title: "Побег 🌿", xp: "30–80" },
            { lvl: 3, title: "Деревце 🌳", xp: "80–160" },
            { lvl: 4, title: "Дуб 🏔️", xp: "160–300" },
            { lvl: 5, title: "Роща 🌲🌲", xp: "300–500" },
            { lvl: 6, title: "Лес 🌲🌲🌲", xp: "500–800" },
            { lvl: 7, title: "Тайга 🏞️", xp: "800–1200" },
            { lvl: 8, title: "Заповедник 🦉", xp: "1200–2000" },
            { lvl: 9, title: "Вселенная 🌌", xp: "2000+" },
          ].map(l => (
            <div key={l.lvl} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-card border border-border/30 text-[0.75rem]">
              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[0.5rem] font-bold text-amber-700 dark:text-amber-400">{l.lvl}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{l.title}</p>
                <p className="text-[0.5625rem] text-muted-foreground tabular-nums">{l.xp} 🌰</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ===== Misc =====
function MiscSection({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  return (
    <>
      <Section title="Dark Mode Toggle" description="Переключатель с анимацией Sun/Moon">
        <div className="flex items-center gap-4">
          <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
          <span className="text-[0.75rem] text-muted-foreground">{isDark ? "Тёмная тема" : "Светлая тема"}</span>
        </div>
      </Section>

      <Section title="Радиусы скруглений" description="Из theme.css --radius: 0.625rem">
        <div className="flex items-center gap-4">
          {[
            { label: "sm", cls: "rounded-sm" },
            { label: "md", cls: "rounded-md" },
            { label: "lg", cls: "rounded-lg" },
            { label: "xl", cls: "rounded-xl" },
            { label: "2xl", cls: "rounded-2xl" },
            { label: "full", cls: "rounded-full" },
          ].map(r => (
            <div key={r.label} className="text-center">
              <div className={`w-12 h-12 bg-teal-100 dark:bg-teal-800/40 border border-teal-200 dark:border-teal-700 ${r.cls}`} />
              <p className="text-[0.5rem] text-muted-foreground mt-1">{r.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Тени" description="Используемые shadow-классы">
        <div className="flex items-center gap-6">
          {[
            { label: "shadow-sm", cls: "shadow-sm" },
            { label: "shadow-md", cls: "shadow-md shadow-teal-100 dark:shadow-teal-900/20" },
            { label: "shadow-lg", cls: "shadow-lg shadow-black/10" },
            { label: "shadow-2xl", cls: "shadow-2xl shadow-black/20" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`w-16 h-16 bg-card border border-border/30 rounded-xl ${s.cls}`} />
              <p className="text-[0.5rem] text-muted-foreground mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Иконки" description="lucide-react — основной набор">
        <div className="flex flex-wrap gap-3">
          {[
            { Icon: BookOpen, label: "Уроки" },
            { Icon: Trophy, label: "Бейджи" },
            { Icon: Star, label: "Избранное" },
            { Icon: Flame, label: "Streak" },
            { Icon: Search, label: "Поиск" },
            { Icon: Settings, label: "Настройки" },
            { Icon: Bell, label: "Уведомления" },
            { Icon: User, label: "Профиль" },
            { Icon: BarChart3, label: "Аналитика" },
            { Icon: Brain, label: "Квизы" },
            { Icon: Calculator, label: "Калькулятор" },
            { Icon: Gamepad2, label: "Симулятор" },
            { Icon: Home, label: "Главная" },
            { Icon: Download, label: "Экспорт" },
            { Icon: Copy, label: "Копировать" },
            { Icon: ArrowRight, label: "Далее" },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 w-14">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[0.5rem] text-muted-foreground text-center">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Интерактивные блоки" description="6 типов из interactive-content.tsx">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { type: "miniquiz", label: "Мини-квиз", xp: 10, icon: "❓", desc: "Вопрос с вариантами" },
            { type: "fillblank", label: "Заполни пропуск", xp: 15, icon: "✏️", desc: "Текстовый ввод" },
            { type: "scenario", label: "Сценарий", xp: 20, icon: "🎭", desc: "Ситуационный выбор" },
            { type: "calculator", label: "Калькулятор", xp: 10, icon: "🔢", desc: "Вычисление метрик" },
            { type: "dragsort", label: "Drag & Sort", xp: 15, icon: "↕️", desc: "Расставить по порядку" },
            { type: "matching", label: "Matching", xp: 15, icon: "🔗", desc: "Сопоставление пар" },
          ].map(b => (
            <div key={b.type} className="rounded-xl border border-border/40 bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none">{b.icon}</span>
                <span className="text-[0.75rem] font-semibold">{b.label}</span>
              </div>
              <p className="text-[0.625rem] text-muted-foreground mb-2">{b.desc}</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 rounded-full text-[0.5625rem] font-medium text-amber-700 dark:text-amber-400">
                🌰 +{b.xp}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing шкала" description="Tailwind spacing — основные отступы">
        <div className="flex items-end gap-2">
          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(s => (
            <div key={s} className="text-center">
              <div
                className="bg-teal-200 dark:bg-teal-700 rounded-sm mx-auto"
                style={{ width: `${s * 4}px`, height: `${s * 4}px` }}
              />
              <p className="text-[0.5rem] text-muted-foreground mt-1">{s}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}