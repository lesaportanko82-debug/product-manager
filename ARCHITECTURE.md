# 🏗️ Архитектура PM Академии

## Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                        PM АКАДЕМИЯ                               │
│                    Frontend (React + TypeScript)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Три режима входа (auth-mode-selector) │
        ├─────────────────────────────────────────┤
        │  1. Демо (без регистрации)              │
        │  2. Регистрация (email/password)        │
        │  3. Вход (существующие пользователи)    │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────────────┐
        │           Основные компоненты                     │
        ├───────────────────────────────────────────────────┤
        │  • lesson-view.tsx — просмотр урока               │
        │  • ai-assistant.tsx — Совунья 🦉                  │
        │  • final-exam.tsx — финальный экзамен             │
        │  • gamification.tsx — бейджи + XP                 │
        │  • command-palette.tsx — Cmd+K поиск              │
        │  • project-simulator.tsx — PM-симулятор           │
        │  • pm-coach.tsx — сократовский коучинг            │
        │  • capstone-projects.tsx — финальные проекты      │
        └───────────────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────────────┐
        │              Данные курса (8 файлов)              │
        ├───────────────────────────────────────────────────┤
        │  course-data.tsx                — М1-4 (основы)   │
        │  course-data-extended.tsx       — М5-10           │
        │  course-data-prototyping.tsx    — М11-14          │
        │  course-data-growth.tsx         — М15-18          │
        │  course-data-analytics.tsx      — М19-22          │
        │  course-data-pmf.tsx            — М23-26          │
        │  course-data-additions.tsx      — М27-30          │
        │  course-data-new-modules.tsx    — М31-38          │
        └───────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │     Supabase Backend (bjhsgjsxhvwtuerahuha)      │
        ├─────────────────────────────────────────┤
        │  • PostgreSQL — хранение данных         │
        │  • Auth — аутентификация                │
        │  • Storage — файлы и медиа              │
        │  • Edge Functions — serverless API      │
        │  • KV Store — key-value прогресс        │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────────────┐
        │         Supabase Edge Functions (Deno + Hono)     │
        ├───────────────────────────────────────────────────┤
        │  POST /ai-chat              — Совунья             │
        │  POST /evaluate-case        — оценка кейсов       │
        │  POST /pm-coach             — PM-коучинг          │
        │  POST /capstone/evaluate    — оценка проектов     │
        │  GET  /health/openai        — health check        │
        │  POST /notes                — заметки             │
        │  POST /practice             — практики            │
        │  POST /exam-result          — результаты экзамена │
        └───────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │         OpenAI API (GPT-4o-mini)        │
        ├─────────────────────────────────────────┤
        │  • Model: gpt-4o-mini                   │
        │  • Temperature: 0.7                     │
        │  • Max tokens: 1200                     │
        │  • Retry logic: экспоненциальный backoff│
        │  • Caching: 24-часовое кеширование      │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │           Robokassa (Платежи)           │
        ├─────────────────────────────────────────┤
        │  • Test/Prod режимы                     │
        │  • Success/Fail callbacks               │
        │  • Webhook интеграция                   │
        └─────────────────────────────────────────┘
```

---

## Data Flow: Студент задаёт вопрос Совунье

```
[1] Студент вводит вопрос
          ↓
[2] ai-assistant.tsx (Frontend)
    • Валидация (≥3 символов)
    • Добавление в messages[]
    • Показ индикатора загрузки
          ↓
[3] fetch('/functions/v1/make-server-279b4dfa/ai-chat')
    • Method: POST
    • Headers: Authorization (publicAnonKey)
    • Body: { question, lessonTitle, moduleTitle, lessonContent }
          ↓
[4] Supabase Edge Function (Deno)
    • CORS headers
    • Logger
          ↓
[5] ai-chat-handler.tsx
    • Валидация длины (3-500 символов)
    • Получение OpenAI config
          ↓
[6] sovunya-system-prompt.tsx
    • Формирование system prompt с:
      - Личность Совуньи
      - Контекст: модуль + урок + содержание
      - Правила ответов
      - Примеры фреймворков
          ↓
