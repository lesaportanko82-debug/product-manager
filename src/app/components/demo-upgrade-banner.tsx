import { motion } from "motion/react";
import {
  BookOpen, Trophy, Bot, Zap, Star,
  CheckCircle2, ArrowRight, Infinity, Loader2,
  CreditCard, AlertCircle, Lock, Sparkles, UserPlus
} from "lucide-react";
import { useState } from "react";
import { PrivacyPolicyModal } from "./privacy-policy";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { PRICING_PLANS, formatPriceRub, toPaymentAmount } from "./pricing-plans";
import { useCurrencyRates } from "./use-currency-rates";

// ─── Платежи через make-server прокси (site-key добавляется на сервере) ────
const PAYMENT_PROXY_URL = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/payment/init`;

const PERKS = [
  { icon: <BookOpen className="w-4 h-4" />, text: "38 модулей, 60+ уроков по продакт-менеджменту" },
  { icon: <Bot className="w-4 h-4" />, text: "AI-ассистент Ёжуня без ограничений" },
  { icon: <Trophy className="w-4 h-4" />, text: "Финальный экзамен + именной сертификат" },
  { icon: <Zap className="w-4 h-4" />, text: "Все тренажёры, симуляторы и практические инструменты" },
  { icon: <Star className="w-4 h-4" />, text: "Пожизненный доступ ко всем обновлениям курса" },
];

interface DemoUpgradeBannerProps {
  onGoToSignup?: () => void;
  userId?: string;
  userEmail?: string;
  accessToken?: string;
}

export function DemoUpgradeBanner({ onGoToSignup, userId, userEmail, accessToken }: DemoUpgradeBannerProps) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "lifetime" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { getPlanPriceRub } = useCurrencyRates();

  const isLoggedIn = !!(userId && userEmail);
  const isLoading = loadingPlan !== null;

  const handleMonthly = async () => {
    if (!isLoggedIn) { onGoToSignup?.(); return; }
    setError(null);
    setLoadingPlan("monthly");
    const plan = PRICING_PLANS.monthly;
    const rubPrice = getPlanPriceRub("monthly") ?? plan.priceRub;
    try {
      const body = {
        amount: rubPrice.toFixed(2),
        description: plan.description,
        orderId: `month_${Date.now()}`,
        email: userEmail,
        plan: plan.planId,
        userId,
        accessToken,
        accessDays: plan.accessDays,
        appUrl: "https://www.product-intensive.com",
      };
      console.log(`[demo-banner] Выбран тариф: "${plan.title}"`);
      console.log(`[demo-banner] Цена по курсу ЦБ: ${rubPrice} руб (${plan.priceUsd}$)`);
      console.log(`[demo-banner] Сумма в YooKassa: ${body.amount} руб`);
      console.log(`[demo-banner] accessToken present = ${!!accessToken}`);
      const res = await fetch(PAYMENT_PROXY_URL, {
        method: "POST",
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
      console.log("[demo-banner] monthly ответ:", res.status, data);
      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);
      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoadingPlan(null);
    }
  };

  const handleLifetime = async () => {
    if (!isLoggedIn) { onGoToSignup?.(); return; }
    setError(null);
    setLoadingPlan("lifetime");
    const plan = PRICING_PLANS.lifetime;
    const rubPrice = getPlanPriceRub("lifetime") ?? plan.priceRub;
    try {
      const body = {
        amount: rubPrice.toFixed(2),
        description: plan.description,
        orderId: `lifetime_${Date.now()}`,
        email: userEmail,
        plan: plan.planId,
        userId,
        accessToken,
        accessDays: plan.accessDays,
        appUrl: "https://www.product-intensive.com",
      };
      console.log(`[demo-banner] Выбран тариф: "${plan.title}"`);
      console.log(`[demo-banner] Цена по курсу ЦБ: ${rubPrice} руб (${plan.priceUsd}$)`);
      console.log(`[demo-banner] Сумма в YooKassa: ${body.amount} руб`);
      console.log(`[demo-banner] accessToken present = ${!!accessToken}`);
      const res = await fetch(PAYMENT_PROXY_URL, {
        method: "POST",
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
      console.log("[demo-banner] lifetime ответ:", res.status, data);
      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);
      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoadingPlan(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
      className="mt-6 rounded-2xl overflow-hidden border border-border/30 shadow-xl"
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 px-6 pt-7 pb-8">
        <div className="absolute top-4 right-5 opacity-20">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="absolute bottom-3 left-4 opacity-10">
          <Lock className="w-16 h-16 text-white" />
        </div>

        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <span className="text-2xl">🦔</span>
          </div>
          <div>
            <p className="text-white/70 text-[0.75rem] font-medium uppercase tracking-wider">Демо завершено</p>
            <h2 className="text-white font-bold text-[1.125rem] leading-tight mt-0.5">
              Вы изучили весь бесплатный блок!
            </h2>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3.5 border border-white/10 relative">
          <p className="text-white font-semibold text-[0.9375rem]">
            Впереди ещё <span className="text-emerald-200">35 модулей</span> и 50+ уроков 🚀
          </p>
          <p className="text-white/70 text-[0.8125rem] mt-1 leading-relaxed">
            Получите полный доступ и продолжите обучение с того места, где остановились
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 px-6 pt-5 pb-6">
        {/* What's included */}
        <p className="text-[0.8125rem] font-semibold text-foreground mb-3">Что входит в полный доступ:</p>
        <div className="space-y-2.5 mb-5">
          {PERKS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
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

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[0.8125rem] text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
          </motion.div>
        )}

        {/* If demo (no account) → show signup CTA prominently */}
        {!isLoggedIn ? (
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoToSignup}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold text-[0.9375rem] hover:from-teal-700 hover:to-emerald-700 transition-all shadow-lg shadow-teal-500/25 hover:-translate-y-0.5 group"
            >
              <UserPlus className="w-5 h-5" />
              Зарегистрироваться и получить доступ
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
            <p className="text-center text-[0.75rem] text-muted-foreground">
              Уже есть аккаунт?{" "}
              <button
                onClick={onGoToSignup}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
              >
                Войти
              </button>
            </p>
          </div>
        ) : (
          /* Logged-in demo user (edge case) → show pricing */
          <div className="space-y-3">
            <p className="text-[0.75rem] text-muted-foreground text-center mb-2 font-medium">
              Выберите тариф или свяжитесь:{" "}
              <a href="https://t.me/ohh_lessya" target="_blank" rel="noopener noreferrer" className="text-[#2AABEE] hover:underline font-semibold">
                @ohh_lessya
              </a>
            </p>

            {/* Monthly */}
            <motion.button
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              onClick={handleMonthly}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-teal-200 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/20 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/40 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  {loadingPlan === "monthly"
                    ? <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                    : <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  <p className="text-[0.9375rem] font-semibold text-foreground">Доступ на месяц</p>
                </div>
                <p className="text-[0.75rem] text-muted-foreground mt-0.5 ml-6">
                  {loadingPlan === "monthly" ? "Переход к оплате..." : "30 дней полного доступа ко всему курсу"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-[1.25rem] font-bold text-teal-600 dark:text-teal-400">
                  {(getPlanPriceRub("monthly") ?? PRICING_PLANS.monthly.priceRub).toLocaleString("ru-RU") + " \u20bd"}
                </p>
                <p className="text-[0.6875rem] text-muted-foreground/60">{PRICING_PLANS.monthly.label}</p>
              </div>
            </motion.button>

            {/* Lifetime */}
            <motion.button
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              onClick={handleLifetime}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 transition-all relative shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                    : <Infinity className="w-4 h-4 text-emerald-600" />}
                  <p className="text-[0.9375rem] font-semibold text-foreground">Вечный доступ</p>
                </div>
                <p className="text-[0.75rem] text-muted-foreground mt-0.5 ml-6">
                  {loadingPlan === "lifetime" ? "Переход к оплате..." : "Навсегда, все обновления включены"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-[1.25rem] font-bold text-emerald-600 dark:text-emerald-400">
                  {(getPlanPriceRub("lifetime") ?? PRICING_PLANS.lifetime.priceRub).toLocaleString("ru-RU") + " \u20bd"}
                </p>
                <p className="text-[0.6875rem] text-muted-foreground/60">{PRICING_PLANS.lifetime.label}</p>
              </div>
            </motion.button>

            <div className="flex items-center justify-center gap-1.5 text-[0.6875rem] text-muted-foreground/60 py-1">
              <CreditCard className="w-3 h-3" />
              <span>Оплата через ЮKassa — карты РФ, СБП, кошельки</span>
            </div>
          </div>
        )}

        {/* Privacy */}
        <p className="text-center text-[0.6875rem] text-muted-foreground/40 pt-3">
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

      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </motion.div>
  );
}