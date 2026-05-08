import { useState, useCallback, useRef, useEffect } from "react";
import { Headphones, Loader2, Pause, Play, Volume2, SkipBack, SkipForward } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { motion, AnimatePresence } from "motion/react";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa`;

interface Props {
  lessonTitle: string;
  lessonContent: string[];
}

function cleanTextForTTS(title: string, content: string[]): string {
  // Clean content for TTS: remove markdown bold/italic, remove --- dividers, remove URLs
  const cleaned = content.map(p =>
    p.replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/---\s*(.*?)\s*---/g, "$1")
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/\\n/g, ". ")
      .replace(/\n/g, ". ")
      .replace(/•/g, ",")
      .replace(/\d+\.\s/g, ". ")
  );
  // Build full text: title + all content
  const full = `${title}. ${cleaned.join(". ")}`;
  // OpenAI TTS limit is ~4096 chars per request. Truncate intelligently at sentence boundary.
  if (full.length <= 4000) return full;
  const truncated = full.slice(0, 4000);
  const lastDot = truncated.lastIndexOf(".");
  return lastDot > 3000 ? truncated.slice(0, lastDot + 1) : truncated;
}

export function AudioLessonButton({ lessonTitle, lessonContent }: Props) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimer = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
        if (progressTimer.current) clearInterval(progressTimer.current);
      } else {
        audioRef.current.play();
        setPlaying(true);
        setExpanded(true);
        progressTimer.current = setInterval(updateProgress, 250);
      }
      return;
    }

    setLoading(true);
    try {
      const text = cleanTextForTTS(lessonTitle, lessonContent);
      const res = await fetch(`${API}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audio) {
        const binaryStr = atob(data.audio);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setPlaying(false);
          if (progressTimer.current) clearInterval(progressTimer.current);
        };
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.playbackRate = speed;
        audio.play();
        setPlaying(true);
        setExpanded(true);
        progressTimer.current = setInterval(updateProgress, 250);
      }
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setLoading(false);
    }
  }, [audioUrl, playing, lessonTitle, lessonContent, speed, updateProgress]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setProgress(val);
    }
  }, []);

  const handleSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [speed]);

  const skip = useCallback((delta: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + delta, duration));
    }
  }, [duration]);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Compact button
  if (!expanded || !audioUrl) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.6875rem] font-medium transition-all ${
          playing
            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
            : audioUrl
            ? "bg-muted/50 text-foreground hover:bg-teal-50 dark:hover:bg-teal-900/20"
            : "bg-muted/30 text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
        }`}
        title="Прослушать урок (OpenAI TTS)"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : playing ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Headphones className="w-3 h-3" />
        )}
        {loading ? "Генерация..." : playing ? "Пауза" : "🎧 Прослушать"}
      </button>
    );
  }

  // Expanded player
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-border/40 p-3 mb-2"
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button onClick={handleGenerate} className="w-8 h-8 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shrink-0 transition-colors">
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Progress */}
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 rounded-full appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-[0.5625rem] text-muted-foreground/60 mt-0.5 tabular-nums">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Skip buttons */}
        <button onClick={() => skip(-10)} className="p-1 text-muted-foreground/50 hover:text-foreground" title="-10 сек">
          <SkipBack className="w-3 h-3" />
        </button>
        <button onClick={() => skip(10)} className="p-1 text-muted-foreground/50 hover:text-foreground" title="+10 сек">
          <SkipForward className="w-3 h-3" />
        </button>

        {/* Speed */}
        <button onClick={handleSpeed} className="px-1.5 py-0.5 rounded text-[0.5625rem] font-bold text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors tabular-nums" title="Скорость воспроизведения">
          {speed}×
        </button>

        {/* Collapse */}
        <button onClick={() => setExpanded(false)} className="text-[0.5625rem] text-muted-foreground/40 hover:text-foreground">
          ✕
        </button>
      </div>
    </motion.div>
  );
}