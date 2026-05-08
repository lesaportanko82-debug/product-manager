import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, RotateCcw, ChevronRight } from "lucide-react";

// ===== JTBD Cycle Diagram =====
export function JTBDDiagram() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setStep(s => (s + 1) % 5), 2200);
    return () => clearInterval(t);
  }, [auto]);

  const steps = [
    { label: "Контекст", desc: "Когда человек в определённой ситуации...", color: "#0d9488", bg: "#f0fdfa", emoji: "🎯" },
    { label: "Триггер", desc: "...происходит событие-триггер", color: "#0891b2", bg: "#ecfeff", emoji: "⚡" },
    { label: "Работа", desc: "Хочу получить результат", color: "#7c3aed", bg: "#f5f3ff", emoji: "🔧" },
    { label: "Эмоция", desc: "Чтобы чувствовать себя по-другому", color: "#db2777", bg: "#fdf2f8", emoji: "💫" },
    { label: "Решение", desc: "Нанимаю продукт для выполнения работы", color: "#059669", bg: "#ecfdf5", emoji: "✅" },
  ];

  const cx = 170, cy = 150, r = 110;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 my-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[0.8125rem] font-bold text-foreground">Jobs To Be Done: Цикл работы</h4>
        <div className="flex gap-2">
          <button onClick={() => setAuto(!auto)} className={`text-[0.625rem] px-2.5 py-1 rounded-lg font-medium transition-all ${auto ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
            {auto ? "⏸ Стоп" : "▶ Авто"}
          </button>
          <button onClick={() => setStep(0)} className="text-[0.625rem] px-2 py-1 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* SVG Circle */}
        <svg viewBox="0 0 340 300" className="w-full max-w-[280px] shrink-0">
          {/* Circle path */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" className="dark:stroke-slate-600" />
          {/* Progress arc */}
          <motion.circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={steps[step].color}
            strokeWidth="3"
            strokeDasharray={`${(step + 1) / 5 * 2 * Math.PI * r} ${2 * Math.PI * r}`}
            strokeDashoffset={2 * Math.PI * r * 0.25}
            strokeLinecap="round"
            initial={false}
            animate={{ strokeDasharray: `${(step + 1) / 5 * 2 * Math.PI * r} ${2 * Math.PI * r}` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          {/* Step nodes */}
          {steps.map((s, i) => {
            const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            const isActive = i === step;
            const isPast = i < step;
            return (
              <g key={i} onClick={() => setStep(i)} className="cursor-pointer">
                <motion.circle
                  cx={x} cy={y}
                  r={isActive ? 24 : 18}
                  fill={isActive ? s.color : isPast ? s.color + "30" : "#f1f5f9"}
                  stroke={isActive ? s.color : isPast ? s.color : "#cbd5e1"}
                  strokeWidth={isActive ? 3 : 1.5}
                  animate={{ r: isActive ? 24 : 18 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="dark:fill-slate-700"
                />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="text-[16px] select-none pointer-events-none">
                  {s.emoji}
                </text>
                <text x={x} y={y + (i < 3 ? -32 : 34)} textAnchor="middle" dominantBaseline="central"
                  fill={isActive ? s.color : "#94a3b8"} className="text-[9px] font-semibold select-none pointer-events-none">
                  {s.label}
                </text>
              </g>
            );
          })}
          {/* Center text */}
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-[10px] font-bold fill-current dark:fill-slate-300">JTBD</text>
          <text x={cx} y={cy + 8} textAnchor="middle" className="text-[8px] fill-slate-400 dark:fill-slate-500">Цикл работы</text>
        </svg>

        {/* Step detail card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-w-0"
          >
            <div className="rounded-xl p-4 border-l-4" style={{ borderColor: steps[step].color, backgroundColor: steps[step].bg }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{steps[step].emoji}</span>
                <span className="text-[0.8125rem] font-bold" style={{ color: steps[step].color }}>
                  {step + 1}. {steps[step].label}
                </span>
              </div>
              <p className="text-[0.8125rem] text-slate-700 dark:text-slate-300 leading-relaxed">{steps[step].desc}</p>
            </div>
            <div className="flex gap-1.5 mt-3">
              {steps.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6" : "w-3"}`}
                  style={{ backgroundColor: i === step ? steps[step].color : "#cbd5e1" }}
                />
              ))}
            </div>
            {step < 4 && (
              <button onClick={() => setStep(s => s + 1)} className="mt-3 flex items-center gap-1 text-[0.6875rem] font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400">
                Далее <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Format example */}
      <div className="mt-5 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
        <p className="text-[0.6875rem] font-semibold text-muted-foreground mb-1">Формат Job Story:</p>
        <p className="text-[0.75rem] text-foreground">
          <span className="text-teal-600 font-medium">Когда</span> [контекст + триггер] →{" "}
          <span className="text-violet-600 font-medium">Хочу</span> [результат] →{" "}
          <span className="text-pink-600 font-medium">Чтобы</span> [эмоция]
        </p>
      </div>
    </div>
  );
}

