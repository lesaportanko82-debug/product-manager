/**
 * PM Competency Radar — интерактивная карта компетенций продакт-менеджера
 * 
 * 8 осей: Стратегия, Аналитика, UX/Дизайн, Техническая грамотность, Growth, Коммуникация, Лидерство, Execution
 * Данные рассчитываются динамически из пройденных уроков, квизов и практики.
 * Целевые профили ролей + AI gap-анализ + экспорт PNG + история снапшотов.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ResponsiveContainer, Tooltip
} from "recharts";
import {
  X, Target, TrendingUp, Briefcase, ChevronDown, ChevronRight,
  Zap, Star, Award, ArrowRight, Brain, Users, BarChart3, Rocket,
  MessageCircle, Wrench, Layers, Sparkles, Info, ChevronUp,
  Download, History, Clock, Camera, Loader2, Trash2, CalendarDays
} from "lucide-react";
import { courseModules, getAllLessons, type Module } from "./course-data";
import { getLocalXP } from "./interactive-progress";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// ===== Competency Axis Definitions =====

export type CompetencyAxis =
  | "strategy"
  | "analytics"
  | "ux_design"
  | "technical"
  | "growth"
  | "communication"
  | "leadership"
  | "execution";

interface AxisMeta {
  key: CompetencyAxis;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const AXES: AxisMeta[] = [
  { key: "strategy", label: "Стратегия", shortLabel: "Стратегия", icon: Target, color: "#14b8a6", description: "Vision, Roadmap, OKR, приоритизация, рыночный анализ" },
  { key: "analytics", label: "Аналитика", shortLabel: "Аналитика", icon: BarChart3, color: "#06b6d4", description: "Метрики, A/B-тесты, data-informed решения, статистика" },
  { key: "ux_design", label: "UX / Дизайн", shortLabel: "UX/Дизайн", icon: Layers, color: "#8b5cf6", description: "User research, JTBD, интервью, прототипирование, тестирование" },
  { key: "technical", label: "Техническая грамотность", shortLabel: "Техн. грам.", icon: Wrench, color: "#f59e0b", description: "API, SQL, инструменты, AI/ML, архитектура" },
  { key: "growth", label: "Growth", shortLabel: "Growth", icon: TrendingUp, color: "#10b981", description: "Воронки, retention, монетизация, growth loops, PMF" },
  { key: "communication", label: "Коммуникация", shortLabel: "Коммуник.", icon: MessageCircle, color: "#ec4899", description: "Stakeholder mgmt, переговоры, презентации, конфликты" },
  { key: "leadership", label: "Лидерство", shortLabel: "Лидерство", icon: Users, color: "#f97316", description: "Управление командой, найм, софт-скилы, культура" },
  { key: "execution", label: "Execution", shortLabel: "Execution", icon: Rocket, color: "#6366f1", description: "Agile, Scrum, Kanban, запуск, спринты, post-mortem" },
];

// ===== Module -> Competency Mapping =====
type CompetencyWeights = Partial<Record<CompetencyAxis, number>>;

const MODULE_COMPETENCY_MAP: Record<string, CompetencyWeights> = {
  "m1":       { strategy: 0.8, ux_design: 0.4 },
  "m2":       { strategy: 0.7, analytics: 0.5 },
  "m3":       { strategy: 0.6, leadership: 0.5 },
  "m4":       { strategy: 0.7, execution: 0.5, analytics: 0.3 },
  "m5":       { strategy: 0.8, execution: 0.6 },
  "m6":       { ux_design: 0.9, strategy: 0.4 },
  "m7":       { ux_design: 0.8, communication: 0.6 },
  "m8":       { strategy: 0.6, ux_design: 0.5, execution: 0.5 },
  "m9":       { ux_design: 0.7, communication: 0.7 },
  "m10":      { ux_design: 0.5, communication: 0.6 },
  "m11":      { ux_design: 0.7, communication: 0.8 },
  "m12":      { analytics: 0.7, strategy: 0.6, growth: 0.5 },
  "m13":      { growth: 0.9, analytics: 0.6 },
  "m14":      { ux_design: 0.9, analytics: 0.4 },
  "m15":      { strategy: 0.8, analytics: 0.6, execution: 0.4 },
  "m16":      { strategy: 0.9, analytics: 0.7 },
  "m17":      { analytics: 0.9, ux_design: 0.5 },
  "m18":      { ux_design: 0.9, technical: 0.4 },
  "m18b":     { execution: 0.9, leadership: 0.4 },
  "m18c":     { technical: 0.9, execution: 0.4 },
  "m18d":     { leadership: 0.7, communication: 0.8 },
  "m19":      { communication: 0.9, leadership: 0.6 },
  "m20":      { execution: 0.7, strategy: 0.5, ux_design: 0.4 },
  "m21":      { analytics: 0.7, communication: 0.5, execution: 0.4 },
  "m-sim":    { execution: 0.8, strategy: 0.5, leadership: 0.4 },
  "m22":      { communication: 0.6, leadership: 0.5, strategy: 0.4 },
  "m-growth": { growth: 0.9, analytics: 0.5 },
  "m-network":{ growth: 0.7, strategy: 0.6, technical: 0.3 },
  "m-aiml":   { technical: 0.8, analytics: 0.5, strategy: 0.4 },
  "m-data":   { analytics: 0.9, strategy: 0.5, execution: 0.3 },
};

// ===== Target Role Profiles =====

interface RoleProfile {
  id: string;
  name: string;
  emoji: string;
  description: string;
  scores: Record<CompetencyAxis, number>;
}

const ROLE_PROFILES: RoleProfile[] = [
  {
    id: "junior",
    name: "Junior PM",
    emoji: "🌱",
    description: "Начинающий продакт: равномерная база по всем направлениям",
    scores: { strategy: 50, analytics: 45, ux_design: 55, technical: 35, growth: 40, communication: 50, leadership: 30, execution: 55 },
  },
  {
    id: "middle",
    name: "Middle PM",
    emoji: "💼",
    description: "Опытный продакт: уверенная база, самостоятельное ведение продукта",
    scores: { strategy: 70, analytics: 65, ux_design: 65, technical: 50, growth: 55, communication: 65, leadership: 50, execution: 70 },
  },
  {
    id: "growth-pm",
    name: "Growth PM",
    emoji: "🚀",
    description: "Специалист по росту: глубокая аналитика и growth-механики",
    scores: { strategy: 60, analytics: 85, ux_design: 45, technical: 50, growth: 95, communication: 40, leadership: 35, execution: 60 },
  },
  {
    id: "tech-pm",
    name: "Technical PM",
    emoji: "🛠",
    description: "Технический продакт: API, архитектура, инженерные решения",
    scores: { strategy: 55, analytics: 70, ux_design: 40, technical: 90, growth: 40, communication: 45, leadership: 50, execution: 80 },
  },
  {
    id: "cpo",
    name: "CPO / Head of Product",
    emoji: "👑",
    description: "Руководитель продуктовой функции: стратегия + лидерство + коммуникация",
    scores: { strategy: 95, analytics: 65, ux_design: 60, technical: 45, growth: 70, communication: 85, leadership: 90, execution: 55 },
  },
  {
    id: "b2b-saas",
    name: "B2B SaaS PM",
    emoji: "🏢",
    description: "Продакт в B2B SaaS: баланс стратегии, аналитики и коммуникации",
    scores: { strategy: 80, analytics: 75, ux_design: 60, technical: 55, growth: 65, communication: 80, leadership: 55, execution: 70 },
  },
  {
    id: "ux-pm",
    name: "UX-focused PM",
    emoji: "🎨",
    description: "Продакт с фокусом на пользовательском опыте и исследованиях",
    scores: { strategy: 55, analytics: 55, ux_design: 95, technical: 35, growth: 50, communication: 70, leadership: 40, execution: 55 },
  },
];

// ===== Score Calculation =====

interface CompetencyScores {
  raw: Record<CompetencyAxis, number>;
  bonusFromQuiz: Record<CompetencyAxis, number>;
  bonusFromPractice: Record<CompetencyAxis, number>;
  total: Record<CompetencyAxis, number>;
  overallLevel: number;
}

function computeCompetencyScores(completedLessons: Set<string>): CompetencyScores {
  const axisMaxWeight: Record<CompetencyAxis, number> = { strategy: 0, analytics: 0, ux_design: 0, technical: 0, growth: 0, communication: 0, leadership: 0, execution: 0 };
  const axisEarnedWeight: Record<CompetencyAxis, number> = { strategy: 0, analytics: 0, ux_design: 0, technical: 0, growth: 0, communication: 0, leadership: 0, execution: 0 };

  for (const mod of courseModules) {
    const weights = MODULE_COMPETENCY_MAP[mod.id];
    if (!weights) continue;
    const totalLessonsInMod = mod.lessons.length;
    const completedInMod = mod.lessons.filter(l => completedLessons.has(l.id)).length;
    const completionRatio = totalLessonsInMod > 0 ? completedInMod / totalLessonsInMod : 0;
    for (const [axis, weight] of Object.entries(weights) as [CompetencyAxis, number][]) {
      const contribution = weight * totalLessonsInMod;
      axisMaxWeight[axis] += contribution;
      axisEarnedWeight[axis] += contribution * completionRatio;
    }
  }

  const raw: Record<CompetencyAxis, number> = {} as any;
  for (const axis of AXES) {
    raw[axis.key] = axisMaxWeight[axis.key] > 0
      ? Math.round((axisEarnedWeight[axis.key] / axisMaxWeight[axis.key]) * 100)
      : 0;
  }

  const bonusFromQuiz: Record<CompetencyAxis, number> = { strategy: 0, analytics: 0, ux_design: 0, technical: 0, growth: 0, communication: 0, leadership: 0, execution: 0 };
  try {
    const interactiveProgress = JSON.parse(localStorage.getItem("interactive-progress") || "{}");
    for (const [blockId, data] of Object.entries(interactiveProgress) as [string, any][]) {
      if (!data?.completed) continue;
      const lessonId = blockId.split(":")[0];
      const mod = courseModules.find(m => m.lessons.some(l => l.id === lessonId));
      if (!mod) continue;
      const weights = MODULE_COMPETENCY_MAP[mod.id];
      if (!weights) continue;
      const isQuizType = blockId.includes(":miniquiz:") || blockId.includes(":fillblank:") || blockId.includes(":matching:");
      if (isQuizType) {
        for (const [axis, weight] of Object.entries(weights) as [CompetencyAxis, number][]) {
          bonusFromQuiz[axis] += weight * 1.5;
        }
      }
    }
  } catch {}

  const bonusFromPractice: Record<CompetencyAxis, number> = { strategy: 0, analytics: 0, ux_design: 0, technical: 0, growth: 0, communication: 0, leadership: 0, execution: 0 };
  try {
    const practiceData = JSON.parse(localStorage.getItem("course-practice") || "{}");
    for (const [lessonId, done] of Object.entries(practiceData)) {
      if (!Array.isArray(done) || done.length === 0) continue;
      const mod = courseModules.find(m => m.lessons.some(l => l.id === lessonId));
      if (!mod) continue;
      const weights = MODULE_COMPETENCY_MAP[mod.id];
      if (!weights) continue;
      const lesson = mod.lessons.find(l => l.id === lessonId);
      const totalPractice = lesson?.practice?.length || 1;
      const ratio = Math.min(done.length / totalPractice, 1);
      for (const [axis, weight] of Object.entries(weights) as [CompetencyAxis, number][]) {
        bonusFromPractice[axis] += weight * ratio * 3;
      }
    }
  } catch {}

  const total: Record<CompetencyAxis, number> = {} as any;
  for (const axis of AXES) {
    const k = axis.key;
    total[k] = Math.min(100, Math.round(raw[k] + bonusFromQuiz[k] + bonusFromPractice[k]));
  }

  const overallLevel = Math.round(Object.values(total).reduce((a, b) => a + b, 0) / AXES.length);
  return { raw, bonusFromQuiz, bonusFromPractice, total, overallLevel };
}

// ===== Gap Analysis =====

interface GapRecommendation {
  axis: CompetencyAxis;
  currentScore: number;
  targetScore: number;
  gap: number;
  modules: { id: string; title: string; completedPct: number }[];
  advice: string;
}

function generateGapAnalysis(
  scores: CompetencyScores,
  role: RoleProfile,
  completedLessons: Set<string>
): GapRecommendation[] {
  const gaps: GapRecommendation[] = [];
  for (const axis of AXES) {
    const k = axis.key;
    const gap = role.scores[k] - scores.total[k];
    if (gap <= 5) continue;

    const relevantModules = courseModules
      .filter(m => MODULE_COMPETENCY_MAP[m.id]?.[k])
      .map(m => {
        const completed = m.lessons.filter(l => completedLessons.has(l.id)).length;
        return {
          id: m.id,
          title: m.title,
          completedPct: m.lessons.length > 0 ? Math.round((completed / m.lessons.length) * 100) : 100,
          weight: MODULE_COMPETENCY_MAP[m.id]![k]!,
        };
      })
      .filter(m => m.completedPct < 100)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    const adviceMap: Record<CompetencyAxis, string> = {
      strategy: "Сосредоточьтесь на модулях по стратегии, Vision и приоритизации. Попробуйте capstone-проект по стратегии продукта.",
      analytics: "Пройдите модули по метрикам и A/B-тестированию. Выполните упражнения на реальных данных в Data Exercises.",
      ux_design: "Углубитесь в JTBD, интервьюирование и прототипирование. Практикуйте UX-тестирование в проект-симуляторе.",
      technical: "Изучите модули по инструментам продакта, SQL, API и AI/ML. Попрактикуйтесь с таск-трекерами.",
      growth: "Пройдите модули по Growth Loops, конверсии и retention. Выполните практику по воронкам.",
      communication: "Сфокусируйтесь на коммуникации, конфликтах и интервьюировании. Попробуйте PM Interview Simulator.",
      leadership: "Изучите софт-скилы, управление командой и постановку задач. Capstone по построению PM-команды будет полезен.",
      execution: "Пройдите Agile/Scrum/Kanban модули. Практикуйтесь в проект-симуляторе и capstone-проектах.",
    };

    gaps.push({ axis: k, currentScore: scores.total[k], targetScore: role.scores[k], gap, modules: relevantModules, advice: adviceMap[k] });
  }
  return gaps.sort((a, b) => b.gap - a.gap);
}

// ===== Helpers =====

function getOverallGrade(level: number): { grade: string; color: string; emoji: string } {
  if (level >= 90) return { grade: "A+", color: "text-emerald-500", emoji: "🏆" };
  if (level >= 80) return { grade: "A", color: "text-teal-500", emoji: "🌟" };
  if (level >= 70) return { grade: "B+", color: "text-cyan-500", emoji: "💪" };
  if (level >= 60) return { grade: "B", color: "text-blue-500", emoji: "📈" };
  if (level >= 45) return { grade: "C+", color: "text-amber-500", emoji: "🔥" };
  if (level >= 30) return { grade: "C", color: "text-orange-500", emoji: "🌿" };
  if (level >= 15) return { grade: "D", color: "text-rose-400", emoji: "🌱" };
  return { grade: "E", color: "text-slate-400", emoji: "🫘" };
}

// ===== Snapshot / History =====

interface RadarSnapshot {
  id: string;
  date: string; // ISO
  scores: Record<CompetencyAxis, number>;
  overallLevel: number;
  completedCount: number;
  totalCount: number;
  label?: string;
}

const SNAPSHOTS_KEY = "competency-radar-snapshots";

function loadSnapshots(): RadarSnapshot[] {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
  } catch { return []; }
}

function saveSnapshots(snaps: RadarSnapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snaps));
}

function shouldAutoSnapshot(current: Record<CompetencyAxis, number>, existing: RadarSnapshot[]): boolean {
  if (existing.length === 0) return true;
  const last = existing[existing.length - 1];
  // Auto-snapshot if 24h passed and scores changed by >= 3 on any axis
  const hoursSinceLast = (Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60);
  if (hoursSinceLast < 24) return false;
  for (const axis of AXES) {
    if (Math.abs(current[axis.key] - (last.scores[axis.key] || 0)) >= 3) return true;
  }
  return false;
}

function formatSnapshotDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const mon = months[d.getMonth()];
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${mon}, ${h}:${m}`;
}

// ===== AI Analysis Types =====

interface AIAnalysis {
  summary: string;
  priorityActions: { axis: string; action: string; impact: string; timeEstimate: string }[];
  learningPath: string;
  strengths: string;
  careerTip: string;
}

// ===== PNG Export =====

function drawRadarPNG(
  scores: Record<CompetencyAxis, number>,
  roleScores: Record<CompetencyAxis, number>,
  roleName: string,
  overallLevel: number,
  grade: { grade: string; emoji: string },
  completionPct: number,
  isDark: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 1200, H = 1400;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    if (isDark) {
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#134e4a");
    } else {
      bgGrad.addColorStop(0, "#f8fafc");
      bgGrad.addColorStop(0.5, "#ffffff");
      bgGrad.addColorStop(1, "#f0fdfa");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.fillStyle = isDark ? "rgba(20,184,166,0.06)" : "rgba(20,184,166,0.04)";
    ctx.beginPath(); ctx.arc(W - 100, 100, 200, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(100, H - 100, 150, 0, Math.PI * 2); ctx.fill();

    // Title
    ctx.fillStyle = isDark ? "#f1f5f9" : "#1e293b";
    ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PM Competency Radar", W / 2, 60);

    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`Целевая роль: ${roleName}  |  Прогресс: ${completionPct}%  |  ${new Date().toLocaleDateString("ru-RU")}`, W / 2, 92);

    // Overall score circle
    const cx = W / 2, cy = 170, cr = 42;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "#0d9488" : "#14b8a6";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${overallLevel}`, cx, cy - 4);
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("/100", cx, cy + 16);

    // Grade badge
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(`${grade.emoji} ${grade.grade}`, cx, cy + 55);

    // Radar chart
    const radarCx = W / 2, radarCy = 530, radarR = 220;
    const axes = AXES;
    const N = axes.length;

    // Grid
    for (let ring = 1; ring <= 5; ring++) {
      const r = (radarR * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const px = radarCx + r * Math.cos(angle);
        const py = radarCy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Grid labels
      if (ring % 2 === 0 || ring === 5) {
        ctx.fillStyle = isDark ? "#64748b" : "#94a3b8";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${ring * 20}`, radarCx + 4, radarCy - r + 4);
      }
    }

    // Axis lines
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(radarCx, radarCy);
      ctx.lineTo(radarCx + radarR * Math.cos(angle), radarCy + radarR * Math.sin(angle));
      ctx.strokeStyle = isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.15)";
      ctx.stroke();
    }

    // Target role polygon (dashed amber)
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const idx = i % N;
      const angle = (Math.PI * 2 * idx) / N - Math.PI / 2;
      const val = roleScores[axes[idx].key] / 100;
      const px = radarCx + radarR * val * Math.cos(angle);
      const py = radarCy + radarR * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.fillStyle = "rgba(245,158,11,0.06)";
    ctx.fill();
    ctx.setLineDash([]);

    // User polygon (teal)
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const idx = i % N;
      const angle = (Math.PI * 2 * idx) / N - Math.PI / 2;
      const val = scores[axes[idx].key] / 100;
      const px = radarCx + radarR * val * Math.cos(angle);
      const py = radarCy + radarR * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(20,184,166,0.15)";
    ctx.fill();

    // Dots and labels
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const val = scores[axes[i].key] / 100;
      const px = radarCx + radarR * val * Math.cos(angle);
      const py = radarCy + radarR * val * Math.sin(angle);

      // Dot
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#14b8a6";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Axis label
      const labelR = radarR + 30;
      const lx = radarCx + labelR * Math.cos(angle);
      const ly = radarCy + labelR * Math.sin(angle);
      ctx.fillStyle = isDark ? "#e2e8f0" : "#334155";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(axes[i].shortLabel, lx, ly);

      // Score label
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = axes[i].color;
      ctx.fillText(`${scores[axes[i].key]}%`, lx, ly + 16);
    }

    // Legend
    const legendY = radarCy + radarR + 60;
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    // Your profile
    ctx.fillStyle = "#14b8a6";
    ctx.fillRect(W / 2 - 120, legendY - 5, 24, 3);
    ctx.fillStyle = isDark ? "#cbd5e1" : "#475569";
    ctx.textAlign = "left";
    ctx.fillText("Ваш профиль", W / 2 - 92, legendY);
    // Target
    ctx.fillStyle = "#f59e0b";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(W / 2 + 30, legendY - 3);
    ctx.lineTo(W / 2 + 54, legendY - 3);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? "#cbd5e1" : "#475569";
    ctx.fillText(`${roleName} (целевой)`, W / 2 + 60, legendY);

    // Detailed scores table
    const tableY = legendY + 50;
    ctx.textAlign = "center";
    ctx.fillStyle = isDark ? "#f1f5f9" : "#1e293b";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("Детализация по компетенциям", W / 2, tableY);

    const colW = 140;
    const startX = (W - colW * axes.length) / 2;
    for (let i = 0; i < axes.length; i++) {
      const x = startX + i * colW + colW / 2;
      const y = tableY + 40;
      // Axis name
      ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(axes[i].shortLabel, x, y);
      // Score
      ctx.fillStyle = axes[i].color;
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText(`${scores[axes[i].key]}`, x, y + 28);
      // Target
      ctx.fillStyle = isDark ? "#94a3b8" : "#94a3b8";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(`цель: ${roleScores[axes[i].key]}`, x, y + 48);
      // Bar
      const barW = 80, barH = 6;
      const barX = x - barW / 2;
      const barY2 = y + 58;
      ctx.fillStyle = isDark ? "#334155" : "#e2e8f0";
      ctx.fillRect(barX, barY2, barW, barH);
      ctx.fillStyle = axes[i].color;
      ctx.fillRect(barX, barY2, barW * (scores[axes[i].key] / 100), barH);
      // Target marker
      const tMarkerX = barX + barW * (roleScores[axes[i].key] / 100);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(tMarkerX - 1, barY2 - 2, 2, barH + 4);
    }

    // Footer branding
    ctx.fillStyle = isDark ? "#475569" : "#94a3b8";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PM Competency Radar | Product Management Course", W / 2, H - 30);

    canvas.toBlob(blob => {
      if (blob) resolve(blob); else reject(new Error("Failed to create PNG blob"));
    }, "image/png", 1);
  });
}

// ===== Custom Radar Tooltip =====

function CustomRadarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 max-w-[220px]">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{data.fullLabel}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-teal-600 dark:text-teal-400">Ваш уровень</span>
          <span className="font-bold text-teal-600 dark:text-teal-400">{data.score}%</span>
        </div>
        {data.target !== undefined && data.target !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-400">Целевой</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{data.target}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main Component =====

interface CompetencyRadarProps {
  completedLessons: Set<string>;
  onClose: () => void;
  onSelectLesson?: (id: string) => void;
}

export function CompetencyRadar({ completedLessons, onClose, onSelectLesson }: CompetencyRadarProps) {
  const [selectedRole, setSelectedRole] = useState<string>("junior");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"radar" | "details" | "gaps" | "history">("radar");
  const [animatedScores, setAnimatedScores] = useState<Record<CompetencyAxis, number>>(
    Object.fromEntries(AXES.map(a => [a.key, 0])) as Record<CompetencyAxis, number>
  );

  // PNG export state
  const [exporting, setExporting] = useState(false);

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // History state
  const [snapshots, setSnapshots] = useState<RadarSnapshot[]>(() => loadSnapshots());
  const [compareIdx, setCompareIdx] = useState<number | null>(null);
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  const scores = useMemo(() => computeCompetencyScores(completedLessons), [completedLessons]);
  const role = ROLE_PROFILES.find(r => r.id === selectedRole) || ROLE_PROFILES[0];
  const gaps = useMemo(() => generateGapAnalysis(scores, role, completedLessons), [scores, role, completedLessons]);
  const grade = getOverallGrade(scores.overallLevel);

  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const completionPct = totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0;

  // Animate scores on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScores(scores.total), 100);
    return () => clearTimeout(timer);
  }, [scores.total]);

  // Auto-snapshot on mount if significant change
  useEffect(() => {
    if (shouldAutoSnapshot(scores.total, snapshots)) {
      const snap: RadarSnapshot = {
        id: `snap-${Date.now()}`,
        date: new Date().toISOString(),
        scores: { ...scores.total },
        overallLevel: scores.overallLevel,
        completedCount: completedLessons.size,
        totalCount: totalLessons,
      };
      const updated = [...snapshots, snap].slice(-50); // max 50 snapshots
      setSnapshots(updated);
      saveSnapshots(updated);
    }
  }, []); // run once on mount

  const radarData = useMemo(() => {
    return AXES.map(axis => ({
      axis: axis.shortLabel,
      fullLabel: axis.label,
      score: animatedScores[axis.key],
      target: role.scores[axis.key],
      ...(compareIdx !== null && snapshots[compareIdx] ? { compare: snapshots[compareIdx].scores[axis.key] } : {}),
      fullMark: 100,
    }));
  }, [animatedScores, role, compareIdx, snapshots]);

  const sortedAxes = useMemo(() => [...AXES].sort((a, b) => scores.total[b.key] - scores.total[a.key]), [scores]);
  const strengths = sortedAxes.slice(0, 3).filter(a => scores.total[a.key] > 0);
  const weaknesses = sortedAxes.slice(-3).reverse().filter(a => scores.total[a.key] < 80);

  // === Export PNG ===
  const handleExportPNG = useCallback(async () => {
    setExporting(true);
    try {
      const isDark = document.documentElement.classList.contains("dark");
      const blob = await drawRadarPNG(scores.total, role.scores, role.name, scores.overallLevel, grade, completionPct, isDark);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pm-competency-radar-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PNG export error:", err);
    } finally {
      setExporting(false);
    }
  }, [scores, role, grade, completionPct]);

  // === AI Gap Analysis ===
  const handleAIAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/competency-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          scores: scores.total,
          roleName: role.name,
          roleScores: role.scores,
          gaps: gaps.map(g => ({
            axis: g.axis,
            currentScore: g.currentScore,
            targetScore: g.targetScore,
            gap: g.gap,
            modules: g.modules,
          })),
          completionPct,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error("No analysis in response");
      }
    } catch (err: any) {
      console.error("AI analysis error:", err);
      setAiError(err.message || "Не удалось получить AI-анализ");
    } finally {
      setAiLoading(false);
    }
  }, [scores, role, gaps, completionPct]);

  // === Manual snapshot ===
  const handleSaveSnapshot = useCallback((label?: string) => {
    const snap: RadarSnapshot = {
      id: `snap-${Date.now()}`,
      date: new Date().toISOString(),
      scores: { ...scores.total },
      overallLevel: scores.overallLevel,
      completedCount: completedLessons.size,
      totalCount: totalLessons,
      label,
    };
    const updated = [...snapshots, snap].slice(-50);
    setSnapshots(updated);
    saveSnapshots(updated);
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotSaved(false), 2000);
  }, [scores, completedLessons, totalLessons, snapshots]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    saveSnapshots(updated);
    if (compareIdx !== null) {
      const compSnap = snapshots[compareIdx];
      if (compSnap && compSnap.id === id) setCompareIdx(null);
    }
  }, [snapshots, compareIdx]);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-100 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-teal-950/30">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-200/40 dark:shadow-teal-900/40">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  PM Competency Radar
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Карта ваших продуктовых компетенций</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save snapshot button */}
            <button
              onClick={() => handleSaveSnapshot()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                snapshotSaved
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              }`}
              title="Сохранить снапшот"
            >
              <Camera className="w-4.5 h-4.5" />
            </button>
            {/* Export PNG button */}
            <button
              onClick={handleExportPNG}
              disabled={exporting}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
              title="Экспорт в PNG"
            >
              {exporting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Download className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overall Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 dark:from-teal-700 dark:via-teal-600 dark:to-emerald-600 p-5 sm:p-6 mb-6 shadow-xl shadow-teal-200/30 dark:shadow-teal-900/40"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <motion.circle
                  cx="40" cy="40" r="34"
                  fill="none" stroke="white" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - scores.overallLevel / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{scores.overallLevel}</span>
                <span className="text-[0.6rem] text-white/60 font-medium mt-0.5">/ 100</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{grade.emoji}</span>
                <span className="text-white font-bold text-lg">Уровень {grade.grade}</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Пройдено {completedLessons.size} из {totalLessons} уроков ({completionPct}%).
                {scores.overallLevel >= 70
                  ? " Отличный прогресс! Вы уверенно развиваете PM-компетенции."
                  : scores.overallLevel >= 40
                  ? " Хороший старт. Продолжайте изучение, чтобы закрыть пробелы."
                  : " Вы в начале пути. Каждый пройденный урок прокачивает ваш радар!"}
              </p>
            </div>

            <div className="shrink-0 px-3 py-2 rounded-xl bg-white/10 border border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🌰</span>
                <span className="text-white font-bold text-sm tabular-nums">{getLocalXP()}</span>
              </div>
              <p className="text-[0.6rem] text-white/50 mt-0.5 text-center">каштанов</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 mb-6">
          {([
            { id: "radar" as const, label: "Радар", icon: Target },
            { id: "details" as const, label: "Детали", icon: BarChart3 },
            { id: "gaps" as const, label: "Gap-анализ", icon: TrendingUp },
            { id: "history" as const, label: "История", icon: History, badge: snapshots.length > 0 ? snapshots.length : undefined },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {"badge" in tab && tab.badge && (
                <span className="text-[0.6rem] min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "radar" && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Role Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Целевая роль:</span>
                <div className="relative">
                  <button
                    onClick={() => setShowRoleDropdown(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all text-sm"
                  >
                    <span>{role.emoji}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{role.name}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showRoleDropdown ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showRoleDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-30 top-full left-0 mt-1.5 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                      >
                        {ROLE_PROFILES.map(r => (
                          <button
                            key={r.id}
                            onClick={() => { setSelectedRole(r.id); setShowRoleDropdown(false); }}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                              r.id === selectedRole ? "bg-teal-50/50 dark:bg-teal-900/20" : ""
                            }`}
                          >
                            <span className="text-lg mt-0.5">{r.emoji}</span>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${r.id === selectedRole ? "text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"}`}>{r.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.description}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {compareIdx !== null && snapshots[compareIdx] && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Сравнение с:</span>
                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{formatSnapshotDate(snapshots[compareIdx].date)}</span>
                    <button onClick={() => setCompareIdx(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Radar Chart */}
              <div className="bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-4 sm:p-6 mb-6">
                <ResponsiveContainer width="100%" height={420}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid key="polar-grid" stroke="#94a3b8" strokeOpacity={0.2} />
                    <PolarAngleAxis
                      key="polar-angle"
                      dataKey="axis"
                      tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                      tickLine={false}
                    />
                    <PolarRadiusAxis
                      key="polar-radius"
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickCount={5}
                      axisLine={false}
                    />
                    <Radar
                      key="target-radar"
                      name={role.name}
                      dataKey="target"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.08}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                    />
                    <Radar
                      key="compare-radar"
                      name={compareIdx !== null && snapshots[compareIdx] ? `Снапшот ${formatSnapshotDate(snapshots[compareIdx].date)}` : "Снапшот"}
                      dataKey="compare"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={compareIdx !== null ? 0.06 : 0}
                      strokeWidth={compareIdx !== null ? 1.5 : 0}
                      strokeDasharray="4 2"
                      hide={compareIdx === null}
                    />
                    <Radar
                      key="score-radar"
                      name="Вы"
                      dataKey="score"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.2}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#14b8a6", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Tooltip key="radar-tooltip" content={<CustomRadarTooltip />} />
                    <Legend key="radar-legend" wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>

                <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-teal-500 rounded" />
                    <span>Ваш профиль</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-amber-500 rounded border-dashed" style={{ borderTop: "2px dashed #f59e0b", height: 0 }} />
                    <span>{role.name} (целевой)</span>
                  </div>
                  {compareIdx !== null && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 bg-violet-500 rounded border-dashed" style={{ borderTop: "2px dashed #8b5cf6", height: 0 }} />
                      <span>Снапшот</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Сильные стороны</h3>
                  </div>
                  {strengths.length > 0 ? (
                    <div className="space-y-2">
                      {strengths.map(axis => {
                        const AxisIcon = axis.icon;
                        return (
                          <div key={axis.key} className="flex items-center gap-2.5">
                            <AxisIcon className="w-4 h-4 shrink-0" style={{ color: axis.color }} />
                            <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{axis.label}</span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: axis.color }}>{scores.total[axis.key]}%</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Начните проходить уроки, чтобы увидеть ваши сильные стороны</p>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Зоны роста</h3>
                  </div>
                  {weaknesses.length > 0 ? (
                    <div className="space-y-2">
                      {weaknesses.map(axis => {
                        const AxisIcon = axis.icon;
                        const gapToRole = role.scores[axis.key] - scores.total[axis.key];
                        return (
                          <div key={axis.key} className="flex items-center gap-2.5">
                            <AxisIcon className="w-4 h-4 shrink-0" style={{ color: axis.color }} />
                            <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{axis.label}</span>
                            <span className="text-sm font-bold tabular-nums text-slate-400">{scores.total[axis.key]}%</span>
                            {gapToRole > 5 && (
                              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                                -{gapToRole}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Все оси уже на высоком уровне!</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="space-y-3">
                {AXES.map((axis) => {
                  const AxisIcon = axis.icon;
                  const score = scores.total[axis.key];
                  const rawScore = scores.raw[axis.key];
                  const quizBonus = Math.round(scores.bonusFromQuiz[axis.key]);
                  const practiceBonus = Math.round(scores.bonusFromPractice[axis.key]);
                  const target = role.scores[axis.key];
                  const gap = target - score;

                  const contributingModules = courseModules
                    .filter(m => MODULE_COMPETENCY_MAP[m.id]?.[axis.key])
                    .map(m => {
                      const completed = m.lessons.filter(l => completedLessons.has(l.id)).length;
                      return { id: m.id, title: m.title, completed, total: m.lessons.length, weight: MODULE_COMPETENCY_MAP[m.id]![axis.key]! };
                    })
                    .sort((a, b) => b.weight - a.weight);

                  const isExpanded = expandedGap === axis.key;

                  return (
                    <div key={axis.key} className="bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
                      <button
                        onClick={() => setExpandedGap(isExpanded ? null : axis.key)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: axis.color + "18" }}>
                          <AxisIcon className="w-4 h-4" style={{ color: axis.color }} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{axis.label}</span>
                            {gap > 10 && (
                              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium shrink-0">
                                gap: {gap}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: axis.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                              />
                            </div>
                            <span className="text-xs font-bold tabular-nums w-9 text-right" style={{ color: axis.color }}>{score}%</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{axis.description}</p>
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                                  <p className="text-xs text-slate-400 dark:text-slate-500">Уроки</p>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{rawScore}%</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-cyan-50/60 dark:bg-cyan-900/20">
                                  <p className="text-xs text-slate-400 dark:text-slate-500">Квизы</p>
                                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">+{quizBonus}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20">
                                  <p className="text-xs text-slate-400 dark:text-slate-500">Практика</p>
                                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{practiceBonus}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100/60 dark:border-amber-800/30">
                                <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  Целевой для <b className="text-amber-700 dark:text-amber-300">{role.name}</b>: <b className="text-amber-700 dark:text-amber-300">{target}%</b>
                                  {gap > 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400"> (нужно +{gap})</span>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400"> (достигнуто!)</span>
                                  )}
                                </span>
                              </div>

                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Модули, влияющие на эту ось:</p>
                              <div className="space-y-1.5">
                                {contributingModules.map(mod => {
                                  const pct = mod.total > 0 ? Math.round((mod.completed / mod.total) * 100) : 100;
                                  return (
                                    <div key={mod.id} className="flex items-center gap-2 text-xs">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="truncate text-slate-600 dark:text-slate-300">{mod.title}</span>
                                          <span className="shrink-0 text-[0.6rem] text-slate-400 dark:text-slate-500 tabular-nums">
                                            (x{mod.weight.toFixed(1)})
                                          </span>
                                        </div>
                                      </div>
                                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : axis.color }}
                                        />
                                      </div>
                                      <span className="text-[0.65rem] tabular-nums w-12 text-right text-slate-400 dark:text-slate-500 shrink-0">
                                        {mod.completed}/{mod.total}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "gaps" && (
            <motion.div
              key="gaps"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Role header */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{role.emoji}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Gap-анализ для роли {role.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{role.description}</p>
                </div>
              </div>

              {/* Role Selector inline */}
              <div className="flex flex-wrap gap-2 mb-6">
                {ROLE_PROFILES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      r.id === selectedRole
                        ? "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>

              {/* AI Analysis Section */}
              <div className="mb-6 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-fuchsia-950/20 rounded-2xl border border-violet-200/60 dark:border-violet-800/40 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">AI-анализ компетенций</h4>
                      <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">Персональные рекомендации от AI-коуча</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAIAnalysis}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {aiLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Анализ...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> {aiAnalysis ? "Обновить" : "Запросить анализ"}</>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-400 mb-3">
                    {aiError}
                  </div>
                )}

                {aiAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Summary */}
                    <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Общая оценка</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{aiAnalysis.summary}</p>
                    </div>

                    {/* Priority Actions */}
                    {aiAnalysis.priorityActions && aiAnalysis.priorityActions.length > 0 && (
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Приоритетные действия</p>
                        <div className="space-y-2">
                          {aiAnalysis.priorityActions.map((action, i) => {
                            const axisMeta = AXES.find(a => a.key === action.axis);
                            return (
                              <div key={i} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[0.6rem] font-bold text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{action.action}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {axisMeta && (
                                      <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: axisMeta.color + "18", color: axisMeta.color }}>
                                        {axisMeta.shortLabel}
                                      </span>
                                    )}
                                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${
                                      action.impact === "высокий" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    }`}>
                                      {action.impact}
                                    </span>
                                    {action.timeEstimate && (
                                      <span className="text-[0.6rem] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" /> {action.timeEstimate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Learning Path + Strengths + Career Tip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                        <p className="text-[0.65rem] font-medium text-teal-600 dark:text-teal-400 mb-1 flex items-center gap-1"><Rocket className="w-3 h-3" /> Путь обучения</p>
                        <p className="text-[0.7rem] text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysis.learningPath}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                        <p className="text-[0.65rem] font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1"><Star className="w-3 h-3" /> Сильные стороны</p>
                        <p className="text-[0.7rem] text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysis.strengths}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40">
                        <p className="text-[0.65rem] font-medium text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Карьерный совет</p>
                        <p className="text-[0.7rem] text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysis.careerTip}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!aiAnalysis && !aiLoading && !aiError && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Нажмите "Запросить анализ", чтобы получить персонализированные рекомендации от AI-коуча на основе ваших текущих компетенций и целевой роли.
                  </p>
                )}
              </div>

              {gaps.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-4xl mb-3">🏆</div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Все компетенции покрыты!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Ваш профиль соответствует целевому для роли {role.name}. Отличная работа!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gaps.map((gap, idx) => {
                    const axisMeta = AXES.find(a => a.key === gap.axis)!;
                    const AxisIcon = axisMeta.icon;
                    const severity = gap.gap >= 40 ? "high" : gap.gap >= 20 ? "medium" : "low";
                    const severityColors = {
                      high: "border-rose-200 dark:border-rose-800/40 bg-rose-50/30 dark:bg-rose-900/10",
                      medium: "border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10",
                      low: "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/70",
                    };
                    const severityBadge = {
                      high: { label: "Критический", bg: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
                      medium: { label: "Умеренный", bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
                      low: { label: "Небольшой", bg: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400" },
                    };

                    return (
                      <motion.div
                        key={gap.axis}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        className={`rounded-xl border p-4 sm:p-5 ${severityColors[severity]}`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: axisMeta.color + "18" }}>
                            <AxisIcon className="w-4.5 h-4.5" style={{ color: axisMeta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{axisMeta.label}</h4>
                              <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${severityBadge[severity].bg}`}>
                                {severityBadge[severity].label} gap
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-sm font-bold tabular-nums" style={{ color: axisMeta.color }}>{gap.currentScore}%</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{gap.targetScore}%</span>
                              <span className="text-xs text-slate-400">(+{gap.gap} нужно)</span>
                            </div>
                          </div>
                        </div>

                        <div className="relative h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all"
                            style={{ width: `${gap.currentScore}%`, backgroundColor: axisMeta.color }}
                          />
                          <div
                            className="absolute inset-y-0 rounded-full border-2 border-dashed border-amber-400 dark:border-amber-500"
                            style={{ left: `${Math.max(0, gap.targetScore - 1)}%`, width: "2px" }}
                          />
                        </div>

                        <div className="flex gap-2 p-3 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 mb-3">
                          <Sparkles className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{gap.advice}</p>
                        </div>

                        {gap.modules.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Рекомендуемые модули:</p>
                            <div className="space-y-1.5">
                              {gap.modules.map(mod => {
                                const module = courseModules.find(m => m.id === mod.id);
                                const firstIncomplete = module?.lessons.find(l => !completedLessons.has(l.id));
                                return (
                                  <button
                                    key={mod.id}
                                    onClick={() => {
                                      if (firstIncomplete && onSelectLesson) {
                                        onSelectLesson(firstIncomplete.id);
                                        onClose();
                                      }
                                    }}
                                    disabled={!firstIncomplete || !onSelectLesson}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left group disabled:opacity-50 disabled:cursor-default"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-300 truncate transition-colors">
                                        {mod.title}
                                      </p>
                                    </div>
                                    <span className="text-[0.65rem] tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                                      {mod.completedPct}%
                                    </span>
                                    {firstIncomplete && onSelectLesson && (
                                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-colors shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ===== History Tab ===== */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-teal-500" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">История прогресса</h3>
                </div>
                <button
                  onClick={() => handleSaveSnapshot()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    snapshotSaved
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {snapshotSaved ? "Сохранено!" : "Снапшот"}
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                  <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-2">Пока нет снапшотов</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                    Сохраняйте снапшоты радара, чтобы отслеживать прогресс по компетенциям. Снапшоты создаются автоматически при значительных изменениях или вручную.
                  </p>
                  <button
                    onClick={() => handleSaveSnapshot("Первый снапшот")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Создать первый снапшот
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Current state card (always on top) */}
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 rounded-xl border-2 border-teal-200/60 dark:border-teal-800/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-sm font-bold text-teal-800 dark:text-teal-200">Сейчас</span>
                        <span className="text-xs text-teal-600/70 dark:text-teal-400/60">Уровень {scores.overallLevel}/100</span>
                      </div>
                      <span className="text-xs text-teal-600/60 dark:text-teal-400/50 tabular-nums">
                        {completedLessons.size}/{totalLessons} уроков
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {AXES.map(axis => (
                        <div key={axis.key} className="text-center">
                          <p className="text-[0.55rem] text-teal-600/60 dark:text-teal-400/50 truncate">{axis.shortLabel}</p>
                          <p className="text-xs font-bold tabular-nums" style={{ color: axis.color }}>{scores.total[axis.key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Snapshot list */}
                  {[...snapshots].reverse().map((snap, revIdx) => {
                    const realIdx = snapshots.length - 1 - revIdx;
                    const isComparing = compareIdx === realIdx;
                    // Find delta vs previous snapshot
                    const prevSnap = realIdx > 0 ? snapshots[realIdx - 1] : null;
                    const overallDelta = prevSnap ? snap.overallLevel - prevSnap.overallLevel : 0;

                    return (
                      <motion.div
                        key={snap.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: revIdx * 0.03 }}
                        className={`rounded-xl border p-4 transition-all ${
                          isComparing
                            ? "border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/20"
                            : "border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatSnapshotDate(snap.date)}</span>
                            {snap.label && (
                              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">{snap.label}</span>
                            )}
                            {overallDelta !== 0 && (
                              <span className={`text-[0.65rem] font-bold tabular-nums ${overallDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                                {overallDelta > 0 ? "+" : ""}{overallDelta}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 tabular-nums">{snap.completedCount}/{snap.totalCount}</span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{snap.overallLevel}</span>
                            <button
                              onClick={() => setCompareIdx(isComparing ? null : realIdx)}
                              className={`ml-1.5 px-2 py-1 rounded-md text-[0.6rem] font-medium transition-all ${
                                isComparing
                                  ? "bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400"
                              }`}
                              title="Сравнить с текущим"
                            >
                              {isComparing ? "Убрать" : "Сравнить"}
                            </button>
                            <button
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* Mini scores row */}
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                          {AXES.map(axis => {
                            const val = snap.scores[axis.key] || 0;
                            const currentVal = scores.total[axis.key];
                            const delta = currentVal - val;
                            return (
                              <div key={axis.key} className="text-center">
                                <p className="text-[0.55rem] text-slate-400 dark:text-slate-500 truncate">{axis.shortLabel}</p>
                                <p className="text-xs font-bold tabular-nums" style={{ color: axis.color }}>{val}</p>
                                {isComparing && delta !== 0 && (
                                  <p className={`text-[0.55rem] font-medium tabular-nums ${delta > 0 ? "text-emerald-500" : "text-rose-400"}`}>
                                    {delta > 0 ? "+" : ""}{delta}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Overall progress summary */}
                  {snapshots.length >= 2 && (
                    <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-teal-500" />
                        Прогресс за всё время
                      </h4>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {AXES.map(axis => {
                          const first = snapshots[0].scores[axis.key] || 0;
                          const current = scores.total[axis.key];
                          const totalDelta = current - first;
                          return (
                            <div key={axis.key} className="text-center">
                              <p className="text-[0.55rem] text-slate-400 dark:text-slate-500 truncate mb-1">{axis.shortLabel}</p>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                                <div className="h-full rounded-full" style={{ width: `${current}%`, backgroundColor: axis.color }} />
                              </div>
                              <p className={`text-[0.6rem] font-bold tabular-nums ${totalDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : totalDelta < 0 ? "text-rose-500" : "text-slate-400"}`}>
                                {totalDelta > 0 ? "+" : ""}{totalDelta}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[0.65rem] text-slate-400 dark:text-slate-500 mt-2 text-center">
                        Первый снапшот: {formatSnapshotDate(snapshots[0].date)} | Снапшотов: {snapshots.length}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 mb-4 flex items-start gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <p className="mb-1">
              <b className="text-slate-600 dark:text-slate-300">Как считается скор?</b> Каждый модуль курса связан с 1-3 компетенциями. 
              Пройденные уроки дают базовые баллы. Выполненные квизы и интерактивные блоки приносят бонус. 
              Практические задания дают максимальный вклад.
            </p>
            <p>
              <b className="text-slate-600 dark:text-slate-300">Целевые профили</b> показывают идеальное распределение компетенций для разных PM-ролей. 
              Gap-анализ подсказывает, какие модули пройти, чтобы приблизиться к целевому профилю.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
