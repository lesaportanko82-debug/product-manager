/**
 * payment-handler.tsx
 * Robokassa, YooKassa, super-task proxy, and payment status routes
 */
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

// SERVER-SIDE PRICING — USD prices are the source of truth; RUB is calculated via CBR rate
const PRICE_MONTH_USD = 85;
const PRICE_LIFETIME_USD = 100;

// Fallback RUB rate if exchange rate fetch fails
const FALLBACK_RATE_USD_RUB = 92;

/** Fetch current USD/RUB rate from Central Bank of Russia */
async function fetchUsdToRub(): Promise<number> {
  try {
    const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`CBR HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.Valute?.USD?.Value;
    if (!rate || typeof rate !== "number") throw new Error("No USD value in CBR response");
    console.log(`[exchange-rate] CBR USD/RUB = ${rate}`);
    return rate;
  } catch (err) {
    console.log(`[exchange-rate] CBR fetch failed: ${err}. Using fallback ${FALLBACK_RATE_USD_RUB}`);
    return FALLBACK_RATE_USD_RUB;
  }
}

/** Returns RUB price string for YooKassa/Robokassa based on live CBR rate */
async function getPriceRub(plan: string): Promise<string> {
  const rate = await fetchUsdToRub();
  const usd = plan === "lifetime" ? PRICE_LIFETIME_USD : PRICE_MONTH_USD;
  return Math.round(usd * rate).toFixed(2);
}

function getPriceDescription(plan: string): string {
  if (plan === "lifetime") return "Vechnyy dostup k kursu po produkt-menedzhmentu";
  return "Dostup k kursu po produkt-menedжменту на 30 dney";
}

async function robokassaSign(str: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(str).digest("hex");
}

const ROBOKASSA_IS_TEST = Deno.env.get("ROBOKASSA_IS_TEST") === "1";

export function registerPaymentRoutes(app: Hono) {

  // ===== ROBOKASSA PAYMENT INTEGRATION =====

  // Robokassa: initialize payment (create order, return payment URL)
  app.post("/make-server-279b4dfa/robokassa/init", async (c) => {
    try {
      const body = await c.req.json();
      const { userId, plan, accessToken, appUrl } = body;

      if (!userId || !plan || !accessToken) {
        return c.json({ error: "Missing required fields: userId, plan, accessToken" }, 400);
      }
      if (plan !== "monthly" && plan !== "lifetime") {
        return c.json({ error: "Invalid plan. Must be 'monthly' or 'lifetime'" }, 400);
      }

      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) {
        console.log(`Robokassa init: unauthorized. Error: ${authErr?.message}`);
        return c.json({ error: "Unauthorized" }, 401);
      }

      const ROBOKASSA_LOGIN = Deno.env.get("ROBOKASSA_LOGIN");
      const password1 = ROBOKASSA_IS_TEST
        ? Deno.env.get("ROBOKASSA_TEST_PASSWORD1")
        : Deno.env.get("ROBOKASSA_PASSWORD1");

      if (!ROBOKASSA_LOGIN || !password1) {
        console.log("Robokassa: credentials not configured");
        return c.json({ error: "Robokassa payment is not configured on the server" }, 500);
      }

      // Amounts in RUB — берётся из SERVER_PRICING (source of truth)
      const amount = await getPriceRub(plan);
      const description = getPriceDescription(plan);
      console.log(`[robokassa] plan=${plan} amount=${amount} RUB desc=${description}`);

      const invId = Date.now();

      // When OutSumCurrency is used, signature MUST include the currency:
      // SHA256(MerchantLogin:OutSum:InvId:OutSumCurrency:Password1)
      const OUT_SUM_CURRENCY = "USD";
      const signatureValue = await robokassaSign(
        `${ROBOKASSA_LOGIN}:${amount}:${invId}:${OUT_SUM_CURRENCY}:${password1}`
      );

      await kv.set(`robokassa-order:${invId}`, {
        userId, plan, amount, currency: OUT_SUM_CURRENCY,
        status: "pending", is_test: ROBOKASSA_IS_TEST,
        createdAt: new Date().toISOString(), appUrl: appUrl || "",
        userEmail: user.email || "",
      });
      console.log(`Robokassa: order ${invId} created for user ${userId}, plan=${plan}, isTest=${ROBOKASSA_IS_TEST}`);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const serverBase = `${supabaseUrl}/functions/v1/make-server-279b4dfa`;
      const encodedAppUrl = encodeURIComponent(appUrl || "");

      const paymentUrl = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
      paymentUrl.searchParams.set("MerchantLogin", ROBOKASSA_LOGIN);
      paymentUrl.searchParams.set("OutSum", amount);
      paymentUrl.searchParams.set("OutSumCurrency", OUT_SUM_CURRENCY);
      paymentUrl.searchParams.set("InvId", String(invId));
      paymentUrl.searchParams.set("Description", description);
      paymentUrl.searchParams.set("SignatureValue", signatureValue);
      paymentUrl.searchParams.set("ResultURL", `${serverBase}/robokassa/result`);
      paymentUrl.searchParams.set("SuccessURL", `${serverBase}/robokassa/success?appUrl=${encodedAppUrl}&invId=${invId}`);
      paymentUrl.searchParams.set("FailURL", `${serverBase}/robokassa/fail?appUrl=${encodedAppUrl}&invId=${invId}`);
      paymentUrl.searchParams.set("Culture", "ru");
      paymentUrl.searchParams.set("Encoding", "utf-8");
      if (ROBOKASSA_IS_TEST) paymentUrl.searchParams.set("IsTest", "1");

      return c.json({ paymentUrl: paymentUrl.toString(), invId });
    } catch (err) {
      console.log(`Error initializing Robokassa payment: ${err}`);
      return c.json({ error: `Error initializing payment: ${err}` }, 500);
    }
  });

  // Robokassa: ResultURL — server-to-server payment notification
  app.post("/make-server-279b4dfa/robokassa/result", async (c) => {
    try {
      const rawBody = await c.req.text();
      const params = new URLSearchParams(rawBody);
      const outSum = params.get("OutSum") || params.get("out_sum");
      const invId = params.get("InvId") || params.get("inv_id");
      const signatureValue = params.get("SignatureValue") || params.get("signature_value");

      console.log(`Robokassa result: OutSum=${outSum}, InvId=${invId}`);

      if (!outSum || !invId || !signatureValue) {
        console.log(`Robokassa result: missing params. Body: ${rawBody}`);
        return c.text("bad sign", 400);
      }

      const orderForCheck = await kv.get(`robokassa-order:${invId}`);
      const isTestPayment = orderForCheck?.is_test === true;

      const password2 = isTestPayment
        ? Deno.env.get("ROBOKASSA_TEST_PASSWORD2")
        : Deno.env.get("ROBOKASSA_PASSWORD2");

      if (!password2) {
        console.log(`Robokassa: PASSWORD2 not configured (isTest=${isTestPayment})`);
        return c.text("error: server configuration", 500);
      }

      const expectedSig = await robokassaSign(`${outSum}:${invId}:${password2}`);
      if (expectedSig.toLowerCase() !== signatureValue.toLowerCase()) {
        console.log(`Robokassa sig mismatch. Expected: ${expectedSig}, Got: ${signatureValue}, isTest=${isTestPayment}`);
        return c.text("bad sign", 400);
      }

      const order = orderForCheck;
      if (!order) {
        console.log(`Robokassa: order not found for invId=${invId}`);
        return c.text("order not found", 404);
      }

      if (order.status === "completed") return c.text(`OK${invId}`);

      const now = new Date();
      let expiresAt: string | null = null;
      if (order.plan === "monthly") {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + 30);
        expiresAt = exp.toISOString();
      }

      await kv.set(`user-access:${order.userId}`, {
        level: order.plan, grantedAt: now.toISOString(), expiresAt,
        paidVia: "robokassa", invId: String(invId), amount: outSum, is_test: isTestPayment,
      });
      await kv.set(`robokassa-order:${invId}`, {
        ...order, status: "completed", completedAt: now.toISOString(),
        paidOutSum: outSum, rawCallback: rawBody,
      });

      console.log(`Robokassa: access granted for user ${order.userId}, plan=${order.plan}, isTest=${isTestPayment}`);
      return c.text(`OK${invId}`);
    } catch (err) {
      console.log(`Error processing Robokassa result: ${err}`);
      return c.text("error", 500);
    }
  });

  // Robokassa: SuccessURL
  app.get("/make-server-279b4dfa/robokassa/success", (c) => {
    const appUrl = c.req.query("appUrl") || "";
    const invId = c.req.query("invId") || "";
    const baseUrl = appUrl ? decodeURIComponent(appUrl) : "https://www.product-intensive.com";
    const redirectTo = `${baseUrl}/payment-success?invId=${invId}`;
    return c.html(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Оплата прошла успешно</title><meta http-equiv="refresh" content="3;url=${redirectTo}"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)}.card{background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.08)}.emoji{font-size:4rem;margin-bottom:1rem}h1{color:#16a34a;font-size:1.5rem;margin-bottom:.75rem}p{color:#6b7280;font-size:.9375rem;line-height:1.6;margin-bottom:.75rem}a{display:inline-block;margin-top:.5rem;background:#16a34a;color:#fff;padding:.75rem 1.5rem;border-radius:12px;text-decoration:none;font-weight:600}a:hover{background:#15803d}</style></head><body><div class="card"><div class="emoji">✅</div><h1>Оплата прошла успешно!</h1><p>Добро пожаловать! Ваш доступ к курсу активирован.<br>Войдите снова, чтобы продолжить обучение.</p><p style="font-size:.8125rem;color:#9ca3af">Вы будете перенаправлены через 3 секунды...</p><a href="${redirectTo}">Перейти в курс →</a></div></body></html>`);
  });

  // Robokassa: FailURL
  app.get("/make-server-279b4dfa/robokassa/fail", (c) => {
    const appUrl = c.req.query("appUrl") || "";
    const baseUrl = appUrl ? decodeURIComponent(appUrl) : "https://www.product-intensive.com";
    const redirectTo = `${baseUrl}/payment-fail`;
    return c.html(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ошибка оплаты</title><meta http-equiv="refresh" content="4;url=${redirectTo}"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)}.card{background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.08)}.emoji{font-size:4rem;margin-bottom:1rem}h1{color:#dc2626;font-size:1.5rem;margin-bottom:.75rem}p{color:#6b7280;font-size:.9375rem;line-height:1.6;margin-bottom:.75rem}.btn{display:inline-block;margin-top:.5rem;background:#dc2626;color:#fff;padding:.75rem 1.5rem;border-radius:12px;text-decoration:none;font-weight:600}.btn:hover{background:#b91c1c}.tg{margin-top:1rem;font-size:.875rem;color:#9ca3af}.tg a{background:#2AABEE;color:#fff;padding:.25rem .75rem;border-radius:8px;text-decoration:none;font-size:.875rem}</style></head><body><div class="card"><div class="emoji">❌</div><h1>Оплата не прошла</h1><p>Что-то пошло не так. Попробуйте ещё раз или свяжитесь с администратором.</p><a class="btn" href="${redirectTo}">Вернуться в курс</a><div class="tg">или <a href="https://t.me/ohh_lessya" target="_blank">написать @ohh_lessya</a></div></div></body></html>`);
  });

  // Robokassa: check order status
  app.get("/make-server-279b4dfa/robokassa/order/:invId", async (c) => {
    try {
      const invId = c.req.param("invId");
      const order = await kv.get(`robokassa-order:${invId}`);
      if (!order) return c.json({ error: "Order not found" }, 404);
      return c.json({ invId, status: order.status, plan: order.plan, is_test: order.is_test || false, createdAt: order.createdAt, completedAt: order.completedAt || null });
    } catch (err) {
      console.log(`Error getting Robokassa order: ${err}`);
      return c.json({ error: `Error getting order: ${err}` }, 500);
    }
  });

  // Payment status (for /payment-success page polling)
  app.get("/make-server-279b4dfa/payment/status", async (c) => {
    try {
      const invId = c.req.query("invoiceId");
      if (!invId) return c.json({ status: "unknown" });
      const order = await kv.get(`robokassa-order:${invId}`);
      if (!order) return c.json({ status: "not_found" });
      const mappedStatus = order.status === "completed" ? "paid" : order.status === "pending" ? "pending" : "failed";
      return c.json({ invoiceId: invId, status: mappedStatus, plan: order.plan, is_test: order.is_test || false, createdAt: order.createdAt, paidAt: order.completedAt || null });
    } catch (err) {
      console.log(`Error getting payment status: ${err}`);
      return c.json({ error: `Error getting payment status: ${err}` }, 500);
    }
  });

  // Direct YooKassa payment status check by payment UUID
  app.get("/make-server-279b4dfa/payment/check-yookassa", async (c) => {
    try {
      const paymentId = c.req.query("paymentId");
      if (!paymentId) return c.json({ status: "unknown", error: "paymentId required" });
      const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
      const secretKey = Deno.env.get("YOOKASSA_SECRET_KEY");
      if (!shopId || !secretKey) {
        console.log("check-yookassa: YooKassa credentials not configured");
        return c.json({ status: "unknown", error: "YooKassa not configured" });
      }
      const credentials = btoa(`${shopId}:${secretKey}`);
      const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.log(`check-yookassa: YooKassa API error ${res.status}: ${errBody.slice(0, 200)}`);
        return c.json({ status: "unknown", error: `YooKassa ${res.status}` });
      }
      const payment = await res.json();
      const status = payment.status === "succeeded" || payment.status === "waiting_for_capture" ? "paid"
        : payment.status === "canceled" ? "failed" : "pending";
      console.log(`check-yookassa: id=${paymentId} yk_status=${payment.status} mapped=${status}`);
      return c.json({ status, plan: payment.metadata?.plan || payment.metadata?.plan_id || null, yookassaStatus: payment.status });
    } catch (err) {
      console.log(`check-yookassa error: ${err}`);
      return c.json({ error: `${err}`, status: "unknown" }, 500);
    }
  });

  // Payment status check by orderId (for super-task / YooKassa payments)
  app.get("/make-server-279b4dfa/payment/check-order", async (c) => {
    try {
      const orderId = c.req.query("orderId");
      if (!orderId) return c.json({ status: "unknown" });
      const keyPatterns = [
        `yookassa-order:${orderId}`, `robokassa-order:${orderId}`,
        `payment:${orderId}`, `order:${orderId}`, `super-task:${orderId}`,
      ];
      for (const key of keyPatterns) {
        const order = await kv.get(key);
        if (order) {
          const rawStatus = order.status ?? "";
          const status = rawStatus === "completed" || rawStatus === "succeeded" || rawStatus === "paid" ? "paid"
            : rawStatus === "pending" || rawStatus === "waiting_for_capture" ? "pending"
            : rawStatus === "canceled" || rawStatus === "failed" || rawStatus === "cancelled" ? "failed"
            : "pending";
          console.log(`check-order: KV hit key=${key} rawStatus=${rawStatus} mapped=${status}`);
          return c.json({ status, plan: order.plan || null });
        }
      }
      // Fallback: query YooKassa API
      const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
      const secretKey = Deno.env.get("YOOKASSA_SECRET_KEY");
      if (shopId && secretKey) {
        try {
          const credentials = btoa(`${shopId}:${secretKey}`);
          const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          const res = await fetch(`https://api.yookassa.ru/v3/payments?limit=20&created_at.gte=${since}`, {
            headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" }
          });
          if (res.ok) {
            const data = await res.json();
            const match = (data.items || []).find((p: any) =>
              p.metadata?.orderId === orderId || p.metadata?.order_id === orderId ||
              (p.description && p.description.includes(orderId))
            );
            if (match) {
              const status = match.status === "succeeded" ? "paid" : match.status === "canceled" ? "failed" : "pending";
              console.log(`check-order: YooKassa API match yookassa_id=${match.id} status=${status}`);
              return c.json({ status, plan: match.metadata?.plan || null });
            }
          }
        } catch (e) { console.log(`check-order: YooKassa API error: ${e}`); }
      }
      console.log(`check-order: orderId=${orderId} not found in KV or YooKassa`);
      return c.json({ status: "unknown" });
    } catch (err) {
      console.log(`check-order error: ${err}`);
      return c.json({ error: `${err}`, status: "unknown" }, 500);
    }
  });

  // ===== Payment Proxy (CORS fix for super-task) =====
  app.post("/make-server-279b4dfa/payment/init", async (c) => {
    try {
      const body = await c.req.json();

      // Пересчёт суммы по актуальному курсу ЦБ РФ (server-side source of truth)
      const rate = await fetchUsdToRub();
      const usd = body.plan === "lifetime" ? PRICE_LIFETIME_USD : PRICE_MONTH_USD;
      const finalAmount = Math.round(usd * rate).toFixed(2);
      console.log(`[payment-proxy] plan=${body.plan} frontend_amount=${body.amount} server_calculated=${finalAmount} rate=${rate}`);

      const bodyWithCorrectAmount = { ...body, amount: finalAmount };
      const res = await fetch("https://bjhsgjsxhvwtuerahuha.supabase.co/functions/v1/super-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-key": Deno.env.get("PUBLIC_SITE_KEY") || "" },
        body: JSON.stringify(bodyWithCorrectAmount),
      });
      const data = await res.json().catch(() => ({}));
      console.log("Payment proxy: super-task responded", res.status, JSON.stringify(data));
      return c.json(data, res.status as any);
    } catch (err) {
      console.log(`Payment proxy error: ${err}`);
      return c.json({ error: `Proxy error: ${err}` }, 500);
    }
  });

  // ===== Current exchange rate + prices endpoint (used by frontend) =====
  app.get("/make-server-279b4dfa/payment/exchange-rate", async (c) => {
    try {
      const rate = await fetchUsdToRub();
      return c.json({
        usdToRub: rate,
        monthlyRub: Math.round(PRICE_MONTH_USD * rate),
        lifetimeRub: Math.round(PRICE_LIFETIME_USD * rate),
        monthlyUsd: PRICE_MONTH_USD,
        lifetimeUsd: PRICE_LIFETIME_USD,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.log(`[exchange-rate] endpoint error: ${err}`);
      return c.json({ error: `${err}` }, 500);
    }
  });

  // ===== YooKassa Payment Integration =====
  app.post("/make-server-279b4dfa/yookassa/init", async (c) => {
    try {
      const body = await c.req.json();
      const { userId, plan, accessToken, appUrl } = body;
      if (!userId || !plan || !accessToken) return c.json({ error: "Missing required fields: userId, plan, accessToken" }, 400);
      if (plan !== "monthly" && plan !== "lifetime") return c.json({ error: "Invalid plan. Must be 'monthly' or 'lifetime'" }, 400);

      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) {
        console.log(`YooKassa init: unauthorized. Error: ${authErr?.message}`);
        return c.json({ error: "Unauthorized" }, 401);
      }

      const YOOKASSA_SHOP_ID = Deno.env.get("YOOKASSA_SHOP_ID");
      const YOOKASSA_SECRET_KEY = Deno.env.get("YOOKASSA_SECRET_KEY");
      if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
        console.log("YooKassa: credentials not configured");
        return c.json({ error: "YooKassa payment is not configured on the server" }, 500);
      }

      // Amounts in RUB — берётся из SERVER_PRICING (source of truth)
      const amount = await getPriceRub(plan);
      const description = getPriceDescription(plan);
      console.log(`[yookassa] plan=${plan} amount=${amount} RUB desc=${description}`);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const serverBase = `${supabaseUrl}/functions/v1/make-server-279b4dfa`;
      const encodedAppUrl = encodeURIComponent(appUrl || "");
      const idempotenceKey = `${userId}-${plan}-${Date.now()}`;

      const paymentPayload = {
        amount: { value: amount, currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: `${serverBase}/yookassa/success?appUrl=${encodedAppUrl}` },
        description,
        metadata: { userId, plan, userEmail: user.email || "" },
      };

      const yookassaAuth = btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`);
      const yookassaResponse = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${yookassaAuth}`, "Idempotence-Key": idempotenceKey },
        body: JSON.stringify(paymentPayload),
      });

      const paymentData = await yookassaResponse.json();
      if (!yookassaResponse.ok || !paymentData.id) {
        console.log(`YooKassa error: ${JSON.stringify(paymentData)}`);
        return c.json({ error: "Не удалось создать платёж в YooKassa" }, 500);
      }

      await kv.set(`yookassa-order:${paymentData.id}`, {
        userId, plan, amount, currency: "RUB", status: paymentData.status,
        createdAt: new Date().toISOString(), appUrl: appUrl || "",
        userEmail: user.email || "", yookassaId: paymentData.id,
      });

      console.log(`YooKassa: payment ${paymentData.id} created for user ${userId}, plan=${plan}`);
      return c.json({ paymentUrl: paymentData.confirmation.confirmation_url, paymentId: paymentData.id });
    } catch (err) {
      console.log(`Error initializing YooKassa payment: ${err}`);
      return c.json({ error: `Error initializing payment: ${err}` }, 500);
    }
  });

  // YooKassa: webhook notification
  app.post("/make-server-279b4dfa/yookassa/webhook", async (c) => {
    try {
      const body = await c.req.json();
      const event = body.event;
      const payment = body.object;
      console.log(`YooKassa webhook: event=${event}, paymentId=${payment?.id}, status=${payment?.status}`);
      if (event !== "payment.succeeded" || !payment || payment.status !== "succeeded") return c.json({ received: true });

      const paymentId = payment.id;
      const order = await kv.get(`yookassa-order:${paymentId}`);
      if (!order) {
        console.log(`YooKassa: order not found for paymentId=${paymentId}`);
        return c.json({ error: "Order not found" }, 404);
      }
      if (order.status === "succeeded") return c.json({ received: true });

      const now = new Date();
      let expiresAt: string | null = null;
      if (order.plan === "monthly") {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + 30);
        expiresAt = exp.toISOString();
      }

      await kv.set(`user-access:${order.userId}`, {
        level: order.plan, grantedAt: now.toISOString(), expiresAt,
        paidVia: "yookassa", paymentId, amount: payment.amount.value,
      });
      await kv.set(`yookassa-order:${paymentId}`, { ...order, status: "succeeded", completedAt: now.toISOString(), paidAmount: payment.amount.value });

      console.log(`YooKassa: access granted for user ${order.userId}, plan=${order.plan}`);
      return c.json({ received: true });
    } catch (err) {
      console.log(`Error processing YooKassa webhook: ${err}`);
      return c.json({ error: "Internal error" }, 500);
    }
  });

  // YooKassa: SuccessURL
  app.get("/make-server-279b4dfa/yookassa/success", (c) => {
    const appUrl = c.req.query("appUrl") || "";
    const baseUrl = appUrl ? decodeURIComponent(appUrl) : "https://www.product-intensive.com";
    const redirectTo = `${baseUrl}/payment-success`;
    return c.html(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Оплата прошла успешно</title><meta http-equiv="refresh" content="3;url=${redirectTo}"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)}.card{background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.08)}.emoji{font-size:4rem;margin-bottom:1rem}h1{color:#16a34a;font-size:1.5rem;margin-bottom:.75rem}p{color:#6b7280;font-size:.9375rem;line-height:1.6;margin-bottom:.75rem}a{display:inline-block;margin-top:.5rem;background:#16a34a;color:#fff;padding:.75rem 1.5rem;border-radius:12px;text-decoration:none;font-weight:600}a:hover{background:#15803d}</style></head><body><div class="card"><div class="emoji">✅</div><h1>Оплата прошла!</h1><p>Доступ к курсу активируется автоматически. Перезайдите в аккаунт.</p><a href="${redirectTo}">Вернуться в курс</a></div></body></html>`);
  });
}