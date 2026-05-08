import { useState, useRef, useCallback, useEffect } from "react";
import { courseModules } from "./course-data";
import { Award, Download, X, GraduationCap, Share2, CheckCircle, Eye, Link2, Loader2, Copy, CheckCircle2, Linkedin } from "lucide-react";
import { getUserName } from "./user-name";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface CertificateProps {
  completedLessons: Set<string>;
  examScore: number | null;
  onClose: () => void;
}

// ===== Drawing logic extracted =====
interface CertDrawData {
  name: string;
  lessonsCompleted: number;
  totalLessons: number;
  progress: number;
  examScore: number | null;
  hasExam: boolean;
  modulesCompleted: number;
  totalModules: number;
  isPreview?: boolean;
}

function drawCertificateToCanvas(canvas: HTMLCanvasElement, data: CertDrawData) {
  const ctx = canvas.getContext("2d")!;
  const W = 1400;
  const H = 1000;
  canvas.width = W;
  canvas.height = H;

  // === Colors ===
  const GOLD = "#b8860b";
  const GOLD_LIGHT = "#d4a843";
  const GOLD_PALE = "#f5e6b8";
  const DARK = "#1a1a2e";
  const DARK_SOFT = "#2d2d44";
  const MUTED = "#6b6b80";
  const LIGHT_BG = "#fefdfb";
  const CREAM = "#faf8f2";

  // === Background ===
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, LIGHT_BG);
  bgGrad.addColorStop(0.5, CREAM);
  bgGrad.addColorStop(1, LIGHT_BG);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // === Subtle texture (diagonal lines) ===
  ctx.save();
  ctx.globalAlpha = 0.018;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // === Watermark pattern ===
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.font = "bold 80px Georgia, serif";
  ctx.fillStyle = GOLD;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.35);
  ctx.fillText("PRODUCT MANAGEMENT", 0, -60);
  ctx.fillText("CERTIFICATE", 0, 60);
  ctx.restore();

  // === Outer ornamental border ===
  const m = 28;
  const r = 8;

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(m, m, W - m * 2, H - m * 2, r);
  ctx.stroke();

  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(m + 8, m + 8, W - (m + 8) * 2, H - (m + 8) * 2, r);
  ctx.stroke();

  ctx.strokeStyle = GOLD_PALE;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(m + 12, m + 12, W - (m + 12) * 2, H - (m + 12) * 2, r);
  ctx.stroke();

  // Corner flourishes
  const drawCornerFlourish = (cx: number, cy: number, scaleX: number, scaleY: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(0, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();

    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(5, -5);
    ctx.lineTo(10, 0);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(18, -2, 2, 0, Math.PI * 2);
    ctx.fillStyle = GOLD_LIGHT;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-2, 18, 2, 0, Math.PI * 2);
    ctx.fillStyle = GOLD_LIGHT;
    ctx.fill();

    ctx.restore();
  };

  const inset = 42;
  drawCornerFlourish(inset, inset, 1, 1);
  drawCornerFlourish(W - inset, inset, -1, 1);
  drawCornerFlourish(inset, H - inset, 1, -1);
  drawCornerFlourish(W - inset, H - inset, -1, -1);

  // === Divider helper ===
  const drawDivider = (y: number, width: number) => {
    const cx = W / 2;
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx - width / 2, y);
    ctx.lineTo(cx - 20, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 20, y);
    ctx.lineTo(cx + width / 2, y);
    ctx.stroke();

    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(cx, y - 5);
    ctx.lineTo(cx + 5, y);
    ctx.lineTo(cx, y + 5);
    ctx.lineTo(cx - 5, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = GOLD_LIGHT;
    ctx.beginPath();
    ctx.arc(cx - width / 2, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + width / 2, y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  // === Laurel wreath ===
  ctx.save();
  const laurelCx = W / 2, laurelCy = 155, laurelSize = 100;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(laurelCx, laurelCy + laurelSize * 0.6);
    ctx.quadraticCurveTo(laurelCx + side * laurelSize * 0.5, laurelCy, laurelCx + side * laurelSize * 0.15, laurelCy - laurelSize * 0.55);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const stemX = laurelCx + side * laurelSize * 0.5 * Math.sin(t * Math.PI * 0.5) * (1 - t * 0.6);
      const stemY = laurelCy + laurelSize * 0.6 - t * laurelSize * 1.15;
      const lAngle = -0.3 - t * 0.4;
      ctx.save();
      ctx.translate(stemX, stemY);
      ctx.rotate(lAngle * side);
      ctx.beginPath();
      ctx.ellipse(0, 0, laurelSize * 0.13, laurelSize * 0.045, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(184, 134, 11, ${0.08 + t * 0.06})`;
      ctx.fill();
      ctx.strokeStyle = GOLD_LIGHT;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();

  // === Header ===
  ctx.fillStyle = GOLD;
  ctx.font = "600 13px 'Inter', 'Helvetica Neue', sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "8px";
  ctx.fillText("СЕРТИФИКАТ", W / 2, 100);

  drawDivider(118, 200);

  ctx.fillStyle = DARK;
  ctx.font = "bold 38px Georgia, 'Times New Roman', serif";
  ctx.letterSpacing = "1px";
  ctx.fillText("Продакт-менеджмент", W / 2, 165);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = MUTED;
  ctx.font = "italic 15px Georgia, serif";
  ctx.fillText("Профессиональный курс обучения", W / 2, 198);

  drawDivider(230, 500);

  // === Certifies that ===
  ctx.fillStyle = MUTED;
  ctx.font = "400 15px 'Inter', sans-serif";
  ctx.fillText("Настоящим подтверждается, что", W / 2, 275);

  // === Student name ===
  ctx.fillStyle = DARK;
  ctx.font = "bold 44px Georgia, 'Times New Roman', serif";
  ctx.fillText(data.name, W / 2, 335);

  const nameW = ctx.measureText(data.name).width;
  const lineStart = W / 2 - nameW / 2 - 30;
  const lineEnd = W / 2 + nameW / 2 + 30;

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lineStart, 358);
  ctx.lineTo(lineEnd, 358);
  ctx.stroke();

  ctx.strokeStyle = GOLD_PALE;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(lineStart + 20, 364);
  ctx.lineTo(lineEnd - 20, 364);
  ctx.stroke();

  // Diamonds at line ends
  const drawSmallDiamond = (x: number, y: number, s: number) => {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.fill();
  };
  drawSmallDiamond(lineStart - 5, 358, 3);
  drawSmallDiamond(lineEnd + 5, 358, 3);

  // === Description ===
  ctx.fillStyle = DARK_SOFT;
  ctx.font = "400 16px 'Inter', sans-serif";
  ctx.fillText("успешно завершил(а) полный курс обучения", W / 2, 405);
  ctx.fillText("по продакт-менеджменту и подтвердил(а) свои знания", W / 2, 430);

  // === Stats cards ===
  drawDivider(468, 600);

  const statsY = 498;
  const cardW = 200;
  const cardH = 90;
  const gap = 30;
  const totalW = cardW * 3 + gap * 2;
  const startX = W / 2 - totalW / 2;

  const drawStatCard = (x: number, label: string, value: string, accent?: boolean) => {
    const cardGrad = ctx.createLinearGradient(x, statsY, x, statsY + cardH);
    cardGrad.addColorStop(0, accent ? "rgba(184, 134, 11, 0.06)" : "rgba(250, 248, 242, 0.8)");
    cardGrad.addColorStop(1, accent ? "rgba(184, 134, 11, 0.02)" : "rgba(254, 253, 251, 0.8)");
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    ctx.roundRect(x, statsY, cardW, cardH, 12);
    ctx.fill();

    ctx.strokeStyle = accent ? GOLD_LIGHT : "rgba(184, 134, 11, 0.15)";
    ctx.lineWidth = accent ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.roundRect(x, statsY, cardW, cardH, 12);
    ctx.stroke();

    ctx.fillStyle = accent ? GOLD : DARK;
    ctx.font = "bold 28px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(value, x + cardW / 2, statsY + 38);

    ctx.fillStyle = MUTED;
    ctx.font = "400 11px 'Inter', sans-serif";
    ctx.fillText(label, x + cardW / 2, statsY + 65);
  };

  drawStatCard(startX, "Уроков пройдено", `${data.lessonsCompleted} из ${data.totalLessons}`);
  drawStatCard(startX + cardW + gap, "Прогресс курса", `${data.progress}%`, true);
  drawStatCard(startX + (cardW + gap) * 2, "Итоговый экзамен", data.hasExam ? `${data.examScore}%` : "-");

  // === Modules info ===
  ctx.fillStyle = MUTED;
  ctx.font = "400 12px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${data.totalModules} модулей · ${data.modulesCompleted} завершены полностью`, W / 2, 620);

  drawDivider(650, 500);

  // === Seal / Stamp ===
  const sealX = W / 2;
  const sealY = 745;
  const sealR = 52;

  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR - 6, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const inner = sealR - 5;
    const outer = sealR - 1;
    ctx.beginPath();
    ctx.moveTo(sealX + Math.cos(angle) * inner, sealY + Math.sin(angle) * inner);
    ctx.lineTo(sealX + Math.cos(angle) * outer, sealY + Math.sin(angle) * outer);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR - 8, 0, Math.PI * 2);
  const sealGrad = ctx.createRadialGradient(sealX, sealY - 10, 0, sealX, sealY, sealR);
  sealGrad.addColorStop(0, "rgba(212, 168, 67, 0.12)");
  sealGrad.addColorStop(1, "rgba(184, 134, 11, 0.04)");
  ctx.fillStyle = sealGrad;
  ctx.fill();

  // Text around seal
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.font = "600 7.5px 'Inter', sans-serif";
  const sealText = "★ PRODUCT MANAGEMENT ★ VERIFIED ★ EXCELLENCE ";
  const charAngle = (Math.PI * 2) / sealText.length;
  const textR = sealR - 14;
  for (let i = 0; i < sealText.length; i++) {
    const a = -Math.PI / 2 + i * charAngle;
    ctx.save();
    ctx.translate(sealX + Math.cos(a) * textR, sealY + Math.sin(a) * textR);
    ctx.rotate(a + Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(sealText[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // Star in center
  const drawStar = (cx: number, cy: number, sr: number, points: number) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? sr : sr * 0.45;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      else ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    ctx.closePath();
  };

  drawStar(sealX, sealY, 16, 5);
  ctx.fillStyle = GOLD;
  ctx.fill();

  drawStar(sealX, sealY, 10, 5);
  ctx.fillStyle = CREAM;
  ctx.fill();

  drawStar(sealX, sealY, 5, 5);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fill();

  // === Date and ID ===
  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const certId = data.isPreview ? "PM-XXXXXXXX" : `PM-${Date.now().toString(36).toUpperCase()}`;

  ctx.fillStyle = MUTED;
  ctx.font = "400 12px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Дата выдачи", W / 2 - 220, 835);
  ctx.fillStyle = DARK_SOFT;
  ctx.font = "500 13px 'Inter', sans-serif";
  ctx.fillText(date, W / 2 - 220, 855);

  ctx.strokeStyle = GOLD_PALE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 300, 870);
  ctx.lineTo(W / 2 - 140, 870);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = "400 12px 'Inter', sans-serif";
  ctx.fillText("Номер сертификата", W / 2 + 220, 835);
  ctx.fillStyle = DARK_SOFT;
  ctx.font = "500 13px 'Inter', sans-serif";
  ctx.fillText(certId, W / 2 + 220, 855);

  ctx.strokeStyle = GOLD_PALE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(W / 2 + 140, 870);
  ctx.lineTo(W / 2 + 300, 870);
  ctx.stroke();

  // === Bottom bar ===
  ctx.fillStyle = GOLD;
  ctx.font = "600 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  ctx.fillText("ПОЛНЫЙ ПРОФЕССИОНАЛЬНЫЙ КУРС ПО ПРОДАКТ-МЕНЕДЖМЕНТУ", W / 2, 920);
  ctx.letterSpacing = "0px";

  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 - 36 + i * 12, 945, i === 3 ? 3 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = i === 3 ? GOLD : GOLD_PALE;
    ctx.fill();
  }

  // === Preview watermark ===
  if (data.isPreview) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.font = "bold 120px Georgia, serif";
    ctx.fillStyle = GOLD;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.3);
    ctx.fillText("ПРЕВЬЮ", 0, 0);
    ctx.restore();
  }
}

