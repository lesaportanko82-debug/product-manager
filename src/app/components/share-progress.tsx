import { useRef, useCallback, useState } from "react";
import { courseModules } from "./course-data";
import { Share2, Download, X, Copy, Check } from "lucide-react";

interface ShareProgressProps {
  completedLessons: Set<string>;
  examScore: number | null;
}

export function ShareProgressButton({ completedLessons, examScore }: ShareProgressProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const progress = Math.round((completedLessons.size / totalLessons) * 100);
  const modulesCompleted = courseModules.filter(m => m.lessons.every(l => completedLessons.has(l.id))).length;

  const generateCard = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const W = 600;
    const H = 320;
    canvas.width = W;
    canvas.height = H;

    // BG
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Subtle gradient overlay
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(30, 64, 175, 0.25)");
    grad.addColorStop(1, "rgba(14, 116, 144, 0.15)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Badge area
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(28, 28, W - 56, H - 56, 20);
    ctx.fill();

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "500 11px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ПРОДАКТ-МЕНЕДЖМЕНТ", 52, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillText("Мой прогресс", 52, 96);

    // Progress bar
    const barY = 125;
    const barW = W - 104;
    const barH = 8;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(52, barY, barW, barH, 4);
    ctx.fill();

    const progGrad = ctx.createLinearGradient(52, 0, 52 + barW * (progress / 100), 0);
    progGrad.addColorStop(0, "#1e40af");
    progGrad.addColorStop(1, "#0e7490");
    ctx.fillStyle = progGrad;
    ctx.beginPath();
    ctx.roundRect(52, barY, barW * (progress / 100), barH, 4);
    ctx.fill();

    // Percentage
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 32px 'Inter', sans-serif";
    ctx.fillText(`${progress}%`, 52, 185);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "400 13px 'Inter', sans-serif";
    ctx.fillText(`${completedLessons.size} из ${totalLessons} уроков`, 135, 180);

    // Stats
    const statsY = 216;
    const drawStat = (x: number, value: string, label: string) => {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(x, statsY, 140, 52, 10);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 18px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(value, x + 70, statsY + 24);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "400 10px 'Inter', sans-serif";
      ctx.fillText(label, x + 70, statsY + 42);
    };

    ctx.textAlign = "left";
    drawStat(52, `${modulesCompleted}/${courseModules.length}`, "Модулей");
    drawStat(214, `${completedLessons.size}`, "Уроков");
    drawStat(376, examScore !== null ? `${examScore}%` : "—", "Экзамен");

    ctx.textAlign = "left";
    setShowModal(true);
  }, [completedLessons, progress, totalLessons, modulesCompleted, examScore]);

  const download = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "pm-progress.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, []);

  const copyText = useCallback(() => {
    const text = `Мой прогресс в курсе Продакт-менеджмент: ${progress}% (${completedLessons.size}/${totalLessons} уроков)${examScore !== null ? `, экзамен: ${examScore}%` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [progress, completedLessons.size, totalLessons, examScore]);

  return (
    <>
      <button
        onClick={generateCard}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-card border border-border/40 text-muted-foreground rounded-xl text-[0.8125rem] font-medium hover:text-foreground hover:border-border transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        Поделиться
      </button>

      <canvas ref={canvasRef} className="hidden" />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl shadow-black/10 max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[0.875rem] font-semibold">Поделиться прогрессом</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {canvasRef.current && (
              <img
                src={canvasRef.current.toDataURL("image/png")}
                alt="Progress"
                className="w-full rounded-xl mb-4"
              />
            )}

            <div className="flex gap-2">
              <button onClick={download} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-[0.8125rem] font-medium hover:bg-teal-600 transition-colors shadow-sm shadow-teal-100">
                <Download className="w-4 h-4" /> Скачать
              </button>
              <button onClick={copyText} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-xl text-[0.8125rem] font-medium hover:bg-accent transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Скопировано!" : "Копировать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}