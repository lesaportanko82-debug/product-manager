import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import {
  Mail, Lock, User, LogIn, UserPlus, Loader2, CheckCircle,
  AlertCircle, KeyRound, ArrowLeft, GraduationCap, Sparkles,
  BookOpen, Trophy, Brain, Repeat, Bot, Zap, ShieldCheck,
} from "lucide-react";
import type { AuthState } from "./auth-modal";
import { PrivacyPolicyModal } from "./privacy-policy";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
const supabaseUrl = `https://${projectId}.supabase.co`;

function getSupabase() {
  const win = window as any;
  if (!win.__pmSupabaseClient) {
    win.__pmSupabaseClient = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return win.__pmSupabaseClient as ReturnType<typeof createClient>;
}

const FEATURES = [
  { icon: <Brain className="w-4 h-4" />, text: "AI-коуч разбирает ваши кейсы" },
  { icon: <Repeat className="w-4 h-4" />, text: "Spaced repetition запоминает лучше" },
  { icon: <Trophy className="w-4 h-4" />, text: "Геймификация: бейджи и уровни" },
  { icon: <Bot className="w-4 h-4" />, text: "Сова-ассистент всегда рядом" },
  { icon: <BookOpen className="w-4 h-4" />, text: "60+ уроков по 38 модулям" },
  { icon: <Zap className="w-4 h-4" />, text: "Прогресс синхронизируется в облаке" },
];

interface AuthPageProps {
  onAuth: (state: AuthState, isNewUser: boolean) => void;
  onAdmin: () => void;
  onBack?: () => void;
}

export function AuthPage({ onAuth, onAdmin, onBack }: AuthPageProps) {
  // Default to login if returning from payment, otherwise signup for new visitors
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(() => {
    try {
      if (localStorage.getItem("pending-payment-banner") === "success") return "login";
    } catch {}
    return "signup";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const resetForm = () => {
    setError("");
    setSuccess("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSignUp = useCallback(async () => {
    if (!email || !password) { setError("Заполните email и пароль"); return; }
    if (password.length < 6) { setError("Пароль должен быть минимум 6 символов"); return; }
    if (!privacyAccepted) { setError("Необходимо принять политику конфиденциальности"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, password, name: name || email.split("@")[0] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка регистрации"); setLoading(false); return; }

      const supabase = getSupabase();
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setError(`Регистрация успешна, но ошибка входа: ${signInErr.message}`); setLoading(false); return; }

      const user = signInData.session?.user;
      const authState: AuthState = {
        isAuthenticated: true,
        userId: user?.id || null,
        email: user?.email || email,
        name: name || email.split("@")[0],
        accessToken: signInData.session?.access_token || null,
      };

      const sessionId = localStorage.getItem("exam-session-id");
      if (sessionId && user?.id) {
        fetch(`${API_BASE}/link-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ sessionId, userId: user.id }),
        }).catch(() => {});
      }

      setSuccess("Аккаунт создан! Добро пожаловать 🎉");
      setTimeout(() => onAuth(authState, true), 900);
    } catch (err) {
      setError(`Ошибка: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [email, password, name, onAuth, privacyAccepted]);

  const handleSignIn = useCallback(async () => {
    if (!email || !password) { setError("Заполните email и пароль"); return; }
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabase();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setError(`Ошибка входа: ${signInErr.message}`); setLoading(false); return; }

      const user = data.session?.user;
      if (user?.id) {
        try {
          const blockRes = await fetch(`${API_BASE}/check-access/${user.id}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          if (blockRes.ok) {
            const { blocked } = await blockRes.json();
            if (blocked) {
              await supabase.auth.signOut();
              setError("Ваш аккаунт заблокирован администратором.");
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      const authState: AuthState = {
        isAuthenticated: true,
        userId: user?.id || null,
        email: user?.email || email,
        name: user?.user_metadata?.name || email.split("@")[0],
        accessToken: data.session?.access_token || null,
      };

      const sessionId = localStorage.getItem("exam-session-id");
      if (sessionId && user?.id) {
        fetch(`${API_BASE}/link-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ sessionId, userId: user.id }),
        }).catch(() => {});
      }

      setSuccess("Вход выполнен! Загружаем ваш прогресс...");
      setTimeout(() => onAuth(authState, false), 900);
    } catch (err) {
      setError(`Ошибка: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [email, password, onAuth]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) { setError("Введите ваш email"); return; }
    if (!newPassword) { setError("Введите новый пароль"); return; }
    if (newPassword.length < 6) { setError("Пароль должен быть минимум 6 символов"); return; }
    if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка сброса пароля"); setLoading(false); return; }
      setSuccess("Пароль успешно изменён! Войдите с новым паролем.");
      setTimeout(() => { setMode("login"); resetForm(); }, 2000);
    } catch (err) {
      setError(`Ошибка: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [email, newPassword, confirmPassword]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "login") handleSignIn();
      else if (mode === "signup") handleSignUp();
      else if (mode === "forgot") handleForgotPassword();
    }
  };

  const cardTitle =
    mode === "login" ? "Вход в аккаунт"
    : mode === "signup" ? "Создать аккаунт"
    : "Сброс пароля";

  const cardSubtitle =
    mode === "login" ? "Введите данные для входа и продолжите обучение"
    : mode === "signup" ? "Зарегистрируйтесь, чтобы сохранять прогресс в облаке"
    : "Введите email и установите новый пароль";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-teal-950/20 dark:to-slate-900 flex">
      {/* Left panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col bg-gradient-to-br from-teal-600 via-emerald-700 to-cyan-700 p-10 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-emerald-400/10 blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-[1.0625rem]">Продакт-менеджмент</span>
          </div>

          <div className="mb-10">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Создайте аккаунт и начните учиться
            </h1>
            <p className="text-white/70 text-[0.9375rem] leading-relaxed">
              Прогресс, заметки и бейджи сохранятся в облаке - учитесь с любого устройства.
            </p>
          </div>

          <div className="space-y-3 mb-auto">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
                  {f.icon}
                </div>
                <span className="text-white/85 text-[0.875rem]">{f.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/15">
            <div className="flex items-center gap-2 text-white/50 text-[0.75rem]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Первые 2 модуля - бесплатно 🎉</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-foreground text-[1rem]">Продакт-менеджмент</span>
        </div>

        {/* Back button */}
        {onBack && (
          <div className="w-full max-w-[400px] mb-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Назад к выбору доступа
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[400px]"
        >
          {/* Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-black/30 border border-border/40 overflow-hidden">
            {/* Header */}
            <div className="px-7 pt-7 pb-5">
              <div className="flex items-center gap-2 mb-1">
                {mode === "forgot" && (
                  <button
                    onClick={() => { setMode("login"); resetForm(); }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-muted-foreground -ml-1 mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-xl font-bold text-foreground">{cardTitle}</h2>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground">{cardSubtitle}</p>
            </div>

            <div className="px-7 pb-7 space-y-3">
              {/* Name (signup) */}
              <AnimatePresence>
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative pb-0.5">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        placeholder="Ваше имя"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600
                          text-[0.875rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600
                    text-[0.875rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                />
              </div>

              {/* Password */}
              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600
                      text-[0.875rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                  />
                </div>
              )}

              {/* Forgot link */}
              {mode === "login" && (
                <div className="text-right -mt-1">
                  <button
                    onClick={() => { setMode("forgot"); resetForm(); }}
                    className="text-[0.75rem] text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Забыли пароль?
                  </button>
                </div>
              )}

              {/* New password fields */}
              {mode === "forgot" && (
                <>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="password"
                      placeholder="Новый пароль"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600
                        text-[0.875rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="password"
                      placeholder="Повторите пароль"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600
                        text-[0.875rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                    />
                  </div>
                </>
              )}

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[0.8125rem]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[0.8125rem]"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                onClick={mode === "login" ? handleSignIn : mode === "signup" ? handleSignUp : handleForgotPassword}
                disabled={loading || !!success || (mode === "signup" && !privacyAccepted)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[0.9375rem] font-semibold
                  hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all shadow-md shadow-teal-500/20 hover:-translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "login" ? (
                  <><LogIn className="w-4 h-4" /> Войти</>
                ) : mode === "signup" ? (
                  <><UserPlus className="w-4 h-4" /> Зарегистрироваться</>
                ) : (
                  <><KeyRound className="w-4 h-4" /> Сменить пароль</>
                )}
              </button>

              {/* Privacy checkbox — signup only */}
              {mode === "signup" && (
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => { setPrivacyAccepted(e.target.checked); setError(""); }}
                    className="mt-0.5 w-4 h-4 rounded accent-teal-600 cursor-pointer shrink-0"
                  />
                  <span className="text-[0.75rem] text-muted-foreground leading-relaxed">
                    Я соглашаюсь с{" "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrivacy(true); }}
                      className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                    >
                      политикой конфиденциальности
                    </button>
                  </span>
                </label>
              )}

              {/* Switch mode */}
              {mode !== "forgot" && (
                <p className="text-center text-[0.8125rem] text-muted-foreground">
                  {mode === "login" ? (
                    <>Нет аккаунта?{" "}
                      <button onClick={() => { setMode("signup"); resetForm(); }} className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                        Зарегистрироваться
                      </button>
                    </>
                  ) : (
                    <>Уже есть аккаунт?{" "}
                      <button onClick={() => { setMode("login"); resetForm(); }} className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                        Войти
                      </button>
                    </>
                  )}
                </p>
              )}

              {/* Admin button */}
              <div className="pt-2 border-t border-border/20">
                <button
                  onClick={onAdmin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-[0.8125rem] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Войти как администратор
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}