// ===== Component =====
export function Certificate({ completedLessons, examScore, onClose }: CertificateProps) {
  const [studentName, setStudentName] = useState(() => {
    const name = getUserName();
    return name !== "Вы" ? name : "";
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalLessons = courseModules.reduce((a, m) => a + m.lessons.length, 0);
  const progress = Math.round((completedLessons.size / totalLessons) * 100);
  const canGenerate = progress >= 80 && (examScore === null || examScore >= 60);
  const hasExam = examScore !== null && examScore >= 60;
  const modulesCompleted = courseModules.filter(m => m.lessons.every(l => completedLessons.has(l.id))).length;

  const getDrawData = useCallback((name: string, isPreview: boolean): CertDrawData => ({
    name,
    lessonsCompleted: completedLessons.size,
    totalLessons,
    progress,
    examScore,
    hasExam,
    modulesCompleted,
    totalModules: courseModules.length,
    isPreview,
  }), [completedLessons.size, totalLessons, progress, examScore, hasExam, modulesCompleted]);

  // Auto-generate preview on mount
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const previewName = studentName.trim() || "Ваше Имя";
    drawCertificateToCanvas(previewCanvasRef.current, getDrawData(previewName, true));
  }, [getDrawData, studentName]);

  const generateCertificate = useCallback(async () => {
    if (!studentName.trim() || !canvasRef.current) return;
    setGenerating(true);
    // Small delay for UX
    await new Promise(r => setTimeout(r, 100));
    drawCertificateToCanvas(canvasRef.current, getDrawData(studentName.trim(), false));
    setGenerating(false);
    setGenerated(true);
  }, [studentName, getDrawData]);

  const downloadCertificate = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `certificate-pm-${studentName.trim().replace(/\s+/g, "-")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, [studentName]);

  const shareCertificate = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>(resolve => canvasRef.current!.toBlob(resolve, "image/png"));
      if (blob && navigator.share) {
        await navigator.share({
          title: "Сертификат по продакт-менеджменту",
          text: `${studentName} прошёл курс по продакт-менеджменту (${progress}%)`,
          files: [new File([blob], "certificate.png", { type: "image/png" })],
        });
      }
    } catch {
      downloadCertificate();
    }
  }, [studentName, progress, downloadCertificate]);

  const saveCertificateForVerification = useCallback(async () => {
    setVerifying(true);
    try {
      const API = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;
      let sessionId = localStorage.getItem("exam-session-id") || "anon";
      const res = await fetch(`${API}/certificate/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          sessionId,
          userName: studentName.trim(),
          completedLessons: completedLessons.size,
          totalLessons,
          examScore,
          completedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.certId) {
        setVerificationId(data.certId);
        try { localStorage.setItem("certificate-id", data.certId); } catch {}
      }
    } catch (err) {
      console.error("Certificate save error:", err);
    } finally {
      setVerifying(false);
    }
  }, [studentName, completedLessons.size, totalLessons, examScore]);

  const copyVerificationLink = useCallback(() => {
    if (!verificationId) return;
    const url = `${window.location.origin}?verify=${verificationId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [verificationId]);

  const shareOnLinkedIn = useCallback(() => {
    const title = encodeURIComponent(`Сертификат по продакт-менеджменту`);
    const summary = encodeURIComponent(
      `${studentName.trim()} успешно завершил(а) полный профессиональный курс по продакт-менеджменту. Прогресс: ${progress}%${examScore !== null ? `, экзамен: ${examScore}%` : ""}.`
    );
    const verifyUrl = verificationId
      ? encodeURIComponent(`${window.location.origin}?verify=${verificationId}`)
      : encodeURIComponent(window.location.origin);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${verifyUrl}`;
    window.open(linkedInUrl, "_blank", "width=600,height=500");
  }, [studentName, progress, examScore, verificationId]);

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-border/40 dark:bg-slate-900/80">
        <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center dark:bg-amber-900/30">
              <GraduationCap className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            </div>
            <span className="text-[0.875rem] font-semibold">Сертификат</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-10">
        {/* ===== Preview section (always visible) ===== */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-[0.8125rem] font-semibold text-muted-foreground">Превью сертификата</span>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-800/30 shadow-lg shadow-amber-100/30 dark:shadow-amber-900/10">
            <canvas ref={previewCanvasRef} className="w-full block" />
            {!canGenerate && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 rounded-2xl px-6 py-4 shadow-xl border border-border/40 text-center max-w-xs">
                  <Award className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[0.8125rem] font-semibold mb-1">Выполните условия</p>
                  <p className="text-[0.6875rem] text-muted-foreground/60">чтобы получить свой сертификат</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== Conditions / Generation ===== */}
        {!canGenerate ? (
          <div className="bg-card rounded-2xl border border-border/40 p-6">
            <h3 className="text-[0.9375rem] font-semibold mb-4">Условия получения</h3>
            <div className="space-y-3">
              <div className={`flex items-center gap-3 text-[0.875rem] ${progress >= 80 ? "text-emerald-600" : "text-muted-foreground/60"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${progress >= 80 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"}`}>
                  {progress >= 80 ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />}
                </div>
                Пройти 80%+ курса ({progress}%)
              </div>
              <div className={`flex items-center gap-3 text-[0.875rem] ${hasExam ? "text-emerald-600" : "text-muted-foreground/60"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${hasExam ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"}`}>
                  {hasExam ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />}
                </div>
                Сдать экзамен на 60%+ {examScore !== null ? `(${examScore}%)` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Name input + generate */}
            <div className="bg-card rounded-2xl border border-border/40 p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center dark:bg-amber-900/20">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[0.875rem] font-semibold">Поздравляем!</p>
                  <p className="text-[0.6875rem] text-muted-foreground/60">Введите имя и сгенерируйте финальный сертификат</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="flex-1 px-4 py-3 border border-border/40 rounded-xl text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 placeholder:text-muted-foreground/30 transition-all bg-background"
                />
                <button
                  onClick={generateCertificate}
                  disabled={!studentName.trim() || generating}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl text-[0.875rem] font-medium hover:from-amber-700 hover:to-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30 whitespace-nowrap"
                >
                  {generating ? "..." : "Сгенерировать"}
                </button>
              </div>
            </div>

            {/* Generated final certificate */}
            {generated && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-[0.8125rem] font-semibold text-muted-foreground">Ваш сертификат</span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-amber-200/60 dark:border-amber-800/30 shadow-xl shadow-amber-100/40 dark:shadow-amber-900/10">
                  <canvas ref={canvasRef} className="w-full block" />
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button onClick={downloadCertificate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 rounded-xl text-[0.8125rem] font-medium hover:from-amber-100 hover:to-amber-200 transition-colors border border-amber-200/60 dark:from-amber-900/20 dark:to-amber-900/30 dark:text-amber-400 dark:border-amber-800/30">
                    <Download className="w-4 h-4" /> Скачать PNG
                  </button>
                  {"share" in navigator && (
                    <button onClick={shareCertificate} className="flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-xl text-[0.8125rem] font-medium hover:bg-accent transition-colors">
                      <Share2 className="w-4 h-4" /> Поделиться
                    </button>
                  )}
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button onClick={saveCertificateForVerification} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 rounded-xl text-[0.8125rem] font-medium hover:from-amber-100 hover:to-amber-200 transition-colors border border-amber-200/60 dark:from-amber-900/20 dark:to-amber-900/30 dark:text-amber-400 dark:border-amber-800/30">
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Сохранить для верификации
                  </button>
                  {verificationId && (
                    <button onClick={copyVerificationLink} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 rounded-xl text-[0.8125rem] font-medium hover:from-amber-100 hover:to-amber-200 transition-colors border border-amber-200/60 dark:from-amber-900/20 dark:to-amber-900/30 dark:text-amber-400 dark:border-amber-800/30">
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Скопировать ссылку
                    </button>
                  )}
                </div>
                {/* LinkedIn Share */}
                <div className="flex gap-3 justify-center">
                  <button onClick={shareOnLinkedIn} className="flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] text-white rounded-xl text-[0.8125rem] font-medium hover:bg-[#004182] transition-colors shadow-sm">
                    <Linkedin className="w-4 h-4" /> Поделиться в LinkedIn
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}