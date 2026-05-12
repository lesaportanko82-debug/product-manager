import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Timer, Play, Pause, RotateCcw, Coffee, Brain,
  X, ChevronDown, ChevronUp, Settings, Volume2, VolumeX,
  Flame, Trophy, Minus, Plus, Bell, BellOff, BellRing, CheckCircle
} from "lucide-react";
import { OwlMascot, type OwlMood } from "./ai-assistant";

// ===== Types =====
type PomodoroPhase = "focus" | "shortBreak" | "longBreak";
type NotificationPermission = "default" | "granted" | "denied";

interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

interface PomodoroStats {
  today: number;
  total: number;
  streak: number;
  lastDate: string;
  totalMinutes: number;
}

interface InAppToast {
  id: number;
  title: string;
  body: string;
  phase: PomodoroPhase;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: false,
};

const PHASE_CONFIG: Record<PomodoroPhase, { label: string; color: string; bgColor: string; icon: React.ElementType; emoji: string }> = {
  focus: { label: "Фокус", color: "text-teal-600", bgColor: "from-teal-400 to-emerald-400", icon: Brain, emoji: "🧠" },
  shortBreak: { label: "Короткий перерыв", color: "text-amber-600", bgColor: "from-amber-400 to-orange-400", icon: Coffee, emoji: "☕" },
  longBreak: { label: "Длинный перерыв", color: "text-violet-600", bgColor: "from-violet-400 to-purple-400", icon: Coffee, emoji: "🌿" },
};

// ===== Sound =====
function playNotificationSound(type: "complete" | "tick") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "complete") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {}
}

// ===== Browser Notifications =====
function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission as NotificationPermission;
}

async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  const result = await Notification.requestPermission();
  return result as NotificationPermission;
}

function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: icon || undefined,
      badge: undefined,
      tag: "pomodoro-timer",
      renotify: true,
      silent: false,
    });
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
    // Focus window on click
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {}
}

