/**
 * user-access.ts
 *
 * PRIMARY:  Supabase REST API напрямую — читает user_access с токеном пользователя
 * FALLBACK: make-server /my-access?userId=... + x-site-key (service role, обходит RLS)
 */

import { projectId, publicAnonKey } from "../../../utils/supabase/info";

export type AccessLevel = "free" | "monthly" | "lifetime";

export interface UserAccessResult {
  accessLevel: AccessLevel;
  canAccessPaidContent: boolean;
}

const FREE: UserAccessResult = { accessLevel: "free", canAccessPaidContent: false };
const BASE = `https://${projectId}.supabase.co`;
// SITE_KEY removed — x-site-key header no longer sent from frontend

function levelFromPlanStatus(
  plan: string | undefined | null,
  status: string | undefined | null,
  expiresAt?: string | null
): UserAccessResult {
  if (!plan) return FREE;
  const p = (plan ?? "").toLowerCase().trim();
  const active = (status ?? "").toLowerCase() === "active";
  if (!active) return FREE;

  if (p === "lifetime" || p === "forever" || p === "full") {
    return { accessLevel: "lifetime", canAccessPaidContent: true };
  }
  if (p === "month" || p === "monthly" || p === "paid") {
    const ok = !expiresAt || new Date(expiresAt) > new Date();
    return ok ? { accessLevel: "monthly", canAccessPaidContent: true } : FREE;
  }
  // Неизвестный plan, но active — открываем
  return { accessLevel: "lifetime", canAccessPaidContent: true };
}

function levelFromString(level: string): UserAccessResult {
  const l = level.toLowerCase().trim();
  if (l === "lifetime") return { accessLevel: "lifetime", canAccessPaidContent: true };
  if (l === "monthly" || l === "month") return { accessLevel: "monthly", canAccessPaidContent: true };
  return FREE;
}

export async function fetchUserAccess(
  accessToken: string,
  userId: string,
): Promise<UserAccessResult> {
  console.log(`[user-access] ══ fetchUserAccess userId="${userId}" ══`);

  if (!userId) {
    console.warn(`[user-access] userId пустой → free`);
    return FREE;
  }

  // ── PRIMARY: Supabase REST API (PostgREST) ────────────────────────────
  // Прямой запрос к Postgres, авторизация токеном пользователя.
  // Работает если RLS разрешает пользователю читать свою строку.
  if (accessToken) {
    try {
      const url = `${BASE}/rest/v1/user_access?user_id=eq.${encodeURIComponent(userId)}&select=plan,status,expires_at&limit=1`;
      console.log(`[user-access] PRIMARY → GET ${url}`);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "apikey": publicAnonKey,
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      console.log(`[user-access] PRIMARY ← HTTP ${res.status}: ${text}`);

      if (res.ok) {
        const rows = JSON.parse(text) as Array<{ plan: string; status: string; expires_at: string | null }>;
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          const result = levelFromPlanStatus(row.plan, row.status, row.expires_at);
          console.log(`[user-access] PRIMARY: plan="${row.plan}" status="${row.status}" → canAccess=${result.canAccessPaidContent}`);
          // Если нашли строку — доверяем ей (даже если free)
          return result;
        }
        console.log(`[user-access] PRIMARY: строка не найдена → FALLBACK`);
      } else {
        console.warn(`[user-access] PRIMARY HTTP ${res.status} → FALLBACK`);
      }
    } catch (err) {
      console.error(`[user-access] PRIMARY error:`, err);
    }
  }

  // ── FALLBACK: make-server /my-access ─────────────────────────────────
  // Использует SERVICE_ROLE_KEY на сервере → обходит RLS.
  // НЕ требует валидации токена — только userId + site-key.
  try {
    const url = `${BASE}/functions/v1/make-server-279b4dfa/my-access?userId=${encodeURIComponent(userId)}`;
    console.log(`[user-access] FALLBACK → GET ${url}`);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Supabase gateway требует Authorization (anon key) ДО нашего роутера
        "Authorization": `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    console.log(`[user-access] FALLBACK ← HTTP ${res.status}: ${text}`);

    if (res.ok) {
      const data = JSON.parse(text) as Record<string, unknown>;
      const result = levelFromString(String(data.level ?? ""));
      console.log(`[user-access] FALLBACK: level="${data.level}" source="${data.source}" → canAccess=${result.canAccessPaidContent}`);
      return result;
    }
    console.error(`[user-access] FALLBACK HTTP ${res.status}`);
  } catch (err) {
    console.error(`[user-access] FALLBACK error:`, err);
  }

  console.log(`[user-access] ❌ оба источника не дали доступа → free`);
  return FREE;
}