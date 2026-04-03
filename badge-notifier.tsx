import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles } from "lucide-react";
import { ALL_BADGES, getEarnedBadges, getStreak, type Badge } from "./gamification";
import { courseModules } from "./course-data";
import { getLocalXP, getTotalCompletedBlocks } from "./interactive-progress";

const KNOWN_BADGES_KEY = "course-known-badges";

function getKnownBadgeIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_BADGES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveKnownBadgeIds(ids: string[]) {
  try {
    localStorage.setItem(KNOWN_BADGES_KEY, JSON.stringify(ids));
  } catch {}
}

interface BadgeNotification {
  badge: Badge;
  id: string; // unique key for animation
}

export function BadgeNotifier({
  completedLessons,
  examScore,
}: {
  completedLessons: Set<string>;
  examScore: number | null;
}) {
  const [notifications, setNotifications] = useState<BadgeNotification[]>([]);
  const knownRef = useRef<string[]>(getKnownBadgeIds());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkForNewBadges = useCallback(() => {
    const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
    const streak = getStreak();
    const bookmarks = (() => {
      try { return JSON.parse(localStorage.getItem("course-bookmarks") || "[]").length; } catch { return 0; }
    })();
    const notes = (() => {
      try {
        const n = JSON.parse(localStorage.getItem("course-notes") || "{}") as Record<string, string>;
        return Object.values(n).filter(v => v?.trim()).length;
      } catch { return 0; }
    })();
    const xp = getLocalXP();
    const interactiveCompleted = getTotalCompletedBlocks();

    const ctx = {
      completedLessons,
      totalLessons,
      streak,
      quizzesPassed: 0,
      examScore,
      bookmarksCount: bookmarks,
      notesCount: notes,
      ratingsCount: 0,
      xp,
      interactiveCompleted,
    };

    const earned = getEarnedBadges(ctx);
    const earnedIds = earned.map(b => b.id);
    const known = knownRef.current;

    const newBadges = earned.filter(b => !known.includes(b.id));

    if (newBadges.length > 0) {
      // Add new badges to notifications queue
      const newNotifs: BadgeNotification[] = newBadges.map(b => ({
        badge: b,
        id: `${b.id}-${Date.now()}`,
      }));

      setNotifications(prev => [...prev, ...newNotifs]);

      // Update known badges
      knownRef.current = earnedIds;
      saveKnownBadgeIds(earnedIds);
    }
  }, [completedLessons, examScore]);

  // Check on mount and whenever completedLessons/examScore change
  useEffect(() => {
    // Small delay to let state settle
    const timeout = setTimeout(checkForNewBadges, 500);
    return () => clearTimeout(timeout);
  }, [completedLessons, examScore, checkForNewBadges]);

  // Poll for XP/interactive-based badges (since those change outside React state)
  useEffect(() => {
    checkIntervalRef.current = setInterval(checkForNewBadges, 4000);
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [checkForNewBadges]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timers = notifications.map(n =>
      setTimeout(() => dismissNotification(n.id), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, dismissNotification]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => {
          const Icon = notif.badge.icon;
          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="pointer-events-auto max-w-[320px] rounded-2xl bg-white dark:bg-card border border-amber-200/60 dark:border-amber-700/40 shadow-xl shadow-amber-100/30 dark:shadow-black/30 overflow-hidden"
            >
              {/* Shimmer accent line */}
              <div className="h-1 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 animate-shimmer" />

              <div className="px-4 py-3.5 flex items-center gap-3">
                {/* Badge icon with glow */}
                <div className="relative shrink-0">
                  <div className={`w-11 h-11 rounded-xl ${notif.badge.bg} flex items-center justify-center ring-2 ring-amber-200/50`}>
                    <Icon className={`w-5 h-5 ${notif.badge.color}`} />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] text-amber-500 font-semibold uppercase tracking-wider leading-none mb-0.5">
                    Новый бейдж!
                  </p>
                  <p className="text-[0.875rem] font-bold text-foreground truncate">
                    {notif.badge.title}
                  </p>
                  <p className="text-[0.75rem] text-muted-foreground/70 truncate">
                    {notif.badge.description}
                  </p>
                </div>

                {/* Close */}
                <button
                  onClick={() => dismissNotification(notif.id)}
                  className="p-1 rounded-lg hover:bg-muted/50 transition-colors shrink-0 text-muted-foreground/30 hover:text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
      `}</style>
    </div>
  );
}