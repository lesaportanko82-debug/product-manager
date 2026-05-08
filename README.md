# 🦉 PM Академия — Обучающая платформа по продакт-менеджменту

**Современная образовательная платформа с 60+ уроками, AI-ассистентом Совунья и продвинутой геймификацией.**

---

## 📚 О проекте

PM Академия — это полноценный курс по продакт-менеджменту с фокусом на практику и реальные фреймворки. Студенты проходят путь от основ до продвинутых стратегий через интерактивные уроки, кейсы, симуляторы и AI-поддержку.

### Ключевые характеристики:
- **38 модулей** — от основ PM до AI-продуктов и venture building
- **60+ уроков** — практические фреймворки, а не теория
- **8 файлов данных курса** — модульная архитектура контента
- **25+ интерактивных фич** — от spaced repetition до проект-симулятора
- **AI-ассистент Совунья 🦉** — помощь 24/7 на базе GPT-4o-mini
- **Геймификация** — 15+ бейджей, система каштанов 🌰, уровни XP
- **Supabase Backend** — синхронизация прогресса, аутентификация, облачное хранение

---

## 🎯 Основные возможности

### 🦉 **AI-Ассистент Совунья**
- Отвечает на вопросы по материалу урока
- Использует продуктовые фреймворки (JTBD, RICE, AARRR, North Star)
- Приводит примеры из Figma, Notion, Airbnb, Uber, Stripe
- Поддерживает 5 эмоциональных состояний
- Работает на OpenAI GPT-4o-mini

[→ Подробнее о Совунье](./SOVUNYA_FEATURES.md)

### 📖 **Учебные модули**

**Блок 1: Основы (Модули 1-4)** — Бесплатно для демо-пользователей
- Введение в PM
- Product Discovery (JTBD, Customer Development)
- Product Strategy (Vision, OKR, Roadmap)
- Prioritization (RICE, Kano Model)

**Блок 2-10: Продвинутые темы**
- MVP & Prototyping
- Growth & Metrics (AARRR, North Star)
- Analytics & Data
- Product-Market Fit
- AI в продакте
- Venture Building

[→ Полный список модулей в файлах course-data](./src/app/components/)

### 🎮 **Геймификация**

**Система бейджей (15+):**
- 🏁 Первые шаги — первый урок завершён
- 📚 Книголюб — 5 уроков пройдено
- 🔥 Марафонец — 3 дня подряд
- 🧠 Мыслитель — 10 заметок создано
- 🦉 Друг Совы — 5 вопросов AI-ассистенту
- 🏆 Мастер PM — экзамен на 80%+

**Система каштанов 🌰:**
- Зарабатываются за завершение уроков, практик, кейсов
- Отображаются в профиле и на сертификате
- Используются для разблокировки бонусного контента

### 🧪 **Интерактивные инструменты**

- **Проект-Симулятор** — реальные PM-сценарии с ветвлением
- **Daily Challenge** — ежедневная практическая задача
- **Pomodoro Timer** — встроенный таймер для фокуса
- **Spaced Repetition** — интервальное повторение материала
- **Flashcards** — карточки для запоминания фреймворков
- **Interview Simulator** — подготовка к PM-интервью
- **PM-Coach** — сократовский метод коучинга
- **Command Palette** (Cmd+K) — быстрая навигация

### 💼 **Практика и проекты**

- **Capstone Projects** — финальные проекты с AI-оценкой
- **Product Audit** — анализ реальных продуктов
- **Portfolio Builder** — создание PM-портфолио
- **Resume Review** — помощь с составлением резюме

### 📊 **Прогресс и аналитика**

- **Progress Dashboard** — визуализация обучения
- **Learning Roadmap** — персональный план
- **Competency Radar** — оценка навыков
- **Leaderboard** — соревнование с другими студентами

### 🎓 **Сертификация**

- **Final Exam** — 30 вопросов + 3 кейса
- **Именной сертификат** — PDF с QR-кодом
- **Проходной балл** — 70%
- **Unlimited retakes** — можно пересдавать

---

## 🏗️ Архитектура

### Frontend
- **React** + **TypeScript**
- **Tailwind CSS v4** — стилизация
- **Motion** (Framer Motion) — анимации
- **React Router** — навигация
- **Lucide Icons** — иконки
- **Recharts** — графики и диаграммы

### Backend
- **Supabase** — БД, аутентификация, edge functions
- **Deno** — runtime для edge functions
- **Hono** — web framework для сервера
- **KV Store** — key-value хранилище для прогресса

### AI Integration
- **OpenAI API** (GPT-4o-mini)
- **Retry logic** — экспоненциальный backoff
- **Caching** — 24-часовое кеширование ответов
- **Fallback** — graceful degradation при ошибках

[→ Подробнее об интеграции OpenAI](./OPENAI_INTEGRATION.md)

### Монетизация
- **Freemium модель:**
  - Бесплатно: первые 3 урока модуля 1 (m1-l1, m1-l2, m1-l3)
  - Платно: все остальные уроки
- **Robokassa** — платёжная интеграция (RU/KZ)
- **Paywall** — экраны подписки с красивым дизайном

---

## 🎨 Цветовая палитра

