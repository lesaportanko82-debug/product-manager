import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import {
  X, Mail, Lock, User, LogIn, UserPlus, Loader2, CheckCircle,
  AlertCircle, LogOut, Cloud, CloudOff, KeyRound, ArrowLeft
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
const supabaseUrl = `https://${projectId}.supabase.co`;

// Singleton Supabase client — stored on window to survive HMR re-imports
function getSupabase() {
  const win = window as any;
  if (!win.__pmSupabaseClient) {
    win.__pmSupabaseClient = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        // STRICT ISOLATION: no session persistence between page reloads.
        // Every visit requires fresh login — prevents account sharing via link.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return win.__pmSupabaseClient as ReturnType<typeof createClient>;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  accessToken: string | null;
}

export function useAuth() {
  // STRICT ISOLATION: always start unauthenticated — never restore from localStorage
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    name: null,
    accessToken: null,
  });

  const updateAuth = useCallback((state: AuthState) => {
    setAuthState(state);
    try {
      localStorage.setItem("auth-state", JSON.stringify(state));
      // Keep user-name key in sync so all components see the same name
      if (state.name) {
        localStorage.setItem("user-name", state.name);
      } else if (!state.isAuthenticated) {
        localStorage.removeItem("user-name");
      }
    } catch {}
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch {}
    updateAuth({ isAuthenticated: false, userId: null, email: null, name: null, accessToken: null });
  }, [updateAuth]);

  // Check existing session on mount
  const checkSession = useCallback(async (): Promise<AuthState | null> => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        const user = data.session.user;
        const newState: AuthState = {
          isAuthenticated: true,
          userId: user.id,
          email: user.email || null,
          name: user.user_metadata?.name || user.email?.split("@")[0] || null,
          accessToken: data.session.access_token,
        };
        updateAuth(newState);

        // Link session to user
        const sessionId = localStorage.getItem("exam-session-id");
        if (sessionId) {
          fetch(`${API_BASE}/link-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
            body: JSON.stringify({ sessionId, userId: user.id }),
          }).catch(() => {});
        }
        return newState;
      }
    } catch {}
    return null;
  }, [updateAuth]);

  return { authState, updateAuth, signOut, checkSession };
}

// Save user progress to Supabase
export async function saveProgressToSupabase(
  accessToken: string,
  userId: string,
  completedLessons: string[],
  bookmarks: string[],
  examScore: number | null
) {
  try {
    const sessionId = localStorage.getItem("exam-session-id");
    await fetch(`${API_BASE}/user-progress/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ completedLessons, bookmarks, examScore, sessionId }),
    });
  } catch {}
}

