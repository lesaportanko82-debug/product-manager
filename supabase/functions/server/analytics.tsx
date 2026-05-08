/**
 * Learning Analytics — aggregation and funnel tracking
 * All data stored in KV with incremental updates
 */
import * as kv from "./kv_store.tsx";

// ===== Lesson Stats =====

interface LessonStats {
  views: number;
  completions: number;
  totalRating: number;
  ratingCount: number;
  totalReadTimeSec: number;
  readTimeCount: number;
}

export async function trackLessonView(lessonId: string): Promise<void> {
  const key = `analytics:lesson:${lessonId}`;
  try {
    const stats: LessonStats = await kv.get(key) || {
      views: 0, completions: 0, totalRating: 0, ratingCount: 0,
      totalReadTimeSec: 0, readTimeCount: 0,
    };
    stats.views += 1;
    await kv.set(key, stats);
  } catch (err) {
    console.log(`Analytics trackLessonView error: ${err}`);
  }
}

export async function trackLessonCompletion(lessonId: string): Promise<void> {
  const key = `analytics:lesson:${lessonId}`;
  try {
    const stats: LessonStats = await kv.get(key) || {
      views: 0, completions: 0, totalRating: 0, ratingCount: 0,
      totalReadTimeSec: 0, readTimeCount: 0,
    };
    stats.completions += 1;
    await kv.set(key, stats);
  } catch (err) {
    console.log(`Analytics trackLessonCompletion error: ${err}`);
  }
}

export async function trackLessonRating(lessonId: string, rating: number): Promise<void> {
  const key = `analytics:lesson:${lessonId}`;
  try {
    const stats: LessonStats = await kv.get(key) || {
      views: 0, completions: 0, totalRating: 0, ratingCount: 0,
      totalReadTimeSec: 0, readTimeCount: 0,
    };
    stats.totalRating += rating;
    stats.ratingCount += 1;
    await kv.set(key, stats);
  } catch (err) {
    console.log(`Analytics trackLessonRating error: ${err}`);
  }
}

export async function trackReadTime(lessonId: string, seconds: number): Promise<void> {
  const key = `analytics:lesson:${lessonId}`;
  try {
    const stats: LessonStats = await kv.get(key) || {
      views: 0, completions: 0, totalRating: 0, ratingCount: 0,
      totalReadTimeSec: 0, readTimeCount: 0,
    };
    stats.totalReadTimeSec += seconds;
    stats.readTimeCount += 1;
    await kv.set(key, stats);
  } catch (err) {
    console.log(`Analytics trackReadTime error: ${err}`);
  }
}

export async function getLessonStats(lessonId: string): Promise<LessonStats & { avgRating: number; avgReadTimeSec: number }> {
  const key = `analytics:lesson:${lessonId}`;
  const stats: LessonStats = await kv.get(key) || {
    views: 0, completions: 0, totalRating: 0, ratingCount: 0,
    totalReadTimeSec: 0, readTimeCount: 0,
  };
  return {
    ...stats,
    avgRating: stats.ratingCount > 0 ? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10 : 0,
    avgReadTimeSec: stats.readTimeCount > 0 ? Math.round(stats.totalReadTimeSec / stats.readTimeCount) : 0,
  };
}

// ===== Funnel Tracking =====

interface FunnelData {
  started: number;
  reached25: number;
  reached50: number;
  reached75: number;
  reached100: number;
  passedExam: number;
  excellentExam: number;
  lastUpdated: string;
}

export async function trackFunnelEvent(
  event: "started" | "reached25" | "reached50" | "reached75" | "reached100" | "passedExam" | "excellentExam",
  sessionId: string
): Promise<void> {
  try {
    // Deduplicate: track which sessions already triggered each event
    const dedupeKey = `analytics:funnel-dedup:${event}:${sessionId}`;
    const already = await kv.get(dedupeKey);
    if (already) return;

    await kv.set(dedupeKey, { ts: Date.now() });

    const funnelKey = "analytics:funnel:global";
    const funnel: FunnelData = await kv.get(funnelKey) || {
      started: 0, reached25: 0, reached50: 0, reached75: 0,
      reached100: 0, passedExam: 0, excellentExam: 0, lastUpdated: "",
    };
    funnel[event] += 1;
    funnel.lastUpdated = new Date().toISOString();
    await kv.set(funnelKey, funnel);
  } catch (err) {
    console.log(`Analytics trackFunnelEvent error: ${err}`);
  }
}

export async function getFunnel(): Promise<FunnelData> {
  try {
    return await kv.get("analytics:funnel:global") || {
      started: 0, reached25: 0, reached50: 0, reached75: 0,
      reached100: 0, passedExam: 0, excellentExam: 0, lastUpdated: "",
    };
  } catch {
    return {
      started: 0, reached25: 0, reached50: 0, reached75: 0,
      reached100: 0, passedExam: 0, excellentExam: 0, lastUpdated: "",
    };
  }
}

// ===== Cohort Analysis =====

