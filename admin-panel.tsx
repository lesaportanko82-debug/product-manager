import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Lock, Loader2, Users, ShieldCheck, ShieldOff, Search, RefreshCw,
  AlertCircle, CheckCircle2, Calendar, BookOpen, Trophy, UserCheck, UserX,
  KeyRound, Crown, Clock, ChevronDown, ChevronUp, Eye, EyeOff, Trash2,
  Mail, MessageCircle, TrendingUp, LayoutDashboard, Settings, LogOut,
  Package, ChevronRight, CheckSquare, Square, MoreVertical,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
const ADMIN_PASSWORD = "rediska";

// 38 modules list (реструктурированный курс по 11 блокам)
const MODULES = [
  // БЛОК 1: Основы (1-4)
  "Потребность клиента первична", "Количественные исследования", "Начало работы над продуктом", "Основы метрик продукта",
  // БЛОК 2: JTBD (5-7)
  "Введение в JTBD", "JTBD: практика", "Интервью JTBD",
  // БЛОК 3: Исследования (8-11)
  "Customer Discovery", "Глубинные интервью", "Пользовательские персоны", "Customer Journey Map",
  // БЛОК 4: Валидация PMF (12-13)
  "Прототипирование", "Тестирование гипотез",
  // БЛОК 5: Аналитика (14-17)
  "Продуктовые метрики", "Retention и когорты", "A/B тестирование", "Аналитика данных",
  // БЛОК 6: Стратегия (18-22)
  "Product Vision", "Product Strategy", "Roadmap и приоритизация", "Конкурентный анализ", "Product Positioning",
  // БЛОК 7: Экономика (23-24)
  "Unit Economics", "Монетизация",
  // БЛОК 8: Дизайн и исполнение (25-29)
  "UX для PM", "Написание требований", "Agile & Scrum", "Работа с дизайнерами", "Работа с разработчиками",
  // БЛОК 9: Рост (30-33)
  "Growth Framework", "Retention стратегии", "Acquisition каналы", "Viral loops",
  // БЛОК 10: Коммуникация (34-35)
  "Работа со стейкхолдерами", "Презентация продукта",
  // БЛОК 11: Капстон (36-38)
  "Go-to-Market стратегия", "Карьера в PM", "Капстоун-проект",
];

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  isBlocked: boolean;
  completedLessons: number;
  examScore: number | null;
  accessLevel: "free" | "monthly" | "lifetime";
  accessExpiresAt: string | null;
  accessGrantedAt: string | null;
}

type Tab = "users" | "stats" | "settings";
type UserSection = "access" | "credentials" | "modules";

