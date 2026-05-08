import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, Loader2, BookOpen, RefreshCw,
  MessageCircle, AlertCircle, XCircle, Sparkles,
  Mail, Lock, User, Eye, EyeOff, ArrowRight, UserPlus,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { createClient } from "@supabase/supabase-js";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
const FAIL_URL = "https://www.product-intensive.com/payment-fail";
// Max age for sessionStorage "latest-payment" fallback: 15 minutes
const MAX_SESSION_AGE_MS = 15 * 60 * 1000;

interface PaymentSuccessPageProps {
  invId?:   string | null;
  orderId?: string | null;
  onGoToCourse: () => void;
}

type CheckStatus = "checking" | "paid" | "pending" | "failed";

const PLAN_LABELS: Record<string, string> = {
  month:    "Доступ на 30 дней",
  monthly:  "Доступ на 30 дней",
  lifetime: "Вечный доступ",
};

/** Read the stored latest-payment from sessionStorage if it's recent enough */
function readLatestPayment(): { orderId: string; ykId: string } | null {
  try {
    const storedTime = parseInt(sessionStorage.getItem("latest-payment-time") ?? "0", 10);
    if (!storedTime || Date.now() - storedTime > MAX_SESSION_AGE_MS) return null;
    const orderId = sessionStorage.getItem("latest-payment-orderId") ?? "";
    const ykId    = sessionStorage.getItem("latest-payment-ykId")    ?? "";
    if (!orderId) return null;
    return { orderId, ykId };
  } catch {
    return null;
  }
}