// Load user progress from Supabase
export async function loadProgressFromSupabase(
  accessToken: string,
  userId: string
): Promise<{ completedLessons: string[]; bookmarks: string[]; examScore: number | null } | null> {
  try {
    const res = await fetch(`${API_BASE}/user-progress/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const { progress } = await res.json();
    return progress;
  } catch {
    return null;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (state: AuthState, isNewUser: boolean) => void;
  showCloseButton?: boolean;
}

export function AuthModal({ isOpen, onClose, onAuth, showCloseButton = true }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      // Now sign in
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

      onAuth(authState, true);  // NEW user — signup
      setSuccess("Регистрация успешна!");
      setTimeout(onClose, 800);
    } catch (err) {
      setError(`Ошибка: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [email, password, name, onAuth, onClose]);

  const handleSignIn = useCallback(async () => {
    if (!email || !password) { setError("Заполните email и пароль"); return; }

    setLoading(true);
    setError("");

    try {
      const supabase = getSupabase();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

      if (signInErr) { setError(`Ошибка входа: ${signInErr.message}`); setLoading(false); return; }

      const user = data.session?.user;

      // Check if user is blocked
      if (user?.id) {
        try {
          const blockRes = await fetch(`${API_BASE}/check-access/${user.id}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          if (blockRes.ok) {
            const { blocked } = await blockRes.json();
            if (blocked) {
              await supabase.auth.signOut();
              setError("Ваш аккаунт заблокирован администратором. Обратитесь в поддержку.");
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

      if (user?.id) {
        try {
          const sessionRes = await fetch(`${API_BASE}/user-session/${user.id}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          if (sessionRes.ok) {
            const { mapping } = await sessionRes.json();
            if (mapping?.sessionId && mapping.sessionId !== sessionId) {
              localStorage.setItem("exam-session-id", mapping.sessionId);
            }
          }
        } catch {}
      }

      onAuth(authState, false);  // EXISTING user — login
      setSuccess("Вход выполнен!");
      setTimeout(onClose, 800);
    } catch (err) {
      setError(`Ошибка: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [email, password, onAuth, onClose]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={showCloseButton ? onClose : undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div className="flex items-center gap-2">
                {mode === "forgot" && (
                  <button
                    onClick={() => { setMode("login"); resetForm(); }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-muted-foreground mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-lg font-bold text-foreground">
                  {mode === "login" ? "Вход в аккаунт" : mode === "signup" ? "Регистрация" : "Забыли пароль?"}
                </h2>
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="px-6 text-[0.75rem] text-muted-foreground mb-4">
              {mode === "login"
                ? "Войдите для синхронизации прогресса между устройствами"
                : mode === "signup"
                ? "Создайте аккаунт для сохранения прогресса в облаке"
                : "Введите email и новый пароль для входа"
              }
            </p>

            <div className="px-6 pb-6 space-y-3">
              {/* Name (signup only) */}
              {mode === "signup" && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700 dark:border-slate-600
                      text-[0.8125rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700 dark:border-slate-600
                    text-[0.8125rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                />
              </div>

              {/* Password (login & signup) */}
              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleSignIn() : handleSignUp())}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700 dark:border-slate-600
                      text-[0.8125rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                  />
                </div>
              )}

              {/* Forgot password link */}
              {mode === "login" && (
                <div className="text-right">
                  <button
                    onClick={() => { setMode("forgot"); resetForm(); }}
                    className="text-[0.75rem] text-teal-600 hover:underline"
                  >
                    Забыли пароль?
                  </button>
                </div>
              )}

              {/* New password fields (forgot mode) */}
              {mode === "forgot" && (
                <>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="password"
                      placeholder="Новый пароль"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700 dark:border-slate-600
                        text-[0.8125rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="password"
                      placeholder="Повторите пароль"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-700 dark:border-slate-600
                        text-[0.8125rem] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    />
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[0.75rem]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[0.75rem]">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={mode === "login" ? handleSignIn : mode === "signup" ? handleSignUp : handleForgotPassword}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  bg-teal-500 text-white text-[0.8125rem] font-medium hover:bg-teal-600
                  disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "login" ? (
                  <><LogIn className="w-4 h-4" /> Войти</>
                ) : mode === "signup" ? (
                  <><UserPlus className="w-4 h-4" /> Зарегистрироваться</>
                ) : (
                  <><KeyRound className="w-4 h-4" /> С��енить пароль</>
                )}
              </button>

              {/* Switch mode */}
              {mode !== "forgot" && (
                <p className="text-center text-[0.75rem] text-muted-foreground">
                  {mode === "login" ? (
                    <>Нет аккаунта? <button onClick={() => { setMode("signup"); resetForm(); }} className="text-teal-600 font-medium hover:underline">Зарегистрироваться</button></>
                  ) : (
                    <>Уже есть аккаунт? <button onClick={() => { setMode("login"); resetForm(); }} className="text-teal-600 font-medium hover:underline">Войти</button></>
                  )}
                </p>
              )}


            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Small sync status indicator for sidebar
 */
export function SyncStatusBadge({
  authState,
  onOpenAuth,
  onSignOut,
}: {
  authState: AuthState;
  onOpenAuth: () => void;
  onSignOut: () => void;
}) {
  if (authState.isAuthenticated) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
        <Cloud className="w-3.5 h-3.5 text-emerald-500" />
        <div className="flex-1 min-w-0">
          <p className="text-[0.6875rem] font-medium text-emerald-700 truncate">{authState.name || authState.email}</p>
          <p className="text-[0.5625rem] text-emerald-500">Синхронизация вкл.</p>
        </div>
        <button
          onClick={onSignOut}
          className="p-1 rounded hover:bg-emerald-100 transition-colors"
          title="Выйти"
        >
          <LogOut className="w-3 h-3 text-emerald-500" />
        </button>
      </div>
    );
  }

  return null;
}