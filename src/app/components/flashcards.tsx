import { useState, useMemo, useCallback } from "react";
import { courseModules } from "./course-data";
import {
  RotateCcw, X, ChevronLeft, ChevronRight, Check,
  AlertCircle, Brain, Shuffle, Layers, Sparkles
} from "lucide-react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
}

interface ReviewState {
  nextReview: number;
  interval: number;
  ease: number;
}

function generateFlashcards(): Flashcard[] {
  const cards: Flashcard[] = [];
  courseModules.forEach(module => {
    module.lessons.forEach(lesson => {
      if (lesson.keyPoints) {
        lesson.keyPoints.forEach((kp, i) => {
          cards.push({
            id: `${lesson.id}-kp-${i}`,
            front: `Что является ключевым тезисом урока "${lesson.title}"?`,
            back: kp,
            moduleId: module.id, moduleTitle: module.title, lessonId: lesson.id,
          });
        });
      }
      if (lesson.quiz) {
        lesson.quiz.forEach((q, i) => {
          cards.push({
            id: `${lesson.id}-q-${i}`,
            front: q.question,
            back: `${q.options[q.correctIndex]}${q.explanation ? `\n\n${q.explanation}` : ""}`,
            moduleId: module.id, moduleTitle: module.title, lessonId: lesson.id,
          });
        });
      }
    });
  });
  return cards;
}

function getReviewStates(): Record<string, ReviewState> {
  try { return JSON.parse(localStorage.getItem("flashcard-reviews") || "{}"); } catch { return {}; }
}

function saveReviewStates(states: Record<string, ReviewState>) {
  localStorage.setItem("flashcard-reviews", JSON.stringify(states));
}

interface FlashcardsProps { onClose: () => void; }

