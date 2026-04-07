import { motion } from "motion/react";
import {
  Eye, UserPlus, LogIn, Brain, BookOpen, Trophy,
  Zap, Sparkles, Lock, CheckCircle, ArrowRight, Monitor
} from "lucide-react";

interface AuthModeSelectorProps {
  onDemoMode: () => void;
  onSignup: () => void;
  onLogin: () => void;
}

export function AuthModeSelector({ onDemoMode, onSignup, onLogin }: AuthModeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 rounded-full">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-medium text-violet-800 dark:text-violet-300">
              Обучающая платформа по продакт-менеджменту
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            PM Академия
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            60+ уроков по 38 модулям с AI-коучем, геймификацией и практическими кейсами
          </p>
        </motion.div>

        {/* Mode Cards */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-700/40 max-w-2xl mx-auto"
        >
          <Monitor className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-amber-800 dark:text-amber-300 leading-relaxed">
            Для максимального комфорта рекомендуем проходить курс с компьютера или ноутбука — так вам будет удобнее работать с материалами и выполнять задания.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Demo Mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <button
              onClick={onDemoMode}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl group-hover:scale-110 transition-transform">
                  <Eye className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                  БЕСПЛАТНО
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Демо-версия
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Попробуйте платформу без регистрации
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Первый блок курса (4 модуля)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">AI-ассистент Совунья</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Глоссарий и флеш-карты</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Lock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-gray-500">Прогресс не сохраняется</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Попробовать сейчас</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </motion.div>

          {/* Signup Mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg z-10">
              РЕКОМЕНДУЕМ
            </div>
            <button
              onClick={onSignup}
              className="w-full text-left bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-violet-400 dark:border-violet-500 group transform hover:scale-105"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                  ПОЛНЫЙ ДОСТУП
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2 text-white">
                Регистрация
              </h3>
              <p className="text-white/90 text-sm mb-4">
                Создайте аккаунт и получите доступ ко всему
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white">Все 38 модулей курса</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white">Полная геймификация (15+ бейджей)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white">Сертификат после финального экзамена</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-semibold">Прогресс синхронизируется в облаке</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-white font-bold group-hover:translate-x-1 transition-transform">
                <span>Начать обучение</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </motion.div>

          {/* Login Mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <button
              onClick={onLogin}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform">
                  <LogIn className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Вход
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Уже есть аккаунт? Продолжите обучение
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Ваш сохранённый прогресс</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Заработанные бейджи</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Все ваши заметки</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">Достижения и статистика</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Войти в аккаунт</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </motion.div>
        </div>

        {/* Features Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-600" />
              <span>AI-коуч разбирает кейсы</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-600" />
              <span>60+ практических уроков</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-violet-600" />
              <span>Система достижений</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}