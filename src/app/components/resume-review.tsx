import { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { FileText, X, Loader2, CheckCircle2, AlertTriangle, Star, Zap, Send, Upload, File, Trash2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface ReviewResult {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  missingSkills: string[];
  rewriteSuggestions: { original: string; improved: string }[];
  summary: string;
}

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
  "text/plain": "TXT",
};

export function ResumeReview({ onClose }: { onClose: () => void }) {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("Product Manager");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
      setError("Поддерживаемые форматы: PDF, DOCX, DOC, TXT");
      return;
    }

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Максимальный размер файла: 5 МБ");
      return;
    }

    setError("");
    setExtracting(true);
    setUploadedFile({ name: file.name, size: file.size });

    try {
      if (ext === "txt") {
        // Plain text — read directly
        const text = await file.text();
        setResumeText(text.slice(0, 5000));
        setExtracting(false);
        return;
      }

      // For PDF/DOCX/DOC — send to server for extraction
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          // Convert to base64
          let binary = "";
          const chunkSize = 8192;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);

          const res = await fetch(`${API}/extract-document`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
          });

          const data = await res.json();
          if (data.error) {
            setError(data.error);
            if (data.extractedText) {
              setResumeText(data.extractedText);
            }
          } else if (data.text) {
            setResumeText(data.text);
          }
        } catch (err: any) {
          console.error("Document extraction error:", err);
          setError("Ошибка при извлечении текста. Попробуйте скопировать текст вручную.");
        } finally {
          setExtracting(false);
        }
      };
      reader.onerror = () => {
        setError("Ошибка при чтении файла");
        setExtracting(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error("File upload error:", err);
      setError("Ошибка при загрузке файла");
      setExtracting(false);
    }
  }, []);

  const clearFile = useCallback(() => {
    setUploadedFile(null);
    setResumeText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = useCallback(async () => {
    if (resumeText.trim().length < 100) {
      setError("Текст резюме слишком короткий (минимум 100 символов)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/resume-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ resumeText: resumeText.trim().slice(0, 5000), targetRole }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.review);
    } catch (err: any) {
      setError(err.message || "Ошибка при анализе резюме");
      console.error("Resume review error:", err);
    } finally {
      setLoading(false);
    }
  }, [resumeText, targetRole]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
          <X className="w-4 h-4" /> Закрыть
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-[0.75rem] font-medium mb-4">
            <FileText className="w-3 h-3" /> AI Resume Review
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Проверка резюме для PM</h1>
          <p className="text-[0.875rem] text-muted-foreground">AI проанализирует ваше резюме и даст конкретные рекомендации для PM-позиций</p>
        </div>

        {!result ? (
          <>
            <div className="mb-4">
              <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Целевая позиция</label>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-card rounded-xl border border-border/40 text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-teal-400/30 dark:bg-slate-800"
              >
                <option>Product Manager</option>
                <option>Senior Product Manager</option>
                <option>Head of Product</option>
                <option>Product Owner</option>
                <option>Growth Product Manager</option>
              </select>
            </div>

            {/* Input mode tabs */}
            <div className="flex gap-1 mb-3 p-1 bg-muted/30 rounded-xl">
              <button
                onClick={() => setInputMode("text")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-medium transition-all ${
                  inputMode === "text" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3 h-3" /> Вставить текст
              </button>
              <button
                onClick={() => setInputMode("file")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-medium transition-all ${
                  inputMode === "file" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-3 h-3" /> Загрузить файл
              </button>
            </div>

            {inputMode === "file" ? (
              <div className="mb-4">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {!uploadedFile ? (
                  /* Drop zone */
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border/60 hover:border-teal-300 dark:hover:border-teal-700 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors group bg-card/50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                      <Upload className="w-5 h-5 text-violet-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-[0.875rem] font-medium text-foreground">Нажмите, чтобы загрузить файл</p>
                      <p className="text-[0.6875rem] text-muted-foreground/60 mt-1">PDF, DOCX, DOC или TXT (макс. 5 МБ)</p>
                    </div>
                  </button>
                ) : (
                  /* Uploaded file card */
                  <div className="bg-card rounded-xl border border-border/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                        <File className="w-5 h-5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8125rem] font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-[0.625rem] text-muted-foreground/60">
                          {formatSize(uploadedFile.size)}
                          {extracting && <span className="ml-2 text-teal-600">Извлекаю текст...</span>}
                          {!extracting && resumeText && <span className="ml-2 text-emerald-600">✓ {resumeText.length} символов извлечено</span>}
                        </p>
                      </div>
                      {extracting ? (
                        <Loader2 className="w-4 h-4 text-teal-500 animate-spin shrink-0" />
                      ) : (
                        <button onClick={clearFile} className="p-1.5 text-muted-foreground/40 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Extracted text preview */}
                {resumeText && !extracting && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[0.6875rem] font-semibold text-foreground/60">Извлечённый текст (можно отредактировать)</label>
                      <span className="text-[0.5625rem] text-muted-foreground/40">{resumeText.length}/5000</span>
                    </div>
                    <textarea
                      value={resumeText}
                      onChange={e => setResumeText(e.target.value)}
                      rows={6}
                      className="w-full px-3.5 py-3 bg-card rounded-xl border border-border/40 text-[0.75rem] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400/30 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Текст резюме</label>
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Вставьте текст вашего резюме/CV сюда... (скопируйте из документа или напишите основные блоки: опыт, навыки, образование)"
                  rows={12}
                  className="w-full px-3.5 py-3 bg-card rounded-xl border border-border/40 text-[0.8125rem] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-400/30 dark:bg-slate-800 dark:border-slate-700"
                />
                <p className="text-[0.625rem] text-muted-foreground/40 mt-1">{resumeText.length}/5000 символов</p>
              </div>
            )}

            {error && <p className="text-[0.75rem] text-red-500 mb-3">{error}</p>}

            <button onClick={handleSubmit} disabled={loading || extracting || resumeText.trim().length < 100} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-teal-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Анализирую...</> : <><Send className="w-4 h-4" /> Проверить резюме</>}
            </button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score */}
            <div className={`rounded-2xl p-5 mb-4 text-center text-white ${result.overallScore >= 7 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : result.overallScore >= 5 ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-red-500 to-pink-500"}`}>
              <div className="text-4xl font-bold mb-1">{result.overallScore}/10</div>
              <p className="text-white/80 text-[0.875rem]">{result.summary}</p>
            </div>

            {/* Strengths */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 mb-3">
              <h3 className="text-[0.8125rem] font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Сильные стороны
              </h3>
              <ul className="space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-[0.75rem] text-emerald-600/80 dark:text-emerald-400/80">+ {s}</li>)}</ul>
            </div>

            {/* Improvements */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-3">
              <h3 className="text-[0.8125rem] font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Что улучшить
              </h3>
              <ul className="space-y-1">{result.improvements.map((s, i) => <li key={i} className="text-[0.75rem] text-amber-600/80 dark:text-amber-400/80">- {s}</li>)}</ul>
            </div>

            {/* Missing skills */}
            {result.missingSkills?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-3">
                <h3 className="text-[0.8125rem] font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Не хватает для {targetRole}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingSkills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-[0.6875rem]">{s}</span>)}
                </div>
              </div>
            )}

            {/* Rewrite suggestions */}
            {result.rewriteSuggestions?.length > 0 && (
              <div className="bg-card rounded-xl border border-border/40 p-4 mb-4">
                <h3 className="text-[0.8125rem] font-semibold mb-3 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-violet-500" /> Примеры переформулировок
                </h3>
                {result.rewriteSuggestions.map((s, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="text-[0.6875rem] text-red-500/70 line-through mb-1">{s.original}</p>
                    <p className="text-[0.75rem] text-emerald-700 dark:text-emerald-400 font-medium">{s.improved}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setResult(null); setResumeText(""); setUploadedFile(null); }} className="flex-1 px-4 py-3 bg-muted/50 rounded-xl text-[0.8125rem] font-medium hover:bg-muted">
                Проверить другое резюме
              </button>
              <button onClick={onClose} className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-[0.8125rem] font-medium">
                Готово
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}