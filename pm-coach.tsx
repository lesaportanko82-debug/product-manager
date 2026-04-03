import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getAdaptiveProfile } from "./adaptive-learning";
import { courseModules, getAllLessons } from "./course-data";
import {
  MessageCircle, Send, Loader2, ArrowRight, Plus, ChevronRight,
  Sparkles, Target, BarChart3, Zap, FileText, Clock, ArrowLeft,
  CheckCircle2, AlertTriangle, TrendingUp, Lightbulb, X, History,
  Briefcase, Compass, Star, Users, Shield, DollarSign, Copy, Check,
  Smile, Frown, Meh, BookOpen, ExternalLink, Layout
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

// ===== Types =====
interface CoachMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface CoachAnalysis {
  summary: string;
  situation: string;
  keyInsights: string[];
  frameworks: { name: string; application: string }[];
  actionPlan: { step: number; action: string; metric: string; timeframe: string }[];
  risks: string[];
  northStarMetric: string;
  recommendedModules: string[];
}

interface CoachSession {
  id: string;
  product: string;
  challenge: string;
  messages: CoachMessage[];
  analysis: CoachAnalysis | null;
  artifacts: any[];
  roleplayMessages: CoachMessage[];
  roleplayRole: string | null;
  status: "active" | "analyzed";
  createdAt: string;
  updatedAt: string;
}

// ===== Framework -> Lesson mapping =====
const FRAMEWORK_LESSONS: Record<string, { lessonId: string; moduleTitle: string; lessonTitle: string }[]> = {
  "JTBD": [
    { lessonId: "m6-l1", moduleTitle: "Jobs To Be Done", lessonTitle: "JTBD на пальцах" },
    { lessonId: "m7-l1", moduleTitle: "JTBD-интервьюирование", lessonTitle: "Принципы и скрипт JTBD-интервью" },
    { lessonId: "m17-l3", moduleTitle: "Исследования, метрики и методологии", lessonTitle: "JTBD, Job Story и CJM" },
  ],
  "CJM": [
    { lessonId: "m17-l3", moduleTitle: "Исследования, метрики и методологии", lessonTitle: "JTBD, Job Story и CJM" },
  ],
  "RICE": [
    { lessonId: "m15-l2", moduleTitle: "Приоритизация фичей", lessonTitle: "Медленные методы: RICE и ROI" },
  ],
  "Lean Canvas": [
    { lessonId: "m17-l6", moduleTitle: "Исследования, метрики и методологии", lessonTitle: "MVP, MLP, Roadmap, User Story, Use Case" },
  ],
  "MVP": [
    { lessonId: "m17-l6", moduleTitle: "Исследования, метрики и методологии", lessonTitle: "MVP, MLP, Roadmap, User Story, Use Case" },
  ],
  "Product-Market Fit": [
    { lessonId: "m12-l1", moduleTitle: "ABCDX-сегментация и Product/Market Fit", lessonTitle: "ABCDX-модель" },
  ],
  "North Star": [
    { lessonId: "m17-l5", moduleTitle: "Исследования, метрики и методологии", lessonTitle: "Продуктовые и бизнес-метрики" },
  ],
  "Impact Mapping": [
    { lessonId: "m15-l1", moduleTitle: "Приоритизация фичей", lessonTitle: "Быстрые методы приоритизации" },
  ],
  "Pirate Metrics": [
    { lessonId: "m13-l1", moduleTitle: "Растим конверсию и возвращаемость", lessonTitle: "Воронка AARRR и конверсия" },
  ],
  "UX": [
    { lessonId: "m14-l1", moduleTitle: "UX-тестирование", lessonTitle: "UX-тестирование на пальцах" },
  ],
  "Retention": [
    { lessonId: "m13-l2", moduleTitle: "Растим конверсию и возвращаемость", lessonTitle: "Retention и возвращаемость" },
  ],
};

function findRelatedLessons(text: string): { lessonId: string; moduleTitle: string; lessonTitle: string }[] {
  const found: { lessonId: string; moduleTitle: string; lessonTitle: string }[] = [];
  const seen = new Set<string>();
  for (const [keyword, lessons] of Object.entries(FRAMEWORK_LESSONS)) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      for (const l of lessons) {
        if (!seen.has(l.lessonId)) {
          seen.add(l.lessonId);
          found.push(l);
        }
      }
    }
  }
  return found.slice(0, 5);
}

