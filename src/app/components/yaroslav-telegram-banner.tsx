import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { yaroslavPhotoDataUrl } from "../../imports/yaroslav-shuvaev-data";

// Telegram paper-plane SVG (matches Telegram brand icon)
function TelegramIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function YaroslavTelegramBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0d6e7a 0%, #0a5a65 40%, #084d57 100%)" }}
    >
      {/* Subtle radial glow top-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 90% -10%, rgba(0,220,220,0.13) 0%, transparent 70%)",
        }}
      />

      {/* Decorative send-arrow watermark */}
      <div className="absolute bottom-4 right-40 opacity-[0.06] pointer-events-none">
        <TelegramIcon className="w-28 h-28 text-white" />
      </div>

      <div className="relative flex items-center justify-between gap-4 px-7 py-8">

        {/* LEFT: text + button */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-white font-bold leading-tight mb-3"
            style={{ fontSize: "clamp(1.125rem, 3vw, 1.35rem)" }}
          >
            Хотите глубже<br />погрузиться в тему?
          </h3>
          <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-xs">
            Переходите на канал Ярослава<br />
            и продолжайте обучение уже<br />
            в рамках полного курса.
          </p>

          <motion.a
            href="https://t.me/yaroslav_shuvaev"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03, filter: "brightness(1.1)" }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full font-semibold text-[0.9375rem] text-teal-900 transition-all cursor-pointer select-none"
            style={{
              background: "linear-gradient(90deg, #2dd4d4 0%, #5ce8c8 100%)",
              boxShadow: "0 4px 18px rgba(45,212,212,0.35)",
            }}
          >
            <TelegramIcon className="w-5 h-5 text-teal-900" />
            Вперёд на канал
            <ArrowRight className="w-4 h-4" />
          </motion.a>
        </div>

        {/* RIGHT: avatar with gradient ring + tg badge */}
        <div className="shrink-0 relative hidden sm:block">
          {/* Outer glow ring */}
          <div
            className="w-32 h-32 rounded-full p-[3px]"
            style={{
              background:
                "linear-gradient(135deg, #f472b6 0%, #f97316 40%, #fbbf24 70%, #a78bfa 100%)",
              boxShadow: "0 0 30px rgba(244,114,182,0.4), 0 0 60px rgba(251,191,36,0.2)",
            }}
          >
            {/* White separator */}
            <div className="w-full h-full rounded-full p-[2px] bg-white">
              <img
                src={yaroslavPhotoDataUrl}
                alt="Ярослав Шуваев"
                className="w-full h-full rounded-full object-cover object-top grayscale"
              />
            </div>
          </div>

          {/* Telegram badge */}
          <div
            className="absolute bottom-1 right-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-[#084d57]"
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)" }}
          >
            <TelegramIcon className="w-5 h-5 text-white" />
          </div>
        </div>

      </div>
    </motion.div>
  );
}
