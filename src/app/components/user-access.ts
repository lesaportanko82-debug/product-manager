/**
 * user-access.ts
 *
 * ЕДИНСТВЕННЫЙ источник правды о доступе пользователя.
 *
 * PRIMARY:  GET https://bjhsgjsxhvwtuerahuha.supabase.co/functions/v1/get-user-access?userId=...
 *           Headers: x-site-key: rediska210426
 *
 * FALLBACK: если PRIMARY недоступен — возвращаем free (не пускаем угадыванием).
 */

const GET_USER_ACCESS_URL = "https://bjhsgjsxhvwtuerahuha.supabase.co/functions/v1/get-user-access";
const SITE_KEY = "rediska210426";

export type AccessLevel = "free" | "monthly" | "lifetime";

export interface UserAccessResult {
  accessLevel: AccessLevel;
  canAccessPaidContent: boolean;
}

const FREE: UserAccessResult = { accessLevel: "free", canAccessPaidContent: false };

/** Нормализует строку уровня доступа в AccessLevel */
function parseLevel(raw: unknown): AccessLevel {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "lifetime" || s === "forever" || s === "full") return "lifetime";
  if (s === "monthly" || s === "month" || s === "paid") return "monthly";
  return "free";
}

/**
 * Загружает уровень доступа пользователя через Edge Function get-user-access.
 *
 * @param userId  UUID текущего авторизованного пользователя (из Supabase Auth)
 * @returns       { accessLevel, canAccessPaidContent }
 */
export async function fetchUserAccess(
  _accessToken: string,   // сохраняем сигнатуру для совместимости с App.tsx
  userId: string,
): Promise<UserAccessResult> {
  console.log(`[user-access] ══ fetchUserAccess userId="${userId}" ══`);

  if (!userId) {
    console.warn("[user-access] userId пустой → free");
    return FREE;
  }

  // ── PRIMARY: get-user-access Edge Function ────────────────────────────
  try {
    const url = `${GET_USER_ACCESS_URL}?userId=${encodeURIComponent(userId)}`;
    console.log(`[user-access] PRIMARY → GET ${url}`);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-site-key": SITE_KEY,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    console.log(`[user-access] PRIMARY ← HTTP ${res.status}: ${text}`);

    if (res.ok) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn("[user-access] PRIMARY: невалидный JSON → free");
        return FREE;
      }

      // Endpoint возвращает canAccessPaidContent напрямую
      if (typeof data.canAccessPaidContent === "boolean") {
        const level = parseLevel(data.level ?? data.accessLevel ?? data.plan ?? "");
        const canAccess = data.canAccessPaidContent;
        // Дополнительная проверка: canAccess=true, но level=free → lifetime как запасной
        const resolvedLevel: AccessLevel = canAccess
          ? (level !== "free" ? level : "lifetime")
          : "free";

        console.log(
          `[user-access] PRIMARY ✅ canAccessPaidContent=${canAccess} level="${resolvedLevel}"`
        );
        return { accessLevel: resolvedLevel, canAccessPaidContent: canAccess };
      }

      // Иногда endpoint возвращает только level/plan
      if (data.level || data.plan || data.accessLevel) {
        const level = parseLevel(data.level ?? data.accessLevel ?? data.plan);
        const canAccess = level !== "free";
        console.log(
          `[user-access] PRIMARY ✅ (level-only) level="${level}" canAccess=${canAccess}`
        );
        return { accessLevel: level, canAccessPaidContent: canAccess };
      }

      console.warn("[user-access] PRIMARY: ответ не содержит canAccessPaidContent или level → free");
      return FREE;
    }

    // HTTP-ошибка
    console.warn(`[user-access] PRIMARY HTTP ${res.status} → fallback free`);
    return FREE;
  } catch (err) {
    console.error("[user-access] PRIMARY network error:", err);
    return FREE;
  }
}
