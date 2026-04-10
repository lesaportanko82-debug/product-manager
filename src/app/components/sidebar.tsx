import { useState, useEffect, useRef, useMemo } from "react";
import { courseModules, isModuleUnlocked, courseBlocks, type Module } from "./course-data";
import {
  Lightbulb, DollarSign, Compass, AlertTriangle, RefreshCw,
  Target, MessageSquare, Rocket, Users, CheckCircle,
  BarChart3, Search, TrendingUp, Briefcase, MessageCircle,
  ChevronDown, ChevronRight, BookOpen, Menu, X,
  Grid3x3, Map, FileText, Kanban, GraduationCap,
  Brain, ClipboardList, Mic, Monitor, Award,
  Filter, Bookmark, Layers, Trophy, Home, Lock,
  User, Pencil, Check, MoreHorizontal, Wrench,
  Repeat, Network, ChevronsUpDown
} from "lucide-react";
import { SyncStatusBadge, type AuthState } from "./auth-modal";
import { getUserName, saveUserName } from "./user-name";
import { getLocalXP, getXPLevel } from "./interactive-progress";
import { getStreak } from "./gamification";
import { getAdaptiveProfile, computeDynamicPMLevel } from "./adaptive-learning";
import { DarkModeToggle } from "./dark-mode";
import { motion, AnimatePresence } from "motion/react";

const iconMap: Record<string, React.ElementType> = {
  Lightbulb, DollarSign, Compass, AlertTriangle, RefreshCw,
  Target, MessageSquare, Rocket, Users, CheckCircle,
  BarChart3, Search, TrendingUp, Briefcase, MessageCircle,
  Grid3x3, Map, FileText, Kanban, GraduationCap,
  Brain, ClipboardList, Mic, Monitor, Repeat, Network
};

interface SidebarProps {
  selectedLesson: string;
  onSelectLesson: (lessonId: string) => void;
  completedLessons: Set<string>;
  onOpenFinalExam?: () => void;
  showFinalExam?: boolean;
  bookmarks?: Set<string>;
  onOpenGlossary?: () => void;
  onOpenFlashcards?: () => void;
  onOpenCertificate?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenOnboarding?: () => void;
  onOpenCapstone?: () => void;
  onOpenDiagnostic?: () => void;
  onOpenCoach?: () => void;
  onOpenNotebook?: () => void;
  onOpenInterview?: () => void;
  onOpenTemplates?: () => void;
  onOpenAnalytics?: () => void;
  onOpenDataExercises?: () => void;
  onOpenPortfolio?: () => void;
  onOpenResumeReview?: () => void;
  onOpenCompetencyRadar?: () => void;
  isDark?: boolean;
  onToggleDark?: () => void;
  authState?: AuthState;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  onNameChange?: (name: string) => void;
  accessLevel?: "free" | "monthly" | "lifetime";
  freeLessonIds?: Set<string>;
  examScore?: number | null;
  isDemoMode?: boolean;
}

