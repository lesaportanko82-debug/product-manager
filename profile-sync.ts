/**
 * Profile Sync — full cross-device synchronization of user state
 * Syncs: completedLessons, bookmarks, activityLog, badges, notes, ratings, XP, examScore
 */

import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getLocalXP } from "./interactive-progress";
import { getStreak, ALL_BADGES } from "./gamification";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

function getSessionId(): string {
  let id = localStorage.getItem("exam-session-id");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("exam-session-id", id);
  }
  return id;
}

export interface ProfileData {
  completedLessons: string[];
  bookmarks: string[];
  activityLog: string[];
  earnedBadges: string[];
  notes: Record<string, string>;
  ratings: Record<string, number>;
  xp: number;
  examScore: number | null;
  streak: number;
  totalLessons: number;
  lastSyncAt?: string;
  syncCount?: number;
}

/**
 * Build current profile from localStorage
 */
export function buildLocalProfile(): ProfileData {
  const completedLessons = safeParseArray("course-progress");
  const bookmarks = safeParseArray("course-bookmarks");
  const activityLog = safeParseArray("course-activity-log");
  const notes = safeParseObj("course-notes");
  const ratings = safeParseObj("course-ratings");
  const xp = getLocalXP();
  const streak = getStreak();
  const examScore = (() => {
    try {
      const s = localStorage.getItem("best-exam-score");
      return s ? Number(s) : null;
    } catch { return null; }
  })();

  // Get earned badge IDs from localStorage
  const earnedBadges = safeParseArray("earned-badges");

  return {
    completedLessons,
    bookmarks,
    activityLog,
    earnedBadges,
    notes,
    ratings,
    xp,
    examScore,
    streak,
    totalLessons: 64,
  };
}

/**
 * Apply server profile to localStorage (merge)
 */
export function applyServerProfile(server: ProfileData): {
  completedLessons: Set<string>;
  bookmarks: Set<string>;
  changed: boolean;
} {
  let changed = false;

  // Merge completedLessons
  const localCompleted = new Set(safeParseArray("course-progress"));
  const serverCompleted = new Set(server.completedLessons || []);
  const mergedCompleted = new Set([...localCompleted, ...serverCompleted]);
  if (mergedCompleted.size !== localCompleted.size) {
    changed = true;
    try { localStorage.setItem("course-progress", JSON.stringify([...mergedCompleted])); } catch {}
  }

  // Merge bookmarks
  const localBookmarks = new Set(safeParseArray("course-bookmarks"));
  const serverBookmarks = new Set(server.bookmarks || []);
  const mergedBookmarks = new Set([...localBookmarks, ...serverBookmarks]);
  if (mergedBookmarks.size !== localBookmarks.size) {
    changed = true;
    try { localStorage.setItem("course-bookmarks", JSON.stringify([...mergedBookmarks])); } catch {}
  }

  // Merge activity log
  const localLog = safeParseArray("course-activity-log");
  const serverLog = server.activityLog || [];
  const mergedLog = [...new Set([...localLog, ...serverLog])].sort().slice(-90);
  if (mergedLog.length > localLog.length) {
    changed = true;
    try { localStorage.setItem("course-activity-log", JSON.stringify(mergedLog)); } catch {}
  }

  // XP: take max
  const localXP = getLocalXP();
  if ((server.xp || 0) > localXP) {
    changed = true;
    try { localStorage.setItem("interactive-xp", String(server.xp)); } catch {}
  }

  // Exam score: take max
  const localExam = (() => {
    try { const s = localStorage.getItem("best-exam-score"); return s ? Number(s) : null; } catch { return null; }
  })();
  if (server.examScore && (!localExam || server.examScore > localExam)) {
    changed = true;
    try { localStorage.setItem("best-exam-score", String(server.examScore)); } catch {}
  }

  // Merge badges
  const localBadges = new Set(safeParseArray("earned-badges"));
  const serverBadges = new Set(server.earnedBadges || []);
  const mergedBadges = new Set([...localBadges, ...serverBadges]);
  if (mergedBadges.size !== localBadges.size) {
    changed = true;
    try { localStorage.setItem("earned-badges", JSON.stringify([...mergedBadges])); } catch {}
  }

  return {
    completedLessons: mergedCompleted,
    bookmarks: mergedBookmarks,
    changed,
  };
}

/**
 * Sync profile to server (upload + download merge)
 */
export async function syncProfile(): Promise<{ success: boolean; changed: boolean }> {
  try {
    const sessionId = getSessionId();
    const localProfile = buildLocalProfile();

    const res = await fetch(`${API_BASE}/sync-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ sessionId, profile: localProfile }),
    });

    if (!res.ok) {
      console.log("Profile sync upload failed:", res.status);
      return { success: false, changed: false };
    }

    const { profile: serverProfile } = await res.json();

    if (serverProfile) {
      const { changed } = applyServerProfile(serverProfile);
      return { success: true, changed };
    }

    return { success: true, changed: false };
  } catch (err) {
    console.log("Profile sync error:", err);
    return { success: false, changed: false };
  }
}

/**
 * Load profile from server only (for new device)
 */
export async function loadProfileFromServer(): Promise<ProfileData | null> {
  try {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/sync-profile/${sessionId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) return null;
    const { profile } = await res.json();
    return profile || null;
  } catch {
    return null;
  }
}

// Helpers
function safeParseArray(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch { return []; }
}

function safeParseObj(key: string): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch { return {}; }
}

/**
 * Track analytics events (fire-and-forget)
 */
export function trackView(lessonId: string): void {
  fetch(`${API_BASE}/analytics/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ lessonId }),
  }).catch(() => {});
}

export function trackComplete(lessonId: string): void {
  fetch(`${API_BASE}/analytics/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ lessonId }),
  }).catch(() => {});
}

export function trackReadingTime(lessonId: string, seconds: number): void {
  if (seconds < 5) return; // Skip noise
  fetch(`${API_BASE}/analytics/read-time`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ lessonId, seconds }),
  }).catch(() => {});
}