[7] fetchWithRetry() к OpenAI API
    • POST https://api.openai.com/v1/chat/completions
    • Model: gpt-4o-mini
    • Temperature: 0.7
    • Max tokens: 1200
    • Retry: до 2 попыток с backoff
          ↓
[8] OpenAI обрабатывает запрос
    • Генерирует ответ на основе промпта
          ↓
[9] Ответ возвращается в ai-chat-handler
    • Парсинг JSON
    • Извлечение content
          ↓
[10] Возврат в Frontend
     • { answer: "..." }
          ↓
[11] ai-assistant.tsx отображает ответ
     • Добавляет в messages[]
     • Анимация появления
     • Совунья меняет mood на 'happy'
```

---

## Data Flow: Завершение урока

```
[1] Студент нажимает "Завершить урок"
          ↓
[2] lesson-view.tsx
    • Вызов markLessonComplete(lessonId)
          ↓
[3] interactive-progress.ts
    • Обновление completedLessons
    • Расчёт XP (10-50 XP за урок)
    • Проверка на новые бейджи
          ↓
[4] Запрос к Supabase
    • POST /functions/v1/make-server-279b4dfa/interactive-progress
    • Body: { sessionId, blockId, result, xpAmount }
          ↓
[5] Сервер сохраняет в KV Store
    • key: interactive:${sessionId}
    • value: { blocks: { ... }, totalXP, ... }
          ↓
[6] gamification.tsx
    • Проверка earned badges
    • Если новый бейдж → badge-notifier.tsx
          ↓
[7] Анимация празднования
    • OwlMascot mood: 'celebrating'
    • Fireworks effect
    • Toast уведомление
```

---

## Data Flow: Оплата через Robokassa

```
[1] Студент кликает "Купить курс"
          ↓
[2] paywall-modal.tsx
    • Формирует данные платежа
    • Создаёт signature (MD5 hash)
          ↓
[3] Редирект на Robokassa
    • URL: robokassa.ru/Merchant/Index.aspx
    • Params: MerchantLogin, OutSum, InvId, SignatureValue
          ↓
[4] Студент оплачивает
          ↓
[5] Robokassa → Success Callback
    • Redirect: /payment-success
    • Params: OutSum, InvId, SignatureValue
          ↓
[6] payment-success.tsx
    • Валидация signature
    • Разблокировка контента
    • Сохранение в localStorage: isPaid = true
          ↓
[7] Webhook уведомление
    • POST /functions/v1/make-server-279b4dfa/webhook
    • Логирование транзакции
          ↓
