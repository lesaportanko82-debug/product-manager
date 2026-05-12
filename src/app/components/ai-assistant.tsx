import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { X, Send, Loader2, MessageCircle, Trash2 } from "lucide-react";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface Message {
  role: "user" | "assistant";
  content: string;
  mood?: OwlMood;
  isError?: boolean;
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

// Hedgehog mascot with emotional states
export type OwlMood =
  | "neutral"
  | "happy"
  | "thinking"
  | "celebrating"
  | "encouraging"
  | "sad"
  | "surprised"
  | "sleeping";

interface OwlMascotProps {
  size?: number;
  className?: string;
  animate?: boolean;
  mood?: OwlMood;
}

// Backwards-compatible export name. Renders the new hedgehog mascot Ёжуня.
export function OwlMascot({ size = 32, className = "", animate = false, mood = "neutral" }: OwlMascotProps) {
  // Eye variations based on mood
  const getEyes = () => {
    switch (mood) {
      case "happy":
        return (
          <>
            <path d="M24 38 Q27 35 30 38" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M34 38 Q37 35 40 38" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case "thinking":
        return (
          <>
            <circle cx="27" cy="38" r="2.5" fill="#1e293b" />
            <circle cx="28" cy="37" r="0.9" fill="white" />
            <path d="M34 38 Q37 36 40 38" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </>
        );
      case "celebrating":
        return (
          <>
            <circle cx="27" cy="37" r="3" fill="#1e293b" />
            <circle cx="28" cy="36" r="1.1" fill="white" />
            <circle cx="37" cy="37" r="3" fill="#1e293b" />
            <circle cx="38" cy="36" r="1.1" fill="white" />
            <path d="M23 33 L25 35" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" />
            <path d="M41 33 L39 35" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" />
          </>
        );
      case "encouraging":
        return (
          <>
            <circle cx="27" cy="37" r="2.8" fill="#1e293b" />
            <circle cx="28" cy="36" r="1" fill="white" />
            <circle cx="37" cy="37" r="2.8" fill="#1e293b" />
            <circle cx="38" cy="36" r="1" fill="white" />
            <path d="M22 33 Q25 31 28 33" stroke="#1e293b" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M36 33 Q39 31 42 33" stroke="#1e293b" strokeWidth="1" fill="none" strokeLinecap="round" />
          </>
        );
      case "sad":
        return (
          <>
            {/* Droopy eyes */}
            <circle cx="27" cy="39" r="2.4" fill="#1e293b" />
            <circle cx="28" cy="38" r="0.8" fill="white" />
            <circle cx="37" cy="39" r="2.4" fill="#1e293b" />
            <circle cx="38" cy="38" r="0.8" fill="white" />
            {/* Sad brows */}
            <path d="M22 34 Q25 36 28 35" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <path d="M36 35 Q39 36 42 34" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            {/* Tear */}
            <path d="M26 41 Q25.5 43 26 44 Q26.5 43 26 41 Z" fill="#60a5fa" opacity="0.85" />
          </>
        );
      case "surprised":
        return (
          <>
            {/* Wide round eyes */}
            <circle cx="27" cy="38" r="3.4" fill="white" stroke="#1e293b" strokeWidth="0.6" />
            <circle cx="27" cy="38" r="2.2" fill="#1e293b" />
            <circle cx="28" cy="37" r="0.9" fill="white" />
            <circle cx="37" cy="38" r="3.4" fill="white" stroke="#1e293b" strokeWidth="0.6" />
            <circle cx="37" cy="38" r="2.2" fill="#1e293b" />
            <circle cx="38" cy="37" r="0.9" fill="white" />
            {/* Raised brows */}
            <path d="M22 32 Q25 30 28 32" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <path d="M36 32 Q39 30 42 32" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          </>
        );
      case "sleeping":
        return (
          <>
            {/* Closed sleeping eyes */}
            <path d="M23 38 Q27 41 31 38" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M33 38 Q37 41 41 38" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </>
        );
      default:
        return (
          <>
            <circle cx="27" cy="38" r="2.5" fill="#1e293b" />
            <circle cx="28" cy="37" r="0.9" fill="white" />
            <circle cx="37" cy="38" r="2.5" fill="#1e293b" />
            <circle cx="38" cy="37" r="0.9" fill="white" />
          </>
        );
    }
  };

  const getMouth = () => {
    switch (mood) {
      case "happy":
      case "celebrating":
        return <path d="M29 47 Q32 51 35 47" stroke="#1e293b" strokeWidth="1.4" fill="#fda4af" strokeLinecap="round" />;
      case "thinking":
        return <path d="M30 48 L34 48" stroke="#1e293b" strokeWidth="1.4" fill="none" strokeLinecap="round" />;
      case "encouraging":
        return <path d="M29 47 Q32 49 35 47" stroke="#1e293b" strokeWidth="1.3" fill="none" strokeLinecap="round" />;
      case "sad":
        return <path d="M29 49 Q32 46 35 49" stroke="#1e293b" strokeWidth="1.4" fill="none" strokeLinecap="round" />;
      case "surprised":
        return <ellipse cx="32" cy="48" rx="1.6" ry="2.2" fill="#1e293b" />;
      case "sleeping":
        return <path d="M30 48 Q32 49 34 48" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />;
      default:
        return <path d="M30 47 Q32 49 34 47" stroke="#1e293b" strokeWidth="1.2" fill="none" strokeLinecap="round" />;
    }
  };

  // Spike triangles around the top/back of the body
  const spikes = [
    "M10 32 L6 22 L14 26 Z",
    "M14 24 L12 12 L20 20 Z",
    "M20 20 L20 8 L26 17 Z",
    "M26 17 L28 6 L32 15 Z",
    "M32 15 L36 6 L38 17 Z",
    "M38 17 L44 8 L44 20 Z",
    "M44 20 L52 12 L50 24 Z",
    "M50 26 L58 22 L54 32 Z",
  ];

  const hedgehog = (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Spiky back/halo */}
      <path
        d="M8 40 Q6 22 18 14 Q26 8 32 8 Q38 8 46 14 Q58 22 56 40 Q54 56 32 58 Q10 56 8 40 Z"
        fill="url(#hhSpikeBody)"
      />
      {spikes.map((d, i) => (
        <path key={i} d={d} fill="url(#hhSpike)" stroke="#042f2e" strokeWidth="0.3" />
      ))}
      {/* Inner spike texture */}
      <path d="M18 28 L20 22 L22 28 Z" fill="#042f2e" opacity="0.55" />
      <path d="M28 22 L30 16 L32 22 Z" fill="#042f2e" opacity="0.55" />
      <path d="M40 22 L42 16 L44 22 Z" fill="#042f2e" opacity="0.55" />
      <path d="M48 28 L50 22 L52 28 Z" fill="#042f2e" opacity="0.55" />

      {/* Face (light snout area) */}
      <ellipse cx="32" cy="42" rx="15" ry="13" fill="url(#hhFace)" />
      {/* Soft cheeks gradient */}
      <ellipse cx="32" cy="44" rx="13" ry="10" fill="#ccfbf1" opacity="0.6" />

      {/* Ears */}
      <ellipse cx="15" cy="34" rx="2.6" ry="3.4" fill="#2dd4bf" />
      <ellipse cx="15.3" cy="34.2" rx="1.4" ry="2.2" fill="#fda4af" opacity="0.75" />
      <ellipse cx="49" cy="34" rx="2.6" ry="3.4" fill="#2dd4bf" />
      <ellipse cx="48.7" cy="34.2" rx="1.4" ry="2.2" fill="#fda4af" opacity="0.75" />

      {/* Eyes */}
      {getEyes()}

      {/* Nose tip */}
      <ellipse cx="32" cy="44" rx="2.4" ry="1.8" fill="#1e293b" />
      <circle cx="31.2" cy="43.4" r="0.6" fill="white" opacity="0.7" />

      {/* Mouth */}
      {getMouth()}

      {/* Blush */}
      <circle cx="21" cy="46" r="2.4" fill="#fda4af" opacity={mood === "happy" || mood === "celebrating" ? "0.55" : "0.35"} />
      <circle cx="43" cy="46" r="2.4" fill="#fda4af" opacity={mood === "happy" || mood === "celebrating" ? "0.55" : "0.35"} />

      {/* Feet */}
      <ellipse cx="22" cy="58" rx="4" ry="2.4" fill="#2dd4bf" />
      <ellipse cx="42" cy="58" rx="4" ry="2.4" fill="#2dd4bf" />
      <circle cx="20" cy="58.5" r="0.6" fill="#134e4a" />
      <circle cx="22" cy="59" r="0.6" fill="#134e4a" />
      <circle cx="24" cy="58.5" r="0.6" fill="#134e4a" />
      <circle cx="40" cy="58.5" r="0.6" fill="#134e4a" />
      <circle cx="42" cy="59" r="0.6" fill="#134e4a" />
      <circle cx="44" cy="58.5" r="0.6" fill="#134e4a" />

      {/* Sparkles for celebrating mood */}
      {mood === "celebrating" && (
        <>
          <circle cx="9" cy="14" r="1.4" fill="#14b8a6" opacity="0.85" />
          <circle cx="55" cy="16" r="1.2" fill="#5eead4" opacity="0.8" />
          <circle cx="14" cy="50" r="1" fill="#14b8a6" opacity="0.65" />
          <path d="M6 22 L7 24 L9 25 L7 26 L6 28 L5 26 L3 25 L5 24 Z" fill="#14b8a6" opacity="0.75" />
          <path d="M57 10 L58 12 L60 13 L58 14 L57 16 L56 14 L54 13 L56 12 Z" fill="#5eead4" opacity="0.7" />
        </>
      )}
      {/* Thought bubble for thinking mood */}
      {mood === "thinking" && (
        <>
          <circle cx="52" cy="14" r="3" fill="white" stroke="#1e293b" strokeWidth="0.7" opacity="0.95" />
          <circle cx="48" cy="20" r="1.4" fill="white" stroke="#1e293b" strokeWidth="0.5" opacity="0.95" />
          <text x="52" y="16" textAnchor="middle" fontSize="4" fill="#1e293b" fontWeight="bold">?</text>
        </>
      )}
      {/* Zzz for sleeping mood */}
      {mood === "sleeping" && (
        <>
          <text x="50" y="14" textAnchor="middle" fontSize="7" fill="#64748b" fontWeight="bold" opacity="0.85">z</text>
          <text x="55" y="20" textAnchor="middle" fontSize="5" fill="#64748b" fontWeight="bold" opacity="0.7">z</text>
          <text x="58" y="25" textAnchor="middle" fontSize="3.5" fill="#64748b" fontWeight="bold" opacity="0.55">z</text>
        </>
      )}
      {/* Exclamation for surprised mood */}
      {mood === "surprised" && (
        <>
          <rect x="50" y="10" width="2.5" height="7" rx="1" fill="#0d9488" />
          <circle cx="51.2" cy="20" r="1.2" fill="#0d9488" />
        </>
      )}
      {/* Subtle rain cloud for sad mood */}
      {mood === "sad" && (
        <>
          <ellipse cx="52" cy="14" rx="5" ry="2.6" fill="#cbd5e1" opacity="0.9" />
          <ellipse cx="48.5" cy="13" rx="2.4" ry="2" fill="#cbd5e1" opacity="0.9" />
          <ellipse cx="55" cy="13.5" rx="2.6" ry="2.2" fill="#cbd5e1" opacity="0.9" />
          <path d="M50 18 L49 21" stroke="#60a5fa" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M53 18 L52 21" stroke="#60a5fa" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M56 18 L55 21" stroke="#60a5fa" strokeWidth="0.9" strokeLinecap="round" />
        </>
      )}

      <defs>
        <linearGradient id="hhSpikeBody" x1="32" y1="8" x2="32" y2="58">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#134e4a" />
        </linearGradient>
        <linearGradient id="hhSpike" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#115e59" />
          <stop offset="100%" stopColor="#042f2e" />
        </linearGradient>
        <radialGradient id="hhFace" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#5eead4" />
        </radialGradient>
      </defs>
    </svg>
  );

  if (!animate) return hedgehog;

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
      case "sad":
        return {
          y: [0, 1.5, 0],
          rotate: [0, -1, 1, 0],
        };
      case "surprised":
        return {
          y: [0, -2, 0, -1, 0],
          scale: [1, 1.06, 1],
        };
      case "sleeping":
        return {
          y: [0, -1, 0],
          scale: [1, 1.015, 1],
        };
      default:
        return {
          y: [0, -3, 0],
        };
    }
  };

  const getDuration = () => {
    switch (mood) {
      case "celebrating": return 1.5;
      case "surprised":   return 1.2;
      case "sleeping":    return 4;
      case "sad":         return 3.5;
      default:            return 2.5;
    }
  };

  return (
    <motion.div
      animate={getAnimation()}
      transition={{
        duration: getDuration(),
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {hedgehog}
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
            { role: "assistant", content: "Ой, что-то пошло не так — попробуйте ещё раз 🥺", mood: "sad", isError: true },
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
        title="Ёжуня - AI-ассистент"
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
              <p className="text-[0.8125rem] font-semibold text-amber-900">Ёжуня</p>
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
              <p className="text-[0.9375rem] font-semibold text-foreground mb-1">Привет! Я Ёжуня</p>
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
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-1 mr-2 ${
                  msg.isError ? "bg-rose-50 border-rose-200/60" : "bg-amber-50 border-amber-100/60"
                }`}>
                  <OwlMascot size={18} mood={msg.mood ?? "neutral"} />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[0.8125rem] leading-relaxed ${
                msg.role === "user"
                  ? "bg-teal-500 text-white rounded-br-md"
                  : msg.isError
                    ? "bg-rose-50/60 text-rose-900 border border-rose-200/40 rounded-bl-md"
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
                <OwlMascot size={18} mood="thinking" animate />
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
              placeholder="Задайте вопрос Ёжуне..."
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