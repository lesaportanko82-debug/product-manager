import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Archive } from "lucide-react";
import { OwlMascot, type OwlMood } from "./ai-assistant";

const MOODS: { mood: OwlMood; label: string }[] = [
  { mood: "neutral",      label: "Спокойствие" },
  { mood: "happy",        label: "Радость" },
  { mood: "thinking",     label: "Задумчивость" },
  { mood: "celebrating",  label: "Праздник" },
  { mood: "encouraging",  label: "Поддержка" },
  { mood: "sad",          label: "Грусть" },
  { mood: "surprised",    label: "Удивление" },
  { mood: "sleeping",     label: "Сон" },
];

const CARD_SIZE = 256;        // base render size of each card
const EXPORT_SCALE = 4;       // upscale → 1024×1024 PNG для маркетинга

export function HedgehogExport() {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const downloadOne = async (mood: OwlMood) => {
    const node = refs.current[mood];
    if (!node) return;
    setBusy(mood);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: EXPORT_SCALE,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `hedgehog-${mood}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[hedgehog-export] PNG generation failed:", err);
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy("__all__");
    try {
      for (const { mood } of MOODS) {
        const node = refs.current[mood];
        if (!node) continue;
        const dataUrl = await toPng(node, {
          pixelRatio: EXPORT_SCALE,
          cacheBust: true,
          backgroundColor: "#ffffff",
        });
        const link = document.createElement("a");
        link.download = `hedgehog-${mood}.png`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (err) {
      console.error("[hedgehog-export] batch PNG generation failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center gap-8 bg-slate-50 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Маскот Ёжуня 🦔</h1>
        <p className="text-sm text-slate-500 mt-1">Палитра эмоций AI-ассистента · экспорт PNG {CARD_SIZE * EXPORT_SCALE}×{CARD_SIZE * EXPORT_SCALE}</p>
      </div>

      <button
        onClick={downloadAll}
        disabled={!!busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-500/20 hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy === "__all__" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Генерирую все PNG…</>
        ) : (
          <><Archive className="w-4 h-4" /> Скачать все эмоции (PNG)</>
        )}
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {MOODS.map(({ mood, label }) => (
          <div key={mood} className="flex flex-col items-center gap-3">
            {/* Snapshot-target — rendered without animation for crisp PNG */}
            <div
              ref={(el) => { refs.current[mood] = el; }}
              style={{ width: CARD_SIZE, height: CARD_SIZE }}
              className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-teal-50 via-white to-emerald-50 border border-teal-100/50 shadow-sm"
            >
              <OwlMascot size={CARD_SIZE * 0.75} mood={mood} />
            </div>
            <p className="text-xs text-slate-600 font-medium">{label}</p>
            <button
              onClick={() => downloadOne(mood)}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy === mood ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PNG
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center max-w-md">
        Каждая карточка рендерится через <code className="font-mono">html-to-image</code> и сохраняется
        в качестве {CARD_SIZE * EXPORT_SCALE}×{CARD_SIZE * EXPORT_SCALE}px — подходит для соцсетей, лендингов и презентаций.
      </p>
    </div>
  );
}
