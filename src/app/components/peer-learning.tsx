import { useState, useEffect, useCallback, useRef } from "react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { getUserName } from "./user-name";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Heart, Send, Lightbulb, HelpCircle,
  ChevronDown, ChevronUp, User, Sparkles, Users
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

function getSessionId(): string {
  let id = localStorage.getItem("exam-session-id");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("exam-session-id", id);
  }
  return id;
}

interface Comment {
  id: string;
  sessionId: string;
  lessonId: string;
  text: string;
  userName: string;
  type: "comment" | "insight" | "question";
  likes: number;
  likedBy: string[];
  createdAt: string;
}

// ===== Social Proof Badge (shows quiz stats) =====
export function QuizSocialProof({ lessonId, correctCount, totalQuestions }: { lessonId: string; correctCount: number; totalQuestions: number }) {
  const [stats, setStats] = useState<{ attempts: number; correctRate: number } | null>(null);
  const hasSaved = useRef(false);

  // Save quiz stats when user completes quiz
  useEffect(() => {
    if (correctCount > 0 && !hasSaved.current) {
      hasSaved.current = true;
      const rate = Math.round((correctCount / totalQuestions) * 100);
      fetch(`${API_BASE}/quiz-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ lessonId, correctRate: rate }),
      }).catch(() => {});
    }
  }, [correctCount, totalQuestions, lessonId]);

  // Load stats
  useEffect(() => {
    fetch(`${API_BASE}/quiz-stats/${lessonId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.stats && data.stats.attempts > 0) {
          setStats(data.stats);
        }
      })
      .catch(() => {});
  }, [lessonId]);

  if (!stats || stats.attempts < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50/60 border border-teal-100/40 mt-3 dark:bg-teal-900/20 dark:border-teal-800/30"
    >
      <Users className="w-3.5 h-3.5 text-teal-500 shrink-0" />
      <span className="text-[0.75rem] text-teal-700 dark:text-teal-400">
        <strong className="font-semibold">{stats.correctRate}%</strong> студентов ответили правильно
        <span className="text-teal-500/50 dark:text-teal-500/40"> · {stats.attempts} попыток</span>
      </span>
    </motion.div>
  );
}

