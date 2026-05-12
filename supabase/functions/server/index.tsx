import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { checkOpenAIHealth } from "./openai-config.tsx";
import { registerCoreRoutes } from "./core-routes-handler.tsx";
import { registerAIRoutes } from "./ai-routes-handler.tsx";
import { registerAuthAdminRoutes } from "./auth-admin-handler.tsx";
import { registerExitIntentRoutes } from "./exit-intent-handler.tsx";
import { registerPaymentRoutes } from "./payment-handler.tsx";
import { registerDocCompetencyRoutes } from "./doc-competency-handler.tsx";

const app = new Hono();

// Logger
app.use("*", logger(console.log));

// CORS
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Password", "x-site-key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health endpoints
app.get("/make-server-279b4dfa/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/make-server-279b4dfa/health/openai", async (c) => {
  const health = await checkOpenAIHealth();
  return c.json({
    openai: health,
    sovunya: {
      name: "Sovunya",
      role: "AI-assistant PM Academy",
      ready: health.ok,
    },
  });
});

// Route groups
registerCoreRoutes(app);
registerAIRoutes(app);
registerAuthAdminRoutes(app);
registerExitIntentRoutes(app);
registerPaymentRoutes(app);
registerDocCompetencyRoutes(app);

// Start server
// Ensure admin account exists on startup
(async () => {
  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const adminEmail = "lifesyncspace@gmail.com";
    const adminPass = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPass) return;
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find((u: any) => u.email?.toLowerCase() === adminEmail);
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, { password: adminPass, email_confirm: true });
      console.log("[startup] Admin account synced");
    } else {
      await supabase.auth.admin.createUser({ email: adminEmail, password: adminPass, email_confirm: true });
      console.log("[startup] Admin account created");
    }
  } catch (e) {
    console.log("[startup] Admin account setup skipped:", e);
  }
})();

Deno.serve(app.fetch);