import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// m1-l4 теперь платный — исключён из бонусных уроков
const BONUS_LESSON_IDS = ["m2-l1", "m2-l2"];

const STATS_KEY   = "exit-intent-stats";   // { opens: number, submits: number }
const FB_PREFIX   = "exit-feedback:";

function bonusKey(email: string) {
  return `bonus-access:${email.toLowerCase().trim()}`;
}

async function getStats(): Promise<{ opens: number; submits: number }> {
  const s = await kv.get(STATS_KEY) as { opens?: number; submits?: number } | null;
  return { opens: s?.opens ?? 0, submits: s?.submits ?? 0 };
}

export function registerExitIntentRoutes(app: Hono) {

  // ── POST /exit-intent-track-open ────────────────────────────────────────
  // Called by the frontend every time the exit-intent modal becomes visible.
  app.post("/make-server-279b4dfa/exit-intent-track-open", async (c) => {
    try {
      const s = await getStats();
      await kv.set(STATS_KEY, { ...s, opens: s.opens + 1 });
      return c.json({ ok: true });
    } catch (err) {
      console.log(`[exit-intent] track-open error: ${err}`);
      return c.json({ ok: false }, 500);
    }
  });

  // ── POST /exit-intent-feedback ──────────────────────────────────────────
  app.post("/make-server-279b4dfa/exit-intent-feedback", async (c) => {
    try {
      const body = await c.req.json();
      const { email, feedback, page, ts } = body ?? {};

      if (!email || !EMAIL_RE.test(String(email).trim())) {
        return c.json({ error: "Invalid or missing email" }, 400);
      }
      if (!feedback || !String(feedback).trim()) {
        return c.json({ error: "Feedback text is required" }, 400);
      }

      const safeEmail = String(email).trim().toLowerCase();

      // 1. Save feedback entry
      const id = `${FB_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await kv.set(id, {
        id,
        email:    safeEmail,
        feedback: String(feedback).trim(),
        page:     page ? String(page) : "",
        ts:       ts   ? String(ts)   : new Date().toISOString(),
        status:   "pending",
      });

      // 2. Grant bonus access tied to this email (idempotent)
      const key = bonusKey(safeEmail);
      const existing = await kv.get(key);
      if (!existing) {
        await kv.set(key, {
          email:      safeEmail,
          lessonIds:  BONUS_LESSON_IDS,
          grantedAt:  new Date().toISOString(),
          feedbackId: id,
        });
        console.log(`[exit-intent] bonus access GRANTED — email=${safeEmail} lessons=${BONUS_LESSON_IDS.join(",")}`);
      } else {
        console.log(`[exit-intent] bonus access already existed — email=${safeEmail}`);
      }

      // 3. Increment submits counter
      const s = await getStats();
      await kv.set(STATS_KEY, { ...s, submits: s.submits + 1 });

      return c.json({ ok: true, id, lessonIds: BONUS_LESSON_IDS });
    } catch (err) {
      console.log(`[exit-intent] POST error: ${err}`);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ── GET /exit-intent-bonus-access?email=... ─────────────────────────────
  app.get("/make-server-279b4dfa/exit-intent-bonus-access", async (c) => {
    try {
      const email = c.req.query("email");
      if (!email || !EMAIL_RE.test(String(email).trim())) {
        return c.json({ lessonIds: [] });
      }
      const safeEmail = String(email).trim().toLowerCase();
      const key = bonusKey(safeEmail);
      const record = await kv.get(key) as { lessonIds?: string[] } | null;
      if (record && Array.isArray(record.lessonIds)) {
        console.log(`[exit-intent] bonus access CHECK ✅ — email=${safeEmail}`);
        return c.json({ lessonIds: record.lessonIds });
      }
      console.log(`[exit-intent] bonus access CHECK ❌ — email=${safeEmail} not found`);
      return c.json({ lessonIds: [] });
    } catch (err) {
      console.log(`[exit-intent] GET bonus error: ${err}`);
      return c.json({ lessonIds: [] });
    }
  });

  // ── DELETE /admin/exit-intent/:id ────────────────────────────────────────
  app.delete("/make-server-279b4dfa/admin/exit-intent/:id", async (c) => {
    const pw = c.req.header("X-Admin-Password");
    const expectedPw = Deno.env.get("ADMIN_PASSWORD");
    if (!pw || pw !== expectedPw) return c.json({ error: "Unauthorized" }, 401);
    try {
      const id = c.req.param("id");
      await kv.del(id);
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: `Delete error: ${err}` }, 500);
    }
  });

  // ── GET /admin/exit-intent ───────────────────────────────────────────────
  // Returns all exit-intent feedback entries + aggregate stats. Admin only.
  app.get("/make-server-279b4dfa/admin/exit-intent", async (c) => {
    const pw = c.req.header("X-Admin-Password");
    const expectedPw = Deno.env.get("ADMIN_PASSWORD");
    if (!pw || pw !== expectedPw) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    try {
      // getByPrefix returns Array<{ key: string; value: any }> — extract .value
      const raw = await kv.getByPrefix(FB_PREFIX);
      const allEntries: Array<{
        id: string; email: string; feedback: string; page: string; ts: string; status: string;
      }> = Array.isArray(raw)
        ? raw.map((item: { key?: string; value?: unknown }) => item.value ?? item).filter(Boolean) as typeof allEntries
        : [];

      // Sort by ts descending (newest first)
      allEntries.sort((a, b) => {
        const ta = a?.ts ? new Date(a.ts).getTime() : 0;
        const tb = b?.ts ? new Date(b.ts).getTime() : 0;
        return tb - ta;
      });

      let stats = { opens: 0, submits: 0 };
      try {
        stats = await getStats();
      } catch (_e) {
        // fallback to zeros if stats key doesn't exist yet
      }

      return c.json({ ok: true, stats, entries: allEntries });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[exit-intent] admin GET error: ${msg}`);
      return c.json({ error: `Ошибка сервера: ${msg}` }, 500);
    }
  });
}