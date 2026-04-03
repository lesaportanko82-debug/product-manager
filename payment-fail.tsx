import { motion } from "motion/react";
import { XCircle, RefreshCw, MessageCircle, ArrowLeft, CreditCard } from "lucide-react";

interface PaymentFailPageProps {
  onRetry: () => void;
  onBack: () => void;
}

export function PaymentFailPage({ onRetry, onBack }: PaymentFailPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-border/20">

          {/* Header */}
          <div className="relative bg-gradient-to-br from-red-500 via-rose-500 to-red-600 px-6 pt-8 pb-10 text-center overflow-hidden">
            <div className="absolute top-3 right-4 opacity-10">
              <XCircle className="w-14 h-14 text-white" />
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.45, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur mx-auto mb-4 flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-white font-bold text-2xl leading-tight">
              Оплата не завершена
            </h1>
            <p className="text-white/75 text-sm mt-2">
              Платёж был отменён или произошла ошибка
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3.5">
              <p className="text-[0.875rem] text-foreground/80 leading-relaxed">
                Не переживайте — деньги не были списаны. Вы можете попробовать оплатить снова или выбрать другой способ оплаты.
              </p>
            </div>

            {/* Retry button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl
                bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600
                text-white font-semibold text-[1rem] transition-all shadow-lg shadow-teal-500/20"
            >
              <CreditCard className="w-5 h-5" />
              Попробовать снова
            </motion.button>

            {/* Back to course */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                border border-border hover:bg-slate-50 dark:hover:bg-slate-800
                text-foreground/70 hover:text-foreground text-[0.9375rem] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к бесплатным урокам
            </motion.button>

            {/* Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                text-[0.8125rem] text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Обновить страницу
            </button>

            {/* Telegram */}
            <div className="pt-1 border-t border-border/40">
              <button
                onClick={() => window.open("https://t.me/ohh_lessya", "_blank")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  bg-[#2AABEE] hover:bg-[#1a98d5] text-white font-medium text-[0.875rem] transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Написать администратору
                <span className="text-white/80 font-normal">@ohh_lessya</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          product-intensive.com — Обучение продакт-менеджменту
        </p>
      </motion.div>
    </div>
  );
}
