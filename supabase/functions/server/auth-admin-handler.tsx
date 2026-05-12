/**
 * auth-admin-handler.tsx
 * Auth routes (signup, session, forgot-password, user-progress),
 * admin panel routes, user-access, my-access, check-access
 */
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

function checkAdminAuth(pw: string | undefined): boolean {
  const expected = Deno.env.get("ADMIN_PASSWORD");
  if (!expected || !pw) return false;
  return pw === expected;
}

export function registerAuthAdminRoutes(app: Hono) {

  // Auth: Signup
  app.post("/make-server-279b4dfa/signup", async (c) => {
    try {
      const body = await c.req.json();
      const { email, password, name } = body;
      if (!email || !password) return c.json({ error: "Missing email or password" }, 400);
      if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data, error } = await supabase.auth.admin.createUser({
        email, password,
        user_metadata: { name: name || email.split("@")[0] },
        email_confirm: true,
      });
      if (error) { console.log(`Signup error: ${error.message}`); return c.json({ error: error.message }, 400); }

      // Generate a magic link token so the frontend can sign in without password auth
      let tokenHash: string | null = null;
      try {
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
        if (!linkErr && linkData?.properties?.hashed_token) {
          tokenHash = linkData.properties.hashed_token;
        } else if (linkErr) {
          console.log(`[signup] generateLink warning (non-fatal): ${linkErr.message}`);
        }
      } catch (linkEx) {
        console.log(`[signup] generateLink exception (non-fatal): ${linkEx}`);
      }

      // ── Auto-grant access if pre-auth payment was made with this email ──
      const userId = data.user?.id;
      if (userId) {
        try {
          const emailLower = email.toLowerCase().trim();
          const pending = await kv.get(`pending-access-by-email:${emailLower}`);
          if (pending?.plan && pending.plan !== "free") {
            const now = new Date();
            let expiresAt: string | null = null;
            if (pending.plan === "monthly" || pending.plan === "month") {
              const exp = new Date(now);
              exp.setDate(exp.getDate() + 30);
              expiresAt = exp.toISOString();
            }
            await kv.set(`user-access:${userId}`, {
              level: pending.plan === "month" ? "monthly" : pending.plan,
              grantedAt: now.toISOString(),
              expiresAt,
              paidVia: "pre-auth-payment",
            });
            await kv.del(`pending-access-by-email:${emailLower}`);
            console.log(`[signup] ✅ pre-auth access transferred: email=${emailLower} plan=${pending.plan} → userId=${userId}`);
            return c.json({ user: { id: userId, email: data.user?.email }, accessGranted: true, plan: pending.plan, tokenHash });
          }
        } catch (accessErr) {
          console.log(`[signup] access transfer error (non-fatal): ${accessErr}`);
        }
      }

      return c.json({ user: { id: userId, email: data.user?.email }, tokenHash });
    } catch (err) {
      console.log(`Error in signup: ${err}`);
      return c.json({ error: `Signup error: ${err}` }, 500);
    }
  });

  // Payment: Reserve access by email (pre-auth payment — called from payment-success page)
  app.post("/make-server-279b4dfa/payment/reserve-by-email", async (c) => {
    try {
      const body = await c.req.json();
      const { email, plan } = body;
      if (!email || !plan) return c.json({ error: "Missing email or plan" }, 400);
      const emailLower = email.toLowerCase().trim();
      await kv.set(`pending-access-by-email:${emailLower}`, {
        plan,
        reservedAt: new Date().toISOString(),
      });
      console.log(`[reserve-by-email] ✅ reserved: email=${emailLower} plan=${plan}`);
      return c.json({ success: true });
    } catch (err) {
      console.log(`[reserve-by-email] error: ${err}`);
      return c.json({ error: `Error reserving access: ${err}` }, 500);
    }
  });

  // Auth: Link session to user
  app.post("/make-server-279b4dfa/link-session", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, userId } = body;
      if (!sessionId || !userId) return c.json({ error: "Missing sessionId or userId" }, 400);
      await kv.set(`user-session:${userId}`, { sessionId, linkedAt: new Date().toISOString() });
      await kv.set(`session-user:${sessionId}`, { userId, linkedAt: new Date().toISOString() });
      return c.json({ success: true });
    } catch (err) { return c.json({ error: `Error linking session: ${err}` }, 500); }
  });

  // Auth: Get session for user
  app.get("/make-server-279b4dfa/user-session/:userId", async (c) => {
    try {
      const userId = c.req.param("userId");
      const mapping = await kv.get(`user-session:${userId}`);
      return c.json({ mapping: mapping || null });
    } catch (err) { return c.json({ error: `Error getting user session: ${err}` }, 500); }
  });

  // Auth: Forgot password (admin reset)
  app.post("/make-server-279b4dfa/forgot-password", async (c) => {
    try {
      const body = await c.req.json();
      const { email, newPassword } = body;
      if (!email || !newPassword) return c.json({ error: "Missing email or newPassword" }, 400);
      if (newPassword.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) { console.log(`Error listing users for password reset: ${listErr.message}`); return c.json({ error: `Error finding user: ${listErr.message}` }, 500); }
      const user = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) return c.json({ error: "User with this email not found" }, 404);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
      if (updateErr) { console.log(`Error updating password: ${updateErr.message}`); return c.json({ error: `Error updating password: ${updateErr.message}` }, 500); }
      return c.json({ success: true });
    } catch (err) { console.log(`Error in forgot-password: ${err}`); return c.json({ error: `Error in forgot-password: ${err}` }, 500); }
  });

  // User Progress: Save to Supabase
  app.post("/make-server-279b4dfa/user-progress/save", async (c) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);
      const body = await c.req.json();
      const { completedLessons, bookmarks, examScore, sessionId } = body;
      await kv.set(`user-progress:${user.id}`, {
        completedLessons: Array.isArray(completedLessons) ? completedLessons : [],
        bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
        examScore: examScore ?? null,
        sessionId: sessionId || null,
        updatedAt: new Date().toISOString(),
      });
      return c.json({ success: true });
    } catch (err) { console.log(`Error saving user progress: ${err}`); return c.json({ error: `Error saving user progress: ${err}` }, 500); }
  });

  // User Progress: Load from Supabase
  app.get("/make-server-279b4dfa/user-progress/:userId", async (c) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      if (user.id !== userId) return c.json({ error: "Forbidden" }, 403);
      const progress = await kv.get(`user-progress:${userId}`);
      return c.json({ progress: progress || null });
    } catch (err) { console.log(`Error loading user progress: ${err}`); return c.json({ error: `Error loading user progress: ${err}` }, 500); }
  });

  // Admin: Get all users
  app.get("/make-server-279b4dfa/admin/users", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) { console.log(`Error listing users: ${listErr.message}`); return c.json({ error: `Error listing users: ${listErr.message}` }, 500); }

      const { data: pgRows } = await supabase.from("user_access").select("user_id, plan, status, expires_at, updated_at");
      const pgByUserId: Record<string, any> = {};
      for (const row of (pgRows || []) as any[]) {
        pgByUserId[row.user_id] = { plan: row.plan, status: row.status, expires_at: row.expires_at, updated_at: row.updated_at };
      }

      const users = await Promise.all((listData?.users || []).map(async (u: any) => {
        const blocked = await kv.get(`blocked-user:${u.id}`);
        const progress = await kv.get(`user-progress:${u.id}`);
        const accessData = await kv.get(`user-access:${u.id}`);
        const pgRow = pgByUserId[u.id];

        let accessLevel = "free";
        let accessExpiresAt: string | null = null;
        let accessGrantedAt: string | null = null;

        if (accessData?.level === "lifetime") {
          accessLevel = "lifetime";
          accessGrantedAt = accessData?.grantedAt || null;
        } else if ((accessData?.level === "monthly" || accessData?.level === "month") && accessData?.expiresAt) {
          accessLevel = new Date(accessData.expiresAt) < new Date() ? "free" : "monthly";
          accessExpiresAt = accessData?.expiresAt || null;
          accessGrantedAt = accessData?.grantedAt || null;
        }

        if (pgRow && pgRow.status === "active") {
          if (pgRow.plan === "lifetime") {
            accessLevel = "lifetime";
            accessGrantedAt = pgRow.updated_at || accessGrantedAt;
          } else if (pgRow.plan === "month" || pgRow.plan === "monthly") {
            const notExpired = !pgRow.expires_at || new Date(pgRow.expires_at) > new Date();
            if (notExpired && accessLevel !== "lifetime") {
              accessLevel = "monthly";
              accessExpiresAt = pgRow.expires_at;
              accessGrantedAt = pgRow.updated_at || accessGrantedAt;
            }
          }
        }

        return {
          id: u.id, email: u.email,
          name: u.user_metadata?.name || u.email?.split("@")[0] || "-",
          createdAt: u.created_at, lastSignInAt: u.last_sign_in_at,
          isBlocked: blocked?.blocked === true,
          completedLessons: progress?.completedLessons?.length || 0,
          examScore: progress?.examScore || null,
          accessLevel, accessExpiresAt, accessGrantedAt,
        };
      }));
      return c.json({ users });
    } catch (err) { console.log(`Error in admin/users: ${err}`); return c.json({ error: `Error in admin/users: ${err}` }, 500); }
  });

  // Admin: Set user access level
  app.post("/make-server-279b4dfa/admin/users/:userId/set-access", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const body = await c.req.json();
      const { level } = body;
      const now = new Date();
      let expiresAt: string | null = null;
      if (level === "monthly") {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + 30);
        expiresAt = exp.toISOString();
      }

      await kv.set(`user-access:${userId}`, { level, grantedAt: now.toISOString(), expiresAt });

      try {
        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const pgPlan = level === "monthly" ? "month" : level;
        const pgStatus = level === "free" ? "inactive" : "active";
        await supabase.from("user_access").upsert(
          { user_id: userId, plan: pgPlan, status: pgStatus, expires_at: expiresAt, updated_at: now.toISOString() },
          { onConflict: "user_id" }
        );
        console.log(`[set-access] KV + Postgres updated: userId="${userId}" level="${level}"`);
      } catch (pgErr) {
        console.log(`[set-access] Postgres write failed (KV succeeded): ${pgErr}`);
      }

      return c.json({ success: true, userId, level, expiresAt });
    } catch (err) { return c.json({ error: `Error setting user access: ${err}` }, 500); }
  });

  // Admin: Grant access by email
  app.post("/make-server-279b4dfa/admin/grant-by-email", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);

      const body = await c.req.json();
      const { email, level = "lifetime" } = body;
      if (!email) return c.json({ error: "email required" }, 400);

      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) return c.json({ error: `listUsers failed: ${listErr.message}` }, 500);

      const found = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) return c.json({ error: `User not found for email: ${email}` }, 404);

      const userId = found.id;
      const now = new Date();
      let expiresAt: string | null = null;
      if (level === "monthly") {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + 30);
        expiresAt = exp.toISOString();
      }

      await kv.set(`user-access:${userId}`, { level, grantedAt: now.toISOString(), expiresAt });

      const pgPlan = level === "monthly" ? "month" : level;
      const pgStatus = level === "free" ? "inactive" : "active";
      await supabase.from("user_access").upsert(
        { user_id: userId, plan: pgPlan, status: pgStatus, expires_at: expiresAt, updated_at: now.toISOString() },
        { onConflict: "user_id" }
      );

      console.log(`[grant-by-email] ✅ ${email} (${userId}) → level="${level}"`);
      return c.json({ success: true, email, userId, level, expiresAt });
    } catch (err) { return c.json({ error: `Error granting access by email: ${err}` }, 500); }
  });

  // Admin: Diagnose user access by email
  app.get("/make-server-279b4dfa/admin/diagnose-user", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);

      const email = c.req.query("email");
      if (!email) return c.json({ error: "email query param required" }, 400);

      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authUser = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      if (!authUser) {
        return c.json({
          email, authUser: null,
          error: "User NOT found in Supabase Auth — not registered yet",
          kvRecord: null, pgRecord: null,
          diagnosis: ["❌ Пользователь не зарегистрирован в системе — сначала нужна регистрация"],
        });
      }

      const userId = authUser.id;
      const kvRecord = await kv.get(`user-access:${userId}`);

      const { data: pgRow, error: pgErr } = await supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle();
      const { data: pgRowById } = await supabase.from("user_access").select("*").eq("id", userId).maybeSingle();

      const issues: string[] = [];
      if (!kvRecord && !pgRow && !pgRowById) {
        issues.push("❌ НИ KV НИ Postgres не содержат записи о доступе — грант не был применён");
      }
      if (kvRecord) {
        if (kvRecord.level === "lifetime") issues.push("✅ KV: level=lifetime — запись есть");
        else issues.push(`⚠️ KV: level="${kvRecord.level}" — не lifetime`);
      } else {
        issues.push("❌ KV: запись user-access:" + userId + " отсутствует");
      }
      if (pgRow) {
        if (pgRow.plan === "lifetime" && pgRow.status === "active") issues.push("✅ Postgres: plan=lifetime, status=active — запись есть");
        else issues.push(`⚠️ Postgres: plan="${pgRow.plan}", status="${pgRow.status}"`);
      } else {
        issues.push("❌ Postgres: строка по user_id отсутствует");
      }
      if (!authUser.email_confirmed_at) issues.push("⚠️ Email НЕ подтверждён — пользователь не сможет залогиниться");
      if (kvRecord?.level === "lifetime" || (pgRow?.plan === "lifetime" && pgRow?.status === "active")) {
        issues.push("💡 Данные верные — попросите пользователя ВЫЙТИ и войти снова (сессия кешируется)");
      }

      return c.json({
        email, userId,
        authUser: { id: authUser.id, email: authUser.email, created_at: authUser.created_at, last_sign_in_at: authUser.last_sign_in_at, email_confirmed_at: authUser.email_confirmed_at },
        kvRecord: kvRecord ?? null,
        pgRecord: pgRow ?? null,
        pgRecordById: pgRowById ?? null,
        pgError: pgErr?.message ?? null,
        diagnosis: issues,
      });
    } catch (err) { return c.json({ error: `Diagnose error: ${err}` }, 500); }
  });

  // Get user access level (authenticated, JWT required)
  app.get("/make-server-279b4dfa/user-access/:userId", async (c) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);

      const paramUserId = c.req.param("userId");
      const authUserId  = user.id;

      console.log(`[user-access] [ID-CHECK] authUserId (JWT)   = "${authUserId}"`);
      console.log(`[user-access] [ID-CHECK] paramUserId (URL)  = "${paramUserId}"`);

      if (authUserId !== paramUserId) {
        console.log(`[user-access] [ID-MISMATCH] JWT="${authUserId}" ≠ param="${paramUserId}" → 403`);
        return c.json({ error: "user mismatch: access belongs to another user", authUserId, paramUserId }, 403);
      }

      const userId = authUserId;
      console.log(`[user-access] [ID-CHECK] ✅ userId confirmed = "${userId}"`);

      const reply = (payload: Record<string, unknown>, status = 200) =>
        c.json({ ...payload, resolvedUserId: userId }, status as any);

      // Postgres (primary)
      try {
        const { data: pgRow, error: pgErr } = await supabase.from("user_access").select("user_id, plan, status, expires_at").eq("user_id", userId).maybeSingle();

        if (pgErr) {
          console.log(`[user-access] PG error: ${pgErr.message} code=${pgErr.code}`);
        } else if (pgRow) {
          const { user_id: pgUserId, plan, status, expires_at } = pgRow as any;

          console.log(`[user-access] [ID-CHECK] PG row user_id = "${pgUserId}"`);
          if (pgUserId !== userId) {
            return reply({ level: "free", expiresAt: null, source: "postgres", error: "user mismatch", pgUserId });
          }

          console.log(`[user-access] PG row: plan="${plan}" status="${status}" expires_at="${expires_at}"`);

          if (status !== "active") return reply({ level: "free", expiresAt: null, source: "postgres" });
          if (plan === "lifetime") return reply({ level: "lifetime", expiresAt: null, source: "postgres" });
          if (plan === "month" || plan === "monthly") {
            if (expires_at === null) return reply({ level: "month", expiresAt: null, source: "postgres" });
            const isExpired = new Date(expires_at) <= new Date();
            if (isExpired) return reply({ level: "free", expiresAt: expires_at, source: "postgres", reason: "expired" });
            return reply({ level: "month", expiresAt: expires_at, source: "postgres" });
          }
          return reply({ level: "free", expiresAt: null, source: "postgres", reason: `unknown plan: ${plan}` });
        } else {
          console.log(`[user-access] PG: no row for user_id="${userId}" → checking KV`);
        }
      } catch (pgEx) {
        console.log(`[user-access] PG exception:`, pgEx);
      }

      // KV fallback
      const accessData = await kv.get(`user-access:${userId}`);
      console.log(`[user-access] KV[user-access:${userId}]:`, JSON.stringify(accessData));

      if (!accessData) return reply({ level: "free", expiresAt: null, source: "none" });

      const kvLevel: string       = accessData.level    || "";
      const kvExpires: string | null = accessData.expiresAt || null;
      const kvUserId: string      = accessData.userId   || "";

      if (kvUserId && kvUserId !== userId) {
        return reply({ level: "free", expiresAt: null, source: "kv", error: "user mismatch", kvUserId });
      }

      if (kvLevel === "lifetime") return reply({ level: "lifetime", expiresAt: null, source: "kv" });
      if (kvLevel === "month" || kvLevel === "monthly") {
        if (kvExpires !== null && new Date(kvExpires) <= new Date()) {
          return reply({ level: "free", expiresAt: kvExpires, source: "kv", reason: "expired" });
        }
        return reply({ level: "month", expiresAt: kvExpires, source: "kv" });
      }

      return reply({ level: "free", expiresAt: null, source: "kv", reason: `unknown level: ${kvLevel}` });
    } catch (err) {
      console.log(`[user-access] unexpected error:`, err);
      return c.json({ error: `Error getting user access: ${err}` }, 500);
    }
  });

  // My Access: lookup by userId + site-key, NO JWT validation
  app.get("/make-server-279b4dfa/my-access", async (c) => {
    try {
      const userId = c.req.query("userId") || c.req.query("user_id") || "";
      if (!userId) {
        console.log("[my-access] no userId param → free");
        return c.json({ level: "free", source: "no-userid" });
      }
      console.log(`[my-access] userId="${userId}"`);

      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const parseRow = (row: Record<string, unknown>): string | null => {
        console.log(`[my-access] PG row raw:`, JSON.stringify(row));
        const plan   = String(row.plan ?? row.type ?? row.access_type ?? row.access_level ?? "").toLowerCase().trim();
        const active = row.status === "active" || row.is_active === true || row.active === true;
        const exp    = (row.expires_at ?? row.expired_at ?? row.valid_until ?? null) as string | null;
        console.log(`[my-access] PG parsed: plan="${plan}" active=${active} exp="${exp}"`);

        if (!active) return null;
        if (plan === "lifetime" || plan === "forever" || plan === "full") return "lifetime";
        if (plan === "month" || plan === "monthly" || plan === "paid") {
          const ok = !exp || new Date(exp) > new Date();
          return ok ? "monthly" : null;
        }
        if (plan && plan !== "free") return "lifetime";
        return null;
      };

      // 1. Postgres: по user_id (UUID)
      {
        const { data: pgRow, error: pgErr } = await supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle();
        if (pgErr) {
          console.log(`[my-access] PG(user_id) error: ${pgErr.message} code=${pgErr.code}`);
        } else if (pgRow) {
          const level = parseRow(pgRow as Record<string, unknown>);
          if (level === "lifetime") return c.json({ level: "lifetime", userId, source: "postgres-user_id" });
          if (level === "monthly")  return c.json({ level: "monthly",  userId, source: "postgres-user_id" });
          console.log(`[my-access] PG row found but no paid access → KV`);
        } else {
          console.log(`[my-access] no PG row by user_id → try id column`);
        }
      }

      // 2. Postgres: по id (если super-task пишет в колонку "id" а не "user_id")
      {
        const { data: pgRow, error: pgErr } = await supabase.from("user_access").select("*").eq("id", userId).maybeSingle();
        if (!pgErr && pgRow) {
          const level = parseRow(pgRow as Record<string, unknown>);
          if (level === "lifetime") return c.json({ level: "lifetime", userId, source: "postgres-id" });
          if (level === "monthly")  return c.json({ level: "monthly",  userId, source: "postgres-id" });
          console.log(`[my-access] PG(id) row found but no paid access`);
        }
      }

      // 3. KV с несколькими возможными паттернами ключей
      const kvKeys = [`user-access:${userId}`, `access:${userId}`, `paid:${userId}`];
      for (const key of kvKeys) {
        const kvData = await kv.get(key);
        if (!kvData) continue;
        console.log(`[my-access] KV["${key}"]:`, JSON.stringify(kvData));
        const lvl = String(kvData.level ?? kvData.plan ?? kvData.type ?? "").toLowerCase();
        if (lvl === "lifetime") return c.json({ level: "lifetime", userId, source: `kv:${key}` });
        if (lvl === "month" || lvl === "monthly") {
          const exp = kvData.expiresAt ?? kvData.expires_at ?? null;
          if (!exp || new Date(exp) > new Date()) return c.json({ level: "monthly", userId, source: `kv:${key}` });
        }
      }

      console.log(`[my-access] no paid access found → free`);
      return c.json({ level: "free", userId, source: "none" });
    } catch (err) {
      console.log(`[my-access] error:`, err);
      return c.json({ level: "free", source: "error", error: String(err) });
    }
  });

  // Admin: Debug access for a specific userId
  app.get("/make-server-279b4dfa/admin/debug-access/:userId", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);

      const userId = c.req.param("userId");
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const { data: pgByUserId, error: pgErr1 } = await supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle();
      const { data: pgById, error: pgErr2 } = await supabase.from("user_access").select("*").eq("id", userId).maybeSingle();
      const { data: allRows } = await supabase.from("user_access").select("*").limit(20);

      const kvKeys = [`user-access:${userId}`, `access:${userId}`, `paid:${userId}`];
      const kvResults: Record<string, unknown> = {};
      for (const k of kvKeys) { kvResults[k] = await kv.get(k); }

      return c.json({
        userId,
        postgres: { byUserId: pgByUserId ?? null, byUserIdError: pgErr1?.message ?? null, byId: pgById ?? null, byIdError: pgErr2?.message ?? null, allRows: allRows ?? [] },
        kv: kvResults,
      });
    } catch (err) { return c.json({ error: String(err) }, 500); }
  });

  // Admin: Toggle user access (block/unblock)
  app.post("/make-server-279b4dfa/admin/users/:userId/toggle-access", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const body = await c.req.json();
      const { blocked } = body;
      await kv.set(`blocked-user:${userId}`, { blocked: !!blocked, updatedAt: new Date().toISOString() });
      return c.json({ success: true, userId, blocked: !!blocked });
    } catch (err) { return c.json({ error: `Error toggling user access: ${err}` }, 500); }
  });

  // Check if user is blocked
  app.get("/make-server-279b4dfa/check-access/:userId", async (c) => {
    try {
      const userId = c.req.param("userId");
      const blocked = await kv.get(`blocked-user:${userId}`);
      return c.json({ blocked: blocked?.blocked === true });
    } catch (_err) { return c.json({ blocked: false }); }
  });

  // Admin: Delete user
  app.delete("/make-server-279b4dfa/admin/users/:userId", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) { console.log(`Error deleting user: ${error.message}`); return c.json({ error: `Error deleting user: ${error.message}` }, 500); }
      await kv.del(`blocked-user:${userId}`);
      await kv.del(`user-access:${userId}`);
      await kv.del(`user-progress:${userId}`);
      await kv.del(`user-modules:${userId}`);
      return c.json({ success: true });
    } catch (err) { return c.json({ error: `Error deleting user: ${err}` }, 500); }
  });

  // Admin: Change user email
  app.post("/make-server-279b4dfa/admin/users/:userId/change-email", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const { email } = await c.req.json();
      if (!email) return c.json({ error: "Email is required" }, 400);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error } = await supabase.auth.admin.updateUserById(userId, { email });
      if (error) { console.log(`Error changing email: ${error.message}`); return c.json({ error: `Error changing email: ${error.message}` }, 500); }
      return c.json({ success: true });
    } catch (err) { return c.json({ error: `Error changing email: ${err}` }, 500); }
  });

  // Admin: Change user password
  app.post("/make-server-279b4dfa/admin/users/:userId/change-password", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const { password } = await c.req.json();
      if (!password || password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) { console.log(`Error changing password: ${error.message}`); return c.json({ error: `Error changing password: ${error.message}` }, 500); }
      return c.json({ success: true });
    } catch (err) { return c.json({ error: `Error changing password: ${err}` }, 500); }
  });

  // Admin: Get module overrides for user
  app.get("/make-server-279b4dfa/admin/users/:userId/modules", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const data = await kv.get(`user-modules:${userId}`);
      return c.json({ blockedModules: data?.blockedModules || [] });
    } catch (err) { return c.json({ error: `Error getting modules: ${err}` }, 500); }
  });

  // Admin: Set module overrides for user
  app.post("/make-server-279b4dfa/admin/users/:userId/modules", async (c) => {
    try {
      const adminPass = c.req.header("X-Admin-Password");
      if (!checkAdminAuth(adminPass)) return c.json({ error: "Unauthorized" }, 401);
      const userId = c.req.param("userId");
      const { blockedModules } = await c.req.json();
      await kv.set(`user-modules:${userId}`, { blockedModules: blockedModules || [], updatedAt: new Date().toISOString() });
      return c.json({ success: true, blockedModules });
    } catch (err) { return c.json({ error: `Error setting modules: ${err}` }, 500); }
  });
}