import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  BarChart3, Brain, Target, Users, MessageSquare, TrendingUp, Zap,
  Clock, Award, Flame, BookOpen, X, Calendar, Activity
} from "lucide-react";
import { courseModules, getAllLessons } from "./course-data";
import { getLocalXP, getXPLevel } from "./interactive-progress";
import { getAdaptiveProfile } from "./adaptive-learning";
import { getStreak } from "./gamification";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface Props {
  completedLessons: Set<string>;
  onClose: () => void;
}

export function AnalyticsDashboard({ completedLessons, onClose }: Props) {
  const allLessons = getAllLessons();
  const totalLessons = allLessons.length;
  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const xp = getLocalXP();
  const levelInfo = getXPLevel(xp);
  const streak = getStreak();
  const profile = getAdaptiveProfile();

  // Container width measurement for charts
  const radarContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [radarWidth, setRadarWidth] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (radarContainerRef.current) {
        const w = radarContainerRef.current.getBoundingClientRect().width;
        if (w > 0) setRadarWidth(Math.floor(w));
      }
      if (timelineContainerRef.current) {
        const w = timelineContainerRef.current.getBoundingClientRect().width;
        if (w > 0) setTimelineWidth(Math.floor(w));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (radarContainerRef.current) ro.observe(radarContainerRef.current);
    if (timelineContainerRef.current) ro.observe(timelineContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Competency radar data
  const radarData = useMemo(() => {
    const areas = [
      { area: "Discovery", modules: ["m1", "m2", "m6", "m7"], fullMark: 100 },
      { area: "Strategy", modules: ["m3", "m4", "m8", "m16"], fullMark: 100 },
      { area: "Metrics", modules: ["m5", "m12", "m13", "m17"], fullMark: 100 },
      { area: "Execution", modules: ["m15", "m18", "m18b", "m18c"], fullMark: 100 },
      { area: "Communication", modules: ["m19", "m18d", "m21"], fullMark: 100 },
      { area: "Growth", modules: ["m13", "m14", "m20"], fullMark: 100 },
    ];
    return areas.map(a => {
      const moduleLessons = a.modules.flatMap(mId => {
        const mod = courseModules.find(m => m.id === mId);
        return mod ? mod.lessons : [];
      });
      const total = moduleLessons.length || 1;
      const done = moduleLessons.filter(l => completedLessons.has(l.id)).length;
      const courseScore = Math.round((done / total) * 100);
      // Blend with diagnostic if available
      const diagScore = profile?.areaScores ? (() => {
        const areaMap: Record<string, string> = { Discovery: "discovery", Strategy: "strategy", Metrics: "metrics", Execution: "execution", Communication: "communication", Growth: "growth" };
        return profile.areaScores[areaMap[a.area] as any] || 0;
      })() : 0;
      const blended = profile ? Math.round(courseScore * 0.6 + diagScore * 0.4) : courseScore;
      return { area: a.area, score: blended, fullMark: 100 };
    });
  }, [completedLessons, profile]);

  // Module progress
  const moduleProgress = useMemo(() => {
    return courseModules.map(m => {
      const done = m.lessons.filter(l => completedLessons.has(l.id)).length;
      return { name: `M${m.number}`, done, total: m.lessons.length, pct: Math.round((done / m.lessons.length) * 100), title: m.title };
    });
  }, [completedLessons]);

  // Progress over time (from localStorage activity log)
  const progressTimeline = useMemo(() => {
    try {
      const log = JSON.parse(localStorage.getItem("progress-log") || "[]");
      const last14 = log.slice(-14);
      return last14.map((entry: any) => ({
        date: new Date(entry.date).toLocaleDateString("ru", { day: "numeric", month: "short" }),
        lessons: entry.count || 0,
      }));
    } catch { return []; }
  }, []);

  // Estimated completion
  const estimatedDays = useMemo(() => {
    const remaining = totalLessons - completedCount;
    if (remaining <= 0) return 0;
    // Average lessons per day from streak/activity
    try {
      const log = JSON.parse(localStorage.getItem("progress-log") || "[]");
      if (log.length < 2) return Math.ceil(remaining / 2);
      const first = log[0];
      const last = log[log.length - 1];
      const days = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000);
      const rate = completedCount / days;
      return rate > 0 ? Math.ceil(remaining / rate) : 999;
    } catch { return Math.ceil(remaining / 2); }
  }, [completedCount, totalLessons]);

  // Spaced repetition stats
  const flashcardStats = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("spaced-repetition") || "{}");
      const cards = Object.values(data) as any[];
      const mastered = cards.filter((c: any) => c.interval >= 7).length;
      const learning = cards.filter((c: any) => c.interval < 7 && c.interval > 0).length;
      return { total: cards.length, mastered, learning, retention: cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0 };
    } catch { return { total: 0, mastered: 0, learning: 0, retention: 0 }; }
  }, []);

  const statCards = [
    { icon: BookOpen, label: "Уроки", value: `${completedCount}/${totalLessons}`, sub: `${progressPct}%`, color: "text-teal-600", bg: "bg-teal-50" },
    { icon: Award, label: "Каштаны", value: `${xp}`, sub: levelInfo.title, color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Flame, label: "Стрик", value: `${streak} дн.`, sub: streak >= 7 ? "Огонь!" : "Продолжайте", color: "text-orange-600", bg: "bg-orange-50" },
    { icon: Clock, label: "До финиша", value: estimatedDays <= 0 ? "Готово!" : `~${estimatedDays} дн.`, sub: "прогноз", color: "text-cyan-600", bg: "bg-cyan-50" },
    { icon: Brain, label: "Retention", value: `${flashcardStats.retention}%`, sub: `${flashcardStats.mastered} из ${flashcardStats.total}`, color: "text-violet-600", bg: "bg-violet-50" },
    { icon: Target, label: "Уровень", value: profile?.level ? (profile.level === "senior" ? "Senior" : profile.level === "middle" ? "Middle" : "Junior") : "N/A", sub: profile ? `${Math.round((profile.totalScore / profile.maxScore) * 100)}%` : "Пройдите тест", color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
          <X className="w-4 h-4" /> Закрыть
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full text-[0.75rem] font-medium mb-4">
            <Activity className="w-3 h-3" /> Learning Analytics
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Аналитика обучения</h1>
          <p className="text-[0.875rem] text-muted-foreground">Полная картина вашего прогресса и компетенций</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${s.bg} dark:bg-opacity-20 flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <span className="text-[0.6875rem] text-muted-foreground/60">{s.label}</span>
                </div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[0.625rem] text-muted-foreground/50">{s.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Competency Radar */}
        <div className="bg-card rounded-2xl border border-border/40 p-6 mb-6">
          <h3 className="text-[0.875rem] font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-500" /> Радар компетенций
          </h3>
          <div ref={radarContainerRef} style={{ width: "100%", height: 300 }}>
            {radarWidth > 0 && (
              <RadarChart width={radarWidth} height={300} data={radarData}>
                <PolarGrid key="radar-grid" stroke="var(--color-border)" />
                <PolarAngleAxis key="radar-angle" dataKey="area" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis key="radar-radius" angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar key="radar-data" name="Компетенции" dataKey="score" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            )}
          </div>
          <p className="text-[0.6875rem] text-muted-foreground/50 text-center mt-2">
            {profile ? "На основе прогресса курса и диагностического теста" : "На основе прогресса курса. Пройдите диагностику для более точных данных."}
          </p>
        </div>

        {/* Progress Timeline */}
        {progressTimeline.length > 2 && (
          <div className="bg-card rounded-2xl border border-border/40 p-6 mb-6">
            <h3 className="text-[0.875rem] font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-500" /> Прогресс по дням
            </h3>
            <div ref={timelineContainerRef} style={{ width: "100%", height: 160 }}>
              {timelineWidth > 0 && (
                <AreaChart width={timelineWidth} height={160} data={progressTimeline}>
                  <XAxis key="tl-xaxis" dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis key="tl-yaxis" tick={{ fontSize: 10 }} />
                  <Tooltip key="tl-tooltip" contentStyle={{ fontSize: "0.75rem" }} />
                  <Area key="tl-area" type="monotone" dataKey="lessons" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              )}
            </div>
          </div>
        )}

        {/* Module heatmap */}
        <div className="bg-card rounded-2xl border border-border/40 p-6 mb-6">
          <h3 className="text-[0.875rem] font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" /> Прогресс по модулям
          </h3>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
            {moduleProgress.map((m, i) => (
              <div key={i} className="group relative">
                <div
                  className="aspect-square rounded-lg flex items-center justify-center text-[0.5625rem] font-bold transition-transform hover:scale-110 cursor-default"
                  style={{
                    backgroundColor: m.pct === 100 ? "#10b981" : m.pct > 0 ? `rgba(20,184,166,${0.15 + m.pct * 0.0085})` : "var(--color-muted)",
                    color: m.pct === 100 ? "#fff" : m.pct > 50 ? "#0d9488" : "var(--color-muted-foreground)",
                  }}
                >
                  {m.name}
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-foreground text-background text-[0.5625rem] rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {m.title} — {m.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}