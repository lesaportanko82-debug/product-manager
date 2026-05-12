/**
 * Interactive Progress & Chestnut (🌰) Tracking
 * - Saves completion of interactive blocks to localStorage (instant) + Supabase (async)
 * - Awards chestnuts (🌰) for first-time completions
 * - Tracks calculator results globally for comparison
 */

import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
const LS_KEY = "interactive-progress";
const LS_XP_KEY = "interactive-xp";

// XP values per interactive block type
export const XP_TABLE: Record<string, number> = {
  miniquiz: 10,
  fillblank: 15,
  scenario: 20,
  calculator: 10,
  dragsort: 15,
  matching: 15,
};

export function getSessionId(): string {
  let id = localStorage.getItem("exam-session-id");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("exam-session-id", id);
  }
  return id;
}

// ===== Local cache =====

function getLocalProgress(): Record<string, { completed: boolean; xp: number; result?: any; ts: string }> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalProgress(data: Record<string, any>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export function getLocalXP(): number {
  try {
    return Number(localStorage.getItem(LS_XP_KEY) || "0");
  } catch {
    return 0;
  }
}

export function addLocalXP(amount: number) {
  try {
    const current = getLocalXP();
    localStorage.setItem(LS_XP_KEY, String(current + amount));
  } catch {}
}

// ===== Block ID generation =====
export function makeBlockId(lessonId: string, blockType: string, blockIndex: number): string {
  return `${lessonId}:${blockType}:${blockIndex}`;
}

// ===== Check if completed =====
export function isBlockCompleted(blockId: string): boolean {
  const progress = getLocalProgress();
  return !!progress[blockId]?.completed;
}

// ===== Get completion count for a lesson =====
export function getLessonCompletionCount(lessonId: string): number {
  const progress = getLocalProgress();
  return Object.keys(progress).filter(k => k.startsWith(lessonId + ":") && progress[k]?.completed).length;
}

// ===== Get total completed interactive blocks =====
export function getTotalCompletedBlocks(): number {
  const progress = getLocalProgress();
  return Object.values(progress).filter(v => v?.completed).length;
}

// ===== Mark block as completed + award XP =====
// Returns the XP awarded (0 if already completed)
export function markBlockCompleted(
  lessonId: string,
  blockType: string,
  blockIndex: number,
  result?: any
): number {
  const blockId = makeBlockId(lessonId, blockType, blockIndex);
  const progress = getLocalProgress();

  // Already completed? No XP
  if (progress[blockId]?.completed) return 0;

  const xp = XP_TABLE[blockType] || 0;

  // Save locally (instant)
  progress[blockId] = {
    completed: true,
    xp,
    result,
    ts: new Date().toISOString(),
  };
  saveLocalProgress(progress);
  addLocalXP(xp);

  // Sync to Supabase (async, fire-and-forget)
  const sessionId = getSessionId();
  fetch(`${API_BASE}/interactive-progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      sessionId,
      blockId,
      blockType,
      lessonId,
      result,
      xpAmount: xp,
    }),
  }).catch((err) => console.log("Error syncing interactive progress:", err));

  return xp;
}

// ===== Calculator result storage (for comparison across users) =====
export function saveCalculatorResult(lessonId: string, blockIndex: number, result: Record<string, number>) {
  const blockId = makeBlockId(lessonId, "calculator", blockIndex);
  // Save locally
  try {
    const calcResults = JSON.parse(localStorage.getItem("calc-results") || "{}");
    calcResults[blockId] = { ...result, ts: new Date().toISOString() };
    localStorage.setItem("calc-results", JSON.stringify(calcResults));
  } catch {}
}

// ===== XP Level System =====
const XP_LEVELS = [
  { level: 1, title: "Росток 🌱", minXP: 0, maxXP: 30 },
  { level: 2, title: "Побег 🌿", minXP: 30, maxXP: 80 },
  { level: 3, title: "Деревце 🌳", minXP: 80, maxXP: 160 },
  { level: 4, title: "Дуб 🏔️", minXP: 160, maxXP: 300 },
  { level: 5, title: "Роща 🌲🌲", minXP: 300, maxXP: 500 },
  { level: 6, title: "Лес 🌲🌲🌲", minXP: 500, maxXP: 800 },
  { level: 7, title: "Тайга 🏞️", minXP: 800, maxXP: 1200 },
  { level: 8, title: "Лесная поляна 🦔", minXP: 1200, maxXP: 2000 },
  { level: 9, title: "Вселенная каштанов 🌌", minXP: 2000, maxXP: Infinity },
];

export function getXPLevel(xp: number): { level: number; title: string; progress: number; nextLevelXP: number } {
  for (const l of XP_LEVELS) {
    if (xp < l.maxXP) {
      const range = l.maxXP === Infinity ? 1000 : l.maxXP - l.minXP;
      const progress = Math.min((xp - l.minXP) / range, 1);
      return { level: l.level, title: l.title, progress, nextLevelXP: l.maxXP === Infinity ? xp + 1000 : l.maxXP };
    }
  }
  const last = XP_LEVELS[XP_LEVELS.length - 1];
  return { level: last.level, title: last.title, progress: 1, nextLevelXP: xp + 1000 };
}

// ===== Sync progress from Supabase (pull remote state) =====
export async function syncProgressFromServer(): Promise<void> {
  try {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/interactive-progress?sessionId=${sessionId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object" && data.blocks) {
      const local = getLocalProgress();
      let xpDelta = 0;
      for (const [blockId, info] of Object.entries(data.blocks) as [string, any][]) {
        if (!local[blockId]?.completed && info?.completed) {
          local[blockId] = { completed: true, xp: info.xp || 0, ts: info.ts || new Date().toISOString() };
          xpDelta += info.xp || 0;
        }
      }
      if (xpDelta > 0) {
        saveLocalProgress(local);
        addLocalXP(xpDelta);
      }
    }
  } catch (err) {
    console.log("Error syncing interactive progress from server:", err);
  }
}