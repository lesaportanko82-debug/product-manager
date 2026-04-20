/**
 * GrantAccessTool — разовый компонент для выдачи доступа пользователю по email.
 * Отображается только для администратора внутри AdminPanel.
 * После успешного выполнения показывает подтверждение.
 */
import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/admin/grant-by-email`;

interface Props {
  adminPassword: string;
}

export function GrantAccessTool({ adminPassword }: Props) {
  const [email, setEmail]   = useState("maria.1m257@gmail.com");
  const [level, setLevel]   = useState<"lifetime" | "monthly">("lifetime");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<string>("");

  const handleGrant = async () => {
    setStatus("loading");
    setResult("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-Admin-Password": adminPassword,
        },
        body: JSON.stringify({ email, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || `Ошибка ${res.status}`);
        setStatus("error");
      } else {
        setResult(`✅ Доступ «${data.level}» выдан!\nEmail: ${data.email}\nuserId: ${data.userId}`);
        setStatus("done");
      }
    } catch (e: any) {
      setResult(e.message ?? "Неизвестная ошибка");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center">
          <KeyRound className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Выдать доступ по email</p>
          <p className="text-xs text-muted-foreground">Немедленно активирует платный доступ</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Email пользователя</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="user@example.com"
            disabled={status === "loading" || status === "done"}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Уровень доступа</label>
          <div className="flex gap-2">
            {(["lifetime", "monthly"] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                disabled={status === "loading" || status === "done"}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${level === lvl
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                {lvl === "lifetime" ? "🔓 Вечный" : "📅 Месячный"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGrant}
          disabled={status === "loading" || status === "done" || !email.trim()}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60
            text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === "done" && <CheckCircle2 className="w-4 h-4" />}
          {status === "loading" ? "Выдаю доступ..." : status === "done" ? "Готово!" : "Выдать доступ"}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl px-4 py-3 text-xs font-mono whitespace-pre-wrap
          ${status === "done"
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {status === "error" && <AlertCircle className="w-3.5 h-3.5 inline mr-1 mb-0.5" />}
          {result}
        </div>
      )}
    </div>
  );
}
