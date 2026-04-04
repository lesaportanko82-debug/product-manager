import { useState } from "react";
import { motion } from "motion/react";
import {
  Lock, MessageCircle, Infinity, CheckCircle2, Zap,
  BookOpen, Trophy, Bot, Star, ArrowLeft, Sparkles, Loader2, CreditCard, AlertCircle,
} from "lucide-react";

// ─── Прямой вызов super-task (без make-server) ──────────────────────────────
const SUPER_TASK_URL = "https://bjhsgjsxhvwtuerahuha.supabase.co/functions/v1/super-task";
const SITE_KEY = "super_secret_12345";

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

  const handleTelegram = () => window.open("https://t.me/ohh_lessya", "_blank");

  // ── Месячный доступ ────────────────────────────────────────────────────────
  const handleMonthly = async () => {
    if (!userId || !userEmail) { handleTelegram(); return; }

    setError(null);
    setLoadingPlan("monthly");

    try {
      const body = {
        amount:      "100.00",
        description: "Доступ на месяц",
        orderId:     `month_${Date.now()}`,
        email:       userEmail,
        plan:        "month",
        userId,
        accessDays:  30,
      };

      // ── [ID-CHECK] Log userId being sent to super-task ──────────────────
      console.log(`[paywall-screen] [ID-CHECK] userId sent to super-task (monthly) = "${userId}"`);
      console.log(`[paywall-screen] [ID-CHECK] userEmail = "${userEmail}"`);
      console.log("[paywall-screen] monthly →", body);

      const res = await fetch(SUPER_TASK_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-site-key": SITE_KEY },
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
        amount:      "100.00",
        description: "Вечный доступ",
        orderId:     `lifetime_${Date.now()}`,
        email:       userEmail,
        plan:        "lifetime",
        userId,
        accessDays:  null,
      };

      // ── [ID-CHECK] Log userId being sent to super-task ──────────────────
      console.log(`[paywall-screen] [ID-CHECK] userId sent to super-task (lifetime) = "${userId}"`);
      console.log(`[paywall-screen] [ID-CHECK] userEmail = "${userEmail}"`);
      console.log("[paywall-screen] lifetime →", body);

      const res = await fetch(SUPER_TASK_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-site-key": SITE_KEY },
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
                  {moduleTitle ? `«${moduleTitle}»` : "Этот модуль закрыт"}
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
                <p className="text-[1.25rem] font-bold text-teal-600 dark:text-teal-400">7000₽</p>
                <p className="text-[0.6875rem] text-muted-foreground/60">/ месяц</p>
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
                <p className="text-[1.25rem] font-bold text-emerald-600 dark:text-emerald-400">9000₽</p>
                <p className="text-[0.6875rem] text-muted-foreground/60">навсегда</p>
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
