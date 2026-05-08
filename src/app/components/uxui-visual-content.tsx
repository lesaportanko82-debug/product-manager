import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, ChevronRight,
  Monitor, Tablet, Smartphone, Eye, Layers, Type, Palette,
  MousePointer, Layout, Grid, Accessibility, Zap, Code2,
  ArrowRight, ToggleLeft, ToggleRight, Check, X, RefreshCw
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// SHARED UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60" />
      <span className="text-[0.65rem] font-bold tracking-[0.15em] text-muted-foreground/60 uppercase px-3">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60" />
    </div>
  );
}

function VisualBlock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/50 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-900/80 dark:to-slate-900 overflow-hidden shadow-sm mb-6 ${className}`}>
      {children}
    </div>
  );
}

function GoodBadTag({ type }: { type: "good" | "bad" | "ok" }) {
  if (type === "good") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[0.65rem] font-bold uppercase tracking-wide">
      <Check className="w-2.5 h-2.5" /> Хорошо
    </span>
  );
  if (type === "bad") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[0.65rem] font-bold uppercase tracking-wide">
      <X className="w-2.5 h-2.5" /> Плохо
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[0.65rem] font-bold uppercase tracking-wide">
      <AlertTriangle className="w-2.5 h-2.5" /> Допустимо
    </span>
  );
}

// Figma-style frame wrapper
function FigmaFrame({ label, children, color = "#1ABCFE" }: { label?: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="relative">
      {label && (
        <div className="absolute -top-5 left-0 text-[0.6rem] font-semibold tracking-wide" style={{ color }}>
          {label}
        </div>
      )}
      <div className="rounded-xl border-2 overflow-hidden bg-white dark:bg-slate-800 shadow-md" style={{ borderColor: color }}>
        {children}
      </div>
    </div>
  );
}

// Mock phone frame
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 180 }}>
      <div className="rounded-[28px] border-[6px] border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
        <div className="bg-slate-900 flex justify-center py-1.5">
          <div className="w-16 h-1.5 rounded-full bg-slate-700" />
        </div>
        <div className="bg-white dark:bg-slate-100 overflow-hidden" style={{ minHeight: 280 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// L1: ПЯТЬ ПЛОСКОСТЕЙ ГАРРЕТТА
// ─────────────────────────────────────────────────────────────

const PLANES = [
  { id: "surface", label: "5. Поверхность", en: "Surface", color: "#7C3AED", desc: "Цвета, шрифты, иконки, анимация — то, что видит пользователь", pmQ: "Соответствует ли дизайн-системе или создаёт новый прецедент?", width: "100%" },
  { id: "skeleton", label: "4. Скелет", en: "Skeleton", color: "#2563EB", desc: "Wireframes, расположение элементов, навигационный дизайн", pmQ: "Проверили ли мы логику на wireframe до начала Hi-Fi?", width: "88%" },
  { id: "structure", label: "3. Структура", en: "Structure", color: "#0891B2", desc: "Information Architecture + Interaction Design — карта продукта", pmQ: "Как пользователь попадёт в эту фичу и куда уйдёт после?", width: "76%" },
  { id: "scope", label: "2. Скоп", en: "Scope", color: "#059669", desc: "Функциональные спецификации и контентные требования", pmQ: "Это минимально необходимая версия или «хочется красиво»?", width: "64%" },
  { id: "strategy", label: "1. Стратегия", en: "Strategy", color: "#D97706", desc: "User needs + Business goals + метрики успеха", pmQ: "Какую метрику это двигает и почему именно сейчас?", width: "52%" },
  { id: "ai", label: "★ AI-native", en: "AI Layer", color: "#EC4899", desc: "Дизайн как система правил для агентов — слой Ярослава Шуваева (2026)", pmQ: "Готовы ли инструкции для AI-агента? Есть ли AGENTS.md?", width: "40%" },
];

function L1GarrettPyramid() {
  const [active, setActive] = useState<string | null>(null);
  const activeP = PLANES.find(p => p.id === active);

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Пирамида Гарретта — интерактивная модель</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Pyramid */}
          <div className="flex flex-col items-center gap-1.5">
            {PLANES.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => setActive(active === p.id ? null : p.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`rounded-lg px-4 py-2 flex items-center justify-between cursor-pointer transition-all border-2 ${
                  active === p.id ? "opacity-100 shadow-md" : "opacity-70 hover:opacity-90"
                }`}
                style={{
                  width: p.width,
                  backgroundColor: active === p.id ? p.color + "20" : p.color + "15",
                  borderColor: active === p.id ? p.color : p.color + "60",
                }}
              >
                <span className="text-[0.75rem] font-bold" style={{ color: p.color }}>{p.label}</span>
                <span className="text-[0.6rem] text-muted-foreground hidden sm:block">{p.en}</span>
              </motion.button>
            ))}
            <p className="text-[0.65rem] text-muted-foreground mt-2 text-center">Нажми на уровень ↑</p>
          </div>

          {/* Detail panel */}
          <div className="min-h-[160px]">
            <AnimatePresence mode="wait">
              {activeP ? (
                <motion.div
                  key={activeP.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="rounded-xl p-4 border-2"
                  style={{ borderColor: activeP.color + "50", backgroundColor: activeP.color + "10" }}
                >
                  <div className="text-xs font-bold mb-1" style={{ color: activeP.color }}>{activeP.label}</div>
                  <p className="text-[0.8125rem] text-foreground mb-3 leading-relaxed">{activeP.desc}</p>
                  <div className="rounded-lg p-3 bg-background/80 border border-border/50">
                    <p className="text-[0.7rem] text-muted-foreground font-medium mb-0.5">❓ Вопрос PM:</p>
                    <p className="text-[0.75rem] text-foreground italic">«{activeP.pmQ}»</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 p-6 text-center"
                >
                  <Layers className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground/50">Выбери уровень, чтобы увидеть описание и вопрос PM</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

function L1PMChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const items = [
    { id: "a", plane: "Стратегия", q: "Какую метрику это двигает и почему именно сейчас?", color: "#D97706" },
    { id: "b", plane: "Скоп", q: "Это минимально необходимая версия или «хочется красиво»?", color: "#059669" },
    { id: "c", plane: "Структура", q: "Как пользователь попадёт в эту фичу и куда уйдёт после?", color: "#0891B2" },
    { id: "d", plane: "Скелет", q: "Проверили ли мы логику на wireframe до начала Hi-Fi?", color: "#2563EB" },
    { id: "e", plane: "Поверхность", q: "Соответствует ли визуал дизайн-системе или создаёт новый прецедент?", color: "#7C3AED" },
  ];
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>PM-чеклист перед крупной фичей</SectionLabel>
        <div className="space-y-2 mb-3">
          {items.map(item => (
            <motion.button
              key={item.id}
              onClick={() => setChecked(p => ({ ...p, [item.id]: !p[item.id] }))}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                checked[item.id] ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700" : "border-border hover:border-border/80 bg-background"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                checked[item.id] ? "bg-emerald-500 border-emerald-500" : "border-border"
              }`} style={{ borderColor: checked[item.id] ? undefined : item.color + "80" }}>
                {checked[item.id] && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[0.65rem] font-bold uppercase tracking-wide" style={{ color: item.color }}>{item.plane}</span>
                <p className="text-[0.775rem] text-foreground leading-snug">{item.q}</p>
              </div>
            </motion.button>
          ))}
        </div>
        <div className="flex items-center justify-between bg-muted/40 rounded-xl p-3">
          <span className="text-sm text-muted-foreground">Готовность к запуску фичи</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500"
                animate={{ width: `${(done / items.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 200 }}
              />
            </div>
            <span className="text-sm font-bold text-foreground">{done}/{items.length}</span>
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L2: КОМПОЗИЦИЯ
// ─────────────────────────────────────────────────────────────

function L2EyeTracking() {
  const [pattern, setPattern] = useState<"Z" | "F">("Z");

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Паттерны движения взгляда</SectionLabel>
        <div className="flex gap-2 mb-4">
          {(["Z", "F"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPattern(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                pattern === p
                  ? "bg-teal-500 text-white shadow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p}-паттерн
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* Mock screen */}
          <div className="relative rounded-xl border-2 border-border bg-white dark:bg-slate-100 p-4 overflow-hidden" style={{ minHeight: 220 }}>
            {/* Mock UI elements */}
            <div className="bg-slate-200 rounded h-5 w-20 mb-3" /> {/* Logo */}
            <div className="flex gap-2 mb-3">
              <div className="bg-slate-200 rounded h-4 w-12" />
              <div className="bg-slate-200 rounded h-4 w-12" />
              <div className="bg-teal-400 rounded h-4 w-16" /> {/* CTA nav */}
            </div>
            <div className="bg-slate-300 rounded h-16 w-full mb-3" /> {/* Hero */}
            <div className="space-y-1.5 mb-3">
              <div className="bg-slate-200 rounded h-2.5 w-full" />
              <div className="bg-slate-200 rounded h-2.5 w-4/5" />
              <div className="bg-slate-200 rounded h-2.5 w-3/4" />
              <div className="bg-slate-200 rounded h-2.5 w-2/3" />
            </div>
            <div className="bg-teal-500 rounded h-7 w-28" /> {/* CTA */}

            {/* Eye tracking path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
              {pattern === "Z" && (
                <>
                  <motion.path
                    d="M 20 28 L 155 28 L 20 120 L 155 195"
                    fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="6,4"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                  {[{cx:20,cy:28},{cx:155,cy:28},{cx:20,cy:120},{cx:155,cy:195}].map((p, i) => (
                    <motion.circle key={i} cx={p.cx} cy={p.cy} r="5" fill="#F59E0B"
                      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.4, duration: 0.3 }}
                    />
                  ))}
                </>
              )}
              {pattern === "F" && (
                <>
                  <motion.path
                    d="M 20 28 L 155 28 M 20 52 L 110 52 M 20 75 L 30 145"
                    fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="6,4"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                  {[{cx:20,cy:28},{cx:155,cy:28},{cx:20,cy:52},{cx:110,cy:52},{cx:20,cy:75},{cx:30,cy:145}].map((p, i) => (
                    <motion.circle key={i} cx={p.cx} cy={p.cy} r="4" fill="#3B82F6"
                      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.25, duration: 0.3 }}
                    />
                  ))}
                </>
              )}
            </svg>
          </div>

          {/* Info */}
          <div className="space-y-3">
            {pattern === "Z" ? (
              <>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Z-паттерн — для лендингов</p>
                  <ul className="text-[0.75rem] text-muted-foreground space-y-1">
                    <li className="flex gap-1.5"><span className="text-amber-500 font-bold">1</span> Верхний левый — логотип/бренд</li>
                    <li className="flex gap-1.5"><span className="text-amber-500 font-bold">2</span> Вправо — навигация и главный CTA</li>
                    <li className="flex gap-1.5"><span className="text-amber-500 font-bold">3</span> Диагональ вниз — hero-заголовок</li>
                    <li className="flex gap-1.5"><span className="text-amber-500 font-bold">4</span> Вправо — финальный призыв к действию</li>
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[0.75rem] text-muted-foreground">Используй для: лендингов, onboarding-экранов, логин-страниц, карточек</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">F-паттерн — для текстовых страниц</p>
                  <ul className="text-[0.75rem] text-muted-foreground space-y-1">
                    <li className="flex gap-1.5"><span className="text-blue-500 font-bold">1</span> Первая строка — читается полностью</li>
                    <li className="flex gap-1.5"><span className="text-blue-500 font-bold">2</span> Вторая строка — частично</li>
                    <li className="flex gap-1.5"><span className="text-blue-500 font-bold">3</span> Взгляд уходит вниз по левому краю</li>
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-[0.75rem] text-muted-foreground"><strong>Вывод:</strong> Самое важное — в начале параграфа и заголовка! «Сэкономь 40%» → «Наш сервис позволяет сэкономить 40%»</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

function L2GoodBadScreens() {
  const [tab, setTab] = useState<"bad" | "good">("bad");
  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Хороший vs плохой экран — визуальная иерархия</SectionLabel>
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab("bad")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === "bad" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>
            <XCircle className="w-3.5 h-3.5" /> Плохо
          </button>
          <button onClick={() => setTab("good")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === "good" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Хорошо
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "bad" && (
            <motion.div key="bad" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bad screen mockup */}
              <div className="relative">
                <FigmaFrame label="❌ Нарушена иерархия" color="#EF4444">
                  <div className="p-3 space-y-2">
                    <div className="text-[10px] font-normal text-slate-500">Добро пожаловать</div>
                    <div className="text-[10px] text-slate-400">Наша платформа</div>
                    <div className="flex gap-1 flex-wrap">
                      {["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981"].map(c => (
                        <div key={c} className="h-5 w-12 rounded text-[8px] flex items-center justify-center text-white font-bold" style={{background:c}}>Кнопка</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="rounded p-1.5 border border-slate-200 bg-slate-50">
                          <div className="h-2 bg-slate-300 rounded mb-1" />
                          <div className="h-1.5 bg-slate-200 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="text-[8px] text-slate-300">Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor</div>
                    <div className="border border-slate-200 rounded p-1">
                      <div className="text-[8px] text-slate-400">Подпишитесь на рассылку новостей нашего продукта</div>
                    </div>
                  </div>
                </FigmaFrame>
              </div>
              {/* Bad annotations */}
              <div className="space-y-2">
                {[
                  { icon: "🎨", text: "5 разных цветов кнопок — нет Primary, всё равнозначно", bad: true },
                  { icon: "📝", text: "Одинаковый размер заголовка и подзаголовка — нет иерархии", bad: true },
                  { icon: "📦", text: "6 карточек без явного приоритета — куда смотреть?", bad: true },
                  { icon: "📜", text: "Ghost-text и дополнительный блок конкурируют с CTA", bad: true },
                ].map((a, i) => (
                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <span className="text-sm">{a.icon}</span>
                    <p className="text-[0.7rem] text-red-700 dark:text-red-300">{a.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {tab === "good" && (
            <motion.div key="good" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Good screen mockup */}
              <div>
                <FigmaFrame label="✅ Чёткая иерархия" color="#10B981">
                  <div className="p-3 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-bold text-slate-700">Logo</div>
                      <div className="flex gap-1">
                        <div className="h-4 w-8 rounded text-[7px] flex items-center justify-center text-slate-400 border border-slate-200">О нас</div>
                        <div className="h-4 w-12 rounded text-[7px] flex items-center justify-center text-white font-bold bg-teal-500">Начать</div>
                      </div>
                    </div>
                    <div className="text-[13px] font-black text-slate-800 leading-tight">Заголовок<br/>на 2 строки</div>
                    <div className="text-[8px] text-slate-400 leading-tight">Краткое описание ценностного предложения в 1-2 строки</div>
                    <div className="bg-teal-500 rounded-lg h-8 w-full flex items-center justify-center text-[10px] text-white font-bold shadow-md">
                      Главный призыв к действию
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {[1,2,3].map(i => (
                        <div key={i} className="rounded border border-slate-100 bg-slate-50 p-1.5">
                          <div className="h-6 bg-slate-200 rounded mb-1" />
                          <div className="h-1.5 bg-slate-200 rounded mb-0.5" />
                          <div className="h-1.5 bg-slate-100 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </FigmaFrame>
              </div>
              {/* Good annotations */}
              <div className="space-y-2">
                {[
                  { icon: "🎯", text: "Один Primary CTA — чёткий призыв к действию, выделен цветом и тенью" },
                  { icon: "📐", text: "Размерная иерархия: H1 > body > caption — считывается без усилий" },
                  { icon: "🌬️", text: "Белое пространство вокруг CTA усиливает его значимость (isolation effect)" },
                  { icon: "📊", text: "3 карточки вместо 6 — фокус, не перегрузка" },
                ].map((a, i) => (
                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-sm">{a.icon}</span>
                    <p className="text-[0.7rem] text-emerald-700 dark:text-emerald-300">{a.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L3: ТИПОГРАФИКА
// ─────────────────────────────────────────────────────────────

function L3TypographyScale() {
  const [scale, setScale] = useState<"major3" | "perfect4">("perfect4");
  const scales = {
    major3: { name: "Major Third (×1.25)", sizes: [12, 15, 19, 24, 30, 38], desc: "Для плотных интерфейсов — разница видна, но не кричит" },
    perfect4: { name: "Perfect Fourth (×1.333)", sizes: [12, 16, 21, 28, 37, 49], desc: "Стандарт для большинства web-продуктов" },
  };
  const s = scales[scale];
  const roles = ["Caption", "Body SM", "Body", "H3", "H2", "H1"];
  const weights = [400, 400, 400, 600, 700, 800];

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Типографическая шкала — живая демонстрация</SectionLabel>
        <div className="flex gap-2 mb-4">
          {(Object.keys(scales) as (keyof typeof scales)[]).map(k => (
            <button key={k} onClick={() => setScale(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${scale === k ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {scales[k].name}
            </button>
          ))}
        </div>
        <p className="text-[0.75rem] text-muted-foreground mb-4">{s.desc}</p>
        <div className="space-y-2">
          {s.sizes.slice().reverse().map((size, i) => {
            const role = roles[s.sizes.length - 1 - i];
            const weight = weights[s.sizes.length - 1 - i];
            return (
              <motion.div
                key={size}
                layout
                className="flex items-baseline gap-3 py-1 border-b border-border/40 last:border-0"
              >
                <div className="w-16 shrink-0 text-right">
                  <span className="text-[0.65rem] text-muted-foreground font-mono">{size}px</span>
                </div>
                <div className="w-14 shrink-0">
                  <span className="text-[0.65rem] text-violet-500 dark:text-violet-400 font-mono">{role}</span>
                </div>
                <span style={{ fontSize: `${Math.min(size, 36)}px`, fontWeight: weight, lineHeight: 1.2 }}
                  className="text-foreground truncate">
                  {role === "H1" ? "Заголовок" : role === "H2" ? "Подзаголовок" : role === "H3" ? "Секция" : role === "Body" ? "Основной текст читается так" : role === "Body SM" ? "Дополнительный текст" : "Метка, дата, статус"}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </VisualBlock>
  );
}

function L3FontComparison() {
  const fonts = [
    { name: "Inter", type: "Humanist Sans", use: "Интерфейс, доверие", color: "#2563EB", sample: "Главное действие" },
    { name: "DM Sans", type: "Geometric Sans", use: "Tech, современность", color: "#7C3AED", sample: "Главное действие" },
    { name: "Georgia", type: "Serif", use: "Редакционный, доверие", color: "#059669", sample: "Главное действие" },
  ];
  const [selected, setSelected] = useState(0);

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Гарнитуры: когда что использовать</SectionLabel>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {fonts.map((f, i) => (
            <button key={i} onClick={() => setSelected(i)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${selected === i ? "shadow-md" : "border-border"}`}
              style={selected === i ? { borderColor: f.color, background: f.color + "12" } : {}}>
              <div className="text-xs font-bold text-foreground mb-0.5">{f.name}</div>
              <div className="text-[0.6rem] text-muted-foreground">{f.type}</div>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={selected} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border-2 p-5 text-center" style={{ borderColor: fonts[selected].color + "50" }}>
            <div className="text-[0.65rem] font-bold uppercase tracking-widest mb-3" style={{ color: fonts[selected].color }}>
              {fonts[selected].type} · {fonts[selected].use}
            </div>
            <div style={{ fontFamily: fonts[selected].name === "Georgia" ? "Georgia, serif" : "sans-serif", fontWeight: 700, fontSize: 28, color: "var(--foreground)" }}>
              {fonts[selected].sample}
            </div>
            <div style={{ fontFamily: fonts[selected].name === "Georgia" ? "Georgia, serif" : "sans-serif", fontSize: 14, color: "var(--muted-foreground)", marginTop: 8 }}>
              Основной текст выглядит так при чтении на экране в 2026 году
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L4: ЦВЕТ
// ─────────────────────────────────────────────────────────────

function L4ColorPalette() {
  const [hovered, setHovered] = useState<string | null>(null);
  const colors = {
    primary: { label: "Primary", hex: "#0EA5E9", use: "CTA кнопки, ссылки, активные элементы", pct: "5-10% UI", warn: "Редкость = сигнальность!" },
    success: { label: "Success", hex: "#10B981", use: "✓ Оплата прошла, ✓ Сохранено, ✓ Подтверждено", pct: "Семантика", warn: "Только по назначению" },
    error: { label: "Error", hex: "#EF4444", use: "✗ Ошибка, ✗ Неверный пароль, ✗ Удалено", pct: "Семантика", warn: "Никогда для промо!" },
    warning: { label: "Warning", hex: "#F59E0B", use: "⚠ Срок истекает, ⚠ Превышен лимит", pct: "Семантика", warn: null },
    info: { label: "Info", hex: "#3B82F6", use: "ℹ Уведомление, ℹ Новая функция, ℹ Подсказка", pct: "Семантика", warn: null },
    neutral: { label: "Neutral", hex: "#94A3B8", use: "Фоны, текст, границы, разделители — основа 80-90% UI", pct: "80-90% UI", warn: null },
  };

  const h = hovered ? colors[hovered as keyof typeof colors] : null;

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Цветовая система интерфейса — наведи на цвет</SectionLabel>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {Object.entries(colors).map(([key, c]) => (
            <motion.div
              key={key}
              onHoverStart={() => setHovered(key)}
              onHoverEnd={() => setHovered(null)}
              whileHover={{ scale: 1.1, y: -4 }}
              className="cursor-pointer flex flex-col items-center gap-1"
            >
              <div className="w-full rounded-xl border-2 border-white/20 shadow-md"
                style={{ background: c.hex, aspectRatio: "1/1.2" }} />
              <span className="text-[0.6rem] font-semibold text-foreground text-center leading-tight">{c.label}</span>
              <span className="text-[0.55rem] text-muted-foreground text-center">{c.pct}</span>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {h && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="rounded-xl p-4 border-2 mt-2" style={{ borderColor: h.hex + "60", background: h.hex + "12" }}>
                <p className="text-[0.8rem] font-semibold mb-1" style={{ color: h.hex }}>{h.label}</p>
                <p className="text-[0.775rem] text-foreground mb-1">{h.use}</p>
                {h.warn && (
                  <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[0.7rem] text-amber-700 dark:text-amber-300 font-semibold">{h.warn}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </VisualBlock>
  );
}

function L4WCAGContrast() {
  const pairs = [
    { fg: "#FFFFFF", bg: "#0EA5E9", ratio: 2.97, label: "Белый на голубом", pass: false, level: "Fail" },
    { fg: "#FFFFFF", bg: "#0369A1", ratio: 5.01, label: "Белый на тёмно-синем", pass: true, level: "AA ✓" },
    { fg: "#374151", bg: "#F3F4F6", ratio: 7.22, label: "Тёмно-серый на светлом", pass: true, level: "AAA ✓✓" },
    { fg: "#9CA3AF", bg: "#FFFFFF", ratio: 2.47, label: "Серый на белом (ghost)", pass: false, level: "Fail" },
    { fg: "#111827", bg: "#FFFFFF", ratio: 18.1, label: "Почти-чёрный на белом", pass: true, level: "AAA ✓✓" },
  ];

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>WCAG контраст — реальные примеры</SectionLabel>
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <div className="w-24 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold shadow-sm"
                style={{ background: p.bg, color: p.fg }}>
                Текст
              </div>
              <div className="flex-1">
                <p className="text-[0.75rem] font-medium text-foreground">{p.label}</p>
                <p className="text-[0.65rem] text-muted-foreground">Контраст: {p.ratio}:1</p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold ${
                p.pass ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              }`}>
                {p.level}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border text-[0.7rem] text-muted-foreground">
          <strong>Минимум:</strong> текст 4.5:1 (AA) · крупный текст 3:1 (AA) · UI компоненты 3:1 (AA)
        </div>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L5: КОМПОНЕНТЫ UI
// ─────────────────────────────────────────────────────────────

function L5ButtonStates() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 2000); }, 1800);
  };

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Состояния кнопки — живая демо</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Default", cls: "bg-teal-500 text-white hover:bg-teal-600", icon: null },
            { label: "Hover*", cls: "bg-teal-600 text-white shadow-lg shadow-teal-500/30", icon: null },
            { label: "Active", cls: "bg-teal-700 text-white scale-95", icon: null },
            { label: "Disabled", cls: "bg-teal-500/40 text-white/60 cursor-not-allowed", icon: null },
            { label: "Loading", cls: "bg-teal-500 text-white cursor-wait", icon: "spinner" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`px-3 py-2 rounded-xl text-xs font-bold w-full text-center transition-all ${s.cls}`}>
                {s.icon === "spinner" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Загрузка
                  </span>
                ) : "Оплатить"}
              </div>
              <span className="text-[0.65rem] text-muted-foreground font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        <SectionLabel>Живая демо: нажми кнопку «Оплатить»</SectionLabel>
        <div className="flex flex-col items-center gap-4 py-4">
          <motion.button
            onClick={handleClick}
            disabled={loading || success}
            whileHover={!loading && !success ? { scale: 1.03 } : {}}
            whileTap={!loading && !success ? { scale: 0.97 } : {}}
            className={`px-8 py-3 rounded-2xl font-bold text-white text-sm transition-all shadow-lg ${
              success ? "bg-emerald-500 shadow-emerald-500/30" : loading ? "bg-teal-400 cursor-wait" : "bg-teal-500 hover:bg-teal-600 shadow-teal-500/30"
            }`}
          >
            {success ? (
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Оплачено!</span>
            ) : loading ? (
              <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Обработка...</span>
            ) : "💳 Оплатить 1 490 ₽"}
          </motion.button>
          <p className="text-[0.7rem] text-muted-foreground text-center max-w-xs">
            Кнопка блокируется при загрузке → показывает успех → автоматически сбрасывается. Без этого — дублирующиеся запросы!
          </p>
        </div>

        <SectionLabel>Иерархия кнопок</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: "Primary", label: "Создать проект", cls: "bg-teal-500 text-white shadow-md", note: "1 на экране" },
            { type: "Secondary", label: "Редактировать", cls: "border-2 border-teal-500 text-teal-600 dark:text-teal-400", note: "Второстепенное" },
            { type: "Tertiary", label: "Отменить", cls: "text-muted-foreground underline", note: "Наименее важное" },
            { type: "Destructive", label: "Удалить", cls: "bg-red-500 text-white", note: "Единственный случай красного!" },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold w-full text-center ${b.cls}`}>{b.label}</div>
              <span className="text-[0.65rem] font-bold text-foreground">{b.type}</span>
              <span className="text-[0.6rem] text-muted-foreground text-center">{b.note}</span>
            </div>
          ))}
        </div>
      </div>
    </VisualBlock>
  );
}

function L5FormStates() {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const hasEmailError = email.length > 3 && !email.includes("@");

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Состояния поля ввода — живая демо</SectionLabel>
        <div className="max-w-sm mx-auto space-y-4">
          {/* Email with validation */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="name@company.com"
                className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm bg-background outline-none transition-all ${
                  hasEmailError
                    ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                    : focusedField === "email"
                    ? "border-teal-500 ring-2 ring-teal-500/20"
                    : email && !hasEmailError
                    ? "border-emerald-400"
                    : "border-border"
                }`}
              />
              {email && !hasEmailError && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              )}
            </div>
            {hasEmailError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Неверный формат email — проверьте, нет ли опечаток
              </motion.p>
            )}
            {email && !hasEmailError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Email корректный
              </motion.p>
            )}
          </div>

          {/* Phone disabled */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              Телефон
              <span className="text-[0.6rem] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">недоступно до подтверждения email</span>
            </label>
            <input disabled placeholder="+7 (000) 000-00-00"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-border text-sm bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50" />
          </div>

          {/* State legend */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              { border: "border-border", label: "Empty", note: "Нейтральное" },
              { border: "border-teal-500 ring-2 ring-teal-500/20", label: "Focused", note: "Primary border + ring" },
              { border: "border-emerald-400", label: "Success", note: "Данные верны" },
              { border: "border-red-400", label: "Error", note: "Ошибка + текст!" },
            ].map((s, i) => (
              <div key={i} className={`px-2 py-1.5 rounded-lg border-2 ${s.border} flex items-center justify-between`}>
                <span className="text-[0.65rem] font-bold text-foreground">{s.label}</span>
                <span className="text-[0.6rem] text-muted-foreground">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L6: WIREFRAMING
// ─────────────────────────────────────────────────────────────

function L6WireframeComparison() {
  const [level, setLevel] = useState<"lofi" | "midfi" | "hifi">("lofi");
  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Уровни детализации wireframe</SectionLabel>
        <div className="flex gap-2 mb-5">
          {([["lofi","Lo-Fi"],["midfi","Mid-Fi"],["hifi","Hi-Fi"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setLevel(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${level === k ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {/* Lo-Fi */}
          <AnimatePresence mode="wait">
            {level === "lofi" && (
              <motion.div key="lofi" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="sm:col-span-1 col-span-full">
                <FigmaFrame label="Lo-Fi wireframe" color="#94A3B8">
                  <div className="p-3 space-y-2" style={{ background: "#f8f9fa" }}>
                    <div className="h-3 bg-gray-400 rounded w-20" />
                    <div className="h-16 bg-gray-300 rounded border-2 border-gray-400 flex items-center justify-center">
                      <span className="text-[8px] text-gray-500 font-mono">[hero image]</span>
                    </div>
                    <div className="h-2.5 bg-gray-400 rounded w-3/4" />
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-5/6" />
                    <div className="h-6 bg-gray-400 rounded w-1/2" />
                  </div>
                </FigmaFrame>
              </motion.div>
            )}
            {level === "midfi" && (
              <motion.div key="midfi" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="sm:col-span-1 col-span-full">
                <FigmaFrame label="Mid-Fi wireframe" color="#6366F1">
                  <div className="p-3 space-y-2 bg-white">
                    <div className="flex justify-between items-center">
                      <div className="h-3 bg-slate-600 rounded w-16 font-bold" />
                      <div className="flex gap-1">
                        <div className="h-3 w-8 bg-slate-300 rounded" />
                        <div className="h-3 w-12 bg-slate-800 rounded" />
                      </div>
                    </div>
                    <div className="h-20 bg-slate-100 rounded border border-slate-300 flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-3 bg-slate-700 rounded w-32 mb-1.5 mx-auto" />
                        <div className="h-2 bg-slate-400 rounded w-24 mx-auto" />
                      </div>
                    </div>
                    <div className="h-7 bg-slate-800 rounded w-1/2" />
                    <div className="grid grid-cols-3 gap-1">
                      {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 border border-slate-200 rounded" />)}
                    </div>
                  </div>
                </FigmaFrame>
              </motion.div>
            )}
            {level === "hifi" && (
              <motion.div key="hifi" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="sm:col-span-1 col-span-full">
                <FigmaFrame label="Hi-Fi прототип" color="#1ABCFE">
                  <div className="p-3 space-y-2 bg-white">
                    <div className="flex justify-between items-center">
                      <div className="text-[9px] font-black text-slate-800">LOGO™</div>
                      <div className="flex gap-1">
                        <div className="h-3 px-1.5 rounded text-[7px] flex items-center text-slate-400 border border-slate-200">Меню</div>
                        <div className="h-3 px-1.5 rounded text-[7px] flex items-center text-white bg-teal-500 font-bold">Начать</div>
                      </div>
                    </div>
                    <div className="rounded-lg overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 p-3">
                      <div className="text-[11px] font-black text-white mb-1">Главный заголовок</div>
                      <div className="text-[7px] text-white/80 mb-2">Описание продукта в одной строке</div>
                      <div className="bg-white text-teal-600 text-[7px] font-bold px-2 py-0.5 rounded-full w-fit">Попробовать →</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {["#EEF2FF","#F0FDF4","#FEF3C7"].map((bg, i) => (
                        <div key={i} className="rounded p-1.5 border border-slate-100" style={{background:bg}}>
                          <div className="h-1.5 bg-slate-400 rounded mb-1" />
                          <div className="h-1 bg-slate-300 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </FigmaFrame>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description */}
          <div className="sm:col-span-2 space-y-3">
            {level === "lofi" && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                  <span className="text-lg">⏱</span>
                  <div><strong className="text-xs">20 минут</strong><p className="text-[0.7rem] text-muted-foreground">от руки или в FigJam</p></div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                  <span className="text-lg">🎯</span>
                  <div><strong className="text-xs">Цель: зафиксировать логику</strong><p className="text-[0.7rem] text-muted-foreground">Критикуют только за логику, не за внешний вид</p></div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
                  <span className="text-lg">🚫</span>
                  <div><strong className="text-xs text-amber-700">Нельзя:</strong><p className="text-[0.7rem] text-amber-600">Давать обратную связь по цвету и шрифтам — это шум!</p></div>
                </div>
              </div>
            )}
            {level === "midfi" && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200">
                  <span className="text-lg">📐</span>
                  <div><strong className="text-xs">Реальные пропорции</strong><p className="text-[0.7rem] text-muted-foreground">Сетки, иерархия текста без реальных шрифтов</p></div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                  <span className="text-lg">⏱</span>
                  <div><strong className="text-xs">2-4 часа в Figma</strong><p className="text-[0.7rem] text-muted-foreground">Выравнивание понимания внутри команды</p></div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                  <strong className="text-xs">PM проверяет:</strong>
                  <ul className="text-[0.7rem] text-muted-foreground mt-1 space-y-0.5">
                    <li>✓ Иерархия = бизнес-приоритетам?</li>
                    <li>✓ Навигация понятна без объяснений?</li>
                    <li>✓ Весь контент влезает на экран?</li>
                  </ul>
                </div>
              </div>
            )}
            {level === "hifi" && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200">
                  <span className="text-lg">🎨</span>
                  <div><strong className="text-xs">Финальный визуал + интерактивность</strong><p className="text-[0.7rem] text-muted-foreground">1-3 дня в Figma или через AI-инструменты</p></div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                  <strong className="text-xs">AI-инструменты (2026):</strong>
                  <div className="grid grid-cols-2 gap-1 mt-1.5">
                    {["v0.dev", "Bolt.new", "Lovable", "Cursor"].map(t => (
                      <span key={t} className="text-[0.65rem] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium text-center">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200">
                  <strong className="text-xs text-emerald-700">1-2 часа Lo-Fi = сэкономленные дни разработки</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L7: ИНФОРМАЦИОННАЯ АРХИТЕКТУРА
// ─────────────────────────────────────────────────────────────

function L7NavPatterns() {
  const [active, setActive] = useState(0);
  const patterns = [
    {
      name: "Tab Bar", icon: "⊞", color: "#0EA5E9", use: "3-5 основных разделов мобильного приложения",
      pro: "Всегда виден, высокий engagement", con: "Не более 5 вкладок",
      example: (
        <PhoneFrame>
          <div className="bg-white p-2 h-full flex flex-col" style={{minHeight:240}}>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-1">🏠</div>
                <div className="text-[10px] text-slate-400">Главный экран</div>
              </div>
            </div>
            <div className="border-t border-slate-100 flex justify-around py-2">
              {["🏠","🔍","❤️","👤"].map((icon, i) => (
                <div key={i} className={`flex flex-col items-center ${i===0 ? "text-teal-500" : "text-slate-300"}`}>
                  <span className="text-[14px]">{icon}</span>
                  <div className={`h-0.5 w-4 rounded-full mt-0.5 ${i===0 ? "bg-teal-500" : "bg-transparent"}`} />
                </div>
              ))}
            </div>
          </div>
        </PhoneFrame>
      )
    },
    {
      name: "Hamburger ☰", icon: "☰", color: "#EF4444", use: "Вторичная навигация (но не основная!)",
      pro: "Компактный, много разделов", con: "Скрывает контент → -30-50% engagement",
      example: (
        <PhoneFrame>
          <div className="bg-white p-2 h-full flex flex-col" style={{minHeight:240}}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
              <div className="text-[9px] font-bold text-slate-700">LOGO</div>
              <div className="flex flex-col gap-0.5 p-1">
                <div className="h-0.5 w-4 bg-slate-600 rounded" />
                <div className="h-0.5 w-4 bg-slate-600 rounded" />
                <div className="h-0.5 w-4 bg-slate-600 rounded" />
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="text-[9px] text-slate-300 text-center">Пользователь не видит разделы</div>
              <div className="text-[9px] text-red-400 text-center font-semibold">→ реже их использует</div>
            </div>
          </div>
        </PhoneFrame>
      )
    },
    {
      name: "Flat", icon: "◻", color: "#8B5CF6", use: "Продукты с ≤5 разделами",
      pro: "Минимальная глубина кликов, всё видно", con: "Только для небольшого числа разделов",
      example: (
        <PhoneFrame>
          <div className="bg-white p-2 h-full" style={{minHeight:240}}>
            <div className="text-[9px] font-bold text-slate-700 mb-2">Главная</div>
            <div className="grid grid-cols-2 gap-1.5">
              {["📊 Аналитика","⚙️ Настройки","📬 Входящие","👥 Команда"].map(s => (
                <div key={s} className="rounded-lg border border-slate-200 bg-slate-50 p-2 flex items-center gap-1">
                  <span className="text-[10px]">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </PhoneFrame>
      )
    },
  ];

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Навигационные паттерны — сравни</SectionLabel>
        <div className="flex gap-2 mb-5">
          {patterns.map((p, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${active === i ? "text-white shadow" : "bg-muted text-muted-foreground"}`}
              style={active === i ? { background: p.color } : {}}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="flex justify-center">{patterns[active].example}</div>
            <div className="space-y-3">
              <div className="text-sm font-bold text-foreground">{patterns[active].name}</div>
              <p className="text-[0.775rem] text-muted-foreground">{patterns[active].use}</p>
              <div className="space-y-2">
                <div className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[0.75rem] text-emerald-700 dark:text-emerald-300">{patterns[active].pro}</p>
                </div>
                <div className="flex gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[0.75rem] text-red-700 dark:text-red-300">{patterns[active].con}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L8: АДАПТИВНЫЙ ДИЗАЙН И ДОСТУПНОСТЬ
// ─────────────────────────────────────────────────────────────

function L8Breakpoints() {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const devices = [
    { id: "mobile" as const, icon: Smartphone, label: "Mobile", bp: "375px", traffic: "75%", note: "Mobile First — начинай здесь!" },
    { id: "tablet" as const, icon: Tablet, label: "Tablet", bp: "768px", traffic: "12%", note: "Portrait: стопки; Landscape: сетки" },
    { id: "desktop" as const, icon: Monitor, label: "Desktop", bp: "1280px", traffic: "13%", note: "Добавляй контент поверх мобильной базы" },
  ];

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Breakpoints и мобильный трафик</SectionLabel>
        <div className="flex gap-2 mb-5">
          {devices.map(d => (
            <button key={d.id} onClick={() => setDevice(d.id)}
              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${device === d.id ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-border"}`}>
              <d.icon className={`w-4 h-4 ${device === d.id ? "text-teal-500" : "text-muted-foreground"}`} />
              <span className="text-[0.65rem] font-bold text-foreground">{d.label}</span>
              <span className="text-[0.55rem] text-muted-foreground">{d.bp}</span>
            </button>
          ))}
        </div>
        {devices.filter(d => d.id === device).map(d => (
          <div key={d.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex justify-center">
              {d.id === "mobile" && (
                <PhoneFrame>
                  <div className="bg-white p-2 space-y-2" style={{minHeight:240}}>
                    <div className="flex justify-between items-center">
                      <div className="text-[9px] font-black text-slate-800">LOGO</div>
                      <div className="h-3 px-1.5 rounded text-[7px] text-white bg-teal-500 font-bold flex items-center">Начать</div>
                    </div>
                    <div className="text-[12px] font-black text-slate-800 leading-tight">Заголовок<br/>на 2 строки</div>
                    <div className="text-[8px] text-slate-400">Описание</div>
                    <div className="bg-teal-500 rounded-lg h-8 w-full" />
                    <div className="space-y-1.5">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex gap-2 p-1.5 rounded-lg border border-slate-100">
                          <div className="w-8 h-8 bg-slate-200 rounded" />
                          <div className="flex-1">
                            <div className="h-2 bg-slate-300 rounded mb-1" />
                            <div className="h-1.5 bg-slate-200 rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PhoneFrame>
              )}
              {d.id === "tablet" && (
                <div className="rounded-[16px] border-4 border-slate-600 bg-slate-100 overflow-hidden" style={{width:200}}>
                  <div className="bg-white p-2 space-y-1.5" style={{minHeight:150}}>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <div className="text-[9px] font-black">LOGO</div>
                      <div className="flex gap-1">
                        {["О нас","Цены","Начать"].map((t,i) => (
                          <div key={t} className={`h-3 px-1.5 rounded text-[6px] flex items-center ${i===2 ? "bg-teal-500 text-white font-bold" : "text-slate-400 border border-slate-200"}`}>{t}</div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <div className="text-[10px] font-black text-slate-800 mb-1">Заголовок</div>
                        <div className="text-[7px] text-slate-400 mb-2">Описание</div>
                        <div className="bg-teal-500 rounded h-5 text-[6px] text-white flex items-center justify-center font-bold">CTA кнопка</div>
                      </div>
                      <div className="bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 border border-slate-200 rounded" />)}
                    </div>
                  </div>
                </div>
              )}
              {d.id === "desktop" && (
                <div className="rounded-lg border-4 border-slate-600 bg-white overflow-hidden" style={{width:240}}>
                  <div className="bg-slate-100 h-3 flex items-center gap-1 px-2">
                    {["#EF4444","#F59E0B","#10B981"].map(c => <div key={c} className="w-1.5 h-1.5 rounded-full" style={{background:c}} />)}
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <div className="text-[8px] font-black">LOGO</div>
                      <div className="flex gap-1">
                        {["Продукт","Цены","Ресурсы","О нас","Войти"].map((t,i) => (
                          <div key={t} className={`h-3 px-1 rounded text-[5.5px] flex items-center ${i===4 ? "bg-teal-500 text-white font-bold" : "text-slate-400"}`}>{t}</div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <div className="text-[10px] font-black text-slate-800 mb-1">Главный заголовок</div>
                        <div className="text-[6px] text-slate-400 mb-1.5">Подзаголовок с ценностью</div>
                        <div className="bg-teal-500 rounded h-4 w-16 text-[5.5px] text-white flex items-center justify-center font-bold">Начать бесплатно</div>
                      </div>
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg h-20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl shadow-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-50 border border-slate-100 rounded" />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="text-center p-4 rounded-xl border-2" style={{ borderColor: "#0EA5E9", background: "#0EA5E920" }}>
                <div className="text-3xl font-black text-foreground">{d.traffic}</div>
                <div className="text-xs text-muted-foreground">трафика с {d.label.toLowerCase()}</div>
              </div>
              <p className="text-[0.775rem] text-muted-foreground">{d.note}</p>
            </div>
          </div>
        ))}
      </div>
    </VisualBlock>
  );
}

function L8POURPrinciples() {
  const [active, setActive] = useState<number | null>(null);
  const principles = [
    { letter: "P", word: "Perceivable", ru: "Воспринимаемо", color: "#3B82F6", desc: "Весь контент может быть воспринят. Контраст 4.5:1, alt-тексты, субтитры." },
    { letter: "O", word: "Operable", ru: "Управляемо", color: "#8B5CF6", desc: "Keyboard navigation, tap target ≥ 44×44px, не только мышь." },
    { letter: "U", word: "Understandable", ru: "Понятно", color: "#0891B2", desc: "Консистентная навигация, понятные ошибки, предсказуемое поведение." },
    { letter: "R", word: "Robust", ru: "Надёжно", color: "#059669", desc: "Работает с screen readers, разными браузерами и assistive technologies." },
  ];

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Четыре принципа WCAG — POUR</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {principles.map((p, i) => (
            <motion.button
              key={i}
              onClick={() => setActive(active === i ? null : i)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${active === i ? "shadow-lg" : "border-border"}`}
              style={active === i ? { borderColor: p.color, background: p.color + "15" } : {}}>
              <div className="text-2xl font-black mb-1" style={{ color: p.color }}>{p.letter}</div>
              <div className="text-[0.65rem] font-bold text-foreground">{p.ru}</div>
              <div className="text-[0.55rem] text-muted-foreground">{p.word}</div>
            </motion.button>
          ))}
        </div>
        <AnimatePresence>
          {active !== null && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="rounded-xl p-4 border-2" style={{ borderColor: principles[active].color + "50", background: principles[active].color + "10" }}>
                <strong className="text-sm" style={{ color: principles[active].color }}>{principles[active].letter} — {principles[active].ru}</strong>
                <p className="text-[0.8rem] text-foreground mt-1">{principles[active].desc}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L9: МИКРОВЗАИМОДЕЙСТВИЯ
// ─────────────────────────────────────────────────────────────

function L9AnimationDemo() {
  const [duration, setDuration] = useState(300);
  const [easing, setEasing] = useState<"linear" | "ease-in-out" | "ease-out">("ease-in-out");
  const [running, setRunning] = useState(false);

  const trigger = () => { setRunning(false); setTimeout(() => setRunning(true), 50); };

  const easingMap = {
    "linear": [0, 0, 1, 1],
    "ease-in-out": [0.4, 0, 0.2, 1],
    "ease-out": [0, 0, 0.2, 1],
  };

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Длительность и easing анимации — интерактивно</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 flex justify-between">
                <span>Длительность</span>
                <span className={`font-bold ${duration <= 300 ? "text-emerald-500" : duration <= 500 ? "text-amber-500" : "text-red-500"}`}>
                  {duration}ms {duration > 500 ? "⚠️ слишком долго" : duration <= 200 ? "⚡ быстро" : "✓ норм"}
                </span>
              </label>
              <input type="range" min={50} max={800} step={50} value={duration} onChange={e => setDuration(+e.target.value)}
                className="w-full accent-teal-500" />
              <div className="flex justify-between text-[0.6rem] text-muted-foreground mt-1">
                <span>50ms (hover)</span><span>300ms (норм)</span><span>800ms (лаг!)</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Тип easing</label>
              <div className="flex gap-2 flex-wrap">
                {(["linear","ease-in-out","ease-out"] as const).map(e => (
                  <button key={e} onClick={() => setEasing(e)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${easing === e ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={trigger}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold transition-all">
              ▶ Запустить анимацию
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative rounded-xl bg-muted/40 border border-border overflow-hidden" style={{ height: 80 }}>
              {running && (
                <motion.div
                  key={`${duration}-${easing}-${running}`}
                  className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg"
                  initial={{ left: "4px" }}
                  animate={{ left: "calc(100% - 52px)" }}
                  transition={{ duration: duration / 1000, ease: easingMap[easing] as any }}
                />
              )}
              {!running && (
                <div className="absolute top-1/2 left-1 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200">
                <span className="text-sm">⚡</span>
                <p className="text-[0.7rem] text-emerald-700 dark:text-emerald-300">100-200ms: hover, toggle — незаметно, но создаёт отклик</p>
              </div>
              <div className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200">
                <span className="text-sm">✅</span>
                <p className="text-[0.7rem] text-emerald-700 dark:text-emerald-300">200-350ms: переходы между экранами — оптимум</p>
              </div>
              <div className="flex gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
                <span className="text-sm">🐢</span>
                <p className="text-[0.7rem] text-red-700 dark:text-red-300">&gt;500ms без loading-цели — ощущение лага!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

function L9UXCopyExamples() {
  const examples = [
    {
      category: "Кнопки",
      bad: ["OK", "Отмена", "Подтверждение", "Да"],
      good: ["Сохранить изменения", "Отменить заказ", "Перейти к оплате", "Удалить навсегда"],
      note: "Кнопка = действие, пользователь знает что произойдёт"
    },
    {
      category: "Ошибки",
      bad: ["Ошибка", "Что-то пошло не так", "Error 403", "Ошибка авторизации"],
      good: ["Неверный email или пароль. Проверьте данные →", "Сервер недоступен. Попробуйте через 1 минуту →", "Нет доступа. Войдите в аккаунт →", "Сессия истекла. Войдите снова →"],
      note: "Ошибка = объяснение + путь решения"
    },
    {
      category: "Пустые состояния",
      bad: ["Нет данных", "Список пуст", "Ничего не найдено", "0 элементов"],
      good: ["Здесь появятся проекты — создай первый →", "Добавь первую задачу, чтобы начать →", "По запросу ничего. Попробуй другие слова →", "Пока нет уведомлений — всё спокойно ✓"],
      note: "Пустое состояние = приглашение к действию"
    },
  ];
  const [tab, setTab] = useState(0);
  const [showGood, setShowGood] = useState(false);

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>UX Writing — плохо vs хорошо</SectionLabel>
        <div className="flex gap-2 mb-4 flex-wrap">
          {examples.map((e, i) => (
            <button key={i} onClick={() => { setTab(i); setShowGood(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === i ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"}`}>
              {e.category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl border-2 border-red-200 dark:border-red-800 overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-red-700 dark:text-red-300">Плохо</span>
            </div>
            <div className="p-3 space-y-1.5">
              {examples[tab].bad.map((t, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 text-[0.775rem] text-muted-foreground">
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Хорошо</span>
            </div>
            <div className="p-3 space-y-1.5">
              {examples[tab].good.map((t, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 text-[0.775rem] text-foreground">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
          <p className="text-[0.775rem] text-violet-700 dark:text-violet-300">💡 {examples[tab].note}</p>
        </div>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// L10: HANDOFF
// ─────────────────────────────────────────────────────────────

function L10HandoffFailures() {
  const failures = [
    {
      title: "Провал 1: Неизвестные состояния",
      icon: "🕳️", color: "#EF4444",
      problem: "Макет показывает только happy path — данные есть, всё работает",
      result: "Разработчик не знает, что рисовать при loading, error, empty → решает сам → неправильно",
      fix: "Документировать ВСЕ состояния: empty, loading, error, success для каждого компонента",
    },
    {
      title: "Провал 2: Граничные случаи",
      icon: "📏", color: "#F59E0B",
      problem: "Текст в карточке — 20 символов. А если пользователь введёт 200?",
      result: "Разработчик обрезает по-своему → сломанный UI на реальных данных",
      fix: "Указывать max-length + поведение при обрезании (ellipsis / wrap / scroll) в спецификации",
    },
    {
      title: "Провал 3: Анимации",
      icon: "🎬", color: "#8B5CF6",
      problem: "Дизайнер нарисовал красивый экран, анимации — не описал",
      result: "Разработчик добавляет «что-то на глаз» → дизайнер говорит «это не так»",
      fix: "Motion tokens: длительность, easing, задержка для каждого элемента перехода",
    },
  ];
  const [active, setActive] = useState<number | null>(null);

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>Три главных провала handoff</SectionLabel>
        <div className="space-y-3">
          {failures.map((f, i) => (
            <motion.div key={i} layout className="rounded-xl border-2 overflow-hidden cursor-pointer"
              style={{ borderColor: active === i ? f.color : "transparent" }}
              onClick={() => setActive(active === i ? null : i)}>
              <div className={`flex items-center gap-3 p-3 border border-border rounded-xl ${active === i ? "rounded-b-none border-b-0" : ""}`}
                style={active === i ? { borderColor: f.color + "60", background: f.color + "10" } : {}}>
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-bold text-foreground flex-1">{f.title}</span>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${active === i ? "rotate-90" : ""}`} />
              </div>
              <AnimatePresence>
                {active === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden">
                    <div className="p-3 border border-t-0 rounded-b-xl space-y-2" style={{ borderColor: f.color + "40" }}>
                      <div className="flex gap-2">
                        <span className="text-xs font-bold text-muted-foreground shrink-0">ПРОБЛЕМА:</span>
                        <p className="text-[0.775rem] text-foreground">{f.problem}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs font-bold text-red-500 shrink-0">ИТОГ:</span>
                        <p className="text-[0.775rem] text-red-600 dark:text-red-400">{f.result}</p>
                      </div>
                      <div className="flex gap-2 p-2 rounded-lg" style={{ background: f.color + "15" }}>
                        <span className="text-xs font-bold shrink-0" style={{ color: f.color }}>FIX:</span>
                        <p className="text-[0.775rem]" style={{ color: f.color }}>{f.fix}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </VisualBlock>
  );
}

function L10AgentsMd() {
  const code = `# Компонент: CardProduct

## Назначение
Карточка товара в каталоге.
Используется на /catalog и в поиске.

## Визуальная структура
- Image: 16:9, cover, rounded-xl
- Title: max 2 строки, ellipsis
- Price: font-bold text-2xl, primary

## Состояния
- default: shadow-sm
- hover: shadow-md, scale(1.01), 200ms ease-out
- out-of-stock: overlay 'Нет в наличии'
- loading: skeleton pulse

## Граничные случаи
- Название > 60 символов → ellipsis
- Нет изображения → placeholder icon
- Цена = 0 → показать 'Бесплатно'

## Токены
- spacing: --space-4 / --space-2
- radius: --radius-xl
- colors: --primary / --muted`;

  return (
    <VisualBlock>
      <div className="p-5">
        <SectionLabel>AGENTS.md — handoff будущего (по Ярославу Шуваеву)</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-bold text-foreground">AGENTS.md</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300">AI-ready</span>
            </div>
            <div className="rounded-xl bg-slate-900 overflow-hidden">
              <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-1.5">
                {["#EF4444","#F59E0B","#10B981"].map(c => <div key={c} className="w-2 h-2 rounded-full" style={{background:c}} />)}
                <span className="text-[0.6rem] text-slate-400 ml-1">AGENTS.md</span>
              </div>
              <pre className="p-3 text-[0.65rem] leading-relaxed overflow-auto" style={{ maxHeight: 240, color: "#E2E8F0", fontFamily: "monospace" }}>
                {code.split("\n").map((line, i) => {
                  const isHeader = line.startsWith("#");
                  const isSection = line.startsWith("##");
                  const isBullet = line.startsWith("-");
                  return (
                    <div key={i} style={{
                      color: isSection ? "#7DD3FC" : isHeader ? "#F9A8D4" : isBullet ? "#86EFAC" : "#E2E8F0"
                    }}>
                      {line || "\u00A0"}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700">
              <p className="text-xs font-bold text-teal-700 dark:text-teal-300 mb-1">Что это меняет?</p>
              <ul className="space-y-1.5 text-[0.75rem] text-teal-600 dark:text-teal-400">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />AI-агент читает файл → реализует компонент</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />Все состояния и граничные случаи — в одном месте</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />Стоимость итерации падает в 10×</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />Нет Q&A между дизайнером и разработчиком</li>
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Роль PM в handoff:</p>
              <ul className="space-y-1 text-[0.75rem] text-amber-600 dark:text-amber-400">
                <li>✓ Все edge cases в acceptance criteria</li>
                <li>✓ Handoff-сессия: PM + дизайнер + разраб</li>
                <li>✓ QA по спецификации, не «на глаз»</li>
              </ul>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border text-center">
              <span className="text-[0.7rem] text-muted-foreground">30% времени разработчика тратится</span>
              <div className="text-lg font-black text-foreground">на уточнения</div>
              <span className="text-[0.65rem] text-muted-foreground">которых не было в дизайне</span>
            </div>
          </div>
        </div>
      </div>
    </VisualBlock>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT: maps lessonId → visual blocks
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// FIGMA-STYLE UI MOCKUPS
// ─────────────────────────────────────────────────────────────

function FigmaChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-md bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded grid place-items-center" style={{ background: "#0acf83" }}>
            <span className="text-[0.5rem] font-black text-white">F</span>
          </div>
          <span className="text-[0.7rem] font-semibold text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
      </div>
      {children}
    </div>
  );
}

function FigmaAutoLayoutMock() {
  return (
    <div>
      <SectionLabel>📐 Figma · Auto Layout & Layers</SectionLabel>
      <FigmaChrome title="checkout.fig — Frame 142">
        <div className="grid grid-cols-[180px_1fr_200px] min-h-[280px] text-[0.7rem]">
          {/* Layers panel */}
          <div className="border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 space-y-1">
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Layers</div>
            {[
              { n: "▼ 📱 Checkout", d: 0, sel: false },
              { n: "▼ ⬛ Header", d: 1, sel: false },
              { n: "🅰 Logo", d: 2, sel: false },
              { n: "▼ ⬛ Cart Items", d: 1, sel: true },
              { n: "▦ Item · iPhone", d: 2, sel: false },
              { n: "▦ Item · AirPods", d: 2, sel: false },
              { n: "▼ ⬛ Summary", d: 1, sel: false },
              { n: "🔘 Pay button", d: 2, sel: false },
            ].map((l, i) => (
              <div
                key={i}
                className={`flex items-center px-1.5 py-0.5 rounded ${
                  l.sel ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300"
                }`}
                style={{ paddingLeft: 4 + l.d * 10 }}
              >
                <span className="truncate">{l.n}</span>
              </div>
            ))}
          </div>
          {/* Canvas */}
          <div className="bg-slate-200/50 dark:bg-slate-950/50 p-4 grid place-items-center">
            <div className="w-[200px] rounded-lg border-2 border-blue-500 bg-white dark:bg-slate-800 p-3 space-y-2 shadow-lg relative">
              <div className="absolute -top-5 left-0 text-[0.6rem] font-bold text-blue-500">Cart Items · vertical · gap 8</div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-100 dark:bg-slate-700">
                <div className="w-7 h-7 rounded bg-rose-300" />
                <div className="flex-1">
                  <div className="h-1.5 w-12 bg-slate-400 rounded" />
                  <div className="h-1.5 w-8 bg-slate-300 rounded mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded bg-slate-100 dark:bg-slate-700">
                <div className="w-7 h-7 rounded bg-cyan-300" />
                <div className="flex-1">
                  <div className="h-1.5 w-14 bg-slate-400 rounded" />
                  <div className="h-1.5 w-6 bg-slate-300 rounded mt-1" />
                </div>
              </div>
            </div>
          </div>
          {/* Properties panel */}
          <div className="border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 space-y-2">
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">Auto layout</div>
            <div className="flex gap-1">
              {["↓", "→", "↘"].map((d, i) => (
                <div key={i} className={`flex-1 h-7 grid place-items-center rounded border ${
                  i === 0 ? "bg-blue-500 text-white border-blue-500" : "border-slate-300 dark:border-slate-700"
                }`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↕ <span className="font-semibold">8</span></div>
              <div className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↔ <span className="font-semibold">12</span></div>
              <div className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">⊥ <span className="font-semibold">16</span></div>
              <div className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">⊤ <span className="font-semibold">16</span></div>
            </div>
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 pt-2">Resizing</div>
            <div className="space-y-1">
              <div className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">W · Fill ⤢</div>
              <div className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">H · Hug ⇲</div>
            </div>
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Auto Layout — главный инструмент: компонент сам пересчитывает паддинги, gap и размеры при изменении контента. Без него каждое обновление текста = ручная переверстка.
      </p>
    </div>
  );
}

function FigmaVariantsMock() {
  return (
    <div>
      <SectionLabel>🎛 Figma · Component Variants</SectionLabel>
      <FigmaChrome title="design-system / Button">
        <div className="p-5 bg-slate-50 dark:bg-slate-900/50">
          <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Button — 3 properties · 18 variants
          </div>
          <div className="rounded-lg border-2 border-dashed border-purple-400 p-4 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-[0.7rem]">
              <div className="font-semibold text-slate-500 text-center">size=sm</div>
              <div className="font-semibold text-slate-500 text-center">size=md</div>
              <div className="font-semibold text-slate-500 text-center">size=lg</div>
              {(["primary", "secondary", "ghost"] as const).map(variant => (
                ([
                  { sz: "px-2 py-1 text-[0.65rem]" },
                  { sz: "px-3 py-1.5 text-xs" },
                  { sz: "px-4 py-2 text-sm" },
                ].map((s, j) => {
                  const cls = variant === "primary"
                    ? "bg-blue-500 text-white"
                    : variant === "secondary"
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
                  return (
                    <div key={`${variant}-${j}`} className="flex justify-center">
                      <button className={`rounded font-semibold ${s.sz} ${cls}`}>Button</button>
                    </div>
                  );
                }))
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-[0.65rem]">
            {[
              { k: "variant", v: "primary | secondary | ghost", c: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
              { k: "size", v: "sm | md | lg", c: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
              { k: "state", v: "default | hover | disabled", c: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
            ].map(p => (
              <div key={p.k} className={`rounded px-2.5 py-1.5 ${p.c}`}>
                <div className="font-bold">{p.k}</div>
                <div className="opacity-75">{p.v}</div>
              </div>
            ))}
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Variants превращают кучу копий кнопки в один компонент с пропсами. PM смотрит на этот экран и понимает, что добавить «огромную красную кнопку без рамки» — значит сломать систему.
      </p>
    </div>
  );
}

function FigmaTokensMock() {
  return (
    <div>
      <SectionLabel>🪙 Figma · Design Tokens (Variables)</SectionLabel>
      <FigmaChrome title="tokens.fig — Variables">
        <div className="grid grid-cols-[140px_1fr] text-[0.7rem]">
          <div className="border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 space-y-0.5">
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Collections</div>
            {["▶ primitives", "▼ semantic", "  · color", "  · spacing", "  · radius", "▶ themes"].map((c, i) => (
              <div key={i} className={`px-1.5 py-0.5 rounded ${
                c.includes("color") ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300"
              }`}>{c}</div>
            ))}
          </div>
          <div className="p-3 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-[1fr_120px_120px_60px] gap-2 text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200 dark:border-slate-700">
              <span>Token</span><span>Light</span><span>Dark</span><span></span>
            </div>
            {[
              { n: "color/bg/canvas", l: "#FFFFFF", d: "#0F172A" },
              { n: "color/bg/surface", l: "#F8FAFC", d: "#1E293B" },
              { n: "color/text/primary", l: "#0F172A", d: "#F1F5F9" },
              { n: "color/text/muted", l: "#64748B", d: "#94A3B8" },
              { n: "color/brand/500", l: "#0D9488", d: "#14B8A6" },
              { n: "color/danger/500", l: "#EF4444", d: "#F87171" },
            ].map(t => (
              <div key={t.n} className="grid grid-cols-[1fr_120px_120px_60px] gap-2 items-center py-1 text-[0.7rem] border-b border-slate-100 dark:border-slate-800">
                <code className="text-slate-700 dark:text-slate-300">{t.n}</code>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded border border-slate-300" style={{ background: t.l }} />
                  <span className="font-mono text-[0.65rem]">{t.l}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded border border-slate-600" style={{ background: t.d }} />
                  <span className="font-mono text-[0.65rem]">{t.d}</span>
                </div>
                <span className="text-emerald-500 text-[0.65rem]">✓ синк</span>
              </div>
            ))}
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Variables в Figma 1:1 мапятся в CSS-переменные / Tailwind config. Один источник правды — design system, code, темы. Меняешь токен → весь продукт перекрашивается.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MIRO-STYLE UI MOCKUPS
// ─────────────────────────────────────────────────────────────

function MiroChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-md bg-amber-50 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-yellow-300 border-b border-yellow-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full grid place-items-center bg-black">
            <span className="text-[0.5rem] font-black text-yellow-300">M</span>
          </div>
          <span className="text-[0.7rem] font-semibold text-slate-900">{title}</span>
        </div>
        <span className="text-[0.6rem] font-bold text-slate-900/70">miro.com</span>
      </div>
      <div
        className="relative"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Sticky({ color, children, style }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const colors: Record<string, string> = {
    yellow: "#FEF08A",
    pink: "#FBCFE8",
    blue: "#BFDBFE",
    green: "#BBF7D0",
    orange: "#FED7AA",
    purple: "#DDD6FE",
  };
  return (
    <div
      className="text-[0.65rem] font-semibold text-slate-800 px-2 py-1.5 leading-tight shadow"
      style={{
        background: colors[color] ?? color,
        transform: `rotate(${(Math.random() - 0.5) * 3}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MiroCJMBoard() {
  const stages = [
    { name: "Awareness", emoji: "👀", thoughts: ["видел рекламу", "коллега посоветовал"], emotion: 0.3, color: "yellow" },
    { name: "Consideration", emoji: "🔍", thoughts: ["сравниваю цены", "читаю отзывы"], emotion: 0.5, color: "blue" },
    { name: "Onboarding", emoji: "🚪", thoughts: ["слишком много полей", "что нажать?"], emotion: -0.4, color: "pink" },
    { name: "Activation", emoji: "✨", thoughts: ["о, заработало!", "это удобно"], emotion: 0.8, color: "green" },
    { name: "Retention", emoji: "🔁", thoughts: ["использую каждый день"], emotion: 0.6, color: "purple" },
  ];
  return (
    <div>
      <SectionLabel>🗺 Miro · Customer Journey Map</SectionLabel>
      <MiroChrome title="CJM — SaaS onboarding (workshop 27.04)">
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            {stages.map(s => (
              <div key={s.name} className="rounded bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 p-1.5 text-center">
                <div className="text-lg">{s.emoji}</div>
                <div className="text-[0.65rem] font-bold text-slate-700 dark:text-slate-200">{s.name}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 min-h-[68px]">
            {stages.map(s => (
              <div key={s.name} className="space-y-1">
                {s.thoughts.map((t, i) => (
                  <Sticky key={i} color={s.color}>{t}</Sticky>
                ))}
              </div>
            ))}
          </div>
          <div className="relative h-16 bg-white/60 dark:bg-slate-800/60 rounded border border-slate-300 dark:border-slate-600 px-2">
            <div className="absolute inset-x-2 top-1/2 h-px bg-slate-300" />
            <svg className="w-full h-full" viewBox="0 0 500 60" preserveAspectRatio="none">
              <polyline
                points={stages.map((s, i) => `${(i + 0.5) * 100},${30 - s.emotion * 22}`).join(" ")}
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.5"
              />
              {stages.map((s, i) => (
                <circle key={i} cx={(i + 0.5) * 100} cy={30 - s.emotion * 22} r="4" fill="#dc2626" />
              ))}
            </svg>
            <span className="absolute left-2 top-1 text-[0.55rem] font-bold text-rose-600">😀 эмоция</span>
            <span className="absolute left-2 bottom-1 text-[0.55rem] font-bold text-rose-600">😞</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Sticky color="orange">🔴 dropoff: Onboarding → Activation</Sticky>
            <Sticky color="orange">💡 идея: убрать 4 поля из формы</Sticky>
            <Sticky color="orange">📏 KPI: T2V с 12м → 4м</Sticky>
          </div>
        </div>
      </MiroChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Это рабочая доска воркшопа: стикеры с цитатами пользователей, кривая эмоций, найденные dropoff'ы и гипотезы. PM приносит её на стенд-ап вместо «у нас плохой onboarding».
      </p>
    </div>
  );
}

function MiroUserFlowBoard() {
  return (
    <div>
      <SectionLabel>🔀 Miro · User Flow Diagram</SectionLabel>
      <MiroChrome title="Flow — Checkout v2 (mid-fi)">
        <div className="p-5 min-h-[260px] relative">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 240">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <polygon points="0 0, 8 4, 0 8" fill="#475569" />
              </marker>
            </defs>
            {[
              "M 90 60 L 170 60",
              "M 250 60 L 330 60",
              "M 410 60 L 490 60",
              "M 290 95 L 290 145",
              "M 250 175 L 170 175",
              "M 330 175 L 410 175",
            ].map((d, i) => (
              <path key={i} d={d} stroke="#475569" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" strokeDasharray="0" />
            ))}
          </svg>
          <div className="relative grid grid-cols-4 gap-y-8 gap-x-2 text-[0.65rem]">
            {[
              { x: 0, y: 0, t: "Cart", c: "blue", icon: "🛒" },
              { x: 1, y: 0, t: "Address", c: "blue", icon: "📍" },
              { x: 2, y: 0, t: "Payment", c: "blue", icon: "💳", diamond: true },
              { x: 3, y: 0, t: "Review", c: "blue", icon: "📋" },
              { x: 1, y: 1, t: "Card form", c: "yellow", icon: "📝" },
              { x: 2, y: 1, t: "3DS", c: "yellow", icon: "🔐" },
              { x: 3, y: 1, t: "Success", c: "green", icon: "✅" },
              { x: 0, y: 1, t: "Error · retry", c: "pink", icon: "⚠️" },
            ].map((n, i) => (
              <div
                key={i}
                className="rounded shadow-md border-2 px-2 py-1.5 font-semibold text-slate-800 text-center"
                style={{
                  background: n.c === "blue" ? "#BFDBFE" : n.c === "yellow" ? "#FEF08A" : n.c === "green" ? "#BBF7D0" : "#FBCFE8",
                  borderColor: n.diamond ? "#9333ea" : "transparent",
                  gridColumn: n.x + 1,
                  gridRow: n.y + 1,
                  transform: n.diamond ? "rotate(0deg)" : "none",
                }}
              >
                <div className="text-base">{n.icon}</div>
                {n.t}
                {n.diamond && <div className="text-[0.55rem] text-purple-700 font-bold">decision</div>}
              </div>
            ))}
          </div>
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <Sticky color="blue">экран</Sticky>
            <Sticky color="yellow">действие</Sticky>
            <Sticky color="green">успех</Sticky>
            <Sticky color="pink">ошибка</Sticky>
          </div>
        </div>
      </MiroChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        User flow живёт в Miro/FigJam, а не в голове. Каждая ветка — это экран в Figma; каждый ромб — A/B-эксперимент или edge case, который тестировщик найдёт за тебя в проде, если забыть.
      </p>
    </div>
  );
}

function MiroAffinityBoard() {
  const groups = [
    { title: "Onboarding слишком долгий", color: "yellow", count: 14, notes: ["«заполнял 15 минут»", "«забросил на 3-м экране»", "«не понял, что обязательно»"] },
    { title: "Не ясна ценность", color: "pink", count: 9, notes: ["«а зачем мне это?»", "«непонятно, что я получу»"] },
    { title: "Цена непрозрачна", color: "blue", count: 7, notes: ["«сколько после триала?»", "«где тарифы?»"] },
    { title: "Доверие к бренду", color: "green", count: 5, notes: ["«никогда не слышал»", "«отзывы где?»"] },
  ];
  return (
    <div>
      <SectionLabel>🧩 Miro · Affinity Mapping (12 интервью)</SectionLabel>
      <MiroChrome title="Affinity — JTBD interviews · 27.04">
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {groups.map(g => (
              <div key={g.title} className="rounded-lg border-2 border-dashed border-slate-400/60 dark:border-slate-600 p-2 bg-white/40 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.65rem] font-bold text-slate-700 dark:text-slate-200 leading-tight">{g.title}</span>
                  <span className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white">{g.count}</span>
                </div>
                <div className="space-y-1">
                  {g.notes.map((n, i) => (
                    <Sticky key={i} color={g.color}>{n}</Sticky>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Sticky color="orange">🎯 приоритет #1: сократить onboarding</Sticky>
            <Sticky color="orange">📊 RICE = 84</Sticky>
          </div>
        </div>
      </MiroChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        180 цитат → 4 темы → ранжированный беклог. Affinity mapping превращает «я слышал, что пользователи жалуются» в данные, на которых можно защитить решение перед стейкхолдером.
      </p>
    </div>
  );
}

function FigmaTypeStylesMock() {
  const styles = [
    { n: "display/2xl", s: 56, w: 800, lh: 64, ls: -1.2 },
    { n: "heading/lg", s: 32, w: 700, lh: 40, ls: -0.5 },
    { n: "heading/sm", s: 20, w: 600, lh: 28, ls: -0.2 },
    { n: "body/base", s: 16, w: 400, lh: 24, ls: 0 },
    { n: "body/sm", s: 14, w: 400, lh: 20, ls: 0 },
    { n: "caption", s: 12, w: 500, lh: 16, ls: 0.4 },
  ];
  return (
    <div>
      <SectionLabel>🅰 Figma · Text Styles</SectionLabel>
      <FigmaChrome title="typography.fig — Local Styles">
        <div className="grid grid-cols-[180px_1fr] text-[0.7rem]">
          <div className="border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 space-y-0.5">
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Text styles · 6</div>
            {styles.map(s => (
              <div key={s.n} className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300">
                <span className="text-blue-500">A</span>
                <span className="font-mono text-[0.65rem]">{s.n}</span>
              </div>
            ))}
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
            {styles.map(s => (
              <div key={s.n} className="flex items-baseline gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span
                  className="text-slate-900 dark:text-slate-100"
                  style={{
                    fontSize: s.s,
                    fontWeight: s.w,
                    lineHeight: `${s.lh}px`,
                    letterSpacing: `${s.ls}px`,
                  }}
                >
                  Aa
                </span>
                <div className="flex-1 text-[0.65rem] font-mono text-slate-500">
                  <code>{s.n}</code> · Inter {s.w} · {s.s}/{s.lh} · {s.ls}px
                </div>
              </div>
            ))}
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Шесть стилей закрывают 95% типографики продукта. Если в макете встретился «h2 размером 22px» — кто-то ушёл от системы; PM ловит это на дизайн-ревью.
      </p>
    </div>
  );
}

function FigmaPrototypeMock() {
  return (
    <div>
      <SectionLabel>🔗 Figma · Prototype Connections</SectionLabel>
      <FigmaChrome title="prototype.fig — Tab navigation">
        <div className="relative bg-slate-200/40 dark:bg-slate-950/40 p-5 min-h-[260px]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 260" preserveAspectRatio="none">
            <defs>
              <marker id="arr2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <polygon points="0 0, 8 4, 0 8" fill="#a855f7" />
              </marker>
            </defs>
            {[
              "M 110 230 C 200 280, 250 280, 305 220",
              "M 305 230 C 380 280, 430 280, 495 220",
              "M 110 220 C 200 60, 280 60, 305 130",
              "M 495 220 C 400 60, 350 60, 305 130",
            ].map((d, i) => (
              <path key={i} d={d} stroke="#a855f7" strokeWidth="2" fill="none" markerEnd="url(#arr2)" />
            ))}
          </svg>
          <div className="relative grid grid-cols-3 gap-4">
            {[
              { t: "Home", icon: "🏠", x: 0 },
              { t: "Search", icon: "🔍", x: 1 },
              { t: "Profile", icon: "👤", x: 2 },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border-4 border-purple-400 bg-white dark:bg-slate-800 p-3 shadow-lg"
                style={{ aspectRatio: "9/16", maxWidth: 110, justifySelf: "center" }}
              >
                <div className="absolute -top-5 left-0 text-[0.6rem] font-bold text-purple-500 bg-white dark:bg-slate-900 px-1.5 rounded">
                  {f.t}
                </div>
                <div className="h-full flex flex-col">
                  <div className="text-2xl text-center mb-2">{f.icon}</div>
                  <div className="space-y-1 flex-1">
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-1.5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-1.5 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="flex justify-around pt-2 border-t border-slate-200 dark:border-slate-700 text-[0.65rem]">
                    <span className={i === 0 ? "text-purple-500" : "text-slate-400"}>🏠</span>
                    <span className={i === 1 ? "text-purple-500" : "text-slate-400"}>🔍</span>
                    <span className={i === 2 ? "text-purple-500" : "text-slate-400"}>👤</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-2 right-2 text-[0.6rem] font-bold text-purple-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow">
            ⚡ On tap → Navigate to
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Прототип в Figma — это бесплатная тестовая версия твоей навигации. Если на 5 пользователях из usability-теста двое потерялись на табах, дешевле перерисовать здесь, чем переделывать в коде.
      </p>
    </div>
  );
}

function FigmaConstraintsMock() {
  return (
    <div>
      <SectionLabel>📐 Figma · Constraints & Breakpoints</SectionLabel>
      <FigmaChrome title="responsive.fig — Hero section">
        <div className="p-4 bg-slate-100 dark:bg-slate-900/40 grid grid-cols-3 gap-3">
          {[
            { name: "Mobile · 375", w: "100%", maxW: 130 },
            { name: "Tablet · 768", w: "100%", maxW: 200 },
            { name: "Desktop · 1440", w: "100%", maxW: 280 },
          ].map((vp, i) => (
            <div key={i} className="space-y-1">
              <div className="text-[0.6rem] font-bold text-slate-500 text-center">{vp.name}</div>
              <div
                className="mx-auto rounded border-2 border-blue-400 bg-white dark:bg-slate-800 p-2 space-y-1.5"
                style={{ maxWidth: vp.maxW }}
              >
                <div className="h-3 bg-gradient-to-r from-teal-400 to-cyan-400 rounded" />
                <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-full" />
                <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
                <div className={`grid gap-1 ${i === 0 ? "grid-cols-1" : i === 1 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {Array.from({ length: i === 0 ? 1 : i === 1 ? 2 : 3 }).map((_, j) => (
                    <div key={j} className="h-6 bg-slate-200 dark:bg-slate-700 rounded" />
                  ))}
                </div>
                <div className="h-4 bg-blue-500 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 border-t border-slate-200 dark:border-slate-700 text-[0.7rem]">
          <div>
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Constraints</div>
            <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
              <div>↔ horizontal: <span className="font-mono text-blue-500">left + right</span></div>
              <div>↕ vertical: <span className="font-mono text-blue-500">top</span></div>
              <div>⤢ resize: <span className="font-mono text-blue-500">scale</span></div>
            </div>
          </div>
          <div>
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Breakpoints</div>
            <div className="space-y-0.5 font-mono text-slate-700 dark:text-slate-300">
              <div>sm <span className="text-slate-400">→ 640px</span></div>
              <div>md <span className="text-slate-400">→ 768px</span></div>
              <div>lg <span className="text-slate-400">→ 1024px</span></div>
            </div>
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Один Frame с правильными constraints разворачивается во все три брейкпоинта без копипасты. PM проверяет: на 320px ничего не обрезается, на 1920px не разъезжается.
      </p>
    </div>
  );
}

function FigmaInteractionsMock() {
  return (
    <div>
      <SectionLabel>✨ Figma · Smart Animate & Interactions</SectionLabel>
      <FigmaChrome title="micro.fig — Drawer animation">
        <div className="grid grid-cols-[1fr_220px]">
          <div className="bg-slate-200/40 dark:bg-slate-950/40 p-5 grid grid-cols-2 gap-4 items-center min-h-[220px]">
            <div className="rounded-lg border-2 border-purple-400 bg-white dark:bg-slate-800 p-2 aspect-[9/14] relative shadow">
              <div className="absolute -top-5 left-0 text-[0.6rem] font-bold text-purple-500">Frame · closed</div>
              <div className="space-y-1">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
              <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-purple-500 grid place-items-center text-white">+</div>
            </div>
            <div className="rounded-lg border-2 border-purple-400 bg-white dark:bg-slate-800 p-2 aspect-[9/14] relative shadow">
              <div className="absolute -top-5 left-0 text-[0.6rem] font-bold text-purple-500">Frame · open</div>
              <div className="space-y-1 opacity-40">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-t-xl bg-purple-100 dark:bg-purple-900/50 p-2 space-y-1">
                <div className="h-1 w-8 bg-purple-300 rounded mx-auto" />
                <div className="h-2 bg-purple-300/60 rounded" />
                <div className="h-2 bg-purple-300/60 rounded w-2/3" />
              </div>
            </div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 text-[0.7rem] space-y-2">
            <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">Interaction</div>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between"><span>Trigger</span><span className="font-mono text-purple-500">On tap</span></div>
              <div className="flex justify-between"><span>Action</span><span className="font-mono text-purple-500">Navigate</span></div>
              <div className="flex justify-between"><span>Animation</span><span className="font-mono text-purple-500">Smart Animate</span></div>
              <div className="flex justify-between"><span>Easing</span><span className="font-mono text-purple-500">Ease out</span></div>
              <div className="flex justify-between"><span>Duration</span><span className="font-mono text-purple-500">240ms</span></div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1">Tokens · motion</div>
              <div className="space-y-0.5 font-mono text-[0.65rem] text-slate-600 dark:text-slate-400">
                <div>fast = 120ms</div>
                <div>base = 240ms</div>
                <div>slow = 400ms</div>
              </div>
            </div>
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Smart Animate сам интерполирует разницу между двумя фреймами. Это техзадание для разработчика: «duration 240ms, ease-out» — а не «сделай красиво».
      </p>
    </div>
  );
}

function FigmaDevModeMock() {
  return (
    <div>
      <SectionLabel>👨‍💻 Figma · Dev Mode (handoff)</SectionLabel>
      <FigmaChrome title="checkout.fig — Dev Mode">
        <div className="grid grid-cols-[1fr_240px] text-[0.7rem]">
          <div className="bg-slate-100 dark:bg-slate-900/40 p-5 grid place-items-center min-h-[220px] relative">
            <div className="relative">
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow p-4 w-[180px]">
                <div className="h-2 w-3/4 bg-slate-300 dark:bg-slate-600 rounded mb-2" />
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                <div className="h-1.5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <button className="w-full h-7 rounded bg-teal-500 text-white text-[0.65rem] font-bold">Pay 1 290 ₽</button>
              </div>
              {/* Measurement lines */}
              <div className="absolute -top-6 left-0 right-0 flex items-center text-[0.55rem] font-bold text-rose-500">
                <span className="flex-1 border-t border-dashed border-rose-400" />
                <span className="px-1 bg-white dark:bg-slate-900">180</span>
                <span className="flex-1 border-t border-dashed border-rose-400" />
              </div>
              <div className="absolute -left-6 top-0 bottom-0 flex flex-col items-center text-[0.55rem] font-bold text-rose-500">
                <span className="flex-1 border-l border-dashed border-rose-400" />
                <span className="py-1 bg-white dark:bg-slate-900">142</span>
                <span className="flex-1 border-l border-dashed border-rose-400" />
              </div>
            </div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-3">
            <div>
              <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Layout</div>
              <div className="font-mono text-[0.65rem] space-y-0.5 text-slate-700 dark:text-slate-300">
                <div>W <span className="text-blue-500">180</span> · H <span className="text-blue-500">142</span></div>
                <div>padding <span className="text-blue-500">16</span></div>
                <div>radius <span className="text-blue-500">12</span></div>
                <div>gap <span className="text-blue-500">8</span></div>
              </div>
            </div>
            <div>
              <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Code · React</div>
              <pre className="text-[0.6rem] font-mono bg-slate-900 text-emerald-300 rounded p-2 overflow-x-auto">{`<Card padding="md">
  <Title>...</Title>
  <Button
    variant="primary"
    size="md">
    Pay 1 290 ₽
  </Button>
</Card>`}</pre>
            </div>
            <div className="flex gap-1">
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[0.6rem] font-bold">React ✓</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[0.6rem] font-bold">iOS</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[0.6rem] font-bold">CSS</span>
            </div>
          </div>
        </div>
      </FigmaChrome>
      <p className="text-[0.75rem] text-muted-foreground mt-3 italic">
        Dev Mode — это и есть handoff. Разработчик копирует токены, размеры и сниппет компонента; PM проверяет, что код использует системный <code>variant="primary"</code>, а не хардкод цвета.
      </p>
    </div>
  );
}

const LESSON_VISUALS: Record<string, React.FC[]> = {
  "m-uxui-l1": [L1GarrettPyramid, MiroCJMBoard, MiroAffinityBoard, L1PMChecklist],
  "m-uxui-l2": [L2EyeTracking, L2GoodBadScreens],
  "m-uxui-l3": [L3TypographyScale, FigmaTypeStylesMock, L3FontComparison],
  "m-uxui-l4": [L4ColorPalette, FigmaTokensMock, L4WCAGContrast],
  "m-uxui-l5": [L5ButtonStates, FigmaVariantsMock, L5FormStates],
  "m-uxui-l6": [L6WireframeComparison, FigmaAutoLayoutMock, MiroUserFlowBoard],
  "m-uxui-l7": [L7NavPatterns, FigmaPrototypeMock],
  "m-uxui-l8": [L8Breakpoints, FigmaConstraintsMock, L8POURPrinciples],
  "m-uxui-l9": [L9AnimationDemo, FigmaInteractionsMock, L9UXCopyExamples],
  "m-uxui-l10": [L10HandoffFailures, FigmaDevModeMock, L10AgentsMd],
  // ── Module m18: «UI/UX-дизайн для PM» — блок «Дизайн и исполнение» (урок 25) ──
  "m18-l1": [L1GarrettPyramid, MiroCJMBoard, L1PMChecklist],
  "m18-l2": [L6WireframeComparison, FigmaAutoLayoutMock, FigmaPrototypeMock],
  "m18-l3": [L7NavPatterns, MiroUserFlowBoard, MiroAffinityBoard],
  "m18-l4": [L2EyeTracking, L2GoodBadScreens, L3TypographyScale, FigmaTypeStylesMock, L4ColorPalette, FigmaTokensMock, L4WCAGContrast],
  "m18-l5": [L5ButtonStates, FigmaVariantsMock, L5FormStates],
  "m18-l6": [L8Breakpoints, FigmaConstraintsMock, L8POURPrinciples, L9AnimationDemo, FigmaInteractionsMock],
  "m18-l7": [L9UXCopyExamples, L10HandoffFailures, FigmaDevModeMock, L10AgentsMd],
};

export function UXUIVisualContent({ lessonId }: { lessonId: string }) {
  const blocks = LESSON_VISUALS[lessonId];
  if (!blocks) return null;

  return (
    <div className="my-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-300/50 to-transparent" />
        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 border border-teal-200/60 dark:border-teal-700/40 text-teal-600 dark:text-teal-400 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          Интерактивные материалы
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-teal-300/50 to-transparent" />
      </div>
      {blocks.map((Block, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12, duration: 0.4 }}
        >
          <Block />
        </motion.div>
      ))}
    </div>
  );
}
