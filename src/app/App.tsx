import { MiniOnboarding } from "./components/mini-onboarding";
import { ProfileCabinet } from "./components/profile-cabinet";
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { PomodoroTimer } from "./components/pomodoro";
import { Sidebar } from "./components/sidebar";
import { LessonView } from "./components/lesson-view";
import { FinalExam } from "./components/final-exam";
import { AIAssistant } from "./components/ai-assistant";
import { InactivityBanner } from "./components/inactivity-banner";
import { Glossary } from "./components/glossary";
import { Flashcards } from "./components/flashcards";
import { Certificate } from "./components/certificate";
import { logActivity } from "./components/gamification";
import { logProgress } from "./components/progress-chart";
import { sendWebhook } from "./components/webhook";
import {
  courseModules,
  getAllLessons,
  isModuleUnlocked,
} from "./components/course-data";
import { syncProgressFromServer } from "./components/interactive-progress";
import { BadgeNotifier } from "./components/badge-notifier";
import { CommandPalette } from "./components/command-palette";
import {
  Confetti,
  ModuleCompleteOverlay,
  LessonCompleteAnimation,
  useCelebration,
} from "./components/celebrations";
import { AnimatePresence, motion } from "motion/react";
import { useDarkMode } from "./components/dark-mode";
import { UIKit } from "./components/ui-kit";
import { DiagnosticQuiz } from "./components/adaptive-learning";
import { CapstoneProjectsView } from "./components/capstone-projects";
import { PMCoach } from "./components/pm-coach";
import { PracticeNotebook } from "./components/practice-notebook";
import { InterviewSimulator } from "./components/interview-simulator";
import { TemplateLibrary } from "./components/template-library";
import { AnalyticsDashboard } from "./components/analytics-dashboard";
import { DataExercises } from "./components/data-exercises";
import { PortfolioBuilder } from "./components/portfolio-builder";
import { ResumeReview } from "./components/resume-review";
import { CompetencyRadar } from "./components/competency-radar";
import {
  AuthModal,
  useAuth,
  saveProgressToSupabase,
  loadProgressFromSupabase,
} from "./components/auth-modal";
import { AuthPage } from "./components/auth-page";
import { AuthModeSelector } from "./components/auth-mode-selector";
import { AdminPanel } from "./components/admin-panel";
import { PaywallModal } from "./components/paywall-modal";
import { PaywallScreen } from "./components/paywall-screen";
import { WelcomeDashboard } from "./components/welcome-dashboard";
import { ModuleIntroScreen } from "./components/module-intro";
import { PaymentSuccessPage } from "./components/payment-success";
import { PaymentFailPage } from "./components/payment-fail";
import { PrivacyPolicyModal } from "./components/privacy-policy";
import { CourseLanding } from "./components/course-landing";
import {
  projectId,
  publicAnonKey,
} from "../../utils/supabase/info";
import { fetchUserAccess } from "./components/user-access";
import { HedgehogExport } from "./components/hedgehog-export";
import { ExitIntentModal } from "./components/exit-intent-modal";
import { PreAuthPricing } from "./components/pre-auth-pricing";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

// Supabase edge-function base (for progress endpoints)
const SUPABASE_FN_BASE = `https://${projectId}.supabase.co/functions/v1`;
const SITE_KEY = "rediska210426";

// First 3 lessons of module 1 are free + entire analytics module (m-analytics with 9 lessons) + simulator lesson
const FREE_LESSON_IDS = new Set([
  "m1-l1",
  "m1-l2",
  "m1-l3",
  "m-analytics-l1",
  "m-analytics-l2",
  "m-analytics-l3",
  "m-analytics-l4",
  "m-analytics-l5",
  "m-analytics-l6",
  "m-analytics-l7",
  "m-analytics-l8",
  "m-analytics-l9",
  "m-sim-l1",
]);

// 🔓 TEMPORARY TESTING FLAG — set to false to restore paywall
const TESTING_ALL_OPEN = false;

// 🔒 Уроки, которые ВСЕГДА платные — не открываются ни через бонус, ни через демо.
// Имеет приоритет над FREE_LESSON_IDS и bonusLessons.
const PAID_ONLY_LESSON_IDS = new Set(["m1-l4"]);

type ViewMode =
  | "lesson"
  | "exam"
  | "glossary"
  | "flashcards"
  | "certificate"
  | "capstone"
  | "diagnostic"
  | "pm-coach"
  | "notebook"
  | "interview"
  | "templates"
  | "analytics"
  | "data-exercises"
  | "portfolio"
  | "resume-review"
  | "competency-radar"
  | "admin";