export async function trackCohort(sessionId: string): Promise<void> {
  try {
    const weekKey = getWeekKey(new Date());
    const cohortKey = `analytics:cohort:${weekKey}`;
    const cohort = await kv.get(cohortKey) || { sessions: [], weekKey };
    if (!cohort.sessions.includes(sessionId)) {
      cohort.sessions.push(sessionId);
      if (cohort.sessions.length > 1000) cohort.sessions = cohort.sessions.slice(-1000);
      await kv.set(cohortKey, cohort);
    }
  } catch (err) {
    console.log(`Analytics trackCohort error: ${err}`);
  }
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// ===== Leaderboard =====

interface LeaderboardEntry {
  sessionId: string;
  nickname: string;
  xp: number;
  lessonsCompleted: number;
  examScore: number | null;
  streak: number;
  updatedAt: string;
}

const ANIMAL_NAMES = [
  "Сова", "Лис", "Панда", "Дельфин", "Орёл", "Тигр", "Волк", "Ястреб",
  "Кот", "Медведь", "Жираф", "Пингвин", "Леопард", "Рысь", "Фламинго",
  "Хамелеон", "Сокол", "Бизон", "Выдра", "Журавль",
];

const ADJECTIVES = [
  "Мудрый", "Быстрый", "Смелый", "Умный", "Ловкий", "Тихий", "Яркий",
  "Великий", "Гибкий", "Точный", "Сильный", "Хитрый", "Зоркий",
];

function generateNickname(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash = hash & hash;
  }
  const absHash = Math.abs(hash);
  const adj = ADJECTIVES[absHash % ADJECTIVES.length];
  const animal = ANIMAL_NAMES[(absHash >> 4) % ANIMAL_NAMES.length];
  const num = (absHash >> 8) % 100;
  return `${adj} ${animal} #${num}`;
}

export async function updateLeaderboard(
  sessionId: string,
  data: { xp?: number; lessonsCompleted?: number; examScore?: number | null; streak?: number }
): Promise<void> {
  try {
    const entryKey = `leaderboard:entry:${sessionId}`;
    const existing: LeaderboardEntry = await kv.get(entryKey) || {
      sessionId,
      nickname: generateNickname(sessionId),
      xp: 0,
      lessonsCompleted: 0,
      examScore: null,
      streak: 0,
      updatedAt: "",
    };

    if (data.xp !== undefined) existing.xp = Math.max(existing.xp, data.xp);
    if (data.lessonsCompleted !== undefined) existing.lessonsCompleted = Math.max(existing.lessonsCompleted, data.lessonsCompleted);
    if (data.examScore !== undefined && data.examScore !== null) {
      existing.examScore = existing.examScore !== null ? Math.max(existing.examScore, data.examScore) : data.examScore;
    }
    if (data.streak !== undefined) existing.streak = Math.max(existing.streak, data.streak);
    existing.updatedAt = new Date().toISOString();

    await kv.set(entryKey, existing);

    // Update sorted leaderboard (top 50)
    await rebuildLeaderboard();
  } catch (err) {
    console.log(`Leaderboard update error: ${err}`);
  }
}

async function rebuildLeaderboard(): Promise<void> {
  try {
    const entries = await kv.getByPrefix("leaderboard:entry:");
    const sorted = entries
      .map((e: any) => e.value as LeaderboardEntry)
      .filter((e: LeaderboardEntry) => e && e.xp > 0)
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.xp - a.xp)
      .slice(0, 50);
    await kv.set("leaderboard:top50", { entries: sorted, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.log(`Leaderboard rebuild error: ${err}`);
  }
}

export async function getLeaderboard(): Promise<{ entries: LeaderboardEntry[]; updatedAt: string }> {
  try {
    const data = await kv.get("leaderboard:top50");
    return data || { entries: [], updatedAt: "" };
  } catch {
    return { entries: [], updatedAt: "" };
  }
}

export async function getPlayerRank(sessionId: string): Promise<{ rank: number; entry: LeaderboardEntry | null }> {
  try {
    const data = await kv.get("leaderboard:top50");
    if (!data?.entries) return { rank: -1, entry: null };
    const idx = data.entries.findIndex((e: LeaderboardEntry) => e.sessionId === sessionId);
    const entry = await kv.get(`leaderboard:entry:${sessionId}`);
    return { rank: idx >= 0 ? idx + 1 : -1, entry };
  } catch {
    return { rank: -1, entry: null };
  }
}

// ===== Webhook Dead Letter Queue =====

export async function enqueueFailedWebhook(payload: any, error: string): Promise<void> {
  try {
    const key = `webhook-dlq:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await kv.set(key, {
      payload,
      error,
      attempts: 1,
      createdAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + 60000).toISOString(), // retry in 1 min
    });
  } catch (err) {
    console.log(`DLQ enqueue error: ${err}`);
  }
}

export async function retryFailedWebhooks(webhookUrl: string): Promise<{ retried: number; succeeded: number }> {
  try {
    const items = await kv.getByPrefix("webhook-dlq:");
    const now = Date.now();
    let retried = 0;
    let succeeded = 0;

    for (const item of items) {
      const dlq = item.value;
      if (!dlq || new Date(dlq.nextRetryAt).getTime() > now) continue;
      if (dlq.attempts >= 5) {
        // Max retries exceeded, archive
        await kv.del(item.key);
        continue;
      }

      retried++;
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dlq.payload, retryAttempt: dlq.attempts }),
        });
        if (res.ok) {
          succeeded++;
          await kv.del(item.key);
        } else {
          dlq.attempts += 1;
          dlq.nextRetryAt = new Date(now + dlq.attempts * 120000).toISOString();
          await kv.set(item.key, dlq);
        }
      } catch {
        dlq.attempts += 1;
        dlq.nextRetryAt = new Date(now + dlq.attempts * 120000).toISOString();
        await kv.set(item.key, dlq);
      }
    }
    return { retried, succeeded };
  } catch (err) {
    console.log(`DLQ retry error: ${err}`);
    return { retried: 0, succeeded: 0 };
  }
}