const fmt = (iso: string | null, time = false) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const accessBadge = (level: string) => {
  if (level === "lifetime") return { cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-700/50", label: "♾ Вечный" };
  if (level === "monthly") return { cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700/50", label: "📅 Месяц" };
  return { cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600", label: "Free" };
};

function useToast() {
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const notify = (text: string, ok = true) => { setToast({ text, ok }); setTimeout(() => setToast(null), 3500); };
  return { toast, notify };
}

/* ═══════════════════════════════════════════
   AUTH SCREEN
═══════════════════════════════════════════ */
function AuthScreen({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [pw, setPw] = useState(""); const [show, setShow] = useState(false); const [err, setErr] = useState("");
  const submit = () => pw === ADMIN_PASSWORD ? onSuccess() : setErr("Неверный пароль");
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
        <div className="px-8 py-8">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/25 mb-4">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Администратор</h2>
            <p className="text-sm text-muted-foreground mt-1">Введите пароль для доступа</p>
          </div>
          <div className="relative mb-3">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input type={show ? "text" : "password"} placeholder="Пароль" value={pw} autoFocus
              onChange={e => { setPw(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-muted/40 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all"
            />
            <button onClick={() => setShow(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{err}</p>}
          <button onClick={submit}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-sm
              hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md shadow-teal-500/20">
            Войти
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   USER ROW (expanded card)
═══════════════════════════════════════════ */
function UserCard({
  user, onUpdate, onDelete, notify,
}: {
  user: AdminUser;
  onUpdate: (u: Partial<AdminUser> & { id: string }) => void;
  onDelete: (id: string) => void;
  notify: (t: string, ok?: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [section, setSection] = useState<UserSection>("access");
  const [blockLoading, setBlockLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [newPw, setNewPw] = useState(""); const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [blockedMods, setBlockedMods] = useState<number[]>([]);
  const [modsLoaded, setModsLoaded] = useState(false);
  const [modsLoading, setModsLoading] = useState(false);
  const [modsSaving, setModsSaving] = useState(false);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}`, "X-Admin-Password": ADMIN_PASSWORD };

  const toggleBlock = async () => {
    setBlockLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/toggle-access`, { method: "POST", headers, body: JSON.stringify({ blocked: !user.isBlocked }) });
      if (!res.ok) { notify((await res.json()).error || "Ошибка", false); return; }
      onUpdate({ id: user.id, isBlocked: !user.isBlocked });
      notify(user.isBlocked ? "Пользователь разблокирован ✓" : "Пользователь заблокирован");
    } catch { notify("Ошибка сети", false); } finally { setBlockLoading(false); }
  };

  const deleteUser = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, { method: "DELETE", headers });
      if (!res.ok) { notify((await res.json()).error || "Ошибка удаления", false); return; }
      onDelete(user.id);
      notify("Пользователь удалён");
    } catch { notify("Ошибка сети", false); } finally { setDeleteLoading(false); setDeleteConfirm(false); }
  };

  const setAccess = async (level: "free" | "monthly" | "lifetime") => {
    setAccessLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/set-access`, { method: "POST", headers, body: JSON.stringify({ level }) });
      if (!res.ok) { notify((await res.json()).error || "Ошибка", false); return; }
      const now = new Date().toISOString();
      const expiresAt = level === "monthly" ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
      onUpdate({ id: user.id, accessLevel: level, accessExpiresAt: expiresAt, accessGrantedAt: now });
      notify(`Доступ изменён: ${level} ✓`);
    } catch { notify("Ошибка сети", false); } finally { setAccessLoading(false); }
  };

  const changeEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) { notify("Введите корректный email", false); return; }
    setEmailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/change-email`, { method: "POST", headers, body: JSON.stringify({ email: newEmail }) });
      if (!res.ok) { notify((await res.json()).error || "Ошибка", false); return; }
      onUpdate({ id: user.id, email: newEmail });
      setNewEmail("");
      notify("Email изменён ✓");
    } catch { notify("Ошибка сети", false); } finally { setEmailLoading(false); }
  };

  const changePw = async () => {
    if (newPw.length < 6) { notify("Минимум 6 символов", false); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/change-password`, { method: "POST", headers, body: JSON.stringify({ password: newPw }) });
      if (!res.ok) { notify((await res.json()).error || "Ошибка", false); return; }
      setNewPw("");
      notify("Пароль изменён ✓");
    } catch { notify("Ошибка сети", false); } finally { setPwLoading(false); }
  };

  const loadMods = async () => {
    if (modsLoaded) return;
    setModsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/modules`, { headers });
      if (res.ok) { const d = await res.json(); setBlockedMods(d.blockedModules || []); }
      setModsLoaded(true);
    } catch {} finally { setModsLoading(false); }
  };

  const saveMods = async () => {
    setModsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/modules`, { method: "POST", headers, body: JSON.stringify({ blockedModules: blockedMods }) });
      if (!res.ok) { notify((await res.json()).error || "Ошибка", false); return; }
      notify("Доступ к модулям сохранён ✓");
    } catch { notify("Ошибка сети", false); } finally { setModsSaving(false); }
  };

  const toggleMod = (idx: number) => {
    setBlockedMods(prev => prev.includes(idx) ? prev.filter(m => m !== idx) : [...prev, idx]);
  };

  const badge = accessBadge(user.accessLevel);

  return (
    <div className={`rounded-xl border transition-all ${user.isBlocked ? "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10" : "border-border bg-card hover:border-border/80 hover:shadow-sm"}`}>
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm ${
          user.isBlocked ? "bg-red-400 dark:bg-red-600" :
          user.accessLevel === "lifetime" ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" :
          user.accessLevel === "monthly" ? "bg-gradient-to-br from-teal-500 to-emerald-500" :
          "bg-gradient-to-br from-slate-400 to-slate-500"
        }`}>
          {(user.name || user.email || "?")[0].toUpperCase()}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm truncate">{user.name || "-"}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-semibold border ${badge.cls}`}>{badge.label}</span>
            {user.isBlocked && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/50">Заблокирован</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3" />{user.completedLessons} ур.</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt(user.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a href="https://t.me/ohh_lessya" target="_blank" rel="noreferrer" title="Связаться"
            className="p-2 rounded-lg text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
            <MessageCircle className="w-4 h-4" />
          </a>
          <button onClick={() => { setExpanded(v => !v); if (!expanded && section === "modules") loadMods(); }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Inline delete with confirm */}
          <AnimatePresence mode="wait">
            {deleteConfirm ? (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1">
                <button onClick={deleteUser} disabled={deleteLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-50 transition-colors">
                  {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Удалить
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.button key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirm(true)}
                title="Удалить пользователя"
                className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <button onClick={toggleBlock} disabled={blockLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
              user.isBlocked
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/50 hover:bg-red-100"
            }`}>
            {blockLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : user.isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
            {user.isBlocked ? "Разблок." : "Блок."}
          </button>
        </div>
      </div>

      {/* ── Expanded ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/60">
            <div className="px-4 py-4">
              {/* Section tabs */}
              <div className="flex items-center gap-1 mb-4 bg-muted/60 dark:bg-slate-700/40 rounded-xl p-1 w-fit">
                {([
                  { key: "access" as UserSection, label: "Доступ", icon: <Crown className="w-3.5 h-3.5" /> },
                  { key: "credentials" as UserSection, label: "Учётные данные", icon: <KeyRound className="w-3.5 h-3.5" /> },
                  { key: "modules" as UserSection, label: "Модули", icon: <Package className="w-3.5 h-3.5" /> },
                ]).map(s => (
                  <button key={s.key} onClick={() => { setSection(s.key); if (s.key === "modules") loadMods(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      section === s.key
                        ? "bg-card shadow-sm text-foreground border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {s.icon}{s.label}
                  </button>
                ))}
              </div>

              {/* ─ ACCESS ─ */}
              {section === "access" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Текущий уровень: <span className="font-semibold text-foreground">{badge.label}</span>
                    {user.accessGrantedAt && <span className="ml-2">· выдан {fmt(user.accessGrantedAt)}</span>}
                    {user.accessExpiresAt && <span className="ml-1">· до {fmt(user.accessExpiresAt)}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { level: "free" as const, label: "Free", sub: "2 модуля", cls: "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" },
                      { level: "monthly" as const, label: "Месяц ($70)", sub: "30 дней", cls: "border-teal-200 dark:border-teal-700/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-300" },
                      { level: "lifetime" as const, label: "Вечный ($90)", sub: "навсегда", cls: "border-violet-200 dark:border-violet-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-700 dark:text-violet-300" },
                    ]).map(opt => (
                      <button key={opt.level} onClick={() => setAccess(opt.level)} disabled={accessLoading || user.accessLevel === opt.level}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-60 bg-card ${opt.cls} ${user.accessLevel === opt.level ? "ring-2 ring-offset-1 ring-teal-400/50" : ""}`}>
                        {accessLoading && user.accessLevel !== opt.level ? <Loader2 className="w-3 h-3 animate-spin" /> : user.accessLevel === opt.level ? <CheckCircle2 className="w-3 h-3 text-teal-500" /> : null}
                        {opt.label} <span className="opacity-50">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ CREDENTIALS ─ */}
              {section === "credentials" && (
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <Mail className="w-3.5 h-3.5" /> Новый Email
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">Текущий: <span className="font-mono text-foreground">{user.email}</span></p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                        <input type="email" placeholder="новый@email.com" value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && changeEmail()}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all"
                        />
                      </div>
                      <button onClick={changeEmail} disabled={emailLoading || !newEmail}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                        {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Сохранить
                      </button>
                    </div>
                  </div>
                  {/* Password */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <KeyRound className="w-3.5 h-3.5" /> Новый пароль
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                        <input type={showNewPw ? "text" : "password"} placeholder="Минимум 6 символов" value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && changePw()}
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all"
                        />
                        <button onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                          {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button onClick={changePw} disabled={pwLoading || newPw.length < 6}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                        {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─ MODULES ─ */}
              {section === "modules" && (
                <div>
                  {modsLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          Отмеченные модули будут <span className="text-red-500 font-semibold">заблокированы</span> для пользователя
                          {user.accessLevel !== "free" && <span className="ml-1 text-teal-600">(несмотря на платный доступ)</span>}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => setBlockedMods(MODULES.map((_, i) => i))}
                            className="text-[0.7rem] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            Все заблок.
                          </button>
                          <button onClick={() => setBlockedMods([])}
                            className="text-[0.7rem] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            Все открыть
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
                        {MODULES.map((mod, idx) => {
                          const isBlocked = blockedMods.includes(idx);
                          return (
                            <button key={idx} onClick={() => toggleMod(idx)}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs text-left transition-all ${
                                isBlocked
                                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                                  : "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                              }`}>
                              {isBlocked ? <Square className="w-3.5 h-3.5 shrink-0" /> : <CheckSquare className="w-3.5 h-3.5 shrink-0" />}
                              <span className="truncate">{idx + 1}. {mod}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={saveMods} disabled={modsSaving}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                        {modsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Сохранить настройки модулей
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PANEL
══════════════════════════════════════════ */
export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [isAuth, setIsAuth] = useState(false);
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filterAccess, setFilterAccess] = useState<"all" | "free" | "monthly" | "lifetime">("all");
  const { toast, notify } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${publicAnonKey}`, "X-Admin-Password": ADMIN_PASSWORD },
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Ошибка загрузки"); return; }
      setUsers(data.users || []);
    } catch (e) { setErr(`Ошибка сети: ${e}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuth) loadUsers(); }, [isAuth, loadUsers]);

  const updateUser = useCallback((patch: Partial<AdminUser> & { id: string }) => {
    setUsers(prev => prev.map(u => u.id === patch.id ? { ...u, ...patch } : u));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q);
    const matchA = filterAccess === "all" || u.accessLevel === filterAccess;
    return matchQ && matchA;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => !u.isBlocked).length,
    blocked: users.filter(u => u.isBlocked).length,
    studying: users.filter(u => u.completedLessons > 0).length,
    paid: users.filter(u => u.accessLevel !== "free").length,
  };

  if (!isAuth) return <AuthScreen onSuccess={() => setIsAuth(true)} onClose={onClose} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[92vh] flex rounded-2xl overflow-hidden shadow-2xl bg-background border border-border"
      >
        {/* ── SIDEBAR ── */}
        <div className="w-56 shrink-0 flex flex-col bg-card border-r border-border">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-none">Админ</p>
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">Панель управления</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {([
              { key: "users" as Tab, label: "Пользователи", icon: <Users className="w-4 h-4" />, badge: users.length },
              { key: "stats" as Tab, label: "Статистика", icon: <TrendingUp className="w-4 h-4" /> },
              { key: "settings" as Tab, label: "Настройки", icon: <Settings className="w-4 h-4" /> },
            ] as const).map(item => (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === item.key
                    ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-700/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}>
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {"badge" in item && item.badge > 0 && (
                  <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-3 py-4 border-t border-border space-y-1">
            <a href="https://t.me/ohh_lessya" target="_blank" rel="noreferrer"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
              <MessageCircle className="w-4 h-4" /> @ohh_lessya
            </a>
            <button onClick={onClose}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <LogOut className="w-4 h-4" /> Выйти
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-foreground">
                {tab === "users" ? "Пользователи" : tab === "stats" ? "Статистика" : "Настройки"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">product-intensive.com</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
                  toast.ok ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400"
                           : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400"
                }`}>
                {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─ USERS TAB ─ */}
          {tab === "users" && (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-5 gap-3 px-6 py-4 border-b border-border shrink-0">
                {[
                  { label: "Всего", value: stats.total, icon: <Users className="w-3.5 h-3.5" />, color: "text-slate-500" },
                  { label: "Активных", value: stats.active, icon: <UserCheck className="w-3.5 h-3.5" />, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Заблокировано", value: stats.blocked, icon: <UserX className="w-3.5 h-3.5" />, color: "text-red-500" },
                  { label: "Учатся", value: stats.studying, icon: <BookOpen className="w-3.5 h-3.5" />, color: "text-blue-500" },
                  { label: "Платных", value: stats.paid, icon: <Crown className="w-3.5 h-3.5" />, color: "text-violet-500" },
                ].map(s => (
                  <div key={s.label} className="bg-card rounded-xl px-3.5 py-3 border border-border">
                    <div className={`flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide mb-1 ${s.color}`}>{s.icon}{s.label}</div>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="text" placeholder="Поиск по email или имени..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60
                      focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(["all", "free", "monthly", "lifetime"] as const).map(f => (
                    <button key={f} onClick={() => setFilterAccess(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        filterAccess === f
                          ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700/50 text-teal-700 dark:text-teal-300"
                          : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}>
                      {f === "all" ? "Все" : f === "free" ? "Free" : f === "monthly" ? "Месяц" : "Вечные"}
                    </button>
                  ))}
                </div>
                <button onClick={loadUsers} disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition-all disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Обновить
                </button>
              </div>

              {/* Error */}
              {err && (
                <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{err}
                </div>
              )}

              {/* Users list */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Users className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">{search ? "Никого не найдено" : "Нет пользователей"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(user => (
                      <UserCard key={user.id} user={user} onUpdate={updateUser} onDelete={deleteUser} notify={notify} />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer count */}
              <div className="px-6 py-2.5 border-t border-border shrink-0">
                <p className="text-xs text-muted-foreground">{filtered.length} из {users.length} пользователей</p>
              </div>
            </>
          )}

          {/* ─ STATS TAB ─ */}
          {tab === "stats" && (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Всего пользователей", value: stats.total, icon: <Users className="w-5 h-5" />, color: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" },
                  { label: "Платных пользователей", value: stats.paid, icon: <Crown className="w-5 h-5" />, color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300" },
                  { label: "Активно учатся", value: stats.studying, icon: <BookOpen className="w-5 h-5" />, color: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300" },
                  { label: "Заблокировано", value: stats.blocked, icon: <ShieldOff className="w-5 h-5" />, color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" },
                ].map(s => (
                  <div key={s.label} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4">Распределение по уровням доступа</h3>
                <div className="space-y-3">
                  {([
                    { label: "Free", count: users.filter(u => u.accessLevel === "free").length, color: "bg-slate-400" },
                    { label: "Месяц ($70)", count: users.filter(u => u.accessLevel === "monthly").length, color: "bg-teal-500" },
                    { label: "Вечный ($90)", count: users.filter(u => u.accessLevel === "lifetime").length, color: "bg-violet-500" },
                  ]).map(row => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold text-foreground">{row.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: users.length ? `${(row.count / users.length) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─ SETTINGS TAB ─ */}
          {tab === "settings" && (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="bg-card rounded-2xl border border-border p-5 mb-4">
                <h3 className="font-semibold text-foreground mb-1">Контакт администратора</h3>
                <p className="text-sm text-muted-foreground mb-3">Telegram для поддержки пользователей</p>
                <a href="https://t.me/ohh_lessya" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 transition-colors">
                  <MessageCircle className="w-4 h-4" /> @ohh_lessya
                </a>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-1">Монетизация</h3>
                <p className="text-sm text-muted-foreground mb-3">Тарифные планы платформы</p>
                <div className="space-y-2">
                  {[
                    { label: "Free", desc: "Первые 2 модуля бесплатно (модуль 1 + аналитика)", color: "text-slate-500" },
                    { label: "Месяц - $70", desc: "Доступ ко всем 38 модулям на 30 дней", color: "text-teal-600 dark:text-teal-400" },
                    { label: "Вечный - $90", desc: "Полный доступ к 38 модулям навсегда", color: "text-violet-600 dark:text-violet-400" },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                      <div className={`font-semibold text-sm ${t.color} w-32 shrink-0`}>{t.label}</div>
                      <div className="text-sm text-muted-foreground">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}