// ===== Lesson Discussion Component (shared chat) =====
export function LessonDiscussion({ lessonId }: { lessonId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<"comment" | "insight" | "question">("comment");
  const [submitting, setSubmitting] = useState(false);
  const [newCount, setNewCount] = useState(0); // unseen messages from others
  const sessionId = getSessionId();
  const userName = getUserName();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);
  const isAtBottomRef = useRef(true);

  // Scroll to bottom of the chat container only (never scrolls the page)
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Detect if user is scrolled near bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 80;
    if (isAtBottomRef.current) setNewCount(0);
  }, []);

  // Fetch comments (used for initial load and polling)
  const fetchComments = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`${API_BASE}/comments/${lessonId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (!data.comments) return;
      setComments(prev => {
        const incoming: Comment[] = data.comments;
        if (isInitial) {
          lastCountRef.current = incoming.length;
          return incoming;
        }
        const added = incoming.length - lastCountRef.current;
        if (added > 0) {
          // Count only messages from others as "new"
          const othersNew = incoming.slice(lastCountRef.current).filter(c => c.sessionId !== sessionId).length;
          if (!isAtBottomRef.current && othersNew > 0) {
            setNewCount(n => n + othersNew);
          }
          lastCountRef.current = incoming.length;
          // Auto-scroll if near bottom
          if (isAtBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 80);
          }
        }
        return incoming;
      });
    } catch (err) {
      console.log("Error loading comments:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [lessonId, sessionId, scrollToBottom]);

  // Initial load + polling every 8s
  useEffect(() => {
    setLoading(true);
    setComments([]);
    setNewCount(0);
    lastCountRef.current = 0;
    isAtBottomRef.current = true;
    fetchComments(true).then(() => setTimeout(() => scrollToBottom(false), 100));
    const iv = setInterval(() => fetchComments(false), 8000);
    return () => clearInterval(iv);
  }, [lessonId, fetchComments, scrollToBottom]);

  // Submit comment
  const handleSubmit = useCallback(async () => {
    if (!newText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ sessionId, lessonId, text: newText, userName, type: newType }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments(prev => {
          lastCountRef.current = prev.length + 1;
          return [...prev, data.comment];
        });
        setNewText("");
        setNewCount(0);
        isAtBottomRef.current = true;
        setTimeout(() => scrollToBottom(true), 80);
        try {
          const count = Number(localStorage.getItem("user-comments-count") || "0");
          localStorage.setItem("user-comments-count", String(count + 1));
        } catch {}
      }
    } catch (err) {
      console.log("Error posting comment:", err);
    } finally {
      setSubmitting(false);
    }
  }, [newText, newType, lessonId, sessionId, userName, submitting, scrollToBottom]);

  // Like/unlike
  const handleLike = useCallback(async (commentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/comments/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ lessonId, commentId, sessionId }),
      });
      const data = await res.json();
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, likes: data.likes, likedBy: data.liked ? [...(c.likedBy || []), sessionId] : (c.likedBy || []).filter(id => id !== sessionId) }
          : c
      ));
    } catch (err) {
      console.log("Error liking comment:", err);
    }
  }, [lessonId, sessionId]);

  const typeConfig = {
    comment: { icon: MessageCircle, label: "Комментарий", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100/60 dark:bg-slate-700/30" },
    insight: { icon: Lightbulb, label: "Инсайт", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
    question: { icon: HelpCircle, label: "Вопрос", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50/60 dark:bg-teal-900/20" },
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}д`;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden mb-6 flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <MessageCircle className="w-4 h-4 text-teal-500" />
          <span className="text-[0.875rem] font-semibold">Обсуждение</span>
          {comments.length > 0 && (
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[0.6875rem] font-bold tabular-nums dark:bg-teal-900/30 dark:text-teal-400">
              {comments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground/40">
          <Users className="w-3 h-3" />
          <span>Чат для всех студентов</span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto px-4 py-3 space-y-2 min-h-[160px] max-h-[380px]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/40">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <MessageCircle className="w-4 h-4" />
              </motion.span>
              Загрузка...
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-8 h-8 text-muted-foreground/10 mx-auto mb-2" />
            <p className="text-[0.8125rem] text-muted-foreground/40">Пока нет сообщений</p>
            <p className="text-[0.6875rem] text-muted-foreground/25 mt-1">Будьте первым! Поделитесь инсайтом или задайте вопрос</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => {
              const cfg = typeConfig[comment.type] || typeConfig.comment;
              const Icon = cfg.icon;
              const isOwn = comment.sessionId === sessionId;
              const isLiked = (comment.likedBy || []).includes(sessionId);
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[0.625rem] font-bold ${
                    isOwn
                      ? "bg-teal-500 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {(comment.userName || "А")[0].toUpperCase()}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[78%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {/* Name + type + time */}
                    <div className={`flex items-center gap-1.5 px-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="text-[0.6875rem] font-semibold text-foreground/70">{isOwn ? "Вы" : comment.userName}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[0.5625rem] ${cfg.color} font-medium`}>
                        <Icon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </span>
                      <span className="text-[0.5625rem] text-muted-foreground/30">{formatTime(comment.createdAt)}</span>
                    </div>

                    {/* Message bubble */}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[0.8125rem] leading-relaxed ${
                      isOwn
                        ? "bg-teal-500 text-white rounded-tr-sm"
                        : comment.type === "insight"
                        ? "bg-amber-50 border border-amber-100/60 text-foreground/90 rounded-tl-sm dark:bg-amber-900/20 dark:border-amber-700/30"
                        : comment.type === "question"
                        ? "bg-teal-50/60 border border-teal-100/50 text-foreground/90 rounded-tl-sm dark:bg-teal-900/15 dark:border-teal-700/30"
                        : "bg-muted/50 border border-border/30 text-foreground/90 rounded-tl-sm dark:bg-slate-800/60"
                    }`}>
                      {comment.text}
                    </div>

                    {/* Like button */}
                    <button
                      onClick={() => handleLike(comment.id)}
                      className={`flex items-center gap-1 px-1 text-[0.625rem] transition-all mt-0.5 ${
                        isLiked ? "text-pink-500 font-medium" : "text-muted-foreground/30 hover:text-pink-400"
                      }`}
                    >
                      <Heart className={`w-2.5 h-2.5 ${isLiked ? "fill-current" : ""}`} />
                      {comment.likes > 0 && <span className="tabular-nums">{comment.likes}</span>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* New messages badge */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-1"
          >
            <button
              onClick={() => { setNewCount(0); isAtBottomRef.current = true; scrollToBottom(true); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-200/40 text-[0.75rem] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              {newCount} новых сообщений ↓
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border/20 bg-muted/5 shrink-0">
        {/* Type chips */}
        <div className="flex items-center gap-1.5 mb-2">
          {(["comment", "insight", "question"] as const).map(t => {
            const cfg = typeConfig[t];
            const Icon = cfg.icon;
            return (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[0.625rem] font-medium transition-all ${
                  newType === t
                    ? `${cfg.bg} ${cfg.color} ring-1 ring-current/20`
                    : "text-muted-foreground/50 hover:bg-muted/50"
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                {cfg.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-[0.5rem] font-bold text-white">
              {(userName || "А")[0].toUpperCase()}
            </div>
            <span className="text-[0.625rem] text-muted-foreground/50">{userName}</span>
          </div>
        </div>

        {/* Textarea + send */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={
              newType === "insight" ? "Поделитесь инсайтом из урока..."
              : newType === "question" ? "Задайте вопрос по уроку..."
              : "Написать в чат..."
            }
            rows={1}
            className="flex-1 px-3.5 py-2.5 bg-card border border-border/40 rounded-xl text-[0.8125rem] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-300 dark:focus:border-teal-700 placeholder:text-muted-foreground/30 transition-all min-h-[40px] max-h-[100px]"
            maxLength={1000}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 100) + "px";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!newText.trim() || submitting}
            className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            title="Отправить (Enter)"
          >
            {submitting ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                <Sparkles className="w-4 h-4" />
              </motion.span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[0.5625rem] text-muted-foreground/25 mt-1.5 text-right">Enter — отправить · Shift+Enter — перенос</p>
      </div>
    </div>
  );
}