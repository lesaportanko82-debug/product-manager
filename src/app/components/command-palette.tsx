import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { courseModules, getAllLessons } from "./course-data";
import { GLOSSARY_TERMS } from "./glossary";
import {
  Search, BookOpen, Brain, GraduationCap, Award, ArrowRight,
  CheckCircle, Bookmark, Clock, Hash, Command, CornerDownLeft,
  FileText, Sparkles, Layers, X, StickyNote, BookMarked, Filter, Compass, MessageSquare
} from "lucide-react";

type ViewMode = "lesson" | "exam" | "glossary" | "flashcards" | "certificate" | "capstone" | "diagnostic" | "pm-coach" | "notebook" | "interview" | "templates" | "analytics" | "data-exercises" | "portfolio" | "resume-review" | "competency-radar";

interface CommandPaletteProps {
  onSelectLesson: (lessonId: string) => void;
  onSetView: (mode: ViewMode) => void;
  completedLessons: Set<string>;
  bookmarks: Set<string>;
  onOpenOnboarding?: () => void;
}

interface CommandItem {
  id: string;
  type: "lesson" | "action" | "recent" | "glossary" | "note";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  lessonId?: string;
  action?: () => void;
  isCompleted?: boolean;
  isBookmarked?: boolean;
  moduleNumber?: number;
}

const RECENT_KEY = "cmd-palette-recent";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
}

function addRecent(id: string) {
  try {
    const r = getRecent().filter(x => x !== id);
    r.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, MAX_RECENT)));
  } catch {}
}

