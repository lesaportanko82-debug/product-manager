import { motion } from "motion/react";
import { yaroslavPhotoDataUrl } from "../../imports/yaroslav-shuvaev-data";
import { BookOpen, GraduationCap, Bot } from "lucide-react";

export function YaroslavAuthorCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "#0f5f65" }}
    >
      <div className="flex">

        {/* ── Photo ── */}
        <div className="relative shrink-0 w-[42%] overflow-hidden bg-[#1a2830]">
          <img
            src={yaroslavPhotoDataUrl}
            alt="Ярослав Шуваев"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              minHeight: 320,
            }}
          />
        </div>

        {/* ── Info panel ── */}
        <div className="flex-1 flex flex-col justify-between px-6 py-6 gap-4">

          {/* Top section */}
          <div className="flex flex-col gap-3">
            {/* Badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-widest text-white/80 border border-white/25">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4.26 10.147a60.44 60.44 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
                Партнёрский модуль
              </span>
            </div>

            {/* Name */}
            <div>
              <h3 className="text-[1.6rem] font-extrabold text-white leading-tight tracking-tight">
                Ярослав Шуваев
              </h3>
              <p className="text-sm text-white/60 mt-0.5 leading-snug">
                Продуктовый дизайнер<br />8 лет преподавания
              </p>
              {/* Accent line */}
              <div className="mt-2.5 w-8 h-0.5 rounded-full bg-teal-300/80" />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <p className="text-[0.8rem] text-white/75 leading-relaxed">
                Автор методологии «5 плоскостей Гарретта» для PM и AI-native подхода к дизайну.
              </p>
              <p className="text-[0.8rem] text-white/75 leading-relaxed">
                Работал с Альфа-Банком, МТС, Ростелекомом и 20+ корпорациями.
              </p>
            </div>
          </div>

          {/* ── Companies ── */}
          <div>
            <div className="h-px bg-white/10 mb-3" />
            <div className="flex items-center gap-4 flex-wrap">
              {/* Альфа-Банк */}
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="text-[0.9rem] font-black leading-none" style={{ fontFamily: "serif" }}>А</span>
                <span className="text-[0.65rem] font-semibold tracking-wide">Альфа-Банк</span>
              </div>
              {/* МТС */}
              <div className="flex items-center gap-1.5 text-white/70">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <ellipse cx="7" cy="7" rx="5" ry="6.5" fill="currentColor" fillOpacity="0.9"/>
                </svg>
                <span className="text-[0.65rem] font-semibold tracking-wide">МТС</span>
              </div>
              {/* Сбер */}
              <div className="flex items-center gap-1.5 text-white/70">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="7" r="5.5"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7l2 2 3-3"/>
                </svg>
                <span className="text-[0.65rem] font-semibold tracking-wide">СБЕР</span>
              </div>
              {/* Т-Банк */}
              <div className="flex items-center gap-1.5 text-white/70">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 2l4 2v4c0 2-4 4-4 4S3 10 3 8V4l4-2z"/>
                </svg>
                <span className="text-[0.65rem] font-semibold tracking-wide">Т-БАНК</span>
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div>
            <div className="h-px bg-white/10 mb-3" />
            <div className="flex items-stretch">
              {[
                { icon: <BookOpen className="w-4 h-4" />, text: "2 книги\nпо дизайну" },
                { icon: <GraduationCap className="w-4 h-4" />, text: "Karpov\nCourses" },
                { icon: <Bot className="w-4 h-4" />, text: "AI в\nenterprise" },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex-1 flex items-center">
                  {i > 0 && <div className="w-px self-stretch bg-white/15 mx-1 shrink-0" />}
                  <div className="flex-1 flex flex-col items-center gap-1.5 text-center px-1 py-0.5">
                    <span className="text-white/55">{icon}</span>
                    <span className="text-[0.63rem] text-white/55 leading-tight whitespace-pre-line font-medium">
                      {text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}