### Основная палитра
- **Primary:** Teal (#0d9488 / #2dd4bf) — главный акцент
- **Background:** #fafbfc (светлая) / #0f172a (тёмная)
- **Accent:** Violet/Purple — для экранов входа и регистрации

### Специальные цвета
- **Success:** Emerald (#10b981)
- **Error:** Red (#dc2626)
- **Warning:** Amber
- **Info:** Blue

[→ Полная цветовая документация](./src/styles/theme.css)

---

## 🔐 Аутентификация

### Три режима входа:

1. **Демо-версия** (без регистрации)
   - Доступ только к первому блоку (4 модуля)
   - Ограниченные инструменты
   - Прогресс сохраняется локально

2. **Регистрация** (email + пароль)
   - Полный доступ к курсу (после оплаты)
   - Синхронизация в Supabase
   - Сертификат и финальный экзамен

3. **Вход** (для существующих пользователей)
   - Восстановление прогресса из облака

### Админ-панель
- **Пароль:** задаётся через переменную окружения `ADMIN_PASSWORD` в Supabase Secrets
- **Доступ:** статистика, пользователи, модерация

---

## 📂 Структура проекта

```
/
├── src/
│   ├── app/
│   │   ├── App.tsx                          # Главный компонент
│   │   └── components/
│   │       ├── course-data*.tsx             # 8 файлов данных курса
│   │       ├── ai-assistant.tsx             # Совунья AI
│   │       ├── lesson-view.tsx              # Просмотр урока
│   │       ├── final-exam.tsx               # Финальный экзамен
│   │       ├── gamification.tsx             # Бейджи и XP
│   │       ├── auth-mode-selector.tsx       # Экран входа
│   │       ├── command-palette.tsx          # Cmd+K поиск
│   │       ├── pomodoro.tsx                 # Pomodoro таймер
│   │       └── ...                          # 50+ компонентов
│   ├── styles/
│   │   ├── theme.css                        # Цветовая палитра
│   │   ├── fonts.css                        # Импорты шрифтов
│   │   └── tailwind.css                     # Tailwind v4
│   └── imports/                             # Дополнительные материалы
├── supabase/
│   └── functions/
│       └── server/
│           ├── index.tsx                    # Главный сервер
│           ├── ai-chat-handler.tsx          # AI чат
│           ├── sovunya-system-prompt.tsx    # Промпт Совуньи
│           ├── openai-config.tsx            # Конфиг OpenAI
│           ├── ai-helpers.tsx               # Retry, cache
│           └── kv_store.tsx                 # KV хранилище
├── OPENAI_INTEGRATION.md                    # Документация OpenAI
├── SOVUNYA_FEATURES.md                      # О Совунье
├── OPENAI_SETUP_SUMMARY.md                  # Итоговая сводка
└── README.md                                # Этот файл
```

---

## 🚀 Запуск проекта

### Требования:
- Node.js 18+
- pnpm (или npm)

### Установка:
```bash
# Клонировать репозиторий (если есть)
git clone <repo-url>

# Установить зависимости
pnpm install

# Запустить dev-сервер
pnpm dev
```

### Переменные окружения:
Настроены в Supabase Secrets:
- `OPENAI_API_KEY` — ключ OpenAI API
- `SUPABASE_URL` — URL проекта Supabase
- `SUPABASE_ANON_KEY` — публичный ключ
- `SUPABASE_SERVICE_ROLE_KEY` — приватный ключ
- `ROBOKASSA_*` — параметры Robokassa

---

## 📊 Статистика проекта

- **Строк кода:** 50,000+
- **Компонентов React:** 70+
- **API эндпоинтов:** 20+
- **Уроков:** 60+
- **Бейджей:** 15+
- **Фреймворков PM:** 30+

---

## 🛠️ Технологический стек

### Core
- React 18
- TypeScript
- Vite

### UI/UX
- Tailwind CSS v4
- Motion (Framer Motion)
- Lucide Icons
- Recharts

### Backend
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Deno
- Hono

### AI
- OpenAI API (GPT-4o-mini)

### Payment
- Robokassa

---

## 📝 Критические файлы (не редактировать через fast_apply)

Эти файлы следует редактировать только через `edit_tool`:
- `lesson-view.tsx`
- `final-exam.tsx`
- `interactive-progress.ts`

---

## 🐛 Известные особенности

1. **Первые 3 урока бесплатны:** m1-l1, m1-l2, m1-l3
2. **Админ-панель:** пароль задаётся через `ADMIN_PASSWORD` в Supabase Secrets
3. **Supabase Project ID:** `bjhsgjsxhvwtuerahuha`
4. **Robokassa Test Mode:** настроен через env

---

## 📚 Дополнительная документация

- [OpenAI Integration](./OPENAI_INTEGRATION.md) — техническая документация AI
- [Sovunya Features](./SOVUNYA_FEATURES.md) — возможности Совуньи
- [OpenAI Setup Summary](./OPENAI_SETUP_SUMMARY.md) — итоговая сводка интеграции
- [Production Audit](./PRODUCTION_AUDIT_SUMMARY.md) — аудит перед запуском

---

## 🤝 Поддержка

Если возникли вопросы или проблемы:
1. Проверьте документацию выше
2. Откройте админ-панель (пароль из переменной `ADMIN_PASSWORD`)
3. Проверьте health check: `/functions/v1/make-server-279b4dfa/health/openai`

---

## 📅 История обновлений

### v2.0 — 2 апреля 2026
- ✅ Полная интеграция OpenAI API
- ✅ Расширенная личность Совуньи
- ✅ Новая система входа (демо/регистрация/вход)
- ✅ Health check для OpenAI
- ✅ Модульная архитектура AI-чата

### v1.0 — Начальная версия
- 38 модулей, 60+ уроков
- Геймификация (бейджи, каштаны, XP)
- Supabase интеграция
- Robokassa монетизация
- 25+ интерактивных фич

---

**Создано с ❤️ для будущих продакт-менеджеров**

🦉 **Совунья всегда рядом!**