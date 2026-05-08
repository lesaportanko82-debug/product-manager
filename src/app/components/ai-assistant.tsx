import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { X, Send, Loader2, MessageCircle, Trash2 } from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  lessonTitle?: string;
  lessonContent?: string;
  moduleTitle?: string;
}

const SUGGESTIONS = [
  "Объясни подробнее этот урок",
  "Приведи практический пример",
  "Как это применить в B2B?",
  "Какие фреймворки подходят?",
];

// Owl mascot with emotional states
export type OwlMood = "neutral" | "happy" | "thinking" | "celebrating" | "encouraging";

interface OwlMascotProps {
  size?: number;
  className?: string;
  animate?: boolean;
  mood?: OwlMood;
}

export function OwlMascot({ size = 32, className = "", animate = false, mood = "neutral" }: OwlMascotProps) {
  // Eye variations based on mood
  const getEyes = () => {
    switch (mood) {
      case "happy":
        return (
          <>
            {/* Happy eyes - curved */}
            <path d="M18 25 Q25 22 32 25" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M32 25 Q39 22 46 25" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "thinking":
        return (
          <>
            {/* Left eye normal */}
            <ellipse cx="25" cy="25" rx="6.5" ry="6.5" fill="white" />
            <ellipse cx="25" cy="25" rx="5.5" ry="5.5" fill="#fefce8" />
            <circle cx="26" cy="24" r="3.5" fill="#1e293b" />
            <circle cx="27.5" cy="22.5" r="1.8" fill="white" />
            {/* Right eye squinted */}
            <path d="M32 25 Q39 23 46 25" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case "celebrating":
      case "encouraging":
        return (
          <>
            {/* Excited wide eyes */}
            <ellipse cx="25" cy="25" rx="7" ry="7.5" fill="white" />
            <ellipse cx="25" cy="25" rx="6" ry="6.5" fill="#fefce8" />
            <circle cx="26" cy="24" r="4" fill="#1e293b" />
            <circle cx="27.5" cy="22.5" r="2" fill="white" />
            <ellipse cx="39" cy="25" rx="7" ry="7.5" fill="white" />
            <ellipse cx="39" cy="25" rx="6" ry="6.5" fill="#fefce8" />
            <circle cx="40" cy="24" r="4" fill="#1e293b" />
            <circle cx="41.5" cy="22.5" r="2" fill="white" />
          </>
        );
      default:
        return (
          <>
            {/* Normal eyes */}
            <ellipse cx="25" cy="25" rx="6.5" ry="6.5" fill="white" />
            <ellipse cx="25" cy="25" rx="5.5" ry="5.5" fill="#fefce8" />
            <circle cx="26" cy="24" r="3.5" fill="#1e293b" />
            <circle cx="27.5" cy="22.5" r="1.8" fill="white" />
            <circle cx="24.5" cy="25.5" r="0.8" fill="white" opacity="0.5" />
            <ellipse cx="39" cy="25" rx="6.5" ry="6.5" fill="white" />
            <ellipse cx="39" cy="25" rx="5.5" ry="5.5" fill="#fefce8" />
            <circle cx="40" cy="24" r="3.5" fill="#1e293b" />
            <circle cx="41.5" cy="22.5" r="1.8" fill="white" />
            <circle cx="38.5" cy="25.5" r="0.8" fill="white" opacity="0.5" />
          </>
        );
    }
  };

  const getBeak = () => {
    if (mood === "happy" || mood === "celebrating") {
      return <path d="M30 30 L32 35 L34 30" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" />;
    }
    return <path d="M30 30 L32 34 L34 30" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" />;
  };

  const owl = (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Body */}
      <ellipse cx="32" cy="40" rx="18" ry="20" fill="url(#owlBodyL)" />
      {/* Belly */}
      <ellipse cx="32" cy="46" rx="11" ry="12" fill="#fef9ee" opacity="0.85" />
      {/* Belly pattern */}
      <path d="M26 42 Q29 45 32 42 Q35 45 38 42" stroke="#f5deb3" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M27 46 Q30 49 33 46 Q36 49 39 46" stroke="#f5deb3" strokeWidth="0.8" fill="none" opacity="0.5" />
      {/* Left ear tuft */}
      <path d="M17 20 L14 8 L23 17 Z" fill="url(#owlEarL)" />
      {/* Right ear tuft */}
      <path d="M47 20 L50 8 L41 17 Z" fill="url(#owlEarL)" />
      {/* Head */}
      <circle cx="32" cy="26" r="15" fill="url(#owlHeadL)" />
      {/* Face disc */}
      <ellipse cx="32" cy="27" rx="12" ry="11" fill="#fef9ee" opacity="0.3" />
      {/* Eyes - dynamic based on mood */}
      {getEyes()}
      {/* Beak */}
      {getBeak()}
      {/* Blush */}
      <circle cx="19" cy="29" r="2.5" fill="#fda4af" opacity={mood === "happy" || mood === "celebrating" ? "0.4" : "0.25"} />
      <circle cx="45" cy="29" r="2.5" fill="#fda4af" opacity={mood === "happy" || mood === "celebrating" ? "0.4" : "0.25"} />
      {/* Feet */}
      <path d="M24 58 L21 62 L24 60 L27 62 L24 58" fill="#fbbf24" />
      <path d="M40 58 L37 62 L40 60 L43 62 L40 58" fill="#fbbf24" />
      {/* Wing left */}
      <path d="M14 36 Q10 44 16 52 Q18 46 17 38" fill="url(#owlWingL)" opacity="0.7" />
      {/* Wing right */}
      <path d="M50 36 Q54 44 48 52 Q46 46 47 38" fill="url(#owlWingL)" opacity="0.7" />
      {/* Sparkles for celebrating mood */}
      {mood === "celebrating" && (
        <>
          <circle cx="10" cy="15" r="1.5" fill="#fbbf24" opacity="0.8" />
          <circle cx="54" cy="18" r="1.2" fill="#fbbf24" opacity="0.7" />
          <circle cx="15" cy="52" r="1" fill="#fbbf24" opacity="0.6" />
          <circle cx="50" cy="55" r="1.3" fill="#fbbf24" opacity="0.8" />
          <path d="M8 20 L9 22 L11 23 L9 24 L8 26 L7 24 L5 23 L7 22 Z" fill="#fbbf24" opacity="0.7" />
          <path d="M56 12 L57 14 L59 15 L57 16 L56 18 L55 16 L53 15 L55 14 Z" fill="#fbbf24" opacity="0.6" />
        </>
      )}
      <defs>
        <linearGradient id="owlBodyL" x1="32" y1="20" x2="32" y2="60">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#c09060" />
        </linearGradient>
        <linearGradient id="owlHeadL" x1="32" y1="11" x2="32" y2="41">
          <stop offset="0%" stopColor="#deb887" />
          <stop offset="100%" stopColor="#c9a067" />
        </linearGradient>
        <linearGradient id="owlEarL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c88a" />
          <stop offset="100%" stopColor="#c9a067" />
        </linearGradient>
        <linearGradient id="owlWingL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a067" />
          <stop offset="100%" stopColor="#a8845a" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (!animate) return owl;

  const getAnimation = () => {
    switch (mood) {
      case "celebrating":
        return {
          y: [0, -5, 0, -3, 0],
          rotate: [0, -5, 5, -3, 0],
        };
      case "thinking":
        return {
          rotate: [0, -3, 3, 0],
        };
      case "encouraging":
        return {
          scale: [1, 1.05, 1, 1.03, 1],
        };
      default:
        return {
          y: [0, -3, 0],
        };
    }
  };

  return (
    <motion.div
      animate={getAnimation()}
      transition={{
        duration: mood === "celebrating" ? 1.5 : 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {owl}
    </motion.div>
  );
}

// Clean AI response text from markdown artifacts
function cleanAIText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim();
    })
    .replace(/^[-*]\s+/gm, "\u2022 ")
    .replace(/^(\d+)\.\s+/gm, "$1) ")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\\([*_`#\[\]])/g, "$1")
    .trim();
}

export function AIAssistant({ lessonTitle, lessonContent, moduleTitle }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build prompt enriched with lesson context if available
    const prompt = [
      lessonTitle ? `Текущий урок: ${lessonTitle}` : "",
      moduleTitle ? `Модуль: ${moduleTitle}` : "",
      lessonContent ? `Контекст урока (кратко):\n${lessonContent.slice(0, 2000)}` : "",
      `Вопрос: ${text.trim()}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      // Primary: /openai-proxy accepts { prompt } → returns { text }
      const res = await fetch(`${API_BASE}/openai-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        // Fallback: /ai-chat accepts { question, lessonTitle, lessonContent, moduleTitle }
        console.log("openai-proxy failed, falling back to ai-chat:", data.error);
        const fallbackRes = await fetch(`${API_BASE}/ai-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            question: text.trim(),
            lessonTitle: lessonTitle || "",
            lessonContent: lessonContent || "",
            moduleTitle: moduleTitle || "",
          }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.error) {
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: "Ошибка генерации, попробуйте снова" },
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: cleanAIText(fallbackData.answer) },
          ]);
        }
        return;
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: cleanAIText(data.text) },
      ]);
    } catch (err) {
      console.log("AI assistant error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Ошибка генерации, попробуйте снова" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, lessonTitle, lessonContent, moduleTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-white dark:bg-card border-2 border-amber-200/80 dark:border-amber-700/60 text-white shadow-lg shadow-amber-100/50 dark:shadow-black/30 hover:shadow-xl hover:shadow-amber-200/50 hover:border-amber-300 transition-all flex items-center justify-center overflow-visible"
        title="Совунья - AI-ассистент"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <OwlMascot size={44} animate />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-white dark:bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/8 flex flex-col overflow-hidden"
      >
        {/* Header - light */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-amber-100/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-muted border border-amber-200/60 dark:border-amber-700/40 shadow-sm flex items-center justify-center">
              <OwlMascot size={28} />
            </div>
            <div>
              <p className="text-[0.8125rem] font-semibold text-amber-900">Совунья</p>
              <p className="text-[0.625rem] text-amber-600/60 truncate max-w-[180px]">
                {lessonTitle || "AI-ассистент по курсу"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100/50 transition-all"
                title="Очистить чат"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100/50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center py-6"
            >
              <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                <OwlMascot size={64} animate />
              </div>
              <p className="text-[0.9375rem] font-semibold text-foreground mb-1">Привет! Я Совунья</p>
              <p className="text-[0.75rem] text-muted-foreground/60 mb-5">
                Задайте вопрос по материалу - я помогу разобраться
              </p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left px-3.5 py-2.5 bg-amber-50/40 hover:bg-amber-50 border border-amber-100/40 hover:border-amber-200/60 text-foreground/80 hover:text-amber-800 rounded-xl text-[0.8125rem] transition-all flex items-center gap-2"
                  >
                    <MessageCircle className="w-3 h-3 text-amber-400/60" />
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-100/60 flex items-center justify-center shrink-0 mt-1 mr-2">
                  <OwlMascot size={18} />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[0.8125rem] leading-relaxed ${
                msg.role === "user"
                  ? "bg-teal-500 text-white rounded-br-md"
                  : "bg-slate-50 text-foreground border border-border/30 rounded-bl-md"
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-100/60 flex items-center justify-center shrink-0 mt-1 mr-2">
                <OwlMascot size={18} />
              </div>
              <div className="bg-slate-50 text-muted-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-md border border-border/30 flex items-center gap-2 text-[0.8125rem]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span className="text-muted-foreground/60">Думаю...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-border/30 shrink-0 bg-slate-50/30">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Задайте вопрос Совунье..."
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 bg-white dark:bg-muted border border-border/40 rounded-xl text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-amber-300/30 focus:border-amber-300 disabled:opacity-50 placeholder:text-muted-foreground/30 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3.5 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}