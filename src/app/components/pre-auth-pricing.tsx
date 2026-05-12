import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, Loader2, Eye, Mail, ArrowRight, Infinity,
  Calendar, AlertCircle, Lock, BookOpen, Bot, Trophy, Zap,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { PRICING_PLANS, formatPriceRub } from "./pricing-plans";
import { useCurrencyRates } from "./use-currency-rates";
import { PrivacyPolicyModal } from "./privacy-policy";

const PAYMENT_PROXY_URL = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/payment/init`;

const PERKS = [
  { icon: <BookOpen className="w-3.5 h-3.5" />, text: "38 модулей · 60+ уроков" },
  { icon: <Bot className="w-3.5 h-3.5" />,      text: "AI-ассистент Ёжуня" },
  { icon: <Trophy className="w-3.5 h-3.5" />,   text: "Сертификат по окончании" },
  { icon: <Zap className="w-3.5 h-3.5" />,      text: "Все тренажёры и симуляторы" },
];

interface PreAuthPricingProps {
  onDemo: () => void;
  onLogin: () => void;
}

export function PreAuthPricing({ onDemo, onLogin }: PreAuthPricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "lifetime" | null>(null);
  const [email, setEmail]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy]   = useState(false);
  const { getPlanPriceRub, rates, loading: ratesLoading } = useCurrencyRates();

  const monthlyRub = getPlanPriceRub("monthly") ?? PRICING_PLANS.monthly.priceRub;
  const lifetimeRub = getPlanPriceRub("lifetime") ?? PRICING_PLANS.lifetime.priceRub;

  const handlePay = async () => {
    if (!selectedPlan) return;
    if (!email.trim() || !email.includes("@")) {
      setError("Введите корректный email для получения чека");
      return;
    }

    setError(null);
    setLoading(true);

    const plan      = PRICING_PLANS[selectedPlan];
    const rubPrice  = getPlanPriceRub(selectedPlan) ?? plan.priceRub;
    const guestId   = "preauth_" + Date.now();
    const orderId   = `${plan.planId}_${Date.now()}`;

    try {
      // Сохраняем для страницы успешной оплаты и регистрации
      sessionStorage.setItem("pre-auth-email",    email.trim().toLowerCase());
      sessionStorage.setItem("pre-auth-plan",     plan.planId);
      sessionStorage.setItem("pre-auth-guest-id", guestId);
      sessionStorage.setItem("latest-payment-orderId", orderId);
      sessionStorage.setItem("latest-payment-time",    Date.now().toString());

      const body = {
        amount:      rubPrice.toFixed(2),
        description: plan.description,
        orderId,
        email:       email.trim(),
        plan:        plan.planId,
        userId:      guestId,
        accessDays:  plan.accessDays,
        appUrl:      "https://www.product-intensive.com",
      };

      console.log(`[pre-auth-pricing] plan=${plan.planId} email=${email.trim()} amount=${rubPrice}`);

      const res = await fetch(PAYMENT_PROXY_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
          "x-site-key":    "rediska210426",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => "");
        throw new Error(`Не JSON (${res.status}): ${text.slice(0, 200)}`);
      });

      console.log("[pre-auth-pricing] ответ:", res.status, data);

      if (!res.ok) throw new Error(data.error || data.message || `Ошибка ${res.status}`);

      const url = data.confirmationUrl;
      if (!url) throw new Error("confirmationUrl отсутствует в ответе");

      window.location.href = url;
    } catch (err: any) {
      console.error("[pre-auth-pricing] ошибка:", err);
      setError(err.message ?? "Ошибка соединения — попробуйте ещё раз");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950 flex flex-col items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/50">
            <span className="text-3xl">🦔</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">PM Академия</h1>
          <p className="text-muted-foreground">60+ уроков, AI-коуч и сертификат продакт-менеджера</p>

          {/* Perks */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {PERKS.map((p, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-border/40 text-[0.75rem] text-muted-foreground shadow-sm"
              >
                <span className="text-teal-500">{p.icon}</span>
                {p.text}
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Monthly */}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => { setSelectedPlan("monthly"); setError(null); }}
            className={`relative p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedPlan === "monthly"
                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-lg shadow-teal-100/60 dark:shadow-teal-900/30"
                : "border-border bg-card hover:border-teal-300 dark:hover:border-teal-600"
            }`}
          >
            {selectedPlan === "monthly" && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-[0.75rem] font-medium text-muted-foreground mb-1 uppercase tracking-wide">На месяц</p>
            <p className="text-xl font-bold text-foreground leading-none">${PRICING_PLANS.monthly.priceUsd}</p>
            <p className="text-[0.7rem] text-muted-foreground/70 mt-0.5 leading-none">
              {ratesLoading ? "..." : `≈ ${formatPriceRub(monthlyRub)}`}
            </p>
            <p className="text-[0.75rem] text-muted-foreground mt-1">30 дней доступа</p>
          </motion.button>

          {/* Lifetime */}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => { setSelectedPlan("lifetime"); setError(null); }}
            className={`relative p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedPlan === "lifetime"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shadow-lg shadow-emerald-100/60 dark:shadow-emerald-900/30"
                : "border-border bg-card hover:border-emerald-300 dark:hover:border-emerald-600"
            }`}
          >
            {/* Badge */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-[0.65rem] font-bold text-white shadow whitespace-nowrap">
              ★ Выгоднее
            </div>
            {selectedPlan === "lifetime" && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
              <Infinity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[0.75rem] font-medium text-muted-foreground mb-1 uppercase tracking-wide">Навсегда</p>
            <p className="text-xl font-bold text-foreground leading-none">${PRICING_PLANS.lifetime.priceUsd}</p>
            <p className="text-[0.7rem] text-muted-foreground/70 mt-0.5 leading-none">
              {ratesLoading ? "..." : `≈ ${formatPriceRub(lifetimeRub)}`}
            </p>
            <p className="text-[0.75rem] text-muted-foreground mt-1">вечный доступ</p>
          </motion.button>
        </div>

        {/* Email input (shown when plan selected) */}
        <AnimatePresence>
          {selectedPlan && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={e => { if (e.key === "Enter") handlePay(); }}
                  placeholder="Ваш email — для чека и доступа"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-3 mb-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-700/40 text-red-700 dark:text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pay button */}
        <AnimatePresence>
          {selectedPlan && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3"
            >
              <button
                onClick={handlePay}
                disabled={loading || !email.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-[0.9375rem] transition-all shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Переходим к оплате...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Перейти к оплате
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo button */}
        <button
          onClick={onDemo}
          className="w-full py-3.5 rounded-2xl border border-border bg-card hover:bg-accent text-foreground font-medium text-sm transition-all flex items-center justify-center gap-2 mb-6"
        >
          <Eye className="w-4 h-4 text-muted-foreground" />
          Попробовать бесплатно (3 урока)
        </button>

        {/* ── CIS Payment Block ── */}
        <div className="rounded-2xl overflow-hidden border border-teal-100 dark:border-teal-800/40 bg-gradient-to-br from-slate-50 to-teal-50/60 dark:from-slate-800/60 dark:to-teal-900/20 relative mb-6">
          {/* Decorative right side */}
          <div className="absolute right-0 top-0 bottom-0 w-36 flex items-center justify-center pointer-events-none overflow-hidden">
            <div
              className="absolute w-32 h-32 rounded-full border-2 border-dashed border-teal-300/30 dark:border-teal-500/20"
              style={{ right: "-20px", top: "50%", transform: "translateY(-50%)" }}
            />
            <div
              className="absolute w-20 h-20 rounded-full border border-dashed border-teal-300/40 dark:border-teal-500/30"
              style={{ right: "-4px", top: "50%", transform: "translateY(-50%)" }}
            />
            <div
              className="absolute w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
              style={{
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "linear-gradient(135deg, #4dd9c0 0%, #20b2aa 50%, #0891b2 100%)",
              }}
            >
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <div className="absolute w-2 h-2 rounded-full bg-teal-400/50" style={{ right: "10px", top: "20px" }} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300/40" style={{ right: "80px", bottom: "18px" }} />
          </div>

          <div className="relative px-5 py-5 pr-36">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-700/50 bg-white/70 dark:bg-teal-900/30 mb-3">
              <svg className="w-3 h-3 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-[0.65rem] font-semibold text-teal-600 dark:text-teal-400">KZ · BY · СНГ</span>
            </div>

            {/* Heading */}
            <p className="text-[0.8125rem] font-bold text-foreground leading-snug mb-1.5">
              Для оплаты из Казахстана,<br />Беларуси и других стран СНГ<br />
              <span className="text-muted-foreground font-medium">(кроме России)</span>
            </p>

            {/* Description */}
            <p className="text-[0.7375rem] text-muted-foreground leading-relaxed mb-4">
              Напишите в поддержку Telegram —<br />поможем подобрать удобный способ оплаты.
            </p>

            {/* Telegram button */}
            <a
              href="https://t.me/ohh_lessya"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[0.8125rem] text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(90deg, #20b2aa 0%, #0891b2 100%)" }}
            >
              <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Написать в Telegram
              <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>

            {/* Security note */}
            <div className="flex items-center gap-1.5 mt-3">
              <svg className="w-3 h-3 text-teal-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <span className="text-[0.65rem] text-muted-foreground/60">Ваши данные и платежи в безопасности</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <button
            onClick={onLogin}
            className="text-sm text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            Уже есть аккаунт? Войти →
          </button>
          <p className="text-xs text-muted-foreground">
            Нажимая «Перейти к оплате», вы соглашаетесь с{" "}
            <button
              onClick={() => setShowPrivacy(true)}
              className="underline hover:text-foreground transition-colors"
            >
              политикой конфиденциальности
            </button>
          </p>
        </div>
      </motion.div>

      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}