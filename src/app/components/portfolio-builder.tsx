import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  Briefcase, Download, Share2, X, Award, BookOpen,
  CheckCircle2, Star, BarChart3, Brain, Target, FileText
} from "lucide-react";
import { courseModules, getAllLessons } from "./course-data";
import { getLocalXP, getXPLevel } from "./interactive-progress";
import { getAdaptiveProfile } from "./adaptive-learning";
import { getUserName } from "./user-name";

interface Props {
  completedLessons: Set<string>;
  examScore: number | null;
  onClose: () => void;
}

export function PortfolioBuilder({ completedLessons, examScore, onClose }: Props) {
  const userName = getUserName();
  const xp = getLocalXP();
  const levelInfo = getXPLevel(xp);
  const profile = getAdaptiveProfile();
  const allLessons = getAllLessons();
  const totalLessons = allLessons.length;
  const progressPct = Math.round((completedLessons.size / totalLessons) * 100);

  // Capstone projects
  const capstoneData = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("capstone-projects") || "{}");
      return Object.entries(data).filter(([, v]: any) => v && v.submitted).map(([id, v]: any) => ({
        id, title: v.title || id, score: v.bestScore || 0, submittedAt: v.lastSubmittedAt,
      }));
    } catch { return []; }
  }, []);

  // Templates
  const templateData = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem("template-library") || "{}");
      return Object.entries(data).filter(([, v]: any) => v && Object.values(v).some((s: any) => typeof s === "string" && s.trim())).map(([id]) => id);
    } catch { return []; }
  }, []);

  // Interview history
  const interviewCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("interview-history") || "[]").length; } catch { return 0; }
  }, []);

  // Module completion
  const moduleStats = useMemo(() => {
    return courseModules.map(m => ({
      id: m.id,
      title: m.title,
      number: m.number,
      completed: m.lessons.filter(l => completedLessons.has(l.id)).length,
      total: m.lessons.length,
      pct: Math.round((m.lessons.filter(l => completedLessons.has(l.id)).length / m.lessons.length) * 100),
    })).filter(m => m.completed > 0);
  }, [completedLessons]);

  const exportPortfolio = useCallback(() => {
    let md = `# PM-Портфолио: ${userName}\n\n`;
    md += `**Дата:** ${new Date().toLocaleDateString("ru")}\n\n`;
    md += `## Общий прогресс\n`;
    md += `- Уроков пройдено: ${completedLessons.size}/${totalLessons} (${progressPct}%)\n`;
    md += `- Каштаны (XP): ${xp} (${levelInfo.title})\n`;
    if (profile) md += `- Уровень: ${profile.level === "senior" ? "Senior" : profile.level === "middle" ? "Middle" : "Junior"} PM\n`;
    if (examScore) md += `- Финальный экзамен: ${examScore}%\n`;
    md += `\n## Пройденные модули\n`;
    moduleStats.forEach(m => {
      md += `- М${m.number}: ${m.title} (${m.pct}%)\n`;
    });
    if (capstoneData.length > 0) {
      md += `\n## Capstone-проекты\n`;
      capstoneData.forEach(p => md += `- ${p.title} (оценка: ${p.score}/5)\n`);
    }
    if (interviewCount > 0) md += `\n## Практика интервью\n- Пройдено сессий: ${interviewCount}\n`;
    if (templateData.length > 0) md += `\n## Заполненные шаблоны\n${templateData.map(t => `- ${t}`).join("\n")}\n`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pm-portfolio-${userName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [userName, completedLessons, totalLessons, progressPct, xp, levelInfo, profile, examScore, moduleStats, capstoneData, interviewCount, templateData]);

  const achievements = [
    completedLessons.size >= 10 && { icon: "📚", label: "10+ уроков" },
    completedLessons.size >= 30 && { icon: "🎓", label: "30+ уроков" },
    completedLessons.size >= totalLessons && { icon: "🏆", label: "Весь курс пройден" },
    examScore && examScore >= 80 && { icon: "🎯", label: `Экзамен ${examScore}%` },
    capstoneData.length >= 2 && { icon: "💼", label: `${capstoneData.length} проекта` },
    interviewCount >= 5 && { icon: "🎤", label: `${interviewCount} интервью` },
    xp >= 500 && { icon: "🌰", label: `${xp} каштанов` },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
          <X className="w-4 h-4" /> Закрыть
        </button>

        {/* Header card */}
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-teal-800 rounded-2xl p-8 mb-6 text-white text-center shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/15 flex items-center justify-center mb-4 text-2xl font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold mb-1">{userName}</h1>
          <p className="text-white/60 text-[0.875rem] mb-4">
            {profile ? (profile.level === "senior" ? "Senior" : profile.level === "middle" ? "Middle" : "Junior") + " Product Manager" : "Product Manager"}
          </p>
          <div className="flex items-center justify-center gap-6 text-[0.8125rem]">
            <div><span className="text-white/50">Прогресс:</span> <span className="font-bold">{progressPct}%</span></div>
            <div><span className="text-white/50">XP:</span> <span className="font-bold">{xp}</span></div>
            {examScore && <div><span className="text-white/50">Экзамен:</span> <span className="font-bold">{examScore}%</span></div>}
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/40 p-5 mb-4">
            <h3 className="text-[0.875rem] font-semibold mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Достижения
            </h3>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a, i) => (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full text-[0.75rem] font-medium text-amber-800 dark:text-amber-300">
                  {a.icon} {a.label}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Skills / Modules */}
        <div className="bg-card rounded-2xl border border-border/40 p-5 mb-4">
          <h3 className="text-[0.875rem] font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-500" /> Пройденные модули ({moduleStats.length})
          </h3>
          <div className="space-y-2">
            {moduleStats.slice(0, 10).map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-[0.625rem] text-muted-foreground/50 w-8 shrink-0">M{m.number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.75rem] truncate">{m.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.pct === 100 ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: `${m.pct}%` }} />
                  </div>
                  <span className="text-[0.5625rem] text-muted-foreground/40 tabular-nums w-8">{m.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        {capstoneData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/40 p-5 mb-4">
            <h3 className="text-[0.875rem] font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-violet-500" /> Capstone-проекты
            </h3>
            {capstoneData.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 mb-1.5">
                <Star className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="text-[0.8125rem] flex-1">{p.title}</span>
                <span className="text-[0.6875rem] font-bold text-violet-600">{p.score}/5</span>
              </div>
            ))}
          </div>
        )}

        {/* Export button */}
        <div className="flex gap-3">
          <button onClick={exportPortfolio} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-emerald-600 transition-all">
            <Download className="w-4 h-4" /> Скачать портфолио (.md)
          </button>
        </div>
      </div>
    </div>
  );
}
