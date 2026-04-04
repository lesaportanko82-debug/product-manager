import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, BookOpen, RefreshCw, MessageCircle, AlertCircle, Sparkles } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface PaymentSuccessPageProps {
  invId?: string | null;
  onGoToCourse: () => void;
}

type CheckStatus = "checking" | "paid" | "pending" | "error";

const PLAN_LABELS: Record<string, string> = {
  monthly: "Доступ на 30 дней",
  lifetime: "Вечный доступ",
};

export function PaymentSuccessPage({ invId, onGoToCourse }: PaymentSuccessPageProps) {
  const [checkStatus, setCheckStatus] = useState<CheckStatus>(invId ? "checking" : "paid");
  const [plan, setPlan] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 12;

  useEffect(() => {
    if (!invId) {
      setCheckStatus("paid");
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const pollStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/payment/status?invoiceId=${invId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.status === "paid") {
          setPlan(data.plan || null);
          setCheckStatus("paid");
          return;
        }

        if (data.status === "failed") {
          setCheckStatus("error");
          return;
        }

        // Still pending — retry
        attempt++;
        setAttempts(attempt);
        if (attempt >= maxAttempts) {
          setCheckStatus("pending"); // give up polling, assume pending
          return;
        }
        setTimeout(pollStatus, 2500);
      } catch {
        if (cancelled) return;
        attempt++;
        setAttempts(attempt);
        if (attempt >= maxAttempts) {
          setCheckStatus("pending");
          return;
        }
        setTimeout(pollStatus, 3000);
      }
    };

    pollStatus();
    return () => { cancelled = true; };
  }, [invId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-border/20">

          {/* Header */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-6 pt-8 pb-10 text-center overflow-hidden">
            <div className="absolute top-3 right-4 opacity-20">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="absolute bottom-3 left-3 opacity-10">
              <Sparkles className="w-14 h-14 text-white" />
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.45, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur mx-auto mb-4 flex items-center justify-center"
            >
              {checkStatus === "checking" ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : checkStatus === "paid" ? (
                <CheckCircle2 className="w-10 h-10 text-white" />
              ) : checkStatus === "pending" ? (
                <AlertCircle className="w-10 h-10 text-white" />
              ) : (
                <AlertCircle className="w-10 h-10 text-white" />
              )}
            </motion.div>

            <h1 className="text-white font-bold text-2xl leading-tight">
              {checkStatus === "checking"
                ? "Проверяем оплату..."
                : checkStatus === "paid"
                ? "Оплата прошла успешно! 🎉"
                : checkStatus === "pending"
                ? "Оплата обрабатывается"
                : "Статус оплаты неизвестен"}
            </h1>

            {checkStatus === "paid" && plan && (
              <div className="mt-2 inline-block bg-white/20 backdrop-blur rounded-full px-3 py-1">
                <span className="text-white/90 text-sm font-medium">{PLAN_LABELS[plan] || plan}</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-4">
            {checkStatus === "checking" && (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ожидаем подтверждение от платёжной системы...</span>
                </div>
                {attempts > 3 && (
                  <p className="text-xs text-muted-foreground/60">
                    Это может занять до 30 секунд. Пожалуйста, не закрывайте страницу.
                  </p>
                )}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                    initial={{ width: "5%" }}
                    animate={{ width: `${Math.min(95, (attempts / maxAttempts) * 100 + 5)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {checkStatus === "paid" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3.5">
                  <p className="text-[0.9rem] text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                    ✅ Доступ к курсу активирован!
                  </p>
                  <p className="text-[0.8125rem] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                    Войдите в свой аккаунт, чтобы начать обучение. Все 24 модуля и 60+ уроков уже ждут вас.
                  </p>
                </div>

                <button
                  onClick={onGoToCourse}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl
                    bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600
                    text-white font-semibold text-[1rem] transition-all shadow-lg shadow-teal-500/25
                    active:scale-[0.98]"
                >
                  <BookOpen className="w-5 h-5" />
                  Перейти в курс
                </button>
              </motion.div>
            )}

            {checkStatus === "pending" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3.5">
                  <p className="text-[0.875rem] text-amber-800 dark:text-amber-300 font-medium">
                    ⏳ Платёж обрабатывается
                  </p>
                  <p className="text-[0.8125rem] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Подтверждение от Робокассы ещё не получено. Доступ активируется автоматически в течение нескольких минут. Войдите в аккаунт и обновите страницу.
                  </p>
                </div>

                <button
                  onClick={onGoToCourse}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[0.9375rem] transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  Войти в аккаунт
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    border border-border hover:bg-slate-50 dark:hover:bg-slate-800
                    text-foreground/80 text-[0.875rem] transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Проверить ещё раз
                </button>
              </motion.div>
            )}

            {checkStatus === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3.5">
                  <p className="text-[0.875rem] text-red-700 dark:text-red-400 leading-relaxed">
                    Произошла ошибка при обработке платежа. Свяжитесь с администратором для помощи.
                  </p>
                </div>
                <button
                  onClick={onGoToCourse}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600
                    text-white font-semibold text-[0.9375rem] transition-all"
                >
                  Вернуться в курс
                </button>
              </motion.div>
            )}

            {/* Telegram help */}
            <div className="pt-1 border-t border-border/40">
              <button
                onClick={() => window.open("https://t.me/ohh_lessya", "_blank")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors
                  hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <MessageCircle className="w-4 h-4 text-[#2AABEE]" />
                Нужна помощь?{" "}
                <span className="text-[#2AABEE] font-medium">@ohh_lessya</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          product-intensive.com.website.yandexcloud.net - Обучение продакт-менеджменту
        </p>
      </motion.div>
    </div>
  );
}