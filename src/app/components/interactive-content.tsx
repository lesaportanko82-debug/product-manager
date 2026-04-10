import React, { useState, useCallback, useRef, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, User, UserCheck, ChevronDown, ChevronRight,
  Lightbulb, AlertTriangle, ArrowRight, ThumbsUp, ThumbsDown,
  Eye, EyeOff, Sparkles, GripVertical, CheckCircle2, XCircle,
  ArrowUpDown, Link2, PenLine, GitBranch, HelpCircle, Calculator,
  Send, RotateCcw, Zap, Trophy, Award, TrendingUp, Users
} from "lucide-react";
import {
  markBlockCompleted, isBlockCompleted, makeBlockId, XP_TABLE,
  saveCalculatorResult,
} from "./interactive-progress";
import { ProjectSimulator } from "./project-simulator";

// ===== Chestnut Toast =====
function XPToast({ xp, show }: { xp: number; show: boolean }) {
  if (!show || xp <= 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      className="absolute top-2 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full shadow-lg shadow-amber-200/50 text-xs font-bold z-20"
    >
      +{xp} 🌰
    </motion.div>
  );
}

// ===== Completed Badge =====
function CompletedBadge() {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[0.625rem] font-bold">
      <CheckCircle2 className="w-2.5 h-2.5" />Выполнено
    </span>
  );
}

// Hook for tracking completion
function useBlockProgress(lessonId: string, blockType: string, blockIndex: number) {
  const blockId = makeBlockId(lessonId, blockType, blockIndex);
  const [completed, setCompleted] = useState(() => isBlockCompleted(blockId));
  const [xpToast, setXpToast] = useState(0);

  const markComplete = useCallback((result?: any) => {
    if (completed) return;
    const xp = markBlockCompleted(lessonId, blockType, blockIndex, result);
    setCompleted(true);
    if (xp > 0) {
      setXpToast(xp);
      setTimeout(() => setXpToast(0), 2500);
    }
  }, [completed, lessonId, blockType, blockIndex]);

  return { completed, xpToast, markComplete };
}

// ===== Dialog Simulation Component =====
interface DialogMessage {
  role: "interviewer" | "respondent" | "narrator";
  name?: string;
  text: string;
  note?: string; // annotation/tip for the student
}

export function DialogSimulation({ title, messages, description }: {
  title: string;
  messages: DialogMessage[];
  description?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(3);
  const showAll = visibleCount >= messages.length;

  return (
    <div className="bg-gradient-to-br from-slate-50/80 to-teal-50/30 dark:from-slate-800/80 dark:to-teal-950/30 border border-teal-100/60 dark:border-teal-800/40 rounded-xl p-5 my-6">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        <h4 className="font-semibold text-teal-800 dark:text-teal-300">{title}</h4>
      </div>
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 italic">{description}</p>
      )}
      <div className="space-y-3">
        {messages.slice(0, visibleCount).map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "respondent" ? "flex-row-reverse" : ""}`}>
            {msg.role !== "narrator" && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "interviewer"
                  ? "bg-teal-100 text-teal-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}>
                {msg.role === "interviewer" ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === "narrator" ? "w-full" : ""}`}>
              {msg.name && (
                <span className={`text-xs font-medium mb-0.5 block ${
                  msg.role === "interviewer" ? "text-teal-600" : "text-emerald-600"
                }`}>
                  {msg.name}
                </span>
              )}
              <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                msg.role === "interviewer"
                  ? "bg-teal-100/50 text-teal-900 rounded-tl-sm"
                  : msg.role === "respondent"
                  ? "bg-emerald-100/50 text-emerald-900 rounded-tr-sm"
                  : "bg-amber-50 border border-amber-200 text-amber-800 text-center italic"
              }`}>
                {msg.text}
              </div>
              {msg.note && (
                <div className="flex items-start gap-1.5 mt-1.5 px-1">
                  <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-700 leading-snug">{msg.note}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {!showAll && (
        <button
          onClick={() => setVisibleCount(messages.length)}
          className="mt-4 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 transition-colors mx-auto"
        >
          <ChevronDown className="w-4 h-4" />
          Показать весь диалог ({messages.length - visibleCount} ещё)
        </button>
      )}
      {showAll && visibleCount > 3 && (
        <button
          onClick={() => setVisibleCount(3)}
          className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mx-auto"
        >
          Свернуть
        </button>
      )}
    </div>
  );
}

// ===== Interactive Table Component =====
interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
  highlight?: number; // row to highlight
}

export function InteractiveTable({ data }: { data: TableData }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedRows = sortCol !== null
    ? [...data.rows].sort((a, b) => {
        const va = a[sortCol] || "";
        const vb = b[sortCol] || "";
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      })
    : data.rows;

  const handleSort = (col: number) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  return (
    <div className="my-6">
      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        </span>
        {data.title}
      </h4>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50/80 to-teal-50/30 dark:from-slate-800/80 dark:to-teal-950/30">
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    {h}
                    {sortCol === i && (
                      <span className="text-teal-500 text-xs">{sortAsc ? "^" : "v"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <tr
                key={ri}
                className={`${
                  data.highlight === ri
                    ? "bg-teal-50/50 border-l-2 border-l-teal-400"
                    : ri % 2 === 0 ? "bg-white dark:bg-card" : "bg-slate-50/50 dark:bg-muted/30"
                } hover:bg-teal-50/30 transition-colors`}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Spoiler / Reveal Component =====
export function RevealBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-4 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {open ? <Eye className="w-4 h-4 text-teal-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />}
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-card">
          {children}
        </div>
      )}
    </div>
  );
}

// ===== Pros/Cons Component =====
export function ProsConsBlock({ title, pros, cons }: { title?: string; pros: string[]; cons: string[] }) {
  return (
    <div className="my-6">
      {title && <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">{title}</h4>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-800 dark:text-green-300 text-sm">Преимущества</span>
          </div>
          <ul className="space-y-1.5">
            {pros.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                <span className="text-green-500 mt-0.5">+</span> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="font-semibold text-red-800 dark:text-red-300 text-sm">Недостатки</span>
          </div>
          <ul className="space-y-1.5">
            {cons.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                <span className="text-red-500 mt-0.5">-</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ===== Lesson Image Banner =====
export function LessonImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <ImageWithFallback
        src={src}
        alt={alt}
        className="w-full aspect-[2.4/1] object-cover"
      />
      {caption && (
        <figcaption className="px-4 py-2.5 bg-slate-50 text-xs text-slate-500 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ===== Callout Box =====
export function Callout({ type, children }: { type: "tip" | "warning" | "info"; children: React.ReactNode }) {
  const styles = {
    tip: { bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40", icon: <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, text: "text-emerald-900 dark:text-emerald-200" },
    warning: { bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40", icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />, text: "text-amber-900 dark:text-amber-200" },
    info: { bg: "bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800/40", icon: <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />, text: "text-teal-900 dark:text-teal-200" },
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border my-4 ${s.bg}`}>
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className={`text-sm leading-relaxed ${s.text}`}>{children}</div>
    </div>
  );
}

// ===== Drag Sort Task =====
interface DragSortData {
  title: string;
  description?: string;
  items: string[];
  correctOrder: number[];
}

