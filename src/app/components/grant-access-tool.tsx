/**
 * GrantAccessTool — выдача и диагностика доступа по email (только для AdminPanel)
 */
import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, KeyRound, Search, RefreshCw } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface Props {
  adminPassword: string;
}

type DiagResult = {
  email: string;
  userId?: string;
  authUser: null | {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
  };
  kvRecord: null | Record<string, unknown>;
  pgRecord: null | Record<string, unknown>;
  pgRecordById: null | Record<string, unknown>;
  pgError: string | null;
  diagnosis: string[];
  error?: string;
};

export function GrantAccessTool({ adminPassword }: Props) {
  const [email, setEmail]         = useState("maria.1m257@gmail.com");
  const [level, setLevel]         = useState<"lifetime" | "monthly">("lifetime");
  const [grantStatus, setGrant]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [grantMsg, setGrantMsg]   = useState("");
  const [diagStatus, setDiag]     = useState<"idle" | "loading" | "done">("idle");
  const [diagData, setDiagData]   = useState<DiagResult | null>(null);

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${publicAnonKey}`,
    "X-Admin-Password": adminPassword,
  };

  // ── Diagnose ──────────────────────────────────────────────────────────
  const handleDiagnose = async () => {
    setDiag("loading");
    setDiagData(null);
    try {
      const res = await fetch(
        `${API}/admin/diagnose-user?email=${encodeURIComponent(email)}`,
        { headers }
      );
      const data: DiagResult = await res.json();
      setDiagData(data);
    } catch (e: any) {
      setDiagData({ email, authUser: null, kvRecord: null, pgRecord: null, pgRecordById: null, pgError: null, diagnosis: [`Ошибка сети: ${e.message}`] });
    }
    setDiag("done");
  };

  // ── Grant ─────────────────────────────────────────────────────────────
  const handleGrant = async () => {
    setGrant("loading");
    setGrantMsg("");
    try {
      const res = await fetch(`${API}/admin/grant-by-email`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGrantMsg(data.error || `Ошибка ${res.status}`);
        setGrant("error");
      } else {
        setGrantMsg(`userId: ${data.userId}\nlevel: ${data.level}\nexpiresAt: ${data.expiresAt ?? "—"}`);
        setGrant("done");
        // Auto re-diagnose after 800ms
        setTimeout(handleDiagnose, 800);
      }
    } catch (e: any) {
      setGrantMsg(e.message ?? "Неизвестная ошибка");
      setGrant("error");
    }
  };

  const diagOk = diagData?.diagnosis?.some(d => d.startsWith("✅"));

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center">
          <KeyRound className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Выдача и диагностика доступа</p>
          <p className="text-xs text-muted-foreground">Проверьте состояние и активируйте доступ по email</p>
        </div>
      </div>

      {/* Email input */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Email пользователя</label>
        <input
          value={email}
          onChange={e => { setEmail(e.target.value); setDiagData(null); setDiag("idle"); setGrant("idle"); setGrantMsg(""); }}
          className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="user@example.com"
        />
      </div>

      {/* Diagnose button */}
      <button
        onClick={handleDiagnose}
        disabled={diagStatus === "loading" || !email.trim()}
        className="w-full py-2 rounded-xl border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300
          text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-all disabled:opacity-60"
      >
        {diagStatus === "loading"
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Проверяю...</>
          : <><Search className="w-3.5 h-3.5" /> Диагностика</>}
      </button>

      {/* Diagnosis result */}
      {diagData && (
        <div className={`rounded-xl p-3 space-y-2 text-xs border
          ${diagOk
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"}`}
        >
          {/* Auth user */}
          {diagData.authUser ? (
            <div className="space-y-0.5 text-foreground/70">
              <div><span className="font-mono font-semibold">userId:</span> {diagData.authUser.id}</div>
              <div><span className="font-mono font-semibold">email_confirmed:</span> {diagData.authUser.email_confirmed_at ? "✅" : "❌ не подтверждён"}</div>
              <div><span className="font-mono font-semibold">last_sign_in:</span> {diagData.authUser.last_sign_in_at ? new Date(diagData.authUser.last_sign_in_at).toLocaleString("ru") : "—"}</div>
            </div>
          ) : (
            <div className="font-semibold text-red-600 dark:text-red-400">❌ Пользователь не найден в Auth</div>
          )}

          {/* KV & PG */}
          {diagData.authUser && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-background/60 p-2">
                <div className="font-semibold mb-1 text-muted-foreground">KV Store</div>
                {diagData.kvRecord
                  ? <pre className="text-[10px] leading-tight whitespace-pre-wrap">{JSON.stringify(diagData.kvRecord, null, 2)}</pre>
                  : <div className="text-red-500">нет записи</div>}
              </div>
              <div className="rounded-lg bg-background/60 p-2">
                <div className="font-semibold mb-1 text-muted-foreground">Postgres</div>
                {diagData.pgRecord
                  ? <pre className="text-[10px] leading-tight whitespace-pre-wrap">{JSON.stringify(diagData.pgRecord, null, 2)}</pre>
                  : <div className="text-red-500">нет записи</div>}
              </div>
            </div>
          )}

          {/* Diagnosis messages */}
          <div className="space-y-1 pt-1">
            {diagData.diagnosis.map((d, i) => (
              <div key={i} className="font-medium">{d}</div>
            ))}
          </div>
        </div>
      )}

      {/* Grant section */}
      <div className="border-t border-violet-200 dark:border-violet-700/50 pt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Уровень доступа</label>
          <div className="flex gap-2">
            {(["lifetime", "monthly"] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                disabled={grantStatus === "loading"}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${level === lvl
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-border text-muted-foreground hover:bg-muted/50"}`}
              >
                {lvl === "lifetime" ? "🔓 Вечный" : "📅 Месячный"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGrant}
          disabled={grantStatus === "loading" || !email.trim()}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60
            text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          {grantStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
          {grantStatus === "done" && <CheckCircle2 className="w-4 h-4" />}
          {grantStatus === "loading" ? "Выдаю доступ..." : grantStatus === "done" ? "Готово! Повторить?" : "Выдать доступ"}
        </button>

        {grantMsg && (
          <div className={`rounded-xl px-4 py-3 text-xs font-mono whitespace-pre-wrap
            ${grantStatus === "done"
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"}`}
          >
            {grantStatus === "error" && <AlertCircle className="w-3.5 h-3.5 inline mr-1 mb-0.5" />}
            {grantStatus === "done" ? "✅ Доступ записан\n" : ""}{grantMsg}
          </div>
        )}
      </div>
    </div>
  );
}
