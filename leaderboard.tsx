import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import {
  Trophy, Medal, Crown, Star, ChevronRight, RefreshCw,
  Zap, Target, GraduationCap, Flame, X, TrendingUp
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface LeaderboardEntry {
  sessionId: string;
  nickname: string;
  xp: number;
  lessonsCompleted: number;
  examScore: number | null;
  streak: number;
  updatedAt: string;
}

function getSessionId(): string {
  let id = localStorage.getItem("exam-session-id");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("exam-session-id", id);
  }
  return id;
}

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number>(-1);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"xp" | "lessons" | "exam">("xp");
  const sessionId = getSessionId();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lbRes, rankRes] = await Promise.all([
        fetch(`${API_BASE}/leaderboard`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`${API_BASE}/leaderboard/rank/${sessionId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      if (lbRes.ok) {
        const data = await lbRes.json();
        setEntries(data.entries || []);
      }
      if (rankRes.ok) {
        const data = await rankRes.json();
        setMyRank(data.rank);
        setMyEntry(data.entry);
      }
    } catch (err) {
      console.log("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedEntries = [...entries].sort((a, b) => {
    if (sortBy === "xp") return b.xp - a.xp;
    if (sortBy === "lessons") return b.lessonsCompleted - a.lessonsCompleted;
    return (b.examScore || 0) - (a.examScore || 0);
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-[0.75rem] font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="flex-1 min-h-screen max-h-screen bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Рейтинг студентов</h1>
              <p className="text-[0.75rem] text-muted-foreground">Топ-50 по очкам опыта</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* My rank card */}
        {myEntry && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100"
          >
            <p className="text-[0.6875rem] text-teal-600 font-semibold uppercase tracking-wider mb-2">Ваша позиция</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-[0.875rem]">
                  {myRank > 0 ? `#${myRank}` : "—"}
                </div>
                <div>
                  <p className="text-[0.875rem] font-semibold">{myEntry.nickname}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">Это вы</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[0.75rem]">
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold">{myEntry.xp} 🌰</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-teal-500" />
                  <span>{myEntry.lessonsCompleted} уроков</span>
                </div>
                {myEntry.examScore !== null && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-violet-500" />
                    <span>{myEntry.examScore}%</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Sort tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-4">
          {([
            { key: "xp", label: "По 🌰", icon: Zap },
            { key: "lessons", label: "По урокам", icon: Target },
            { key: "exam", label: "По экзамену", icon: GraduationCap },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.75rem] font-medium transition-all ${
                sortBy === key
                  ? "bg-white dark:bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Leaderboard list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-[0.875rem]">
              Пока нет данных в рейтинге.
            </p>
            <p className="text-muted-foreground/60 text-[0.75rem] mt-1">
              Продолжайте обучение — ваши результаты появятся здесь автоматически.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {sortedEntries.map((entry, i) => {
                const isMe = entry.sessionId === sessionId;
                const rank = i + 1;
                return (
                  <motion.div
                    key={entry.sessionId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isMe
                        ? "bg-teal-50/60 border border-teal-100"
                        : rank <= 3
                        ? "bg-amber-50/30 border border-amber-50"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="w-6 flex justify-center shrink-0">
                      {getRankIcon(rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[0.8125rem] font-medium truncate ${isMe ? "text-teal-700" : ""}`}>
                        {entry.nickname}
                        {isMe && <span className="ml-1.5 text-[0.625rem] text-teal-500 font-normal">(вы)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-[0.75rem] text-muted-foreground">
                      <div className="flex items-center gap-1 min-w-[60px] justify-end">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="tabular-nums font-medium">{entry.xp}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-[50px] justify-end">
                        <Target className="w-3 h-3 text-teal-500" />
                        <span className="tabular-nums">{entry.lessonsCompleted}</span>
                      </div>
                      {entry.streak > 0 && (
                        <div className="flex items-center gap-1 min-w-[30px] justify-end">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span className="tabular-nums">{entry.streak}</span>
                        </div>
                      )}
                      {entry.examScore !== null && (
                        <div className="flex items-center gap-1 min-w-[40px] justify-end">
                          <Star className="w-3 h-3 text-violet-500" />
                          <span className="tabular-nums">{entry.examScore}%</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Footer stats */}
        {!loading && sortedEntries.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-[0.75rem] font-semibold text-muted-foreground">Статистика</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{sortedEntries.length}</p>
                <p className="text-[0.625rem] text-muted-foreground">Участников</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {Math.round(sortedEntries.reduce((a, e) => a + e.xp, 0) / sortedEntries.length)}
                </p>
                <p className="text-[0.625rem] text-muted-foreground">Среднее 🌰</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {Math.round(sortedEntries.reduce((a, e) => a + e.lessonsCompleted, 0) / sortedEntries.length)}
                </p>
                <p className="text-[0.625rem] text-muted-foreground">Среднее уроков</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}