export function DragSortTask({ data, lessonId = "", blockIndex = 0 }: { data: DragSortData; lessonId?: string; blockIndex?: number }) {
  const { completed: wasCompleted, xpToast, markComplete } = useBlockProgress(lessonId, "dragsort", blockIndex);
  const [items, setItems] = useState(() => {
    // Shuffle, but ensure result doesn't accidentally equal correct order
    const shuffleOnce = () => data.items.map((text, i) => ({ id: i, text })).sort(() => Math.random() - 0.5);
    let arr = shuffleOnce();
    // Guard: if perfectly correct by chance, shuffle again (avoids trivial auto-win)
    if (arr.every((item, idx) => item.id === data.correctOrder[idx])) arr = shuffleOnce();
    return arr;
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  const moveItem = (fromIdx: number, dir: -1 | 1) => {
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= items.length) return;
    setItems(prev => {
      const next = [...prev];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      return next;
    });
    setChecked(false);
  };

  const checkOrder = () => {
    const correct = items.every((item, idx) => item.id === data.correctOrder[idx]);
    setIsCorrect(correct);
    setChecked(true);
    if (correct) markComplete({ correct: true });
  };

  const reset = () => {
    let arr = data.items.map((text, i) => ({ id: i, text })).sort(() => Math.random() - 0.5);
    if (arr.every((item, idx) => item.id === data.correctOrder[idx])) {
      arr = data.items.map((text, i) => ({ id: i, text })).sort(() => Math.random() - 0.5);
    }
    setItems(arr);
    setChecked(false);
    setIsCorrect(false);
  };

  return (
    <div className="my-6 rounded-xl border border-cyan-100/60 dark:border-cyan-800/40 bg-gradient-to-b from-cyan-50/30 to-white dark:from-cyan-950/30 dark:to-slate-900 overflow-hidden relative">
      <AnimatePresence><XPToast xp={xpToast} show={xpToast > 0} /></AnimatePresence>
      <div className="px-5 py-3.5 border-b border-cyan-100/40 dark:border-cyan-800/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-900/40 flex items-center justify-center">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">{data.title}</h4>
          {data.description && <p className="text-xs text-cyan-500/70 dark:text-cyan-400/50">{data.description}</p>}
        </div>
        {wasCompleted && !checked && <CompletedBadge />}
        {checked && (
          <div className="ml-auto">
            {isCorrect
              ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Верно!</span>
              : <span className="flex items-center gap-1 text-xs font-medium text-red-500"><XCircle className="w-3.5 h-3.5" /> Попробуйте ещё</span>
            }
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        {items.map((item, idx) => {
          const isRight = checked && item.id === data.correctOrder[idx];
          const isWrong = checked && item.id !== data.correctOrder[idx];
          return (
            <motion.div
              key={item.id}
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              draggable={!checked}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e as any, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm cursor-grab active:cursor-grabbing select-none transition-colors ${
                dragIdx === idx ? "bg-cyan-100 ring-1 ring-cyan-200" :
                isRight ? "bg-emerald-50 ring-1 ring-emerald-200" :
                isWrong ? "bg-red-50 ring-1 ring-red-200" :
                "bg-white dark:bg-card border border-border/40 hover:border-cyan-200"
              }`}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 text-slate-700 dark:text-slate-300">{item.text}</span>
              {!checked && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-cyan-50 text-muted-foreground/40 hover:text-cyan-600 disabled:opacity-20 transition-colors">
                    <ChevronDown className="w-3 h-3 rotate-180" />
                  </button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-cyan-50 text-muted-foreground/40 hover:text-cyan-600 disabled:opacity-20 transition-colors">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}
              {isRight && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              {isWrong && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
            </motion.div>
          );
        })}
      </div>
      <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
        {!checked ? (
          <>
            <button onClick={checkOrder} className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600 transition-colors shadow-sm">
              Проверить порядок
            </button>
            <p className="text-[0.6875rem] text-cyan-500/70 flex items-center gap-1.5 font-medium">
              <ChevronRight className="w-3 h-3 animate-pulse" />
              Перетащите или используйте стрелки для сортировки
            </p>
          </>
        ) : (
          <button onClick={reset} className="px-4 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent transition-colors">
            Попробовать снова
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Matching Pairs Task =====
interface MatchingPairsData {
  title: string;
  description?: string;
  pairs: [string, string][];
}

export function MatchingPairsTask({ data, lessonId = "", blockIndex = 0 }: { data: MatchingPairsData; lessonId?: string; blockIndex?: number }) {
  const { completed: wasCompleted, xpToast, markComplete } = useBlockProgress(lessonId, "matching", blockIndex);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [wrongFlash, setWrongFlash] = useState<{ left: number; right: number } | null>(null);
  const [completed, setCompleted] = useState(false); // tracks if markComplete has been called

  // Shuffle right side
  const [rightOrder] = useState(() => {
    const idxs = data.pairs.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs;
  });

  const handleLeftClick = (idx: number) => {
    if (allMatched || Object.keys(matches).some(k => Number(k) === idx)) return;
    setSelectedLeft(idx);
  };

  const handleRightClick = (rightOrigIdx: number) => {
    if (allMatched || selectedLeft === null) return;
    if (Object.values(matches).includes(rightOrigIdx)) return;

    if (selectedLeft === rightOrigIdx) {
      // Correct match
      setMatches(prev => ({ ...prev, [selectedLeft]: rightOrigIdx }));
      setSelectedLeft(null);
    } else {
      // Wrong match - flash
      setWrongFlash({ left: selectedLeft, right: rightOrigIdx });
      setTimeout(() => {
        setWrongFlash(null);
        setSelectedLeft(null);
      }, 600);
    }
  };

  const allMatched = Object.keys(matches).length === data.pairs.length;

  // Track completion when all matched
  useEffect(() => {
    if (allMatched && !completed) {
      setCompleted(true);
      markComplete({ allCorrect: true });
    }
  }, [allMatched, completed, markComplete]);

  const reset = () => {
    setMatches({});
    setSelectedLeft(null);
    setCompleted(false);
    setWrongFlash(null);
  };

  const isLeftMatched = (idx: number) => idx in matches;
  const isRightMatched = (origIdx: number) => Object.values(matches).includes(origIdx);

  return (
    <div className="my-6 rounded-xl border border-violet-100/60 dark:border-violet-800/40 bg-gradient-to-b from-violet-50/20 to-white dark:from-violet-950/20 dark:to-slate-900 overflow-hidden relative">
      <AnimatePresence><XPToast xp={xpToast} show={xpToast > 0} /></AnimatePresence>
      <div className="px-5 py-3.5 border-b border-violet-100/40 dark:border-violet-800/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center">
          <Link2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-violet-800 dark:text-violet-300">{data.title}</h4>
          {data.description && <p className="text-xs text-violet-500/70 dark:text-violet-400/50">{data.description}</p>}
        </div>
        {wasCompleted && !allMatched && !completed && <CompletedBadge />}
        {allMatched && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" /> Все пары найдены!
          </span>
        )}
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Left column */}
        <div className="space-y-1.5">
          {data.pairs.map((pair, idx) => {
            const matched = isLeftMatched(idx);
            const isSelected = selectedLeft === idx;
            const isFlashing = wrongFlash?.left === idx;
            return (
              <motion.button
                key={`l-${idx}`}
                onClick={() => handleLeftClick(idx)}
                animate={isFlashing ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                disabled={matched || allMatched}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  matched ? "bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800" :
                  isFlashing ? "bg-red-50 ring-1 ring-red-200 text-red-700" :
                  isSelected ? "bg-violet-100 ring-1 ring-violet-300 text-violet-900" :
                  "bg-white dark:bg-card border border-border/40 hover:border-violet-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                }`}
              >
                {pair[0]}
                {matched && <CheckCircle2 className="w-3 h-3 text-emerald-500 inline ml-1.5" />}
              </motion.button>
            );
          })}
        </div>
        {/* Right column */}
        <div className="space-y-1.5">
          {rightOrder.map((origIdx) => {
            const matched = isRightMatched(origIdx);
            const isFlashing = wrongFlash?.right === origIdx;
            return (
              <motion.button
                key={`r-${origIdx}`}
                onClick={() => handleRightClick(origIdx)}
                animate={isFlashing ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                disabled={matched || allMatched || selectedLeft === null}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  matched ? "bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800" :
                  isFlashing ? "bg-red-50 ring-1 ring-red-200 text-red-700" :
                  selectedLeft !== null && !matched ? "bg-white dark:bg-card border border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-700 dark:text-slate-300 cursor-pointer" :
                  "bg-white dark:bg-card border border-border/40 text-slate-700 dark:text-slate-300"
                }`}
              >
                {data.pairs[origIdx][1]}
                {matched && <CheckCircle2 className="w-3 h-3 text-emerald-500 inline ml-1.5" />}
              </motion.button>
            );
          })}
        </div>
      </div>
      {allMatched && (
        <div className="px-5 pb-4">
          <button onClick={reset} className="px-4 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent transition-colors">
            Сыграть заново
          </button>
        </div>
      )}
      {!allMatched && selectedLeft === null && Object.keys(matches).length === 0 && (
        <p className="px-5 pb-3 text-[0.6875rem] text-violet-500/70 flex items-center gap-1.5 font-medium">
          <ChevronRight className="w-3 h-3 animate-pulse" />
          Нажмите на элемент слева, затем на правильную пару справа
        </p>
      )}
      {!allMatched && selectedLeft !== null && (
        <p className="px-5 pb-3 text-[0.6875rem] text-violet-500/70 flex items-center gap-1.5 font-medium">
          <ChevronRight className="w-3 h-3 animate-pulse" />
          Теперь выберите подходящий элемент справа
        </p>
      )}
    </div>
  );
}

// ===== Fill-in-the-Blank Task =====
interface FillBlankData {
  title: string;
  description?: string;
  prompt: string; // text with ___ blanks
  blanks: { answer: string; hint?: string; accept?: string[] }[]; // accepted answers per blank
}

export function FillBlankTask({ data, lessonId = "", blockIndex = 0 }: { data: FillBlankData; lessonId?: string; blockIndex?: number }) {
  const { completed: wasCompleted, xpToast, markComplete } = useBlockProgress(lessonId, "fillblank", blockIndex);
  const [values, setValues] = useState<string[]>(data.blanks.map(() => ""));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const handleChange = (idx: number, v: string) => {
    if (checked) return;
    setValues(prev => { const n = [...prev]; n[idx] = v; return n; });
  };

  const check = () => {
    const res = data.blanks.map((b, i) => {
      const v = values[i].trim().replace(/\s+/g, " ").toLowerCase();
      const accepted = [b.answer, ...(b.accept || [])].map(a => a.trim().replace(/\s+/g, " ").toLowerCase());
      return accepted.includes(v);
    });
    setResults(res);
    setChecked(true);
    const correct = res.filter(Boolean).length;
    if (correct > 0) markComplete({ correct, total: data.blanks.length });
  };

  const reset = () => { setValues(data.blanks.map(() => "")); setChecked(false); setResults([]); };

  const correctCount = results.filter(Boolean).length;
  const parts = data.prompt.split("___");

  return (
    <div className="my-6 rounded-xl border border-indigo-100/60 dark:border-indigo-800/40 bg-gradient-to-b from-indigo-50/20 to-white dark:from-indigo-950/20 dark:to-slate-900 overflow-hidden relative">
      <AnimatePresence><XPToast xp={xpToast} show={xpToast > 0} /></AnimatePresence>
      <div className="px-5 py-3.5 border-b border-indigo-100/40 dark:border-indigo-800/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
          <PenLine className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">{data.title}</h4>
          {data.description && <p className="text-xs text-indigo-500/70 dark:text-indigo-400/50">{data.description}</p>}
        </div>
        {wasCompleted && !checked && <CompletedBadge />}
        {checked && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            correctCount === data.blanks.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>{correctCount}/{data.blanks.length}</span>
        )}
      </div>
      <div className="p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {parts.map((part, i) => (
            <span key={i}>
              <span>{part}</span>
              {i < data.blanks.length && (
                <span className="inline-flex items-center mx-1 align-baseline">
                  <input
                    value={values[i]}
                    onChange={e => handleChange(i, e.target.value)}
                    disabled={checked}
                    placeholder={data.blanks[i].hint || "..."}
                    className={`w-36 px-2.5 py-1 rounded-lg border text-sm font-medium text-center transition-all ${
                      checked
                        ? results[i]
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-red-300 bg-red-50 text-red-800"
                        : "border-indigo-200 dark:border-indigo-800 bg-white dark:bg-card focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    }`}
                  />
                  {checked && !results[i] && (
                    <span className="ml-1.5 text-xs text-emerald-600 font-medium whitespace-nowrap">{data.blanks[i].answer}</span>
                  )}
                </span>
              )}
            </span>
          ))}
        </p>
      </div>
      <div className="px-5 pb-4 flex gap-2">
        {!checked ? (
          <button onClick={check} disabled={values.some(v => !v.trim())}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors shadow-sm disabled:opacity-40">
            <Send className="w-3 h-3 inline mr-1.5" />Проверить
          </button>
        ) : (
          <button onClick={reset} className="px-4 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent transition-colors">
            <RotateCcw className="w-3 h-3 inline mr-1.5" />Заново
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Branching Scenario =====
interface ScenarioChoice {
  text: string;
  outcome: string;
  isOptimal?: boolean;
  explanation?: string;
}

interface ScenarioData {
  title: string;
  description?: string;
  situation: string;
  choices: ScenarioChoice[];
}

export function ScenarioTask({ data, lessonId = "", blockIndex = 0 }: { data: ScenarioData; lessonId?: string; blockIndex?: number }) {
  const { completed: wasCompleted, xpToast, markComplete } = useBlockProgress(lessonId, "scenario", blockIndex);
  const [selected, setSelected] = useState<number | null>(null);
  const choice = selected !== null ? data.choices[selected] : null;

  const handleSelect = (i: number) => {
    setSelected(i);
    markComplete({ choiceIndex: i, isOptimal: data.choices[i].isOptimal });
  };

  return (
    <div className="my-6 rounded-xl border border-violet-100/60 dark:border-violet-800/40 bg-gradient-to-b from-violet-50/20 to-white dark:from-violet-950/20 dark:to-slate-900 overflow-hidden relative">
      <AnimatePresence><XPToast xp={xpToast} show={xpToast > 0} /></AnimatePresence>
      <div className="px-5 py-3.5 border-b border-violet-100/40 dark:border-violet-800/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center">
          <GitBranch className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-violet-800 dark:text-violet-300">{data.title}</h4>
          {data.description && <p className="text-xs text-violet-500/70 dark:text-violet-400/50">{data.description}</p>}
        </div>
        {wasCompleted && selected === null && <CompletedBadge />}
      </div>
      <div className="p-5">
        <div className="bg-violet-50/50 dark:bg-violet-900/20 rounded-xl p-4 mb-4 border border-violet-100/60 dark:border-violet-800/30">
          <p className="text-sm text-violet-900 dark:text-violet-200 leading-relaxed font-medium">{data.situation}</p>
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Что вы сделаете?</p>
        {selected === null && (
          <p className="text-[0.6875rem] text-violet-500/70 mb-3 flex items-center gap-1.5 font-medium">
            <ChevronRight className="w-3 h-3 animate-pulse" />
            Выберите один из вариантов — можно попробовать все
          </p>
        )}
        {selected !== null && <div className="mb-3" />}

        <div className="space-y-2">
          {data.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border cursor-pointer ${
                selected === i
                  ? c.isOptimal
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-amber-300 bg-amber-50 ring-1 ring-amber-200"
                  : selected !== null
                  ? "border-border/30 bg-white/50 opacity-60"
                  : "border-border/60 bg-white dark:bg-card hover:border-violet-300 hover:bg-violet-50/40 dark:hover:bg-violet-900/20 hover:shadow-sm"
              }`}
            >
              <span className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                  selected === i
                    ? c.isOptimal ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {selected === i ? (c.isOptimal ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />) : String.fromCharCode(65 + i)}
                </span>
                <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.text}</span>
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {choice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`mt-4 rounded-xl p-4 border ${
                choice.isOptimal
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-start gap-2.5">
                  {choice.isOptimal
                    ? <Trophy className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    : <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${choice.isOptimal ? "text-emerald-800" : "text-amber-800"}`}>
                      {choice.isOptimal ? "Оптимальный выбор!" : "Не лучший вариант"}
                    </p>
                    <p className={`text-sm leading-relaxed ${choice.isOptimal ? "text-emerald-700" : "text-amber-700"}`}>
                      {choice.outcome}
                    </p>
                    {choice.explanation && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic">{choice.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="mt-3 text-xs text-violet-500 hover:text-violet-700 transition-colors flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Попробовать другой вариант
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== Mini Quiz (single question, inline) =====
interface MiniQuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
}

export function MiniQuizBlock({ data, lessonId = "", blockIndex = 0 }: { data: MiniQuizData; lessonId?: string; blockIndex?: number }) {
  const { completed: wasCompleted, xpToast, markComplete } = useBlockProgress(lessonId, "miniquiz", blockIndex);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    markComplete({ selectedIndex: i, correct: i === data.correctIndex });
  };

  const isCorrect = selected === data.correctIndex;

  return (
    <div className="my-6 rounded-xl border border-teal-100/60 dark:border-teal-800/40 bg-gradient-to-b from-teal-50/20 to-white dark:from-teal-950/20 dark:to-slate-900 overflow-hidden relative">
      <AnimatePresence><XPToast xp={xpToast} show={xpToast > 0} /></AnimatePresence>
      <div className="px-5 py-3.5 border-b border-teal-100/40 dark:border-teal-800/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
          <HelpCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        </div>
        <span className="text-sm font-semibold text-teal-800 dark:text-teal-300">Проверь себя</span>
        {wasCompleted && !revealed && <span className="ml-auto"><CompletedBadge /></span>}
        {revealed && (
          <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
            isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}>{isCorrect ? "Верно!" : "Неверно"}</span>
        )}
      </div>
      <div className="p-5">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3 leading-relaxed">{data.question}</p>
        {data.hint && !revealed && (
          <p className="text-xs text-slate-400 italic mb-3">Подсказка: {data.hint}</p>
        )}
        {!revealed && selected === null && (
          <p className="text-[0.6875rem] text-teal-500/70 mb-2 flex items-center gap-1.5 font-medium">
            <ChevronRight className="w-3 h-3 animate-pulse" />
            Нажмите на вариант ответа
          </p>
        )}
        <div className="space-y-1.5">
          {data.options.map((opt, i) => {
            const isThis = selected === i;
            const isAnswer = i === data.correctIndex;
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 cursor-pointer ${
                  revealed
                    ? isAnswer
                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 font-medium"
                      : isThis
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                      : "text-muted-foreground/50"
                    : "bg-white dark:bg-card border border-border/60 hover:border-teal-300 hover:bg-teal-50/40 dark:hover:bg-teal-900/20 hover:shadow-sm text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[0.625rem] font-bold ${
                  revealed
                    ? isAnswer ? "bg-emerald-500 text-white" : isThis ? "bg-red-400 text-white" : "bg-slate-100 text-slate-400"
                    : "bg-teal-100 text-teal-600"
                }`}>
                  {revealed ? (isAnswer ? <CheckCircle2 className="w-3 h-3" /> : isThis ? <XCircle className="w-3 h-3" /> : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
                </span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t border-border/30">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              {data.explanation}
            </p>
          </motion.div>
        )}
      </div>
      {revealed && (
        <div className="px-5 pb-4">
          <button onClick={() => { setSelected(null); setRevealed(false); }}
            className="text-xs text-teal-500 hover:text-teal-700 transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Ответить заново
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Calculator Exercise =====
interface CalcField { label: string; key: string; placeholder?: string; suffix?: string }
interface CalcData {
  title: string;
  description?: string;
  fields: CalcField[];
  formula: string; // JS expression using field keys
  resultLabel: string;
  resultSuffix?: string;
  benchmark?: { good: number; label: string };
  tip?: string;
}

export function CalculatorTask({ data, lessonId = "", blockIndex = 0 }: { data: CalcData; lessonId?: string; blockIndex?: number }) {
  const { completed: wasCompleted, xpToast, markComplete } = useBlockProgress(lessonId, "calculator", blockIndex);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [globalStats, setGlobalStats] = useState<{ count: number; avg: number; min: number; max: number; percentile: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleChange = (key: string, v: string) => {
    setValues(prev => ({ ...prev, [key]: v }));
    setResult(null);
    setGlobalStats(null);
  };

  // Generate a stable calc ID from title
  const calcId = data.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "-").slice(0, 50);

  const [calcError, setCalcError] = useState<string | null>(null);

  const calculate = async () => {
    setCalcError(null);
    try {
      const ctx: Record<string, number> = {};
      for (const f of data.fields) {
        const v = parseFloat(values[f.key] || "0");
        if (isNaN(v)) { setCalcError("Введите числовые значения во все поля."); return; }
        ctx[f.key] = v;
      }
      // Safe eval with only math — formula is hardcoded in data, not user-provided
      const fn = new Function(...Object.keys(ctx), `return ${data.formula}`);
      const res = fn(...Object.values(ctx));
      if (typeof res !== "number" || !isFinite(res)) {
        setCalcError("Ошибка в расчёте: проверьте входные значения (например, делитель не может быть 0).");
        setResult(null);
        return;
      }
      const rounded = Math.round(res * 100) / 100;
      setResult(rounded);

      if (rounded !== null) {
        markComplete({ result: rounded, fields: values });
        // Save to global stats and get comparison
        setLoadingStats(true);
        const stats = await saveCalculatorResult(calcId, rounded, values);
        if (stats) setGlobalStats(stats);
        setLoadingStats(false);
      }
    } catch { setCalcError("Ошибка в расчёте. Проверьте введённые значения."); setResult(null); }
  };

  const allFilled = data.fields.every(f => values[f.key]?.trim());

  return (
    <div className="my-6 rounded-xl border border-cyan-100/60 dark:border-cyan-800/40 bg-gradient-to-b from-cyan-50/20 to-white dark:from-cyan-950/20 dark:to-slate-900 overflow-hidden relative">
      <AnimatePresence><XPToast xp={xpToast} show={xpToast > 0} /></AnimatePresence>
      <div className="px-5 py-3.5 border-b border-cyan-100/40 dark:border-cyan-800/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-900/40 flex items-center justify-center">
          <Calculator className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">{data.title}</h4>
          {data.description && <p className="text-xs text-cyan-500/70 dark:text-cyan-400/50">{data.description}</p>}
        </div>
        {wasCompleted && result === null && <CompletedBadge />}
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {data.fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{f.label}</label>
              <div className="relative">
                <input
                  type="number"
                  value={values[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder || "0"}
                  className="w-full px-3 py-2 rounded-lg border border-cyan-200 text-sm focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300"
                />
                {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{f.suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={calculate} disabled={!allFilled}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600 transition-colors shadow-sm disabled:opacity-40">
          <Calculator className="w-3 h-3 inline mr-1.5" />Рассчитать
        </button>
        {calcError && (
          <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />{calcError}
          </p>
        )}
        <AnimatePresence>
          {result !== null && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className={`rounded-xl p-4 border ${
                data.benchmark
                  ? result >= data.benchmark.good ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                  : "bg-cyan-50 border-cyan-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{data.resultLabel}</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {result}{data.resultSuffix || ""}
                  </span>
                </div>
                {data.benchmark && (
                  <p className={`text-xs mt-2 ${result >= data.benchmark.good ? "text-emerald-600" : "text-amber-600"}`}>
                    {result >= data.benchmark.good ? "✓ " : "⚠ "}{data.benchmark.label}
                  </p>
                )}
              </div>
              {data.tip && (
                <p className="text-xs text-slate-500 mt-2 flex gap-1.5">
                  <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />{data.tip}
                </p>
              )}
              {/* Global stats comparison */}
              {loadingStats && (
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 animate-pulse" />Загрузка статистики...
                </p>
              )}
              {globalStats && globalStats.count > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Сравнение с другими ({globalStats.count} расчётов)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[0.625rem] text-slate-400 uppercase">Среднее</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{globalStats.avg}{data.resultSuffix || ""}</p>
                    </div>
                    <div>
                      <p className="text-[0.625rem] text-slate-400 uppercase">Ваш результат</p>
                      <p className="text-sm font-bold text-cyan-600">{result}{data.resultSuffix || ""}</p>
                    </div>
                    <div>
                      <p className="text-[0.625rem] text-slate-400 uppercase">Перцентиль</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{globalStats.percentile}%</p>
                    </div>
                  </div>
                  {/* Visual bar */}
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${globalStats.percentile}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== Map of interactive content per lesson =====
export interface InteractiveBlock {
  type: "image" | "dialog" | "table" | "reveal" | "proscons" | "callout" | "dragsort" | "matching" | "fillblank" | "scenario" | "miniquiz" | "calculator";
  position: "before" | "after" | "middle";
  data: any;
}

const IMG = {
  brainstorm: "https://images.unsplash.com/photo-1758873272540-439a105db676?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwdGVhbSUyMGJyYWluc3Rvcm1pbmclMjB3aGl0ZWJvYXJkJTIwaWRlYXN8ZW58MXx8fHwxNzcyOTg1MjA1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  strategy: "https://images.unsplash.com/photo-1760346546771-a81d986459ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHN0cmF0ZWd5JTIwcGxhbm5pbmclMjBtZWV0aW5nJTIwdGFibGV8ZW58MXx8fHwxNzczMDgzNDgxfDA&ixlib=rb-4.1.0&q=80&w=1080",
  interview: "https://images.unsplash.com/photo-1693044216415-e2c1d759ed62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VyJTIwcmVzZWFyY2glMjBpbnRlcnZpZXclMjBjb252ZXJzYXRpb24lMjBvZmZpY2V8ZW58MXx8fHwxNzczMDgzNDgxfDA&ixlib=rb-4.1.0&q=80&w=1080",
  analytics: "https://images.unsplash.com/photo-1657727534685-36b09f84e193?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwbWFuYWdlciUyMGxhcHRvcCUyMGRhc2hib2FyZCUyMGFuYWx5dGljc3xlbnwxfHx8fDE3NzMwODM0ODB8MA&ixlib=rb-4.1.0&q=80&w=1080",
  journey: "https://images.unsplash.com/photo-1554103210-26d928978fb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXN0b21lciUyMGpvdXJuZXklMjBzdGlja3klMjBub3RlcyUyMHdvcmtzaG9wfGVufDF8fHx8MTc3MzA4MzQ4Mnww&ixlib=rb-4.1.0&q=80&w=1080",
  kanban: "https://images.unsplash.com/photo-1677506048148-0c914dd8197b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ2lsZSUyMGthbmJhbiUyMGJvYXJkJTIwc3ByaW50JTIwcGxhbm5pbmd8ZW58MXx8fHwxNzczMDgzNDgzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  wireframe: "https://images.unsplash.com/photo-1727522974676-c2f9c32ee692?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlZnJhbWUlMjBwcm90b3R5cGUlMjBkZXNpZ24lMjBza2V0Y2glMjBwYXBlcnxlbnwxfHx8fDE3NzMwODM0ODN8MA&ixlib=rb-4.1.0&q=80&w=1080",
  collab: "https://images.unsplash.com/photo-1758873268663-5a362616b5a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwdGVhbSUyMGNvbGxhYm9yYXRpb24lMjBtb2Rlcm4lMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzczMDgzNDgzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  growth: "https://images.unsplash.com/photo-1723987251277-18fc0a1effd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwY2hhcnQlMjBncm93dGglMjBzY3JlZW58ZW58MXx8fHwxNzczMDgzNDgzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  ux: "https://images.unsplash.com/photo-1730817403280-1b0b8a01efbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMjBhcHAlMjBVWCUyMHRlc3RpbmclMjB1c2FiaWxpdHl8ZW58MXx8fHwxNzczMDgzNDg0fDA&ixlib=rb-4.1.0&q=80&w=1080",
  research: "https://images.unsplash.com/photo-1715842929115-fc4c7a803a1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wZXRpdGl2ZSUyMGFuYWx5c2lzJTIwbWFya2V0JTIwcmVzZWFyY2glMjBkb2N1bWVudHN8ZW58MXx8fHwxNzczMDgzNDg0fDA&ixlib=rb-4.1.0&q=80&w=1080",
  metrics: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwbWV0cmljcyUyMEtQSSUyMGRhc2hib2FyZCUyMG1vbml0b3J8ZW58MXx8fHwxNzczMDgzNDg0fDA&ixlib=rb-4.1.0&q=80&w=1080",
  prototype: "https://images.unsplash.com/photo-1764874299006-bf4266427ec9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVzZW50YXRpb24lMjBhdWRpZW5jZSUyMGJ1c2luZXNzJTIwcGl0Y2h8ZW58MXx8fHwxNzczMDgzNDg1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  leadership: "https://images.unsplash.com/photo-1761250246894-ee2314939662?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29uZmxpY3QlMjByZXNvbHV0aW9uJTIwbmVnb3RpYXRpb24lMjBkaXNjdXNzaW9ufGVufDF8fHx8MTc3MzA4MzQ4Nnww&ixlib=rb-4.1.0&q=80&w=1080",
  aitools: "https://images.unsplash.com/photo-1655393001768-d946c97d6fd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBSSUyMGFydGlmaWNpYWwlMjBpbnRlbGxpZ2VuY2UlMjB0ZWNobm9sb2d5JTIwZnV0dXJpc3RpY3xlbnwxfHx8fDE3NzMwODM0ODV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  career: "https://images.unsplash.com/photo-1758518730384-be3d205838e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJlZXIlMjBqb2IlMjBpbnRlcnZpZXclMjBwcm9mZXNzaW9uYWwlMjBoYW5kc2hha2V8ZW58MXx8fHwxNzczMDgzNDg1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  ecommerce: "https://images.unsplash.com/photo-1726443221401-ddd359c08d49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY29tbWVyY2UlMjBzaG9wcGluZyUyMG9ubGluZSUyMGNhcnQlMjBub3RpZmljYXRpb258ZW58MXx8fHwxNzczMDgzNDg2fDA&ixlib=rb-4.1.0&q=80&w=1080",
  experiment: "https://images.unsplash.com/photo-1576670263020-7842552c87d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoeXBvdGhlc2lzJTIwZXhwZXJpbWVudCUyMHNjaWVuY2UlMjB0ZXN0aW5nJTIwbGFib3JhdG9yeXxlbnwxfHx8fDE3NzMwODM0ODd8MA&ixlib=rb-4.1.0&q=80&w=1080",
};

export const lessonInteractiveContent: Record<string, InteractiveBlock[]> = {
  // === Module 1 ===
  "m1-l1": [
    { type: "image", position: "before", data: { src: IMG.brainstorm, alt: "Команда обсуждает потребности клиентов", caption: "Фокус на потребностях клиента - фундамент продуктовой работы" } },
    { type: "table", position: "middle", data: {
      title: "Почему стартапы проваливаются: ключевые причины",
      headers: ["Причина провала", "% стартапов", "Как избежать"],
      rows: [
        ["Нет потребности в продукте", "42%", "Проводить CustDev до разработки"],
        ["Закончились деньги", "29%", "Lean-подход, MVP"],
        ["Не та команда", "23%", "Тщательный подбор, культура"],
        ["Проиграли конкурентам", "19%", "Анализ рынка, дифференциация"],
        ["Проблемы с ценой", "18%", "Unit-экономика с первого дня"],
      ],
    }},
    { type: "callout", position: "after", data: { type: "warning", text: "70-90% стартапов проваливаются. Главная причина - продукт, который никому не нужен. Всегда начинайте с потребности клиента!" } },
    { type: "scenario", position: "after", data: {
      title: "Ситуация: вы основатель стартапа",
      situation: "Вам пришла идея приложения для автоматического учёта финансов. Вы уже нарисовали 20 экранов в Figma и нашли разработчика. Что делаете первым делом?",
      choices: [
        { text: "Начинаю разработку — идея горячая, нужно быстрее выйти на рынок", outcome: "Через 6 месяцев и $50K вы обнаруживаете, что целевая аудитория уже использует банковские приложения и не хочет переходить на новое. Классический SISP.", isOptimal: false, explanation: "Начинать с разработки без валидации — самая дорогая ошибка. 90% стартапов, которые так делают, провалятся." },
        { text: "Провожу 10-15 CustDev интервью с потенциальными клиентами", outcome: "За 2 недели вы узнаёте, что фрилансеры действительно страдают от учёта финансов. Но им не нужно приложение — они хотят бота в Telegram. Вы экономите 5 месяцев и $45K!", isOptimal: true, explanation: "Потребность клиента первична. Сначала найдите сегмент с болью, потом — решение." },
        { text: "Делаю лендинг и запускаю рекламу, чтобы проверить спрос", outcome: "Вы получаете 200 регистраций, но конверсия в оплату 0%. Без понимания работы клиента лендинг привлекает любопытных, а не покупателей.", isOptimal: false, explanation: "Лендинг без CustDev — это проверка интереса, а не потребности. Люди регистрируются, но не платят." },
      ],
    }},
    { type: "miniquiz", position: "after", data: {
      question: "Какой самый сильный сигнал того, что у сегмента есть потребность?",
      options: ["Люди говорят 'было бы круто'", "Сегмент УЖЕ тратит деньги/время/нервы на решение", "Много запросов в Google по теме", "Конкуренты уже на рынке"],
      correctIndex: 1,
      explanation: "Самый сильный сигнал — когда люди УЖЕ инвестируют ресурсы (деньги, время, нервы) в решение проблемы. Это доказывает реальность потребности, а не просто интерес.",
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте причины провала стартапов по частоте",
      description: "Перетащите элементы в правильном порядке — от самой частой к самой редкой",
      items: ["Нет потребности в продукте", "Закончились деньги", "Не та команда", "Проиграли конкурентам", "Проблемы с ценой"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],
  "m1-l2": [
    { type: "image", position: "before", data: { src: IMG.collab, alt: "Культура customer obsession", caption: "Customer Obsession - первый принцип лучших компаний мира" } },
    { type: "fillblank", position: "middle", data: {
      title: "Вспомните принципы компаний",
      prompt: "Первый принцип Amazon — ___. Принцип Google: фокус на ___ — и всё остальное приложится. Uber: мы одержимы ___.",
      blanks: [
        { answer: "Customer Obsession", hint: "Одержимость...", accept: ["customer obsession", "одержимость клиентом"] },
        { answer: "пользователе", hint: "на ком фокус?", accept: ["user", "пользователь", "пользователе", "юзере"] },
        { answer: "клиентом", hint: "кем одержимы?", accept: ["customer", "клиент", "клиентом"] },
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Сравнение подходов к клиентоцентричности",
      headers: ["Компания", "Принцип", "Как реализуют"],
      rows: [
        ["Amazon", "Customer Obsession (одержимость клиентом)", "Working Backwards — начинают с пресс-релиза о готовом продукте"],
        ["Google", "Фокус на пользователе", "UX-исследования на каждом этапе разработки"],
        ["Uber", "Одержимость клиентом", "Краткосрочные жертвы ради долгосрочной лояльности"],
        ["Patreon", "Создатели на первом месте", "Каждый запрос — это человек, а не «юзер»"],
      ],
    }},
  ],
  "m1-l3": [
    { type: "image", position: "before", data: { src: IMG.growth, alt: "Статистика выживаемости стартапов", caption: "Данные исследований о выживаемости стартапов" } },
    { type: "miniquiz", position: "middle", data: {
      question: "По данным CBInsights, какая главная причина провала стартапов?",
      options: ["Закончились деньги", "Не та команда", "Нет потребности в продукте", "Проиграли конкурентам"],
      correctIndex: 2,
      explanation: "42% стартапов проваливаются из-за отсутствия потребности в продукте. Это причина #1 — даже более частая, чем нехватка денег (29%). Всегда начинайте с валидации потребности!",
    }},
    { type: "table", position: "middle", data: {
      title: "Исследования смертности стартапов",
      headers: ["Исследование", "Год", "Выборка", "Ключевой вывод"],
      rows: [
        ["Startup Genome", "2012", "3200+ стартапов", "90%+ не переживают 3 года"],
        ["a16z", "2012", "Портфель фонда", "70% преждевременно масштабируются"],
        ["CBInsights", "2018", "101 постмортем", "67% умирают, #1 - No market need"],
        ["Shikhar Ghosh", "2010", "2000 стартапов", "3-4/10 полный провал"],
        ["Failory", "2019", "80+ интервью", "34% не нашли PMF"],
      ],
    }},
  ],
  "m1-l4": [
    { type: "dialog", position: "middle", data: {
      title: "Типичный диалог: основатель vs реальность",
      description: "Как выглядит процесс осознания ошибок на практике",
      messages: [
        { role: "respondent", name: "Основатель", text: "У меня гениальная идея! Приложение календаря на блокчейне! Нужно срочно искать инвестиции и нанимать команду!" },
        { role: "interviewer", name: "Ментор", text: "Стоп. А ты разговаривал с потенциальными клиентами? Есть ли люди, которые СЕЙЧАС страдают от проблемы, которую ты хочешь решить?", note: "Ключевой вопрос - начинать с потребности, а не с технологии" },
        { role: "respondent", name: "Основатель", text: "Ну... нет. Но я же знаю, что людям нужен лучший календарь! Я сам мучаюсь!" },
        { role: "interviewer", name: "Ментор", text: "Один человек - не сегмент. Сколько людей ты спросил? И главное - тратят ли они деньги, время и нервы на решение этой проблемы прямо сейчас?", note: "Самый сильный сигнал - люди уже тратят ресурсы на решение" },
        { role: "respondent", name: "Основатель", text: "Хм... Если честно, большинство моих знакомых просто используют Google Calendar и вроде довольны..." },
        { role: "interviewer", name: "Ментор", text: "Вот! Это классический SISP - Solution In Search of a Problem. Давай перевернём: найдём сегмент, у которого есть боль, и ПОТОМ придумаем решение.", note: "SISP - одна из главных ловушек для основателей" },
      ],
    }},
    { type: "proscons", position: "after", data: {
      title: "Подход 'Сначала продукт' vs 'Сначала потребность'",
      pros: ["Быстрее находим PMF", "Экономим деньги и время", "Меньше risk провала", "Клиенты готовы платить"],
      cons: ["Нужно побороть ego", "Требует дисциплины", "Может разочаровать (идея не нужна)", "Нужно выходить из зоны комфорта"],
    }},
  ],

  // === Module 2 ===
  "m2-l1": [
    { type: "image", position: "before", data: { src: IMG.strategy, alt: "Transaction Cost концепция", caption: "Transaction Cost - сумма всех усилий клиента для получения результата" } },
    { type: "table", position: "middle", data: {
      title: "Компоненты Transaction Cost",
      headers: ["Компонент TC", "Описание", "Пример"],
      rows: [
        ["Деньги", "Прямая стоимость решения", "Цена подписки, покупки"],
        ["Время", "Затраты времени на все шаги", "Обучение, ожидание, использование"],
        ["Усилия", "Когнитивная и физическая нагрузка", "Разобраться в интерфейсе, заполнить формы"],
        ["Энергия", "Эмоциональные затраты", "Стресс, тревога, раздражение"],
        ["Риски", "Неопределённость результата", "А вдруг не сработает? Потеряю данные?"],
      ],
    }},
    { type: "dialog", position: "after", data: {
      title: "Пример: как TC влияет на выбор решения",
      messages: [
        { role: "narrator", text: "Ситуация: Владелец кофейни выбирает между аутсорсом и штатным дизайнером" },
        { role: "respondent", name: "Владелец кофейни", text: "Раньше я заказывал 5 картинок в месяц у фрилансера. Было нормально: поставил задачу, получил результат." },
        { role: "interviewer", name: "Продакт", text: "А что изменилось?", note: "Ищем триггер изменения поведения" },
        { role: "respondent", name: "Владелец кофейни", text: "Сеть выросла до 10 кофеен. Теперь нужно 100 картинок в месяц. Искать фрилансеров, ставить задачи, ждать, править - это съедает 2 дня в неделю!" },
        { role: "interviewer", name: "Продакт", text: "То есть Transaction Cost на аутсорсе вырос до неприемлемого уровня?", note: "TC = время поиска + постановка задач + ожидание + правки + оплата" },
        { role: "respondent", name: "Владелец кофейни", text: "Именно. Нанял дизайнера в штат - TC упал в разы. Задача ставится за минуту, результат через час." },
      ],
    }},
  ],
  "m2-l2": [
    { type: "image", position: "before", data: { src: IMG.analytics, alt: "Анализ Transaction Cost", caption: "Клиент всегда выбирает решение с наименьшим Transaction Cost" } },
    { type: "callout", position: "middle", data: { type: "info", text: "Главное правило: из двух решений для одной работы клиент выберет то, у которого ниже Transaction Cost. Это работает на уровне нейробиологии - мозг оптимизирует затраты энергии." } },
    { type: "scenario", position: "middle", data: {
      title: "Ситуация: конкурент снижает TC быстрее вас",
      situation: "Ваш SaaS для управления проектами стоит $20/мес. Конкурент запустил бесплатный план с 80% вашей функциональности. Ваши клиенты начали уходить. Что делаете?",
      choices: [
        { text: "Снижаю цену до $10/мес, чтобы удержать клиентов", outcome: "Краткосрочно удерживаете часть клиентов, но маржа падает на 50%. Через полгода конкурент добавляет недостающие 20% функций — и вы снова теряете.", isOptimal: false, explanation: "Ценовая война — проигрышная стратегия. TC ≠ только деньги." },
        { text: "Фокусируюсь на уникальных интеграциях и снижаю TC использования", outcome: "Вы добавляете автоматизации, которые экономят 3 часа/неделю. Клиенты остаются, потому что общий TC (время+усилия) у вас ниже, несмотря на цену.", isOptimal: true, explanation: "TC = деньги + время + усилия + энергия. Снижая нефинансовые компоненты, вы побеждаете даже бесплатных конкурентов." },
        { text: "Запускаю свой бесплатный план", outcome: "Бесплатный план привлекает freeloaders, нагружает саппорт, каннибализирует платных клиентов. Юнит-экономика рушится.", isOptimal: false },
      ],
    }},
    { type: "calculator", position: "after", data: {
      title: "Рассчитайте Transaction Cost вашего продукта",
      description: "Оцените каждый компонент TC по шкале 1-10",
      fields: [
        { label: "Деньги (1-10)", key: "money", placeholder: "5" },
        { label: "Время (1-10)", key: "time", placeholder: "7" },
        { label: "Усилия (1-10)", key: "effort", placeholder: "6" },
        { label: "Эмоции (1-10)", key: "emotion", placeholder: "4" },
      ],
      formula: "(money + time + effort + emotion) / 4",
      resultLabel: "Средний TC",
      resultSuffix: "/10",
      benchmark: { good: 4, label: "TC < 4 — отлично! TC > 6 — нужно снижать" },
      tip: "Фокусируйтесь на компоненте с самым высоким баллом — это ваш главный рычаг роста конверсии.",
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините компоненты TC с примерами",
      description: "Найдите правильную пару для каждого компонента Transaction Cost",
      pairs: [
        ["Деньги", "Цена подписки, покупки"],
        ["Время", "Обучение, ожидание, использование"],
        ["Усилия", "Разобраться в интерфейсе"],
        ["Энергия", "Стресс, тревога, раздражение"],
        ["Риски", "А вдруг не сработает?"],
      ],
    }},
  ],

  // === Module 3 ===
  "m3-l1": [
    { type: "image", position: "before", data: { src: IMG.strategy, alt: "Создание знания через гипотезы", caption: "Всё знание во вселенной создаётся через проверку гипотез" } },
    { type: "table", position: "middle", data: {
      title: "Цикл создания знания",
      headers: ["Этап", "Действие", "Результат"],
      rows: [
        ["1. Гипотеза", "Формулируем предположение", "Чёткое проверяемое утверждение"],
        ["2. Эксперимент", "Проводим тест", "Данные для анализа"],
        ["3. Анализ", "Изучаем результаты", "Понимание: подтвердилось или нет"],
        ["4. Итерация", "Корректируем или убиваем гипотезу", "Новое знание или новая гипотеза"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте этапы цикла создания знания",
      description: "Расположите шаги в правильном порядке",
      items: ["Формулируем гипотезу", "Проводим эксперимент", "Изучаем результаты", "Корректируем или убиваем гипотезу"],
      correctOrder: [0, 1, 2, 3],
    }},
    { type: "fillblank", position: "after", data: {
      title: "Заполните пропуски: цикл создания знания",
      description: "Вспомните ключевые концепции из урока",
      prompt: "Всё знание во вселенной создаётся через: ___ → эксперимент → ___ → корректировка. В продакт-менеджменте ___ из 10 гипотез не подтверждаются.",
      blanks: [
        { answer: "гипотеза", hint: "предположение", accept: ["гипотезу", "гипотезы"] },
        { answer: "анализ", hint: "изучение", accept: ["результаты", "результат", "анализ результатов"] },
        { answer: "9", hint: "число", accept: ["девять"] },
      ],
    }},
    { type: "miniquiz", position: "after", data: {
      question: "Что является главным фокусом продуктовых команд?",
      options: ["Количество написанного кода", "Количество проверенных гипотез в единицу времени", "Количество фич в релизе", "Скорость роста выручки"],
      correctIndex: 1,
      explanation: "9 из 10 гипотез не подтверждаются. Единственный способ приблизиться к созданию нужного знания — увеличивать количество гипотез, которые мы проверяем за единицу времени.",
    }},
  ],

  // === Module 4 ===
  "m4-l1": [
    { type: "image", position: "before", data: { src: IMG.brainstorm, alt: "Riskiest Assumption Test", caption: "RAT: выделяем и проверяем самые рискованные предположения" } },
    { type: "table", position: "middle", data: {
      title: "Категории рискованных предположений (по приоритету)",
      headers: ["#", "Категория", "Что проверяем", "Метод проверки"],
      rows: [
        ["1", "Рынок и тренды", "Рынок растёт, нет блокеров", "Desk research, аналитика"],
        ["2", "Сегмент", "Есть большой платёжеспособный сегмент", "JTBD-интервью"],
        ["3", "Продукт", "Решает Job Story сегмента", "MVP, прототип, тест"],
        ["4", "Юнит-экономика", "Сходится пессимистичная модель", "Финансовая модель"],
        ["5", "Масштабирование", "ROI сохраняется при росте", "A/B тесты каналов"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте категории RAT по приоритету проверки",
      description: "Что проверяем в первую очередь? Перетащите от самого важного к наименее приоритетному",
      items: ["Рынок и тренды", "Сегмент", "Продукт", "Юнит-экономика", "Масштабирование"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
    { type: "reveal", position: "after", data: {
      title: "Пример: RAT для приложения календаря за $30/мес",
      content: "Рискованные предположения:\n1. Предпринимателям важно экономить время на управлении расписанием (проверить: JTBD-интервью)\n2. Экономия 5+ часов/мес реалистична (проверить: прототип с метриками)\n3. Готовы платить $30/мес при наличии бесплатных альтернатив (проверить: лендинг + предзаказ)\n4. CAC будет ниже LTV (проверить: тестовые каналы привлечения)\n\nСамый рискованный: #1 - есть ли вообще эта потребность?"
    }},
    { type: "scenario", position: "after", data: {
      title: "RAT в действии: EdTech стартап",
      situation: "Вы создаёте платформу обучения дизайну через AI. Инвестор дал $100K, 3 месяца до раунда. Самое рискованное предположение: 'дизайнеры готовы учиться через AI'. Что делаете?",
      choices: [
        { text: "Строю MVP платформы за 3 месяца", outcome: "Через 3 месяца MVP готов, но дизайнеры не приходят. Деньги потрачены, времени на пивот нет.", isOptimal: false, explanation: "3 месяца на MVP без валидации — фатальная ошибка." },
        { text: "Провожу 20 JTBD-интервью с дизайнерами за 2 недели", outcome: "Дизайнеры ХОТЯТ учиться через AI, но боятся потерять творчество. Пивот: AI ускоряет рутину. Validation за 2 недели!", isOptimal: true, explanation: "Проверка самого рискованного предположения за минимальные ресурсы — суть RAT." },
        { text: "Запускаю рекламу на лендинг", outcome: "1000 кликов, 50 регистраций, 0 оплат. Интерес ≠ готовность платить.", isOptimal: false },
      ],
    }},
    { type: "fillblank", position: "after", data: {
      title: "Заполните: шаги RAT",
      prompt: "RAT: ___ все рискованные предположения, ___ от наиболее рискованных, пойти ___ топ предположений.",
      blanks: [
        { answer: "выписать", hint: "записать", accept: ["записать", "выделить"] },
        { answer: "отранжировать", hint: "упорядочить", accept: ["ранжировать", "отсортировать"] },
        { answer: "проверять", hint: "валидировать", accept: ["проверить", "валидировать"] },
      ],
    }},
  ],

  // === Module 5 ===
  "m5-l1": [
    { type: "image", position: "before", data: { src: IMG.strategy, alt: "OODA цикл", caption: "OODA-цикл: Observe, Orient, Decide, Act" } },
    { type: "table", position: "middle", data: {
      title: "Четыре этапа OODA-цикла",
      headers: ["Этап", "Действие", "Ключевой вопрос", "Продуктовый контекст"],
      rows: [
        ["Observe", "Наблюдай", "Что происходит?", "Метрики, обратная связь, рынок"],
        ["Orient", "Анализируй", "Что это значит?", "Убери искажения, пойми контекст"],
        ["Decide", "Решай", "Что делать?", "Сформулируй гипотезу"],
        ["Act", "Действуй", "Что получилось?", "Запусти эксперимент, измерь"],
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините этапы OODA с ключевыми вопросами",
      pairs: [
        ["Observe (Наблюдай)", "Что происходит?"],
        ["Orient (Анализируй)", "Что это значит?"],
        ["Decide (Решай)", "Что делать?"],
        ["Act (Действуй)", "Что получилось?"],
      ],
    }},
  ],

  // === Module 6 ===
  "m6-l1": [
    { type: "image", position: "before", data: { src: IMG.journey, alt: "Jobs To Be Done", caption: "JTBD: люди 'нанимают' продукты для выполнения работ" } },
    { type: "dialog", position: "middle", data: {
      title: "Пример: JTBD в действии (Netflix)",
      description: "Как выглядит 'работа' которую нанимает продукт",
      messages: [
        { role: "narrator", text: "Контекст: Digital-маркетолог, работает 10-12 часов в день" },
        { role: "interviewer", name: "Исследователь", text: "Расскажите, как обычно заканчивается ваш рабочий день?", note: "Начинаем с контекста, не с продукта" },
        { role: "respondent", name: "Маркетолог", text: "Обычно я ужинаю и открываю Netflix. Это единственный способ 'выключить голову' после работы." },
        { role: "interviewer", name: "Исследователь", text: "Какой результат вы хотите получить?", note: "Ищем ожидаемый результат = 'работу'" },
        { role: "respondent", name: "Маркетолог", text: "Хочу переключить внимание, успокоить нервную систему и заснуть. Чтобы не тревожиться, что выгорю." },
        { role: "interviewer", name: "Исследователь", text: "То есть Netflix для вас - не развлечение, а средство эмоциональной регуляции?", note: "Job Story: Когда вынуждена работать 10-12ч -> хочу переключиться -> чтобы не тревожиться о выгорании" },
      ],
    }},
  ],
  "m6-l2": [
    { type: "miniquiz", position: "middle", data: {
      question: "Молодой человек покупает дорогие кроссовки Nike. Какая работа НЕ является бессознательной?",
      options: ["Повысить социальный статус (SCARF: Status)", "Защитить ноги от мокрого асфальта", "Быть частью группы (SCARF: Relatedness)", "Получить одобрение друзей"],
      correctIndex: 1,
      explanation: "Защита ног — функциональная (осознаваемая) работа. Статус, принадлежность, одобрение — бессознательные/эмоциональные работы, которые часто важнее функциональных.",
      hint: "Подумайте: какая работа рациональная, а какие — эмоциональные?",
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините тип работы JTBD с примером",
      description: "Определите, какой пример относится к какому типу работы",
      pairs: [
        ["Циклические", "Заниматься спортом 3р/нед"],
        ["Последовательные", "Оплатить инвойс->банк->оплата"],
        ["Виральные", "Пригласить коллегу в Figma"],
        ["Налоговые", "Напоминать юристу о сроках"],
        ["Бессознательные", "Проверять подписчиков (статус)"],
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Типы работ в Jobs To Be Done",
      headers: ["Тип работы", "Описание", "Пример", "Значение для продукта"],
      rows: [
        ["Циклические", "Повторяются с периодичностью", "Заниматься спортом 3р/нед", "Подписочная модель"],
        ["Последовательные", "Цепочка для достижения цели", "Оплатить фрилансеру: инвойс->банк->оплата", "Автоматизация шагов"],
        ["Виральные", "Делаем с/для других людей", "Пригласить коллегу в Figma", "Органический рост"],
        ["Налоговые", "Неожиданные + негативные", "Напоминать юристу о сроках", "Снять боль = лояльность"],
        ["Бессознательные", "Мозг решает автоматически", "Проверять подписчиков (статус)", "SCARF model"],
        ["Ложные", "Рациональное обоснование", "Учёт финансов (успокоить тревогу)", "Копать глубже"],
      ],
    }},
  ],

  // === Module 7 ===
  "m7-l1": [
    { type: "image", position: "before", data: { src: IMG.interview, alt: "JTBD-интервью", caption: "JTBD-интервью: находим работы через действия человека" } },
    { type: "dialog", position: "middle", data: {
      title: "Пример JTBD-интервью: поиск сегмента",
      description: "Демонстрация правильной техники интервьюирования",
      messages: [
        { role: "interviewer", name: "Интервьюер", text: "Спасибо что согласились на интервью. Мне важно понять ваш опыт. Я буду задавать вопросы, а вы рассказывайте как было на самом деле - 'правильных' ответов нет.", note: "Установление правил: снимаем давление 'правильного ответа'" },
        { role: "respondent", name: "Респондент", text: "Хорошо, готов!" },
        { role: "interviewer", name: "Интервьюер", text: "Расскажите, как вы в последний раз решали задачу [работа]? Опишите в деталях.", note: "Якорим на конкретный последний опыт - не на абстракции" },
        { role: "respondent", name: "Респондент", text: "Ну, в прошлый вторник мне нужно было... Я обычно делаю это через Excel, но в этот раз..." },
        { role: "interviewer", name: "Интервьюер", text: "Какая жизненная ситуация привела вас к тому, что вы начали это делать?", note: "Ищем триггер и контекст - когда возникла работа?" },
        { role: "respondent", name: "Респондент", text: "Мой руководитель поставил KPI по снижению оттока на 15%. Я понял что мне нужно лучше понимать, почему клиенты уходят." },
        { role: "interviewer", name: "Интервьюер", text: "Насколько важно по 10-балльной шкале, чтобы эта работа была выполнена? Где 10 - как забота о безопасности близких.", note: "10-балльная шкала важности помогает сравнивать между респондентами" },
        { role: "respondent", name: "Респондент", text: "Я бы сказал 8. Это прямо влияет на мою премию и карьеру." },
      ],
    }},
  ],
  "m7-l2": [
    { type: "image", position: "before", data: { src: IMG.research, alt: "JTBD-исследование", caption: "JTBD-исследование для поиска продукта и коммуникации" } },
    { type: "scenario", position: "middle", data: {
      title: "Ситуация: респондент говорит 'всё устраивает'",
      situation: "Вы проводите JTBD-интервью. Респондент говорит: 'Я использую Excel для трекинга задач. Меня всё устраивает.' Как реагируете?",
      choices: [
        { text: "Заканчиваю интервью — раз устраивает, значит потребности нет", outcome: "Вы потеряли ценного респондента. За 'всё устраивает' часто скрывается привычка, а не удовлетворённость.", isOptimal: false },
        { text: "Прошу описать КОНКРЕТНЫЙ последний раз: шаг за шагом", outcome: "Респондент начинает описывать: 'Ну, я трачу 30 минут на обновление таблицы... потом ещё 20 на создание отчёта для руководителя...' Вы нашли боль!", isOptimal: true, explanation: "Люди не осознают проблемы, пока не опишут процесс в деталях. Конкретика вскрывает реальный TC." },
        { text: "Спрашиваю 'А что бы вы хотели улучшить?'", outcome: "Респондент придумывает абстрактные ответы: 'Ну, было бы круто если бы...' Это фантазии, а не реальные потребности.", isOptimal: false, explanation: "Вопросы о будущем дают ненадёжные данные. Фокусируйтесь на прошлом опыте." },
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Применение JTBD-исследования",
      headers: ["Область", "Что даёт", "Пример"],
      rows: [
        ["Поиск продукта", "Понимание работ клиента", "Какие работы не имеют решения?"],
        ["Коммуникация", "Точные сообщения", "Говорить на языке работ"],
        ["Приоритизация", "Какие работы важнее", "Фокус на высокочастотных"],
        ["Позиционирование", "Отстройка от конкурентов", "Уникальное решение работы"],
      ],
    }},
  ],
  "m7-l3": [
    { type: "dialog", position: "middle", data: {
      title: "Пример B2B JTBD-интервью с ЛПР",
      description: "Как интервьюировать лиц, принимающих решения",
      messages: [
        { role: "interviewer", name: "Интервьюер", text: "Опишите вашу рол�� и зону ответственности.", note: "Первый шаг - определяем, ЛПР ли наш респондент" },
        { role: "respondent", name: "VP of Engineering", text: "Я отвечаю за всю инженерную команду - 40 человек, 6 команд. Мои KPI: скорость доставки фич, стабильность продукта, удержание разработчиков." },
        { role: "interviewer", name: "Интервьюер", text: "Что для вас является успехом в работе?", note: "Не спрашиваем напрямую 'какие KPI' - B2B-клиенты часто не отвечают" },
        { role: "respondent", name: "VP of Engineering", text: "Когда мы доставляем фичи в срок без инцидентов, и при этом никто не увольняется. Последнее сейчас самая большая проблема." },
        { role: "interviewer", name: "Интервьюер", text: "Расскажите подробнее - какие изменения ожидали? Планировали сэкономить, заработать или не потерять?", note: "B2B: заработать / сэкономить / не потерять деньги" },
      ],
    }},
  ],

  // === Module 8 ===
  "m8-l1": [
    { type: "image", position: "before", data: { src: IMG.journey, alt: "Поиск сегмента", caption: "Поиск сегмента: итеративный процесс от гипотезы к пониманию" } },
    { type: "table", position: "middle", data: {
      title: "Сценарии хода JTBD-исследования",
      headers: ["Сценарий", "Что произошло", "Что делать"],
      rows: [
        ["Не те респонденты", "Все далеки от целевого профиля", "Пересмотреть каналы рекрутинга"],
        ["Редкая работа", "Работа есть, но у 1-2 из 16", "Скорректировать гипотезу сегмента"],
        ["Микс (самый частый)", "7 из 16 подходящие", "Склеить сегменты, уточнить квалификацию"],
        ["Попадание", "Нашли целевых, паттерн виден", "Изучать под микроскопом"],
      ],
    }},
  ],

  // === Module 9 ===
  "m9-l1": [
    { type: "image", position: "before", data: { src: IMG.interview, alt: "Экспертное интервью", caption: "Экспертные интервью — быстрый способ получить знание о рынке" } },
    { type: "dialog", position: "middle", data: {
      title: "Пример экспертного интервью",
      description: "Как получить максимум от 30-минутного разговора с экспертом",
      messages: [
        { role: "interviewer", name: "PM", text: "Спасибо за время! Мы изучаем рынок EdTech в B2B. Вы 10 лет в этой индустрии — хотел бы узнать вашу перспективу.", note: "Позиционируйте эксперта как учителя — люди любят делиться знаниями" },
        { role: "respondent", name: "Эксперт", text: "Конечно. Что конкретно вас интересует?" },
        { role: "interviewer", name: "PM", text: "Какие 2-3 самых больших изменения вы видите на рынке за последний год? Что изменило правила игры?", note: "Открытый вопрос о трендах — эксперт расскажет то, что вы не найдёте в гугле" },
        { role: "respondent", name: "Эксперт", text: "AI перевернул всё. Компании теперь хотят персонализированное обучение. И бюджеты на L&D в enterprise выросли на 40%." },
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "За 30-минутный созвон с экспертом вы получите больше знаний, чем за неделю desk research. Это самый недооценённый метод исследования." } },
  ],
  "m9-l2": [
    { type: "dialog", position: "middle", data: {
      title: "Пример проблемного интервью",
      description: "Как выявлять проблемы при выполнении работы",
      messages: [
        { role: "interviewer", name: "Исследователь", text: "Расскажите, с какими сложностями вы сталкиваетесь при решении этой задачи?", note: "Открытый вопрос о проблемах - не подсказываем" },
        { role: "respondent", name: "Респондент", text: "Самое неприятное - это когда я трачу 2 часа на настройку, а потом оказывается, что да��ные неправильные и надо всё переделывать." },
        { role: "interviewer", name: "Исследователь", text: "Как часто это происходит?", note: "Частотность проблемы = приоритет для решения" },
        { role: "respondent", name: "Респондент", text: "Минимум раз в неделю. И каждый раз я ужасно раздражаюсь." },
        { role: "interviewer", name: "Исследователь", text: "По шкале от 1 до 10, насколько эта проблема влияет на ваш результат?", note: "Скор проблемы = средняя эмоция x средняя частотность" },
      ],
    }},
  ],

  // === Module 10 ===
  "m10-l1": [
    { type: "image", position: "before", data: { src: IMG.collab, alt: "Рекрутинг респондентов", caption: "Личные связи и рекомендации — самый эффективный рекрутинг" } },
    { type: "dialog", position: "middle", data: {
      title: "Как найти респондентов: пример из практики",
      messages: [
        { role: "interviewer", name: "PM", text: "Нам нужно 16 респондентов для JTBD-исследования. Целевой профиль: владельцы малого бизнеса, 10-50 сотрудников, используют CRM.", note: "Чёткий профиль — 50% успеха рекрутинга" },
        { role: "respondent", name: "HR", text: "Могу разместить в 3 бизнес-сообществах в Telegram. Обычно получаем 5-8 откликов за 2 дня." },
        { role: "interviewer", name: "PM", text: "Хорошо. Плюс я попрошу каждого респондента порекомендовать 1-2 знакомых с похожим профилем.", note: "Snowball sampling — каждый респондент рекомендует следующего" },
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте каналы рекрутинга по эффективности",
      description: "От самого эффективного к наименее",
      items: ["Личные рекомендации", "Тематические сообщества", "LinkedIn outreach", "Платные панели", "Холодные звонки"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],

  // === Module 11 ===
  "m11-l1": [
    { type: "image", position: "before", data: { src: IMG.interview, alt: "Глубинное интервью", caption: "Активное слушание — ключевой навык интервьюера" } },
    { type: "dialog", position: "middle", data: {
      title: "Пример глубинного интервью: техника воронки",
      messages: [
        { role: "interviewer", name: "Интервьюер", text: "Расскажите о последнем разе, когда вам пришлось [действие]. Максимально подробно — что было первым шагом?", note: "Техника воронки: от общего к частному" },
        { role: "respondent", name: "Респондент", text: "Ну, я открыл приложение и начал искать..." },
        { role: "interviewer", name: "Интервьюер", text: "Что именно вы ввели в поиск? Помните первые слова?", note: "Конкретика! 'Что ввели' > 'Как искали'" },
        { role: "respondent", name: "Респондент", text: "Я ввёл 'дешёвые билеты Москва Барселона'... и получил 200 результатов. Это было ужасно." },
        { role: "interviewer", name: "Интервьюер", text: "Что вы чувствовали в этот момент? Какая эмоция?", note: "Эмоции = сила потребности. Раздражение = высокий TC" },
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Правило 80/20: интервьюер говорит 20%, респондент — 80%. Если вы говорите больше — вы продаёте, а не исследуете." } },
    { type: "reveal", position: "after", data: {
      title: "Чеклист проведения глубинного интервью",
      content: "До интервью:\n✓ Подготовить скрипт (5-7 открытых вопросов)\n✓ Настроить запись (с разрешения)\n✓ Проверить оборудование\n\nВо время:\n✓ Установить раппорт (2-3 мин small talk)\n✓ Объяснить правила ('нет правильных ответов')\n✓ Задавать 'Почему?' минимум 3 раза (5 Whys)\n✓ Ловить эмоции и записывать\n\nПосле:\n✓ Записать инсайты в течение 30 минут\n✓ Отметить паттерны\n✓ Обновить гипотезы"
    }},
  ],

  // === Module 12 ===
  "m12-l1": [
    { type: "matching", position: "after", data: {
      title: "Сопоставьте сегменты ABCDX со стратегиями",
      pairs: [
        ["Сегмент A", "Фокус всех ресурсов"],
        ["��егмент B", "Инвестировать, развивать"],
        ["Сегмент C", "Мониторить, не инвестировать"],
        ["Сегмент D", "Игнорировать"],
        ["Сегмент X", "Провести исследование"],
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "ABCDX-сегментация клиентов",
      headers: ["Сегмент", "Описание", "Стратегия"],
      rows: [
        ["A", "Высокая ценность, готовы покупать, LTV >> CAC", "Фокус всех ресурсов"],
        ["B", "Хорошая ценность, нужна доработка продукта", "Инвестировать, развивать"],
        ["C", "Низкая ценность, высокий CAC", "Мониторить, не инвестировать"],
        ["D", "Минимальная ценность, не покупают", "Игнорировать"],
        ["X", "Неизвестная ценность, нужно исследование", "Провести интервью"],
      ],
      highlight: 0,
    }},
  ],

  // === Module 14 ===
  "m14-l1": [
    { type: "image", position: "before", data: { src: IMG.ux, alt: "UX-тестирование", caption: "5-7 участников достаточно для выявления 80%+ UX-проблем" } },
    { type: "scenario", position: "middle", data: {
      title: "UX-тест: участник застрял",
      situation: "Вы проводите UX-тест. Участник уже 2 минуты не может найти кнопку 'Оформить заказ'. Он явно нервничает. Что делаете?",
      choices: [
        { text: "Подсказываю: 'Попробуйте нажать зелёную кнопку справа'", outcome: "Участник находит кнопку, но вы потеряли ценный инсайт. Если бы он нашёл сам — вы бы увидели его реальный путь.", isOptimal: false, explanation: "Подсказки в UX-тесте = испорченные данные. Вы тестируете интерфейс, не участника." },
        { text: "Говорю: 'Что вы ожидаете увидеть? Где бы вы искали?'", outcome: "Участник говорит: 'Я ищу кнопку внизу страницы, как обычно в магазинах'. Инсайт: кнопка должна быть внизу, а не в хедере!", isOptimal: true, explanation: "Redirect-вопрос вскрывает ментальную модель пользователя. Это золото для UX." },
        { text: "Молча наблюдаю дальше — пусть разбирается", outcome: "Через 5 минут учас��ник бросает задание и раздражён. Вы увидели проблему, но потеряли доверие участника для следующих заданий.", isOptimal: false, explanation: "2 минуты — достаточно. Дольше — stress test, а не usability test." },
      ],
    }},
    { type: "miniquiz", position: "middle", data: {
      question: "Сколько участников UX-теста достаточно для выявления 80%+ проблем?",
      options: ["2-3", "5-7", "15-20", "50+"],
      correctIndex: 1,
      explanation: "Исследование Jakob Nielsen показало: 5 участников находят ~85% usability-проблем. После 7 участников ROI тестирования резко падает — лучше провести 2 раунда по 5 человек.",
    }},
    { type: "proscons", position: "after", data: {
      title: "Модерируемый vs немодерируемый UX-тест",
      pros: ["Можно задать уточняющие вопросы", "Видишь эмоции в реальном времени", "Гибкость в ходе теста", "Более глубокие инсайты"],
      cons: ["Дороже и дольше", "Ограничен географией (если оффлайн)", "Интервьюер может влиять на поведение", "Труднее масштабировать"],
    }},
  ],

  // === Module 15 ===
  "m15-l1": [
    { type: "image", position: "before", data: { src: IMG.kanban, alt: "Приоритизация задач", caption: "Методы приоритизации: от Reach/Frequency до Poker Planning" } },
    { type: "dialog", position: "middle", data: {
      title: "Приоритизация на практике: Planning Poker",
      messages: [
        { role: "interviewer", name: "PM", text: "Окей, следующая задача: интеграция с Telegram-ботом для уведомлений. Показываем карты...", note: "Planning Poker: каждый оценивает независимо, затем обсуждение" },
        { role: "respondent", name: "Backend", text: "Я поставил 8 story points. API Telegram простой, но нужно сделать очередь сообщений и обработку ошибок." },
        { role: "interviewer", name: "PM", text: "Frontend показал 3. Большая разница! Давайте обсудим — что ты видишь, чего не вижу я?", note: "Расхождение в оценках = скрытые риски. Обсуждение обязательно!" },
        { role: "respondent", name: "Backend", text: "Telegram rate limit: 30 сообщений в секунду. При 5000 пользователей нужна очередь с ретраями. Это не тривиально." },
      ],
    }},
    { type: "callout", position: "after", data: { type: "info", text: "Reach/Frequency метод: R×F score. Задача, которая затрагивает 80% пользователей (Reach) и повторяется ежедневно (Frequency) — приоритетнее задачи для 5% пользователей раз в месяц." } },
  ],

  // === Module 16 ===
  "m16-l1": [
    { type: "image", position: "before", data: { src: IMG.growth, alt: "Жизненный цикл продукта", caption: "Жизненный цикл продукта: введение -> рост -> зрелость -> упадок" } },
    { type: "table", position: "middle", data: {
      title: "Стадии жизненного цикла продукта",
      headers: ["Стадия", "Характеристики", "Фокус продакта", "Метрики"],
      rows: [
        ["Введение", "Низкие продажи, высокие затраты", "PMF, первые клиенты", "Retention, NPS"],
        ["Рост", "Быстрый рост, появление конкурентов", "Масштабирование, удержание", "Revenue, DAU"],
        ["Зрелость", "Стабильные продажи, насыщение", "Оптимизация, новые сегменты", "Margins, LTV"],
        ["Упадок", "Снижение спроса, устаревание", "Pivot или harvesting", "Churn, ROI"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте стадии жизненного цикла продукта",
      items: ["Введение", "Рост", "Зрелость", "Упадок"],
      correctOrder: [0, 1, 2, 3],
    }},
  ],
  "m16-l3": [
    { type: "table", position: "middle", data: {
      title: "Шаблон SWOT-анализа",
      headers: ["", "Позитивное", "Негативное"],
      rows: [
        ["Внутренние факторы", "Strengths (Сильные стороны): команда, технология, бренд", "Weaknesses (Слабые стороны): ресурсы, опыт, охват"],
        ["Внешние факторы", "Opportunities (Возможности): тренды, рынок, партнёрства", "Threats (Угрозы): конкуренты, регуляция, кризис"],
      ],
    }},
  ],
  "m3-l2": [
    { type: "image", position: "before", data: { src: IMG.collab, alt: "Распространение знания", caption: "Распространять созданное знание дешевле, чем создавать новое" } },
    { type: "callout", position: "after", data: { type: "tip", text: "Найденный инсайт можно масштабировать: использовать в разных каналах, транслировать внутри компании, превращать в шаблоны и гайдлайны." } },
    { type: "dialog", position: "middle", data: {
      title: "Zero to One vs 1 to Infinity",
      messages: [
        { role: "interviewer", name: "Ментор", text: "Ты потратил 3 месяца на то, что можно было узнать за один звонок. Кто-то уже решал эту проблему до тебя?", note: "Прежде чем создавать знание — проверь, не создал ли кто-то его раньше" },
        { role: "respondent", name: "PM", text: "Хм... Наверное да, наш конкурент вышел на этот рынок 2 года назад." },
        { role: "interviewer", name: "Ментор", text: "Значит, достаточно поговорить с 3-5 людьми из их отрасли. За 5 часов ты получишь знание, которое они создавали годами.", note: "Распространение знания в 10-100× дешевле создания" },
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините тип знания со способом получения",
      pairs: [
        ["Новый рынок (Zero to One)", "JTBD-интервью + эксперименты"],
        ["Существующий рынок (1 to ∞)", "Экспертные интервью + desk research"],
        ["Лучшие практики команды", "Ретроспективы + обмен опытом"],
        ["Отраслевые стандарты", "Конференции + отчёты"],
      ],
    }},
  ],
  "m5-l2": [
    { type: "image", position: "before", data: { src: IMG.experiment, alt: "OODA цикл в действии", caption: "Скорость OODA-цикла — главное конкурентное преимущество" } },
    { type: "callout", position: "middle", data: { type: "info", text: "Побеждает не тот, у кого больше ресурсов, а тот, кто быстрее проходит OODA-цикл. Скорость обучения = конкурентное преимущество." } },
    { type: "dialog", position: "after", data: {
      title: "OODA в стартапе: пример из практики",
      messages: [
        { role: "interviewer", name: "CEO", text: "Конкурент запустил аналогичную фичу вчера. Что делаем?", note: "OODA начинается: Observe — конкурент запустил фичу" },
        { role: "respondent", name: "PM", text: "Orient: их реализация покрывает только десктоп. Наша аудитория на 70% — мобайл. Decide: делаем mobile-first версию за 1 спринт.", note: "Orient — анализ контекста. Decide — выбор стратегии" },
        { role: "interviewer", name: "CEO", text: "Отлично. Act — запускаем. Через неделю смотрим метрики и начинаем следующий цикл.", note: "Весь OODA-цикл < 1 недели. У конкурента — 1 месяц. Мы выигрываем." },
      ],
    }},
    { type: "reveal", position: "after", data: {
      title: "Как ускорить OODA-цикл в вашей команде",
      content: "1. Observe: автоматизируйте мониторинг (дашборды, алерты)\n2. Orient: еженедельный product review с данными\n3. Decide: решения принимаются за 1 встречу, не за 5\n4. Act: deployment за часы, не за недели\n5. Измеряйте: длину цикла от идеи до результата\n\nЦель: сократить цикл с 4 недель до 1 недели"
    }},
  ],
  "m8-l2": [
    { type: "image", position: "before", data: { src: IMG.research, alt: "Квалифицирующие вопросы", caption: "Квалификация респондентов — фильтр качества исследования" } },
    { type: "callout", position: "middle", data: { type: "tip", text: "Квалифицирующие вопросы помогают отсеять нерелевантных респондентов до начала интервью. Это экономит время и повышает качество данных." } },
    { type: "table", position: "after", data: {
      title: "Примеры квалифицирующих вопросов",
      headers: ["Цель", "Вопрос", "Зачем"],
      rows: [
        ["Проверить опыт", "Когда последний раз вы делали X?", "Фильтр: только с реальным опытом"],
        ["Проверить частоту", "Как часто вы сталкиваетесь с Y?", "Фильтр: частотность проблемы"],
        ["Проверить роль", "Кто принимает решение о покупке?", "Фильтр: ЛПР vs исполнитель"],
        ["Проверить бюджет", "Сколько тратите на решение?", "Фильтр: платёжеспособность"],
      ],
    }},
    { type: "dialog", position: "after", data: {
      title: "Квалификация: отсев за 2 минуты",
      messages: [
        { role: "interviewer", name: "PM", text: "Спасибо за интерес! Несколько вопросов для проверки: Вы лично управляете процессом найма в компании?", note: "Скрининг-вопрос #1: роль" },
        { role: "respondent", name: "Кандидат", text: "Нет, я помогаю HR-директору, но решения принимает она." },
        { role: "interviewer", name: "PM", text: "Понял, спасибо! К сожалению, для этого исследования нам нужны ЛПР. Могу ли я попросить контакт HR-директора?", note: "Вежливый отказ + snowball sampling" },
      ],
    }},
  ],
  "m9-l4": [
    { type: "table", position: "middle", data: {
      title: "Матрица результатов проверки гипотезы",
      headers: ["Результат", "Что значит", "Следующий шаг"],
      rows: [
        ["Подтверждена", "Гипотеза верна на данных", "Строить MVP / масштабировать"],
        ["Опровергнута", "Гипотеза неверна", "Пивот или новая гипотеза"],
        ["Частично", "Верна для подсегмента", "Уточнить сегмент, повторить"],
        ["Неопределённо", "Недостаточно данных", "Больше интервью / другой метод"],
      ],
    }},
  ],
  "m10-l2": [
    { type: "callout", position: "middle", data: { type: "tip", text: "Делегируйте рекрутинг респондентов ассистенту или HR — это освобождает время продакта для анализа и принятия стратегических решений." } },
    { type: "proscons", position: "after", data: {
      title: "Самостоятельный рекрутинг vs Делегирование",
      pros: ["PM фокусируется на анализе", "Ассистент нарабатывает навык", "Масштабируемость: 5→20 интервью", "Более объективный отбор"],
      cons: ["Нужен бриф с критериями", "Потеря контроля (вначале)", "Затраты на обучение", "Не все PM готовы делегировать"],
    }},
    { type: "reveal", position: "after", data: {
      title: "Шаблон брифа для рекрутинга респондентов",
      content: "1. Целевой профиль: [роль, отрасль, размер компании]\n2. Критерии отбора: [опыт X, использует Y, бюджет Z]\n3. Дисквалифицирующие факторы: [конкуренты, консультанты]\n4. Количество: [16 человек, 8 мин + 8 жен]\n5. Формат: [30 мин Zoom, вознаграждение 1500₽]\n6. Дедлайн: [набрать за 5 рабочих дней]\n7. Каналы: [LinkedIn, Telegram-группы, snowball]"
    }},
  ],
  "m12-l2": [
    { type: "image", position: "before", data: { src: IMG.metrics, alt: "Тест Шона Эллиса", caption: "Тест Шона Эллиса: 40%+ Very Disappointed = Product-Market Fit" } },
    { type: "calculator", position: "middle", data: {
      title: "Рассчитайте ваш PMF-скор (тест Шона Эллиса)",
      description: "Введите количество ответов на вопрос 'Как бы вы себя чувствовали, если бы не могли пользоваться продуктом?'",
      fields: [
        { label: "Very Disappointed", key: "vd", placeholder: "30" },
        { label: "Somewhat Disappointed", key: "sd", placeholder: "45" },
        { label: "Not Disappointed", key: "nd", placeholder: "25" },
      ],
      formula: "vd / (vd + sd + nd) * 100",
      resultLabel: "% Very Disappointed",
      resultSuffix: "%",
      benchmark: { good: 40, label: "40%+ = есть PMF! Меньше 40% = нужно дорабатывать продукт." },
      tip: "Минимум 40 ответов для статистической значимости. Опрашивайте активных пользователей, не всех.",
    }},
    { type: "miniquiz", position: "middle", data: {
      question: "Какой минимальный % 'Very Disappointed' считается подтверждением Product-Market Fit?",
      options: ["20%", "30%", "40%", "50%"],
      correctIndex: 2,
      explanation: "Шон Эллис установил порог в 40%: если 40%+ пользователей будут 'very disappointed' без продукта — у вас есть PMF. Ниже 40% — продукт нужно дорабатывать.",
    }},
    { type: "table", position: "middle", data: {
      title: "Интерпретация результатов теста Шона Эллиса",
      headers: ["% Very Disappointed", "Статус", "Действие"],
      rows: [
        ["40%+", "Есть PMF", "Масштабировать привлечение"],
        ["25-40%", "Близко к PMF", "Улучшить продукт для целевого сегмента"],
        ["15-25%", "Слабый PMF", "Провести интервью, пересмотреть ценностное предложение"],
        ["<15%", "Нет PMF", "Пивот или серьёзная доработка"],
      ],
      highlight: 0,
    }},
  ],
  "m12-l3": [
    { type: "callout", position: "middle", data: { type: "tip", text: "Негативные обращения в саппорте — золотая жила инсайтов. Систематизируйте их: частота × эмоция = приоритет для продукта." } },
    { type: "dialog", position: "middle", data: {
      title: "Обращение в саппорт → инсайт для продукта",
      messages: [
        { role: "respondent", name: "Клиент", text: "Ваше приложение ужасно! Я уже 3-й раз не могу найти кнопку экспорта!!! Верните мне деньги!" },
        { role: "interviewer", name: "PM (анализирует)", text: "Тикет #847. Категория: UX/навигация. Эмоция: гнев (10/10). Частота: 3 раза за месяц от одного пользователя.", note: "Систематизируем: частота × сила эмоции = приоритет" },
        { role: "narrator", text: "За месяц: 23 тикета про кнопку экспорта. Средняя эмоция: 8/10. Решение: переместить кнопку + хоткей. Результат: тикеты упали на 90%." },
      ],
    }},
    { type: "table", position: "after", data: {
      title: "Фреймворк приоритизации обращений в саппорте",
      headers: ["Приоритет", "Частота", "Эмоция", "Действие"],
      rows: [
        ["P0 — Critical", "Ежедневно", "Гнев / отчаяние", "Фиксить в текущем спринте"],
        ["P1 — High", "Еженедельно", "Раздражение", "В следующий спринт"],
        ["P2 — Medium", "Ежемесячно", "Неудобство", "В backlog с RICE-оценкой"],
        ["P3 — Low", "Редко", "Пожелание", "Отслеживать тренд"],
      ],
    }},
  ],
  "m13-l1": [
    { type: "image", position: "before", data: { src: IMG.growth, alt: "Воронка продаж", caption: "Снижение Transaction Cost на каждом шаге воронки = рост конверсии" } },
    { type: "table", position: "middle", data: {
      title: "Этапы воронки и точки снижения TC",
      headers: ["Этап воронки", "Типичный TC", "Как снизить"],
      rows: [
        ["Осведомлённость", "Время на поиск решения", "SEO, контент-маркетинг, referral"],
        ["Интерес", "Усилия на изучение", "Понятный лендинг, видео-демо"],
        ["Рассмотрение", "Сравнение с альтернативами", "Бесплатная пробная версия"],
        ["Конверсия", "Деньги + риск", "Простая оплата, гарантия"],
        ["Удержание", "Усилия на использование", "Онбординг, поддержка, UX"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте этапы воронки в правильном порядке",
      description: "От первого контакта до удержания",
      items: ["Осведомлённость", "Интерес", "Рассмотрение", "Конверсия", "Удержание"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],
  "m13-l2": [
    { type: "image", position: "before", data: { src: IMG.growth, alt: "Возвращаемость клиентов", caption: "Retention — главный индикатор Product-Market Fit" } },
    { type: "callout", position: "middle", data: { type: "info", text: "Возвращаемость клиентов определяется тем, насколько продукт решает реальную потребность. Retention — главный индикатор PMF." } },
    { type: "dialog", position: "middle", data: {
      title: "Кейс: как увеличить Retention на 25%",
      messages: [
        { role: "interviewer", name: "PM", text: "Retention Day 7 упал до 15%. Нам нужно понять, почему пользователи не возвращаются после первого дня.", note: "Day 7 Retention — ключевая метрика для мобильных приложений" },
        { role: "respondent", name: "Аналитик", text: "Данные показывают: 60% пользователей не завершают онбординг. Они уходят на 3-м шаге из 5." },
        { role: "interviewer", name: "PM", text: "Значит проблема не в продукте, а в первом опыте. Предлагаю: сократить онбординг до 2 шагов + добавить 'Aha moment' в первые 30 секунд.", note: "Time to Value: чем быстрее пользователь получит ценность, тем выше retention" },
        { role: "narrator", text: "Результат: Retention D7 вырос с 15% до 23% за 2 спринта" },
      ],
    }},
    { type: "table", position: "after", data: {
      title: "Механики повышения Retention",
      headers: ["Механика", "Эффект", "Пример"],
      rows: [
        ["Habit loops", "+15-30% DAU", "Streak в Duolingo"],
        ["Push-уведомления", "+10-20% return rate", "Напоминание о незавершённом"],
        ["Персонализация", "+20% engagement", "Рекомендации Netflix"],
        ["Гамификация", "+25% time in app", "Бейджи, уровни, рейтинги"],
        ["Сообщество", "+30% retention", "Форумы, чаты, комментарии"],
      ],
    }},
  ],
  "m15-l2": [
    { type: "table", position: "middle", data: {
      title: "Сравнение методов приоритизации",
      headers: ["Метод", "Формула/Подход", "Лучше для", "Сложность"],
      rows: [
        ["RICE", "(Reach×Impact×Confidence)/Effort", "Количественная оценка фич", "Средняя"],
        ["MoSCoW", "Must/Should/Could/Won't", "Быстрая сортировка требований", "Низкая"],
        ["ICE", "Impact×Confidence×Ease", "Быстрая оценка экспериментов", "Низкая"],
        ["Kano", "Базовые/Желаемые/Восторг", "Понимание ожиданий клиента", "Высокая"],
        ["ROI", "(Доход-Расход)/Расход×100%", "Бизнес-обоснование инвестиций", "Средняя"],
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Сопоставьте метод приоритизации с формулой",
      pairs: [
        ["RICE", "(Reach×Impact×Confidence)/Effort"],
        ["MoSCoW", "Must/Should/Could/Won't"],
        ["ICE", "Impact×Confidence×Ease"],
        ["Kano", "Базовые/Желаемые/Восторг"],
        ["ROI", "(Доход-Расход)/Расход×100%"],
      ],
    }},
  ],
  "m16-l2": [
    { type: "image", position: "before", data: { src: IMG.research, alt: "Жизненный цикл рынка", caption: "Жизненный цикл рынка включает множество конкурирующих продуктов" } },
    { type: "table", position: "middle", data: {
      title: "Стадии жизненного цикла рынка",
      headers: ["Стадия", "Количество игроков", "Стратегия PM"],
      rows: [
        ["Зарождение", "1-5 пионеров", "Создавать рынок, образовывать клиентов"],
        ["Рост", "10-50 конкурентов", "Дифференциация, захват доли"],
        ["Зрелость", "5-10 лидеров", "Оптимизация, удержание"],
        ["Консолидация", "2-3 монополиста", "Экосистема, платформа"],
      ],
    }},
    { type: "callout", position: "after", data: { type: "info", text: "Жизненный цикл рынка ≠ жизненный цикл продукта. Рынок может расти, пока ваш продукт стагнирует — значит, вы теряете долю." } },
  ],
  "m16-l4": [
    { type: "table", position: "middle", data: {
      title: "PEST-анализ: факторы внешней среды",
      headers: ["Фактор", "Описание", "Примеры вопросов"],
      rows: [
        ["Political", "Политические", "Регуляция, налоги, стабильность?"],
        ["Economic", "Экономические", "Инфляция, курс валют, покупательная способность?"],
        ["Social", "Социальные", "Демография, тренды, образование?"],
        ["Technological", "Технологические", "Новые технологии, автоматизация, R&D?"],
      ],
    }},
  ],
  "m16-l5": [
    { type: "image", position: "before", data: { src: IMG.analytics, alt: "TAM SAM SOM", caption: "TAM > SAM > SOM — оценка размера рынка" } },
    { type: "calculator", position: "middle", data: {
      title: "Рассчитайте TAM → SAM → SOM",
      description: "Оцените размер рынка для вашего продукта",
      fields: [
        { label: "TAM (весь рынок)", key: "tam", placeholder: "10000", suffix: "млн $" },
        { label: "% доступного сегмента", key: "samPct", placeholder: "15", suffix: "%" },
        { label: "% реально достижимой доли", key: "somPct", placeholder: "5", suffix: "%" },
      ],
      formula: "tam * (samPct/100) * (somPct/100)",
      resultLabel: "SOM (ваш рынок)",
      resultSuffix: " млн $",
      tip: "Инвесторы хотят видеть SOM > $100M. Если меньше — пересмотрите сегмент или географию.",
    }},
    { type: "table", position: "middle", data: {
      title: "TAM, SAM, SOM — уровни оценки рынка",
      headers: ["Уровень", "Расшифровка", "Что считаем", "Пример"],
      rows: [
        ["TAM", "Total Addressable Market", "Весь мировой рынок", "$100B — весь рынок ПО для HR"],
        ["SAM", "Serviceable Addressable Market", "Доступный сегмент", "$10B — SaaS для HR в Европе"],
        ["SOM", "Serviceable Obtainable Market", "Реально достижимая доля", "$100M — наша доля за 3 года"],
      ],
    }},
  ],
  "m17-l1": [
    { type: "image", position: "before", data: { src: IMG.interview, alt: "Глубинное интервью", caption: "Глубинные интервью: понимание опыта, мотиваций и проблем" } },
    { type: "callout", position: "middle", data: { type: "info", text: "5-7 глубинных интервью выявляют 80% паттернов поведения в сегменте. 16 интервью — золотой стандарт для полной картины." } },
    { type: "reveal", position: "after", data: {
      title: "5 типичных ошибок при проведении интервью",
      content: "1. Наводящие вопросы: 'Вам ведь неудобно делать X?' → 'Расскажите, как вы делаете X'\n2. Спрашивать о будущем: 'Вы бы купили?' → 'Как вы решаете сейчас?'\n3. Питчить продукт вместо слушать\n4. Не записывать (полагаться на память)\n5. Не спрашивать 'Почему?' 3+ раза подряд"
    }},
  ],
  "m17-l2": [
    { type: "proscons", position: "middle", data: {
      title: "Опросы vs Интервью",
      pros: ["Масштаб (тысячи ответов)", "Количественные данные", "Быстро обрабатывать", "Дешевле проводить"],
      cons: ["Нет глубины понимания", "Не видно контекста", "Респонденты могут врать", "Не объясняют 'почему'"],
    }},
  ],
  "m17-l3": [
    { type: "image", position: "before", data: { src: IMG.journey, alt: "Customer Journey Map", caption: "CJM: визуализация пути клиента от первого контакта до цели" } },
    { type: "table", position: "middle", data: {
      title: "Компоненты Customer Journey Map",
      headers: ["Этап", "Действия", "Эмоции", "Точки роста"],
      rows: [
        ["Осведомлённость", "Поиск, рекомендации", "Любопытство", "SEO, контент"],
        ["Рассмотрение", "Сравнение, чтение отзывов", "Сомнение", "Социальное доказательство"],
        ["Покупка", "Регистрация, оплата", "Тревога", "Простая оплата, гарантия"],
        ["Использование", "Онбординг, core flow", "Aha! или Разочарование", "Time to Value"],
        ["Лояльность", "Рекомендация, повторная покупка", "Удовлетворение", "Referral программа"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте этапы Customer Journey",
      items: ["Осведомлённость", "Рассмотрение", "Покупка", "Использование", "Лояльность"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],
  "m17-l4": [
    { type: "table", position: "middle", data: {
      title: "HADI-цикл: структура проверки гипотез",
      headers: ["Этап", "Что делаем", "Результат"],
      rows: [
        ["Hypothesis", "Формулируем гипотезу", "Если [действие], то [метрика] изменится на [значение]"],
        ["Action", "Проводим эксперимент", "A/B тест, MVP, лендинг"],
        ["Data", "Собираем данные", "Метрики, аналитика, обратная связь"],
        ["Insights", "Делаем выводы", "Подтвердили / опровергли / нужно больше данных"],
      ],
    }},
  ],
  "m17-l5": [
    { type: "image", position: "before", data: { src: IMG.metrics, alt: "Продуктовые метрики", caption: "Ключевые метрики: ARPU, LTV, CAC, Retention" } },
    { type: "fillblank", position: "middle", data: {
      title: "Заполните формулы метрик",
      description: "Вспомните ключевые формулы продуктовой аналитики",
      prompt: "LTV = ___ × Lifetime. CAC = Marketing Cost ÷ ___. Здоровый бизнес: LTV/CAC > ___.",
      blanks: [
        { answer: "ARPU", hint: "средний доход", accept: ["arpu", "Arpu"] },
        { answer: "New Users", hint: "новые...", accept: ["новые пользователи", "клиенты", "New Clients", "users"] },
        { answer: "3", hint: "число", accept: ["три"] },
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Ключевые продуктовые метрики",
      headers: ["Метрика", "Формула", "Что показывает"],
      rows: [
        ["ARPU", "Revenue / Users", "Средний доход с пользователя"],
        ["LTV", "ARPU × Lifetime", "Пожизненная ценность клиента"],
        ["CAC", "Marketing Cost / New Users", "Стоимость привлечения"],
        ["LTV/CAC", "LTV ÷ CAC", "Здоровье бизнес-модели (>3 = хорошо)"],
        ["Retention", "Returning / Total × 100%", "Возвращаемость пользователей"],
        ["Churn", "Lost / Total × 100%", "Отток пользователей"],
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Сопоставьте метрику с её формулой",
      pairs: [
        ["ARPU", "Revenue / Users"],
        ["LTV", "ARPU × Lifetime"],
        ["CAC", "Marketing Cost / New Users"],
        ["LTV/CAC", "Здоровье бизнес-модели (>3)"],
        ["Retention", "Returning / Total × 100%"],
      ],
    }},
  ],
  "m17-l6": [
    { type: "image", position: "before", data: { src: IMG.prototype, alt: "MVP продукт", caption: "MVP: минимально жизнеспособный продукт для проверки гипотезы" } },
    { type: "proscons", position: "middle", data: {
      title: "MVP vs MLP (Minimum Lovable Product)",
      pros: ["MVP: быстро и дёшево", "MVP: проверить гипотезу", "MLP: wow-эффект", "MLP: первые адвокаты бренда"],
      cons: ["MVP: может оттолкнуть UX", "MVP: трудно отличить от плохого продукта", "MLP: дороже и дольше", "MLP: риск перфекционизма"],
    }},
  ],
  "m18-l1": [
    { type: "image", position: "before", data: { src: IMG.wireframe, alt: "Прототипирование", caption: "Прототип — модель для тестирования идей до разработки" } },
    { type: "scenario", position: "middle", data: {
      title: "Выбор уровня прототипа",
      situation: "CEO хочет показать инвесторам новую фичу через 3 дня. У вас нет дизайнера. Фича сложная — 8 экранов. Какой прототип делаете?",
      choices: [
        { text: "Hi-fi в Figma — нужно впечатлить инвесторов", outcome: "Не успеваете за 3 дня. CEO показывает полуготовый прототип, инвесторы видят баги в дизайне. Плохое впечатление.", isOptimal: false },
        { text: "Low-fi wireframe в Miro + рассказ словами", outcome: "Готово за 4 часа! CEO показывает логику фичи, инвесторы задают вопросы по бизнесу, а не по дизайну. Фокус на ценности!", isOptimal: true, explanation: "Low-fi быстрее, дешевле и фокусирует внимание на логике, а не на визуале." },
        { text: "Код-прототип на React за 3 дня", outcome: "Рабочий, но кривой. Инвесторы думают что это финальный продукт и оценивают качество кода. Ожидания не совпадают.", isOptimal: false },
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Уровни точности прототипов",
      headers: ["Уровень", "Описание", "Инструменты", "Когда использовать"],
      rows: [
        ["Low-fi", "Бумажные скетчи, wireframe", "Бумага, Balsamiq", "Ранние идеи"],
        ["Mid-fi", "Кликабельный wireframe", "Figma, Axure", "Проверка User Flow"],
        ["Hi-fi", "Дизайн, близкий к финальному", "Figma, Sketch", "UX-тестирование"],
        ["Код-прототип", "Рабочий код с ограничениями", "React, HTML/CSS", "Технические эксперименты"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте уровни прототипов от простого к сложному",
      items: ["Бумажные скетчи (Low-fi)", "Кликабельный wireframe (Mid-fi)", "Дизайн, близкий к финальному (Hi-fi)", "Рабочий код-прототип"],
      correctOrder: [0, 1, 2, 3],
    }},
  ],
  "m18-l2": [
    { type: "image", position: "before", data: { src: IMG.ux, alt: "User Flow дизайн", caption: "User Flow: визуализация пути пользователя в продукте" } },
    { type: "table", position: "middle", data: {
      title: "3 вида User Flow",
      headers: ["Вид", "Описание", "Когда использовать"],
      rows: [
        ["Линейный", "Один путь от A до B", "Онбординг, оплата, регистрация"],
        ["Древовидный", "Ветвления и выборы", "Навигация, настройки, фильтры"],
        ["Циклический", "Повторяющиеся действия", "Лента новостей, почта, чат"],
      ],
    }},
  ],
  "m18-l3": [
    { type: "image", position: "before", data: { src: IMG.prototype, alt: "UX/UI дизайн", caption: "UX — удобство, UI — визуальная привлекательность" } },
    { type: "proscons", position: "middle", data: {
      title: "UX-first vs UI-first подход",
      pros: ["UX-first: решает реальные проблемы", "UX-first: экономит переделки", "UX-first: основан на данных", "UX-first: лучше retention"],
      cons: ["UI-first: визуально впечатляет", "UI-first: быстрее для демо", "UI-first: может скрыть проблемы UX", "UI-first: дорогие правки позже"],
    }},
  ],
  "m18c-l1": [
    { type: "image", position: "before", data: { src: IMG.aitools, alt: "AI инструменты для PM", caption: "AI-инструменты ускоряют работу продакт-менеджера" } },
    { type: "scenario", position: "middle", data: {
      title: "AI для PM: что автоматизировать первым?",
      situation: "У вас 10 часо�� рутины в неделю: 3ч на написание ТЗ, 2ч на транскрипцию интервью, 2ч на отчёты для CEO, 3ч на разбор тикетов саппорта. Бюджет на AI-инструменты: $100/мес. Что автоматизируете?",
      choices: [
        { text: "Транскрипцию интервью (Otter.ai / Dovetail AI)", outcome: "Экономите 2ч/нед, но эти 2 часа легко делегировать ассистенту. ROI средний.", isOptimal: false },
        { text: "Написание ТЗ через ChatGPT/Claude (3ч → 0.5ч)", outcome: "Экономите 2.5ч/нед! AI генерирует User Story, AC, edge cases за минуты. Вы редактируете, а не пишете с нуля. Максимальный ROI!", isOptimal: true, explanation: "Генерация текстов — лучший use case для LLM. 85% экономии времени на задаче, которую нельзя делегировать." },
        { text: "Разбор тикетов (Intercom AI / классификация)", outcome: "Хорошо для масштаба (1000+ тикетов), но при вашем объёме — overkill. Сложная настройка не окупится.", isOptimal: false },
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "AI-инструменты для продакт-менеджера",
      headers: ["Задача", "Инструмент", "Что делает"],
      rows: [
        ["Генерация текстов", "ChatGPT, Claude", "User Story, ТЗ, описания фич"],
        ["Аналитика UX", "Hotjar AI", "Тепловые карты, Session Recording"],
        ["Исследования", "Dovetail AI", "Транскрипция и анализ интервью"],
        ["A/B тесты", "Optimizely", "Автоматический анализ экспериментов"],
        ["Дизайн", "Midjourney, DALL-E", "Генерация мокапов и UI-концептов"],
      ],
    }},
  ],
  "m18c-l2": [
    { type: "image", position: "before", data: { src: IMG.wireframe, alt: "Miro и Figma", caption: "Miro для совместной работы, Figma для UX/UI-дизайна" } },
    { type: "matching", position: "after", data: {
      title: "Соедините инструмент с задачей PM",
      pairs: [
        ["Miro", "Воркшопы, CJM, brainstorm"],
        ["Figma", "Прототипы, UI-дизайн, handoff"],
        ["Notion", "PRD, wiki, база знаний"],
        ["Jira / Linear", "Задачи, спринты, backlog"],
        ["Amplitude", "Продуктовая аналитика"],
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Не гонитесь за количеством инструментов. Лучший стек — минимальный. Notion + Figma + Jira покрывает 90% потребностей PM." } },
  ],
  "m18c-l5": [
    { type: "table", position: "middle", data: {
      title: "Технические навыки для PM",
      headers: ["Навык", "Зачем PM", "Уровень глубины"],
      rows: [
        ["SQL", "Самостоятельно доставать данные", "SELECT, JOIN, GROUP BY"],
        ["REST API", "Понимать архитектуру продукта", "Endpoint, запрос, ответ"],
        ["Git", "Работать с разработчиками", "Понимать branch, PR, merge"],
        ["A/B тесты", "Настраивать эксперименты", "Статзначимость, выборка"],
        ["Аналитика", "Читать дашборды", "GA, Amplitude, Mixpanel"],
      ],
    }},
  ],
  "m18c-l3": [
    { type: "image", position: "before", data: { src: IMG.kanban, alt: "Таск-трекеры", caption: "Jira, Linear, Asana — выбор зависит от размера команды" } },
    { type: "proscons", position: "middle", data: {
      title: "Jira vs Linear vs Asana",
      pros: ["Jira: максимальная гибкость и интеграции", "Linear: скорость и минимализм", "Asana: визуальность и простота"],
      cons: ["Jira: перегружен для маленьких команд", "Linear: меньше интеграций", "Asana: слабее для разработки"],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Правило: выбирайте инструмент по размеру команды. <10 человек — Linear. 10-50 — Jira. Кросс-функциональные проекты — Asana." } },
  ],
  "m18c-l4": [
    { type: "image", position: "before", data: { src: IMG.analytics, alt: "Сервисы аналитики", caption: "GA4, Amplitude, Mixpanel, Hotjar — каждый для своей задачи" } },
    { type: "table", position: "middle", data: {
      title: "Сравнение сервисов продуктовой аналитики",
      headers: ["Сервис", "Лучше для", "Ключевая фича"],
      rows: [
        ["Google Analytics 4", "Маркетинговая аналитика", "Атрибуция каналов"],
        ["Amplitude", "Продуктовая аналитика", "Retention, funnels, cohorts"],
        ["Mixpanel", "Event-based аналитика", "Пользовательские дашборды"],
        ["Hotjar", "UX-аналитика", "Тепловые карты, session recording"],
        ["FullStory", "Баг-репорты + UX", "Error tracking + replay"],
      ],
    }},
  ],
  "m18d-l2": [
    { type: "image", position: "before", data: { src: IMG.collab, alt: "Сбор команды", caption: "PM не нанимает напрямую, но влияет на культуру и состав" } },
    { type: "dialog", position: "middle", data: {
      title: "PM на собеседовании разработчика",
      messages: [
        { role: "interviewer", name: "PM", text: "Расскажите о ситуации, когда вам пришлось работать с неясными требованиями. Как вы действовали?", note: "PM проверяет: умеет ли кандидат работать в условиях неопределённости" },
        { role: "respondent", name: "Кандидат", text: "На прошлом проекте PM дал мне одну строчку описания. Я сам провёл 3 созвона с клиентами, нарисовал wireframe и согласовал с командой." },
        { role: "interviewer", name: "PM", text: "Отличный ответ. Это именно тот mindset, который нам нужен — ownership.", note: "Красный флаг: 'Я ждал, пока менеджер уточнит задачу'" },
      ],
    }},
  ],
  "m18d-l3": [
    { type: "image", position: "before", data: { src: IMG.strategy, alt: "Постановка задач", caption: "Правильная постановка задачи = 50% результата" } },
    { type: "reveal", position: "middle", data: {
      title: "Шаблон User Story + Acceptance Criteria",
      content: "User Story:\nКак [роль пользователя],\nЯ хочу [действие/функция],\nЧтобы [ожидаемый результат]\n\nAcceptance Criteria:\n✓ Given [контекст], When [действие], Then [результат]\n✓ Валидация: [что проверяем]\n✓ Edge cases: [граничные сценарии]\n✓ Performance: [SLA, скорость отклика]\n\nDefinition of Done:\n□ Code review пройден\n□ Unit tests написаны\n□ QA протестировано\n□ Документация обновлена"
    }},
    { type: "callout", position: "after", data: { type: "warning", text: "Никогда не пишите 'Сделать красиво' или 'Улучшить UX'. Каждая задача должна иметь измеримый Acceptance Criteria." } },
  ],
  "m18d-l1": [
    { type: "image", position: "before", data: { src: IMG.leadership, alt: "Работа PM с командой", caption: "PM взаимодействует с 6 типами команд ежедневно" } },
    { type: "table", position: "middle", data: {
      title: "Типы встреч в Scrum",
      headers: ["Встреча", "Цель", "Длительность", "Участники"],
      rows: [
        ["Daily Standup", "Синхронизация", "15 мин", "Команда разработки"],
        ["Sprint Planning", "Планирование спринта", "1-2 часа", "PO + команда"],
        ["Sprint Review", "Демо результатов", "1 час", "Все стейкхолдеры"],
        ["Retrospective", "Улучшение процессов", "1 час", "Команда"],
        ["Backlog Grooming", "Уточнение задач", "1 час", "PO + команда"],
      ],
    }},
  ],
  "m18d-l4": [
    { type: "image", position: "before", data: { src: IMG.collab, alt: "Коммуникация PM", caption: "4 направления коммуникации для продакт-менеджера" } },
    { type: "callout", position: "after", data: { type: "tip", text: "Используйте данные и аналитику для разрешения конфликтов — это минимизирует субъективность и эмоции в дискуссиях." } },
  ],
  "m19-l4": [
    { type: "image", position: "before", data: { src: IMG.leadership, alt: "Формальная коммуникация", caption: "7 форм формальной коммуникации для PM" } },
    { type: "dialog", position: "middle", data: {
      title: "Формальная коммуникация: ставим задачу в Jira",
      messages: [
        { role: "interviewer", name: "PM", text: "Обрати внимание на формат User Story: 'Как [роль], я хочу [действие], чтобы [результат]'. Это не просто шаблон — так мы фиксируем контекст для разработчика.", note: "User Story — универсальный формат задачи" },
        { role: "respondent", name: "Разработчик", text: "Ок, а как понять, когда задача готова? Вот тут описание расплывчатое." },
        { role: "interviewer", name: "PM", text: "Именно для этого есть Acceptance Criteria — чёткий чеклист: что должно работать, что не должно ломаться. Без него задача не идёт в спринт.", note: "AC = Definition of Done для конкретной задачи" },
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините форму коммуникации с инструментом",
      pairs: [
        ["User Story", "Jira / Linear"],
        ["PRD (Product Requirements)", "Google Docs / Notion"],
        ["Roadmap", "ProductBoard / Miro"],
        ["Дейли-стендап", "Slack / Zoom"],
        ["Sprint Review", "Демо + презентация"],
      ],
    }},
  ],

  // === Module 9 missing ===
  "m9-l3": [
    { type: "image", position: "before", data: { src: IMG.ux, alt: "Решенческое интервью", caption: "Решенческое интервью: показываем прототип и собираем реакции" } },
    { type: "dialog", position: "middle", data: {
      title: "Решенческое интервью: тестируем прототип",
      description: "Как ��оказывать решение и не «продавать» его",
      messages: [
        { role: "interviewer", name: "PM", text: "Сейчас я покажу вам прототип. Пожалуйста, думайте вслух — говорите всё, что приходит в голову. Нет правильных и неправильных реакций.", note: "Установка «думать вслух» — ключевая для решенческих интервью" },
        { role: "respondent", name: "Респондент", text: "Хм, я вижу кнопку 'Создать отчёт'... Это для чего? Я думал тут будет сразу дашборд с графиками..." },
        { role: "interviewer", name: "PM", text: "Интересно! А какой результат вы ожидали увидеть сразу?", note: "НЕ объясняем, а спрашиваем — ищем разрыв ожиданий" },
        { role: "respondent", name: "Респондент", text: "Ну, я хочу открыть и сразу видеть, что изменилось за неделю. Без лишних кликов." },
        { role: "interviewer", name: "PM", text: "По шкале 1-10, насколько вы были бы разочарованы, если бы не могли пользоваться этим инструментом?", note: "Тест Шона Эллиса — встраиваем в решенческое интервью" },
      ],
    }},
    { type: "proscons", position: "after", data: {
      title: "Решенческое vs Проблемное интервью",
      pros: ["Проверяем конкре��ное решение", "Видим UX-проблемы вживую", "Собираем WTP (willingness to pay)", "Быстрее итерируем дизайн"],
      cons: ["Нужен прототип (затраты)", "Риск confirmation bias", "Респондент может быть вежлив", "Не заменяет проблемное интервью"],
    }},
  ],

  // === Module 19: Стейкхолдеры ===
  "m19-l1": [
    { type: "image", position: "before", data: { src: IMG.collab, alt: "Стейкхолдеры продукта", caption: "Управление стейкхолдерами — ключевой навык PM" } },
    { type: "table", position: "middle", data: {
      title: "Матрица стейкхолдеров: влияние × интерес",
      headers: ["Тип", "Влияние", "Интерес", "Стратегия"],
      rows: [
        ["CEO / C-Level", "Высокое", "Среднее", "Информировать, согласовывать стратегию"],
        ["Разработчики", "Среднее", "Высокое", "Вовлекать, объяснять контекст"],
        ["Дизайнеры", "Среднее", "Высокое", "Совместные воркшопы"],
        ["Маркетинг", "Среднее", "Среднее", "Синхронизировать запуски"],
        ["Саппорт", "Низкое", "Высокое", "Собирать обратную связь"],
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Правило 1:1 — каждый стейкхолдер с высоким влиянием заслуживает еженедельного 15-минутного созвона. Это дешевле, чем конфликт на Sprint Review." } },
    { type: "matching", position: "after", data: {
      title: "Соедините стейкхолдера со стратегией коммуникации",
      pairs: [
        ["CEO", "Ежемесячный отчёт + стратегические решения"],
        ["Tech Lead", "Еженедельный 1:1 + технические решения"],
        ["Дизайнер", "Совместные воркшопы + Figma"],
        ["Маркетолог", "Синхронизация запусков + messaging"],
        ["Саппорт", "Канал обратной связи + тикеты"],
      ],
    }},
  ],
  "m19-l2": [
    { type: "image", position: "before", data: { src: IMG.leadership, alt: "Управление конфликтами", caption: "Конфликт — не проблема, а сигнал о несовпадении приоритетов" } },
    { type: "dialog", position: "middle", data: {
      title: "Кейс: конфликт PM и Tech Lead",
      description: "Когда бизнес хочет быстрее, а разработка — качественнее",
      messages: [
        { role: "respondent", name: "Tech Lead", text: "Мы НЕ можем выпустить это без рефакторинга. Технический долг растёт, через полгода всё встанет." },
        { role: "interviewer", name: "PM", text: "Я понимаю твои опасения. Давай посмотрим на данные: какой конкретно модуль создаёт наибольший tech debt?", note: "Шаг 1: переводим эмоции в факты" },
        { role: "respondent", name: "Tech Lead", text: "Модуль оплаты. Каждый раз при добавлении нового метода — 2 дня вместо 2 часов." },
        { role: "interviewer", name: "PM", text: "Ок, тогда предложение: в этом спринте выпускаем фичу как есть, а в следующем — 40% ёмкости на рефакторинг модуля оплаты. Зафиксируем в roadmap.", note: "Шаг 2: win-win — бизнес получает скорость, разработка — время на качество" },
        { role: "respondent", name: "Tech Lead", text: "Если зафиксируем письменно и покажем CEO — я согласен." },
        { role: "narrator", text: "Результат: фича вышла вовремя, tech debt сократился на 30% за квартал" },
      ],
    }},
    { type: "callout", position: "after", data: { type: "warning", text: "Никогда не решайте конфликт по email или в общем чате. Всегда 1:1, лично или по видео. Публичный конфликт разрушает доверие." } },
  ],
  "m19-l3": [
    { type: "image", position: "before", data: { src: IMG.strategy, alt: "Аргументация решений", caption: "Данные > мнения. Структурированная аргументация побеждает" } },
    { type: "table", position: "middle", data: {
      title: "Фреймворк аргументации: STAR для PM",
      headers: ["Элемент", "Вопрос", "Пример"],
      rows: [
        ["Situation", "Что происходит?", "Конверсия регистрации упала на 15%"],
        ["Task", "Что нужно решить?", "Вернуть конверсию минимум к прежнему уровню"],
        ["Action", "Что предлагаем?", "Упростить форму: 5 полей → 2 + соцсети"],
        ["Result", "Что ожидаем?", "+20% конверсия, окупится за 1 спринт"],
      ],
    }},
    { type: "reveal", position: "after", data: {
      title: "Шпаргалка: 5 приёмов убедительной аргументации",
      content: "1. Начинайте с проблемы, не с решения — покажите боль\n2. Используйте числа — '15% падение' убедительнее чем 'плохо работает'\n3. Покажите альтернативы — 'мы рассмотрели 3 варианта, вот почему этот лучший'\n4. Назовите риски сами — это повышает доверие\n5. Завершайте конкретным следующим шагом — 'предлагаю начать A/B тест в понедельник'"
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте элементы STAR-аргументации",
      items: ["Situation — описание контекста", "Task — что решаем", "Action — наше предложение", "Result — ожидаемый результат"],
      correctOrder: [0, 1, 2, 3],
    }},
  ],

  // === Module 20: Кейсы ===
  "m20-l1": [
    { type: "image", position: "before", data: { src: IMG.ecommerce, alt: "Ситуационный поиск", caption: "Кейс: ситуационный поиск в e-commerce" } },
    { type: "callout", position: "middle", data: { type: "info", text: "Ситуационный поиск учитывает контекст пользователя: время дня, историю покупок, сезонность. Это снижает TC на поиск товара." } },
    { type: "dialog", position: "after", data: {
      title: "Обсуждение кейса с командой",
      messages: [
        { role: "interviewer", name: "PM", text: "Данные показывают: 60% пользователей ищут одни и те же категории. Если поднимем их в поиске — сократим время до покупки." },
        { role: "respondent", name: "Аналитик", text: "Подтверждаю. Повторный поиск — 3-5 запросов в среднем на одну покупку. Это высокий TC." },
        { role: "interviewer", name: "PM", text: "Предлагаю A/B тест: персонализированная выдача vs текущая. Метрика — время до добавления в корзину.", note: "Всегда формулируйте гипотезу с конкретной метрикой" },
      ],
    }},
  ],
  "m20-l2": [
    { type: "image", position: "before", data: { src: IMG.ecommerce, alt: "Уведомление о скидке", caption: "Push-уведомления: баланс между конверсией и раздражением" } },
    { type: "proscons", position: "middle", data: {
      title: "Push-уведомления о скидках",
      pros: ["Мгновенный рост конверсии", "Персонализация повышает CTR", "Low cost канал", "Возврат неактивных пользователей"],
      cons: ["Раздражение → отписка", "Обесценивание бренда", "Banner blindness", "Сложно найти правильную частоту"],
    }},
    { type: "callout", position: "after", data: { type: "warning", text: "Правило 3-7-30: не более 3 push в неделю, 7 email в месяц, 30% скидка — максимум для сохранения маржи." } },
  ],
  "m20-l3": [
    { type: "callout", position: "middle", data: { type: "info", text: "Уведомление об адресе доставки в момент оформления заказа снижает возвраты на 12-18%. Маленькая деталь — большой эффект на юнит-экономику." } },
    { type: "dialog", position: "after", data: {
      title: "Обсуждение: когда показывать уведомление?",
      messages: [
        { role: "interviewer", name: "PM", text: "У нас 8% возвратов из-за неверного адреса. Предлагаю добавить подтверждение адреса перед оплатой." },
        { role: "respondent", name: "UX-дизайнер", text: "Но это дополнительный шаг! Конверсия чекаута может просесть." },
        { role: "interviewer", name: "PM", text: "Верно. Поэтому делаем smart: показываем подтверждение ТОЛЬКО если адрес менялся или новый. Для повторных заказов — пропускаем.", note: "Снижаем TC для лояльных, проверяем для новых" },
      ],
    }},
  ],
  "m20-l4": [
    { type: "image", position: "before", data: { src: IMG.analytics, alt: "Push-уведомления брошенная корзина", caption: "Брошенная корзина — 70% потенциальных заказов" } },
    { type: "table", position: "middle", data: {
      title: "Стратегия push-цепочки для брошенной корзины",
      headers: ["Время", "Сообщение", "Ожидаемый CTR"],
      rows: [
        ["1 час", "«Вы забыли товары в корзине»", "8-12%"],
        ["24 часа", "«Ваша корзина скоро очистится»", "5-8%"],
        ["72 часа", "«Скидка 10% на товары в корзине»", "3-6%"],
        ["7 дней", "«Похожие товары по лучшей цене»", "1-3%"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте push-уведомления в правильном порядке",
      description: "От первого касания к последнему",
      items: ["Напоминание (1 час)", "Срочность (24 часа)", "Скидка (72 часа)", "Альтернативы (7 дней)"],
      correctOrder: [0, 1, 2, 3],
    }},
  ],
  "m20-l5": [
    { type: "callout", position: "middle", data: { type: "info", text: "Префиксная модель поиска: пользователь вводит 2-3 символа и получает релевантные подсказки. Это снижает количество полных запросов на 40%." } },
    { type: "reveal", position: "after", data: {
      title: "Как построить эффективный autocomplete",
      content: "1. Собирайте топ-1000 запросов → они покрывают 80% поиска\n2. Ранжируйте подсказки по конверсии, а не по частоте\n3. Добавьте категории к подсказкам ('iPhone' → 'iPhone в Электроника')\n4. Показывайте персонализированные подсказки (на основе истории)\n5. Метрика успеха: % кликов по подсказкам vs полный ввод запроса"
    }},
  ],
  "m20-l6": [
    { type: "image", position: "before", data: { src: IMG.ecommerce, alt: "Кейсы e-commerce", caption: "Микро-оптимизации в e-commerce дают кумулятивный эффект" } },
    { type: "dialog", position: "middle", data: {
      title: "Обсуждение: 'Не забудьте купить' виджет",
      messages: [
        { role: "interviewer", name: "PM", text: "Данные показывают: пользователи покупающие кофе в 70% случаев также покупают молоко. Предлагаю виджет 'Часто покупают вместе'." },
        { role: "respondent", name: "Data Analyst", text: "Подтверждаю. Корреляция 0.72 для кофе-молоко, 0.65 для хлеб-масло. Средний чек вырастет на 8-12%." },
        { role: "interviewer", name: "PM", text: "Отлично. Тестируем на 10% трафика, метрика — средний чек и конверсия добавления из виджета.", note: "Cross-sell виджеты: 8-15% прирост среднего чека" },
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Пакеты в роуминге: успех кейса в том, что предложение появляется в МОМЕНТ потребности (перелёт). Контекстное предложение конвертирует в 5-10× лучше." } },
  ],

  // === Module 21: Конфликты и метрики ===
  "m21-l1": [
    { type: "image", position: "before", data: { src: IMG.leadership, alt: "Конфликты между командами", caption: "Системные конфликты решаются процессами, не героизмом" } },
    { type: "dialog", position: "middle", data: {
      title: "Кейс: Маркетинг vs Продукт",
      messages: [
        { role: "respondent", name: "Head of Marketing", text: "Нам нужна эта фича к запуску рекламной кампании через 2 недели! Мы уже оплатили размещение!" },
        { role: "interviewer", name: "PM", text: "Я понимаю deadline. Давайте посмотрим: что конкретно нужно к запуску? Может, MVP за неделю покроет 80% сценариев?", note: "Ищем компромисс через scope, не через deadline" },
        { role: "respondent", name: "Head of Marketing", text: "Ну... если будет работать хотя бы основной flow — наверное достаточно для первой волны." },
        { role: "interviewer", name: "PM", text: "Отлично. Фиксируем: основной flow к запуску, edge cases — через спринт. Я согласую с разработкой.", note: "Win-win: маркетинг получает core, разработка — адекватный scope" },
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините тип конфликта с методом решения",
      pairs: [
        ["Scope creep", "Зафиксировать MVP + backlog"],
        ["Deadline conflict", "Scope negotiation"],
        ["Priority disagreement", "Data-driven RICE scoring"],
        ["Resource contention", "Roadmap alignment meeting"],
        ["Quality vs Speed", "Definition of Done + tech debt budget"],
      ],
    }},
  ],
  "m21-l2": [
    { type: "image", position: "before", data: { src: IMG.metrics, alt: "CPA LTV CAC расчёт", caption: "Юнит-экономика: CPA, LTV, CAC — три числа, которые определяют бизнес" } },
    { type: "table", position: "middle", data: {
      title: "Расчёт юнит-экономики на примере",
      headers: ["Метрика", "Формула", "Пример", "Значение"],
      rows: [
        ["CPA", "Расходы на рекламу / Конверсии", "100,000₽ / 200", "500₽"],
        ["CAC", "Все маркетинг-расходы / Новые клиенты", "300,000₽ / 150", "2,000₽"],
        ["LTV", "ARPU × Lifetime", "500₽ × 12 мес", "6,000₽"],
        ["LTV/CAC", "LTV ÷ CAC", "6,000 ÷ 2,000", "3.0 (хорошо!)"],
        ["Payback", "CAC ÷ ARPU", "2,000 ÷ 500", "4 месяца"],
      ],
      highlight: 3,
    }},
    { type: "callout", position: "after", data: { type: "warning", text: "LTV/CAC < 3 — бизнес не масштабируется. LTV/CAC > 5 — вы недоинвестируете в рост. Оптимум: 3-5×." } },
    { type: "calculator", position: "after", data: {
      title: "Рассчитайте юнит-экономику вашего продукта",
      description: "Введите данные для расчёта LTV/CAC ratio",
      fields: [
        { label: "ARPU (средний доход/мес)", key: "arpu", placeholder: "500", suffix: "₽" },
        { label: "Avg. Lifetime (мес)", key: "lifetime", placeholder: "12" },
        { label: "Marketing расходы/мес", key: "mktg", placeholder: "100000", suffix: "₽" },
        { label: "Новые клиенты/мес", key: "clients", placeholder: "50" },
      ],
      formula: "(arpu * lifetime) / (mktg / clients)",
      resultLabel: "LTV/CAC ratio",
      resultSuffix: "×",
      benchmark: { good: 3, label: "3×+ = здоровая экономика. < 3× = нужна оптимизация." },
      tip: "Если ratio < 3: снижайте CAC (каналы, конверсия) или увеличивайте LTV (retention, upsell, цена).",
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте шаги расчёта юнит-экономики",
      items: ["Определить ARPU (средний доход с пользователя)", "Рассчитать CAC (стоимость привлечения)", "Вычислить LTV (пожизненная ценность)", "Проверить LTV/CAC ratio", "Оптимизировать слабое звено"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],
  "m21-l3": [
    { type: "image", position: "before", data: { src: IMG.growth, alt: "Каналы привлечения", caption: "Анализ каналов: ROI каждого канала определяет распределение бюджета" } },
    { type: "table", position: "middle", data: {
      title: "Сравнение каналов привлечения",
      headers: ["Канал", "CAC", "Скорость", "Масштабируемость"],
      rows: [
        ["SEO / Контент", "Низкий (долгосрочно)", "Медленная (3-6 мес)", "Высокая"],
        ["Контекстная реклама", "Средний", "Быстрая", "Средняя"],
        ["SMM / Таргет", "Средний", "Быстрая", "Средняя"],
        ["Referral", "Очень низкий", "Средняя", "Зависит от продукта"],
        ["Партнёрства", "Переменный", "Средняя", "Ограниченная"],
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Правило 70/20/10: 70% бюджета — на доказанные каналы, 20% — на растущие, 10% — на эксперименты." } },
  ],
  "m21-l4": [
    { type: "image", position: "before", data: { src: IMG.analytics, alt: "Конверсия Churn ROI", caption: "Ключевые метрики роста: конверсия, churn, ARPU, DAU/MAU" } },
    { type: "table", position: "middle", data: {
      title: "Бенчмарки ключевых метрик по индустриям",
      headers: ["Метрика", "SaaS B2B", "E-commerce", "Mobile App"],
      rows: [
        ["Конверсия trial→paid", "2-5%", "—", "—"],
        ["Monthly Churn", "3-7%", "5-10%", "10-20%"],
        ["DAU/MAU", "20-40%", "5-15%", "15-25%"],
        ["NPS", "30-50", "20-40", "20-35"],
        ["Payback период", "12-18 мес", "1-3 мес", "3-6 мес"],
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините метрику со стратегией улучшения",
      pairs: [
        ["Низкая конверсия", "Оптимизация онбординга и CTA"],
        ["Высокий Churn", "Улучшить core value + activation"],
        ["Низкий ARPU", "Upsell, cross-sell, ценовые эксперименты"],
        ["Низкий DAU/MAU", "Push-уведомления, habit loops"],
        ["Низкий NPS", "Собрать фидбек, исправить top-3 боли"],
      ],
    }},
  ],

  // === Module 22: Карьера ===
  "m22-l1": [
    { type: "image", position: "before", data: { src: IMG.career, alt: "Резюме PM", caption: "Резюме продакт-менеджера: структура, которая работает" } },
    { type: "table", position: "middle", data: {
      title: "Структура сильного PM-резюме",
      headers: ["Секция", "Что включить", "Ошибки"],
      rows: [
        ["Заголовок", "Роль + ключевая экспертиза", "Расплывчатое 'PM с опытом'"],
        ["Summary", "3 строки: опыт + метрики + домен", "Более 5 строк, общие фразы"],
        ["Опыт", "STAR: результат с числами", "Описание обязанностей без метрик"],
        ["Навыки", "Hard skills с инструментами", "Soft skills без примеров"],
        ["Образование", "Релевантные курсы и сертификаты", "Школьные достижения"],
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Золотое правило: каждый bullet point в опыте должен содержать число. 'Увеличил конверсию на 23%' > 'Работал над улучшением конверсии'." } },
    { type: "dialog", position: "after", data: {
      title: "Ревью резюме с ментором",
      messages: [
        { role: "respondent", name: "Кандидат", text: "Вот моё резюме. Я написал: 'Отвечал за развитие продукта и работу с клиентами'." },
        { role: "interviewer", name: "Ментор", text: "Это описание обязанностей. Перепиши: 'Провёл 40+ CustDev интервью → выявил 3 новых сегмента → запустил фичу, которая увеличила retention на 18%'.", note: "Формат: Действие → Инсайт → Результат с метрикой" },
        { role: "respondent", name: "Кандидат", text: "Понял! А если у меня нет точных цифр?" },
        { role: "interviewer", name: "Ментор", text: "Используйте 'примерно' или '~'. Лучше '~20% рост' чем вообще без числа. HR поймёт, что вы мыслите метриками.", note: "Приблизительные числа лучше, чем отсутствие метрик" },
      ],
    }},
  ],
  "m22-l2": [
    { type: "image", position: "before", data: { src: IMG.career, alt: "Сопроводительное письмо", caption: "Cover letter: 3 абзаца, которые увеличат шансы на интервью" } },
    { type: "reveal", position: "middle", data: {
      title: "Шаблон сопроводительного письма для PM",
      content: "Абзац 1: Почему эта компания? (покажите research)\n'Я слежу за [компания] с момента запуска [продукт]. Особенно впечатлил [конкретная фича/решение] — видно глубокое понимание [сегмент].'\n\nАбзац 2: Почему я? (STAR с метриками)\n'В [компания] я решил похожую задачу: [проблема] → провёл [исследование] → запустил [решение] → результат [+X% метрика].'\n\nАбзац 3: Call to action\n'Буду рад обсудить, как мой опыт в [область] может помочь [компания] в [конкретная задача]. Доступен для звонка в удобное время.'"
    }},
    { type: "callout", position: "after", data: { type: "warning", text: "Частая ошибка: 'Я хочу работать в вашей компании потому что она крутая'. Компания хочет знать, что ВЫ дадите ИМ, а не наоборот." } },
  ],
  "m22-l3": [
    { type: "image", position: "before", data: { src: IMG.strategy, alt: "Подготовка к интервью PM", caption: "Подготовка к PM-интервью: фреймворки, кейсы, метрики" } },
    { type: "table", position: "middle", data: {
      title: "Типы PM-интервью и подготовка",
      headers: ["Тип", "Что проверяют", "Как готовиться"],
      rows: [
        ["Product Sense", "Эмпатия, понимание пользователя", "Практика JTBD-анализа, CJM"],
        ["Analytical", "Работа с данными, метрики", "SQL, расчёт юнит-экономики"],
        ["Execution", "Приоритизация, delivery", "RICE, Sprint Planning, roadmap"],
        ["Strategy", "Видение, рыночный анализ", "TAM/SAM/SOM, SWOT, Porter"],
        ["Behavioral", "Лидерство, конфликты", "STAR-формат ответов"],
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте этапы подготовки к PM-интервью",
      items: ["Изучить компанию и продукт", "Подготовить STAR-истории", "Отработать product sense кейсы", "Повторить метрики и формулы", "Провести mock-интервью"],
      correctOrder: [0, 1, 2, 3, 4],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините вопрос на интервью с фреймворком ответа",
      pairs: [
        ["Как бы вы улучшили X?", "JTBD → проблемы → решения"],
        ["Как вы приоритизируете?", "RICE / ICE scoring"],
        ["Расскажите о конфликте", "STAR формат"],
        ["Оцените рынок Y", "TAM → SAM → SOM"],
        ["Какие метрики отслеживать?", "North Star → вспомогательные"],
      ],
    }},
  ],

  // ===== Module 31: Продуктовая аналитика =====

  "m-analytics-l1": [
    { type: "callout", position: "before", data: { type: "info", text: "Продуктовая аналитика начинается не с дашборда, а с вопроса: «Что именно мы измеряем и почему?» North Star Metric + Metric Tree — это фундамент, на котором строится вся система." } },
    { type: "table", position: "middle", data: {
      title: "North Star Metric: примеры по компаниям",
      headers: ["Компания", "North Star Metric", "Логика"],
      rows: [
        ["Spotify", "Time Spent Listening", "Вовлечённость = удержание = подписки"],
        ["Airbnb", "Nights Booked", "Ценность для гостя и хозяина одновременно"],
        ["Slack", "Messages Sent per Active Team", "Коммуникация = ценность = retention"],
        ["Duolingo", "Daily Active Learners", "Ежедневная привычка = retention"],
        ["Notion", "Documents Created per User", "Создание = вовлечённость = платный барьер"],
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "AARRR vs HEART vs PULSE: когда какой фреймворк",
      headers: ["Фреймворк", "Главный вопрос", "Когда использовать"],
      rows: [
        ["AARRR (Pirate Metrics)", "Где теряем пользователей?", "Стартап, growth-стадия, поиск узкого места"],
        ["HEART (Google)", "Насколько хорош UX?", "Редизайн, зрелый продукт, измерение качества"],
        ["PULSE", "Работает ли сервис?", "B2B SaaS с SLA, enterprise, надёжность = ценность"],
      ],
    }},
    { type: "matching", position: "middle", data: {
      title: "Соедините метрику с её уровнем в Metric Tree",
      pairs: [
        ["Completed Sessions per Week (фитнес-app)", "Уровень 0: North Star Metric"],
        ["Active Users Who Completed ≥1 Session", "Уровень 1: Driver Metric"],
        ["Onboarding Completion Rate", "Уровень 2: Input Metric"],
        ["% пользователей, открывших app в первые 24ч", "Уровень 3: Leading Indicator"],
        ["Monthly Revenue", "Output-метрика (следствие NSM, не NSM)"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "CEO говорит: «Наша NSM — это Revenue»",
      situation: "На стратегической сессии CEO предлагает сделать Monthly Revenue главной North Star Metric. «Мы бизнес, деньги — это главное». Ваша позиция как PM?",
      choices: [
        { text: "Соглашаюсь — CEO всегда прав, revenue важен", outcome: "Команда начинает оптимизировать цену и условия оплаты вместо ценности. Retention падает, через квартал revenue тоже.", isOptimal: false, explanation: "Revenue — Output метрика. Команда не может напрямую влиять на неё. Нужна метрика ценности для пользователя." },
        { text: "Предлагаю альтернативу: Revenue — это Output. Нужна метрика ценности, которая к нему ведёт", outcome: "CEO соглашается рассмотреть «Weekly Active Teams» как NSM. Revenue становится ключевым Output показателем. Метрики разделены по уровням.", isOptimal: true, explanation: "NSM — это то, что команда может двигать действиями. Revenue следует за ценностью, а не наоборот." },
        { text: "Предлагаю использовать сразу 10 KPI", outcome: "10 KPI — это 0 фокуса. Команда не знает приоритетов, каждый отдел тянет в свою сторону.", isOptimal: false, explanation: "NSM должна быть одна. Больше метрик = размытый фокус = никто ни за что не отвечает." },
      ],
    }},
  ],

  "m-analytics-l2": [
    { type: "matching", position: "middle", data: {
      title: "Соедините инструмент с его главной суперсилой",
      pairs: [
        ["Mixpanel", "Лучшие воронки и Sankey-пути пользователей"],
        ["Amplitude Compass", "Автоматический поиск Aha-moment через корреляции"],
        ["PostHog", "Open-source, self-hosted, Feature Flags + Analytics"],
        ["Яндекс.Метрика", "Вебвизор — бесплатный Session Replay с тепловыми картами"],
        ["Segment", "CDP: один трекинг — данные в 10+ систем одновременно"],
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Слои современного Data Stack",
      headers: ["Слой", "Инструменты", "Задача"],
      rows: [
        ["1. Sources", "iOS SDK, Web JS, Backend API, CRM", "Генерация событий из всех источников"],
        ["2. CDP / Ingestion", "Segment, mParticle", "Унификация и маршрутизация событий"],
        ["3. Data Warehouse", "BigQuery, Snowflake, ClickHouse", "Хранение сырых и исторических данных"],
        ["4. Transformation", "dbt (data build tool)", "SQL-модели: сырые данные → аналитические таблицы"],
        ["5. BI / Visualization", "Looker, Metabase, Superset", "Дашборды и отчёты для команды"],
        ["Параллельно", "Mixpanel, Amplitude", "Real-time продуктовая аналитика"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "Выберите аналитический стек для стартапа",
      situation: "Вы PM в стартапе (B2C мобильное приложение, 15k MAU, команда 8 человек, офис в Москве). Бюджет на аналитику: $100/мес. Нужно понимать воронку онбординга и источники трафика. Что выбираете?",
      choices: [
        { text: "Amplitude Pro + GA4 + Segment", outcome: "Amplitude Pro от $61/мес, Segment ещё $120/мес. Итого $181/мес — превышает бюджет. Возможности избыточны для 15k MAU.", isOptimal: false, explanation: "Перерасход бюджета и избыточная сложность для текущего масштаба." },
        { text: "Amplitude (бесплатный до 50k MAU) + Яндекс.Метрика", outcome: "Amplitude бесплатно до 50k MAU — покрывает продуктовую аналитику. Яндекс.Метрика бесплатно — источники трафика и Вебвизор. $0/мес!", isOptimal: true, explanation: "Оптимальный стек для российского стартапа. Amplitude free tier + Яндекс.Метрика = 100% закрытых задач за $0." },
        { text: "Только Google Analytics 4", outcome: "GA4 бесплатен, но плохо подходит для продуктовой аналитики. Воронки и когорты слабее — реальный путь пользователя в приложении не увидите.", isOptimal: false, explanation: "GA4 — маркетинговый инструмент, не продуктовый. Для мобильного приложения нужен event-based инструмент." },
      ],
    }},
  ],

  "m-analytics-l3": [
    { type: "callout", position: "before", data: { type: "tip", text: "Откройте demo.mixpanel.com — там реальный демо-проект с данными. Весь урок можно проходить параллельно с практикой в демо-среде." } },
    { type: "dragsort", position: "middle", data: {
      title: "Расставьте шаги построения воронки (Funnel) в Mixpanel",
      description: "Правильный порядок создания Funnel-отчёта",
      items: [
        "Reports → Funnels → + Create",
        "Добавить шаги через «Add Step»",
        "Настроить Conversion Window",
        "Выбрать Ordered или Unordered",
        "Breakdown → найти сегмент с drop-off",
        "Кликнуть на шаг → Show Users",
      ],
      correctOrder: [0, 1, 2, 3, 4, 5],
    }},
    { type: "scenario", position: "after", data: {
      title: "PM разбирает воронку: конверсия упала на 30%",
      situation: "Воронка: Sign Up → Create Project → Invite Team → First Payment. Конверсия Sign Up→Create Project упала с 68% до 41% за 2 недели. Деплой был 15 дней назад. Ваши первые действия?",
      choices: [
        { text: "Немедленно откатываю деплой", outcome: "Без диагностики откат может сломать другие фичи. Причина может быть в изменении аудитории, а не в коде.", isOptimal: false, explanation: "Откат без данных — хаотичное действие. Сначала нужно локализовать причину через аналитику." },
        { text: "Разбиваю воронку по платформам, смотрю Flows, открываю Session Replay", outcome: "iOS — 65% (норма), Web — 12% (катастрофа). Flows: Web-пользователи попадают на пустой экран. Session Replay: кнопка Create Project не видна на Safari. Баг найден за 30 минут!", isOptimal: true, explanation: "Сегментация (iOS/Web) → Flows → Session Replay. Три шага и баг найден без единственного отката." },
        { text: "Провожу опрос пользователей", outcome: "Опрос займёт 3-5 дней. За это время тысячи пользователей упадут с воронки. При критическом drop-off нужны количественные инструменты.", isOptimal: false, explanation: "При резком падении нужна мгновенная диагностика через сегментацию и Flows, а не медленные опросы." },
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините отчёт Mixpanel с его задачей",
      pairs: [
        ["Insights", "Тренды метрик во времени: DAU, события, динамика"],
        ["Funnels", "Конверсия через последовательность шагов"],
        ["Retention", "Процент пользователей, вернувшихся через N дней"],
        ["Flows (Sankey)", "Пути ДО и ПОСЛЕ конкретного события"],
        ["Users", "История событий конкретного пользователя"],
      ],
    }},
  ],

  "m-analytics-l4": [
    { type: "callout", position: "before", data: { type: "info", text: "Amplitude — единственный инструмент с Compass: он автоматически ищет корреляции между событиями и retention. Это экономит PM недели ручного анализа." } },
    { type: "table", position: "middle", data: {
      title: "Mixpanel vs Amplitude: когда что выбирать",
      headers: ["Задача", "Mixpanel", "Amplitude"],
      rows: [
        ["Сложные воронки с бранчингом", "Лучший", "Средний"],
        ["Автоматический Aha-moment (Compass)", "Нет", "Уникально"],
        ["Sankey-диаграммы путей (Flows)", "Лучший", "Средний"],
        ["Поведенческие когорты в CRM", "Ограничено", "Лучший"],
        ["Встроенные A/B-тесты", "Нет", "Amplitude Experiment"],
        ["Session Replay", "Нет", "Есть"],
        ["Бесплатный tier", "20M событий/мес", "50k MAU"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "Compass нашёл корреляцию: что делать дальше?",
      situation: "Amplitude Compass: пользователи, создавшие «Первый отчёт» в первые 48 часов — Day-30 retention 71% vs 9% у остальных. Correlation Score: 0.91. Ваши действия?",
      choices: [
        { text: "Форсирую создание отчёта у всех новых пользователей попапом", outcome: "Принудительные попапы раздражают пользователей с другой целью. Retention не улучшается, жалобы растут.", isOptimal: false, explanation: "Форсирование без понимания контекста — классическая ошибка. Корреляция не равна причинности." },
        { text: "Проверяю гипотезу через A/B-тест: это Aha-moment или самоотбор активных пользователей?", outcome: "A/B-тест: группа А с онбордингом через отчёт — retention 58%, группа Б без — 34%. Это реальный Aha-moment! Масштабируем.", isOptimal: true, explanation: "Compass дал гипотезу → A/B-тест проверил причинность → данные подтверждены → масштабируем. Правильный workflow." },
        { text: "Добавляю «Создать отчёт» в онбординг без тестирования", outcome: "Без A/B-теста вы не знаете, работает ли это. Если корреляция — случайность, вы усложнили онбординг без пользы.", isOptimal: false, explanation: "Любое изменение на основе корреляции без теста — это ставка, а не решение." },
      ],
    }},
  ],

  "m-analytics-l5": [
    { type: "callout", position: "before", data: { type: "warning", text: "80% проблем с аналитикой — это плохая taxonomy. Правильная архитектура событий экономит месяцы работы и тысячи долларов. Это фундамент всей аналитической инфраструктуры." } },
    { type: "matching", position: "middle", data: {
      title: "Исправьте плохие названия событий на Object-Action",
      pairs: [
        ["click_buy_btn", "Purchase Completed"],
        ["userLogin", "Session Started"],
        ["form_submit_123", "Onboarding Step Completed"],
        ["video_start", "Video Played"],
        ["delete_account_action", "Account Deleted"],
      ],
    }},
    { type: "fillblank", position: "middle", data: {
      title: "Заполните трекинг-план для SaaS-продукта",
      description: "Используйте Object-Action конвенцию в прошедшем времени",
      prompt: "Пользователь зарегистрировался — событие: ___. Завершил онбординг — событие: ___. Оплатил подписку — событие: ___. Пригласил коллегу — событие: ___.",
      blanks: [
        { answer: "Account Created", hint: "Object-Action: аккаунт...", accept: ["account created", "user registered", "signup completed"] },
        { answer: "Onboarding Completed", hint: "Object-Action: онбординг...", accept: ["onboarding completed", "onboarding finished"] },
        { answer: "Subscription Started", hint: "Object-Action: подписка...", accept: ["subscription started", "payment completed", "purchase completed"] },
        { answer: "Team Member Invited", hint: "Object-Action: участник...", accept: ["team member invited", "invite sent", "user invited"] },
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "Taxonomy сломалась: три названия для одного события",
      situation: "Разработчик трекал «купить» для веб-версии и «buy_click» для iOS. Аналитик создал отчёт по «Purchase». В Mixpanel три разных события — ни одно не показывает полной картины. Retention считается неверно. Как предотвратить это?",
      choices: [
        { text: "Запретить разработчикам добавлять собы��ия без согласования", outcome: "Замедляет разработку, создаёт бюрократию. Хорошая идея, но недостаточная без системы.", isOptimal: false, explanation: "Запрет без системы — борьба с симптомом. Нужна структурная защита: трекинг-план." },
        { text: "Создать трекинг-план: таблица всех событий с именем, триггером, платформой и owner", outcome: "PM пишет Event Spec → аналитик ревьюит → разработчик реализует → QA проверяет. За 6 месяцев — 0 конфликтов имён, данные надёжны.", isOptimal: true, explanation: "Трекинг-план — организационный контракт команды. Предотвращает 90% taxonomy-проблем на этапе проектирования." },
        { text: "Попросить аналитика вручную объединять события в отчётах", outcome: "Работает краткосрочно, но при 50+ событиях ручное объединение займёт дни и будет содержать ошибки.", isOptimal: false, explanation: "Ручная работа не масштабируется. Нужна системная защита на этапе добавления событий." },
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Правильный процесс добавления нового события в трекинг-план",
      description: "Расставьте шаги в правильном порядке",
      items: [
        "PM описывает бизнес-цель события и пишет Event Spec",
        "Аналитик ревьюит название и свойства в трекинг-плане",
        "Разработчик реализует трекинг по спеке",
        "QA проверяет: событие отправляется в нужный момент",
        "PM валидирует данные в дашборде Mixpanel/Amplitude",
      ],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],

  "m-analytics-l6": [
    { type: "callout", position: "before", data: { type: "info", text: "Growth Accounting — это рентген вашего MAU. DAU растёт на 5%? Это может быть Quick Ratio 0.8 с огромным churnom — или Quick Ratio 4 с минимальным churnom. Это разные продукты с разными стратегиями." } },
    { type: "calculator", position: "middle", data: {
      title: "Рассчитайте потери в воронке онбординга",
      description: "Введите количество пользователей на каждом шаге воронки",
      fields: [
        { label: "Шаг 1: Зарегистрировались", key: "s1", placeholder: "1000" },
        { label: "Шаг 2: Заполнили профиль", key: "s2", placeholder: "720" },
        { label: "Шаг 3: Создали первый объект", key: "s3", placeholder: "310" },
        { label: "Шаг 4: Пригласили коллегу", key: "s4", placeholder: "180" },
        { label: "Шаг 5: Оплатили (LTV $120)", key: "s5", placeholder: "85" },
      ],
      formula: "s5 / s1 * 100",
      resultLabel: "% конверсии S1→S5",
      insight: "При 1000 входящих и 85 оплативших при LTV $120 = $110,700 упущено. Это ваш приоритет для оптимизации.",
    }},
    { type: "table", position: "middle", data: {
      title: "Growth Accounting: компоненты изменения MAU",
      headers: ["Компонент", "Определение", "Сигнал"],
      rows: [
        ["New", "Первый раз активны в этом месяце", "Качество привлечения"],
        ["Retained", "Активны и в прошлом, и в этом месяце", "Ядро продукта"],
        ["Resurrected", "Вернулись после ≥1 месяца отсутствия", "Реактивация"],
        ["Churned", "Активны в прошлом месяце, нет в этом", "Проблема retention"],
        ["Quick Ratio", "(New + Resurrected) / Churned", "> 4 = отлично, < 1 = тонем"],
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Модели атрибуции: сравнение",
      headers: ["Модель", "Логика", "Проблема"],
      rows: [
        ["First Touch", "100% заслуги → первому касанию", "Игнорирует всё до конверсии"],
        ["Last Touch", "100% заслуги → последнему касанию", "Завышает роль ретаргетинга"],
        ["Linear", "Заслуга равномерно по всем касаниям", "Не отражает реальный вес"],
        ["Time Decay", "Больший вес → ближайшим к конверсии", "Недооценивает awareness-каналы"],
        ["Data-Driven", "ML-модель на реальных путях", "Требует большого объёма данных"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "Retention floor исчез + Quick Ratio < 1",
      situation: "Новый B2C продукт, 3 месяца на рынке. Retention: Day 1=45%, Day 7=18%, Day 14=8%, Day 30=2%, Day 60=0%. Quick Ratio = 0.7. Инвестор спрашивает: 'Как дела с retention?'",
      choices: [
        { text: "Говорю: 'Day 1 retention отличный — 45%!' и не упоминаю Quick Ratio", outcome: "Инвестор сам видит полную картину. Вы теряете доверие: очевидно пытаетесь скрыть проблему.", isOptimal: false, explanation: "Retention без floor + Quick Ratio < 1 — двойной красный флаг. Честность с данными критична." },
        { text: "Честно: нет retention floor, Quick Ratio 0.7 = тонем. Вот план: 10 глубоких интервью + пивот онбординга", outcome: "Инвестор ценит честность и конкретный план. Вы получаете 8 недель на пивот и транш на исследование.", isOptimal: true, explanation: "Retention floor = 0% — диагноз, не приговор. Quick Ratio < 1 — тонем. Нужно исследовать ПОЧЕМУ пользователи не возвращаются." },
        { text: "Добавляю push-уведомления, чтобы вернуть пользователей", outcome: "Push без ценности — спам. DAU растёт на неделю, потом падает ещё ниже из-за отписок. Quick Ratio ухудшается.", isOptimal: false, explanation: "Retention — следствие ценности продукта. Quick Ratio < 1 лечится только исправлением продукта, не маркетингом." },
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Соедините паттерн с его интерпретацией",
      pairs: [
        ["Quick Ratio = 0.7", "Churned > (New + Resurrected) — продукт теряет пользователей"],
        ["L28 = 28", "Ежедневный пользователь — максимальная вовлечённость"],
        ["L28 = 4", "Еженедельный паттерн (~4 дня из 28)"],
        ["Retention-кривая стабилизируется на 12%", "Retention floor — лояльное ядро, PMF есть"],
        ["Last Touch атрибуция", "Завышает роль ретаргетинга и закрывающих касаний"],
      ],
    }},
  ],

  "m-analytics-l7": [
    { type: "callout", position: "before", data: { type: "info", text: "SQL — это язык, на котором вы разговариваете с данными. Когда Mixpanel не может ответить на нестандартный вопрос, BigQuery + SQL ответит на любой. Это суперсила продуктового аналитика." } },
    { type: "table", position: "middle", data: {
      title: "SQL-паттерны продуктового аналитика: шпаргалка",
      headers: ["Задача", "Ключевой паттерн", "Функция"],
      rows: [
        ["DAU/MAU/WAU", "COUNT(DISTINCT user_id) + DATE_TRUNC", "GROUP BY date"],
        ["Когортный retention", "CTE cohorts + CTE activity + FIRST_VALUE OVER", "Window Function"],
        ["Воронка конверсии", "MAX(CASE WHEN event_name=X THEN 1 ELSE 0 END)", "Event Pivoting"],
        ["L28 метрика", "COUNT(DISTINCT DATE(event_time)) за 28 дней", "DISTINCT DATE"],
        ["Growth Accounting", "FULL OUTER JOIN трёх CTE по месяцам", "Set operations"],
        ["Время между событиями", "LAG(event_time) OVER (PARTITION BY user_id)", "Window Function"],
        ["Сегментация квантилями", "NTILE(4) OVER (ORDER BY metric DESC)", "Window Function"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "PM просит нестандартный отчёт: Mixpanel не справляется",
      situation: "Инвестор просит: «Покажи LTV пользователей из Telegram, оплативших в первые 3 дня, разбитый по когортам регистрации за последние 6 месяцев». Mixpanel не может объединить эти источники данных. Что делаете?",
      choices: [
        { text: "Говорю: «Mixpanel такого не умеет, нужно ждать»", outcome: "Инвестор теряет доверие. Базовый аналитический запрос занял бы 30 минут в BigQuery.", isOptimal: false, explanation: "Любой нестандартный кросс-системный вопрос — это задача для SQL в Data Warehouse, не для Mixpanel." },
        { text: "Открываю BigQuery, пишу SQL с JOIN событий из трекинга, платежей и utm_parameters", outcome: "За 45 минут — готовый отчёт: LTV по 6 когортам с разбивкой. Telegram-когорты показывают LTV в 2.3x выше среднего.", isOptimal: true, explanation: "SQL в BigQuery объединяет данные из разных таблиц: события + платежи + маркетинг. Это невозможно в Mixpanel." },
        { text: "Экспортирую из Mixpanel в CSV и обрабатываю в Excel", outcome: "Excel не даст когортный анализ с join нескольких источников. На 100k строк — зависнет. Это временное решение без масштаба.", isOptimal: false, explanation: "Excel не масштабируется и не умеет JOIN нескольких источников. BigQuery + SQL — правильный путь." },
      ],
    }},
    { type: "dragsort", position: "after", data: {
      title: "Расставьте части когортного SQL-запроса в правильном порядке",
      description: "Правильная структура запроса для retention-анализа через CTE",
      items: [
        "WITH cohorts AS — дата первого события каждого пользователя",
        "activity AS — все возвраты с разницей в неделях от регистрации",
        "SELECT cohort_week, weeks_since_signup, COUNT(DISTINCT user_id)",
        "FIRST_VALUE(...) OVER (PARTITION BY cohort_week ORDER BY weeks_since_signup) — знаменатель",
        "FROM activity GROUP BY 1, 2 ORDER BY 1, 2",
      ],
      correctOrder: [0, 1, 2, 3, 4],
    }},
  ],

  "m-analytics-l8": [
    { type: "callout", position: "before", data: { type: "warning", text: "Самая опасная аналитика — уверенная, но неправильная. p<0.05 не означает «тест удался». Simpson's Paradox может развернуть ваш вывод на 180°. Этот урок — прививка от аналитических ошибок." } },
    { type: "table", position: "middle", data: {
      title: "Статистические концепции для PM: без формул",
      headers: ["Концепция", "Что означает", "Практическое применение"],
      rows: [
        ["p-value < 0.05", "Вероятность случайно получить такую разницу < 5%", "Порог для объявления результата значимым"],
        ["Доверительный интервал", "Диапазон, где находится истинный эффект с 95% вероятностью", "Если CI включает 0 — результат незначим"],
        ["Effect Size", "Реальная величина изменения (не только значимость)", "p=0.04, но эффект 0.01% — практически бессмысленно"],
        ["Power = 80%", "Вероятность обнаружить реальный эффект если он есть", "20% шанс пропустить рабочую фичу"],
        ["MDE", "Минимальный эффект, который хотим зафиксировать", "Чем меньше MDE, тем больше нужна выборка"],
      ],
    }},
    { type: "table", position: "middle", data: {
      title: "Когнитивные ловушки аналитика: симптомы и защита",
      headers: ["Ловушка", "Симптом", "Защита"],
      rows: [
        ["Simpson's Paradox", "Агрегированный тренд разворачивается при сегментации", "Всегда смотреть breakdown по ключевым сегментам"],
        ["Survivorship Bias", "Анализируем только «выживших» — делаем ложные выводы", "Включать churned-пользователей в когортный анализ"],
        ["Novelty Effect", "Метрика растёт на неделе 1, возвращается к baseline к неделе 4", "Смотреть на недели 2-4, не на первую неделю"],
        ["P-hacking", "Останавливаем тест как только p<0.05 вместо плановой даты", "Рассчитать выборку заранее, не заглядывать до дедлайна"],
        ["Selection Bias", "Группы в тесте несопоставимы изначально", "SRM-проверка после запуска теста"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "A/B-тест: останавливать или нет?",
      situation: "Запустили A/B-тест онбординга. Запланировали 4 недели и 14,600 пользователей. На 5-й день: Control=8.1%, Treatment=9.8%, p=0.041. Дизайнер говорит: «Уже значимо, внедряем!» Ваше решение?",
      choices: [
        { text: "Внедряем — p<0.05, всё по науке!", outcome: "Через 2 недели тест «сам» показывает p=0.18 — эффект пропал. Вы уже раскатили на всех. Novelty Effect был.", isOptimal: false, explanation: "Ранняя остановка = p-hacking. 5 дней из 28 — слишком мало для стабильного результата. Novelty Effect не виден." },
        { text: "Продолжаем — мы рассчитали 28 дней и 14,600 пользователей. Смотрим после дедлайна", outcome: "На 28-й день: p=0.19, эффект не подтверждён. Novelty Effect исчез. Правильное решение — не внедрять и искать другую гипотезу.", isOptimal: true, explanation: "Размер выборки рассчитан заранее. Ранняя остановка — это p-hacking. Терпение — ключевой навык аналитика." },
        { text: "Останавливаем тест, но делаем выводы «предварительными»", outcome: "«Предварительные» выводы обычно становятся решениями. Через неделю фича в проде, данные ненадёжные.", isOptimal: false, explanation: "Нет «предварительной значимости». Либо тест завершён с нужной выборкой, либо результат ненадёжен." },
      ],
    }},
    { type: "matching", position: "after", data: {
      title: "Свяжите ошибку с её последствием",
      pairs: [
        ["Type I Error (False Positive)", "Внедряем фичу, которая не работает"],
        ["Type II Error (False Negative)", "Отказываемся от рабочей фичи"],
        ["Simpson's Paradox без сегментации", "Делаем неверный вывод из агрегированных данных"],
        ["Novelty Effect в первую неделю", "Переоцениваем фичу из-за первоначального интереса"],
        ["Guardrail Metric нарушена", "Конверсия выросла, но retention упал — тест провалился"],
      ],
    }},
  ],

  // ===== L9: Дизайн дашбордов =====
  "m-analytics-l9": [
    { type: "callout", position: "before", data: { type: "tip", text: "Дашборд, который никто не читает — это не дашборд, это архив. Один вопрос, одна метрика, правильный граф, контекст — и данные начинают работать." } },
    { type: "table", position: "middle", data: {
      title: "Когда какой тип графика: шпаргалка PM",
      headers: ["Тип данных", "Рекомендуемый граф", "Пример"],
      rows: [
        ["Тренд во времени", "Line Chart", "DAU за 30 дней, weekly retention"],
        ["Сравнение категорий", "Bar Chart", "CR по каналам, revenue по сегментам"],
        ["Распределение", "Histogram", "L28 distribution (Power User Curve)"],
        ["Матрица значений", "Heatmap", "Retention-матрица по когортам"],
        ["Воронка", "Funnel Chart", "Онбординг: шаг 1 → 2 → 3 → 4"],
        ["Пути пользователей", "Sankey", "Flows из Mixpanel"],
        ["Корреляция двух метрик", "Scatter Plot", "CAC vs LTV по когортам"],
      ],
    }},
    { type: "dragsort", position: "middle", data: {
      title: "Расставьте блоки PM Weekly Dashboard в правильном порядке (сверху вниз)",
      description: "Самое важное для CEO — сверху слева",
      items: [
        "NSM + DAU/WAU с 4-недельным трендом + D7 retention",
        "Основная конверсионная воронка с breakdown по платформе",
        "Acquisition: новые пользователи по каналам + Activation Rate",
        "Revenue: MRR + New/Churned MRR + конверсия free → paid",
        "Активные A/B-тесты: список + плановая дата + промежуточный результат",
      ],
      correctOrder: [0, 1, 2, 3, 4],
    }},
    { type: "callout", position: "after", data: { type: "info", text: "Data Story по Pyramid Principle: начинайте с вывода ('retention упал на 9% — потери $43K/мес'), потом доказательства. CEO хочет знать что делать, а не смотреть 10 слайдов с данными." } },
    { type: "scenario", position: "after", data: {
      title: "CEO смотрит на ваш дашборд 60 секунд. Что произойдёт?",
      situation: "Вы подготовили дашборд из 28 графиков по всем метрикам продукта. Первый блок — технические метрики (p99 latency, error rate). В конце — NSM и воронка. CEO даёт на просмотр 60 секунд, потом спрашивает: «Ну и как у нас дела?»",
      choices: [
        { text: "Всё нормально — у меня есть все данные, я отвечу на любой вопрос", outcome: "CEO говорит: 'Я не понял главного — мы растём или падаем? Где проблема?' Встреча потрачена впустую.", isOptimal: false, explanation: "28 графиков без иерархии = когнитивная перегрузка. CEO не аналитик." },
        { text: "Переделываю: NSM + главная воронка + D7 retention — сверху, с контекстом (WoW%, target). Текстовые аннотации на аномалиях", outcome: "CEO за 30 секунд: 'Retention падает третью неделю подряд. Что делаем?' Разговор сразу о решении.", isOptimal: true, explanation: "Иерархия + контекст + аннотации = решения за 60 секунд. Именно для этого строят дашборды." },
        { text: "Добавляю ещё один дашборд с summary-page", outcome: "Summary-page без иерархии — та же проблема. Ещё один слой не решает проблему архитектуры.", isOptimal: false, explanation: "Проблема не в количестве дашбордов, а в принципах: один вопрос, иерархия, контекст." },
      ],
    }},
  ],

  // ===== L10: A/B-тестирование полный цикл =====
  "m-analytics-l10": [
    { type: "callout", position: "before", data: { type: "info", text: "Провести A/B-тест и провести хороший A/B-тест — разные вещи. 7 шагов отделяют 'посмотрели через 3 дня' от институциональной памяти, которая не позволяет повторять ошибки." } },
    { type: "calculator", position: "middle", data: {
      title: "Калькулятор размера выборки для A/B-теста",
      description: "Введите параметры теста для расчёта нужного размера выборки и длительности",
      fields: [
        { label: "Базовая конверсия (%)", key: "baseline", placeholder: "18", suffix: "%" },
        { label: "MDE — мин. детектируемый эффект (%)", key: "mde", placeholder: "2", suffix: "%" },
        { label: "Дневной трафик (пользователей)", key: "traffic", placeholder: "500" },
      ],
      formula: "((1.96 + 0.84) * (1.96 + 0.84)) * (baseline/100 * (1 - baseline/100) * 2) / ((mde/100) * (mde/100)) / traffic",
      resultLabel: "Дней до завершения",
      resultSuffix: " дней",
      benchmark: { good: 30, label: "< 14 дней — отлично! 14-30 дней — норма. > 30 дней — увеличьте MDE или трафик." },
      tip: "Чем меньше MDE, тем больше нужна выборка. Если тест занимает >60 дней — поднимите MDE до минимально значимого для бизнеса.",
    }},
    { type: "table", position: "middle", data: {
      title: "7 шагов A/B-теста: чеклист",
      headers: ["Шаг", "Действие", "Частая ошибка"],
      rows: [
        ["1. Гипотеза", "«Если [изменение] → [метрика] на [величину], потому что [механизм]»", "«Просто попробуем» — нет механизма"],
        ["2. Метрики", "Primary (1) + Guardrails (2-4) + Secondary", "Только primary, без guardrails"],
        ["3. Выборка", "Рассчитать через MDE + baseline + power=80%", "«Посмотрим неделю» без расчёта"],
        ["4. Feature Flag", "Рандомизация по user_id; SRM-проверка через 48ч", "SRM не проверяется"],
        ["5. Мониторинг", "Guardrails + SRM + технические ошибки; не смотреть primary", "Peeking — смотреть primary каждый день"],
        ["6. Анализ", "SRM → guardrails → primary → сегменты → effect size", "Игнорировать сегментацию (Simpson's Paradox)"],
        ["7. Experiment Log", "Фиксировать всё: победы И поражения", "Логировать только победы"],
      ],
    }},
    { type: "scenario", position: "after", data: {
      title: "Тест завершён. Что решить?",
      situation: "A/B-тест онбординга. 28 дней, 14,800 пользователей. Результат: Activation Rate Control=18%, Treatment=21.3%, p=0.02. Но: D7 retention Control=28%, Treatment=19%. SRM: Control=7,200, Treatment=7,600 (52%/48%) — в норме.",
      choices: [
        { text: "Ship! Activation Rate +3.3%, p=0.02 — значимо, внедряем", outcome: "Через месяц: MRR стагнирует, отток растёт. D7 retention 19% убивает LTV. Activation выросло за счёт удержания.", isOptimal: false, explanation: "Guardrail metric (D7 retention) нарушена: -9 п.п. — это критично. Конверсия выросла, но ценой retention." },
        { text: "No Ship. Guardrail metric (D7 retention) критически ухудшилась: -9 п.п. Возвращаемся, исследуем причину", outcome: "Правильно. Сессии Replay показывают: новый онбординг пропускает обучение ключевой фиче. Пользователи активируются, но не понимают продукт.", isOptimal: true, explanation: "Guardrail metrics — это стоп-сигнал. Retention упал на 32% — это долгосрочные потери LTV, перевешивающие краткосрочный рост Activation." },
        { text: "Iterate — исследовать почему retention упал и доработать гипотезу", outcome: "Правильное направление! Но сначала нужно принять решение No Ship, потом итерировать. Нельзя оставить проблемный вариант включённым.", isOptimal: false, explanation: "Итерировать — верно, но порядок важен: сначала No Ship (выключить Treatment), потом исследовать и строить новую гипотезу." },
      ],
    }},
  ],

  // ===== L11: Сегментация =====
  "m-analytics-l11": [
    { type: "callout", position: "before", data: { type: "info", text: "Поведенческая сегментация — не про демографию. Power Users и Casual Users одного возраста ведут себя принципиально по-разному. Данные об их поведении — ваш главный инструмент для роста." } },
    { type: "table", position: "middle", data: {
      title: "4 базовых поведенческих сегмента: определение и действия",
      headers: ["Сегмент", "Критерий (L28)", "Доля MAU", "Действие"],
      rows: [
        ["Power Users", "L28 >= 20", "5-10%", "JTBD-интервью, Beta-тест, реферальная программа"],
        ["Casual Users", "L28 = 4-10", "50-60%", "Найти Aha-moment, улучшить engagement loop"],
        ["At-risk", "L28 >= 4 (30д назад), не активен 14д", "15-25%", "Персонализированный email, реактивация"],
        ["Dormant", "Не активен 30+ дней", "20-30%", "Win-back с новым value prop, акция"],
      ],
    }},
    { type: "matching", position: "middle", data: {
      title: "Свяжите сегмент с правильной стратегией",
      pairs: [
        ["Power Users (L28=25)", "Приглашение на Beta-тест + интервью для понимания JTBD"],
        ["At-risk (был активен, молчит 14 дней)", "Персонализированный email: «Вот что пропустили»"],
        ["Casual (L28=5, заходит по выходным)", "Push в воскресенье: «Ваш следующий урок ждёт»"],
        ["Dormant (30+ дней молчания)", "Win-back: «Мы добавили 3 новых модуля с вашего ухода»"],
        ["Potential Loyalist (новый, 2 урока за 7д)", "Напоминание о следующем шаге онбординга + milestone"],
      ],
    }},
    { type: "calculator", position: "after", data: {
      title: "Оцените здоровье сегментации вашего продукта",
      description: "Введите данные о распределении пользователей по сегментам",
      fields: [
        { label: "Power Users (% от MAU)", key: "power", placeholder: "7", suffix: "%" },
        { label: "Casual Users (% от MAU)", key: "casual", placeholder: "55", suffix: "%" },
        { label: "At-risk (% от MAU)", key: "atrisk", placeholder: "20", suffix: "%" },
        { label: "Dormant (% от MAU)", key: "dormant", placeholder: "18", suffix: "%" },
      ],
      formula: "power / (atrisk + dormant) * 100",
      resultLabel: "Power/At-risk ratio",
      resultSuffix: "%",
      benchmark: { good: 40, label: "> 40% — здоровый продукт. < 20% — удержание критически низкое." },
      tip: "Здоровый продукт: Power Users > 5% MAU, Dormant < 25% MAU. Если Dormant > 30% — нужна срочная работа с retention.",
    }},
  ],

  // ===== L12: Capstone =====
  "m-analytics-l12": [
    { type: "callout", position: "before", data: { type: "warning", text: "Это финальный кейс модуля. Используйте всё изученное: воронки, retention, Growth Accounting, сегментацию, гипотезы и Data Story. Именно так проходят продуктовые интервью в топ-компаниях." } },
    { type: "table", position: "middle", data: {
      title: "Данные LearnFlow: аналитический кейс",
      headers: ["Метрика", "Значение", "Оценка"],
      rows: [
        ["MAU", "43,200", "Норма для стадии роста"],
        ["Quick Ratio", "1.39", "Растём, но retention слабый"],
        ["D7 Retention (неделя 1)", "41%", "Хорошо для EdTech"],
        ["D7 Retention (неделя 8)", "19%", "Критическое падение -54%"],
        ["CR урок 2→3 (Mobile)", "22%", "Аномально низко"],
        ["CR урок 2→3 (Desktop)", "48%", "Норма"],
        ["CR paywall→оплата", "20%", "Хорошо для freemium"],
        ["Churned за месяц", "14,400", "79% от новых пользователей!"],
      ],
    }},
    { type: "calculator", position: "middle", data: {
      title: "Рассчитайте упущенный LTV от drop-off на шаге 3",
      description: "Сколько денег теряет LearnFlow из-за мобильного drop-off?",
      fields: [
        { label: "Пользователей завершают урок 2 (в нед.)", key: "users", placeholder: "1474" },
        { label: "CR урок 2→3 на Mobile (%)", key: "mobile_cr", placeholder: "22", suffix: "%" },
        { label: "CR paywall→оплата (%)", key: "pay_cr", placeholder: "20", suffix: "%" },
        { label: "LTV одного клиента ($)", key: "ltv", placeholder: "90", suffix: "$" },
      ],
      formula: "users * 0.6 * ((0.48 - mobile_cr/100) * pay_cr/100 * ltv)",
      resultLabel: "Упущенный LTV в неделю ($)",
      resultSuffix: "$",
      insight: "Это потенциал оптимизации мобильного урока 3. Если Mobile CR вырастет до уровня Desktop, вы вернёте эти деньги.",
    }},
    { type: "scenario", position: "after", data: {
      title: "Итоговый кейс: что приоритизировать первым?",
      situation: "Вы PM LearnFlow. Retention падает 8 недель (41% → 19%), Quick Ratio = 1.39, мобильный drop-off на уроке 3 стоит $12,600/неделю. У вас 1 спринт. Что берёте?",
      choices: [
        { text: "Работаем над retention — это стратегическая проблема, Retention Floor не достигнут", outcome: "Правильное направление, но retention — это 3-6 месяцев работы. За 1 спринт не решить. И нет ясной гипотезы — нужен Amplitude Compass + интервью сначала.", isOptimal: false, explanation: "Retention — приоритет долгосрочно. Но за 1 спринт нужна quick win с ясной гипотезой. Session Replay за 1 неделю даст гипотезу для теста." },
        { text: "Session Replay мобильного урока 3 (1 неделя) → A/B-тест (4 недели). Impact $12,600/нед, есть ясная гипотеза", outcome: "Правильно. Конкретная проблема, конкретный impact в деньгах, короткий путь к гипотезе. При подтверждении — fix даёт $50К+ в месяц.", isOptimal: true, explanation: "Приоритет = наибольший impact с наименьшим effort и ясной гипотезой. Session Replay + A/B = 5 недель до результата с чётким измеримым outcome." },
        { text: "Поднимаем бюджет acquisition — Quick Ratio > 1, значит растём", outcome: "Quick Ratio 1.39 — это 79% новых пользователей уходит. Больше вливать в дырявое ведро = деньги на ветер. Сначала retention, потом acquisition.", isOptimal: false, explanation: "При Quick Ratio < 2 приоритет — retention. Увеличение acquisition при высоком churne только ускоряет потери." },
      ],
    }},
    { type: "callout", position: "after", data: { type: "tip", text: "Поздравляем с завершением модуля «Продуктовая аналитика»! Вы освоили: систему метрик, инструменты Data Stack, Mixpanel, Amplitude, Taxonomy, воронки, Growth Accounting, SQL, статистику, дашборды, A/B-тесты и сегментацию. Это полный стек продуктового аналитика." } },
  ],
};

// ── Strip em-dashes from all interactive content strings ──────────────────
function _stripEmStr(s: unknown): unknown {
  if (typeof s === "string") return s.replace(/—/g, "-");
  if (Array.isArray(s)) return s.map(_stripEmStr);
  if (s && typeof s === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(s as object)) out[k] = _stripEmStr((s as Record<string, unknown>)[k]);
    return out;
  }
  return s;
}
for (const key of Object.keys(lessonInteractiveContent)) {
  (lessonInteractiveContent as Record<string, unknown[]>)[key] =
    _stripEmStr(lessonInteractiveContent[key as keyof typeof lessonInteractiveContent]) as unknown[];
}
// ─────────────────────────────────────────────────────────────────────────────

// ===== Render helper =====
export function renderInteractiveBlocks(lessonId: string, position: "before" | "after" | "middle", accessLevel?: "free" | "monthly" | "lifetime", isDemoMode?: boolean): React.ReactNode {
  // Special: render ProjectSimulator for the simulator lesson
  if (lessonId === "m-sim-l1" && position === "after") {
    return <ProjectSimulator accessLevel={accessLevel ?? "free"} isDemoMode={isDemoMode ?? false} />;
  }

  const allBlocks = lessonInteractiveContent[lessonId];
  if (!allBlocks) return null;

  const filtered = allBlocks.filter(b => b.position === position);
  if (filtered.length === 0) return null;

  return (
    <>
      {filtered.map((block, i) => {
        const bKey = `${lessonId}-${position}-${i}`;
        const bIdx = allBlocks.indexOf(block);
        switch (block.type) {
          case "image":
            return <LessonImage key={bKey} {...block.data} />;
          case "dialog":
            return <DialogSimulation key={bKey} {...block.data} />;
          case "table":
            return <InteractiveTable key={bKey} data={block.data} />;
          case "reveal":
            return (
              <RevealBlock key={bKey} title={block.data.title}>
                {block.data.content.split("\n").map((line: string, li: number) => (
                  <p key={li} className={line.trim() ? "mb-1.5" : "mb-3"}>{line}</p>
                ))}
              </RevealBlock>
            );
          case "proscons":
            return <ProsConsBlock key={bKey} {...block.data} />;
          case "callout":
            return <Callout key={bKey} type={block.data.type}>{block.data.text}</Callout>;
          case "dragsort":
            return <DragSortTask key={bKey} data={block.data} lessonId={lessonId} blockIndex={bIdx} />;
          case "matching":
            return <MatchingPairsTask key={bKey} data={block.data} lessonId={lessonId} blockIndex={bIdx} />;
          case "fillblank":
            return <FillBlankTask key={bKey} data={block.data} lessonId={lessonId} blockIndex={bIdx} />;
          case "scenario":
            return <ScenarioTask key={bKey} data={block.data} lessonId={lessonId} blockIndex={bIdx} />;
          case "miniquiz":
            return <MiniQuizBlock key={bKey} data={block.data} lessonId={lessonId} blockIndex={bIdx} />;
          case "calculator":
            return <CalculatorTask key={bKey} data={block.data} lessonId={lessonId} blockIndex={bIdx} />;
          default:
            return null;
        }
      })}
    </>
  );
}