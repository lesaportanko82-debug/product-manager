import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, X, Mail, ChevronRight } from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "pp-general",       label: "Общие положения" },
  { id: "pp-operator",      label: "Оператор данных" },
  { id: "pp-data",          label: "Какие данные мы собираем" },
  { id: "pp-purposes",      label: "Цели обработки" },
  { id: "pp-marketing",     label: "Рассылки и маркетинг" },
  { id: "pp-legal",         label: "Правовые основания" },
  { id: "pp-third-party",   label: "Передача третьим лицам" },
  { id: "pp-international", label: "Международная передача" },
  { id: "pp-storage",       label: "Хранение данных" },
  { id: "pp-security",      label: "Защита данных" },
  { id: "pp-rights",        label: "Права пользователя" },
  { id: "pp-cookies",       label: "Cookies" },
  { id: "pp-changes",       label: "Изменения политики" },
  { id: "pp-contacts",      label: "Контакты" },
];

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const scrollTo = (id: string) => {
    const container = scrollRef.current;
    const el = document.getElementById(id);
    if (container && el) {
      const top = el.offsetTop - 24;
      container.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="pp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="pp-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/20 border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 sm:px-7 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[1rem] font-bold text-slate-900 dark:text-white leading-tight">
                    Политика конфиденциальности
                  </h2>
                  <p className="text-[0.6875rem] text-slate-400 dark:text-slate-500 mt-0.5">
                    Product Intensive · вступила в силу 30.03.2026
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 min-h-0">
                {/* Sidebar nav — visible on md+ */}
                <aside className="hidden md:flex flex-col w-[200px] shrink-0 border-r border-slate-100 dark:border-slate-800 py-4 overflow-y-auto">
                  <p className="px-4 text-[0.625rem] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Разделы
                  </p>
                  <nav className="space-y-0.5 px-2">
                    {SECTIONS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => scrollTo(s.id)}
                        className="w-full text-left flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.75rem] text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all group"
                      >
                        <ChevronRight className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {s.label}
                      </button>
                    ))}
                  </nav>
                </aside>

                {/* Content scroll area */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-8"
                >
                  {/* 1 */}
                  <Section id="pp-general" number="1" title="Общие положения">
                    <Prose>
                      Настоящая Политика конфиденциальности регулирует порядок обработки и защиты
                      персональных данных пользователей сайта <strong>Product Intensive</strong>.
                    </Prose>
                    <Prose>
                      Используя сайт, пользователь подтверждает согласие на обработку своих
                      персональных данных в соответствии с данной Политикой.
                    </Prose>
                  </Section>

                  {/* 2 */}
                  <Section id="pp-operator" number="2" title="Оператор персональных данных">
                    <Prose>Оператор персональных данных:</Prose>
                    <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">Product Intensive</p>
                      <a
                        href="mailto:lifesyncspace@gmail.com"
                        className="inline-flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        lifesyncspace@gmail.com
                      </a>
                    </div>
                  </Section>

                  {/* 3 */}
                  <Section id="pp-data" number="3" title="Какие данные мы собираем">
                    <SubHeading>3.1. Данные, предоставляемые пользователем:</SubHeading>
                    <BulletList items={["Имя", "Email", "Номер телефона (при наличии)", "Информация, указанная при регистрации или оплате", "Иные данные, вводимые в формах на сайте"]} />
                    <SubHeading className="mt-4">3.2. Автоматически собираемые данные:</SubHeading>
                    <BulletList items={["IP-адрес", "Cookies", "Информация о браузере и устройстве", "Данные о действиях на сайте (просмотры страниц, клики, время посещения)"]} />
                  </Section>

                  {/* 4 */}
                  <Section id="pp-purposes" number="4" title="Цели обработки данных">
                    <Prose>Персональные данные используются для:</Prose>
                    <BulletList items={["Предоставления доступа к продуктам и материалам", "Обработки заявок и оплат", "Обратной связи с пользователем", "Отправки сервисных уведомлений", "Отправки информационных и рекламных материалов", "Улучшения качества сервиса и контента", "Аналитики поведения пользователей"]} />
                  </Section>

                  {/* 5 */}
                  <Section id="pp-marketing" number="5" title="Рассылки и маркетинг">
                    <Prose>Оставляя свои данные, пользователь соглашается на получение:</Prose>
                    <BulletList items={["Email-рассылок", "Уведомлений об обновлениях и новых продуктах", "Рекламных и информационных сообщений"]} />
                    <Prose className="mt-3">Пользователь может отказаться от рассылки:</Prose>
                    <BulletList items={["Через ссылку отписки в письме", "Написав на lifesyncspace@gmail.com"]} />
                  </Section>

                  {/* 6 */}
                  <Section id="pp-legal" number="6" title="Правовые основания обработки">
                    <Prose>Обработка персональных данных осуществляется на основании:</Prose>
                    <BulletList items={["Согласия пользователя", "Необходимости исполнения обязательств перед пользователем", "Законных интересов оператора (маркетинг, аналитика)"]} />
                  </Section>

                  {/* 7 */}
                  <Section id="pp-third-party" number="7" title="Передача данных третьим лицам">
                    <Prose>Персональные данные могут передаваться следующим категориям сервисов:</Prose>
                    <BulletList items={["Платёжные системы", "Сервисы email-рассылок", "Аналитические сервисы", "Хостинг и технические провайдеры"]} />
                    <Prose className="mt-3">Все такие сервисы обязуются соблюдать требования по защите данных.</Prose>
                  </Section>

                  {/* 8 */}
                  <Section id="pp-international" number="8" title="Международная передача данных">
                    <Prose>
                      В случае использования зарубежных сервисов данные могут передаваться за пределы
                      страны пользователя, включая страны Европейской экономической зоны и иные юрисдикции.
                    </Prose>
                  </Section>

                  {/* 9 */}
                  <Section id="pp-storage" number="9" title="Хранение данных">
                    <Prose>Персональные данные хранятся:</Prose>
                    <BulletList items={["До достижения целей обработки", "Либо до момента отзыва согласия пользователем"]} />
                  </Section>

                  {/* 10 */}
                  <Section id="pp-security" number="10" title="Защита данных">
                    <Prose>Оператор принимает разумные технические и организационные меры для защиты данных от:</Prose>
                    <BulletList items={["Несанкционированного доступа", "Утраты", "Изменения", "Раскрытия"]} />
                  </Section>

                  {/* 11 */}
                  <Section id="pp-rights" number="11" title="Права пользователя">
                    <Prose>Пользователь имеет право:</Prose>
                    <BulletList items={["Получить информацию о своих данных", "Запросить исправление или удаление", "Отозвать согласие на обработку", "Ограничить обработку данных"]} />
                  </Section>

                  {/* 12 */}
                  <Section id="pp-cookies" number="12" title="Использование файлов cookies">
                    <Prose>Сайт использует cookies для:</Prose>
                    <BulletList items={["Корректной работы сайта", "Аналитики", "Персонализации контента"]} />
                    <Prose className="mt-3">Пользователь может отключить cookies в настройках браузера.</Prose>
                  </Section>

                  {/* 13 */}
                  <Section id="pp-changes" number="13" title="Изменения политики">
                    <Prose>
                      Оператор вправе вносить изменения в Политику. Актуальная версия всегда доступна на сайте.
                    </Prose>
                  </Section>

                  {/* 14 */}
                  <Section id="pp-contacts" number="14" title="Контакты">
                    <Prose>По вопросам обработки персональных данных:</Prose>
                    <div className="mt-2">
                      <a
                        href="mailto:lifesyncspace@gmail.com"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        lifesyncspace@gmail.com
                      </a>
                    </div>
                  </Section>

                  {/* Footer note */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[0.6875rem] text-slate-400 text-center">
                      © {new Date().getFullYear()} Product Intensive. Все права защищены.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 sm:px-7 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function Section({ id, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="shrink-0 w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center text-[0.6875rem] font-bold text-teal-600 dark:text-teal-400">
          {number}
        </span>
        <h3 className="text-[0.9375rem] font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-2 pl-0.5">{children}</div>
    </section>
  );
}

function SubHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[0.8125rem] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ${className}`}>
      {children}
    </p>
  );
}

function Prose({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[0.875rem] text-slate-600 dark:text-slate-400 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[0.875rem] text-slate-600 dark:text-slate-400">
          <span className="mt-[0.4rem] w-1.5 h-1.5 rounded-full bg-teal-400 dark:bg-teal-500 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}
