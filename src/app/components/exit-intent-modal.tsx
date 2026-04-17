import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, Lock, ChevronRight, Mail, MessageSquare, LogIn } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
const SESSION_KEY = "exit-intent-shown";

// Бонусные уроки, которые открываем за фидбек (m1-l4 теперь полностью закрыт — не включаем)
const BONUS_LESSON_IDS = ["m2-l1", "m2-l2"];
const BONUS_LS_KEY = "exit-intent-bonus-unlocked";
const BONUS_EMAIL_KEY = "exit-intent-email";

// Названия бонусных уроков для success-экрана
const BONUS_LESSON_NAMES = [
  "М2 Урок 1: Что такое Transaction Cost",
  "М2 Урок 2: Главное правило развития продуктов",
];

interface ExitIntentModalProps {
  isFreeTier: boolean;
  onUpgrade: () => void;
  onUnlockLessons: (lessonIds: string[]) => void;
  onGoToLesson: (lessonId: string) => void;
  onGoToAuth?: () => void;
}

export function ExitIntentModal({ isFreeTier, onUpgrade, onGoToLesson, onGoToAuth }: ExitIntentModalProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const shownRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Храним isFreeTier в ref — чтобы читать свежее значение внутри слушателей
  // без необходимости пересоздавать их при каждом ре-рендере
  const isFreeTierRef = useRef(isFreeTier);
  useEffect(() => {
    isFreeTierRef.current = isFreeTier;
  }, [isFreeTier]);

  // ── Единственная стабильная проверка — вызывается из всех слушателей
  const tryShow = useCallback(() => {
    if (shownRef.current) return;
    if (!isFreeTierRef.current) return;
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch {}
    try { if (localStorage.getItem(BONUS_LS_KEY)) return; } catch {}
    try { if (localStorage.getItem(BONUS_EMAIL_KEY)) return; } catch {}
    shownRef.current = true;
    setVisible(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
  }, []); // пустые зависимости — функция создаётся один раз

  // ── Регистрируем ВСЕ слушатели ровно один раз при монтировании
  // Таймер не сбрасывается при ре-рендерах (isFreeTier читается из ref)
  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    const timer = setTimeout(() => {
      let lastY = window.innerHeight;

      // Desktop: мышь уходит за верхний край (к адресной строке / кнопке закрытия)
      const onMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) tryShow();
      };

      // Desktop: мышь в верхних 8px вьюпорта — дополнительный триггер
      const onMouseMove = (e: MouseEvent) => {
        const y = e.clientY;
        if (y <= 8 && lastY > 60) tryShow();
        lastY = y;
      };

      // Mobile + смена вкладки: страница уходит в фон
      const onVisibility = () => {
        if (document.visibilityState === "hidden") tryShow();
      };

      // Кнопка «назад» браузера / закрытие через hashchange / popstate
      const onPopState = () => tryShow();

      document.documentElement.addEventListener("mouseleave", onMouseLeave);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("popstate", onPopState);

      cleanupFn = () => {
        document.documentElement.removeEventListener("mouseleave", onMouseLeave);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("popstate", onPopState);
      };
    }, 3000); // 3 секунды — достаточно, чтобы страница загрузилась

    return () => {
      clearTimeout(timer);
      if (cleanupFn) cleanupFn();
    };
  }, []); // [] — эффект запускается строго один раз, таймер не сбрасывается

  // Фокус на поле при открытии
  useEffect(() => {
    if (visible && step === "form") {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [visible, step]);

  const handleClose = () => setVisible(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      setError("Напишите хотя бы пару слов — это поможет улучшить курс 🙏");
      return;
    }
    if (!email.trim()) {
      setError("Укажите e-mail, чтобы получить бонусные уроки");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      setError("Проверьте формат e-mail адреса");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await fetch(`${API_BASE}/exit-intent-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          feedback: feedback.trim(),
          page: window.location.pathname,
          ts: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[exit-intent] submit error:", err);
      // Не блокируем переход даже при сетевой ошибке
    }

    // Сохраняем email в localStorage — loadBonusAccessByEmail() использует его после входа
    const normalizedEmail = email.trim().toLowerCase();
    try { localStorage.setItem(BONUS_EMAIL_KEY, normalizedEmail); } catch {}

    setSubmittedEmail(normalizedEmail);
    setLoading(false);
    setStep("success");
  };

  const handleUpgradeClick = () => {
    setVisible(false);
    onUpgrade();
  };

  const handleGoToAuth = () => {
    setVisible(false);
    if (onGoToAuth) onGoToAuth();
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="exit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
            onClick={step === "success" ? handleClose : undefined}
          />

          {/* Modal */}
          <motion.div
            key="exit-modal"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top gradient bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                  transition-colors rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>

              <AnimatePresence mode="wait">
                {step === "form" ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22 }}
                    className="px-6 pt-5 pb-6"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-3xl select-none leading-none mt-0.5">🦉</span>
                      <div>
                        <h2 className="text-[0.9375rem] font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          Подождите — Совунья хочет сделать предложение
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Расскажите, почему не берёте полный доступ —&nbsp;
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            и мы откроем 3 урока бонусом
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Unlock teaser */}
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40
                      border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                        После ответа откроются <strong>первые 2 урока модуля 2</strong> «Transaction Cost» — войдите по указанному email
                      </p>
                    </div>

                    {/* Feedback textarea */}
                    <div className="mb-3">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Почему вы решили не проходить курс полностью?
                      </label>
                      <textarea
                        ref={textareaRef}
                        value={feedback}
                        onChange={(e) => { setFeedback(e.target.value); if (error) setError(""); }}
                        placeholder="Например: слишком дорого, нет времени, не уверен в качестве..."
                        rows={3}
                        className={`w-full text-sm px-3.5 py-2.5 rounded-xl border
                          bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100
                          placeholder:text-slate-400 dark:placeholder:text-slate-500
                          focus:outline-none focus:ring-2 focus:ring-teal-400/50
                          resize-none transition-all leading-relaxed
                          ${error
                            ? "border-red-300 dark:border-red-700"
                            : "border-slate-200 dark:border-slate-700"
                          }`}
                      />
                      {error && (
                        <p className="text-xs text-red-500 mt-1.5">{error}</p>
                      )}
                    </div>

                    {/* Email input */}
                    <div className="mb-5">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        E-mail (на него будут зарегистрированы бонусные уроки)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                        placeholder="your@email.com"
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                          bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100
                          placeholder:text-slate-400 dark:placeholder:text-slate-500
                          focus:outline-none focus:ring-2 focus:ring-teal-400/50
                          transition-all"
                      />
                    </div>

                    {/* CTA */}
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm
                        bg-gradient-to-r from-teal-500 to-emerald-500
                        hover:from-teal-600 hover:to-emerald-600
                        active:scale-[0.98] transition-all shadow-md shadow-teal-500/20
                        flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Сохраняем...
                        </>
                      ) : (
                        <>
                          🎁 Зарезервировать 3 урока
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Privacy note */}
                    <p className="text-center text-[0.6875rem] text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">
                      Отправляя форму, вы соглашаетесь с{" "}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        политикой конфиденциальности
                      </a>
                      . Ваш e-mail используется только для связи и не передаётся третьим лицам.
                    </p>
                  </motion.div>
                ) : (
                  /* ── Success step ── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="px-6 pt-5 pb-6"
                  >
                    <div className="text-center mb-4">
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
                        className="text-5xl mb-3 select-none"
                      >
                        🦉🔐
                      </motion.div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Уроки зарезервированы!
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Спасибо за честный ответ. Войдите в аккаунт по указанному email — уроки откроются автоматически.
                      </p>
                    </div>

                    {/* Email badge */}
                    <div className="mb-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                      bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50">
                      <Mail className="w-4 h-4 text-teal-500 shrink-0" />
                      <span className="text-sm font-semibold text-teal-700 dark:text-teal-300 truncate">
                        {submittedEmail}
                      </span>
                    </div>

                    {/* Locked lessons */}
                    <div className="space-y-2 mb-5">
                      {BONUS_LESSON_NAMES.map((name, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.08 }}
                          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl
                            bg-slate-50 dark:bg-slate-800/60
                            border border-slate-200 dark:border-slate-700/60"
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shrink-0">
                            <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-snug">
                            {name}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Hint */}
                    <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30
                      border border-amber-200 dark:border-amber-800/40">
                      <p className="text-xs text-amber-700 dark:text-amber-300 text-center leading-relaxed">
                        🔑 Зарегистрируйтесь или войдите с email&nbsp;
                        <strong className="font-semibold">{submittedEmail}</strong>&nbsp;— уроки разблокируются сразу после входа
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <button
                        onClick={handleGoToAuth}
                        className="w-full py-3 rounded-xl font-semibold text-white text-sm
                          bg-gradient-to-r from-teal-500 to-emerald-500
                          hover:from-teal-600 hover:to-emerald-600
                          active:scale-[0.98] transition-all shadow-md shadow-teal-500/20
                          flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        Войти / Зарегистрироваться
                      </button>

                      <button
                        onClick={() => {
                          setVisible(false);
                          onGoToLesson(BONUS_LESSON_IDS[0]);
                        }}
                        className="w-full py-2.5 rounded-xl text-sm font-medium
                          text-slate-500 dark:text-slate-400
                          hover:text-slate-700 dark:hover:text-slate-200
                          hover:bg-slate-100 dark:hover:bg-slate-800
                          transition-all flex items-center justify-center gap-1.5"
                      >
                        Посмотреть пока без входа
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleUpgradeClick}
                        className="w-full py-2 rounded-xl text-xs font-medium
                          text-slate-400 dark:text-slate-500
                          hover:text-slate-600 dark:hover:text-slate-300
                          transition-colors"
                      >
                        🚀 Или получить все 38 модулей сразу
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}