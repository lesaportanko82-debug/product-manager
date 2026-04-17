import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BONUS_LESSON_IDS = ["m1-l4", "m1-l5", "m1-l6"];

function bonusKey(email: string) {
  return `bonus-access:${email.toLowerCase().trim()}`;
}

export function registerExitIntentRoutes(app: Hono) {
  // POST /make-server-279b4dfa/exit-intent-feedback
  // Saves feedback + grants bonus lesson access tied to the provided email
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
      const id = `exit-feedback:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
          email:     safeEmail,
          lessonIds: BONUS_LESSON_IDS,
          grantedAt: new Date().toISOString(),
          feedbackId: id,
        });
        console.log(`[exit-intent] bonus access GRANTED — email=${safeEmail} lessons=${BONUS_LESSON_IDS.join(",")}`);
      } else {
        console.log(`[exit-intent] bonus access already existed — email=${safeEmail}`);
      }

      return c.json({ ok: true, id, lessonIds: BONUS_LESSON_IDS });
    } catch (err) {
      console.log(`[exit-intent] POST error: ${err}`);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // GET /make-server-279b4dfa/exit-intent-bonus-access?email=...
  // Checks if an email has been granted bonus access and returns the lesson IDs
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
      console.log(`[exit-intent] GET error: ${err}`);
      return c.json({ lessonIds: [] });
    }
  });
}
