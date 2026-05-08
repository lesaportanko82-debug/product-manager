import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Lock, Star, Infinity, CheckCircle2, Zap,
  BookOpen, Trophy, Bot, CreditCard, Loader2, AlertCircle,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { useCurrencyRates } from "./use-currency-rates";
import { PRICING_PLANS, formatPriceRub, toPaymentAmount } from "./pricing-plans";

// ─── Платежи через make-server прокси (site-key добавляется на сервере) ────
const PAYMENT_PROXY_URL = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/payment/init`;

/** Сохраняет YooKassa UUID платежа в sessionStorage для надёжной проверки статуса после возврата */
function storeYookassaPaymentId(ourOrderId: string, confirmationUrl: string, responseData: any) {
  try {
    const directId = responseData?.paymentId || responseData?.payment_id || responseData?.id;
    let ykPaymentId: string | null = null;

    if (directId && /^[0-9a-f-]{36}$/i.test(directId)) {
      ykPaymentId = directId;
      console.log(`[paywall-modal] stored YK payment ID (direct): ${directId}`);
    } else {
      const ykUrl = new URL(confirmationUrl);
      const fromUrl = ykUrl.searchParams.get("orderId");
      if (fromUrl && /^[0-9a-f-]{36}$/i.test(fromUrl)) {
        ykPaymentId = fromUrl;
        console.log(`[paywall-modal] stored YK payment ID (from URL): ${fromUrl}`);
      }
    }

    if (ykPaymentId) {
      sessionStorage.setItem(`yk-payment:${ourOrderId}`, ykPaymentId);
    }

    // Также сохраняем «последний платёж» — на случай, если super-task не включит orderId в return_url
    sessionStorage.setItem("latest-payment-orderId", ourOrderId);
    sessionStorage.setItem("latest-payment-ykId",   ykPaymentId ?? "");
    sessionStorage.setItem("latest-payment-time",   Date.now().toString());
    console.log(`[paywall-modal] stored latest-payment: orderId=${ourOrderId} ykId=${ykPaymentId}`);
  } catch (e) {
    console.warn("[paywall-modal] could not store YK payment ID:", e);
  }
}

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleTitle?: string;
  userId?: string;
  userEmail?: string;
  accessToken?: string;
}

const PERKS = [
  { icon: <BookOpen className="w-4 h-4" />, text: "22 продвинутых модуля" },
  { icon: <Bot className="w-4 h-4" />,      text: "AI-ассистент без ограничений" },
  { icon: <Trophy className="w-4 h-4" />,   text: "Финальный экзамен + сертификат" },
  { icon: <Zap className="w-4 h-4" />,      text: "Все инструменты и тренажёры" },
  { icon: <Star className="w-4 h-4" />,     text: "Пожизненный доступ к обновлениям" },
];

export function PaywallModal({
  isOpen, onClose, moduleTitle, userId, userEmail, accessToken,
}: PaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "lifetime" | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const { formatKzt, formatRub, getPlanPriceRub, rates, loading: ratesLoading } = useCurrencyRates();

  // ── Месячный тариф ────────────────────────────────────────────────────────
  const handleMonthly = async () => {
    if (!userId || !userEmail) {
      window.open("https://t.me/ohh_lessya", "_blank");
      return;
    }

    setError(null);
    setLoadingPlan("monthly");

    const plan = PRICING_PLANS.monthly;
    // Используем динамическую рублёвую цену от ЦБ РФ; fallback — фиксированная
    const rubPrice = getPlanPriceRub("monthly") ?? plan.priceRub;

    try {
      const body = {
        amount:      rubPrice.toFixed(2),
        description: plan.description,
        orderId:     `month_${Date.now()}`,
        email:       userEmail,
        plan:        plan.planId,
        userId,
        accessToken,
        accessDays:  plan.accessDays,
        appUrl:      "https://www.product-intensive.com",
      };

      // ── [PRICE-CHECK] Debug log ──────────────────────────────────────────
      console.log(`[paywall-modal] Выбран тариф: "${plan.title}"`);
      console.log(`[paywall-modal] Цена по курсу ЦБ: ${rubPrice} руб (${plan.priceUsd}$ x ${rates?.rub?.toFixed(2) ?? "?"})`);
      console.log(`[paywall-modal] Сумма в YooKassa: ${body.amount} руб`);
      console.log(`[paywall-modal] [ID-CHECK] userId sent to super-task (monthly) = "${userId}"`);
      console.log(`[paywall-modal] [ID-CHECK] userEmail = "${userEmail}"`);
      console.log(`[paywall-modal] [ID-CHECK] accessToken present = ${!!accessToken}`);
      console.log("[payment] monthly →", { ...body, accessToken: accessToken ? "[PRESENT]" : "[MISSING]" });

      const res = await fetch(PAYMENT_PROXY_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${accessToken ?? publicAnonKey}`,
          "x-site-key":    "rediska210426",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => "");
        throw new Error(`Не JSON (${res.status}): ${text.slice(0, 200)}`);
      });

      console.log("[payment] monthly ответ:", res.status, data);

      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);

      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");

      storeYookassaPaymentId(body.orderId, url, data);

      window.location.href = url;
    } catch (err: any) {
      console.error("[payment] monthly ошибка:", err);
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoadingPlan(null);
    }
  };

  // ── Вечный тариф ─────────────────────────────────────────────────────────
  const handleLifetime = async () => {
    if (!userId || !userEmail) {
      window.open("https://t.me/ohh_lessya", "_blank");
      return;
    }

    setError(null);
    setLoadingPlan("lifetime");

    const plan = PRICING_PLANS.lifetime;
    // Используем динамическую рублёвую цену от ЦБ РФ; fallback — фиксированная
    const rubPrice = getPlanPriceRub("lifetime") ?? plan.priceRub;

    try {
      const body = {
        amount:      rubPrice.toFixed(2),
        description: plan.description,
        orderId:     `lifetime_${Date.now()}`,
        email:       userEmail,
        plan:        plan.planId,
        userId,
        accessToken,
        accessDays:  plan.accessDays,
        appUrl:      "https://www.product-intensive.com",
      };

      // ── [PRICE-CHECK] Debug log ──────────────────────────────────────────
      console.log(`[paywall-modal] Выбран тариф: "${plan.title}"`);
      console.log(`[paywall-modal] Цена по курсу ЦБ: ${rubPrice} руб (${plan.priceUsd}$ x ${rates?.rub?.toFixed(2) ?? "?"})`);
      console.log(`[paywall-modal] Сумма в YooKassa: ${body.amount} руб`);
      console.log(`[paywall-modal] [ID-CHECK] userId sent to super-task (lifetime) = "${userId}"`);
      console.log(`[paywall-modal] [ID-CHECK] userEmail = "${userEmail}"`);
      console.log(`[paywall-modal] [ID-CHECK] accessToken present = ${!!accessToken}`);
      console.log("[payment] lifetime →", { ...body, accessToken: accessToken ? "[PRESENT]" : "[MISSING]" });

      const res = await fetch(PAYMENT_PROXY_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${accessToken ?? publicAnonKey}`,
          "x-site-key":    "rediska210426",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => "");
        throw new Error(`Не JSON (${res.status}): ${text.slice(0, 200)}`);
      });

      console.log("[payment] lifetime ответ:", res.status, data);

      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);

      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");

      storeYookassaPaymentId(body.orderId, url, data);

      window.location.href = url;
    } catch (err: any) {
      console.error("[payment] lifetime ошибка:", err);
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoadingPlan(null);
    }
  };

  const isLoading = loadingPlan !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Top gradient banner */}
            <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 px-6 pt-6 pb-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[0.75rem]">Закрытый раздел</p>
                  <h2 className="text-white font-bold text-[1.0625rem] leading-tight">
                    {moduleTitle ? `«${moduleTitle}»` : "Этот модуль"}
                  </h2>
                </div>
              </div>

              <div className="bg-white/15 rounded-xl px-4 py-3">
                <p className="text-white text-[0.875rem] font-medium">
                  Первые 3 урока — <span className="text-emerald-200">бесплатно</span> 🎉
                </p>
                <p className="text-white/70 text-[0.75rem] mt-0.5">
                  Для доступа ко всем модулям и урокам нужен полный доступ
                </p>
              </div>
            </div>

            {/* Perks */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-[0.8125rem] font-semibold text-foreground mb-3">Что входит в полный доступ:</p>
              <div className="space-y-2">
                {PERKS.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                      {p.icon}
                    </div>
                    <span className="text-[0.8125rem] text-foreground/80">{p.text}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mt-3 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[0.75rem] text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Pricing */}
            <div className="px-6 pt-4 pb-6 space-y-3">

              {/* ── Early-bird banner ── */}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-4 py-3 text-center">
                <p className="text-[0.7rem] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">🔥 Специальная цена ранней регистрации</p>
                <p className="text-[0.75rem] text-amber-700 dark:text-amber-300 leading-snug">
                  Старт нового потока — <span className="font-bold">6 мая</span>.<br/>
                  Первым оплатившим откроем подготовительные модули уже сейчас!
                </p>
              </div>

              <p className="text-[0.75rem] text-muted-foreground text-center mb-1">
                Выберите тариф или свяжитесь напрямую:{" "}
                <a
                  href="https://t.me/ohh_lessya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2AABEE] hover:underline font-semibold"
                >@ohh_lessya</a>
              </p>

              {/* ── Доступ на месяц ── */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                onClick={handleMonthly}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                  border-2 border-teal-200 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/20
                  hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/40 transition-all group
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="text-left flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {loadingPlan === "monthly"
                      ? <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                      : <CreditCard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    }
                    <p className="text-[0.875rem] font-semibold text-foreground">Доступ на месяц</p>
                  </div>
                  <p className="text-[0.75rem] text-muted-foreground ml-5">
                    {loadingPlan === "monthly" ? "Переход к оплате..." : "30 дней полного доступа"}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[0.6875rem] text-muted-foreground/50 line-through leading-none mb-0.5">${PRICING_PLANS.monthly.oldPriceUsd}</p>
                  <p className="text-[1.125rem] font-bold text-teal-600 dark:text-teal-400 leading-none">${PRICING_PLANS.monthly.priceUsd}</p>
                  <p className="text-[0.6rem] text-amber-500 font-semibold mt-0.5">{PRICING_PLANS.monthly.badge}</p>
                  <div className="mt-1 space-y-0.5 text-right">
                    <p className="text-[0.6rem] text-teal-700 dark:text-teal-300 font-bold leading-none">
                      {ratesLoading
                        ? "..."
                        : (getPlanPriceRub("monthly") ?? PRICING_PLANS.monthly.priceRub).toLocaleString("ru-RU") + " \u20bd"}
                    </p>
                    {!ratesLoading && (
                      <p className="text-[0.6rem] text-muted-foreground/60 leading-none">{formatKzt(PRICING_PLANS.monthly.priceUsd)}</p>
                    )}
                  </div>
                </div>
              </motion.button>

              {/* ── Вечный доступ ── */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                onClick={handleLifetime}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                  border-2 border-emerald-400 dark:border-emerald-600
                  bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30
                  hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50
                  transition-all relative group shadow-sm
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute -top-2.5 left-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[0.625rem] font-bold tracking-wide uppercase">
                    Лучшая цена
                  </span>
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {loadingPlan === "lifetime"
                      ? <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                      : <Infinity className="w-3.5 h-3.5 text-emerald-600" />
                    }
                    <p className="text-[0.875rem] font-semibold text-foreground">Вечный доступ</p>
                  </div>
                  <p className="text-[0.75rem] text-muted-foreground ml-5">
                    {loadingPlan === "lifetime" ? "Переход к оплате..." : "Раз и навсегда, все обновления"}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[0.6875rem] text-muted-foreground/50 line-through leading-none mb-0.5">${PRICING_PLANS.lifetime.oldPriceUsd}</p>
                  <p className="text-[1.125rem] font-bold text-emerald-600 dark:text-emerald-400 leading-none">${PRICING_PLANS.lifetime.priceUsd}</p>
                  <p className="text-[0.6rem] text-amber-500 font-semibold mt-0.5">{PRICING_PLANS.lifetime.badge}</p>
                  <div className="mt-1 space-y-0.5 text-right">
                    <p className="text-[0.6rem] text-emerald-700 dark:text-emerald-300 font-bold leading-none">
                      {ratesLoading
                        ? "..."
                        : (getPlanPriceRub("lifetime") ?? PRICING_PLANS.lifetime.priceRub).toLocaleString("ru-RU") + " \u20bd"}
                    </p>
                    {!ratesLoading && (
                      <p className="text-[0.6rem] text-muted-foreground/60 leading-none">{formatKzt(PRICING_PLANS.lifetime.priceUsd)}</p>
                    )}
                  </div>
                </div>
              </motion.button>

              {/* Payment badge */}
              <div className="flex items-center justify-center gap-1.5 text-[0.6875rem] text-muted-foreground/50">
                <CreditCard className="w-3 h-3" />
                <span>Оплата через ЮKassa — карты РФ, СБП, кошельки</span>
              </div>

              <p className="text-center text-[0.6875rem] text-muted-foreground/50 pt-1">
                После оплаты перезайдите — доступ активируется автоматически
              </p>

              {/* Free lessons button */}
              <button
                onClick={onClose}
                className="w-full mt-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700
                  text-[0.8125rem] text-muted-foreground hover:text-foreground
                  hover:bg-slate-50 dark:hover:bg-slate-800/50
                  transition-all duration-200"
              >
                Смотреть бесплатные уроки
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}