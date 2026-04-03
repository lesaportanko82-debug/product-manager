import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { courseModules } from "./course-data";
import { Trophy, Star, Sparkles, ArrowRight, Zap, Crown } from "lucide-react";

/* ─── Confetti (Canvas-based, lightweight) ─── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
}

const CONFETTI_COLORS = [
  "#14b8a6", "#10b981", "#06b6d4", "#f59e0b",
  "#8b5cf6", "#ec4899", "#22d3ee", "#34d399",
  "#fbbf24", "#a78bfa"
];

export function Confetti({ active, duration = 2500 }: { active: boolean; duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 6 + 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }
    particlesRef.current = particles;

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fadeStart = duration * 0.6;
      const globalAlpha = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / (duration - fadeStart) : 1;

      particles.forEach(p => {
        p.x += p.vx;
        p.vy += 0.08; // gravity
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity = globalAlpha;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[200] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

/* ─── Module Completion Overlay ─── */

interface ModuleCompleteOverlayProps {
  moduleId: string | null;
  onDismiss: () => void;
  onNextModule: () => void;
}

export function ModuleCompleteOverlay({ moduleId, onDismiss, onNextModule }: ModuleCompleteOverlayProps) {
  const mod = moduleId ? courseModules.find(m => m.id === moduleId) : null;
  const modIndex = mod ? courseModules.findIndex(m => m.id === mod.id) : -1;
  const nextMod = modIndex >= 0 && modIndex < courseModules.length - 1 ? courseModules[modIndex + 1] : null;

  return (
    <AnimatePresence>
      {mod && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
            className="bg-white dark:bg-card rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl shadow-black/20 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Decorative bg */}
            <div className="absolute inset-0 bg-gradient-to-b from-teal-50/80 to-transparent pointer-events-none" />

            <div className="relative">
              {/* Trophy animation */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-100"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <h2 className="text-xl font-bold text-foreground mb-1">Модуль завершён!</h2>
                <p className="text-[0.875rem] text-muted-foreground mb-1">
                  M{mod.number} · {mod.title}
                </p>
                <p className="text-[0.75rem] text-emerald-600 font-medium mb-6">
                  {mod.lessons.length} из {mod.lessons.length} уроков пройдены
                </p>
              </motion.div>

              {/* XP reward hint */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 mb-6"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[0.75rem] font-semibold text-amber-700">Отличная работа!</span>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {nextMod ? (
                  <button
                    onClick={onNextModule}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-[0.875rem] font-medium hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-100"
                  >
                    Следующий модуль: M{nextMod.number}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onDismiss}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-[0.875rem] font-medium hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-100"
                  >
                    <Star className="w-4 h-4" />
                    Курс завершён!
                  </button>
                )}
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-muted-foreground text-[0.8125rem] hover:text-foreground transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Lesson Complete Animation (inline) ─── */

export function LessonCompleteAnimation({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 15 }}
          className="fixed inset-0 z-[180] pointer-events-none flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.6, times: [0, 0.6, 1] }}
            className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.4, type: "spring" }}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200"
            >
              <Star className="w-8 h-8 fill-current" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Module Progress Ring (for lesson header) ─── */

export function ModuleProgressRing({ moduleId, completedLessons }: { moduleId: string; completedLessons: Set<string> }) {
  const mod = courseModules.find(m => m.id === moduleId);
  if (!mod) return null;

  const completed = mod.lessons.filter(l => completedLessons.has(l.id)).length;
  const total = mod.lessons.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total;

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-9 h-9 flex items-center justify-center" title={`Модуль: ${completed}/${total}`}>
      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgb(226 232 240)" strokeWidth="2.5" />
        <motion.circle
          cx="18" cy="18" r={radius} fill="none"
          stroke={isComplete ? "rgb(16 185 129)" : "rgb(20 184 166)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className={`absolute text-[0.5rem] font-bold tabular-nums ${
        isComplete ? "text-emerald-600" : "text-teal-600"
      }`}>
        {completed}/{total}
      </span>
    </div>
  );
}

/* ─── Hook: useCelebration ─── */

export function useCelebration(completedLessons: Set<string>) {
  const [confettiActive, setConfettiActive] = useState(false);
  const [moduleComplete, setModuleComplete] = useState<string | null>(null);
  const [lessonAnimation, setLessonAnimation] = useState(false);
  const prevCompletedRef = useRef<Set<string>>(new Set(completedLessons));

  const triggerLessonComplete = useCallback(() => {
    setLessonAnimation(true);
    setConfettiActive(true);
    setTimeout(() => setLessonAnimation(false), 800);
    setTimeout(() => setConfettiActive(false), 2500);
  }, []);

  const checkModuleCompletion = useCallback((lessonId: string) => {
    // Find which module this lesson belongs to
    for (const mod of courseModules) {
      const lessonBelongs = mod.lessons.some(l => l.id === lessonId);
      if (!lessonBelongs) continue;

      // Check if all lessons in this module are now completed
      const allDone = mod.lessons.every(l =>
        l.id === lessonId || completedLessons.has(l.id)
      );

      // Check that the module wasn't already complete before
      const wasAlreadyDone = mod.lessons.every(l =>
        prevCompletedRef.current.has(l.id)
      );

      if (allDone && !wasAlreadyDone) {
        // Delay module overlay slightly for drama
        setTimeout(() => setModuleComplete(mod.id), 1200);
        return;
      }
    }
  }, [completedLessons]);

  // Update prev ref
  useEffect(() => {
    prevCompletedRef.current = new Set(completedLessons);
  }, [completedLessons]);

  const dismissModuleComplete = useCallback(() => {
    setModuleComplete(null);
  }, []);

  return {
    confettiActive,
    moduleComplete,
    lessonAnimation,
    triggerLessonComplete,
    checkModuleCompletion,
    dismissModuleComplete,
  };
}