[8] Студент получает полный доступ
```

---

## Модули и их ответственность

### Frontend (/src/app/components/)

#### Учебный процесс
- `lesson-view.tsx` — основной компонент урока
- `module-intro.tsx` — введение в модуль
- `flashcards.tsx` — карточки для повторения
- `spaced-repetition` — интервальное повторение

#### AI и интерактив
- `ai-assistant.tsx` — Совунья (чат)
- `pm-coach.tsx` — сократовский коучинг
- `project-simulator.tsx` — симуляция PM-работы
- `chat-simulation.tsx` — чат с "клиентом"

#### Геймификация
- `gamification.tsx` — бейджи, XP, уровни
- `badge-notifier.tsx` — уведомления о бейджах
- `leaderboard.tsx` — таблица лидеров
- `celebrations.tsx` — анимации побед

#### Практика
- `capstone-projects.tsx` — финальные проекты
- `practice-notebook.tsx` — блокнот практик
- `data-exercises.tsx` — упражнения с данными
- `interview-simulator.tsx` — подготовка к интервью

#### Инструменты
- `command-palette.tsx` — Cmd+K поиск
- `pomodoro.tsx` — таймер Pomodoro
- `glossary.tsx` — глоссарий терминов
- `template-library.tsx` — шаблоны документов

#### Профиль и прогресс
- `profile-cabinet.tsx` — личный кабинет
- `progress-chart.tsx` — графики прогресса
- `competency-radar.tsx` — радар компетенций
- `certificate.tsx` — сертификат

### Backend (/supabase/functions/server/)

#### AI Integration
- `ai-chat-handler.tsx` — обработка AI-чата
- `sovunya-system-prompt.tsx` — промпт Совуньи
- `openai-config.tsx` — конфигурация OpenAI
- `ai-helpers.tsx` — retry, cache, fallback

#### Core Services
- `index.tsx` — главный роутер (Hono)
- `kv_store.tsx` — key-value хранилище
- `rate-limiter.tsx` — защита от abuse
- `analytics.tsx` — сбор метрик

---

## Системы и их взаимодействие

### 1. Система прогресса

**Где хранится:**
- `localStorage` — локальный прогресс (демо-режим)
- `Supabase KV Store` — облачный прогресс (зарегистрированные)

**Что отслеживается:**
- Завершённые уроки
- Заработанные бейджи
- Накопленные XP и каштаны
- Выполненные практики
- Результаты кейсов
- Прогресс по экзамену

**Синхронизация:**
- `profile-sync.ts` — автоматическая синхронизация каждые 30 сек
- `useEffect` хуки в компонентах
- Webhook при завершении критических действий

### 2. Система геймификации

**Компоненты:**
- `gamification.tsx` — основная логика
- `badge-notifier.tsx` — уведомления
- `celebrations.tsx` — анимации

**Условия бейджей:**
```typescript
{
  id: "first-lesson",
  condition: (progress) => progress.completedLessons.length >= 1,
  xp: 10
}
```

**XP начисление:**
- Завершение урока: 10-50 XP (зависит от сложности)
- Практика: 5 XP за задание, +15 за все задания
- Кейс: 20-50 XP (зависит от оценки)
- Экзамен: 100 XP
- Capstone проект: 50 XP (первый раз), 20 XP (повторно)

### 3. Система AI

**Эндпоинты:**
1. `/ai-chat` — общий чат с Совуньей
2. `/evaluate-case` — оценка кейсов (JSON response)
3. `/pm-coach` — сократовский метод (multi-turn)
4. `/capstone/evaluate` — оценка проектов

**Промпт-инжиниринг:**
- System prompt: личность + правила + контекст
- User prompt: вопрос студента
- Temperature: 0.7 (баланс креативности)
- Max tokens: 1200 (3-5 абзацев)

**Оптимизации:**
- Caching — 24 часа TTL
- Retry — экспоненциальный backoff
- Fallback — дружественные сообщения

---

## Безопасность

### Защита данных
- Все запросы к серверу требуют `Authorization` header
- Supabase Row Level Security (RLS) на таблицах
- Админ-панель защищена паролем (`rediska`)
- OpenAI API key хранится в Supabase Secrets

### Rate Limiting
- `rate-limiter.tsx` — защита от abuse
- Ограничения по IP/sessionId
- Exponential backoff для повторных запросов

### Валидация
- Frontend: длина вопросов, форматы email
- Backend: проверка всех входных параметров
- OpenAI: санация промптов

---

## Мониторинг и логирование

### Логи
```typescript
console.log(`OpenAI API error: ${response.status} ${errText}`);
console.log(`Error in ai-chat: ${err}`);
```

### Health Checks
- `/health` — статус сервера
- `/health/openai` — статус OpenAI + Совунья

### Метрики (рекомендуется добавить)
- Количество вопросов к Совунье
- Средняя длина диалога
- Retention rate
- Completion rate уроков
- Время ответа OpenAI

---

## Развёртывание

### Production Checklist
- [ ] OpenAI API key настроен
- [ ] Robokassa credentials добавлены
- [ ] Supabase проект создан и настроен
- [ ] Edge Functions задеплоены
- [ ] Домен настроен (если есть)
- [ ] Analytics подключён
- [ ] Health checks работают

### Environment Variables
```bash
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://bjhsgjsxhvwtuerahuha.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ROBOKASSA_LOGIN=...
ROBOKASSA_PASSWORD1=...
ROBOKASSA_PASSWORD2=...
ROBOKASSA_IS_TEST=true/false
```

---

## Будущие улучшения

### Планируется
- [ ] Streaming responses от OpenAI
- [ ] Conversation history (multi-session)
- [ ] Персонализация ответов AI
- [ ] Proactive tips от Совуньи
- [ ] Voice mode для Совуньи
- [ ] Социальные фичи (команды, коллаборация)
- [ ] Mobile app (React Native)
- [ ] Интеграция с Notion/Slack

---

**Архитектура создана для масштабирования и роста 🚀**