export function CommandPalette({ onSelectLesson, onSetView, completedLessons, bookmarks, onOpenOnboarding }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allLessons = useMemo(() => getAllLessons(), []);

  const actions: CommandItem[] = useMemo(() => [
    { id: "act-bookmarks", type: "action", title: "Закладки", subtitle: `${bookmarks.size} сохранённых уроков`, icon: <Bookmark className="w-4 h-4" />, action: () => { setQuery("🔖"); } },
    { id: "act-glossary", type: "action", title: "Глоссарий", subtitle: "Словарь терминов продакт-менеджмента", icon: <BookOpen className="w-4 h-4" />, action: () => onSetView("glossary") },
    { id: "act-flashcards", type: "action", title: "Флешкарты", subtitle: "Интервальное повторение", icon: <Brain className="w-4 h-4" />, action: () => onSetView("flashcards") },
    { id: "act-exam", type: "action", title: "Финальный экзамен", subtitle: "30 вопросов + 4 кейса с AI-проверкой", icon: <Award className="w-4 h-4" />, action: () => onSetView("exam") },
    { id: "act-certificate", type: "action", title: "Сертификат", subtitle: "Генерация сертификата об окончании", icon: <GraduationCap className="w-4 h-4" />, action: () => onSetView("certificate") },
    { id: "act-capstone", type: "action", title: "Проектные работы", subtitle: "Capstone Projects с AI-фидбэком", icon: <FileText className="w-4 h-4" />, action: () => onSetView("capstone") },
    { id: "act-diagnostic", type: "action", title: "Диагностический тест", subtitle: "Определить уровень и зоны роста", icon: <Sparkles className="w-4 h-4" />, action: () => onSetView("diagnostic") },
    { id: "act-coach", type: "action", title: "PM-Коуч", subtitle: "Разбор реального кейса с AI-коучем", icon: <MessageSquare className="w-4 h-4" />, action: () => onSetView("pm-coach") },
    { id: "act-onboarding", type: "action", title: "О курсе", subtitle: "Страница знакомства с курсом", icon: <Compass className="w-4 h-4" />, action: () => onOpenOnboarding?.() },
    { id: "act-interview", type: "action", title: "Симулятор интервью", subtitle: "PM-интервью с AI-оценкой", icon: <Sparkles className="w-4 h-4" />, action: () => onSetView("interview") },
    { id: "act-templates", type: "action", title: "Шаблоны PM", subtitle: "Lean Canvas, PRD, RICE, CJM, OKR", icon: <Layers className="w-4 h-4" />, action: () => onSetView("templates") },
    { id: "act-analytics", type: "action", title: "Аналитика обучения", subtitle: "Радар компетенций, прогресс, retention", icon: <Hash className="w-4 h-4" />, action: () => onSetView("analytics") },
    { id: "act-data", type: "action", title: "Задачи на данных", subtitle: "A/B-тесты, воронки, юнит-экономика", icon: <FileText className="w-4 h-4" />, action: () => onSetView("data-exercises") },
    { id: "act-portfolio", type: "action", title: "Портфолио", subtitle: "Экспорт PM-портфолио", icon: <FileText className="w-4 h-4" />, action: () => onSetView("portfolio") },
    { id: "act-resume", type: "action", title: "Резюме AI", subtitle: "AI-проверка резюме для PM", icon: <FileText className="w-4 h-4" />, action: () => onSetView("resume-review") },
    { id: "act-competency", type: "action", title: "PM Competency Radar", subtitle: "Карта компетенций с gap-анализом по ролям", icon: <Hash className="w-4 h-4" />, action: () => onSetView("competency-radar") },
  ], [onSetView, bookmarks.size, onOpenOnboarding]);

  const lessonItems: CommandItem[] = useMemo(() =>
    allLessons.map(({ lesson, module }) => ({
      id: lesson.id,
      type: "lesson" as const,
      title: lesson.title,
      subtitle: `M${module.number} · ${module.title}`,
      icon: <FileText className="w-4 h-4" />,
      lessonId: lesson.id,
      isCompleted: completedLessons.has(lesson.id),
      isBookmarked: bookmarks.has(lesson.id),
      moduleNumber: module.number,
    }))
  , [allLessons, completedLessons, bookmarks]);

  // Glossary items
  const glossaryItems: CommandItem[] = useMemo(() =>
    GLOSSARY_TERMS.map(t => ({
      id: `gloss-${t.term}`,
      type: "glossary" as const,
      title: t.term,
      subtitle: t.definition.length > 80 ? t.definition.slice(0, 80) + "..." : t.definition,
      icon: <BookMarked className="w-4 h-4" />,
      action: () => onSetView("glossary"),
    }))
  , [onSetView]);

  // Notes items (read from localStorage)
  const noteItems: CommandItem[] = useMemo(() => {
    if (!open) return []; // Only compute when open
    try {
      const notes = JSON.parse(localStorage.getItem("course-notes") || "{}") as Record<string, string>;
      return Object.entries(notes)
        .filter(([, text]) => text.trim())
        .map(([lessonId, text]) => {
          const lessonData = allLessons.find(l => l.lesson.id === lessonId);
          return {
            id: `note-${lessonId}`,
            type: "note" as const,
            title: lessonData?.lesson.title || lessonId,
            subtitle: text.length > 80 ? text.slice(0, 80) + "..." : text,
            icon: <StickyNote className="w-4 h-4" />,
            lessonId,
          };
        });
    } catch { return []; }
  }, [open, allLessons]);

  // Content search index: build a lightweight map of lesson content keywords
  const contentIndex = useMemo(() => {
    const index: Map<string, Set<string>> = new Map(); // keyword -> Set<lessonId>
    allLessons.forEach(({ lesson }) => {
      const text = lesson.content.join(" ").toLowerCase();
      // Extract significant words (4+ chars) for fuzzy matching
      const words = text.match(/[а-яёa-z]{4,}/gi) || [];
      const unique = new Set(words.map(w => w.toLowerCase()));
      unique.forEach(word => {
        if (!index.has(word)) index.set(word, new Set());
        index.get(word)!.add(lesson.id);
      });
    });
    return index;
  }, [allLessons]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();

    // Special mode: bookmarks filter
    if (query === "🔖") {
      const bookmarkedItems = lessonItems.filter(l => l.isBookmarked);
      return { recent: [], actions: [], lessons: bookmarkedItems, glossary: [], notes: [] };
    }

    if (!q) {
      // Show recent + actions
      const recentIds = getRecent();
      const recentItems: CommandItem[] = recentIds
        .map(id => {
          const li = lessonItems.find(l => l.id === id);
          if (li) return { ...li, type: "recent" as const };
          return null;
        })
        .filter(Boolean) as CommandItem[];

      return { recent: recentItems, actions, lessons: [], glossary: [], notes: [] };
    }

    const matchedActions = actions.filter(a =>
      a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)
    );

    // Title-based matches
    const titleMatches = new Set(
      lessonItems
        .filter(l =>
          l.title.toLowerCase().includes(q) ||
          l.subtitle?.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q)
        )
        .map(l => l.id)
    );

    // Content-based matches: search keywords in content index
    const contentMatchIds = new Set<string>();
    if (q.length >= 3) {
      contentIndex.forEach((lessonIds, word) => {
        if (word.includes(q)) {
          lessonIds.forEach(id => contentMatchIds.add(id));
        }
      });
    }

    // Merge: title matches first, then content-only matches
    const allMatchIds = new Set([...titleMatches, ...contentMatchIds]);
    const matchedLessons = lessonItems
      .filter(l => allMatchIds.has(l.id))
      .sort((a, b) => {
        // Title matches rank higher
        const aTitle = titleMatches.has(a.id) ? 0 : 1;
        const bTitle = titleMatches.has(b.id) ? 0 : 1;
        return aTitle - bTitle;
      })
      .slice(0, 15);

    // Mark content-only matches with a different subtitle hint
    const enrichedLessons = matchedLessons.map(l => {
      if (!titleMatches.has(l.id) && contentMatchIds.has(l.id)) {
        return { ...l, subtitle: `${l.subtitle} · найдено в тексте` };
      }
      return l;
    });

    const matchedGlossary = glossaryItems.filter(g =>
      g.title.toLowerCase().includes(q) || g.subtitle?.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedNotes = noteItems.filter(n =>
      n.title.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q)
    ).slice(0, 5);

    return { recent: [], actions: matchedActions, lessons: enrichedLessons, glossary: matchedGlossary, notes: matchedNotes };
  }, [query, actions, lessonItems, glossaryItems, noteItems, contentIndex]);

  const flatItems = useMemo(() => {
    return [
      ...filteredItems.recent,
      ...filteredItems.actions,
      ...filteredItems.lessons,
      ...(filteredItems.glossary || []),
      ...(filteredItems.notes || []),
    ];
  }, [filteredItems]);

  // Clamp selected
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, selectedIndex]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const executeItem = useCallback((item: CommandItem) => {
    if (item.id === "act-bookmarks") {
      // Special: stay open and filter to bookmarks
      setQuery("🔖");
      setSelectedIndex(0);
      return;
    }
    if (item.lessonId) {
      addRecent(item.lessonId);
      onSelectLesson(item.lessonId);
    } else if (item.action) {
      item.action();
    }
    setOpen(false);
  }, [onSelectLesson]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      e.preventDefault();
      executeItem(flatItems[selectedIndex]);
    }
  }, [flatItems, selectedIndex, executeItem]);

  return (
    <>
      {/* Trigger hint in sidebar area — handled by keyboard shortcut */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-[560px] bg-white dark:bg-card rounded-2xl shadow-2xl shadow-black/20 border border-border/60 overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search className="w-4.5 h-4.5 text-muted-foreground/50 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Поиск уроков, терминов, заметок..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-[0.9375rem] bg-transparent outline-none placeholder:text-muted-foreground/40"
                />
                <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/60 rounded-md text-[0.625rem] text-muted-foreground/60 font-mono border border-border/40">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
                {flatItems.length === 0 && query.trim() && (
                  <div className="px-5 py-10 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-[0.875rem] text-muted-foreground/60">Ничего не найдено</p>
                    <p className="text-[0.75rem] text-muted-foreground/40 mt-1">Попробуйте другой запрос</p>
                  </div>
                )}

                {/* Recent section */}
                {filteredItems.recent.length > 0 && (
                  <>
                    <div className="px-5 py-1.5">
                      <span className="text-[0.625rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">Недавние</span>
                    </div>
                    {filteredItems.recent.map((item, i) => (
                      <CommandRow
                        key={item.id}
                        item={item}
                        isSelected={selectedIndex === i}
                        dataIndex={i}
                        onClick={() => executeItem(item)}
                        onHover={() => setSelectedIndex(i)}
                      />
                    ))}
                  </>
                )}

                {/* Actions section */}
                {filteredItems.actions.length > 0 && (
                  <>
                    <div className="px-5 py-1.5">
                      <span className="text-[0.625rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                        {query ? "Инструменты" : "Быстрый доступ"}
                      </span>
                    </div>
                    {filteredItems.actions.map((item, idx) => {
                      const globalIdx = filteredItems.recent.length + idx;
                      return (
                        <CommandRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIndex === globalIdx}
                          dataIndex={globalIdx}
                          onClick={() => executeItem(item)}
                          onHover={() => setSelectedIndex(globalIdx)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Lessons section */}
                {filteredItems.lessons.length > 0 && (
                  <>
                    <div className="px-5 py-1.5 mt-1">
                      <span className="text-[0.625rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">Уроки</span>
                    </div>
                    {filteredItems.lessons.map((item, idx) => {
                      const globalIdx = filteredItems.recent.length + filteredItems.actions.length + idx;
                      return (
                        <CommandRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIndex === globalIdx}
                          dataIndex={globalIdx}
                          onClick={() => executeItem(item)}
                          onHover={() => setSelectedIndex(globalIdx)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Glossary section */}
                {filteredItems.glossary.length > 0 && (
                  <>
                    <div className="px-5 py-1.5 mt-1">
                      <span className="text-[0.625rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">Глоссарий</span>
                    </div>
                    {filteredItems.glossary.map((item, idx) => {
                      const globalIdx = filteredItems.recent.length + filteredItems.actions.length + filteredItems.lessons.length + idx;
                      return (
                        <CommandRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIndex === globalIdx}
                          dataIndex={globalIdx}
                          onClick={() => executeItem(item)}
                          onHover={() => setSelectedIndex(globalIdx)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Notes section */}
                {filteredItems.notes.length > 0 && (
                  <>
                    <div className="px-5 py-1.5 mt-1">
                      <span className="text-[0.625rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">Заметки</span>
                    </div>
                    {filteredItems.notes.map((item, idx) => {
                      const globalIdx = filteredItems.recent.length + filteredItems.actions.length + filteredItems.lessons.length + filteredItems.glossary.length + idx;
                      return (
                        <CommandRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIndex === globalIdx}
                          dataIndex={globalIdx}
                          onClick={() => executeItem(item)}
                          onHover={() => setSelectedIndex(globalIdx)}
                        />
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/30 bg-muted/20">
                <div className="flex items-center gap-3 text-[0.625rem] text-muted-foreground/50">
                  <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> выбрать</span>
                  <span className="flex items-center gap-1">↑↓ навигация</span>
                </div>
                <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground/50">
                  <Command className="w-3 h-3" />K
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function CommandRow({ item, isSelected, dataIndex, onClick, onHover }: {
  item: CommandItem;
  isSelected: boolean;
  dataIndex: number;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      data-index={dataIndex}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
        isSelected ? "bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100" : "text-foreground hover:bg-muted/30"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isSelected ? "bg-teal-100 dark:bg-teal-800/50 text-teal-600 dark:text-teal-300" : "bg-muted/50 text-muted-foreground/60"
      }`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[0.8125rem] truncate ${isSelected ? "font-medium" : ""}`}>
            {item.title}
          </span>
          {item.isCompleted && (
            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
          )}
          {item.isBookmarked && (
            <Bookmark className="w-3 h-3 text-teal-400 fill-teal-400 shrink-0" />
          )}
        </div>
        {item.subtitle && (
          <span className="text-[0.6875rem] text-muted-foreground/60 truncate block">{item.subtitle}</span>
        )}
      </div>
      {isSelected && (
        <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
      )}
    </button>
  );
}