import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight } from "lucide-react";
import { OwlMascot } from "./ai-assistant";

const STORAGE_KEY = "pm-academy-last-active";
const DISMISS_KEY = "pm-academy-inactivity-dismissed";
const INACTIVITY_THRESHOLD_DAYS = 3;
const DISMISS_COOLDOWN_DAYS = 1;

interface InactivityBannerProps {
  onResume?: () => void;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

export function InactivityBanner({ onResume }: InactivityBannerProps) {
  const [daysAway, setDaysAway] = useState<number | null>(null);

  useEffect(() => {
    const lastActive = localStorage.getItem(STORAGE_KEY);
    const dismissedAt = localStorage.getItem(DISMISS_KEY);

    const dismissedDays = daysSince(dismissedAt);
    if (dismissedDays !== null && dismissedDays < DISMISS_COOLDOWN_DAYS) {
      // recently dismissed — just refresh activity below
    } else {
      const away = daysSince(lastActive);
      if (away !== null && away >= INACTIVITY_THRESHOLD_DAYS) {
        setDaysAway(away);
      }
    }

    // Mark current visit as the new "last active" timestamp
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDaysAway(null);
  };

  const resume = () => {
    dismiss();
    onResume?.();
  };

  const daysLabel = (n: number): string => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} день`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} дня`;
    return `${n} дней`;
  };

  return (
    <AnimatePresence>
      {daysAway !== null && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed bottom-6 left-6 z-40 w-[320px] max-w-[calc(100vw-3rem)] bg-white dark:bg-card rounded-2xl shadow-2xl shadow-teal-500/15 border border-teal-100/60 dark:border-teal-800/40 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
          <div className="p-4 flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/20 flex items-center justify-center shrink-0">
              <OwlMascot size={48} mood="sleeping" animate />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-foreground leading-tight">
                Давно не заходили!
              </p>
              <p className="text-[0.75rem] text-muted-foreground mt-1 leading-relaxed">
                Ёжуня дремала {daysLabel(daysAway)} в ожидании.<br />
                Продолжим обучение?
              </p>
              <button
                onClick={resume}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[0.75rem] font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all shadow-sm"
              >
                Вернуться к курсу
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