export default function App() {
  // ── Payment route detection ─────────────────────────────────────────────
  // Detect /payment-success and /payment-fail paths BEFORE any auth logic.
  // These standalone pages are shown without requiring login.
  const isPrivacyPage =
    window.location.pathname === "/privacy-policy";
  const isOwlPage = window.location.pathname === "/owl";

  const paymentPageType = useState<"success" | "fail" | null>(
    () => {
      const path = window.location.pathname;
      if (path === "/payment-success") return "success";
      if (path === "/payment-fail") return "fail";
      return null;
    },
  )[0];

  const paymentInvId = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("invId") || params.get("InvId") || null;
  })[0];

  // orderId is sent by super-task (YooKassa) redirects — always goes to /payment-success
  // regardless of success or failure; we resolve actual status on that page
  const paymentOrderId = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("orderId") || params.get("order_id") || null
    );
  })[0];

  // ─────────────────────────────────────────────────────────────────────────

  const [appStep, setAppStep] = useState<
    | "loading"
    | "auth"
    | "onboarding"
    | "pricing"
    | "welcome"
    | "course"
  >("loading");

  // Auth/Demo mode state
  const [authMode, setAuthMode] = useState<
    "landing" | "selector" | "signup" | "login" | null
  >("landing");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showPaywallAfterSignup, setShowPaywallAfterSignup] =
    useState(false);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileCabinet, setShowProfileCabinet] =
    useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallModuleTitle, setPaywallModuleTitle] = useState<
    string | undefined
  >(undefined);
  // Access level: "free" | "monthly" | "lifetime"
  const [accessLevel, setAccessLevel] = useState<
    "free" | "monthly" | "lifetime"
  >("free");
  // canAccessPaidContent — единственная проверка для UI. true = открыть все платные модули
  const [canAccessPaidContent, setCanAccessPaidContent] =
    useState<boolean>(false);
  // isAdminMode — администратор вошёл через AdminPanel, имеет полный доступ ко всем урокам
  const [isAdminMode, setIsAdminMode] =
    useState<boolean>(false);
  // adminPassword — хранится для передачи в inline AdminPanel (API-запросы)
  const [adminPassword, setAdminPassword] =
    useState<string>("");
  // Идёт ли сейчас запрос к get-user-access
  const [accessLoading, setAccessLoading] =
    useState<boolean>(false);
  // Прогресс пользователя по модулям (загружается из Supabase)
  const [userProgress, setUserProgress] = useState<
    Record<string, { progress: number; completed: boolean }>
  >({});
  // Ref для защиты от затирания ненулевого состояния пустым API-ответом
  const userProgressRef = useRef<
    Record<string, { progress: number; completed: boolean }>
  >({});
  // Сырой ответ API get-user-progress — единственный источник правды для отображения прогресса на странице курса
  const [userProgressResponse, setUserProgressResponse] =
    useState<{
      ok: boolean;
      userId?: string;
      progress: Record<
        string,
        {
          progress: number;
          completed: boolean;
          updated_at?: string;
        }
      >;
    } | null>(null);
  // Бонусные уроки, разблокированные за фидбек в exit-intent модалке
  // Инициализируем из localStorage как кеш — при загрузке перепроверяем по email через бэкенд
  const [bonusLessons, setBonusLessons] = useState<Set<string>>(
    () => {
      try {
        const saved = localStorage.getItem(
          "exit-intent-bonus-unlocked",
        );
        const parsed: string[] = saved ? JSON.parse(saved) : [];
        // Фильтруем уроки, которые теперь полностью платные (m1-l4 и др.)
        const filtered = parsed.filter(
          (id) => !PAID_ONLY_LESSON_IDS.has(id),
        );
        return new Set<string>(filtered);
      } catch {
        return new Set<string>();
      }
    },
  );
  const [onboardingName, setOnboardingName] = useState("");
  const [paymentBanner, setPaymentBanner] = useState<
    "success" | "failed" | null
  >(null);
  const { authState, updateAuth, signOut, checkSession } =
    useAuth();

  // Module intro state
  const [moduleIntroData, setModuleIntroData] = useState<{
    module: (typeof courseModules)[0];
    pendingLessonId: string;
  } | null>(null);

  const [selectedLesson, setSelectedLesson] =
    useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("lesson");
  // Navigation history stack — each entry is the state BEFORE navigating away
  const [navHistory, setNavHistory] = useState<
    Array<{ viewMode: ViewMode; selectedLesson: string }>
  >([]);
  const [completedLessons, setCompletedLessons] = useState<
    Set<string>
  >(() => {
    try {
      const saved = localStorage.getItem("course-progress");
      return saved
        ? new Set(JSON.parse(saved))
        : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => {
      try {
        const saved = localStorage.getItem("course-bookmarks");
        return saved
          ? new Set(JSON.parse(saved))
          : new Set<string>();
      } catch {
        return new Set<string>();
      }
    },
  );
  const [examScore, setExamScore] = useState<number | null>(
    () => {
      try {
        const saved = localStorage.getItem("best-exam-score");
        return saved ? Number(saved) : null;
      } catch {
        return null;
      }
    },
  );

  // Track last sync to debounce
  const syncTimeout = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Clear ALL user-specific data from localStorage (for new account)
  const clearAllLocalData = useCallback(() => {
    const keysToRemove = [
      "course-progress",
      "course-bookmarks",
      "best-exam-score",
      "exam-session-id",
      "course-notes",
      "course-ratings",
      "course-activity-log",
      "earned-badge-ids",
      "flashcard-reviews",
      "certificate-id",
      "course-progress-log",
      "daily-challenge-streak",
      "user-comments-count",
      "interview-history",
      "pomodoro-stats",
    ];
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
  }, []);

  // Apply server progress to local state and localStorage
  const applyServerProgress = useCallback(
    (
      serverProgress: {
        completedLessons: string[];
        bookmarks: string[];
        examScore: number | null;
      } | null,
    ) => {
      if (!serverProgress) return;
      const serverCompleted = new Set<string>(
        serverProgress.completedLessons || [],
      );
      setCompletedLessons(serverCompleted);
      try {
        localStorage.setItem(
          "course-progress",
          JSON.stringify([...serverCompleted]),
        );
      } catch {}
      const serverBookmarks = new Set<string>(
        serverProgress.bookmarks || [],
      );
      setBookmarks(serverBookmarks);
      try {
        localStorage.setItem(
          "course-bookmarks",
          JSON.stringify([...serverBookmarks]),
        );
      } catch {}
      if (serverProgress.examScore != null) {
        setExamScore(serverProgress.examScore);
        try {
          localStorage.setItem(
            "best-exam-score",
            String(serverProgress.examScore),
          );
        } catch {}
      } else {
        setExamScore(null);
        try {
          localStorage.removeItem("best-exam-score");
        } catch {}
      }
    },
    [],
  );

  // Load access level from get-user-access endpoint (единственный источник правды)
  const loadAccessLevel = useCallback(
    async (accessToken: string, userId: string) => {
      // Если активен admin-режим — не сбрасываем доступ, он уже полный
      if (isAdminMode) {
        console.log(
          `[App] 🛡️ Admin mode active — skipping loadAccessLevel reset`,
        );
        return;
      }
      // Сбрасываем доступ НЕМЕДЛЕННО до завершения async-запроса
      setCanAccessPaidContent(false);
      setAccessLevel("free");
      setAccessLoading(true);
      console.log(`[App] ── loadAccessLevel called ──`);
      console.log(
        `[App] [ID-CHECK] authState.userId (текущий пользователь) = "${authState.userId ?? "null"}"`,
      );
      console.log(
        `[App] [ID-CHECK] userId передан в get-user-access = "${userId}"`,
      );
      console.log(
        `[App] [ID-CHECK] accessToken present = ${!!accessToken}`,
      );

      if (authState.userId && authState.userId !== userId) {
        console.error(
          `[App] [ID-MISMATCH] ❌ user mismatch: authState.userId="${authState.userId}" ≠ passed userId="${userId}"`,
        );
      } else {
        console.log(`[App] [ID-CHECK] ✅ userId consistent`);
      }

      // Передаём accessToken — endpoint может требовать Authorization
      const result = await fetchUserAccess(accessToken, userId);
      console.log(
        `[App] userId="${userId}" → accessLevel="${result.accessLevel}" canAccessPaidContent=${result.canAccessPaidContent}`,
      );

      setAccessLevel(result.accessLevel);
      setCanAccessPaidContent(result.canAccessPaidContent);
      setAccessLoading(false);

      if (result.canAccessPaidContent) {
        console.log(
          `[App] ✅ Paid access GRANTED — paywall скрыт, все модули открыты`,
        );
      } else {
        console.log(
          `[App] 🔒 Paid access DENIED — только бесплатные уроки`,
        );
      }
    },
    [authState.userId, isAdminMode],
  );

  // Проверить бонусный доступ по email через бэкенд (источник правды — сервер)
  const loadBonusAccessByEmail = useCallback(async () => {
    try {
      const storedEmail = localStorage.getItem(
        "exit-intent-email",
      );
      if (!storedEmail) return;
      const res = await fetch(
        `${API_BASE}/exit-intent-bonus-access?email=${encodeURIComponent(storedEmail)}`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        lessonIds?: string[];
      };
      if (
        Array.isArray(data.lessonIds) &&
        data.lessonIds.length > 0
      ) {
        // Фильтруем PAID_ONLY уроки — они не должны открываться через бонус
        const filtered = data.lessonIds.filter(
          (id: string) => !PAID_ONLY_LESSON_IDS.has(id),
        );
        setBonusLessons(new Set(filtered));
        // Обновляем локальный кеш
        try {
          localStorage.setItem(
            "exit-intent-bonus-unlocked",
            JSON.stringify(filtered),
          );
        } catch {}
        console.log(
          `[bonus-access] ✅ восстановлен по email=${storedEmail} уроки=${filtered.join(",")}`,
        );
      }
    } catch (err) {
      console.log(`[bonus-access] ошибка проверки: ${err}`);
    }
  }, []);

  // ── Маппинг: module_N (ключ API) → module.id (фронтенд ID) ───────────────
  // Пример: { 1: "m1", 2: "m2", 14: "m-analytics", 37: "m-sim", ... }
  // Нужен для нормализации API-ответа, который может вернуть "module_1" вместо "m1"
  const numberToModuleIdMap = useMemo<
    Record<number, string>
  >(() => {
    const map: Record<number, string> = {};
    courseModules.forEach((m) => {
      map[m.number] = m.id;
    });
    console.log(
      `[🗺️ numberToModuleIdMap] Построен маппинг дл�� ${courseModules.length} модулей:`,
      map,
    );
    console.log(
      `[🗺️ numberToModuleIdMap] Первые 5 модулей — m.number → m.id:`,
      courseModules
        .slice(0, 5)
        .map((m) => `${m.number}→"${m.id}"`)
        .join(", "),
    );
    return map;
  }, []);

  // Нормализует ключи API-ответа: "module_1" → "m1", "module_14" → "m-analytics"
  // Ключи, уже совпадающие с module.id, остаются без изменений.
  const normalizeProgressKeys = useCallback(
    (
      raw: Record<
        string,
        {
          progress: number;
          completed: boolean;
          updated_at?: string;
        }
      >,
    ): Record<
      string,
      {
        progress: number;
        completed: boolean;
        updated_at?: string;
      }
    > => {
      const result: Record<
        string,
        {
          progress: number;
          completed: boolean;
          updated_at?: string;
        }
      > = {};
      for (const [key, val] of Object.entries(raw)) {
        const match = key.match(/^module_(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          const moduleId = numberToModuleIdMap[num];
          const normalizedKey = moduleId ?? key;
          result[normalizedKey] = val;
          console.log(
            `[userProgress] key remap: "${key}" → "${normalizedKey}"`,
          );
        } else {
          result[key] = val;
        }
      }
      return result;
    },
    [numberToModuleIdMap],
  );

  // ── Загрузка прогресса по модулям из Supabase ──────────────────────────
  const loadUserProgress = useCallback(
    async (userId: string) => {
      if (!userId) return;
      try {
        const url = `${SUPABASE_FN_BASE}/get-user-progress?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(url, {
          headers: {
            "x-site-key": SITE_KEY,
            Authorization: `Bearer ${publicAnonKey}`,
          },
        });
        if (!res.ok) {
          console.warn(
            `[userProgress] GET failed: ${res.status}`,
          );
          return;
        }
        const data = await res.json();
        // ── ДИАГНОСТИКА 1: Полный RAW-ответ API ─────────────────────────────
        console.group("📦 [userProgress] RAW API response");
        console.log("data.ok =", data?.ok);
        console.log("data.userId =", data?.userId);
        console.log(
          "data.progress (raw) =",
          JSON.stringify(data?.progress, null, 2),
        );
        console.log(
          "Ключи raw =",
          data?.progress
            ? Object.keys(data.progress)
            : "no progress",
        );
        console.groupEnd();

        if (
          data?.ok &&
          data?.progress &&
          typeof data.progress === "object" &&
          !Array.isArray(data.progress)
        ) {
          // Нормализуем ключи: module_N → module.id
          const normalizedProgress = normalizeProgressKeys(
            data.progress as Record<
              string,
              {
                progress: number;
                completed: boolean;
                updated_at?: string;
              }
            >,
          );
          // ── ДИАГНОСТИКА 2: Полный нормализованный объект ────────────────────
          console.group(
            "✅ [userProgress] NORMALIZED progress",
          );
          console.log(
            "Ключи normalized =",
            Object.keys(normalizedProgress),
          );
          console.log(
            "Полный normalized объект =",
            JSON.stringify(normalizedProgress, null, 2),
          );
          // Сверяем первые 5 module.id с ключами normalized
          console.group(
            "🔍 Сверка первых 5 module.id с normalized:",
          );
          courseModules.slice(0, 5).forEach((m) => {
            const found = normalizedProgress[m.id];
            const foundFallback =
              normalizedProgress[`module_${m.number}`];
            console.log(
              `  module.id="${m.id}" (number=${m.number}) →`,
              found
                ? `✅ HIT: progress=${found.progress} completed=${found.completed}`
                : foundFallback
                  ? `⚠️ fallback key "module_${m.number}": progress=${foundFallback.progress} completed=${foundFallback.completed}`
                  : "❌ MISS — ключ не найден в normalized",
            );
          });
          console.groupEnd();
          console.groupEnd();

          // Сохраняем нормализованный ответ как источник правды
          setUserProgressResponse({
            ok: data.ok,
            userId: data.userId,
            progress: normalizedProgress,
          });

          // Строим плоский record для совместимости
          const progressRecord: Record<
            string,
            { progress: number; completed: boolean }
          > = {};
          for (const [modId, val] of Object.entries(
            normalizedProgress,
          )) {
            progressRecord[modId] = {
              progress: Number(val.progress) || 0,
              completed: Boolean(val.completed),
            };
          }

          // Защита: не затираем непустой стейт пустым ответом
          const hasNew = Object.keys(progressRecord).length > 0;
          const hasCurrent =
            Object.keys(userProgressRef.current).length > 0;
          if (hasNew || !hasCurrent) {
            setUserProgress(progressRecord);
            userProgressRef.current = progressRecord;
            console.log(
              `[userProgress] ✅ загружено ${Object.keys(progressRecord).length} модулей:`,
              Object.keys(progressRecord),
            );
          } else {
            console.log(
              `[userProgress] ⚠️ пустой ответ API, сохраняем текущий стейт`,
            );
          }
          return;
        }

        // Fallback: старый массивный формат
        const progressRecord: Record<
          string,
          { progress: number; completed: boolean }
        > = {};
        if (Array.isArray(data)) {
          for (const item of data as Array<{
            module_id?: string;
            moduleId?: string;
            progress: number;
            completed: boolean;
          }>) {
            const rawId = item.module_id ?? item.moduleId;
            if (!rawId) continue;
            // Нормализуем module_N → module.id
            const match = rawId.match(/^module_(\d+)$/);
            let modId = rawId;
            if (match) {
              const num = parseInt(match[1], 10);
              modId = numberToModuleIdMap[num] ?? rawId;
            }
            progressRecord[modId] = {
              progress: Number(item.progress) || 0,
              completed: Boolean(item.completed),
            };
          }
        }
        const hasNew = Object.keys(progressRecord).length > 0;
        const hasCurrent =
          Object.keys(userProgressRef.current).length > 0;
        if (hasNew || !hasCurrent) {
          setUserProgress(progressRecord);
          userProgressRef.current = progressRecord;
          console.log(
            `[userProgress] ✅ загружено (fallback) ${Object.keys(progressRecord).length} модулей`,
          );
        } else {
          console.log(
            `[userProgress] ⚠️ пустой ответ API (fallback), сохраняем текущий стейт`,
          );
        }
      } catch (err) {
        console.error(`[userProgress] load error:`, err);
      }
    },
    [normalizeProgressKeys, numberToModuleIdMap],
  );

  // ── Обновление прогресса модуля при переходе к следующему ─────────────
  const updateModuleProgress = useCallback(
    async (moduleId: string): Promise<void> => {
      if (!authState.userId) {
        return;
      }
      // Оптимистичное обновление — сразу обновляем UI
      const update = { progress: 100, completed: true };
      setUserProgress((prev) => {
        const next = { ...prev, [moduleId]: update };
        userProgressRef.current = next;
        return next;
      });
      // Обновляем сырой ответ API оптимистично
      setUserProgressResponse((prev) => {
        if (!prev) {
          return {
            ok: true,
            userId: authState.userId ?? undefined,
            progress: { [moduleId]: update },
          };
        }
        return {
          ...prev,
          progress: { ...prev.progress, [moduleId]: update },
        };
      });
      console.log(
        `[userProgress] → сохраняем модуль ${moduleId} как завершённый`,
      );
      try {
        const url = `${SUPABASE_FN_BASE}/update-user-progress`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-key": SITE_KEY,
            Authorization: `Bearer ${authState.accessToken ?? publicAnonKey}`,
          },
          body: JSON.stringify({
            userId: authState.userId,
            moduleId,
            progress: 100,
            completed: true,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(
            `[userProgress] POST update-user-progress failed: ${res.status} ${text}`,
          );
        } else {
          console.log(
            `[userProgress] ✅ модуль ${moduleId} успешно сохранён`,
          );
        }
      } catch (err) {
        console.error(`[userProgress] POST error:`, err);
        // Не откатываем оптимистичное обновление — сохраняем UI-стейт
      }
    },
    [authState.userId, authState.accessToken],
  );

  // Save progress to Supabase when auth state or progress changes
  const scheduleProgressSync = useCallback(
    (
      completedArr: string[],
      bookmarksArr: string[],
      score: number | null,
    ) => {
      if (
        !authState.isAuthenticated ||
        !authState.accessToken ||
        !authState.userId
      )
        return;
      if (syncTimeout.current)
        clearTimeout(syncTimeout.current);
      syncTimeout.current = setTimeout(() => {
        saveProgressToSupabase(
          authState.accessToken!,
          authState.userId!,
          completedArr,
          bookmarksArr,
          score,
        );
      }, 2000);
    },
    [authState],
  );

  // Load progress from Supabase when user logs in
  const handleAuth = useCallback(
    async (
      state: typeof authState,
      isNewUser: boolean,
      adminPass?: string,
    ) => {
      // Admin login: if the admin email logs in with correct admin password, enter admin mode
      if (
        adminPass &&
        state.email?.toLowerCase() === "lifesyncspace@gmail.com"
      ) {
        try {
          const res = await fetch(`${API_BASE}/admin/users`, {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "X-Admin-Password": adminPass,
            },
          });
          if (res.ok) {
            updateAuth(state);
            try {
              sessionStorage.setItem(
                "admin-session",
                adminPass,
              );
            } catch {}
            setShowAuthModal(false);
            setIsAdminMode(true);
            setAdminPassword(adminPass);
            setCanAccessPaidContent(true);
            setAccessLevel("lifetime");
            setShowAdminPanel(false);
            setAuthMode(null);
            setAppStep("course");
            setViewMode("admin");
            window.scrollTo(0, 0);
            return;
          }
        } catch {}
      }

      updateAuth(state);
      setShowAuthModal(false);
      try {
        localStorage.setItem("course-started", "1");
      } catch {}

      if (isNewUser) {
        // NEW account: wipe all local data, start completely fresh
        clearAllLocalData();
        setCompletedLessons(new Set<string>());
        setBookmarks(new Set<string>());
        setExamScore(null);
        // Capture name immediately from the passed state (before React batches the authState update)
        setOnboardingName(
          state.name || state.email?.split("@")[0] || "",
        );
        // Save empty progress to server for this new user
        if (state.accessToken && state.userId) {
          saveProgressToSupabase(
            state.accessToken,
            state.userId,
            [],
            [],
            null,
          );
        }
        // Show paywall modal immediately after signup
        setShowPaywallAfterSignup(true);
        setAppStep("auth"); // Stay on auth screen to show paywall modal
      } else if (
        state.isAuthenticated &&
        state.accessToken &&
        state.userId
      ) {
        // EXISTING account: load from server first, preserve local if server is empty
        try {
          const serverProgress = await loadProgressFromSupabase(
            state.accessToken,
            state.userId,
          );
          // Check if server has any meaningful data
          const hasServerData = serverProgress && (
            (serverProgress.completedLessons && serverProgress.completedLessons.length > 0) ||
            (serverProgress.bookmarks && serverProgress.bookmarks.length > 0) ||
            serverProgress.examScore != null
          );

          if (hasServerData) {
            // Server has data — apply it and clear local conflicting data
            clearAllLocalData();
            applyServerProgress(serverProgress);
          } else {
            // Server is empty — keep local data and sync it to server
            const localCompleted = [...completedLessons];
            const localBookmarks = [...bookmarks];
            if (localCompleted.length > 0 || localBookmarks.length > 0 || examScore != null) {
              // Sync local → server
              saveProgressToSupabase(
                state.accessToken,
                state.userId,
                localCompleted,
                localBookmarks,
                examScore,
              );
            }
          }
        } catch {}
        // Load access level
        await loadAccessLevel(state.accessToken, state.userId);
        // Load module-level progress from Supabase
        await loadUserProgress(state.userId);
        // Restore bonus lessons tied to exit-intent email (if any)
        await loadBonusAccessByEmail();
        // Clear persisted payment banner after login (access is now loaded)
        try {
          localStorage.removeItem("pending-payment-banner");
        } catch {}
        setAppStep("course");
      }
    },
    [
      updateAuth,
      clearAllLocalData,
      applyServerProgress,
      loadAccessLevel,
      loadUserProgress,
      loadBonusAccessByEmail,
    ],
  );

  useEffect(() => {
    logActivity();
    logProgress(completedLessons.size);
    syncProgressFromServer().catch(() => {});
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#14b8a6";
      document.head.appendChild(meta);
    }
    // Restore existing session and load server progress
    checkSession()
      .then(async (sessionState) => {
        if (
          sessionState &&
          sessionState.accessToken &&
          sessionState.userId
        ) {
          // Restore admin session if previously authenticated admin
          const storedAdminPass = (() => {
            try {
              return sessionStorage.getItem("admin-session");
            } catch {
              return null;
            }
          })();
          if (
            storedAdminPass &&
            sessionState.email?.toLowerCase() ===
              "lifesyncspace@gmail.com"
          ) {
            setIsAdminMode(true);
            setAdminPassword(storedAdminPass);
            setCanAccessPaidContent(true);
            setAccessLevel("lifetime");
            setAppStep("course");
            setViewMode("lesson");
            return;
          }

          try {
            const serverProgress =
              await loadProgressFromSupabase(
                sessionState.accessToken,
                sessionState.userId,
              );
            // Check if server has any meaningful data
            const hasServerData = serverProgress && (
              (serverProgress.completedLessons && serverProgress.completedLessons.length > 0) ||
              (serverProgress.bookmarks && serverProgress.bookmarks.length > 0) ||
              serverProgress.examScore != null
            );

            if (hasServerData) {
              applyServerProgress(serverProgress);
            } else {
              // Server is empty — sync local → server
              const localCompleted = [...completedLessons];
              const localBookmarks = [...bookmarks];
              if (localCompleted.length > 0 || localBookmarks.length > 0 || examScore != null) {
                saveProgressToSupabase(
                  sessionState.accessToken,
                  sessionState.userId,
                  localCompleted,
                  localBookmarks,
                  examScore,
                );
              }
            }
          } catch {}
          await loadAccessLevel(
            sessionState.accessToken,
            sessionState.userId,
          );
          // Load module-level progress from Supabase
          await loadUserProgress(sessionState.userId);
          await loadBonusAccessByEmail();
          try {
            localStorage.setItem("course-started", "1");
          } catch {}
          setAppStep("course");
        } else {
          // No valid session - show auth immediately
          await loadBonusAccessByEmail();
          setAppStep("auth");
        }
      })
      .catch(async () => {
        await loadBonusAccessByEmail();
        setAppStep("auth");
      });
  }, []);

  // Handle Robokassa payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get("payment");
    if (paymentParam === "success") {
      setPaymentBanner("success");
      // Persist across session loss (persistSession: false causes re-login after redirect)
      try {
        localStorage.setItem(
          "pending-payment-banner",
          "success",
        );
      } catch {}
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      // Re-check access level after a short delay
      setTimeout(() => {
        if (authState.accessToken && authState.userId) {
          loadAccessLevel(
            authState.accessToken,
            authState.userId,
          );
        }
      }, 1500);
    } else if (paymentParam === "failed") {
      setPaymentBanner("failed");
      try {
        localStorage.setItem(
          "pending-payment-banner",
          "failed",
        );
      } catch {}
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
    // Also check for persisted banner from previous redirect
    try {
      const persisted = localStorage.getItem(
        "pending-payment-banner",
      ) as "success" | "failed" | null;
      if (persisted && !paymentParam) {
        setPaymentBanner(persisted);
      }
    } catch {}
  }, []);

  const currentLessonData = useMemo(
    () =>
      selectedLesson
        ? getAllLessons().find(
            (l) => l.lesson.id === selectedLesson,
          )
        : null,
    [selectedLesson],
  );

  const handleToggleComplete = useCallback(
    (lessonId: string) => {
      setCompletedLessons((prev) => {
        const next = new Set(prev);
        const allLessons = getAllLessons();
        if (next.has(lessonId)) {
          next.delete(lessonId);
          sendWebhook({
            type: "lesson_uncompleted",
            lessonId,
            lessonTitle:
              allLessons.find((l) => l.lesson.id === lessonId)
                ?.lesson.title || "",
          });
        } else {
          next.add(lessonId);
          logActivity();
          const lessonData = allLessons.find(
            (l) => l.lesson.id === lessonId,
          );
          const totalLessons = courseModules.reduce(
            (a, m) => a + m.lessons.length,
            0,
          );
          sendWebhook({
            type: "lesson_completed",
            lessonId,
            lessonTitle: lessonData?.lesson.title || "",
            moduleTitle: lessonData?.module.title || "",
            totalCompleted: next.size,
            totalLessons,
          });
          sendWebhook({
            type: "course_progress",
            completedLessons: next.size,
            totalLessons,
            percentage: Math.round(
              (next.size / totalLessons) * 100,
            ),
          });
          celebration.triggerLessonComplete();
          setTimeout(
            () => celebration.checkModuleCompletion(lessonId),
            100,
          );
        }
        try {
          localStorage.setItem(
            "course-progress",
            JSON.stringify([...next]),
          );
        } catch {}
        logProgress(next.size);
        // Sync to Supabase
        scheduleProgressSync(
          [...next],
          [...bookmarks],
          examScore,
        );
        return next;
      });
    },
    [bookmarks, examScore, scheduleProgressSync],
  );

  const handleToggleBookmark = useCallback(
    (lessonId: string) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(lessonId)) next.delete(lessonId);
        else next.add(lessonId);
        try {
          localStorage.setItem(
            "course-bookmarks",
            JSON.stringify([...next]),
          );
        } catch {}
        scheduleProgressSync(
          [...completedLessons],
          [...next],
          examScore,
        );
        return next;
      });
    },
    [completedLessons, examScore, scheduleProgressSync],
  );

  // Обработчик успешной авторизации в AdminPanel
  const handleAdminAuthenticated = useCallback((pw: string) => {
    console.log(
      `[App] 🛡️ Admin authenticated — granting full course access`,
    );
    setIsAdminMode(true);
    setAdminPassword(pw);
    setCanAccessPaidContent(true);
    setAccessLevel("lifetime");
    // Закрываем модальную панель — переходим в курс с инлайн admin-view
    setShowAdminPanel(false);
    setAuthMode(null);
    setAppStep("course");
    // Открываем admin-панель как первый вид
    setViewMode("admin");
    window.scrollTo(0, 0);
  }, []);

  const handleSelectLesson = useCallback(
    (lessonId: string) => {
      // 1. Check paywall — используем canAccessPaidContent как единственную проверку
      // PAID_ONLY_LESSON_IDS блокируются всегда — независимо от bonusLessons и FREE_LESSON_IDS
      const isPaidOnly = PAID_ONLY_LESSON_IDS.has(lessonId);
      const isFreeOrBonus =
        FREE_LESSON_IDS.has(lessonId) ||
        bonusLessons.has(lessonId);
      // Администратор имеет полный доступ ко всем урокам без исключения
      if (
        !canAccessPaidContent &&
        !isAdminMode &&
        (!isFreeOrBonus || isPaidOnly) &&
        !TESTING_ALL_OPEN
      ) {
        const allLessons = getAllLessons();
        const lessonData = allLessons.find(
          (l) => l.lesson.id === lessonId,
        );
        // Показываем PaywallModal как всплывающее окно — не навигируем на урок
        setPaywallModuleTitle(
          lessonData?.module.title || "Полный доступ к курсу",
        );
        setShowPaywall(true);
        return;
      }

      // 2. Check if this is the first lesson of a module → show intro if not yet seen
      const allLessons = getAllLessons();
      const lessonData = allLessons.find(
        (l) => l.lesson.id === lessonId,
      );
      if (lessonData) {
        const mod = lessonData.module;
        const isFirstLesson = mod.lessons[0]?.id === lessonId;
        if (isFirstLesson) {
          // m18 (модуль 25 — Ярослав Шуваев) — интро показывается всегда
          const alreadyIntroduced =
            mod.id !== "m18" &&
            !!localStorage.getItem(
              `introduced-module-${mod.id}`,
            );
          if (!alreadyIntroduced) {
            setModuleIntroData({
              module: mod,
              pendingLessonId: lessonId,
            });
            setViewMode("lesson");
            window.scrollTo(0, 0);
            return;
          }
        }
      }

      // 3. Navigate to lesson normally
      setModuleIntroData(null);
      setSelectedLesson(lessonId);
      setViewMode("lesson");
      window.scrollTo(0, 0);
    },
    [canAccessPaidContent, isAdminMode, bonusLessons],
  );

  // ── Navigation history helpers — defined first so other callbacks can reference them ──

  const setView = useCallback(
    (mode: ViewMode) => {
      // Push current state to history before navigating
      setNavHistory((prev) => [
        ...prev,
        { viewMode, selectedLesson },
      ]);
      setViewMode(mode);
      setSelectedLesson("");
      window.scrollTo(0, 0);
    },
    [viewMode, selectedLesson],
  );

  // Go back to the previous page in navigation history, or home if no history
  const handleGoBack = useCallback(() => {
    setNavHistory((prev) => {
      if (prev.length === 0) {
        setViewMode("lesson");
        setSelectedLesson("");
        window.scrollTo(0, 0);
        return prev;
      }
      const last = prev[prev.length - 1];
      setViewMode(last.viewMode);
      setSelectedLesson(last.selectedLesson);
      window.scrollTo(0, 0);
      return prev.slice(0, -1);
    });
  }, []);

  const handleOpenFinalExam = useCallback(() => {
    // Push current state to history so "back" on exam returns here
    setNavHistory((prev) => [
      ...prev,
      { viewMode, selectedLesson },
    ]);
    setViewMode("exam");
    setSelectedLesson("");
    window.scrollTo(0, 0);
  }, [viewMode, selectedLesson]);

  const handleBackFromExam = useCallback(() => {
    handleGoBack();
  }, [handleGoBack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      )
        return;
      if (
        e.key === "Home" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setSelectedLesson("");
        setViewMode("lesson");
        window.scrollTo(0, 0);
      }
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey &&
        selectedLesson &&
        viewMode === "lesson"
      ) {
        const allLessons = getAllLessons();
        const currentIndex = allLessons.findIndex(
          (l) => l.lesson.id === selectedLesson,
        );
        if (currentIndex < 0) return;
        if (e.key === "ArrowLeft" && currentIndex > 0) {
          e.preventDefault();
          handleSelectLesson(
            allLessons[currentIndex - 1].lesson.id,
          );
        }
        if (
          e.key === "ArrowRight" &&
          currentIndex < allLessons.length - 1
        ) {
          const next = allLessons[currentIndex + 1];
          if (isModuleUnlocked(next.module, completedLessons)) {
            e.preventDefault();
            handleSelectLesson(next.lesson.id);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedLesson,
    viewMode,
    completedLessons,
    handleSelectLesson,
  ]);

  const handleOpenOnboarding = useCallback(() => {
    // No public landing page - just reset to course home
    setSelectedLesson("");
    setViewMode("lesson");
    window.scrollTo(0, 0);
  }, []);

  const celebration = useCelebration(completedLessons);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [showUIKit, setShowUIKit] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key === "U"
      ) {
        e.preventDefault();
        setShowUIKit((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleModuleNext = useCallback(() => {
    const modId = celebration.moduleComplete;
    if (!modId) return;
    const modIndex = courseModules.findIndex(
      (m) => m.id === modId,
    );
    const nextMod =
      modIndex >= 0 && modIndex < courseModules.length - 1
        ? courseModules[modIndex + 1]
        : null;
    if (nextMod) {
      handleSelectLesson(nextMod.lessons[0].id);
    }
    celebration.dismissModuleComplete();
  }, [
    celebration.moduleComplete,
    handleSelectLesson,
    celebration.dismissModuleComplete,
  ]);

  const contentKey = moduleIntroData
    ? `intro-${moduleIntroData.module.id}`
    : viewMode === "lesson"
      ? selectedLesson || "welcome"
      : viewMode;

  const renderMainContent = () => {
    // Module intro takes priority over everything
    if (moduleIntroData) {
      return (
        <ModuleIntroScreen
          module={moduleIntroData.module}
          lessonCount={moduleIntroData.module.lessons.length}
          onStart={() => {
            try {
              localStorage.setItem(
                `introduced-module-${moduleIntroData.module.id}`,
                "1",
              );
            } catch {}
            const pendingId = moduleIntroData.pendingLessonId;
            setModuleIntroData(null);
            setSelectedLesson(pendingId);
            setViewMode("lesson");
            window.scrollTo(0, 0);
          }}
        />
      );
    }

    switch (viewMode) {
      case "admin":
        return (
          <AdminPanel
            mode="inline"
            alreadyAuthenticated={true}
            initialPassword={adminPassword}
            onClose={() => {
              setViewMode("lesson");
              setSelectedLesson((prev) => prev || "m1-l1");
            }}
          />
        );
      case "exam":
        return (
          <FinalExam
            onBack={handleBackFromExam}
            completedLessons={completedLessons}
          />
        );
      case "glossary":
        return (
          <Glossary
            onSelectLesson={handleSelectLesson}
            onClose={handleGoBack}
          />
        );
      case "flashcards":
        return <Flashcards onClose={handleGoBack} />;
      case "certificate":
        return (
          <Certificate
            completedLessons={completedLessons}
            examScore={examScore}
            onClose={handleGoBack}
          />
        );
      case "capstone":
        return (
          <CapstoneProjectsView
            onClose={handleGoBack}
            accessLevel={accessLevel}
            isDemoMode={isDemoMode}
          />
        );
      case "diagnostic":
        return (
          <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
            <div className="max-w-[720px] mx-auto px-6 py-10">
              <DiagnosticQuiz onComplete={handleGoBack} />
            </div>
          </div>
        );
      case "pm-coach":
        return (
          <PMCoach
            onClose={handleGoBack}
            onSelectLesson={(id: string) => {
              // Navigate to lesson from PM-coach: pop pm-coach from history and go to the lesson
              setNavHistory((prev) =>
                prev.length > 0 ? prev.slice(0, -1) : prev,
              );
              setViewMode("lesson");
              setSelectedLesson(id);
              window.scrollTo(0, 0);
            }}
          />
        );
      case "notebook":
        return (
          <PracticeNotebook
            onClose={handleGoBack}
            completedLessons={completedLessons}
          />
        );
      case "interview":
        return <InterviewSimulator onClose={handleGoBack} />;
      case "templates":
        return <TemplateLibrary onClose={handleGoBack} />;
      case "analytics":
        return (
          <AnalyticsDashboard
            completedLessons={completedLessons}
            onClose={handleGoBack}
          />
        );
      case "data-exercises":
        return <DataExercises onClose={handleGoBack} />;
      case "portfolio":
        return (
          <PortfolioBuilder
            completedLessons={completedLessons}
            examScore={examScore}
            onClose={handleGoBack}
          />
        );
      case "resume-review":
        return <ResumeReview onClose={handleGoBack} />;
      case "competency-radar":
        return (
          <CompetencyRadar
            completedLessons={completedLessons}
            onClose={handleGoBack}
            onSelectLesson={handleSelectLesson}
          />
        );
      default:
        // If selected lesson is locked → show inline paywall screen
        // Используем canAccessPaidContent как единственную проверку доступа к платным урокам
        if (
          !canAccessPaidContent &&
          !isAdminMode &&
          selectedLesson &&
          (!FREE_LESSON_IDS.has(selectedLesson) ||
            PAID_ONLY_LESSON_IDS.has(selectedLesson)) &&
          (!bonusLessons.has(selectedLesson) ||
            PAID_ONLY_LESSON_IDS.has(selectedLesson)) &&
          !TESTING_ALL_OPEN
        ) {
          return (
            <PaywallScreen
              moduleTitle={paywallModuleTitle}
              onBack={() => {
                setSelectedLesson("m1-l1");
                setViewMode("lesson");
              }}
              userId={authState.userId ?? undefined}
              userEmail={authState.email ?? undefined}
              accessToken={authState.accessToken ?? undefined}
            />
          );
        }
        return (
          <LessonView
            lessonId={selectedLesson}
            onSelectLesson={handleSelectLesson}
            completedLessons={completedLessons}
            onToggleComplete={handleToggleComplete}
            onOpenFinalExam={handleOpenFinalExam}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onOpenDiagnostic={() => setView("diagnostic")}
            onOpenCapstone={() => setView("capstone")}
            onOpenCoach={() => setView("pm-coach")}
            onOpenNotebook={() => setView("notebook")}
            onOpenInterview={() => setView("interview")}
            onOpenTemplates={() => setView("templates")}
            onOpenAnalytics={() => setView("analytics")}
            onOpenDataExercises={() =>
              setView("data-exercises")
            }
            onOpenPortfolio={() => setView("portfolio")}
            onOpenResumeReview={() => setView("resume-review")}
            onOpenCompetencyRadar={() =>
              setView("competency-radar")
            }
            onOpenOnboarding={handleOpenOnboarding}
            onOpenGlossary={() => setView("glossary")}
            onOpenFlashcards={() => setView("flashcards")}
            onOpenCertificate={() => setView("certificate")}
            accessLevel={
              canAccessPaidContent ? accessLevel : "free"
            }
            isDemoMode={isDemoMode}
            onGoToSignup={() => {
              setPaywallModuleTitle("Полный доступ к курсу");
              setShowPaywall(true);
            }}
            onModuleComplete={updateModuleProgress}
          />
        );
    }
  };

  // ── Standalone payment result pages ─────────────────────────────────────
  if (paymentPageType === "success") {
    return (
      <PaymentSuccessPage
        invId={paymentInvId}
        orderId={paymentOrderId}
        onGoToCourse={() => {
          // Navigate to root - will trigger normal auth flow
          window.location.href = "/";
        }}
      />
    );
  }
  if (paymentPageType === "fail") {
    return (
      <PaymentFailPage
        onRetry={() => {
          // Go to root - paywall will be shown after login
          window.location.href = "/?payment=failed";
        }}
        onBack={() => {
          window.location.href = "/";
        }}
      />
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Privacy Policy standalone page ──────────────────────────────────────
  if (isPrivacyPage) {
    return (
      <PrivacyPolicyModal
        isOpen={true}
        onClose={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  // ── OWL Export standalone page ──────────────────────────────────────
  if (isOwlPage) {
    return <HedgehogExport />;
  }

  // Loading screen while checking session
  if (appStep === "loading") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
        <p className="text-sm text-muted-foreground/60">
          Загрузка...
        </p>
      </div>
    );
  }

  if (appStep === "auth") {
    // Step 1: Show course landing page
    if (authMode === "landing") {
      return (
        <>
          <CourseLanding
            onStart={() => {
              setAppStep("onboarding");
              window.scrollTo(0, 0);
            }}
            onLogin={() => {
              setAuthMode("login");
              window.scrollTo(0, 0);
            }}
          />
          <AnimatePresence>
            {showAdminPanel && (
              <AdminPanel
                onClose={() => setShowAdminPanel(false)}
                onAuthenticated={handleAdminAuthenticated}
              />
            )}
          </AnimatePresence>
          <ExitIntentModal
            isFreeTier={true}
            onUpgrade={() => {
              setAuthMode("selector");
              window.scrollTo(0, 0);
            }}
            onUnlockLessons={() => {}}
            onGoToLesson={() => {}}
            onGoToAuth={() => {
              setAuthMode("selector");
              window.scrollTo(0, 0);
            }}
          />
        </>
      );
    }

    // Login shortcut for returning users
    if (authMode === "login") {
      return (
        <>
          <AuthPage
            onAuth={handleAuth}
            onBack={() => {
              setAuthMode("landing");
              window.scrollTo(0, 0);
            }}
            initialMode="login"
          />
          <AnimatePresence>
            {showAdminPanel && (
              <AdminPanel
                onClose={() => setShowAdminPanel(false)}
                onAuthenticated={handleAdminAuthenticated}
              />
            )}
          </AnimatePresence>
        </>
      );
    }

    // Legacy selector fallback
    if (authMode === "selector") {
      return (
        <>
          <AuthModeSelector
            onDemoMode={() => {
              setIsDemoMode(true);
              try {
                localStorage.setItem("demo-mode", "true");
              } catch {}
              setAppStep("course");
              setAuthMode(null);
            }}
            onSignup={() => {
              setAuthMode("signup");
            }}
            onLogin={() => {
              setAuthMode("login");
            }}
            onBack={() => {
              setAuthMode("landing");
              window.scrollTo(0, 0);
            }}
          />
          <AnimatePresence>
            {showAdminPanel && (
              <AdminPanel
                onClose={() => setShowAdminPanel(false)}
                onAuthenticated={handleAdminAuthenticated}
              />
            )}
          </AnimatePresence>
        </>
      );
    }

    // AuthPage for legacy signup flow
    return (
      <>
        <AuthPage
          onAuth={handleAuth}
          onBack={() => {
            setAuthMode("selector");
            window.scrollTo(0, 0);
          }}
        />
        <AnimatePresence>
          {showAdminPanel && (
            <AdminPanel
              onClose={() => setShowAdminPanel(false)}
              onAuthenticated={handleAdminAuthenticated}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showPaywallAfterSignup && (
            <PaywallModal
              isOpen={showPaywallAfterSignup}
              onClose={() => {
                setShowPaywallAfterSignup(false);
                setAppStep("onboarding");
              }}
              moduleTitle="Полный доступ к курсу"
              userId={authState.userId ?? undefined}
              userEmail={authState.email ?? undefined}
              accessToken={authState.accessToken ?? undefined}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (appStep === "onboarding") {
    return (
      <MiniOnboarding
        name={
          onboardingName ||
          authState.name ||
          authState.email?.split("@")[0] ||
          ""
        }
        onComplete={() => {
          setAppStep("pricing");
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  // ── Pricing / plan selection screen (pre-auth) ─────────────────────────────
  if (appStep === "pricing") {
    return (
      <PreAuthPricing
        onDemo={() => {
          setIsDemoMode(true);
          try {
            localStorage.setItem("demo-mode", "true");
          } catch {}
          setAppStep("course");
          window.scrollTo(0, 0);
        }}
        onLogin={() => {
          setAuthMode("login");
          setAppStep("auth");
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  if (appStep === "welcome") {
    return (
      <WelcomeDashboard
        name={
          onboardingName ||
          authState.name ||
          authState.email?.split("@")[0] ||
          ""
        }
        completedLessons={completedLessons}
        examScore={examScore}
        onStartLesson={(lessonId) => {
          setAppStep("course");
          setSelectedLesson(lessonId);
          setViewMode("lesson");
          window.scrollTo(0, 0);
        }}
        onOpenDiagnostic={() => {
          setAppStep("course");
          setViewMode("diagnostic");
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Admin mode: subtle indicator in top-left area */}
      {isAdminMode && appStep === "course" && (
        <div className="fixed top-1.5 left-8 z-40 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-[0.6rem] font-semibold select-none pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Админ
        </div>
      )}

      {/* ── Demo mode: floating "Buy full access" strip ──────────────────── */}
      {isDemoMode && !canAccessPaidContent && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 1.2,
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="fixed bottom-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-700 shadow-2xl"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🦔</span>
            <div className="min-w-0">
              <p className="text-white font-semibold text-[0.875rem] leading-tight">
                Демо-режим: 3 урока из 60+
              </p>
              <p className="text-white/70 text-[0.75rem] hidden sm:block">
                Открой полный курс — оплата без регистрации
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setAppStep("pricing");
              window.scrollTo(0, 0);
            }}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-teal-700 font-bold text-sm hover:bg-teal-50 transition-colors shadow-md whitespace-nowrap"
          >
            Купить доступ →
          </button>
        </motion.div>
      )}

      <Sidebar
        selectedLesson={selectedLesson}
        onSelectLesson={handleSelectLesson}
        accessLevel={
          TESTING_ALL_OPEN
            ? "lifetime"
            : canAccessPaidContent
              ? accessLevel
              : "free"
        }
        freeLessonIds={
          TESTING_ALL_OPEN
            ? undefined
            : canAccessPaidContent
              ? undefined
              : new Set([
                  ...FREE_LESSON_IDS,
                  ...[...bonusLessons].filter(
                    (id) => !PAID_ONLY_LESSON_IDS.has(id),
                  ),
                ])
        }
        completedLessons={completedLessons}
        onOpenFinalExam={handleOpenFinalExam}
        showFinalExam={viewMode === "exam"}
        bookmarks={bookmarks}
        onOpenGlossary={() => setView("glossary")}
        onOpenFlashcards={() => setView("flashcards")}
        onOpenCertificate={() => setView("certificate")}
        isDemoMode={isDemoMode}
        userProgress={userProgress}
        userProgressResponse={userProgressResponse}
        onGetFullAccess={() => {
          setPaywallModuleTitle("Полный доступ к курсу");
          setShowPaywall(true);
        }}
      />
      <main className="flex-1 min-w-0 overflow-hidden relative flex flex-col">
        {/* Admin mode tab switcher */}
        {isAdminMode && (
          <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm z-10">
            <button
              onClick={() => {
                setViewMode("admin");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "admin"
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              Панель администратора
            </button>
            <button
              onClick={() => {
                setViewMode("lesson");
                setSelectedLesson((prev) => prev || "m1-l1");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode !== "admin"
                  ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              Курс
            </button>
          </div>
        )}
        {/* Access-check loading banner — показывается пока идёт запрос к get-user-access */}
        {accessLoading && (
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600/90 backdrop-blur-sm text-white text-xs font-medium shadow-md">
            <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
            Проверяем доступ…
          </div>
        )}
        {/* Robokassa payment result banner */}
        {paymentBanner && (
          <div
            className={`absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 text-[0.875rem] font-medium shadow-md
            ${
              paymentBanner === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            <span className="flex-1">
              {paymentBanner === "success"
                ? "✅ Оплата прошла успешно! Перезайдите в аккаунт - доступ активируется автоматически."
                : "❌ Оплата не прошла. Попробуйте снова или свяжитесь с @ohh_lessya в Telegram."}
            </span>
            <button
              onClick={() => {
                setPaymentBanner(null);
                try {
                  localStorage.removeItem(
                    "pending-payment-banner",
                  );
                } catch {}
              }}
              className="text-white/80 hover:text-white text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={contentKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className={
              isAdminMode
                ? "flex-1 min-h-0 overflow-hidden"
                : "h-full"
            }
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <AIAssistant
        lessonTitle={currentLessonData?.lesson.title}
        lessonContent={currentLessonData?.lesson.content.join(
          "\n",
        )}
        moduleTitle={currentLessonData?.module.title}
      />
      <PomodoroTimer />
      {appStep === "course" && <InactivityBanner />}
      <BadgeNotifier
        completedLessons={completedLessons}
        examScore={examScore}
      />
      <CommandPalette
        onSelectLesson={handleSelectLesson}
        onSetView={setView}
        completedLessons={completedLessons}
        bookmarks={bookmarks}
        onOpenOnboarding={handleOpenOnboarding}
      />
      <Confetti active={celebration.confettiActive} />
      <LessonCompleteAnimation
        active={celebration.lessonAnimation}
      />
      <ModuleCompleteOverlay
        moduleId={celebration.moduleComplete}
        onDismiss={celebration.dismissModuleComplete}
        onNextModule={handleModuleNext}
      />
      <AnimatePresence>
        {showUIKit && (
          <UIKit
            isDark={isDark}
            onToggleDark={toggleDark}
            onClose={() => setShowUIKit(false)}
          />
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleAuth}
        showCloseButton={authState.isAuthenticated}
      />

      {/* Profile Cabinet */}
      <AnimatePresence>
        {showProfileCabinet && (
          <ProfileCabinet
            authState={authState}
            completedLessons={completedLessons}
            examScore={examScore}
            bookmarks={bookmarks}
            onClose={() => setShowProfileCabinet(false)}
            onSignOut={() => {
              clearAllLocalData();
              signOut();
              setCanAccessPaidContent(false);
              setAccessLevel("free");
              setIsAdminMode(false);
              setAdminPassword("");
              setShowProfileCabinet(false);
              setAppStep("auth");
              setAuthMode("landing");
              try {
                localStorage.removeItem("course-started");
              } catch {}
              try {
                localStorage.removeItem("auth-state");
              } catch {}
            }}
            isDark={isDark}
            onToggleDark={toggleDark}
          />
        )}
      </AnimatePresence>

      {/* Admin panel */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel
            onClose={() => setShowAdminPanel(false)}
            onAuthenticated={handleAdminAuthenticated}
          />
        )}
      </AnimatePresence>

      {/* Paywall — скрываем если canAccessPaidContent */}
      <PaywallModal
        isOpen={showPaywall && !canAccessPaidContent}
        onClose={() => setShowPaywall(false)}
        moduleTitle={paywallModuleTitle}
        userId={authState.userId ?? undefined}
        userEmail={authState.email ?? undefined}
        accessToken={authState.accessToken ?? undefined}
      />

    </div>
  );
}