// ===== localStorage helpers =====
function loadSettings(): PomodoroSettings {
  try {
    const saved = localStorage.getItem("pomodoro-settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: PomodoroSettings) {
  try { localStorage.setItem("pomodoro-settings", JSON.stringify(s)); } catch {}
}

function loadStats(): PomodoroStats {
  try {
    const saved = localStorage.getItem("pomodoro-stats");
    if (!saved) return { today: 0, total: 0, streak: 0, lastDate: "", totalMinutes: 0 };
    const stats: PomodoroStats = JSON.parse(saved);
    const today = new Date().toDateString();
    if (stats.lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = stats.lastDate === yesterday.toDateString();
      return {
        ...stats,
        today: 0,
        streak: isConsecutive ? stats.streak : 0,
      };
    }
    return stats;
  } catch {
    return { today: 0, total: 0, streak: 0, lastDate: "", totalMinutes: 0 };
  }
}

function saveStats(stats: PomodoroStats) {
  try { localStorage.setItem("pomodoro-stats", JSON.stringify(stats)); } catch {}
}

// ===== In-App Toast =====
const TOAST_MOODS: Record<PomodoroPhase, OwlMood> = {
  focus:      "celebrating",  // just finished focus session
  shortBreak: "encouraging",  // break ended, time to refocus
  longBreak:  "happy",        // long break ended, refreshed
};

function PomodoroToast({ toast, onDismiss }: { toast: InAppToast; onDismiss: (id: number) => void }) {
  const config = PHASE_CONFIG[toast.phase];
  const PIcon = config.icon;
  const mood = TOAST_MOODS[toast.phase];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="pointer-events-auto w-[280px] bg-white dark:bg-card rounded-xl shadow-xl shadow-black/8 border border-border/50 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${config.bgColor}`} />
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.bgColor} flex items-center justify-center shrink-0 shadow-sm relative`}>
          <PIcon className="w-4 h-4 text-white" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-card border border-border/40 flex items-center justify-center shadow-sm">
            <OwlMascot size={14} mood={mood} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.8125rem] font-semibold text-foreground leading-tight">{toast.title}</p>
          <p className="text-[0.6875rem] text-muted-foreground mt-0.5 leading-relaxed">{toast.body}</p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {/* Auto-dismiss progress */}
      <motion.div
        className={`h-[2px] bg-gradient-to-r ${config.bgColor} opacity-30`}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 6, ease: "linear" }}
        style={{ transformOrigin: "left" }}
      />
    </motion.div>
  );
}

// ===== Circle Progress =====
function CircleProgress({
  progress,
  size = 120,
  strokeWidth = 4,
  color,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ===== Settings Panel =====
function SettingsPanel({
  settings,
  onChange,
  onClose,
  notifPermission,
  onRequestNotifPermission,
}: {
  settings: PomodoroSettings;
  onChange: (s: PomodoroSettings) => void;
  onClose: () => void;
  notifPermission: NotificationPermission;
  onRequestNotifPermission: () => void;
}) {
  const update = (partial: Partial<PomodoroSettings>) => {
    const next = { ...settings, ...partial };
    onChange(next);
    saveSettings(next);
  };

  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;

  const NumberStepper = ({ value, onChange: onVal, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onVal(Math.max(min, value - 1))}
          className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
        >
          <Minus className="w-3 h-3 text-slate-600 dark:text-slate-400" />
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          onClick={() => onVal(Math.min(max, value + 1))}
          className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
        >
          <Plus className="w-3 h-3 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Настройки</span>
        <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
        <NumberStepper
          value={settings.focusMinutes}
          onChange={v => update({ focusMinutes: v })}
          min={1} max={60}
          label="Фокус (мин)"
        />
        <NumberStepper
          value={settings.shortBreakMinutes}
          onChange={v => update({ shortBreakMinutes: v })}
          min={1} max={30}
          label="Кор. перерыв (мин)"
        />
        <NumberStepper
          value={settings.longBreakMinutes}
          onChange={v => update({ longBreakMinutes: v })}
          min={1} max={60}
          label="Длин. перерыв (мин)"
        />
        <NumberStepper
          value={settings.longBreakInterval}
          onChange={v => update({ longBreakInterval: v })}
          min={2} max={8}
          label="Длин. перерыв через"
        />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <span>Авто-старт перерыва</span>
          <input
            type="checkbox"
            checked={settings.autoStartBreaks}
            onChange={e => update({ autoStartBreaks: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-400"
          />
        </label>
        <label className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <span>Авто-старт следующей сессии</span>
          <input
            type="checkbox"
            checked={settings.autoStartFocus}
            onChange={e => update({ autoStartFocus: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-400"
          />
        </label>
      </div>

      {/* Notifications section */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Bell className="w-3 h-3 text-slate-500" />
          <span className="text-[0.6875rem] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Уведомления</span>
        </div>

        {!notificationsSupported ? (
          <div className="flex items-center gap-2 px-2.5 py-2 bg-red-50 rounded-lg">
            <BellOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[0.6875rem] text-red-600">Браузер не поддерживает уведомления</span>
          </div>
        ) : notifPermission === "denied" ? (
          <div className="flex items-center gap-2 px-2.5 py-2 bg-amber-50 rounded-lg">
            <BellOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[0.6875rem] text-amber-700 leading-tight">
              Уведомления заблокированы. Разрешите их в настройках браузера.
            </span>
          </div>
        ) : notifPermission === "default" ? (
          <button
            onClick={onRequestNotifPermission}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[0.75rem] font-medium transition-colors"
          >
            <BellRing className="w-3.5 h-3.5" />
            Включить уведомления
          </button>
        ) : (
          <label className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Браузерные уведомления
            </span>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={e => update({ notificationsEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-400"
            />
          </label>
        )}
      </div>
    </motion.div>
  );
}

// ===== Main Component =====
export function PomodoroTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [stats, setStats] = useState<PomodoroStats>(loadStats);
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission);
  const [toasts, setToasts] = useState<InAppToast[]>([]);
  const toastIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimeRef = useRef(settings.focusMinutes * 60);

  // Sync permission state (might change externally)
  useEffect(() => {
    const check = () => setNotifPermission(getNotificationPermission());
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  const addToast = useCallback((title: string, body: string, toastPhase: PomodoroPhase) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-2), { id, title, body, phase: toastPhase }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleRequestNotifPermission = useCallback(async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      const next = { ...settings, notificationsEnabled: true };
      setSettings(next);
      saveSettings(next);
      // Send test notification
      sendBrowserNotification(
        "Уведомления включены! 🎉",
        "Теперь вы будете получать уведомления при завершении Помодоро-сессий."
      );
    }
  }, [settings]);

  const getPhaseTime = useCallback((p: PomodoroPhase) => {
    switch (p) {
      case "focus": return settings.focusMinutes * 60;
      case "shortBreak": return settings.shortBreakMinutes * 60;
      case "longBreak": return settings.longBreakMinutes * 60;
    }
  }, [settings]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  // Update document title while running
  useEffect(() => {
    if (isRunning) {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      const phaseEmoji = PHASE_CONFIG[phase].emoji;
      document.title = `${phaseEmoji} ${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} — Помодоро`;
    } else if (timeLeft === 0) {
      // Keep the completion title briefly
    } else {
      document.title = "Продакт-менеджмент — Полный курс";
    }
    return () => { document.title = "Продакт-менеджмент — Полный курс"; };
  }, [isRunning, timeLeft, phase]);

  // Phase complete
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (settings.soundEnabled) playNotificationSound("complete");

      // Determine notification content
      let notifTitle: string;
      let notifBody: string;
      let nextPhaseName: PomodoroPhase;

      if (phase === "focus") {
        const newSessions = sessionsCompleted + 1;
        setSessionsCompleted(newSessions);

        // Update stats
        const today = new Date().toDateString();
        setStats(prev => {
          const updated: PomodoroStats = {
            today: prev.today + 1,
            total: prev.total + 1,
            streak: prev.lastDate === today ? prev.streak : (prev.lastDate === new Date(Date.now() - 86400000).toDateString() ? prev.streak + 1 : 1),
            lastDate: today,
            totalMinutes: prev.totalMinutes + settings.focusMinutes,
          };
          saveStats(updated);
          return updated;
        });

        const isLongBreak = newSessions % settings.longBreakInterval === 0;
        nextPhaseName = isLongBreak ? "longBreak" : "shortBreak";
        setPhase(nextPhaseName);
        const nextTime = getPhaseTime(nextPhaseName);
        setTimeLeft(nextTime);
        totalTimeRef.current = nextTime;

        notifTitle = `Фокус-сессия завершена! ${PHASE_CONFIG.focus.emoji}`;
        notifBody = isLongBreak
          ? `Отличная работа! ${newSessions} сессий подряд. Время для длинного перерыва (${settings.longBreakMinutes} мин).`
          : `Сессия #${newSessions} выполнена. Сделайте перерыв ${settings.shortBreakMinutes} мин.`;

        if (settings.autoStartBreaks) setIsRunning(true);
      } else {
        nextPhaseName = "focus";
        setPhase("focus");
        const nextTime = getPhaseTime("focus");
        setTimeLeft(nextTime);
        totalTimeRef.current = nextTime;

        const breakLabel = phase === "longBreak" ? "Длинный перерыв" : "Перерыв";
        notifTitle = `${breakLabel} окончен! ${PHASE_CONFIG[phase].emoji}`;
        notifBody = `Время вернуться к учёбе. Следующий фокус: ${settings.focusMinutes} мин.`;

        if (settings.autoStartFocus) setIsRunning(true);
      }

      // Send browser notification
      if (settings.notificationsEnabled && notifPermission === "granted") {
        sendBrowserNotification(notifTitle, notifBody);
      }

      // Always show in-app toast
      addToast(notifTitle, notifBody, phase);
    }
  }, [timeLeft, isRunning, phase, sessionsCompleted, settings, getPhaseTime, notifPermission, addToast]);

  const handleStartPause = () => setIsRunning(prev => !prev);

  const handleReset = () => {
    setIsRunning(false);
    const t = getPhaseTime(phase);
    setTimeLeft(t);
    totalTimeRef.current = t;
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (phase === "focus") {
      const isLongBreak = (sessionsCompleted + 1) % settings.longBreakInterval === 0;
      const nextPhase: PomodoroPhase = isLongBreak ? "longBreak" : "shortBreak";
      setPhase(nextPhase);
      const t = getPhaseTime(nextPhase);
      setTimeLeft(t);
      totalTimeRef.current = t;
    } else {
      setPhase("focus");
      const t = getPhaseTime("focus");
      setTimeLeft(t);
      totalTimeRef.current = t;
    }
  };

  const handleSettingsChange = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    if (!isRunning) {
      let newTime: number;
      switch (phase) {
        case "focus": newTime = newSettings.focusMinutes * 60; break;
        case "shortBreak": newTime = newSettings.shortBreakMinutes * 60; break;
        case "longBreak": newTime = newSettings.longBreakMinutes * 60; break;
      }
      setTimeLeft(newTime);
      totalTimeRef.current = newTime;
    }
  };

  const toggleSound = () => {
    const next = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(next);
    saveSettings(next);
  };

  const toggleNotifications = useCallback(async () => {
    if (!settings.notificationsEnabled) {
      // Trying to enable
      if (notifPermission === "default") {
        await handleRequestNotifPermission();
      } else if (notifPermission === "granted") {
        const next = { ...settings, notificationsEnabled: true };
        setSettings(next);
        saveSettings(next);
      }
      // If denied, do nothing
    } else {
      const next = { ...settings, notificationsEnabled: false };
      setSettings(next);
      saveSettings(next);
    }
  }, [settings, notifPermission, handleRequestNotifPermission]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = totalTimeRef.current > 0 ? 1 - (timeLeft / totalTimeRef.current) : 0;
  const config = PHASE_CONFIG[phase];
  const PhaseIcon = config.icon;
  const circleColor = phase === "focus" ? "#0d9488" : phase === "shortBreak" ? "#d97706" : "#7c3aed";

  const dotsCount = settings.longBreakInterval;
  const dots = Array.from({ length: dotsCount }, (_, i) => i < (sessionsCompleted % settings.longBreakInterval));

  const notifActive = settings.notificationsEnabled && notifPermission === "granted";
  const notifButtonTitle = notifPermission === "denied"
    ? "Уведомления заблокированы в браузере"
    : notifActive
    ? "Выключить уведомления"
    : "Включить уведомления";

  return (
    <>
      {/* In-app toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <PomodoroToast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>

      {/* Floating toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              isRunning
                ? `bg-gradient-to-br ${config.bgColor} text-white shadow-lg`
                : "bg-white border border-border/60 text-slate-600 dark:text-slate-300 hover:border-teal-200 hover:text-teal-600"
            }`}
            title="Таймер Помодоро"
          >
            {isRunning ? (
              <span className="text-xs font-bold tabular-nums">{formatTime(timeLeft)}</span>
            ) : (
              <Timer className="w-5 h-5" />
            )}
            {isRunning && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[280px] bg-white dark:bg-card rounded-2xl shadow-2xl shadow-black/10 border border-border/40 overflow-hidden"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${config.bgColor} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2 text-white">
                <PhaseIcon className="w-4 h-4" />
                <span className="text-sm font-semibold">{config.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleNotifications}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors ${
                    notifActive ? "bg-white/25" : "bg-white/15 hover:bg-white/25"
                  }`}
                  title={notifButtonTitle}
                >
                  {notifPermission === "denied" ? (
                    <BellOff className="w-3.5 h-3.5 opacity-50" />
                  ) : notifActive ? (
                    <BellRing className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 opacity-70" />
                  )}
                </button>
                <button
                  onClick={toggleSound}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                  title={settings.soundEnabled ? "Выключить звук" : "Включить звук"}
                >
                  {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setShowSettings(prev => !prev)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                  title="Настройки"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <AnimatePresence mode="wait">
                {showSettings ? (
                  <SettingsPanel
                    key="settings"
                    settings={settings}
                    onChange={handleSettingsChange}
                    onClose={() => setShowSettings(false)}
                    notifPermission={notifPermission}
                    onRequestNotifPermission={handleRequestNotifPermission}
                  />
                ) : (
                  <motion.div
                    key="timer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Hedgehog mascot reflecting current phase/state */}
                    <div className="flex justify-center mb-1">
                      <OwlMascot
                        size={56}
                        animate
                        mood={
                          phase === "longBreak"
                            ? "sleeping"
                            : phase === "shortBreak"
                              ? "happy"
                              : isRunning
                                ? "thinking"
                                : timeLeft < settings.focusMinutes * 60
                                  ? "surprised"
                                  : "encouraging"
                        }
                      />
                    </div>

                    {/* Timer circle */}
                    <div className="flex justify-center mb-4">
                      <CircleProgress progress={progress} size={140} strokeWidth={5} color={circleColor}>
                        <div className="text-center">
                          <div className="text-3xl font-bold tabular-nums tracking-tight">
                            {formatTime(timeLeft)}
                          </div>
                          <div className={`text-[0.625rem] font-medium ${config.color} mt-0.5`}>
                            {config.label}
                          </div>
                        </div>
                      </CircleProgress>
                    </div>

                    {/* Session dots */}
                    <div className="flex items-center justify-center gap-1.5 mb-4">
                      {dots.map((filled, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            filled ? "bg-teal-500 scale-110" : "bg-slate-200 dark:bg-slate-600"
                          }`}
                        />
                      ))}
                      <span className="ml-1.5 text-[0.625rem] text-muted-foreground/50 tabular-nums">
                        {sessionsCompleted}/{settings.longBreakInterval}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <button
                        onClick={handleReset}
                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                        title="Сбросить"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleStartPause}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all shadow-md ${
                          isRunning
                            ? "bg-slate-600 hover:bg-slate-700 shadow-slate-200"
                            : `bg-gradient-to-br ${config.bgColor} hover:shadow-lg`
                        }`}
                      >
                        {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <button
                        onClick={handleSkip}
                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                        title="Пропустить"
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>

                    {/* Phase tabs */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1 mb-4">
                      {(["focus", "shortBreak", "longBreak"] as PomodoroPhase[]).map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            if (isRunning) return;
                            setPhase(p);
                            const t = getPhaseTime(p);
                            setTimeLeft(t);
                            totalTimeRef.current = t;
                          }}
                          disabled={isRunning}
                          className={`flex-1 py-1.5 rounded-md text-[0.625rem] font-medium transition-all ${
                            phase === p
                              ? "bg-white dark:bg-muted shadow-sm text-foreground"
                              : "text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-40"
                          }`}
                        >
                          {p === "focus" ? "Фокус" : p === "shortBreak" ? "Перерыв" : "Длинный"}
                        </button>
                      ))}
                    </div>

                    {/* Notification status mini-badge */}
                    {notifActive && (
                      <div className="flex items-center justify-center gap-1.5 mb-3">
                        <BellRing className="w-3 h-3 text-teal-500" />
                        <span className="text-[0.5625rem] text-teal-600 font-medium">Уведомления включены</span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span className="text-sm font-bold tabular-nums">{stats.today}</span>
                        </div>
                        <span className="text-[0.5625rem] text-muted-foreground">Сегодня</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span className="text-sm font-bold tabular-nums">{stats.total}</span>
                        </div>
                        <span className="text-[0.5625rem] text-muted-foreground">Всего</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Timer className="w-3 h-3 text-teal-400" />
                          <span className="text-sm font-bold tabular-nums">{stats.totalMinutes}</span>
                        </div>
                        <span className="text-[0.5625rem] text-muted-foreground">Минут</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}