export function PaymentSuccessPage({ invId, orderId, onGoToCourse }: PaymentSuccessPageProps) {
  // Always start in "checking" — NEVER default to "paid" without verifying
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("checking");
  const [plan, setPlan]       = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 15;
  const redirected  = useRef(false);

  // ── Registration form state ────────────────────────────────────────────────
  const [regEmail,    setRegEmail]    = useState(() => {
    try { return sessionStorage.getItem("pre-auth-email") || ""; } catch { return ""; }
  });
  const [regPassword, setRegPassword] = useState("");
  const [regName,     setRegName]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [regLoading,  setRegLoading]  = useState(false);
  const [regError,    setRegError]    = useState("");
  const [regDone,     setRegDone]     = useState(false);
  const reservedRef = useRef(false);

  const redirectToFail = () => {
    if (redirected.current) return;
    redirected.current = true;
    window.location.href = FAIL_URL;
  };

  useEffect(() => {
    let cancelled = false;
    let attempt   = 0;

    // ── Resolve which IDs we're working with ──────────────────────────────
    // 1. Use props (from URL query params) if available
    // 2. Fall back to sessionStorage "latest-payment" if URL has no params
    //    (happens when super-task doesn't include orderId in return_url)
    let resolvedOrderId = orderId ?? null;
    let resolvedInvId   = invId   ?? null;

    // Try to get the YooKassa UUID stored before the payment redirect
    let ykPaymentId: string | null = resolvedOrderId
      ? (sessionStorage.getItem(`yk-payment:${resolvedOrderId}`) || null)
      : null;

    // If nothing in URL, try the global "latest-payment" fallback
    if (!resolvedOrderId && !resolvedInvId) {
      const latest = readLatestPayment();
      if (latest) {
        resolvedOrderId = latest.orderId;
        ykPaymentId     = latest.ykId || null;
        console.log(
          `[payment-success] no URL params — recovered from sessionStorage: orderId=${resolvedOrderId} ykId=${ykPaymentId}`
        );
      }
    }

    console.log(
      `[payment-success] start — invId=${resolvedInvId} orderId=${resolvedOrderId} ykPaymentId=${ykPaymentId}`
    );

    // If STILL nothing to check → this page was opened manually or unexpectedly.
    // Show "failed" quickly and redirect to fail page.
    if (!resolvedOrderId && !resolvedInvId) {
      console.log("[payment-success] no payment ID found anywhere → redirect to fail");
      setTimeout(() => {
        if (!cancelled) redirectToFail();
      }, 1000);
      setCheckStatus("failed");
      return;
    }

    const poll = async () => {
      try {
        let url: string;

        if (resolvedInvId) {
          // Robokassa / our own YooKassa flow
          url = `${API_BASE}/payment/status?invoiceId=${encodeURIComponent(resolvedInvId)}`;
        } else if (ykPaymentId) {
          // Best path: direct lookup by YooKassa payment UUID
          url = `${API_BASE}/payment/check-yookassa?paymentId=${encodeURIComponent(ykPaymentId)}`;
        } else {
          // Fallback: search by orderId in KV / YooKassa API
          url = `${API_BASE}/payment/check-order?orderId=${encodeURIComponent(resolvedOrderId!)}`;
        }

        const res  = await fetch(url, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        const status: string = (data.status ?? "unknown").toLowerCase();
        console.log(
          `[payment-success] poll #${attempt} url=${url.split("?")[0].split("/").pop()} status=${status}`
        );

        // ── SUCCESS ────────────────────────────────────────────────────────
        if (status === "paid" || status === "completed" || status === "succeeded") {
          setPlan(data.plan ?? null);
          setCheckStatus("paid");
          if (resolvedOrderId) sessionStorage.removeItem(`yk-payment:${resolvedOrderId}`);
          sessionStorage.removeItem("latest-payment-orderId");
          sessionStorage.removeItem("latest-payment-ykId");
          sessionStorage.removeItem("latest-payment-time");

          // Reserve access by email so signup endpoint can grant it
          if (!reservedRef.current) {
            reservedRef.current = true;
            const savedEmail = (() => { try { return sessionStorage.getItem("pre-auth-email") || ""; } catch { return ""; } })();
            const savedPlan  = (() => { try { return sessionStorage.getItem("pre-auth-plan") || (data.plan ?? ""); } catch { return ""; } })();
            if (savedEmail) {
              fetch(`${API_BASE}/payment/reserve-by-email`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${publicAnonKey}` },
                body:    JSON.stringify({ email: savedEmail, plan: savedPlan }),
              }).then(r => r.json()).then(d =>
                console.log("[payment-success] reserve-by-email:", d)
              ).catch(e =>
                console.warn("[payment-success] reserve-by-email error:", e)
              );
            }
          }
          return;
        }

        // ── FAILED / CANCELLED ─────────────────────────────────────────────
        if (
          status === "failed" || status === "canceled" ||
          status === "cancelled" || status === "rejected"
        ) {
          setCheckStatus("failed");
          if (resolvedOrderId) sessionStorage.removeItem(`yk-payment:${resolvedOrderId}`);
          sessionStorage.removeItem("latest-payment-orderId");
          sessionStorage.removeItem("latest-payment-ykId");
          sessionStorage.removeItem("latest-payment-time");
          // Brief pause so user sees the message, then redirect
          setTimeout(() => { if (!cancelled) redirectToFail(); }, 1500);
          return;
        }

        // ── PENDING / UNKNOWN — retry ──────────────────────────────────────
        attempt++;
        setAttempts(attempt);

        if (attempt >= maxAttempts) {
          // We've been waiting ~40 seconds and still can't confirm.
          // If we have a real YooKassa UUID → genuine processing delay (bank slow)
          // If we only have orderId/fallback → likely a cancellation we can't confirm
          if (ykPaymentId) {
            // Real UUID found but status still pending → probably slow bank processing
            setCheckStatus("pending");
          } else {
            // No UUID → can't verify → treat as fail (most likely cancellation)
            setCheckStatus("failed");
            setTimeout(() => { if (!cancelled) redirectToFail(); }, 1500);
          }
          return;
        }

        // Back-off: 2.5s for first 5 attempts, then 4s
        setTimeout(poll, attempt < 6 ? 2500 : 4000);
      } catch (err) {
        if (cancelled) return;
        attempt++;
        setAttempts(attempt);
        if (attempt >= maxAttempts) {
          setCheckStatus("pending");
          return;
        }
        setTimeout(poll, 3000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, []); // run once on mount

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const gradientBg =
    checkStatus === "paid"     ? "from-emerald-500 via-teal-500 to-cyan-600"
    : checkStatus === "failed" ? "from-red-500 via-rose-500 to-pink-600"
    : checkStatus === "pending" ? "from-amber-500 via-orange-500 to-yellow-600"
    : "from-blue-500 via-indigo-500 to-violet-600"; // checking

  const headerTitle =
    checkStatus === "checking" ? "Проверяем оплату..."
    : checkStatus === "paid"   ? "Оплата прошла успешно! 🎉"
    : checkStatus === "failed" ? "Платёж не прошёл"
    : "Оплата обрабатывается";

  const HeaderIcon = () => {
    if (checkStatus === "checking") return <Loader2 className="w-10 h-10 text-white animate-spin" />;
    if (checkStatus === "paid")     return <CheckCircle2 className="w-10 h-10 text-white" />;
    if (checkStatus === "failed")   return <XCircle className="w-10 h-10 text-white" />;
    return <AlertCircle className="w-10 h-10 text-white" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-border/20">

          {/* Header */}
          <div className={`relative bg-gradient-to-br ${gradientBg} px-6 pt-8 pb-10 text-center overflow-hidden`}>
            <div className="absolute top-3 right-4 opacity-20 pointer-events-none">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="absolute bottom-3 left-3 opacity-10 pointer-events-none">
              <Sparkles className="w-14 h-14 text-white" />
            </div>

            <motion.div
              key={checkStatus}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur mx-auto mb-4 flex items-center justify-center"
            >
              <HeaderIcon />
            </motion.div>

            <motion.h1
              key={headerTitle}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white font-bold text-2xl leading-tight"
            >
              {headerTitle}
            </motion.h1>

            {checkStatus === "paid" && plan && (
              <div className="mt-2 inline-block bg-white/20 backdrop-blur rounded-full px-3 py-1">
                <span className="text-white/90 text-sm font-medium">
                  {PLAN_LABELS[plan] ?? plan}
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-4">

            {/* ── checking ───────────────────────────────────────────────── */}
            {checkStatus === "checking" && (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ожидаем подтверждение от платёжной системы...</span>
                </div>
                {attempts > 3 && (
                  <p className="text-xs text-muted-foreground/60">
                    Это может занять до 30 секунд. Не закрывайте страницу.
                  </p>
                )}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                    initial={{ width: "5%" }}
                    animate={{ width: `${Math.min(95, (attempts / maxAttempts) * 100 + 5)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* ── paid ───────────────────────────────────────────────────── */}
            {checkStatus === "paid" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3.5">
                  <p className="text-[0.9rem] text-emerald-800 dark:text-emerald-300 font-medium">
                    ✅ Доступ к курсу оплачен!
                  </p>
                  <p className="text-[0.8125rem] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                    Создайте аккаунт ниже — доступ активируется автоматически.
                  </p>
                </div>

                {/* Registration form */}
                {!regDone ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-teal-500" />
                      Создайте аккаунт для входа в курс
                    </p>

                    {/* Name */}
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Ваше имя (необязательно)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Придумайте пароль (мин. 6 символов)"
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {regError && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/70 dark:border-red-700/40 text-red-700 dark:text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {regError}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        if (!regEmail.trim() || !regPassword) {
                          setRegError("Заполните email и пароль"); return;
                        }
                        if (regPassword.length < 6) {
                          setRegError("Пароль должен быть минимум 6 символов"); return;
                        }
                        setRegLoading(true);
                        setRegError("");
                        try {
                          // Signup
                          const signupRes = await fetch(`${API_BASE}/signup`, {
                            method:  "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${publicAnonKey}` },
                            body:    JSON.stringify({ email: regEmail.trim(), password: regPassword, name: regName.trim() || regEmail.split("@")[0] }),
                          });
                          const signupData = await signupRes.json();
                          if (!signupRes.ok) throw new Error(signupData.error || "Ошибка регистрации");

                          // Auto-login
                          const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
                          const { error: loginErr } = await supabase.auth.signInWithPassword({
                            email: regEmail.trim(),
                            password: regPassword,
                          });
                          if (loginErr) throw new Error(loginErr.message);

                          // Clear sessionStorage pre-auth flags
                          try {
                            sessionStorage.removeItem("pre-auth-email");
                            sessionStorage.removeItem("pre-auth-plan");
                            sessionStorage.removeItem("pre-auth-guest-id");
                          } catch {}

                          setRegDone(true);
                        } catch (err: any) {
                          setRegError(err.message ?? "Ошибка — попробуйте ещё раз");
                        } finally {
                          setRegLoading(false);
                        }
                      }}
                      disabled={regLoading}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-[0.9375rem] transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {regLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Создаём аккаунт...</>
                      ) : (
                        <><UserPlus className="w-4 h-4" />Создать аккаунт и войти<ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>

                    <p className="text-center text-xs text-muted-foreground">
                      Уже есть аккаунт?{" "}
                      <a href="/" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">
                        Войти →
                      </a>
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3.5 text-center">
                      <p className="text-teal-800 dark:text-teal-300 font-semibold text-sm">🎉 Аккаунт создан!</p>
                      <p className="text-teal-700 dark:text-teal-400 text-xs mt-1">Полный доступ активирован</p>
                    </div>
                    <button
                      onClick={() => { window.location.href = "/"; }}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-[1rem] transition-all shadow-lg shadow-teal-500/25 active:scale-[0.98]"
                    >
                      <BookOpen className="w-5 h-5" />
                      Перейти в курс
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── failed ─────────────────────────────────────────────────── */}
            {checkStatus === "failed" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3.5">
                  <p className="text-[0.875rem] text-red-700 dark:text-red-400 font-medium">
                    ❌ Платёж не прошёл или был отменён
                  </p>
                  <p className="text-[0.8125rem] text-red-600 dark:text-red-400/80 mt-1 leading-relaxed">
                    Перенаправляем на страницу с деталями...
                  </p>
                </div>
                <button
                  onClick={redirectToFail}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-red-600 hover:bg-red-700 text-white font-semibold text-[0.9375rem] transition-all"
                >
                  Перейти к деталям
                </button>
              </motion.div>
            )}

            {/* ── pending (slow bank, real UUID found but still processing) ─ */}
            {checkStatus === "pending" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3.5">
                  <p className="text-[0.875rem] text-amber-800 dark:text-amber-300 font-medium">
                    ⏳ Платёж ещё обрабатывается
                  </p>
                  <p className="text-[0.8125rem] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Подтверждение от банка ещё не получено. Доступ активируется автоматически в течение нескольких минут — войдите в аккаунт и обновите страницу.
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
          www.product-intensive.com — Обучение продакт-менеджменту
        </p>
      </motion.div>
    </div>
  );
}