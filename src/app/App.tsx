import { MiniOnboarding } from "./components/mini-onboarding";
import { ProfileCabinet } from "./components/profile-cabinet";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { PomodoroTimer } from "./components/pomodoro";
import { Sidebar } from "./components/sidebar";
import { LessonView } from "./components/lesson-view";
import { FinalExam } from "./components/final-exam";
import { AIAssistant } from "./components/ai-assistant";
import { Glossary } from "./components/glossary";
import { Flashcards } from "./components/flashcards";
import { Certificate } from "./components/certificate";
import { logActivity } from "./components/gamification";
import { logProgress } from "./components/progress-chart";
import { sendWebhook } from "./components/webhook";
import { courseModules, getAllLessons, isModuleUnlocked } from "./components/course-data";
import { syncProgressFromServer } from "./components/interactive-progress";
import { BadgeNotifier } from "./components/badge-notifier";
import { CommandPalette } from "./components/command-palette";
import { Confetti, ModuleCompleteOverlay, LessonCompleteAnimation, useCelebration } from "./components/celebrations";
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
import { AuthModal, useAuth, saveProgressToSupabase, loadProgressFromSupabase } from "./components/auth-modal";
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
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { fetchUserAccess } from "./components/user-access";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

// First 3 lessons of module 1 are free + entire analytics module (m-analytics with 9 lessons) + simulator lesson
const FREE_LESSON_IDS = new Set([
  "m1-l1", "m1-l2", "m1-l3",
  "m-analytics-l1", "m-analytics-l2", "m-analytics-l3",
  "m-analytics-l4", "m-analytics-l5", "m-analytics-l6",
  "m-analytics-l7", "m-analytics-l8", "m-analytics-l9",
  "m-sim-l1",
]);

// 🔓 TEMPORARY TESTING FLAG — set to false to restore paywall
const TESTING_ALL_OPEN = false;

type ViewMode = "lesson" | "exam" | "glossary" | "flashcards" | "certificate" | "capstone" | "diagnostic" | "pm-coach" | "notebook" | "interview" | "templates" | "analytics" | "data-exercises" | "portfolio" | "resume-review" | "competency-radar";