// ===== RICE Framework Diagram =====
export function RICEDiagram() {
  const [values, setValues] = useState({ R: 5000, I: 2, C: 80, E: 3 });
  const score = Math.round((values.R * values.I * (values.C / 100)) / values.E);

  const fields = [
    { key: "R" as const, label: "Reach", desc: "пользователей/квартал", min: 100, max: 50000, step: 100, color: "#0d9488", icon: "👥" },
    { key: "I" as const, label: "Impact", desc: "0.25 — 3", min: 0.25, max: 3, step: 0.25, color: "#7c3aed", icon: "💥" },
    { key: "C" as const, label: "Confidence", desc: "уверенность %", min: 10, max: 100, step: 10, color: "#0891b2", icon: "🎯" },
    { key: "E" as const, label: "Effort", desc: "person-months", min: 0.5, max: 12, step: 0.5, color: "#dc2626", icon: "⏱" },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 my-6">
      <h4 className="text-[0.8125rem] font-bold text-foreground mb-4">RICE: Интерактивный калькулятор</h4>

      {/* Formula */}
      <div className="flex items-center justify-center gap-2 mb-5 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl font-mono text-[0.8125rem]">
        <span className="text-teal-600 font-bold">{values.R.toLocaleString()}</span>
        <span className="text-muted-foreground">×</span>
        <span className="text-violet-600 font-bold">{values.I}</span>
        <span className="text-muted-foreground">×</span>
        <span className="text-cyan-600 font-bold">{values.C}%</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-red-600 font-bold">{values.E}</span>
        <span className="text-muted-foreground">=</span>
        <motion.span
          key={score}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="text-emerald-600 font-extrabold text-lg"
        >
          {score.toLocaleString()}
        </motion.span>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[0.6875rem] font-semibold flex items-center gap-1">
                <span>{f.icon}</span> {f.label}
              </label>
              <span className="text-[0.6875rem] font-bold tabular-nums" style={{ color: f.color }}>
                {f.key === "R" ? values[f.key].toLocaleString() : f.key === "C" ? `${values[f.key]}%` : values[f.key]}
              </span>
            </div>
            <input
              type="range"
              min={f.min} max={f.max} step={f.step}
              value={values[f.key]}
              onChange={e => setValues(v => ({ ...v, [f.key]: parseFloat(e.target.value) }))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-teal-500"
              style={{ accentColor: f.color }}
            />
            <p className="text-[0.5625rem] text-muted-foreground/60">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Score interpretation */}
      <motion.div
        key={score > 3000 ? "high" : score > 1000 ? "med" : "low"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`mt-4 p-3 rounded-xl text-[0.75rem] font-medium ${
          score > 3000 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
          score > 1000 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
          "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}
      >
        {score > 3000 ? "🚀 Высокий приоритет — делаем в первую очередь!" :
         score > 1000 ? "📊 Средний приоритет — стоит рассмотреть в Q" :
         "⏳ Низкий приоритет — пока в бэклог"}
      </motion.div>
    </div>
  );
}

// ===== OODA Loop Diagram =====
export function OODADiagram() {
  const [activePhase, setActivePhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setActivePhase(p => {
        if (p === 3) {
          setCycle(c => c + 1);
          return 0;
        }
        return p + 1;
      });
    }, 1800);
    return () => clearInterval(t);
  }, [running]);

  const phases = [
    {
      key: "O1", label: "Observe", ru: "Наблюдай", color: "#0d9488",
      desc: "Собирай данные: метрики, фидбек, рынок, конкуренты. Отделяй сигнал от шума.",
      pm: "Смотри на DAU, retention, NPS, отзывы, действия конкурентов"
    },
    {
      key: "O2", label: "Orient", ru: "Анализируй", color: "#7c3aed",
      desc: "Schwerpunkt — главный фокус. Распознавай свои когнитивные искажения. Синтезируй.",
      pm: "Сегментируй данные, ищи паттерны, проверяй свои предубеждения"
    },
    {
      key: "D", label: "Decide", ru: "Решай", color: "#0891b2",
      desc: "Решение — это гипотеза. Не привязывайся к первому выводу. Будь готов пересмотреть.",
      pm: "Формулируй гипотезу, определяй метрику успеха, выбирай эксперимент"
    },
    {
      key: "A", label: "Act", ru: "Действуй", color: "#059669",
      desc: "Действие = проверка решения. Результаты питают следующий цикл наблюдения.",
      pm: "Запускай эксперимент, собирай результаты, готовься к новому циклу"
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 my-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[0.8125rem] font-bold text-foreground">OODA-цикл Джона Бойда</h4>
        <div className="flex items-center gap-2">
          {cycle > 0 && (
            <span className="text-[0.625rem] px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full font-bold">
              Цикл #{cycle + 1}
            </span>
          )}
          <button onClick={() => setRunning(!running)} className={`text-[0.625rem] px-2.5 py-1 rounded-lg font-medium transition-all ${running ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
            {running ? "⏸ Стоп" : "▶ Запуск"}
          </button>
        </div>
      </div>

      {/* 4 phase cards in a loop */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {phases.map((p, i) => {
          const isActive = i === activePhase;
          return (
            <motion.button
              key={p.key}
              onClick={() => { setActivePhase(i); setRunning(false); }}
              animate={{
                scale: isActive ? 1.02 : 1,
                borderColor: isActive ? p.color : "transparent",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`relative text-left p-3.5 rounded-xl border-2 transition-colors ${
                isActive ? "bg-white dark:bg-slate-700 shadow-md" : "bg-slate-50 dark:bg-slate-700/50 border-transparent"
              }`}
            >
              {/* Connecting arrow */}
              {i < 3 && (
                <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 z-10">
                  {i === 1 ? null : <ChevronRight className="w-3 h-3" />}
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[0.625rem] font-bold shrink-0"
                  style={{ backgroundColor: isActive ? p.color : "#94a3b8" }}
                  animate={{ backgroundColor: isActive ? p.color : "#94a3b8" }}
                >
                  {p.key}
                </motion.div>
                <div>
                  <p className="text-[0.75rem] font-bold" style={{ color: isActive ? p.color : undefined }}>{p.label}</p>
                  <p className="text-[0.5625rem] text-muted-foreground">{p.ru}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 rounded-xl border-l-4"
          style={{ borderColor: phases[activePhase].color, backgroundColor: phases[activePhase].color + "08" }}
        >
          <p className="text-[0.8125rem] text-foreground mb-2">{phases[activePhase].desc}</p>
          <p className="text-[0.75rem] text-muted-foreground italic">
            <span className="font-semibold text-foreground/70">PM-применение:</span> {phases[activePhase].pm}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Speed message */}
      <div className="mt-4 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
        <p className="text-[0.6875rem] text-amber-700 dark:text-amber-400">
          <span className="font-bold">Принцип Бойда:</span> Побеждает тот, кто проходит OODA-цикл быстрее. «Бойд-40-секунд» — мог выиграть любой воздушный бой за 40 секунд.
        </p>
      </div>
    </div>
  );
}

// ===== Transaction Cost Comparison Diagram =====
export function TransactionCostDiagram() {
  const [solution, setSolution] = useState<"A" | "B">("A");

  const data = {
    A: { label: "Решение конкурента", items: [
      { name: "Найти решение", cost: 3 },
      { name: "Разобраться как работает", cost: 4 },
      { name: "Выполнить работу", cost: 5 },
      { name: "Решить проблемы", cost: 4 },
      { name: "Заплатить", cost: 3 },
    ]},
    B: { label: "Ваш продукт", items: [
      { name: "Найти решение", cost: 2 },
      { name: "Разобраться как работает", cost: 1 },
      { name: "Выполнить работу", cost: 2 },
      { name: "Решить проблемы", cost: 1 },
      { name: "Заплатить", cost: 3 },
    ]},
  };

  const totalA = data.A.items.reduce((s, i) => s + i.cost, 0);
  const totalB = data.B.items.reduce((s, i) => s + i.cost, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 my-6">
      <h4 className="text-[0.8125rem] font-bold text-foreground mb-1">Transaction Cost: Сравнение решений</h4>
      <p className="text-[0.6875rem] text-muted-foreground mb-4">Клиент выберет решение с меньшим TC</p>

      <div className="grid grid-cols-2 gap-4">
        {(["A", "B"] as const).map(key => (
          <div key={key} className={`rounded-xl p-3 border-2 transition-all cursor-pointer ${solution === key ? (key === "B" ? "border-teal-400 bg-teal-50/50 dark:bg-teal-900/10" : "border-red-300 bg-red-50/50 dark:bg-red-900/10") : "border-transparent bg-slate-50 dark:bg-slate-700/50"}`}
            onClick={() => setSolution(key)}>
            <p className="text-[0.75rem] font-bold mb-2.5">{data[key].label}</p>
            <div className="space-y-2">
              {data[key].items.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[0.625rem] mb-0.5">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-bold">{item.cost}/5</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${key === "B" ? "bg-teal-500" : "bg-red-400"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.cost / 5) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-3 pt-2 border-t text-center ${key === "B" ? "border-teal-200 dark:border-teal-800" : "border-red-200 dark:border-red-800"}`}>
              <span className="text-[0.625rem] text-muted-foreground">Итого TC:</span>
              <motion.p
                key={key === "A" ? totalA : totalB}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-lg font-extrabold ${key === "B" ? "text-teal-600" : "text-red-500"}`}
              >
                {key === "A" ? totalA : totalB}/25
              </motion.p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-[0.75rem] text-emerald-700 dark:text-emerald-400">
        <span className="font-bold">Вывод:</span> Ваш продукт (TC={totalB}) vs Конкурент (TC={totalA}).
        Снижение TC на {Math.round((1 - totalB / totalA) * 100)}% — клиент переключится, если разница ощутима.
      </div>
    </div>
  );
}

// ===== ABCDX Segmentation Pyramid =====
export function ABCDXDiagram() {
  const [active, setActive] = useState<number | null>(null);

  const segments = [
    { key: "A", label: "A-сегмент", pct: "5%", revenue: "40%", color: "#059669", bg: "#ecfdf5", desc: "Идеальные клиенты. Высокая потребность, быстрая сделка, высокий чек. Покупают сами." },
    { key: "B", label: "B-сегмент", pct: "15%", revenue: "40%", color: "#0d9488", bg: "#f0fdfa", desc: "Хорошие клиенты. Потребность есть, но нужны доработки продукта. Длинный цикл сделки." },
    { key: "C", label: "C-сегмент", pct: "30%", revenue: "15%", color: "#d97706", bg: "#fffbeb", desc: "Средние клиенты. Потребность невысокая, много пишут в саппорт. Нагружают команду." },
    { key: "D", label: "D-сегмент", pct: "30%", revenue: "4%", color: "#dc2626", bg: "#fef2f2", desc: "Невыгодные клиенты. Потребности почти нет. Обожают мучить поддержку." },
    { key: "X", label: "X-сегмент", pct: "20%", revenue: "1%", color: "#6b7280", bg: "#f9fafb", desc: "Случайные клиенты. Попали по ошибке, не целевые." },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 my-6">
      <h4 className="text-[0.8125rem] font-bold text-foreground mb-1">ABCDX-сегментация</h4>
      <p className="text-[0.6875rem] text-muted-foreground mb-4">A+B = 20% клиентов = 80% выручки. Фокус на A и B.</p>

      <div className="space-y-2">
        {segments.map((s, i) => (
          <motion.div
            key={s.key}
            onClick={() => setActive(active === i ? null : i)}
            className="cursor-pointer rounded-xl border transition-all overflow-hidden"
            style={{ borderColor: active === i ? s.color : "transparent" }}
            layout
          >
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[0.875rem] shrink-0" style={{ backgroundColor: s.color }}>
                {s.key}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[0.75rem] font-bold">{s.label}</span>
                  <span className="text-[0.5625rem] text-muted-foreground">{s.pct} клиентов</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: s.revenue }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                  <span className="text-[0.5625rem] font-bold shrink-0" style={{ color: s.color }}>{s.revenue} выручки</span>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {active === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 pt-0">
                    <p className="text-[0.75rem] text-muted-foreground p-2.5 rounded-lg" style={{ backgroundColor: s.bg }}>{s.desc}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ===== Map of diagrams to lesson IDs =====
export const LESSON_DIAGRAMS: Record<string, (() => JSX.Element)[]> = {
  "m2-l1": [TransactionCostDiagram],
  "m2-l2": [TransactionCostDiagram],
  "m5-l1": [OODADiagram],
  "m5-l2": [OODADiagram],
  "m6-l1": [JTBDDiagram],
  "m6-l2": [JTBDDiagram],
  "m7-l1": [JTBDDiagram],
  "m12-l1": [ABCDXDiagram],
  "m15-l2": [RICEDiagram],
  "m17-l3": [JTBDDiagram],
};