export function Flashcards({ onClose }: FlashcardsProps) {
  const allCards = useMemo(() => generateFlashcards(), []);
  const [mode, setMode] = useState<"menu" | "study" | "review">("menu");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState({ known: 0, unknown: 0 });

  const reviewStates = useMemo(() => getReviewStates(), []);

  const dueCards = useMemo(() => {
    const now = Date.now();
    return allCards.filter(c => {
      const state = reviewStates[c.id];
      return !state || state.nextReview <= now;
    });
  }, [allCards, reviewStates]);

  const modulesWithCards = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    allCards.forEach(c => {
      const existing = map.get(c.moduleId);
      if (existing) existing.count++;
      else map.set(c.moduleId, { title: c.moduleTitle, count: 1 });
    });
    return [...map.entries()];
  }, [allCards]);

  const startStudy = useCallback((cards: Flashcard[]) => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setDeck(shuffled.slice(0, 20));
    setCurrentIndex(0);
    setFlipped(false);
    setStats({ known: 0, unknown: 0 });
    setMode("study");
  }, []);

  const handleResponse = useCallback((quality: "easy" | "hard" | "again") => {
    const card = deck[currentIndex];
    const states = getReviewStates();
    const prev = states[card.id] || { nextReview: 0, interval: 0, ease: 2.5 };

    let newInterval: number;
    let newEase = prev.ease;

    switch (quality) {
      case "easy":
        newInterval = prev.interval === 0 ? 1 : Math.round(prev.interval * newEase);
        newEase = Math.min(3.0, newEase + 0.15);
        setStats(s => ({ ...s, known: s.known + 1 }));
        break;
      case "hard":
        newInterval = Math.max(1, Math.round(prev.interval * 1.2));
        newEase = Math.max(1.3, newEase - 0.15);
        setStats(s => ({ ...s, known: s.known + 1 }));
        break;
      case "again":
        newInterval = 0;
        newEase = Math.max(1.3, newEase - 0.2);
        setStats(s => ({ ...s, unknown: s.unknown + 1 }));
        break;
    }

    states[card.id] = {
      nextReview: Date.now() + newInterval * 24 * 60 * 60 * 1000,
      interval: newInterval,
      ease: newEase,
    };
    saveReviewStates(states);

    if (currentIndex < deck.length - 1) {
      setCurrentIndex(i => i + 1);
      setFlipped(false);
    } else {
      setMode("review");
    }
  }, [deck, currentIndex]);

  // Menu
  if (mode === "menu") {
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              </div>
              <span className="text-[0.875rem] font-semibold">Карточки</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-[560px] mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Spaced Repetition</h2>
            <p className="text-[0.875rem] text-muted-foreground/60">
              {allCards.length} карточек &middot; {dueCards.length} к повторению
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              onClick={() => startStudy(dueCards.length > 0 ? dueCards : allCards)}
              className="p-5 bg-white dark:bg-card rounded-2xl border border-border/40 hover:border-teal-200 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
                <RotateCcw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-[0.875rem] font-semibold mb-0.5">Повторение</p>
              <p className="text-[0.75rem] text-muted-foreground/50">{dueCards.length > 0 ? `${dueCards.length} карточек` : "Начать заново"}</p>
            </button>
            <button
              onClick={() => startStudy(allCards)}
              className="p-5 bg-white dark:bg-card rounded-2xl border border-border/40 hover:border-teal-200 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
                <Shuffle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-[0.875rem] font-semibold mb-0.5">Случайные</p>
              <p className="text-[0.75rem] text-muted-foreground/50">20 карточек</p>
            </button>
          </div>

          <h3 className="text-[0.75rem] text-muted-foreground/50 uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> По модулям
          </h3>
          <div className="space-y-1.5">
            {modulesWithCards.map(([moduleId, data]) => (
              <button
                key={moduleId}
                onClick={() => startStudy(allCards.filter(c => c.moduleId === moduleId))}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-card rounded-xl border border-border/40 hover:border-teal-200 hover:shadow-sm transition-all group"
              >
                <span className="text-[0.8125rem] truncate font-medium">{data.title}</span>
                <span className="text-[0.75rem] text-muted-foreground/40 shrink-0 ml-2 tabular-nums">{data.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Results
  if (mode === "review") {
    const total = stats.known + stats.unknown;
    const pct = total > 0 ? Math.round((stats.known / total) * 100) : 0;
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-teal-700" />
              </div>
              <span className="text-[0.875rem] font-semibold">Результат</span>
            </div>
            <button onClick={() => setMode("menu")} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-w-[420px] mx-auto px-6 py-16 text-center">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${
            pct >= 80 ? "bg-emerald-50" : pct >= 50 ? "bg-amber-50" : "bg-red-50"
          }`}>
            {pct >= 80 ? <Sparkles className="w-7 h-7 text-emerald-500" /> : <AlertCircle className="w-7 h-7 text-amber-500" />}
          </div>
          <h2 className="text-xl font-bold mb-1">{pct >= 80 ? "Отлично!" : pct >= 50 ? "Неплохо!" : "Нужно повторить"}</h2>
          <p className="text-muted-foreground/60 text-[0.875rem] mb-6 tabular-nums">
            {stats.known} из {total} правильно ({pct}%)
          </p>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-8">
            <div className={`h-full rounded-full transition-all duration-700 ${
              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
            }`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setMode("menu")} className="px-5 py-2.5 bg-muted text-foreground rounded-xl text-[0.8125rem] hover:bg-accent transition-colors">
              К меню
            </button>
            <button onClick={() => startStudy(deck)} className="px-5 py-2.5 bg-teal-500 text-white rounded-xl text-[0.8125rem] hover:bg-teal-600 transition-colors shadow-sm shadow-teal-100">
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Study
  const card = deck[currentIndex];
  if (!card) return null;

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => setMode("menu")} className="flex items-center gap-1 text-muted-foreground/60 hover:text-foreground text-[0.8125rem] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Назад
          </button>
          <span className="text-[0.8125rem] text-muted-foreground/40 tabular-nums">{currentIndex + 1}/{deck.length}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-6 py-10">
        {/* Progress */}
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-8">
          <div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }} />
        </div>

        {/* Card */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="cursor-pointer min-h-[300px] bg-white dark:bg-card rounded-2xl border border-border/40 p-8 flex flex-col items-center justify-center text-center shadow-sm shadow-black/[0.03] hover:shadow-md transition-shadow"
        >
          <p className="text-[0.6875rem] text-muted-foreground/30 mb-4 uppercase tracking-widest font-medium">
            {flipped ? "Ответ" : "Вопрос"}
          </p>
          <p className={`text-[0.9375rem] leading-relaxed whitespace-pre-wrap max-w-sm ${
            flipped ? "text-emerald-800 dark:text-emerald-300" : "font-medium"
          }`}>
            {flipped ? card.back : card.front}
          </p>
          {!flipped && (
            <p className="text-[0.75rem] text-muted-foreground/30 mt-8">Нажмите, чтобы перевернуть</p>
          )}
          <p className="text-[0.625rem] text-muted-foreground/20 mt-4">{card.moduleTitle}</p>
        </div>

        {/* Response */}
        {flipped && (
          <div className="flex gap-2.5 mt-6 justify-center">
            <button
              onClick={() => handleResponse("again")}
              className="px-5 py-2.5 bg-red-50 text-red-700 rounded-xl text-[0.8125rem] font-medium hover:bg-red-100 transition-colors"
            >
              Не знаю
            </button>
            <button
              onClick={() => handleResponse("hard")}
              className="px-5 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-[0.8125rem] font-medium hover:bg-amber-100 transition-colors"
            >
              Трудно
            </button>
            <button
              onClick={() => handleResponse("easy")}
              className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[0.8125rem] font-medium hover:bg-emerald-100 transition-colors"
            >
              Знаю
            </button>
          </div>
        )}
      </div>
    </div>
  );
}