export default function App() {
  // ── Payment route detection ──────────────────────────────────────────────
  // Detect /payment-success and /payment-fail paths BEFORE any auth logic.
  // These standalone pages are shown without requiring login.
  const isPrivacyPage = window.location.pathname === "/privacy-policy";

  const paymentPageType = useState<"success" | "fail" | null>(() => {
    const path = window.location.pathname;
    if (path === "/payment-success") return "success";
    if (path === "/payment-fail") return "fail";
    return null;
  })[0];

  const paymentInvId = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("invId") || params.get("InvId") || null;
  })[0];

  // orderId is sent by super-task (YooKassa) redirects — always goes to /payment-success
  // regardless of success or failure; we resolve actual status on that page
  const paymentOrderId = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("orderId") || params.get("order_id") || null;
  })[0];

  // ─────────────────────────────────────────────────────────────────────────

  const [appStep, setAppStep] = useState<"loading" | "auth" | "onboarding" | "welcome" | "course">("loading");

  // Auth/Demo mode state
  const [authMode, setAuthMode] = useState<"selector" | "signup" | "login" | null>("selector");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showPaywallAfterSignup, setShowPaywallAfterSignup] = useState(false);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileCabinet, setShowProfileCabinet] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallModuleTitle, setPaywallModuleTitle] = useState<string | undefined>(undefined);
  // Access level: "free" | "monthly" | "lifetime"
  const [accessLevel, setAccessLevel] = useState<"free" | "monthly" | "lifetime">("free");
  // canAccessPaidContent — единственная проверка для UI. true = открыть все платные модули
  const [canAccessPaidContent, setCanAccessPaidContent] = useState<boolean>(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [paymentBanner, setPaymentBanner] = useState<"success" | "failed" | null>(null);
  const { authState, updateAuth, signOut, checkSession } = useAuth();

  // Module intro state
  const [moduleIntroData, setModuleIntroData] = useState<{ module: typeof courseModules[0]; pendingLessonId: string } | null>(null);

  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("lesson");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("course-progress");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("course-bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [examScore, setExamScore] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("best-exam-score");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  // Track last sync to debounce
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    keysToRemove.forEach(key => { try { localStorage.removeItem(key); } catch {} });
  }, []);

  // Apply server progress to local state and localStorage
  const applyServerProgress = useCallback((serverProgress: { completedLessons: string[]; bookmarks: string[]; examScore: number | null } | null) => {
    if (!serverProgress) return;
    const serverCompleted = new Set<string>(serverProgress.completedLessons || []);
    setCompletedLessons(serverCompleted);
    try { localStorage.setItem("course-progress", JSON.stringify([...serverCompleted])); } catch {}
    const serverBookmarks = new Set<string>(serverProgress.bookmarks || []);
    setBookmarks(serverBookmarks);
    try { localStorage.setItem("course-bookmarks", JSON.stringify([...serverBookmarks])); } catch {}
    if (serverProgress.examScore != null) {
      setExamScore(serverProgress.examScore);
      try { localStorage.setItem("best-exam-score", String(serverProgress.examScore)); } catch {}
    } else {
      setExamScore(null);
      try { localStorage.removeItem("best-exam-score"); } catch {}
    }
  }, []);

  // Load access level from get-user-access endpoint (единственный источник правды)
  const loadAccessLevel = useCallback(async (accessToken: string, userId: string) => {
    // Сбрасываем доступ НЕМЕДЛЕННО до завершения async-запроса
    setCanAccessPaidContent(false);
    setAccessLevel("free");
    console.log(`[App] ── loadAccessLevel called ──`);
    console.log(`[App] [ID-CHECK] authState.userId (текущий пользователь) = "${authState.userId ?? "null"}"`);
    console.log(`[App] [ID-CHECK] userId передан в get-user-access = "${userId}"`);
    console.log(`[App] [ID-CHECK] accessToken present = ${!!accessToken}`);

    if (authState.userId && authState.userId !== userId) {
      console.error(
        `[App] [ID-MISMATCH] ❌ user mismatch: authState.userId="${authState.userId}" ≠ passed userId="${userId}"`
      );
    } else {
      console.log(`[App] [ID-CHECK] ✅ userId consistent`);
    }

    // Передаём accessToken — endpoint может требовать Authorization
    const result = await fetchUserAccess(accessToken, userId);
    console.log(`[App] userId="${userId}" → accessLevel="${result.accessLevel}" canAccessPaidContent=${result.canAccessPaidContent}`);

    setAccessLevel(result.accessLevel);
    setCanAccessPaidContent(result.canAccessPaidContent);

    if (result.canAccessPaidContent) {
      console.log(`[App] ✅ Paid access GRANTED — paywall скрыт, все модули открыты`);
    } else {
      console.log(`[App] 🔒 Paid access DENIED — только бесплатные уроки`);
    }
  }, [authState.userId]);

  // Save progress to Supabase when auth state or progress changes
  const scheduleProgressSync = useCallback((
    completedArr: string[],
    bookmarksArr: string[],
    score: number | null
  ) => {
    if (!authState.isAuthenticated || !authState.accessToken || !authState.userId) return;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      saveProgressToSupabase(
        authState.accessToken!,
        authState.userId!,
        completedArr,
        bookmarksArr,
        score
      );
    }, 2000);
  }, [authState]);

  // Load progress from Supabase when user logs in
  const handleAuth = useCallback(async (state: typeof authState, isNewUser: boolean) => {
    updateAuth(state);
    setShowAuthModal(false);
    try { localStorage.setItem("course-started", "1"); } catch {}

    if (isNewUser) {
      // NEW account: wipe all local data, start completely fresh
      clearAllLocalData();
      setCompletedLessons(new Set<string>());
      setBookmarks(new Set<string>());
      setExamScore(null);
      // Capture name immediately from the passed state (before React batches the authState update)
      setOnboardingName(state.name || state.email?.split("@")[0] || "");
      // Save empty progress to server for this new user
      if (state.accessToken && state.userId) {
        saveProgressToSupabase(state.accessToken, state.userId, [], [], null);
      }
      // Show paywall modal immediately after signup
      setShowPaywallAfterSignup(true);
      setAppStep("auth"); // Stay on auth screen to show paywall modal
    } else if (state.isAuthenticated && state.accessToken && state.userId) {
      // EXISTING account: wipe local data first, then load strictly from server
      clearAllLocalData();
      setCompletedLessons(new Set<string>());
      setBookmarks(new Set<string>());
      setExamScore(null);
      try {
        const serverProgress = await loadProgressFromSupabase(state.accessToken, state.userId);
        applyServerProgress(serverProgress);
        if (!serverProgress) {
          saveProgressToSupabase(state.accessToken, state.userId, [], [], null);
        }
      } catch {}
      // Load access level
      await loadAccessLevel(state.accessToken, state.userId);
      // Clear persisted payment banner after login (access is now loaded)
      try { localStorage.removeItem("pending-payment-banner"); } catch {}
      setAppStep("course");
    }
  }, [updateAuth, clearAllLocalData, applyServerProgress, loadAccessLevel]);

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
    checkSession().then(async (sessionState) => {
      if (sessionState && sessionState.accessToken && sessionState.userId) {
        try {
          const serverProgress = await loadProgressFromSupabase(sessionState.accessToken, sessionState.userId);
          applyServerProgress(serverProgress);
        } catch {}
        await loadAccessLevel(sessionState.accessToken, sessionState.userId);
        try { localStorage.setItem("course-started", "1"); } catch {}
        setAppStep("course");
      } else {
        // No valid session - show auth immediately
        setAppStep("auth");
      }
    }).catch(() => {
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
      try { localStorage.setItem("pending-payment-banner", "success"); } catch {}
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      // Re-check access level after a short delay
      setTimeout(() => {
        if (authState.accessToken && authState.userId) {
          loadAccessLevel(authState.accessToken, authState.userId);
        }
      }, 1500);
    } else if (paymentParam === "failed") {
      setPaymentBanner("failed");
      try { localStorage.setItem("pending-payment-banner", "failed"); } catch {}
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
    // Also check for persisted banner from previous redirect
    try {
      const persisted = localStorage.getItem("pending-payment-banner") as "success" | "failed" | null;
      if (persisted && !paymentParam) {
        setPaymentBanner(persisted);
      }
    } catch {}
  }, []);

  const currentLessonData = useMemo(
    () => selectedLesson ? getAllLessons().find(l => l.lesson.id === selectedLesson) : null,
    [selectedLesson]
  );

  const handleToggleComplete = useCallback((lessonId: string) => {
    setCompletedLessons(prev => {
      const next = new Set(prev);
      const allLessons = getAllLessons();
      if (next.has(lessonId)) {
        next.delete(lessonId);
        sendWebhook({ type: "lesson_uncompleted", lessonId, lessonTitle: allLessons.find(l => l.lesson.id === lessonId)?.lesson.title || "" });
      } else {
        next.add(lessonId);
        logActivity();
        const lessonData = allLessons.find(l => l.lesson.id === lessonId);
        const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
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
          percentage: Math.round((next.size / totalLessons) * 100),
        });
        celebration.triggerLessonComplete();
        setTimeout(() => celebration.checkModuleCompletion(lessonId), 100);
      }
      try {
        localStorage.setItem("course-progress", JSON.stringify([...next]));
      } catch {}
      logProgress(next.size);
      // Sync to Supabase
      scheduleProgressSync([...next], [...bookmarks], examScore);
      return next;
    });
  }, [bookmarks, examScore, scheduleProgressSync]);

  const handleToggleBookmark = useCallback((lessonId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      try {
        localStorage.setItem("course-bookmarks", JSON.stringify([...next]));
      } catch {}
      scheduleProgressSync([...completedLessons], [...next], examScore);
      return next;
    });
  }, [completedLessons, examScore, scheduleProgressSync]);

  const handleSelectLesson = useCallback((lessonId: string) => {
    // 1. Check paywall — используем canAccessPaidContent как единственную проверку
    if (!canAccessPaidContent && !FREE_LESSON_IDS.has(lessonId) && !TESTING_ALL_OPEN) {
      const allLessons = getAllLessons();
      const lessonData = allLessons.find(l => l.lesson.id === lessonId);
      setPaywallModuleTitle(lessonData?.module.title);
      setSelectedLesson(lessonId);
      setViewMode("lesson");
      setModuleIntroData(null);
      window.scrollTo(0, 0);
      return;
    }

    // 2. Check if this is the first lesson of a module → show intro if not yet seen
    const allLessons = getAllLessons();
    const lessonData = allLessons.find(l => l.lesson.id === lessonId);
    if (lessonData) {
      const mod = lessonData.module;
      const isFirstLesson = mod.lessons[0]?.id === lessonId;
      if (isFirstLesson) {
        const alreadyIntroduced = !!localStorage.getItem(`introduced-module-${mod.id}`);
        if (!alreadyIntroduced) {
          setModuleIntroData({ module: mod, pendingLessonId: lessonId });
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
  }, [canAccessPaidContent]);

  const handleOpenFinalExam = useCallback(() => {
    setViewMode("exam");
    setSelectedLesson("");
    window.scrollTo(0, 0);
  }, []);

  const handleBackFromExam = useCallback(() => {
    setViewMode("lesson");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Home" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSelectedLesson("");
        setViewMode("lesson");
        window.scrollTo(0, 0);
      }
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && selectedLesson && viewMode === "lesson") {
        const allLessons = getAllLessons();
        const currentIndex = allLessons.findIndex(l => l.lesson.id === selectedLesson);
        if (currentIndex < 0) return;
        if (e.key === "ArrowLeft" && currentIndex > 0) {
          e.preventDefault();
          handleSelectLesson(allLessons[currentIndex - 1].lesson.id);
        }
        if (e.key === "ArrowRight" && currentIndex < allLessons.length - 1) {
          const next = allLessons[currentIndex + 1];
          if (isModuleUnlocked(next.module, completedLessons)) {
            e.preventDefault();
            handleSelectLesson(next.lesson.id);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLesson, viewMode, completedLessons, handleSelectLesson]);

  const setView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setSelectedLesson("");
    window.scrollTo(0, 0);
  }, []);



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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "U") {
        e.preventDefault();
        setShowUIKit(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleModuleNext = useCallback(() => {
    const modId = celebration.moduleComplete;
    if (!modId) return;
    const modIndex = courseModules.findIndex(m => m.id === modId);
    const nextMod = modIndex >= 0 && modIndex < courseModules.length - 1 ? courseModules[modIndex + 1] : null;
    if (nextMod) {
      handleSelectLesson(nextMod.lessons[0].id);
    }
    celebration.dismissModuleComplete();
  }, [celebration.moduleComplete, handleSelectLesson, celebration.dismissModuleComplete]);

  const contentKey = moduleIntroData
    ? `intro-${moduleIntroData.module.id}`
    : viewMode === "lesson" ? (selectedLesson || "welcome") : viewMode;

  const renderMainContent = () => {
    // Module intro takes priority over everything
    if (moduleIntroData) {
      return (
        <ModuleIntroScreen
          module={moduleIntroData.module}
          lessonCount={moduleIntroData.module.lessons.length}
          onStart={() => {
            try { localStorage.setItem(`introduced-module-${moduleIntroData.module.id}`, "1"); } catch {}
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
      case "exam":
        return <FinalExam onBack={handleBackFromExam} completedLessons={completedLessons} />;
      case "glossary":
        return <Glossary onSelectLesson={handleSelectLesson} onClose={() => setView("lesson")} />;
      case "flashcards":
        return <Flashcards onClose={() => setView("lesson")} />;
      case "certificate":
        return <Certificate completedLessons={completedLessons} examScore={examScore} onClose={() => setView("lesson")} />;
      case "capstone":
        return <CapstoneProjectsView onClose={() => setView("lesson")} accessLevel={accessLevel} isDemoMode={isDemoMode} />;
      case "diagnostic":
        return (
          <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
            <div className="max-w-[720px] mx-auto px-6 py-10">
              <DiagnosticQuiz onComplete={() => setView("lesson")} />
            </div>
          </div>
        );
      case "pm-coach":
        return <PMCoach onClose={() => setView("lesson")} onSelectLesson={(id: string) => { setView("lesson"); handleSelectLesson(id); }} />;
      case "notebook":
        return <PracticeNotebook onClose={() => setView("lesson")} completedLessons={completedLessons} />;
      case "interview":
        return <InterviewSimulator onClose={() => setView("lesson")} />;
      case "templates":
        return <TemplateLibrary onClose={() => setView("lesson")} />;
      case "analytics":
        return <AnalyticsDashboard completedLessons={completedLessons} onClose={() => setView("lesson")} />;
      case "data-exercises":
        return <DataExercises onClose={() => setView("lesson")} />;
      case "portfolio":
        return <PortfolioBuilder completedLessons={completedLessons} examScore={examScore} onClose={() => setView("lesson")} />;
      case "resume-review":
        return <ResumeReview onClose={() => setView("lesson")} />;
      case "competency-radar":
        return <CompetencyRadar completedLessons={completedLessons} onClose={() => setView("lesson")} onSelectLesson={handleSelectLesson} />;
      default:
        // If selected lesson is locked → show inline paywall screen
        // Используем canAccessPaidContent как единственную проверку доступа к платным урокам
        if (!canAccessPaidContent && selectedLesson && !FREE_LESSON_IDS.has(selectedLesson) && !TESTING_ALL_OPEN) {
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
            onOpenDataExercises={() => setView("data-exercises")}
            onOpenPortfolio={() => setView("portfolio")}
            onOpenResumeReview={() => setView("resume-review")}
            onOpenCompetencyRadar={() => setView("competency-radar")}
            onOpenOnboarding={handleOpenOnboarding}
            onOpenGlossary={() => setView("glossary")}
            onOpenFlashcards={() => setView("flashcards")}
            onOpenCertificate={() => setView("certificate")}
            accessLevel={canAccessPaidContent ? accessLevel : "free"}
            isDemoMode={isDemoMode}
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
  // ─────────────────────────────────────────────────────────────────────────

  // ── Privacy Policy standalone page ──────────────────────────────────────
  if (isPrivacyPage) {
    return <PrivacyPolicyModal isOpen={true} onClose={() => { window.location.href = "/"; }} />;
  }

  // Loading screen while checking session
  if (appStep === "loading") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
        <p className="text-sm text-muted-foreground/60">Загрузка...</p>
      </div>
    );
  }

  if (appStep === "auth") {
    // If no auth mode selected, show mode selector
    if (authMode === "selector") {
      return (
        <>
          <AuthModeSelector
            onDemoMode={() => {
              // Demo mode: enter course without authentication
              setIsDemoMode(true);
              try { localStorage.setItem("demo-mode", "true"); } catch {}
              setAppStep("course");
              setAuthMode(null);
            }}
            onSignup={() => {
              setAuthMode("signup");
            }}
            onLogin={() => {
              setAuthMode("login");
            }}
          />
          <AnimatePresence>
            {showAdminPanel && (
              <AdminPanel onClose={() => setShowAdminPanel(false)} />
            )}
          </AnimatePresence>
        </>
      );
    }

    // Show AuthPage for signup or login
    return (
      <>
        <AuthPage
          onAuth={handleAuth}
          onAdmin={() => setShowAdminPanel(true)}
        />
        <AnimatePresence>
          {showAdminPanel && (
            <AdminPanel onClose={() => setShowAdminPanel(false)} />
          )}
        </AnimatePresence>
        {/* Show paywall modal after successful signup */}
        <AnimatePresence>
          {showPaywallAfterSignup && (
            <PaywallModal
              isOpen={showPaywallAfterSignup}
              onClose={() => {
                setShowPaywallAfterSignup(false);
                setAppStep("onboarding"); // Proceed to onboarding after closing paywall
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
        name={onboardingName || authState.name || authState.email?.split("@")[0] || ""}
        onComplete={() => {
          setAppStep("welcome");
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  if (appStep === "welcome") {
    return (
      <WelcomeDashboard
        name={onboardingName || authState.name || authState.email?.split("@")[0] || ""}
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
      {/* Hidden admin button - top-left corner, very inconspicuous */}
      <button
        onClick={() => setShowAdminPanel(true)}
        className="fixed top-1.5 left-1.5 z-50 w-5 h-5 flex items-center justify-center
          text-[0.5rem] text-slate-300/40 dark:text-slate-600/40 hover:text-slate-400/70 dark:hover:text-slate-400/70
          transition-colors cursor-default select-none"
        title=""
        tabIndex={-1}
      >
        ө
      </button>

      <Sidebar
        selectedLesson={selectedLesson}
        onSelectLesson={handleSelectLesson}
        accessLevel={TESTING_ALL_OPEN ? "lifetime" : (canAccessPaidContent ? accessLevel : "free")}
        freeLessonIds={TESTING_ALL_OPEN ? undefined : (canAccessPaidContent ? undefined : FREE_LESSON_IDS)}
        completedLessons={completedLessons}
        onOpenFinalExam={handleOpenFinalExam}
        showFinalExam={viewMode === "exam"}
        bookmarks={bookmarks}
        onOpenGlossary={() => setView("glossary")}
        onOpenFlashcards={() => setView("flashcards")}
        onOpenCertificate={() => setView("certificate")}
        isDemoMode={isDemoMode}
      />
      <main className="flex-1 min-w-0 overflow-hidden relative">
        {/* Robokassa payment result banner */}
        {paymentBanner && (
          <div className={`absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 text-[0.875rem] font-medium shadow-md
            ${paymentBanner === "success"
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
              onClick={() => { setPaymentBanner(null); try { localStorage.removeItem("pending-payment-banner"); } catch {}; }}
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
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full"
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <AIAssistant
        lessonTitle={currentLessonData?.lesson.title}
        lessonContent={currentLessonData?.lesson.content.join("\n")}
        moduleTitle={currentLessonData?.module.title}
      />
      <PomodoroTimer />
      <BadgeNotifier completedLessons={completedLessons} examScore={examScore} />
      <CommandPalette
        onSelectLesson={handleSelectLesson}
        onSetView={setView}
        completedLessons={completedLessons}
        bookmarks={bookmarks}
        onOpenOnboarding={handleOpenOnboarding}
      />
      <Confetti active={celebration.confettiActive} />
      <LessonCompleteAnimation active={celebration.lessonAnimation} />
      <ModuleCompleteOverlay
        moduleId={celebration.moduleComplete}
        onDismiss={celebration.dismissModuleComplete}
        onNextModule={handleModuleNext}
      />
      <AnimatePresence>
        {showUIKit && (
          <UIKit isDark={isDark} onToggleDark={toggleDark} onClose={() => setShowUIKit(false)} />
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
              setShowProfileCabinet(false);
              setAppStep("auth");
              try { localStorage.removeItem("course-started"); } catch {}
              try { localStorage.removeItem("auth-state"); } catch {}
            }}
            isDark={isDark}
            onToggleDark={toggleDark}
          />
        )}
      </AnimatePresence>

      {/* Admin panel */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
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