// ===== Storage =====
const LS_KEY = "pm-coach-sessions";
function getSessions(): CoachSession[] { try { const d = localStorage.getItem(LS_KEY); return d ? JSON.parse(d) : []; } catch { return []; } }
function saveSessions(s: CoachSession[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }
function getSessionId(): string { try { return localStorage.getItem("session-id") || "anon"; } catch { return "anon"; } }

// ===== Stakeholder roles =====
const STAKEHOLDERS = [
  { id: "CEO", label: "CEO", icon: Briefcase, desc: "Бизнес-результаты, ROI, стратегия роста", color: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-700/50" },
  { id: "CTO", label: "CTO", icon: Shield, desc: "Тех. долг, архитектура, сроки", color: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/30" },
  { id: "Investor", label: "Инвестор", icon: DollarSign, desc: "TAM/SAM, unit-экономика, moat", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30" },
  { id: "Head_of_Sales", label: "Head of Sales", icon: Users, desc: "ICP, конверсия, sales cycle", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30" },
];

// ===== Artifact types =====
const ARTIFACT_TYPES = [
  { id: "lean_canvas", label: "Lean Canvas", icon: Layout, desc: "9 блоков бизнес-модели" },
  { id: "rice", label: "RICE-таблица", icon: BarChart3, desc: "Приоритизация фичей" },
  { id: "cjm", label: "CJM", icon: TrendingUp, desc: "Карта пути клиента" },
  { id: "impact_map", label: "Impact Map", icon: Target, desc: "Цель > Акторы > Действия" },
];

// ===== Templates =====
const TEMPLATES = [
  { icon: TrendingUp, label: "Рост продукта", product: "Мой продукт", challenge: "Хочу ускорить рост и найти новые каналы привлечения" },
  { icon: AlertTriangle, label: "Churn", product: "SaaS-продукт", challenge: "Высокий churn, пользователи уходят после первого месяца" },
  { icon: Target, label: "Новый рынок", product: "Существующий продукт", challenge: "Планирую выход на новый рынок, нужна стратегия" },
  { icon: Zap, label: "Приоритизация", product: "Продукт с большим бэклогом", challenge: "Не могу определить, какие фичи делать в первую очередь" },
  { icon: BarChart3, label: "Метрики", product: "Продукт на стадии роста", challenge: "Не уверен, какие метрики отслеживать и как строить аналитику" },
  { icon: Compass, label: "PMF", product: "Стартап на ранней стадии", challenge: "Как понять, что мы достигли Product-Market Fit?" },
];

function cleanText(t: string): string {
  return t.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^[-*]\s+/gm, "\u2022 ").replace(/\n{3,}/g, "\n\n").trim();
}

// ===== Main Component =====
export function PMCoach({ onClose, onSelectLesson }: { onClose: () => void; onSelectLesson?: (id: string) => void }) {
  type View = "home" | "setup" | "chat" | "analysis" | "history" | "roleplay" | "artifacts";
  const [view, setView] = useState<View>("home");
  const [sessions, setSessions] = useState<CoachSession[]>(getSessions);
  const [activeSession, setActiveSession] = useState<CoachSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [challengeInput, setChallengeInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pmLevel = getAdaptiveProfile()?.level || "junior";

  useEffect(() => {
    if (view === "chat" || view === "roleplay") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [view, activeSession?.messages.length, activeSession?.roleplayMessages?.length]);

  const startSession = useCallback((product: string, challenge: string) => {
    const session: CoachSession = {
      id: `coach-${Date.now().toString(36)}`,
      product: product.trim(), challenge: challenge.trim(),
      messages: [], analysis: null, artifacts: [],
      roleplayMessages: [], roleplayRole: null,
      status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setActiveSession(session);
    setSessions(prev => { const next = [session, ...prev]; saveSessions(next); return next; });
    setView("chat");
    sendToCoach(session, [
      { role: "user", content: `Мой продукт: ${product.trim()}\n\nМоя задача/вызов: ${challenge.trim()}`, timestamp: new Date().toISOString() },
    ], product, challenge);
  }, []);

  const sendToCoach = useCallback(async (
    session: CoachSession, msgs: CoachMessage[],
    product?: string, challenge?: string, mode?: string, extra?: any
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pm-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          messages: msgs.map(m => ({ role: m.role, content: m.content })),
          userProduct: product || session.product,
          userChallenge: challenge || session.challenge,
          mode: mode || "question", pmLevel, ...extra,
        }),
      });
      const data = await res.json();
      if (data.error) {
        const errMsg: CoachMessage = { role: "assistant", content: `Ошибка: ${data.error}`, timestamp: new Date().toISOString() };
        if (mode === "roleplay") updateSessionField(session, "roleplayMessages", [...msgs, errMsg]);
        else updateSession(session, [...msgs, errMsg]);
        return;
      }
      if (data.type === "analysis" && data.analysis) {
        const updated = { ...session, messages: msgs, analysis: data.analysis, status: "analyzed" as const, updatedAt: new Date().toISOString() };
        setActiveSession(updated);
        setSessions(prev => { const next = prev.map(s => s.id === updated.id ? updated : s); saveSessions(next); return next; });
        setView("analysis");
        fetch(`${API_BASE}/pm-coach/save`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` }, body: JSON.stringify({ sessionId: getSessionId(), coachSession: updated }) }).catch(e => console.log("Error saving coach session:", e));
        return;
      }
      if (data.type === "artifact" && data.artifact) {
        const updated = { ...session, artifacts: [...(session.artifacts || []), data.artifact], updatedAt: new Date().toISOString() };
        setActiveSession(updated);
        setSessions(prev => { const next = prev.map(s => s.id === updated.id ? updated : s); saveSessions(next); return next; });
        return;
      }
      const assistantMsg: CoachMessage = { role: "assistant", content: cleanText(data.content || ""), timestamp: new Date().toISOString() };
      if (mode === "roleplay") updateSessionField(session, "roleplayMessages", [...msgs, assistantMsg]);
      else updateSession(session, [...msgs, assistantMsg]);
    } catch (err) {
      console.log("PM Coach error:", err);
      const errMsg: CoachMessage = { role: "assistant", content: "Не удалось получить ответ. Попробуйте позже.", timestamp: new Date().toISOString() };
      if (mode === "roleplay") updateSessionField(session, "roleplayMessages", [...msgs, errMsg]);
      else updateSession(session, [...msgs, errMsg]);
    } finally { setLoading(false); }
  }, [pmLevel]);

  const updateSession = useCallback((session: CoachSession, messages: CoachMessage[]) => {
    const updated = { ...session, messages, updatedAt: new Date().toISOString() };
    setActiveSession(updated);
    setSessions(prev => { const next = prev.map(s => s.id === updated.id ? updated : s); saveSessions(next); return next; });
  }, []);

  const updateSessionField = useCallback((session: CoachSession, field: string, value: any) => {
    const updated = { ...session, [field]: value, updatedAt: new Date().toISOString() };
    setActiveSession(updated);
    setSessions(prev => { const next = prev.map(s => s.id === updated.id ? updated : s); saveSessions(next); return next; });
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || loading || !activeSession) return;
    const userMsg: CoachMessage = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    if (view === "roleplay") {
      const allMsgs = [...(activeSession.roleplayMessages || []), userMsg];
      updateSessionField(activeSession, "roleplayMessages", allMsgs);
      setInput("");
      sendToCoach(activeSession, allMsgs, undefined, undefined, "roleplay", { stakeholderRole: activeSession.roleplayRole });
    } else {
      const allMsgs = [...activeSession.messages, userMsg];
      updateSession(activeSession, allMsgs);
      setInput("");
      sendToCoach(activeSession, allMsgs);
    }
  }, [input, loading, activeSession, view, updateSession, updateSessionField, sendToCoach]);

  const handleRequestAnalysis = useCallback(() => {
    if (!activeSession || loading) return;
    const userMsg: CoachMessage = { role: "user", content: "Да, подготовь структурированный разбор моего кейса.", timestamp: new Date().toISOString() };
    const allMsgs = [...activeSession.messages, userMsg];
    updateSession(activeSession, allMsgs);
    sendToCoach(activeSession, allMsgs, undefined, undefined, "analyze");
  }, [activeSession, loading, updateSession, sendToCoach]);

  const handleStartRoleplay = useCallback((roleId: string) => {
    if (!activeSession) return;
    const updated = { ...activeSession, roleplayRole: roleId, roleplayMessages: [] };
    setActiveSession(updated);
    setSessions(prev => { const next = prev.map(s => s.id === updated.id ? updated : s); saveSessions(next); return next; });
    setView("roleplay");
    const introMsg: CoachMessage = { role: "user", content: `Я хочу защитить своё продуктовое решение. Мой продукт: ${activeSession.product}. Задача: ${activeSession.challenge}. ${activeSession.analysis ? `Мой план: ${activeSession.analysis.summary}` : ""}`, timestamp: new Date().toISOString() };
    sendToCoach(updated, [introMsg], undefined, undefined, "roleplay", { stakeholderRole: roleId });
  }, [activeSession, sendToCoach]);

  const handleGenerateArtifact = useCallback((artifactType: string) => {
    if (!activeSession || loading) return;
    sendToCoach(activeSession, activeSession.messages, undefined, undefined, "artifact", { artifactType });
  }, [activeSession, loading, sendToCoach]);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => { const next = prev.filter(s => s.id !== id); saveSessions(next); return next; });
    if (activeSession?.id === id) { setActiveSession(null); setView("home"); }
  }, [activeSession]);

  const messageCount = activeSession?.messages.filter(m => m.role === "user").length || 0;
  const canRequestAnalysis = messageCount >= 3;

  const goBack = useCallback(() => {
    if (view === "home") onClose();
    else if (view === "roleplay" || view === "artifacts") setView("analysis");
    else if (view === "analysis") setView("chat");
    else if (view === "history" || view === "setup") setView("home");
    else if (view === "chat" && activeSession?.analysis) setView("analysis");
    else setView("home");
  }, [view, activeSession, onClose]);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[820px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goBack} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {view === "home" ? "Назад к курсу" : "Назад"}
          </button>
          <div className="flex items-center gap-2">
            {view !== "history" && sessions.length > 0 && (
              <button onClick={() => setView("history")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5 transition-all">
                <History className="w-3.5 h-3.5" /> Портфолио ({sessions.length})
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === "home" && (
            <Animate key="home">
              <HomeView onNewSession={() => { setProductInput(""); setChallengeInput(""); setView("setup"); }}
                onSelectTemplate={(t) => { setProductInput(t.product); setChallengeInput(t.challenge); setView("setup"); }}
                sessions={sessions} onResumeSession={(s) => { setActiveSession(s); setView(s.analysis ? "analysis" : "chat"); }} />
            </Animate>
          )}
          {view === "setup" && (
            <Animate key="setup">
              <SetupView product={productInput} challenge={challengeInput} onProductChange={setProductInput} onChallengeChange={setChallengeInput} onStart={() => startSession(productInput, challengeInput)} loading={loading} />
            </Animate>
          )}
          {view === "chat" && activeSession && (
            <Animate key="chat">
              <ChatView session={activeSession} input={input} onInputChange={setInput} onSend={handleSend} onRequestAnalysis={handleRequestAnalysis} loading={loading} canRequestAnalysis={canRequestAnalysis} messagesEndRef={messagesEndRef} inputRef={inputRef} messageCount={messageCount} />
            </Animate>
          )}
          {view === "analysis" && activeSession?.analysis && (
            <Animate key="analysis">
              <AnalysisView session={activeSession} onNewSession={() => { setActiveSession(null); setView("home"); }} onBackToChat={() => setView("chat")}
                onStartRoleplay={handleStartRoleplay} onOpenArtifacts={() => setView("artifacts")}
                onSelectLesson={onSelectLesson} />
            </Animate>
          )}
          {view === "roleplay" && activeSession && (
            <Animate key="roleplay">
              <RoleplayView session={activeSession} input={input} onInputChange={setInput} onSend={handleSend} loading={loading} messagesEndRef={messagesEndRef} inputRef={inputRef} onBack={() => setView("analysis")} />
            </Animate>
          )}
          {view === "artifacts" && activeSession && (
            <Animate key="artifacts">
              <ArtifactsView session={activeSession} onGenerate={handleGenerateArtifact} loading={loading} onBack={() => setView("analysis")} />
            </Animate>
          )}
          {view === "history" && (
            <Animate key="history">
              <HistoryView sessions={sessions} onSelectSession={(s) => { setActiveSession(s); setView(s.analysis ? "analysis" : "chat"); }} onDeleteSession={handleDeleteSession} onNewSession={() => setView("home")} />
            </Animate>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Animate({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>{children}</motion.div>;
}

// ===== Home View =====
function HomeView({ onNewSession, onSelectTemplate, sessions, onResumeSession }: any) {
  const activeSessions = sessions.filter((s: CoachSession) => s.status === "active").slice(0, 2);
  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-[0.75rem] font-medium mb-4">
          <Sparkles className="w-3 h-3" /> AI-powered Socratic coaching
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-3">PM-Коуч</h1>
        <p className="text-[0.9375rem] text-muted-foreground max-w-md mx-auto leading-relaxed">
          Разберите свой кейс, защитите решение перед стейкхолдерами, получите заполненные артефакты.
        </p>
      </div>
      {activeSessions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[0.8125rem] font-semibold text-left mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-teal-500" /> Незавершённые</h3>
          <div className="space-y-2">{activeSessions.map((s: CoachSession) => (
            <button key={s.id} onClick={() => onResumeSession(s)} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 border border-teal-100/60 dark:border-teal-800/30 rounded-xl hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all text-left group">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center shrink-0"><Briefcase className="w-4 h-4 text-teal-500" /></div>
              <div className="flex-1 min-w-0"><p className="text-[0.8125rem] font-medium truncate">{s.product}</p><p className="text-[0.6875rem] text-muted-foreground/60 truncate">{s.challenge}</p></div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-teal-500 transition-colors" />
            </button>
          ))}</div>
        </div>
      )}
      <button onClick={onNewSession} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl p-4 font-medium hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md shadow-teal-100/50 dark:shadow-teal-900/30 mb-8">
        <Plus className="w-5 h-5" /> Новый разбор кейса
      </button>
      <div className="text-left">
        <h3 className="text-[0.8125rem] font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Или выберите шаблон</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{TEMPLATES.map((t, i) => { const Icon = t.icon; return (
          <button key={i} onClick={() => onSelectTemplate(t)} className="flex items-center gap-2.5 px-3.5 py-3 bg-white dark:bg-slate-800 border border-border/40 rounded-xl hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all text-left">
            <Icon className="w-4 h-4 text-teal-400 shrink-0" /><span className="text-[0.8125rem] font-medium">{t.label}</span>
          </button>
        ); })}</div>
      </div>

      {/* How it works */}
      <div className="mt-10 text-left">
        <h3 className="text-[0.8125rem] font-semibold mb-4 flex items-center gap-2"><Compass className="w-4 h-4 text-teal-500" /> Как это работает</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Опишите кейс", desc: "Ваш продукт и конкретный вызов", icon: FileText },
            { step: "2", title: "Диалог с коучем", desc: "Сократовские вопросы для глубины", icon: MessageCircle },
            { step: "3", title: "Получите разбор", desc: "Фреймворки, план действий, метрики", icon: Target },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="bg-white dark:bg-slate-800 border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-[0.8125rem] font-semibold">{s.title}</span>
                </div>
                <p className="text-[0.75rem] text-muted-foreground/60">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== Setup View =====
function SetupView({ product, challenge, onProductChange, onChallengeChange, onStart, loading }: any) {
  const canStart = product.trim().length >= 3 && challenge.trim().length >= 10;
  return (
    <div>
      <div className="text-center mb-8"><h2 className="text-xl font-bold tracking-tight mb-2">Опишите ваш кейс</h2><p className="text-[0.875rem] text-muted-foreground">Чем конкретнее описание, тем точнее будет разбор</p></div>
      <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-[0.8125rem] font-semibold mb-2 block">Ваш продукт *</label>
          <input value={product} onChange={(e: any) => onProductChange(e.target.value)} placeholder="B2B SaaS, мобильное приложение..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-border/40 rounded-xl text-[0.875rem] placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800 transition-all" />
        </div>
        <div>
          <label className="text-[0.8125rem] font-semibold mb-2 block">Задача или вызов *</label>
          <textarea value={challenge} onChange={(e: any) => onChallengeChange(e.target.value)} placeholder="Churn вырос до 8%, нужно выбрать North Star метрику..." rows={4} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-border/40 rounded-xl text-[0.875rem] placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800 resize-none transition-all" />
        </div>

        {/* Examples */}
        <div className="bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100/40 dark:border-teal-800/20 rounded-xl p-4">
          <p className="text-[0.75rem] font-medium text-teal-700 dark:text-teal-300 mb-2">Примеры хороших кейсов:</p>
          <ul className="space-y-1.5">
            {[
              "Retention D30 упал на 15%, нужно диагностировать причину",
              "Запускаем marketplace, как решить chicken-and-egg проблему",
              "CEO хочет добавить AI-фичу, данных о потребности нет",
              "Переход от B2C к B2B2C, нужна стратегия",
            ].map((ex, i) => (
              <li key={i} className="text-[0.75rem] text-teal-600/60 dark:text-teal-400/60 flex items-start gap-2">
                <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /><span>{ex}</span>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={onStart} disabled={!canStart || loading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl py-3.5 font-medium hover:from-teal-600 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Начать разбор
        </button>
      </div>
    </div>
  );
}

// ===== Chat View =====
function ChatView({ session, input, onInputChange, onSend, onRequestAnalysis, loading, canRequestAnalysis, messagesEndRef, inputRef, messageCount }: any) {
  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0"><Briefcase className="w-4 h-4 text-teal-500" /></div>
            <div className="min-w-0"><p className="text-[0.8125rem] font-semibold truncate">{session.product}</p><p className="text-[0.6875rem] text-muted-foreground/50 truncate">{session.challenge}</p></div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[0.625rem] px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg font-medium tabular-nums">{messageCount}/6</span>
            {canRequestAnalysis && <button onClick={onRequestAnalysis} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg text-[0.75rem] font-medium hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 transition-all"><Sparkles className="w-3 h-3" /> Получить разбор</button>}
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" animate={{ width: `${Math.min(100, (messageCount / 6) * 100)}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>
      <MessageList messages={session.messages} loading={loading} messagesEndRef={messagesEndRef} />
      <ChatInput input={input} onInputChange={onInputChange} onSend={onSend} loading={loading} inputRef={inputRef} placeholder="Ответьте на вопрос коуча..." />
      {!canRequestAnalysis && messageCount > 0 && <p className="text-[0.6875rem] text-muted-foreground/30 mt-2 px-4">Ещё {Math.max(0, 3 - messageCount)} до возможности запросить анализ</p>}
    </div>
  );
}

// ===== Roleplay View =====
function RoleplayView({ session, input, onInputChange, onSend, loading, messagesEndRef, inputRef, onBack }: any) {
  const role = STAKEHOLDERS.find(s => s.id === session.roleplayRole) || STAKEHOLDERS[0];
  const Icon = role.icon;
  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${role.color}`}><Icon className="w-4 h-4" /></div>
          <div><p className="text-[0.8125rem] font-semibold">Стейкхолдер-симуляция: {role.label}</p><p className="text-[0.6875rem] text-muted-foreground/50">{role.desc}</p></div>
        </div>
      </div>
      <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/40 dark:border-amber-800/20 rounded-xl px-4 py-3 mb-4">
        <p className="text-[0.75rem] text-amber-700 dark:text-amber-400">Защитите ваше решение. {role.label} будет задавать жёсткие вопросы — как на реальной встрече.</p>
      </div>
      <MessageList messages={session.roleplayMessages || []} loading={loading} messagesEndRef={messagesEndRef} roleColor={role.color} roleIcon={role.icon} />
      <ChatInput input={input} onInputChange={onInputChange} onSend={onSend} loading={loading} inputRef={inputRef} placeholder={`Ответьте ${role.label}...`} />
    </div>
  );
}

// ===== Shared Message List =====
function MessageList({ messages, loading, messagesEndRef, roleColor, roleIcon }: any) {
  const RoleIcon = roleIcon || Sparkles;
  return (
    <div className="space-y-3 mb-4 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
      {messages.map((msg: CoachMessage, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 mr-2.5 ${roleColor || "bg-teal-50 dark:bg-teal-900/30"}`}><RoleIcon className={`w-3.5 h-3.5 ${roleColor ? "" : "text-teal-500"}`} /></div>}
          <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[0.875rem] leading-relaxed ${msg.role === "user" ? "bg-teal-600 text-white rounded-br-md" : "bg-white dark:bg-slate-800 border border-border/40 text-foreground rounded-bl-md"}`}>
            {msg.content.split("\n").map((line: string, j: number) => <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>)}
          </div>
        </motion.div>
      ))}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${roleColor || "bg-teal-50 dark:bg-teal-900/30"}`}><RoleIcon className={`w-3.5 h-3.5 ${roleColor ? "" : "text-teal-500"}`} /></div>
          <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-teal-400 animate-spin" /><span className="text-[0.8125rem] text-muted-foreground/50">Думает...</span>
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInput({ input, onInputChange, onSend, loading, inputRef, placeholder }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-3">
      <div className="flex items-end gap-2">
        <textarea ref={inputRef} value={input} onChange={(e: any) => onInputChange(e.target.value)}
          onKeyDown={(e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={placeholder} rows={2} className="flex-1 bg-transparent text-[0.875rem] placeholder:text-muted-foreground/30 focus:outline-none resize-none" />
        <button onClick={onSend} disabled={!input.trim() || loading} className="w-9 h-9 rounded-xl bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ===== Analysis View (enhanced) =====
function AnalysisView({ session, onNewSession, onBackToChat, onStartRoleplay, onOpenArtifacts, onSelectLesson }: {
  session: CoachSession; onNewSession: () => void; onBackToChat: () => void;
  onStartRoleplay: (role: string) => void; onOpenArtifacts: () => void;
  onSelectLesson?: (id: string) => void;
}) {
  const a = session.analysis!;
  const relatedLessons = findRelatedLessons(JSON.stringify(a));
  const completedLessons: Set<string> = (() => { try { const s = localStorage.getItem("course-progress"); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); } })();
  const unfinishedRelated = relatedLessons.filter(l => !completedLessons.has(l.lessonId));

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-400 via-slate-500 to-teal-500 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-white/70" /><span className="text-[0.75rem] font-medium text-white/60">Структурированный разбор</span></div>
        <h2 className="text-xl font-bold mb-2">{session.product}</h2>
        <p className="text-[0.875rem] text-white/70 leading-relaxed">{a.summary}</p>
      </div>

      {/* Stakeholder Roleplay CTA */}
      <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-5 mb-4">
        <h3 className="text-[0.875rem] font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-teal-500" /> Защитите решение</h3>
        <p className="text-[0.75rem] text-muted-foreground/60 mb-3">Потренируйтесь питчить перед стейкхолдерами — AI будет задавать жёсткие вопросы.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAKEHOLDERS.map(s => { const Icon = s.icon; return (
            <button key={s.id} onClick={() => onStartRoleplay(s.id)} className="flex flex-col items-center gap-1.5 px-3 py-3 bg-slate-50 dark:bg-slate-700/50 border border-border/30 rounded-xl hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><Icon className="w-4 h-4" /></div>
              <span className="text-[0.6875rem] font-medium">{s.label}</span>
            </button>
          ); })}
        </div>
      </div>

      {/* Artifacts CTA */}
      <button onClick={onOpenArtifacts} className="w-full flex items-center gap-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-100/60 dark:border-teal-800/30 rounded-2xl p-5 mb-4 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all group text-left">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0"><Layout className="w-5 h-5 text-teal-600 dark:text-teal-400" /></div>
        <div className="flex-1"><p className="text-[0.875rem] font-semibold text-teal-900 dark:text-teal-300">Генерировать артефакты</p>
          <p className="text-[0.75rem] text-teal-600/60 dark:text-teal-400/60">Lean Canvas, RICE, CJM, Impact Map — заполненные под ваш кейс</p></div>
        <ArrowRight className="w-4 h-4 text-teal-300 group-hover:text-teal-500 transition-all shrink-0" />
      </button>

      {/* Unfinished related lessons */}
      {unfinishedRelated.length > 0 && onSelectLesson && (
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/40 dark:border-amber-800/20 rounded-2xl p-5 mb-4">
          <h3 className="text-[0.8125rem] font-semibold mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <BookOpen className="w-4 h-4 text-amber-500" /> Рекомендуем пройти
          </h3>
          <p className="text-[0.6875rem] text-amber-600/60 dark:text-amber-400/60 mb-3">Эти уроки напрямую связаны с фреймворками из вашего разбора</p>
          <div className="space-y-1.5">
            {unfinishedRelated.map(l => (
              <button key={l.lessonId} onClick={() => onSelectLesson(l.lessonId)} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white/60 dark:bg-slate-800/40 rounded-xl text-left hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                <div className="w-5 h-5 rounded-full border-2 border-amber-300 dark:border-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] font-medium truncate">{l.lessonTitle}</p>
                  <p className="text-[0.625rem] text-muted-foreground/40 truncate">{l.moduleTitle}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground/20 group-hover:text-amber-500 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <Section icon={FileText} title="Ситуация" color="slate"><p className="text-[0.875rem] text-foreground/80 leading-relaxed">{a.situation}</p></Section>
      <Section icon={Lightbulb} title="Ключевые инсайты" color="amber">
        <div className="space-y-2">{a.keyInsights.map((ins: string, i: number) => <div key={i} className="flex items-start gap-2.5"><div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[0.625rem] font-bold text-amber-600 dark:text-amber-400">{i+1}</span></div><p className="text-[0.875rem] text-foreground/80 leading-relaxed">{ins}</p></div>)}</div>
      </Section>
      <Section icon={Target} title="Фреймворки" color="teal">
        <div className="space-y-3">{a.frameworks.map((fw: any, i: number) => <div key={i} className="bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100/40 dark:border-teal-800/20 rounded-xl p-4"><p className="text-[0.8125rem] font-semibold text-teal-700 dark:text-teal-400 mb-1">{fw.name}</p><p className="text-[0.8125rem] text-foreground/70 leading-relaxed">{fw.application}</p></div>)}</div>
      </Section>
      <Section icon={CheckCircle2} title="План действий" color="emerald">
        <div className="space-y-2.5">{a.actionPlan.map((step: any) => <div key={step.step} className="flex gap-3 bg-white dark:bg-slate-800 border border-border/40 rounded-xl p-4"><div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><span className="text-[0.6875rem] font-bold text-emerald-600 dark:text-emerald-400">{step.step}</span></div><div className="flex-1 min-w-0"><p className="text-[0.8125rem] font-medium mb-1">{step.action}</p><div className="flex flex-wrap gap-2"><span className="text-[0.6875rem] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md">{step.metric}</span><span className="text-[0.6875rem] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-muted-foreground rounded-md flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{step.timeframe}</span></div></div></div>)}</div>
      </Section>
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-100/40 dark:border-teal-800/20 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-teal-500" /><span className="text-[0.8125rem] font-semibold">North Star Metric</span></div>
        <p className="text-[0.9375rem] font-medium text-teal-700 dark:text-teal-300">{a.northStarMetric}</p>
      </div>
      {a.risks.length > 0 && <Section icon={AlertTriangle} title="Риски" color="red"><div className="space-y-2">{a.risks.map((r: string, i: number) => <div key={i} className="flex items-start gap-2.5"><AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" /><p className="text-[0.875rem] text-foreground/70">{r}</p></div>)}</div></Section>}

      <div className="flex gap-3 mt-8">
        <button onClick={onBackToChat} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-border/40 text-foreground rounded-xl py-3 text-[0.875rem] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><MessageCircle className="w-4 h-4" /> К диалогу</button>
        <button onClick={onNewSession} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl py-3 text-[0.875rem] font-medium hover:from-teal-600 hover:to-emerald-600 transition-all"><Plus className="w-4 h-4" /> Новый разбор</button>
      </div>
    </div>
  );
}

// ===== Artifacts View =====
function ArtifactsView({ session, onGenerate, loading, onBack }: { session: CoachSession; onGenerate: (type: string) => void; loading: boolean; onBack: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const artifacts = session.artifacts || [];

  const copyArtifact = (artifact: any) => {
    const text = JSON.stringify(artifact, null, 2);
    navigator.clipboard.writeText(text).then(() => { setCopied(artifact.type); setTimeout(() => setCopied(null), 2000); }).catch(() => {});
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-tight mb-2">Артефакты</h2>
        <p className="text-[0.875rem] text-muted-foreground">Заполненные шаблоны на основе вашего разбора</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {ARTIFACT_TYPES.map(a => {
          const Icon = a.icon;
          const exists = artifacts.some((art: any) => art.type === a.id);
          return (
            <button key={a.id} onClick={() => onGenerate(a.id)} disabled={loading}
              className={`flex flex-col items-center gap-1.5 px-3 py-3.5 border rounded-xl transition-all ${exists ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700" : "bg-white dark:bg-slate-800 border-border/40 hover:border-teal-200 dark:hover:border-teal-700"} disabled:opacity-50`}>
              <Icon className={`w-5 h-5 ${exists ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/40"}`} />
              <span className="text-[0.75rem] font-medium">{a.label}</span>
              {exists && <CheckCircle2 className="w-3 h-3 text-teal-500" />}
            </button>
          );
        })}
      </div>
      {loading && <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground/50"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-[0.875rem]">Генерирую артефакт...</span></div>}
      {artifacts.map((art: any, i: number) => (
        <div key={i} className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.875rem] font-semibold">{art.title || art.type}</h3>
            <button onClick={() => copyArtifact(art)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.6875rem] text-muted-foreground/50 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
              {copied === art.type ? <><Check className="w-3 h-3 text-teal-500" /> Скопировано</> : <><Copy className="w-3 h-3" /> Копировать</>}
            </button>
          </div>
          {art.type === "lean_canvas" && art.cells && <LeanCanvasRender cells={art.cells} />}
          {art.type === "rice" && art.items && <RICERender items={art.items} />}
          {art.type === "cjm" && art.stages && <CJMRender stages={art.stages} persona={art.persona} />}
          {art.type === "impact_map" && art.actors && <ImpactMapRender goal={art.goal} actors={art.actors} />}
        </div>
      ))}
    </div>
  );
}

function LeanCanvasRender({ cells }: { cells: any }) {
  const Cell = ({ label, content }: { label: string; content: any }) => (
    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
      <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1.5">{label}</p>
      {Array.isArray(content) ? content.map((c: string, i: number) => <p key={i} className="text-[0.75rem] text-foreground/80 leading-relaxed">{"\u2022"} {c}</p>) :
        <p className="text-[0.75rem] text-foreground/80 leading-relaxed">{content}</p>}
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <Cell label="Проблема" content={cells.problem} />
      <Cell label="Решение" content={cells.solution} />
      <Cell label="UVP" content={cells.uniqueValueProposition} />
      <Cell label="Сегменты" content={cells.customerSegments} />
      <Cell label="Каналы" content={cells.channels} />
      <Cell label="Метрики" content={cells.keyMetrics} />
      <Cell label="Доходы" content={cells.revenueStreams} />
      <Cell label="Расходы" content={cells.costStructure} />
      <Cell label="Нечестное преимущество" content={cells.unfairAdvantage} />
    </div>
  );
}

function RICERender({ items }: { items: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.75rem]">
        <thead><tr className="border-b border-border/40">
          <th className="text-left py-2 px-2 font-semibold text-muted-foreground/60">Фича</th>
          <th className="text-center py-2 px-1 font-semibold text-muted-foreground/60">R</th>
          <th className="text-center py-2 px-1 font-semibold text-muted-foreground/60">I</th>
          <th className="text-center py-2 px-1 font-semibold text-muted-foreground/60">C</th>
          <th className="text-center py-2 px-1 font-semibold text-muted-foreground/60">E</th>
          <th className="text-center py-2 px-1 font-semibold text-teal-600 dark:text-teal-400">Score</th>
        </tr></thead>
        <tbody>{items.sort((a, b) => (b.score || 0) - (a.score || 0)).map((item, i) => (
          <tr key={i} className="border-b border-border/20">
            <td className="py-2 px-2 font-medium">{item.feature}</td>
            <td className="text-center py-2 px-1 tabular-nums">{item.reach}</td>
            <td className="text-center py-2 px-1 tabular-nums">{item.impact}</td>
            <td className="text-center py-2 px-1 tabular-nums">{typeof item.confidence === "number" ? `${Math.round(item.confidence * 100)}%` : item.confidence}</td>
            <td className="text-center py-2 px-1 tabular-nums">{item.effort}</td>
            <td className="text-center py-2 px-1 tabular-nums font-bold text-teal-600 dark:text-teal-400">{typeof item.score === "number" ? item.score.toFixed(0) : item.score}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function CJMRender({ stages, persona }: { stages: any[]; persona: string }) {
  const emotionIcon = (e: string) => e === "positive" ? <Smile className="w-4 h-4 text-emerald-500" /> : e === "negative" ? <Frown className="w-4 h-4 text-red-400" /> : <Meh className="w-4 h-4 text-amber-400" />;
  return (
    <div>
      {persona && <p className="text-[0.75rem] text-muted-foreground/60 mb-3 italic">{persona}</p>}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {stages.map((s: any, i: number) => (
          <div key={i} className="min-w-[200px] bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 shrink-0">
            <div className="flex items-center gap-2 mb-2">{emotionIcon(s.emotions)}<p className="text-[0.75rem] font-semibold">{s.name}</p></div>
            {s.actions?.length > 0 && <div className="mb-1.5"><p className="text-[0.5625rem] uppercase tracking-wider text-muted-foreground/40 mb-0.5">Действия</p>{s.actions.map((a: string, j: number) => <p key={j} className="text-[0.6875rem] text-foreground/70">{a}</p>)}</div>}
            {s.painPoints?.length > 0 && <div className="mb-1.5"><p className="text-[0.5625rem] uppercase tracking-wider text-red-400/60 mb-0.5">Боли</p>{s.painPoints.map((p: string, j: number) => <p key={j} className="text-[0.6875rem] text-red-600/60 dark:text-red-400/60">{p}</p>)}</div>}
            {s.opportunities?.length > 0 && <div><p className="text-[0.5625rem] uppercase tracking-wider text-emerald-400/60 mb-0.5">Возможности</p>{s.opportunities.map((o: string, j: number) => <p key={j} className="text-[0.6875rem] text-emerald-600/60 dark:text-emerald-400/60">{o}</p>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactMapRender({ goal, actors }: { goal: string; actors: any[] }) {
  return (
    <div>
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg px-4 py-2.5 mb-3"><p className="text-[0.625rem] uppercase tracking-wider text-teal-500/60 mb-0.5">Цель</p><p className="text-[0.8125rem] font-semibold text-teal-700 dark:text-teal-300">{goal}</p></div>
      <div className="space-y-2">{actors.map((actor: any, i: number) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
          <p className="text-[0.8125rem] font-semibold mb-2">{actor.name}</p>
          <div className="space-y-1.5">{actor.impacts?.map((imp: any, j: number) => (
            <div key={j} className="pl-3 border-l-2 border-teal-300 dark:border-teal-700">
              <p className="text-[0.75rem] font-medium text-teal-700 dark:text-teal-400">{imp.impact}</p>
              <div className="flex flex-wrap gap-1 mt-1">{imp.deliverables?.map((d: string, k: number) => <span key={k} className="text-[0.6875rem] px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-md">{d}</span>)}</div>
            </div>
          ))}</div>
        </div>
      ))}</div>
    </div>
  );
}

function Section({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children: React.ReactNode }) {
  const cc: Record<string, string> = { slate: "text-slate-500", amber: "text-amber-500", teal: "text-teal-500", emerald: "text-emerald-500", red: "text-red-500", cyan: "text-cyan-500" };
  return <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl p-5 mb-4"><h3 className="text-[0.875rem] font-semibold mb-3 flex items-center gap-2"><Icon className={`w-4 h-4 ${cc[color] || "text-foreground"}`} />{title}</h3>{children}</div>;
}

// ===== History View =====
function HistoryView({ sessions, onSelectSession, onDeleteSession, onNewSession }: any) {
  const analyzed = sessions.filter((s: CoachSession) => s.status === "analyzed");
  const active = sessions.filter((s: CoachSession) => s.status === "active");
  return (
    <div>
      <div className="text-center mb-8"><h2 className="text-xl font-bold tracking-tight mb-2">Портфолио</h2><p className="text-[0.875rem] text-muted-foreground">{sessions.length} разборов · {analyzed.length} завершённых</p></div>
      {sessions.length === 0 && <div className="text-center py-12"><Briefcase className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-[0.875rem] text-muted-foreground/50 mb-4">Пока нет разборов</p><button onClick={onNewSession} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-xl text-[0.875rem] font-medium hover:bg-teal-600"><Plus className="w-4 h-4" /> Начать</button></div>}
      {analyzed.length > 0 && <div className="mb-6"><h3 className="text-[0.8125rem] font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Завершённые</h3><div className="space-y-2">{analyzed.map((s: CoachSession) => <SessionCard key={s.id} session={s} onSelect={() => onSelectSession(s)} onDelete={() => onDeleteSession(s.id)} />)}</div></div>}
      {active.length > 0 && <div><h3 className="text-[0.8125rem] font-semibold mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-teal-500" /> В процессе</h3><div className="space-y-2">{active.map((s: CoachSession) => <SessionCard key={s.id} session={s} onSelect={() => onSelectSession(s)} onDelete={() => onDeleteSession(s.id)} />)}</div></div>}
    </div>
  );
}

function SessionCard({ session, onSelect, onDelete }: { session: CoachSession; onSelect: () => void; onDelete: () => void }) {
  const dateStr = new Date(session.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-border/40 rounded-xl hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all group">
      <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5 text-left">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${session.status === "analyzed" ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-teal-50 dark:bg-teal-900/30"}`}>
          {session.status === "analyzed" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <MessageCircle className="w-4 h-4 text-teal-500" />}
        </div>
        <div className="flex-1 min-w-0"><p className="text-[0.8125rem] font-medium truncate">{session.product}</p><p className="text-[0.6875rem] text-muted-foreground/50 truncate">{session.challenge}</p></div>
        <span className="text-[0.625rem] text-muted-foreground/40 shrink-0">{dateStr}</span>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 mr-2 rounded-lg text-muted-foreground/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ===== Widget for WelcomeView =====
export function PMCoachWidget({ onOpenCoach }: { onOpenCoach: () => void }) {
  const sessions = getSessions();
  const analyzedCount = sessions.filter(s => s.status === "analyzed").length;
  return (
    <button onClick={onOpenCoach} className="w-full flex items-center gap-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-100/60 dark:border-teal-800/30 rounded-2xl p-5 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all group text-left">
      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" /></div>
      <div className="flex-1 min-w-0"><p className="text-[0.875rem] font-semibold text-teal-900 dark:text-teal-300">PM-Коуч</p>
        <p className="text-[0.75rem] text-teal-600/60 dark:text-teal-400/60">{analyzedCount > 0 ? `${analyzedCount} разборов + стейкхолдер-симуляция + артефакты` : "Разбор кейса + защита перед стейкхолдерами + артефакты"}</p></div>
      <ArrowRight className="w-4 h-4 text-teal-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