export function Sidebar({ selectedLesson, onSelectLesson, completedLessons, onOpenFinalExam, showFinalExam, bookmarks, onOpenGlossary, onOpenFlashcards, onOpenCertificate, onOpenLeaderboard, onOpenOnboarding, onOpenCapstone, onOpenDiagnostic, onOpenCoach, onOpenNotebook, onOpenInterview, onOpenTemplates, onOpenAnalytics, onOpenDataExercises, onOpenPortfolio, onOpenResumeReview, onOpenCompetencyRadar, isDark, onToggleDark, authState, onOpenAuth, onSignOut, onOpenProfile, onNameChange, accessLevel = "free", freeLessonIds, examScore = null, isDemoMode = false }: SidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    // For free/demo users: also pre-expand the simulator module so it's immediately visible
    () => {
      const defaults = [courseModules[0]?.id].filter(Boolean) as string[];
      if (accessLevel === "free" || isDemoMode) defaults.push("m-sim");
      return new Set(defaults);
    }
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete" | "bookmarked">("all");
  const [contentFilter, setContentFilter] = useState<"all" | "quiz" | "practice">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  // Initialize from authState.name first, then fall back to stored name
  const [currentUserName, setCurrentUserName] = useState(
    () => authState?.name || getUserName()
  );

  // Keep currentUserName in sync whenever authState.name changes (e.g. after login/signup)
  useEffect(() => {
    if (authState?.name && authState.name !== currentUserName) {
      setCurrentUserName(authState.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState?.name]);

  // Live XP & streak
  const [xp, setXp] = useState(() => getLocalXP());
  const streak = getStreak();
  const prevXpRef = useRef(xp);
  const [xpPulse, setXpPulse] = useState(false);
  const [xpDelta, setXpDelta] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setXp(getLocalXP()), 3000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (xp > prevXpRef.current && prevXpRef.current > 0) {
      setXpDelta(xp - prevXpRef.current);
      setXpPulse(true);
      const t = setTimeout(() => { setXpPulse(false); setXpDelta(0); }, 1500);
      prevXpRef.current = xp;
      return () => clearTimeout(t);
    }
    prevXpRef.current = xp;
  }, [xp]);
  const levelInfo = getXPLevel(xp);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const getModuleProgress = (module: Module) => {
    const original = courseModules.find(m => m.id === module.id) || module;
    const completed = original.lessons.filter(l => completedLessons.has(l.id)).length;
    return { completed, total: original.lessons.length };
  };

  const searchFilteredModules = useMemo(() => {
    if (!searchQuery.trim()) return courseModules;
    const query = searchQuery.toLowerCase();
    return courseModules.map((module) => {
      const matchingLessons = module.lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.content.some((c) => c.toLowerCase().includes(query))
      );
      const moduleMatches = module.title.toLowerCase().includes(query) || module.description.toLowerCase().includes(query);
      if (moduleMatches) return module;
      if (matchingLessons.length > 0) return { ...module, lessons: matchingLessons };
      return null;
    }).filter(Boolean) as Module[];
  }, [searchQuery]);

  const hasActiveFilters = statusFilter !== "all" || contentFilter !== "all";
  const filteredModules = useMemo(() => {
    if (!hasActiveFilters) return searchFilteredModules;
    return searchFilteredModules.map((module) => {
      const filtered = module.lessons.filter((lesson) => {
        if (statusFilter === "completed" && !completedLessons.has(lesson.id)) return false;
        if (statusFilter === "incomplete" && completedLessons.has(lesson.id)) return false;
        if (statusFilter === "bookmarked" && (!bookmarks || !bookmarks.has(lesson.id))) return false;
        if (contentFilter === "quiz" && (!lesson.quiz || lesson.quiz.length === 0)) return false;
        if (contentFilter === "practice" && (!lesson.practice || lesson.practice.length === 0)) return false;
        return true;
      });
      if (filtered.length === 0) return null;
      return { ...module, lessons: filtered };
    }).filter(Boolean) as Module[];
  }, [searchFilteredModules, hasActiveFilters, statusFilter, contentFilter, completedLessons, bookmarks]);

  const effectiveExpanded = useMemo(
    () => (searchQuery.trim() || hasActiveFilters)
      ? new Set(filteredModules.map((m) => m.id))
      : expandedModules,
    [searchQuery, hasActiveFilters, filteredModules, expandedModules]
  );

  const totalLessons = useMemo(() => courseModules.reduce((a, m) => a + m.lessons.length, 0), []);
  const progressPct = totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0;

  // 11 logical blocks of the course
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(
    // For free/demo users: also expand the last block (Капстон, index 10) so the simulator is visible
    () => (accessLevel === "free" || isDemoMode) ? new Set([0, 10]) : new Set([0])
  );

  const toggleBlock = (blockIndex: number) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockIndex)) next.delete(blockIndex);
      else next.add(blockIndex);
      return next;
    });
  };

  const groupedByBlock = useMemo(() => {
    return courseBlocks.map((block, blockIndex) => {
      const blockModules = filteredModules.filter(
        m => m.number >= block.range[0] && m.number <= block.range[1]
      );
      // Use courseModules for accurate total module count per block (not affected by filters)
      const allBlockModules = courseModules.filter(
        m => m.number >= block.range[0] && m.number <= block.range[1]
      );
      const totalModulesInBlock = allBlockModules.length;
      const completedModulesInBlock = allBlockModules.filter(m => {
        const orig = courseModules.find(om => om.id === m.id) || m;
        return orig.lessons.length > 0 && orig.lessons.every(l => completedLessons.has(l.id));
      }).length;
      const totalBlockLessons = blockModules.reduce((a, m) => {
        const orig = courseModules.find(om => om.id === m.id) || m;
        return a + orig.lessons.length;
      }, 0);
      const completedBlockLessons = blockModules.reduce((a, m) => {
        const orig = courseModules.find(om => om.id === m.id) || m;
        return a + orig.lessons.filter(l => completedLessons.has(l.id)).length;
      }, 0);
      return { ...block, blockIndex, modules: blockModules, totalBlockLessons, completedBlockLessons, totalModulesInBlock, completedModulesInBlock };
    });
  }, [courseBlocks, filteredModules, completedLessons]);

  const allBlocksExpanded = useMemo(() => {
    const visibleBlocks = groupedByBlock.filter(b => b.modules.length > 0);
    return visibleBlocks.length > 0 && visibleBlocks.every(b => expandedBlocks.has(b.blockIndex));
  }, [groupedByBlock, expandedBlocks]);

  const toggleAllBlocks = () => {
    if (allBlocksExpanded) {
      setExpandedBlocks(new Set());
    } else {
      setExpandedBlocks(new Set(groupedByBlock.filter(b => b.modules.length > 0).map(b => b.blockIndex)));
    }
  };

  // Auto-expand block containing selected lesson
  useEffect(() => {
    if (!selectedLesson) return;
    const mod = courseModules.find(m => m.lessons.some(l => l.id === selectedLesson));
    if (!mod) return;
    const blockIdx = courseBlocks.findIndex(b => mod.number >= b.range[0] && mod.number <= b.range[1]);
    if (blockIdx >= 0 && !expandedBlocks.has(blockIdx)) {
      setExpandedBlocks(prev => new Set([...prev, blockIdx]));
    }
  }, [selectedLesson, courseBlocks]);

  // Dynamic PM level (recalculate when completedLessons or examScore changes)
  const [dynamicLevel, setDynamicLevel] = useState(() =>
    computeDynamicPMLevel(completedLessons.size, totalLessons, examScore)
  );
  useEffect(() => {
    setDynamicLevel(computeDynamicPMLevel(completedLessons.size, totalLessons, examScore));
  }, [completedLessons.size, totalLessons, examScore]);

  // Tools config
  const toolsLocked = accessLevel === "free" || !!isDemoMode;
  const tools = [
    onOpenGlossary && { icon: BookOpen, label: "Глоссарий", onClick: onOpenGlossary, color: "teal", locked: false },
    onOpenFlashcards && { icon: Brain, label: "Карточки", onClick: onOpenFlashcards, color: "teal", locked: false },
    onOpenCertificate && { icon: GraduationCap, label: "Сертифи...", onClick: onOpenCertificate, color: "teal", locked: false },
    onOpenCapstone && { icon: Briefcase, label: "Проекты", onClick: onOpenCapstone, color: "violet", locked: false },
    onOpenDiagnostic && { icon: Brain, label: "Уровень", onClick: onOpenDiagnostic, color: "indigo", locked: false },
    onOpenOnboarding && { icon: Compass, label: "О курсе", onClick: onOpenOnboarding, color: "cyan", locked: false },
    onOpenCoach && { icon: MessageCircle, label: "PM-Коуч", onClick: onOpenCoach, color: "violet", locked: toolsLocked },
    onOpenNotebook && { icon: FileText, label: "Тетрадь", onClick: onOpenNotebook, color: "teal", locked: toolsLocked },
    onOpenInterview && { icon: Mic, label: "Интервью", onClick: onOpenInterview, color: "amber", locked: toolsLocked },
    onOpenTemplates && { icon: Layers, label: "Шаблоны", onClick: onOpenTemplates, color: "teal", locked: toolsLocked },
    onOpenAnalytics && { icon: BarChart3, label: "Аналитика", onClick: onOpenAnalytics, color: "cyan", locked: toolsLocked },
    onOpenDataExercises && { icon: ClipboardList, label: "Задачи н...", onClick: onOpenDataExercises, color: "emerald", locked: toolsLocked },
    onOpenPortfolio && { icon: Briefcase, label: "Портфол...", onClick: onOpenPortfolio, color: "violet", locked: toolsLocked },
    onOpenResumeReview && { icon: User, label: "Резюме AI", onClick: onOpenResumeReview, color: "pink", locked: toolsLocked },
    onOpenCompetencyRadar && { icon: Target, label: "Компете...", onClick: onOpenCompetencyRadar, color: "blue", locked: toolsLocked },
  ].filter(Boolean) as { icon: React.ElementType; label: string; onClick: () => void; color: string; locked: boolean }[];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header — compact brand + home + progress ring */}
      <div className="px-4 py-3.5 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { onSelectLesson(""); setMobileOpen(false); }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center shadow-sm shadow-teal-100 dark:shadow-teal-900/30 hover:from-teal-500 hover:to-emerald-500 transition-all shrink-0"
            title="На главную"
          >
            <Layers className="w-4 h-4 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.8125rem] font-semibold tracking-tight truncate leading-tight">Продакт-менеджмент</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 bg-border/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[0.625rem] text-muted-foreground/70 tabular-nums font-medium shrink-0">{progressPct}%</span>
            </div>
          </div>
          {selectedLesson && (
            <button
              onClick={() => { onSelectLesson(""); setMobileOpen(false); }}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all"
              title="На главную"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* XP bar — ultra-compact */}
      {(xp > 0 || streak > 0) && (
        <div className="px-4 pt-2.5 pb-0.5">
          <motion.div
            className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-50/70 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-100/50 dark:border-amber-800/30"
            animate={xpPulse ? {
              scale: [1, 1.03, 1],
              boxShadow: ["0 0 0 0 rgba(245,158,11,0)", "0 0 10px 3px rgba(245,158,11,0.2)", "0 0 0 0 rgba(245,158,11,0)"]
            } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.span
              className="text-xs leading-none"
              title={`${xp} каштанов`}
              animate={xpPulse ? { scale: [1, 1.4, 1], rotate: [0, 12, -8, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              🌰
            </motion.span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] font-bold text-amber-800 dark:text-amber-300 truncate">{levelInfo.title}</span>
                <span className="text-[0.625rem] text-amber-600/70 dark:text-amber-400/70 font-semibold tabular-nums">{xp}</span>
              </div>
              <div className="h-[3px] bg-amber-100 dark:bg-amber-900/40 rounded-full overflow-hidden mt-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
                  animate={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-0.5 pl-1.5 border-l border-amber-200/50 dark:border-amber-700/40" title={`${streak} дней подряд`}>
                <span className="text-[0.625rem] text-orange-500">🔥</span>
                <span className="text-[0.625rem] font-bold text-orange-600 dark:text-orange-400 tabular-nums">{streak}</span>
              </div>
            )}
            <AnimatePresence>
              {xpPulse && xpDelta > 0 && (
                <motion.span
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -22, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute -top-1 right-3 text-[0.625rem] font-bold text-amber-600 pointer-events-none"
                >
                  +{xpDelta} 🌰
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* PM Level widget */}
      {(getAdaptiveProfile() || completedLessons.size > 0 || examScore != null) && (
        <div className="px-4 pt-2 pb-0.5">
          <button
            onClick={onOpenDiagnostic}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all hover:shadow-sm ${dynamicLevel.bg} border-border/40`}
          >
            <Brain className="w-3 h-3 shrink-0 text-muted-foreground/60" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[0.625rem] font-bold truncate ${dynamicLevel.color}`}>{dynamicLevel.label}</span>
                <span className="text-[0.55rem] text-muted-foreground/60 tabular-nums shrink-0">{dynamicLevel.score}%</span>
              </div>
              {dynamicLevel.changed && dynamicLevel.initialLevel && (
                <p className="text-[0.55rem] text-muted-foreground/60 truncate">
                  {dynamicLevel.initialLevel === "junior" ? "Junior" : dynamicLevel.initialLevel === "middle" ? "Middle" : "Senior"} → {dynamicLevel.level === "junior" ? "Junior" : dynamicLevel.level === "middle" ? "Middle" : "Senior"}
                </p>
              )}
            </div>
            <TrendingUp className="w-3 h-3 shrink-0 text-muted-foreground/40" />
          </button>
        </div>
      )}

      {/* Search — compact */}
      <div className="px-4 pt-3 pb-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск..."
            aria-label="Поиск по урокам"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-2 text-[0.75rem] bg-muted/40 dark:bg-slate-800/60 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-white dark:focus:bg-slate-700 focus:border-teal-300/50 dark:focus:border-teal-700/50 placeholder:text-muted-foreground/40 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Очистить поиск"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline px-1 py-0.5 bg-muted/50 rounded text-[0.625rem] text-muted-foreground/40 font-mono">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Inline filter chips */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.625rem] transition-colors min-h-[28px] ${
              hasActiveFilters
                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium'
                : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <Filter className="w-2.5 h-2.5" />
            Фильтр
            {hasActiveFilters && <span className="w-1 h-1 rounded-full bg-teal-500" />}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => { setStatusFilter("all"); setContentFilter("all"); }}
              className="text-[0.625rem] text-teal-500 hover:text-teal-700 dark:hover:text-teal-300 px-1.5 py-1 min-h-[28px] flex items-center"
            >
              ✕ Сбросить
            </button>
          )}
          {searchQuery.trim() && (
            <span className="text-[0.625rem] text-muted-foreground/60 ml-auto">
              {filteredModules.reduce((a, m) => a + m.lessons.length, 0)} найдено
            </span>
          )}
        </div>

        {showFilters && (
          <div className="mt-1.5 p-2.5 bg-muted/30 dark:bg-slate-800/40 rounded-lg space-y-2 border border-border/20">
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] text-muted-foreground/60 w-11 shrink-0">Статус</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 px-2 py-1 text-[0.6875rem] bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500/30"
              >
                <option value="all">Все</option>
                <option value="completed">Пройдены</option>
                <option value="incomplete">Не пройдены</option>
                <option value="bookmarked">Закладки</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] text-muted-foreground/60 w-11 shrink-0">Тип</span>
              <select
                value={contentFilter}
                onChange={(e) => setContentFilter(e.target.value as any)}
                className="flex-1 px-2 py-1 text-[0.6875rem] bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500/30"
              >
                <option value="all">Все</option>
                <option value="quiz">С тестами</option>
                <option value="practice">С практикой</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modules list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 mt-1">
        {/* Expand/collapse all blocks */}
        {filteredModules.length > 0 && !searchQuery.trim() && !hasActiveFilters && (
          <div className="flex items-center justify-end px-1 mb-1">
            <button
              onClick={toggleAllBlocks}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[0.625rem] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
              title={allBlocksExpanded ? "Свернуть все блоки" : "Развернуть все блоки"}
            >
              <ChevronsUpDown className="w-3 h-3" />
              {allBlocksExpanded ? "Свернуть все" : "Развернуть все"}
            </button>
          </div>
        )}

        {filteredModules.length === 0 && (searchQuery.trim() || hasActiveFilters) && (
          <div className="px-2 py-8 text-center">
            <Search className="w-6 h-6 text-muted-foreground/15 mx-auto mb-1.5" />
            <p className="text-[0.75rem] text-muted-foreground/50">Ничего не найдено</p>
            {hasActiveFilters && (
              <button
                onClick={() => { setStatusFilter("all"); setContentFilter("all"); }}
                className="mt-1.5 text-[0.6875rem] text-teal-600 hover:text-teal-800 dark:text-teal-400"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        <div className="space-y-px">
          {groupedByBlock.map((block) => {
            if (block.modules.length === 0) return null;
            const isExpanded = (searchQuery.trim() || hasActiveFilters) ? true : expandedBlocks.has(block.blockIndex);
            const pct = block.totalBlockLessons > 0 ? Math.round((block.completedBlockLessons / block.totalBlockLessons) * 100) : 0;

            return (
              <div key={block.blockIndex}>
                <button
                  onClick={() => toggleBlock(block.blockIndex)}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Свернуть' : 'Развернуть'} блок: ${block.name}`}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left group ${
                    isExpanded ? 'bg-muted/50 dark:bg-slate-800/40' : 'hover:bg-muted/30 dark:hover:bg-slate-800/20'
                  }`}
                >
                  {/* Icon — 28×28 container meets 20px visual icon target per HIG */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors text-sm ${
                    isExpanded ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-teal-50 dark:bg-teal-900/20'
                  }`}>
                    {block.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[0.6rem] text-muted-foreground/50 font-bold shrink-0">{block.blockIndex + 1}</span>
                      <span className="text-[0.75rem] truncate font-semibold leading-tight">{block.name}</span>
                      {block.completedModulesInBlock > 0 && (
                        <span className={`text-[0.55rem] px-1.5 py-0.5 rounded-full font-bold tabular-nums shrink-0 leading-none ${
                          block.completedModulesInBlock === block.totalModulesInBlock
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                        }`}>
                          {block.completedModulesInBlock}/{block.totalModulesInBlock}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Progress bar: min 4px height per MD3 Linear Progress spec */}
                      <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100 ? 'bg-emerald-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[0.625rem] text-muted-foreground/50 shrink-0 tabular-nums leading-none">
                        {block.completedBlockLessons}/{block.totalBlockLessons}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-muted-foreground/30">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3.5 pl-3 border-l border-border/30 dark:border-slate-700/40 mt-0.5 mb-1 space-y-px">
                        {block.modules.map((module) => {
                          const isExpandedModule = effectiveExpanded.has(module.id);
                          const progress = getModuleProgress(module);
                          const isModuleComplete = progress.completed === progress.total;
                          const pctModule = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                          const ModIcon = iconMap[module.icon] || BookOpen;

                          // Module is paid-locked only if it has NO free lessons at all
                          const hasAnyFreeLesson = freeLessonIds
                            ? module.lessons.some(l => freeLessonIds.has(l.id))
                            : true;
                          const isPaidLocked = accessLevel === "free" && !!freeLessonIds && !hasAnyFreeLesson;

                          // A module with at least one free lesson is always "unlocked" (expandable),
                          // even if sequential unlock hasn't been reached yet
                          const isUnlocked = accessLevel !== "free"
                            ? true
                            : (hasAnyFreeLesson || isModuleUnlocked(module, completedLessons));

                          return (
                            <div key={module.id}>
                              <button
                                onClick={() => {
                                  if (!isUnlocked) return;
                                  if (isPaidLocked) {
                                    // clicking locked module → trigger paywall via first lesson
                                    onSelectLesson(module.lessons[0]?.id || "");
                                    return;
                                  }
                                  toggleModule(module.id);
                                }}
                                aria-expanded={isExpandedModule}
                                aria-label={`${isExpandedModule ? 'Свернуть' : 'Развернуть'} модуль: ${module.title}`}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left group ${
                                  !isUnlocked
                                    ? 'opacity-40 cursor-not-allowed'
                                    : isPaidLocked
                                    ? 'opacity-60 cursor-pointer hover:bg-muted/20 dark:hover:bg-slate-800/20'
                                    : isExpandedModule ? 'bg-muted/50 dark:bg-slate-800/40' : 'hover:bg-muted/30 dark:hover:bg-slate-800/20'
                                }`}
                              >
                                {/* Icon — 28×28 container meets 20px visual icon target per HIG */}
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  !isUnlocked
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                                    : isPaidLocked
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400'
                                    : isModuleComplete
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40'
                                }`}>
                                  {!isUnlocked ? <Lock className="w-3.5 h-3.5" /> : isPaidLocked ? <Lock className="w-3.5 h-3.5" /> : <ModIcon className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[0.625rem] text-muted-foreground/60 font-semibold uppercase tracking-wider shrink-0">M{module.number}</span>
                                    <span className="text-[0.75rem] truncate font-medium leading-tight">{module.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {/* Progress bar: min 4px height per MD3 Linear Progress spec */}
                                    <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isModuleComplete ? 'bg-emerald-500' : 'bg-teal-500'
                                        }`}
                                        style={{ width: `${pctModule}%` }}
                                      />
                                    </div>
                                    <span className="text-[0.625rem] text-muted-foreground/50 shrink-0 tabular-nums leading-none">
                                      {progress.completed}/{progress.total}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-muted-foreground/30">
                                  {!isUnlocked
                                    ? <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                                    : <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpandedModule ? '' : '-rotate-90'}`} />
                                  }
                                </div>
                              </button>

                              <AnimatePresence initial={false}>
                                {isExpandedModule && isUnlocked && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                  >
                                    <div className="ml-3.5 pl-3 border-l border-border/30 dark:border-slate-700/40 mt-0.5 mb-1 space-y-px">
                                      {module.lessons.map((lesson) => {
                                        const isSelected = selectedLesson === lesson.id;
                                        const isCompleted = completedLessons.has(lesson.id);
                                        const isBookmarked = bookmarks?.has(lesson.id);
                                        const hasQuiz = lesson.quiz && lesson.quiz.length > 0;
                                        const hasPractice = lesson.practice && lesson.practice.length > 0;
                                        const isLessonPaidLocked = accessLevel === "free" && freeLessonIds && !freeLessonIds.has(lesson.id);
                                        return (
                                          <button
                                            key={lesson.id}
                                            onClick={() => {
                                              onSelectLesson(lesson.id);
                                              setMobileOpen(false);
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-md flex items-center gap-2 transition-colors group/item ${
                                              isSelected
                                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100'
                                                : isLessonPaidLocked
                                                ? 'text-muted-foreground/40 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 hover:text-amber-700 dark:hover:text-amber-400'
                                                : 'hover:bg-muted/40 dark:hover:bg-slate-800/30 text-muted-foreground hover:text-foreground'
                                            }`}
                                          >
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                              isLessonPaidLocked
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40'
                                                : isCompleted
                                                ? 'bg-emerald-500 text-white'
                                                : isSelected
                                                ? 'border-[1.5px] border-teal-400 bg-teal-50 dark:bg-teal-900/20'
                                                : 'border-[1.5px] border-border/50 dark:border-slate-600 group-hover/item:border-muted-foreground/30'
                                            }`}>
                                              {isLessonPaidLocked
                                                ? <Lock className="w-2 h-2 text-amber-400" />
                                                : isCompleted
                                                ? <CheckCircle className="w-2.5 h-2.5" />
                                                : null
                                              }
                                            </div>
                                            <span className={`flex-1 truncate text-[0.75rem] leading-tight ${isSelected ? 'font-medium' : ''} ${isLessonPaidLocked ? 'opacity-50' : ''}`}>
                                              {lesson.title}
                                            </span>
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-50">
                                              {isLessonPaidLocked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                                              {!isLessonPaidLocked && isBookmarked && <Bookmark className="w-2.5 h-2.5 text-teal-400 fill-teal-400" />}
                                              {!isLessonPaidLocked && hasQuiz && <span className="w-1 h-1 rounded-full bg-teal-400" />}
                                              {!isLessonPaidLocked && hasPractice && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Bottom section — compact ===== */}
      <div className="border-t border-border/40 dark:border-slate-700/40">
        {/* Tools — collapsible row */}
        <div className="px-3 pt-2.5 pb-1">
          <button
            onClick={() => setShowTools(!showTools)}
            className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[0.6875rem] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3 h-3" />
              <span className="font-medium">Инструменты</span>
            </div>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTools ? '' : '-rotate-90'}`} />
          </button>

          <AnimatePresence initial={false}>
            {showTools && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-4 gap-1 pt-1.5 pb-0.5">
                  {tools.map((tool, i) => {
                    const TIcon = tool.icon;
                    const colorClasses: Record<string, string> = {
                      teal: "hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30",
                      amber: "hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30",
                      violet: "hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30",
                      indigo: "hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
                      cyan: "hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30",
                      blue: "hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30",
                      emerald: "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
                      pink: "hover:text-pink-700 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/30",
                    };
                    if (tool.locked) {
                      return (
                        <div
                          key={i}
                          title="Доступно после оплаты"
                          className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-muted-foreground/30 opacity-50 cursor-not-allowed select-none relative"
                        >
                          <div className="relative">
                            <TIcon className="w-3.5 h-3.5" />
                            <Lock className="absolute -top-1.5 -right-1.5 w-2 h-2 text-slate-400 dark:text-slate-500" />
                          </div>
                          <span className="text-[0.625rem] leading-tight truncate w-full text-center">{tool.label}</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => { tool.onClick(); setMobileOpen(false); }}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-muted-foreground/60 transition-colors ${colorClasses[tool.color] || colorClasses.teal}`}
                        title={tool.label}
                      >
                        <TIcon className="w-3.5 h-3.5" />
                        <span className="text-[0.625rem] leading-tight truncate w-full text-center">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Final Exam */}
        {onOpenFinalExam && (
          <div className="px-3 pb-1.5">
            {toolsLocked ? (
              <div
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[0.8125rem] opacity-50 cursor-not-allowed select-none border border-dashed border-border/30 bg-muted/30"
                title="Доступно после оплаты"
              >
                <Lock className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                <span className="font-semibold truncate text-muted-foreground/60">Финальный экзамен</span>
                <span className="ml-auto text-[0.5625rem] text-muted-foreground/40 font-medium shrink-0">🔒 Премиум</span>
              </div>
            ) : (
              <button
                onClick={() => { onOpenFinalExam(); setMobileOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-[0.8125rem] ${
                  showFinalExam
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm shadow-teal-100 dark:shadow-teal-900/30'
                    : 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 text-teal-700 dark:text-teal-300 hover:from-teal-100 hover:to-emerald-100 dark:hover:from-teal-900/40 dark:hover:to-emerald-900/30'
                }`}
              >
                <Award className={`w-4 h-4 shrink-0 ${showFinalExam ? 'text-teal-200' : ''}`} />
                <span className="font-semibold truncate">Финальный экзамен</span>
              </button>
            )}
          </div>
        )}

        {/* Footer: user + controls */}
        <div className="px-3 pb-3 pt-1 space-y-2">
          {/* User row */}
          <div className="flex items-center gap-2">
            {currentUserName !== "Вы" ? (
              <>
                <button
                  onClick={onOpenProfile}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center shrink-0 shadow-sm hover:ring-2 hover:ring-teal-300 dark:hover:ring-teal-600 transition-all"
                  title="Личный кабинет"
                >
                  <span className="text-white text-[0.6875rem] font-bold leading-none">
                    {currentUserName.charAt(0).toUpperCase()}
                  </span>
                </button>
                {editingName ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && nameInput.trim()) {
                          saveUserName(nameInput.trim());
                          setCurrentUserName(nameInput.trim());
                          setEditingName(false);
                          onNameChange?.(nameInput.trim());
                        }
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      autoFocus
                      maxLength={30}
                      className="flex-1 min-w-0 px-2 py-1 text-[0.75rem] border border-teal-300 dark:border-teal-600 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-400/30 bg-background"
                    />
                    <button
                      onClick={() => {
                        if (nameInput.trim()) {
                          saveUserName(nameInput.trim());
                          setCurrentUserName(nameInput.trim());
                          setEditingName(false);
                          onNameChange?.(nameInput.trim());
                        }
                      }}
                      className="w-5 h-5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center hover:bg-teal-100 transition-colors shrink-0"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span className="text-[0.75rem] font-medium truncate">{currentUserName}</span>
                    <button
                      onClick={() => { setNameInput(currentUserName); setEditingName(true); }}
                      className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground/25 hover:text-teal-600 transition-all shrink-0"
                      title="Изменить имя"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1" />
            )}

            {/* Dark mode + Export in one row */}
            <div className="flex items-center gap-1 shrink-0">
              {onToggleDark && (
                <DarkModeToggle isDark={!!isDark} onToggle={onToggleDark} />
              )}
            </div>
          </div>

          {/* Auth */}
          {authState && onOpenAuth && onSignOut && (
            <SyncStatusBadge authState={authState} onOpenAuth={onOpenAuth} onSignOut={onSignOut} />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Открыть навигацию"
        title="Открыть навигацию"
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center shadow-lg shadow-black/5"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-sidebar shadow-2xl shadow-black/10 relative">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </div>
          <div
            className="flex-1 bg-black/20 backdrop-blur-sm cursor-default"
            role="button"
            aria-label="Закрыть навигацию"
            tabIndex={0}
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setMobileOpen(false); }}
          />
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[272px] bg-sidebar border-r border-border/50 dark:border-slate-700/40 h-screen sticky top-0 overflow-hidden shrink-0">
        {sidebarContent}
      </div>
    </>
  );
}