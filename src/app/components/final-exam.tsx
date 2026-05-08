import { useState, useCallback, useEffect, useRef } from "react";
import { finalExamQuestions, finalExamCases } from "./course-data";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { sendWebhook } from "./webhook";
import {
  GraduationCap, CheckCircle2, XCircle, RotateCcw, Trophy,
  Medal, ArrowLeft, HelpCircle, Star, Target, Timer, TrendingUp,
  AlertTriangle, FileText, Lightbulb, ChevronDown, ChevronUp, Briefcase
} from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface ExamResult {
  score: number;
  total: number;
  percentage: number;
  date: string;
  lastAttempt: string;
  attempts: number;
}

interface FinalExamProps {
  onBack: () => void;
  completedLessons: Set<string>;
}

interface CaseEvaluation {
  overallScore: number;
  criteria: {
    structure: { score: number; comment: string };
    depth: { score: number; comment: string };
    productApproach: { score: number; comment: string };
    practicality: { score: number; comment: string };
    metrics: { score: number; comment: string };
  };
  strengths: string[];
  improvements: string[];
  summary: string;
}

function getSessionId(): string {
  let id = localStorage.getItem("exam-session-id");
  if (!id) {
    id = "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("exam-session-id", id);
  }
  return id;
}

const EXAM_DURATION_MINUTES = 60;
const EXAM_DURATION_SECONDS = EXAM_DURATION_MINUTES * 60;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FinalExam({ onBack, completedLessons }: FinalExamProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [caseAnswers, setCaseAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [timerExpired, setTimerExpired] = useState(false);
  const [bestResult, setBestResult] = useState<ExamResult | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});
  const [caseEvaluations, setCaseEvaluations] = useState<Record<string, CaseEvaluation>>({});
  const [evaluatingCase, setEvaluatingCase] = useState<string | null>(null);
  const [evalErrors, setEvalErrors] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questionsPerPage = 5;
  const quizPages = Math.ceil(finalExamQuestions.length / questionsPerPage);
  const casePages = finalExamCases.length; // 1 case per page
  const totalPages = quizPages + casePages;

  const isOnCasePage = currentPage >= quizPages;
  const currentCaseIndex = currentPage - quizPages;

  const pageQuestions = !isOnCasePage
    ? finalExamQuestions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage)
    : [];
  const globalOffset = currentPage * questionsPerPage;

  const handleSelect = useCallback((qi: number, oi: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qi]: oi }));
  }, [showResults]);

  const handleCaseAnswer = useCallback((caseId: string, text: string) => {
    if (showResults) return;
    setCaseAnswers(prev => ({ ...prev, [caseId]: text }));
  }, [showResults]);

  const saveResultToSupabase = useCallback(async (score: number, total: number, pct: number, caseData: Record<string, string>) => {
    setSavingResult(true);
    try {
      const res = await fetch(`${API_BASE}/exam-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          sessionId: getSessionId(),
          score,
          total,
          percentage: pct,
          date: new Date().toISOString(),
          caseAnswers: caseData,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setBestResult(data.result);
        setSavedMessage(data.isNewBest ? "Новый лучший результат сохранён!" : "Результат сохранён (лучший результат не побит)");
      }
    } catch (err) {
      console.log("Error saving exam result:", err);
      setSavedMessage("Не удалось сохранить результат");
    } finally {
      setSavingResult(false);
    }
  }, []);

  const handleCheck = useCallback(() => {
    setShowResults(true);
    setCurrentPage(0);
    if (timerRef.current) clearInterval(timerRef.current);
    window.scrollTo(0, 0);
    const correct = finalExamQuestions.filter((q, i) => answers[i] === q.correctIndex).length;
    const pct = Math.round((correct / finalExamQuestions.length) * 100);
    saveResultToSupabase(correct, finalExamQuestions.length, pct, caseAnswers);
    const timeSpent = EXAM_DURATION_SECONDS - timeLeft;
    sendWebhook({
      type: "exam_completed",
      sessionId: getSessionId(),
      score: correct,
      total: finalExamQuestions.length,
      percentage: pct,
      timeSpent,
    } as any);
  }, [answers, caseAnswers, saveResultToSupabase, timeLeft]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setCaseAnswers({});
    setShowResults(false);
    setCurrentPage(0);
    setExamStarted(false);
    setTimeLeft(EXAM_DURATION_SECONDS);
    setTimerExpired(false);
    setSavedMessage(null);
    setExpandedHints({});
    window.scrollTo(0, 0);
  }, []);

  const handleStartExam = useCallback(() => {
    setExamStarted(true);
    setTimeLeft(EXAM_DURATION_SECONDS);
    setTimerExpired(false);
    window.scrollTo(0, 0);
    sendWebhook({ type: "exam_started", sessionId: getSessionId() });
  }, []);

  const handleEvaluateCase = useCallback(async (caseId: string) => {
    const caseItem = finalExamCases.find(c => c.id === caseId);
    const answer = caseAnswers[caseId];
    if (!caseItem || !answer || answer.trim().length < 50) {
      setEvalErrors(prev => ({ ...prev, [caseId]: "Ответ должен содержать минимум 50 символов" }));
      return;
    }
    setEvaluatingCase(caseId);
    setEvalErrors(prev => { const n = { ...prev }; delete n[caseId]; return n; });
    try {
      const res = await fetch(`${API_BASE}/evaluate-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          caseTitle: caseItem.title,
          caseContext: caseItem.context,
          caseTask: caseItem.task,
          userAnswer: answer,
          hints: caseItem.hints || [],
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.log("Case evaluation error:", data.error);
        setEvalErrors(prev => ({ ...prev, [caseId]: data.error }));
      } else if (data.evaluation) {
        setCaseEvaluations(prev => ({ ...prev, [caseId]: data.evaluation }));
      }
    } catch (err) {
      console.log("Error evaluating case:", err);
      setEvalErrors(prev => ({ ...prev, [caseId]: "Не удалось получить оценку. Попробуйте позже." }));
    } finally {
      setEvaluatingCase(null);
    }
  }, [caseAnswers]);

  useEffect(() => {
    fetch(`${API_BASE}/exam-result/${getSessionId()}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.json())
      .then(data => { if (data.result) setBestResult(data.result); })
      .catch(err => console.log("Error loading exam result:", err));
  }, []);

  useEffect(() => {
    if (examStarted && !showResults && !timerExpired) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); setTimerExpired(true); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examStarted, showResults, timerExpired]);

  useEffect(() => {
    if (timerExpired && !showResults) handleCheck();
  }, [timerExpired, showResults, handleCheck]);

  const totalAnswered = Object.keys(answers).length;
  const casesAnswered = Object.keys(caseAnswers).filter(k => caseAnswers[k].trim().length > 0).length;
  const correctCount = showResults ? finalExamQuestions.filter((q, i) => answers[i] === q.correctIndex).length : 0;
  const percentage = showResults ? Math.round((correctCount / finalExamQuestions.length) * 100) : 0;
  const allQuizAnswered = totalAnswered >= finalExamQuestions.length;

  const getGrade = () => {
    if (percentage >= 90) return { label: "Отлично!", icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" };
    if (percentage >= 75) return { label: "Хорошо!", icon: Medal, color: "text-green-600", bg: "bg-green-50 border-green-200" };
    if (percentage >= 60) return { label: "Удовлетворительно", icon: Star, color: "text-teal-600", bg: "bg-teal-50 border-teal-200" };
    return { label: "Нужно повторить материал", icon: Target, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  };

  const timerWarning = timeLeft < 300 && timeLeft > 0;
  const timerCritical = timeLeft < 60 && timeLeft > 0;

  // Pre-exam screen
  if (!examStarted && !showResults) {
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /><span className="text-sm">Назад к курсу</span>
            </button>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-700" />
              <span className="text-sm font-medium">Финальный экзамен</span>
            </div>
          </div>
        </div>
        <div className="px-4 lg:px-8 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-teal-700" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Итоговый экзамен по курсу</h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-8">
              {finalExamQuestions.length} тестовых вопросов + {finalExamCases.length} кейсов. Проверьте знания по всем 11 блокам курса — от основ до стратегии и роста.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <HelpCircle className="w-6 h-6 text-teal-700 mx-auto mb-2" />
                <div className="font-semibold text-teal-900">{finalExamQuestions.length} вопросов</div>
                <div className="text-teal-700/70 text-xs mt-1">Тестовые</div>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <Briefcase className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="font-semibold text-orange-900">{finalExamCases.length} кейсов</div>
                <div className="text-orange-700/70 text-xs mt-1">Развёрнутый ответ</div>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <Timer className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <div className="font-semibold text-teal-900">{EXAM_DURATION_MINUTES} минут</div>
                <div className="text-teal-700/70 text-xs mt-1">Обратный отсчёт</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-green-900">Лучший</div>
                <div className="text-green-700/70 text-xs mt-1">
                  {bestResult ? `${bestResult.percentage}% (${bestResult.attempts} поп.)` : "Ещё не пройден"}
                </div>
              </div>
            </div>

            {/* Cases preview */}
            <div className="bg-card border border-border rounded-xl p-5 mb-8 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-sm">Кейсы в экзамене</span>
              </div>
              <div className="space-y-2">
                {finalExamCases.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span>{c.title}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Кейсы требуют развёрнутого текстового ответа. Оценка кейсов производится отдельно.
              </p>
            </div>

            {bestResult && (
              <div className="bg-card border border-border rounded-xl p-4 mb-8 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-sm">Ваш лучший результат</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xl font-bold text-teal-700">{bestResult.percentage}%</div><div className="text-xs text-muted-foreground">Процент</div></div>
                  <div><div className="text-xl font-bold text-teal-700">{bestResult.score}/{bestResult.total}</div><div className="text-xs text-muted-foreground">Баллы</div></div>
                  <div><div className="text-xl font-bold text-green-600">{bestResult.attempts}</div><div className="text-xs text-muted-foreground">Попыток</div></div>
                </div>
              </div>
            )}
            <button onClick={handleStartExam} className="px-8 py-3.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-all shadow-md shadow-teal-100 text-sm font-medium">
              Начать экзамен
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Section label for navigation
  const getSectionLabel = () => {
    if (isOnCasePage) return `Кейс ${currentCaseIndex + 1} из ${casePages}`;
    return `Тестовые вопросы - стр. ${currentPage + 1} из ${quizPages}`;
  };

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 lg:px-8 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Назад к курсу</span>
          </button>
          <div className="flex items-center gap-4">
            {!showResults && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-medium transition-colors ${timerCritical ? "bg-red-100 text-red-700 animate-pulse" : timerWarning ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>
                <Timer className="w-4 h-4" />{formatTime(timeLeft)}
              </div>
            )}
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-700" />
              <span className="text-sm font-medium">Финальный экзамен</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
              {isOnCasePage ? <Briefcase className="w-8 h-8 text-orange-600" /> : <GraduationCap className="w-8 h-8 text-teal-700" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {showResults ? "Результаты экзамена" : isOnCasePage ? `Кейс ${currentCaseIndex + 1}` : "Тестовые вопросы"}
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              {showResults
                ? `${finalExamQuestions.length} вопросов + ${finalExamCases.length} кейсов`
                : getSectionLabel()
              }
            </p>
          </div>

          {timerExpired && showResults && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium text-amber-900 text-sm">Время истекло!</div>
                <div className="text-amber-700/80 text-xs">Экзамен завершён автоматически. Без ответа: {finalExamQuestions.length - totalAnswered} вопросов.</div>
              </div>
            </div>
          )}

          {showResults && (() => {
            const grade = getGrade();
            const GradeIcon = grade.icon;
            return (
              <div className={`rounded-xl border p-6 mb-8 ${grade.bg}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center">
                    <GradeIcon className={`w-7 h-7 ${grade.color}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${grade.color}`}>{grade.label}</h2>
                    <p className="text-sm mt-1 opacity-80">Тесты: {correctCount} из {finalExamQuestions.length} правильно ({percentage}%)</p>
                    <p className="text-sm mt-0.5 opacity-80">Кейсы: {casesAnswered} из {finalExamCases.length} отвечено</p>
                  </div>
                </div>
                <div className="mt-4 h-3 bg-white/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                </div>
                {savingResult && <div className="mt-3 text-sm opacity-70">Сохранение результата...</div>}
                {savedMessage && (
                  <div className="mt-3 text-sm font-medium opacity-80 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />{savedMessage}
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/80 dark:bg-card/80 hover:bg-white dark:hover:bg-card transition-all text-sm font-medium">
                    <RotateCcw className="w-3.5 h-3.5" />Пройти заново
                  </button>
                  <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/80 dark:bg-card/80 hover:bg-white dark:hover:bg-card transition-all text-sm font-medium">
                    <ArrowLeft className="w-3.5 h-3.5" />К курсу
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Progress bar */}
          {!showResults && (
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isOnCasePage ? "Кейсы" : "Тестовые вопросы"}
                </span>
                <span className="text-sm font-medium">
                  {isOnCasePage
                    ? `${casesAnswered}/${finalExamCases.length} кейсов`
                    : `${totalAnswered}/${finalExamQuestions.length} вопросов`
                  }
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOnCasePage ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-gradient-to-r from-teal-600 to-emerald-500"}`}
                  style={{ width: `${isOnCasePage ? (casesAnswered / finalExamCases.length) * 100 : (totalAnswered / finalExamQuestions.length) * 100}%` }}
                />
              </div>
              {/* Mini nav dots */}
              <div className="flex items-center gap-1.5 mt-3 justify-center flex-wrap">
                {Array.from({ length: quizPages }, (_, i) => (
                  <button
                    key={`q-${i}`}
                    onClick={() => { setCurrentPage(i); window.scrollTo(0, 0); }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${currentPage === i ? "bg-teal-600 scale-125" : "bg-teal-200 hover:bg-teal-300"}`}
                    title={`Вопросы ${i * questionsPerPage + 1}-${Math.min((i + 1) * questionsPerPage, finalExamQuestions.length)}`}
                  />
                ))}
                <span className="w-px h-3 bg-border mx-1" />
                {finalExamCases.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { setCurrentPage(quizPages + i); window.scrollTo(0, 0); }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${currentPage === quizPages + i ? "bg-orange-500 scale-125" : "bg-orange-200 hover:bg-orange-300"}`}
                    title={`Кейс ${i + 1}: ${c.title}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quiz questions */}
          {!isOnCasePage && (
            <div className="space-y-6 mb-8">
              {pageQuestions.map((q, localIdx) => {
                const qIndex = globalOffset + localIdx;
                const selected = answers[qIndex];
                const isCorrect = showResults && selected === q.correctIndex;
                const isWrong = showResults && selected !== undefined && selected !== q.correctIndex;
                return (
                  <div key={qIndex} className="bg-card border border-border rounded-xl p-5">
                    <p className="font-medium mb-3 flex items-start gap-2.5" style={{ fontSize: "0.9375rem" }}>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-800 shrink-0 text-xs font-bold">{qIndex + 1}</span>
                      <span>{q.question}</span>
                    </p>
                    <div className="space-y-2 ml-9">
                      {q.options.map((opt, oIndex) => {
                        const isSelected = selected === oIndex;
                        const isCorrectOption = showResults && oIndex === q.correctIndex;
                        const isWrongOption = showResults && isSelected && oIndex !== q.correctIndex;
                        let bgClass = "bg-background hover:bg-teal-50/50 border-border";
                        if (isSelected && !showResults) bgClass = "bg-teal-50 border-teal-400";
                        if (isCorrectOption) bgClass = "bg-green-50 border-green-400";
                        if (isWrongOption) bgClass = "bg-red-50 border-red-400";
                        return (
                          <button key={oIndex} onClick={() => handleSelect(qIndex, oIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-2.5 ${bgClass}`}
                            disabled={showResults} style={{ fontSize: "0.875rem" }}>
                            {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                            {isWrongOption && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                            {!isCorrectOption && !isWrongOption && (
                              <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${isSelected ? "border-teal-500 bg-teal-500" : "border-slate-300"}`} />
                            )}
                            <span className={isCorrectOption ? "text-green-800" : isWrongOption ? "text-red-800" : ""}>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                    {showResults && q.explanation && (isCorrect || isWrong) && (
                      <div className={`ml-9 mt-2 p-2.5 rounded-lg ${isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`} style={{ fontSize: "0.8125rem" }}>
                        {isCorrect ? "✓ Верно! " : "✗ Неверно. "}{q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Case study */}
          {isOnCasePage && currentCaseIndex < finalExamCases.length && (() => {
            const caseItem = finalExamCases[currentCaseIndex];
            const caseText = caseAnswers[caseItem.id] || "";
            const charCount = caseText.length;
            return (
              <div className="space-y-6 mb-8">
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Case header */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                        {currentCaseIndex + 1}
                      </span>
                      <div>
                        <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Кейс {currentCaseIndex + 1} из {finalExamCases.length}</div>
                        <h3 className="font-bold text-lg text-orange-900">{caseItem.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Context */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Контекст</span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-line mb-5">
                      {caseItem.context}
                    </div>

                    {/* Task */}
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-teal-700" />
                        <span className="text-sm font-semibold text-teal-800">Задание</span>
                      </div>
                      <p className="text-sm text-teal-900 leading-relaxed">{caseItem.task}</p>
                    </div>

                    {/* Expected result */}
                    {caseItem.expectedResult && (
                      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-5">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          <span className="text-sm font-semibold text-teal-800">Ожидаемый результат</span>
                        </div>
                        <p className="text-sm text-teal-900">{caseItem.expectedResult}</p>
                      </div>
                    )}

                    {/* Hints */}
                    {caseItem.hints && caseItem.hints.length > 0 && (
                      <div className="mb-5">
                        <button
                          onClick={() => setExpandedHints(prev => ({ ...prev, [caseItem.id]: !prev[caseItem.id] }))}
                          className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 transition-colors"
                        >
                          <Lightbulb className="w-4 h-4" />
                          <span className="font-medium">Подсказка</span>
                          {expandedHints[caseItem.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {expandedHints[caseItem.id] && (
                          <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                            {caseItem.hints.map((hint, hi) => (
                              <p key={hi} className="text-sm text-amber-800">{hint}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Answer textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Ваш ответ</span>
                        <span className={`text-xs ${charCount > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                          {charCount > 0 ? `${charCount} символов` : "Пока пусто"}
                        </span>
                      </div>
                      <textarea
                        value={caseText}
                        onChange={e => handleCaseAnswer(caseItem.id, e.target.value)}
                        disabled={showResults}
                        placeholder="Опишите ваше решение подробно: с чего начнёте, какие шаги предпримете, как будете оценивать результат..."
                        className="w-full min-h-[240px] p-4 rounded-xl border border-border bg-background text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Show saved case answer in results */}
                {showResults && caseText.trim().length > 0 && (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Ответ сохранён ({charCount} символов)</span>
                        </div>
                        {!caseEvaluations[caseItem.id] && (
                          <button
                            onClick={() => handleEvaluateCase(caseItem.id)}
                            disabled={evaluatingCase === caseItem.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                          >
                            {evaluatingCase === caseItem.id ? (
                              <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Оценка...</>
                            ) : (
                              <><Star className="w-3.5 h-3.5" /> Оценить с AI</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* AI Evaluation Error */}
                    {evalErrors[caseItem.id] && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-sm text-red-700">{evalErrors[caseItem.id]}</span>
                        <button onClick={() => handleEvaluateCase(caseItem.id)} className="ml-auto text-xs text-red-600 underline hover:text-red-800">Повторить</button>
                      </div>
                    )}

                    {/* AI Evaluation Results */}
                    {caseEvaluations[caseItem.id] && (() => {
                      const ev = caseEvaluations[caseItem.id];
                      const scoreBg = ev.overallScore >= 8 ? "from-green-500 to-emerald-500" : ev.overallScore >= 6 ? "from-teal-500 to-cyan-500" : ev.overallScore >= 4 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-500";
                      const criteriaLabels: Record<string, string> = {
                        structure: "Структура и логика",
                        depth: "Глубина анализа",
                        productApproach: "Продуктовый подход",
                        practicality: "Практичность решения",
                        metrics: "Метрики и оценка",
                      };
                      return (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                          <div className={`bg-gradient-to-r ${scoreBg} p-5 text-white`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Star className="w-6 h-6" />
                                <div>
                                  <div className="text-xs uppercase tracking-wide opacity-80">Оценка AI</div>
                                  <div className="text-2xl font-bold">{ev.overallScore}/10</div>
                                </div>
                              </div>
                              <div className="text-right text-xs opacity-80">
                                <div>Кейс: {caseItem.title}</div>
                                <div>Оценено GPT-4o</div>
                              </div>
                            </div>
                          </div>
                          <div className="p-5 space-y-5">
                            <div>
                              <h4 className="text-sm font-semibold mb-3">Оценка по критериям</h4>
                              <div className="space-y-3">
                                {Object.entries(ev.criteria).map(([key, val]) => (
                                  <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{criteriaLabels[key] || key}</span>
                                      <span className={`text-xs font-bold ${val.score >= 7 ? "text-green-600" : val.score >= 5 ? "text-amber-600" : "text-red-600"}`}>{val.score}/10</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                      <div className={`h-full rounded-full transition-all ${val.score >= 7 ? "bg-green-400" : val.score >= 5 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${val.score * 10}%` }} />
                                    </div>
                                    <p className="text-xs text-slate-500">{val.comment}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {ev.strengths && ev.strengths.length > 0 && (
                              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-800">Сильные стороны</span>
                                </div>
                                <ul className="space-y-1">
                                  {ev.strengths.map((s, si) => (
                                    <li key={si} className="text-xs text-green-700 flex items-start gap-1.5">
                                      <span className="text-green-500 mt-0.5 shrink-0">+</span> {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {ev.improvements && ev.improvements.length > 0 && (
                              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Lightbulb className="w-4 h-4 text-amber-600" />
                                  <span className="text-sm font-semibold text-amber-800">Что улучшить</span>
                                </div>
                                <ul className="space-y-1">
                                  {ev.improvements.map((im, ii) => (
                                    <li key={ii} className="text-xs text-amber-700 flex items-start gap-1.5">
                                      <span className="text-amber-500 mt-0.5 shrink-0">~</span> {im}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {ev.summary && (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{ev.summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
                {showResults && caseText.trim().length === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Ответ не предоставлен</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); window.scrollTo(0, 0); }}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded-lg text-sm ${currentPage === 0 ? "text-muted-foreground cursor-not-allowed" : "bg-teal-50 text-teal-700 hover:bg-teal-100"}`}>
              &larr; Назад
            </button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            {currentPage < totalPages - 1 ? (
              <button onClick={() => { setCurrentPage(p => p + 1); window.scrollTo(0, 0); }}
                className="px-4 py-2 rounded-lg text-sm bg-teal-50 text-teal-700 hover:bg-teal-100">
                Далее &rarr;
              </button>
            ) : !showResults ? (
              <button onClick={handleCheck} disabled={!allQuizAnswered}
                className={`px-5 py-2 rounded-lg text-sm ${!allQuizAnswered ? "bg-teal-100 text-teal-400 cursor-not-allowed" : "bg-teal-500 text-white hover:bg-teal-600"}`}>
                Завершить ({totalAnswered}/{finalExamQuestions.length})
              </button>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}