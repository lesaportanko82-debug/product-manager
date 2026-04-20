import { useState } from "react";
import { motion } from "motion/react";
import {
  Lock, MessageCircle, Infinity, CheckCircle2, Zap,
  BookOpen, Trophy, Bot, Star, ArrowLeft, Sparkles, Loader2, CreditCard, AlertCircle,
} from "lucide-react";
import { PrivacyPolicyModal } from "./privacy-policy";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { useCurrencyRates } from "./use-currency-rates";

// ─── Платежи через make-server прокси (site-key добавляется на сервере) ────
const PAYMENT_PROXY_URL = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/payment/init`;

/**
 * Extracts the YooKassa internal payment UUID from the confirmationUrl
 * (YooKassa puts its own payment ID in the `orderId` query param of the checkout URL)
 * and persists the mapping ourOrderId → ykPaymentId in sessionStorage so that
 * payment-success.tsx can do a direct API lookup after the redirect-back.
 */
function storeYookassaPaymentId(ourOrderId: string, confirmationUrl: string, responseData: any) {
  try {
    // Check if super-task returned the payment ID directly
    const directId = responseData?.paymentId || responseData?.payment_id || responseData?.id;
    let ykPaymentId: string | null = null;

    if (directId && /^[0-9a-f-]{36}$/i.test(directId)) {
      ykPaymentId = directId;
      console.log(`[paywall] stored YK payment ID (direct): ${directId} for orderId: ${ourOrderId}`);
    } else {
      // Extract from YooKassa checkout URL: https://yoomoney.ru/.../contract?orderId={UUID}
      const ykUrl = new URL(confirmationUrl);
      const fromUrl = ykUrl.searchParams.get("orderId");
      if (fromUrl && /^[0-9a-f-]{36}$/i.test(fromUrl)) {
        ykPaymentId = fromUrl;
        console.log(`[paywall] stored YK payment ID (from URL): ${fromUrl} for orderId: ${ourOrderId}`);
      }
    }

    if (ykPaymentId) {
      sessionStorage.setItem(`yk-payment:${ourOrderId}`, ykPaymentId);
    }

    // Always store the latest payment info so payment-success.tsx can recover
    // even if super-task doesn't include orderId in the return_url
    sessionStorage.setItem("latest-payment-orderId", ourOrderId);
    sessionStorage.setItem("latest-payment-ykId",   ykPaymentId ?? "");
    sessionStorage.setItem("latest-payment-time",   Date.now().toString());
    console.log(`[paywall] stored latest-payment: orderId=${ourOrderId} ykId=${ykPaymentId}`);
  } catch (e) {
    console.warn("[paywall] could not store YK payment ID:", e);
  }
}

interface PaywallScreenProps {
  moduleTitle?: string;
  onBack: () => void;
  userId?: string;
  userEmail?: string;
  accessToken?: string;
}

const PERKS = [
  { icon: <BookOpen className="w-4 h-4" />, text: "24 модуля, 60+ уроков по продакт-менеджменту" },
  { icon: <Bot className="w-4 h-4" />,      text: "AI-ассистент Совунья без ограничений" },
  { icon: <Trophy className="w-4 h-4" />,   text: "Финальный экзамен + именной сертификат" },
  { icon: <Zap className="w-4 h-4" />,      text: "Все тренажёры, симуляторы и инструменты" },
  { icon: <Star className="w-4 h-4" />,     text: "Пожизненный доступ ко всем обновлениям" },
];

export function PaywallScreen({ moduleTitle, onBack, userId, userEmail }: PaywallScreenProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "lifetime" | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { formatRub, formatKzt, loading: ratesLoading } = useCurrencyRates();

  const handleTelegram = () => window.open("https://t.me/ohh_lessya", "_blank");

  // ── Месячный доступ ────────────────────────────────────────────────────────
  const handleMonthly = async () => {
    if (!userId || !userEmail) { handleTelegram(); return; }

    setError(null);
    setLoadingPlan("monthly");

    try {
      const body = {
        amount:      "7000.00",
        description: "Доступ на месяц",
        orderId:     `month_${Date.now()}`,
        email:       userEmail,
        plan:        "month",
        userId,
        accessDays:  30,
        appUrl:      "https://www.product-intensive.com",
      };

      // ── [ID-CHECK] Log userId being sent to super-task ──────────────────
      console.log(`[paywall-screen] [ID-CHECK] userId sent to super-task (monthly) = "${userId}"`);
      console.log(`[paywall-screen] [ID-CHECK] userEmail = "${userEmail}"`);
      console.log("[paywall-screen] monthly →", body);

      const res = await fetch(PAYMENT_PROXY_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${publicAnonKey}` },
        body:    JSON.stringify(body),
      });

      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => "");
        throw new Error(`Не JSON (${res.status}): ${text.slice(0, 200)}`);
      });

      console.log("[paywall-screen] monthly ответ:", res.status, data);

      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);

      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");

      // Extract YooKassa payment UUID from confirmationUrl and store for status lookup on return
      storeYookassaPaymentId(body.orderId, url, data);

      window.location.href = url;
    } catch (err: any) {
      console.error("[paywall-screen] monthly ошибка:", err);
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoadingPlan(null);
    }
  };

  // ── Вечный доступ ──────────────────────────────────────────────────────────
  const handleLifetime = async () => {
    if (!userId || !userEmail) { handleTelegram(); return; }

    setError(null);
    setLoadingPlan("lifetime");

    try {
      const body = {
        amount:      "9000.00",
        description: "Вечный доступ",
        orderId:     `lifetime_${Date.now()}`,
        email:       userEmail,
        plan:        "lifetime",
        userId,
        accessDays:  null,
        appUrl:      "https://www.product-intensive.com",
      };

      // ── [ID-CHECK] Log userId being sent to super-task ──────────────────
      console.log(`[paywall-screen] [ID-CHECK] userId sent to super-task (lifetime) = "${userId}"`);
      console.log(`[paywall-screen] [ID-CHECK] userEmail = "${userEmail}"`);
      console.log("[paywall-screen] lifetime →", body);

      const res = await fetch(PAYMENT_PROXY_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${publicAnonKey}` },
        body:    JSON.stringify(body),
      });

      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => "");
        throw new Error(`Не JSON (${res.status}): ${text.slice(0, 200)}`);
      });

      console.log("[paywall-screen] lifetime ответ:", res.status, data);

      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);

      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");

      storeYookassaPaymentId(body.orderId, url, data);

      window.location.href = url;
    } catch (err: any) {
      console.error("[paywall-screen] lifetime ошибка:", err);
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoadingPlan(null);
    }
  };

  const isLoading = loadingPlan !== null;

  return (
    <div className="flex-1 min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onBack}
          className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground hover:text-foreground mb-6 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Вернуться к бесплатным урокам
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-border/30"
        >
          {/* Header gradient */}
          <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 px-6 pt-8 pb-10">
            <div className="absolute top-4 right-6 opacity-30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="absolute bottom-4 left-4 opacity-10">
              <Sparkles className="w-14 h-14 text-white" />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-[0.75rem] font-medium uppercase tracking-wider">Закрытый раздел</p>
                <h1 className="text-white font-bold text-[1.125rem] leading-tight mt-0.5">
                  {moduleTitle ? `«${moduleTitle}` : "Этот модуль закрыт"}
                </h1>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3.5 border border-white/10">
              <p className="text-white font-semibold text-[0.9375rem]">
                Первые 3 урока — <span className="text-emerald-200">бесплатно</span> 🎉
              </p>
              <p className="text-white/70 text-[0.8125rem] mt-1 leading-relaxed">
                Для доступа ко всем урокам, модулям и инструментам курса нужен полный доступ
              </p>
            </div>
          </div>

          {/* Perks */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-[0.8125rem] font-semibold text-foreground mb-3">Что входит в полный доступ:</p>
            <div className="space-y-2.5">
              {PERKS.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                    {p.icon}
                  </div>
                  <span className="text-[0.8125rem] text-foreground/80 flex-1">{p.text}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
            </motion.div>
          )}

          {/* Pricing */}
          <div className="px-6 pt-4 pb-7 space-y-3">

            {/* ── Early-bird banner ── */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-4 py-3.5 text-center">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">🔥 Специальная цена ранней регистрации</p>
              <p className="text-[0.8125rem] text-amber-700 dark:text-amber-300 leading-snug">
                Старт нового потока — <span className="font-bold">6 мая</span>.<br/>
                Первым оплатившим откроем подготовительные модули уже сейчас!
              </p>
            </div>

            <p className="text-[0.75rem] text-muted-foreground text-center mb-2 font-medium">
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
                <div className="flex items-center gap-2">
                  {loadingPlan === "monthly"
                    ? <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                    : <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  }
                  <p className="text-[0.9375rem] font-semibold text-foreground">Доступ на месяц</p>
                </div>
                <p className="text-[0.75rem] text-muted-foreground mt-0.5 ml-6">
                  {loadingPlan === "monthly" ? "Переход к оплате..." : "30 дней полного доступа ко всему курсу"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-[0.6875rem] text-muted-foreground/50 line-through leading-none mb-0.5">$350</p>
                <p className="text-[1.25rem] font-bold text-teal-600 dark:text-teal-400 leading-none">$85</p>
                <p className="text-[0.65rem] text-amber-500 font-bold mt-0.5">ранний доступ</p>
                {!ratesLoading && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[0.65rem] text-muted-foreground/60 leading-none">{formatRub(85)}</p>
                    <p className="text-[0.65rem] text-muted-foreground/60 leading-none">{formatKzt(85)}</p>
                  </div>
                )}
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
                transition-all relative shadow-sm
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute -top-3 left-4">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[0.625rem] font-bold tracking-wide uppercase shadow-sm">
                  Лучшая цена
                </span>
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  {loadingPlan === "lifetime"
                    ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    : <Infinity className="w-4 h-4 text-emerald-600" />
                  }
                  <p className="text-[0.9375rem] font-semibold text-foreground">Вечный доступ</p>
                </div>
                <p className="text-[0.75rem] text-muted-foreground mt-0.5 ml-6">
                  {loadingPlan === "lifetime" ? "Переход к оплате..." : "Навсегда, все обновления включены"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-[0.6875rem] text-muted-foreground/50 line-through leading-none mb-0.5">$400</p>
                <p className="text-[1.25rem] font-bold text-emerald-600 dark:text-emerald-400 leading-none">$100</p>
                <p className="text-[0.65rem] text-amber-500 font-bold mt-0.5">навсегда</p>
                {!ratesLoading && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[0.65rem] text-muted-foreground/60 leading-none">{formatRub(100)}</p>
                    <p className="text-[0.65rem] text-muted-foreground/60 leading-none">{formatKzt(100)}</p>
                  </div>
                )}
              </div>
            </motion.button>

            {/* Payment badge */}
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground/60">
                <CreditCard className="w-3 h-3" />
                <span>Оплата через ЮKassa — карты РФ, СБП, кошельки</span>
              </div>
            </div>

            <p className="text-center text-[0.6875rem] text-muted-foreground/50 pt-0.5">
              После оплаты перезайдите в аккаунт — доступ активируется автоматически
            </p>

            {/* Privacy policy note */}
            <p className="text-center text-[0.6875rem] text-muted-foreground/40 pt-1">
              Нажимая кнопку, вы соглашаетесь с{" "}
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="underline hover:text-muted-foreground/70 transition-colors"
              >
                политикой конфиденциальности
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}