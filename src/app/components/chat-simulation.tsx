import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Check, CheckCheck, SkipForward, Send } from "lucide-react";

// Generate realistic timestamps: start at 10:XX and increment 1-4 minutes per message
function generateTimestamp(messageIndex: number, baseMinute: number = 14): string {
  let totalMinutes = baseMinute;
  for (let i = 0; i < messageIndex; i++) {
    totalMinutes += 1 + Math.floor((i * 7 + 3) % 4); // deterministic pseudo-random 1-4 min
  }
  const hours = 10 + Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}

// ===== Types =====
export interface ChatParticipant {
  name: string;
  role: string;
  avatar: string; // photo URL
  color: string; // tailwind bg class
}

export interface ChatMessageData {
  from: string; // participant key or "you"
  text: string;
  delay?: number; // ms before showing (for sequential reveal)
}

export interface ChatChoice {
  id: string;
  text: string;
  isGood: boolean;
  reaction: string; // response message after choice
  points: number;
}

export interface ChatInteraction {
  prompt: string; // context text above choices
  choices: ChatChoice[];
}

export interface ChatSequence {
  phaseId: string;
  participants: Record<string, ChatParticipant>;
  messages: (ChatMessageData | { type: "interaction"; interaction: ChatInteraction })[];
}

// ===== Participants =====
const FB_TEAM: Record<string, ChatParticipant> = {
  ceo: { name: "Алексей", role: "CEO", avatar: "https://images.unsplash.com/photo-1758599543154-76ec1c4257df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-blue-100" },
  cto: { name: "Марина", role: "CTO", avatar: "https://images.unsplash.com/photo-1758598306913-5cd682b9e53b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-violet-100" },
  designer: { name: "Дима", role: "UX Designer", avatar: "https://images.unsplash.com/photo-1761522002071-67755dc6c820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-pink-100" },
  analyst: { name: "Лена", role: "Аналитик", avatar: "https://images.unsplash.com/photo-1772987057599-2f1088c1e993?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-teal-100" },
  marketing: { name: "Олег", role: "Head of Marketing", avatar: "https://images.unsplash.com/photo-1659353221237-6a1cfb73fd90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-orange-100" },
  dev: { name: "Саша", role: "Senior Dev", avatar: "https://images.unsplash.com/photo-1740102075553-c8f8d52265ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-slate-100" },
  support: { name: "Ирина", role: "Support Lead", avatar: "https://images.unsplash.com/photo-1736939678218-bd648b5ef3bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-emerald-100" },
  cfo: { name: "Борис", role: "CFO", avatar: "https://images.unsplash.com/photo-1623880840102-7df0a9f3545b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-amber-100" },
};

const B2B_TEAM: Record<string, ChatParticipant> = {
  ceo: { name: "Виктор", role: "CEO", avatar: "https://images.unsplash.com/photo-1584940121258-c2553b66a739?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-blue-100" },
  sales: { name: "Наталья", role: "Sales Lead", avatar: "https://images.unsplash.com/photo-1736939666660-d4c776e0532c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-pink-100" },
  cto: { name: "Игорь", role: "CTO", avatar: "https://images.unsplash.com/photo-1681164315430-6159b2361615?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-violet-100" },
  enterprise: { name: "Аня", role: "Enterprise Lead", avatar: "https://images.unsplash.com/photo-1610631066894-62452ccb927c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-teal-100" },
  csm: { name: "Пётр", role: "CS Manager", avatar: "https://images.unsplash.com/photo-1656587324100-6bb6a6223a4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-orange-100" },
  client: { name: "Дмитрий", role: "Клиент (IT-директор)", avatar: "https://images.unsplash.com/photo-1584940120505-117038d90b05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-slate-100" },
};

const MP_TEAM: Record<string, ChatParticipant> = {
  ceo: { name: "Катя", role: "CEO", avatar: "https://images.unsplash.com/photo-1706565029883-0a40ce90389d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-blue-100" },
  growth: { name: "Артём", role: "Growth Lead", avatar: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-teal-100" },
  community: { name: "Софья", role: "Community Manager", avatar: "https://images.unsplash.com/photo-1622632405663-f43782a098b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-pink-100" },
  dev: { name: "Максим", role: "Dev Lead", avatar: "https://images.unsplash.com/photo-1758599543126-59e3154d7195?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-violet-100" },
  mentor: { name: "Андрей", role: "Топ-ментор", avatar: "https://images.unsplash.com/photo-1771050889377-b68415885c64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-amber-100" },
};

const ED_TEAM: Record<string, ChatParticipant> = {
  ceo: { name: "Даниил", role: "CEO", avatar: "https://images.unsplash.com/photo-1755519024827-fd05075a7200?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-blue-100" },
  ux: { name: "Мария", role: "UX Lead", avatar: "https://images.unsplash.com/photo-1681164315947-0f117a6dbbf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-pink-100" },
  data: { name: "Павел", role: "Data Analyst", avatar: "https://images.unsplash.com/photo-1593510987459-9a1489817a3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-teal-100" },
  content: { name: "Елена", role: "Content Lead", avatar: "https://images.unsplash.com/photo-1602566356438-dd36d35e989c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-violet-100" },
  investor: { name: "Сергей", role: "Lead Investor", avatar: "https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", color: "bg-amber-100" },
};

// ===== Chat Data =====
// FreshBite Chats
const FB_CHATS: ChatSequence[] = [
  {
    phaseId: "brief",
    participants: FB_TEAM,
    messages: [
      { from: "ceo", text: "Команда, утренний стендап. Retention 30-day упал до 18%. Мы теряем пользователей быстрее, чем привлекаем. Нужно срочно решить проблему." },
      { from: "marketing", text: "Конкуренты уже запустили подписочные модели. Delivery Club Plus показывает +40% к retention. Может, нам тоже пора?" },
      { from: "cto", text: "Алексей, если мы начнём сейчас — MVP подписки будет через 6-8 недель. У команды есть слот." },
      { from: "ceo", text: "{USER} — вы новый Head of Product. Что думаете? С чего начнём? Сразу в разработку или нужно что-то ещё?" },
      { type: "interaction", interaction: {
        prompt: "CEO ждёт вашего ответа. Вся команда в чате.",
        choices: [
          { id: "fb-b-c1", text: "Марина, давай сразу в sprint planning. Время — деньги, конкуренты не ждут 🚀", isGood: false, reaction: "Алексей: Мне нравится энергия! Но Лена, у нас есть данные, почему пользователи уходят?\nЛена: Нет… мы не проводили исследования. Рискуем сделать фичу вслепую.", points: 0 },
          { id: "fb-b-c2", text: "Прежде чем писать код, давайте проведём CustDev. 10-12 интервью за неделю покажут, готовы ли пользователи платить за подписку.", isGood: true, reaction: "Лена: Поддерживаю! Могу подготовить скрипт интервью к завтрашнему дню.\nАлексей: Неделя на исследование — ок. Но через неделю жду конкретные выводы.", points: 5 },
          { id: "fb-b-c3", text: "Давайте посмотрим, что делают Delivery Club и Яндекс.Еда, и адаптируем их модель.", isGood: false, reaction: "Олег: Я уже анализировал — у них другая аудитория и unit-экономика. Копирование рискованно.\nАлексей: Согласен с Олегом. Нам нужны свои данные.", points: 2 },
        ]
      }},
      { from: "analyst", text: "Кстати, я вытащила данные: 35% пользователей заказывают 3+ раза в месяц. Это наш core-сегмент для подписки." },
      { from: "ceo", text: "Отлично. Действуем по плану. Жду обновления через неделю." },
    ]
  },
  {
    phaseId: "personas",
    participants: FB_TEAM,
    messages: [
      { from: "analyst", text: "Провели 12 интервью. Выделяю 3 сегмента: «Занятые профессионалы» (60%), «Молодые семьи» (25%), «Фитнес-энтузиасты» (15%)." },
      { from: "designer", text: "Мне нужны персоны для дизайна. Какой фреймворк используем — классические User Stories или что-то другое?" },
      { type: "interaction", interaction: {
        prompt: "Дима просит определиться с фреймворком для описания потребностей.",
        choices: [
          { id: "fb-p-c1", text: "Дима, давай классические User Stories — «Как [роль], я хочу [действие], чтобы [результат]»", isGood: false, reaction: "Лена: User Stories не захватывают контекст и эмоции. Для подписки важно понимать ситуацию использования.", points: 1 },
          { id: "fb-p-c2", text: "Используем Job Stories (JTBD): «Когда [ситуация] → хочу [результат] → чтобы [эмоция]». Это точнее описывает контекст.", isGood: true, reaction: "Дима: О, это круто! Сразу понятен контекст. Могу начать прототипировать под конкретные ситуации.\nЛена: Согласна, Job Stories лучше ложатся на наши инсайты из CustDev.", points: 5 },
          { id: "fb-p-c3", text: "Давайте просто опишем фичи — бесплатная доставка, скидки, эксклюзивы.", isGood: false, reaction: "Олег: Фичи без понимания потребностей — это feature factory. Нужна рамка.\nДима: Согласен, без контекста я буду дизайнить вслепую.", points: 0 },
        ]
      }},
      { from: "analyst", text: "Ещё интересный инсайт: конверсия в первый заказ 35%, повторный — всего 22%. Огромный drop-off!" },
      { from: "marketing", text: "22% повторных — это проблема. Подписка может стать retention-инструментом. Нужна CJM!" },
    ]
  },
  {
    phaseId: "metrics",
    participants: FB_TEAM,
    messages: [
      { from: "analyst", text: "Собрала текущие метрики:\n• ARPU = 480 ₽/мес\n• CAC = 1 200 ₽\n• Средний чек = 650 ₽\n• Частота = 2.8/мес\n• Churn = 12%/мес" },
      { from: "cfo", text: "При текущих показателях LTV = 3 150 ₽, LTV/CAC = 2.6. Это ниже бенчмарка. Подписка должна улучшить эти числа." },
      { from: "ceo", text: "Нам нужна North Star Metric для FreshBite+. Что-то, что показывает и ценность для юзера, и рост бизнеса." },
      { type: "interaction", interaction: {
        prompt: "CEO просит определить North Star Metric. Борис (CFO) внимательно слушает.",
        choices: [
          { id: "fb-m-c1", text: "North Star = количество активных подписчиков. Растёт число подписчиков — растёт MRR.", isGood: false, reaction: "Борис: Подписчик, который не заказывает — мёртвый вес. Мне нужна метрика ценности, а не vanity.\nЛена: Согласна, количество подписчиков не отражает usage.", points: 1 },
          { id: "fb-m-c2", text: "North Star = количество заказов от подписчиков в неделю. Показывает: юзеры получают ценность + бизнес растёт.", isGood: true, reaction: "Борис: Вот это разговор! Заказы = revenue = retention.\nАлексей: Чётко. Это наша звезда. Лена, настрой дашборд.", points: 5 },
          { id: "fb-m-c3", text: "North Star = MRR (Monthly Recurring Revenue). Деньги решают.", isGood: false, reaction: "Лена: MRR — output-метрика, не input. Она не покажет, получают ли юзеры ценность.\nБорис: Согласен, MRR — это следствие, а не причина.", points: 2 },
        ]
      }},
      { from: "ceo", text: "Цена подписки — 599 ₽/мес. Лена, посчитай unit-экономику подписчика с учётом бесплатной доставки и скидки 10%." },
    ]
  },
  {
    phaseId: "prioritize",
    participants: FB_TEAM,
    messages: [
      { from: "cto", text: "У нас бэклог из 8 фич для MVP:\n1. Бесплатная доставка ✦\n2. Скидка 10% ✦\n3. Эксклюзивные рестораны\n4. Приоритетная сборка\n5. Кешбэк 5%\n6. Семейный план\n7. Персонализация рекомендаций\n8. Красивые анимации" },
      { from: "cto", text: "Ресурсов хватает на 3-4 фичи в MVP. Как приоритизируем?" },
      { type: "interaction", interaction: {
        prompt: "Марина (CTO) ждёт от вас подход к приоритизации.",
        choices: [
          { id: "fb-pr-c1", text: "Давайте проголосуем в команде — каждый выберет топ-3 фичи.", isGood: false, reaction: "Марина: Голосование — не data-driven. У дизайнера и аналитика будут разные приоритеты.\nЛена: Нужен фреймворк, а не демократия.", points: 0 },
          { id: "fb-pr-c2", text: "Используем RICE: Reach × Impact × Confidence / Effort. Лена, подготовь данные для оценки каждой фичи.", isGood: true, reaction: "Лена: Могу оценить Reach по данным из CustDev. Impact — по корреляции с retention.\nМарина: RICE даст объективную картину. Давайте завтра вместе проскорим.", points: 5 },
          { id: "fb-pr-c3", text: "Берём все 8 фич, просто MVP будет больше. Подвинем дедлайн на месяц.", isGood: false, reaction: "Алексей: Нет. Дедлайн = дедлайн. 3 месяца — это максимум. Выбирайте.\nМарина: Scope creep — путь к провалу.", points: 0 },
        ]
      }},
      { from: "designer", text: "Ребята, я хочу добавить красивые анимации в подписку. UX должен быть премиальным! 🎨" },
      { from: "cto", text: "Анимации — это +2 недели. {USER}, что скажете?" },
      { type: "interaction", interaction: {
        prompt: "Дима настаивает на анимациях, Марина ждёт решения.",
        choices: [
          { id: "fb-pr-c4", text: "Дима, отличная идея! Давай добавим хотя бы на главный экран.", isGood: false, reaction: "Марина: Это +2 недели к scope. Мы и так на пределе.\nЛена: В MVP фокус на ценности. Полировка — после.", points: 0 },
          { id: "fb-pr-c5", text: "Дима, я ценю твою заботу о UX, но MVP = Minimum Viable Product. Анимации — в бэклог на Q2. Сейчас фокус на core value.", isGood: true, reaction: "Дима: Ок, понимаю. Сфокусируюсь на чистых экранах без украшений.\nМарина: 👍 Правильный подход.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "agile",
    participants: FB_TEAM,
    messages: [
      { from: "cto", text: "Sprint planning. У нас 12 недель = 6 спринтов по 2 недели. Velocity команды: ~40 Story Points за спринт." },
      { from: "dev", text: "Я оценил бэклог. «Бесплатная доставка» — 15 SP, «Скидка 10%» — 8 SP, «Эксклюзивные рестораны» — 25 SP, «Приоритетная сборка» — 12 SP." },
      { from: "cto", text: "{USER}, как организуем sprint planning? Кто что делает?" },
      { type: "interaction", interaction: {
        prompt: "Марина ждёт ваш подход к планированию.",
        choices: [
          { id: "fb-a-c1", text: "Я напишу все задачи, распределю по спринтам и скину таску в Jira. Команда оценит.", isGood: false, reaction: "Саша: Если PM диктует задачи — это waterfall с Jira-шкуркой.\nМарина: Команда должна участвовать в декомпозиции.", points: 0 },
          { id: "fb-a-c2", text: "Я приоритизирую user stories, команда декомпозирует и оценивает в SP. Sprint goal определяем вместе.", isGood: true, reaction: "Саша: Так я сразу вижу контекст и могу декомпозировать адекватно.\nМарина: 👏 Scrum by the book. Let's go.", points: 5 },
        ]
      }},
      { from: "dev", text: "⚠️ Середина спринта 2. Интеграция с платёжной системой займёт +3 дня. Мы не влезаем в sprint." },
      { from: "cto", text: "Что делаем? Задержка реальная — API партнёра документирован плохо." },
      { type: "interaction", interaction: {
        prompt: "Спринт под угрозой. Команда ждёт решения.",
        choices: [
          { id: "fb-a-c3", text: "Саша, можешь поработать в выходные? Очень надо 🙏", isGood: false, reaction: "Саша: 😐 Ладно… Но это уже второй раз за месяц.\nМарина: Овертаймы ведут к выгоранию. Нужен другой подход.", points: 0 },
          { id: "fb-a-c4", text: "Убираем «приоритетную сборку» из спринта — она low-priority. Sprint goal (подписка с оплатой) сохраняем.", isGood: true, reaction: "Саша: Так мы не теряем фокус и не ломаем sprint goal.\nМарина: Scope гибкий, sprint goal — нет. Правильное решение ✅", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "experiment",
    participants: FB_TEAM,
    messages: [
      { from: "analyst", text: "MVP готов! 🎉 120 000 MAU. Предлагаю A/B-тест: контроль vs FreshBite+ (бесплатная доставка + скидка 10%)." },
      { from: "analyst", text: "Гипотеза: FreshBite+ увеличит частоту заказов с 2.8 до 3.5/мес. MDE = 25%." },
      { from: "cto", text: "Сколько пользователей нужно в каждой группе? И как долго тестируем?" },
      { type: "interaction", interaction: {
        prompt: "Лена и Марина ждут параметры эксперимента.",
        choices: [
          { id: "fb-e-c1", text: "500 человек в каждой группе, 2 недели. Этого хватит.", isGood: false, reaction: "Лена: При MDE 25% и α=5% нужно минимум ~1000 в группе. 500 — мало, рискуем ошибкой II типа.", points: 1 },
          { id: "fb-e-c2", text: "~1000 в каждой группе, тестируем 3-4 недели до stat sig (p < 0.05). При 120K MAU — легко набираем.", isGood: true, reaction: "Лена: Точно! 1000 в группе при MDE 25% — оптимально. При нашем MAU — достаточно.\nМарина: Запускаю feature flag. Рандомизация готова.", points: 5 },
        ]
      }},
      { from: "analyst", text: "Неделя 3. Промежуточные результаты:\n• Группа B (FreshBite+): 3.2 заказа/мес\n• Контроль: 2.9 заказа/мес\n• p-value = 0.12" },
      { from: "marketing", text: "Тренд положительный! Давайте запускаем на всех? 🚀" },
      { type: "interaction", interaction: {
        prompt: "Олег хочет запускать. Лена молчит.",
        choices: [
          { id: "fb-e-c3", text: "Олег прав, тренд хороший — запускаем!", isGood: false, reaction: "Лена: p=0.12 > 0.05. Мы НЕ можем отвергнуть нулевую гипотезу. Это peeking — классическая ошибка!\nМарина: Лена права. Доведём до stat sig.", points: 0 },
          { id: "fb-e-c4", text: "Олег, p=0.12 — не stat sig. Продолжаем тест. Нельзя останавливать эксперимент раньше времени — это peeking.", isGood: true, reaction: "Лена: 🙏 Спасибо! Peeking — самая частая ошибка в A/B-тестах.\nОлег: Ок, ок, жду. Но я верю в результат!", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "stakeholders",
    participants: FB_TEAM,
    messages: [
      { from: "cfo", text: "Мне нужно обсудить результаты. Средний чек подписчиков упал на 12%. Это серьёзная проблема для маржи." },
      { from: "cfo", text: "Я не могу пойти к инвесторам с падающим средним чеком. Как это объяснить?" },
      { type: "interaction", interaction: {
        prompt: "CFO скептичен. Нужно убедить его данными.",
        choices: [
          { id: "fb-s-c1", text: "Борис, средний чек ниже, но LTV подписчика в 2x выше обычного пользователя. Смотрите на lifetime, не на транзакцию.", isGood: true, reaction: "Борис: Хм... Покажи цифры.\nЛена: LTV подписчика = 9 843 ₽ vs 3 150 ₽ у обычного. CAC тот же.\nБорис: LTV/CAC = 8.2... Это убедительно.", points: 5 },
          { id: "fb-s-c2", text: "Давайте уберём скидку 10% — это решит проблему чека.", isGood: false, reaction: "Лена: Скидка — core value предложения. Убрать без теста — рискованно.\nБорис: Мне нужно системное решение, а не костыль.", points: 1 },
        ]
      }},
      { from: "cto", text: "Раз уж все здесь — давайте добавим кешбэк, персонализацию и семейный план? Займёт +4 недели." },
      { type: "interaction", interaction: {
        prompt: "CTO хочет расширить scope. CEO слушает.",
        choices: [
          { id: "fb-s-c3", text: "Отличные идеи, Марина! Давайте всё добавим — пользователям понравится.", isGood: false, reaction: "Алексей: Это scope creep. Мы уже задержались на неделю.\nЛена: +4 недели без данных? У нас нет доказательств, что эти фичи нужны.", points: 0 },
          { id: "fb-s-c4", text: "Марина, идеи классные. Запускаем MVP сейчас, фичи — в roadmap Q2. Data от MVP покажет, что приоритизировать.", isGood: true, reaction: "Марина: Логично. Data-driven prioritization.\nАлексей: Баланс скорости и качества. Согласен ✅", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "crisis",
    participants: FB_TEAM,
    messages: [
      { from: "support", text: "🚨 АЛЕРТ! 150+ тикетов за 2 часа! Подписчики жалуются: бесплатная доставка НЕ работает на заказы до 500 ₽." },
      { from: "support", text: "Примеры:\n• «Подписался, а доставка 149 ₽ при заказе на 350 ₽»\n• «Верните деньги! Это обман!»\n• «Отписываюсь. Мошенники.»" },
      { from: "marketing", text: "Это катастрофа! Мы в рекламе писали «БЕСПЛАТНАЯ ДОСТАВКА НА ВСЕ ЗАКАЗЫ»! 😱" },
      { from: "ceo", text: "{USER} — что делаем? Действуйте БЫСТРО." },
      { type: "interaction", interaction: {
        prompt: "Кризис. 150+ тикетов. CEO ждёт немедленных действий.",
        choices: [
          { id: "fb-c-c1", text: "Ирина, ответь всем: «Мы исправим в течение 24 часов». Саша — убери ограничение в 500 ₽ ASAP.", isGood: false, reaction: "Саша: Подожди, я не уверен, что это баг. Может, PM написал такие requirements?\nМарина: Нужно сначала понять root cause. Действовать вслепую опасно.", points: 1 },
          { id: "fb-c-c2", text: "Стоп. Сначала анализ: Ирина — категоризируй тикеты. Саша — проверь acceptance criteria в задаче. Лена — данные: сколько подписчиков затронуто. Через 30 минут синк.", isGood: true, reaction: "Ирина: 92% тикетов про минимум 500 ₽.\nСаша: В задаче написано «от 500 ₽», а в маркетинге — «все заказы».\nЛена: Затронуто 1 200 из 3 200 подписчиков.", points: 5 },
        ]
      }},
      { from: "dev", text: "Нашёл! В acceptance criteria написано «бесплатная доставка от 500 ₽». Но маркетинг обещал «на все заказы». Рассинхрон." },
      { from: "ceo", text: "Кто виноват?" },
      { type: "interaction", interaction: {
        prompt: "CEO спрашивает, кто виноват. Команда напряжена.",
        choices: [
          { id: "fb-c-c3", text: "Саша неправильно реализовал. Нужно было уточнить.", isGood: false, reaction: "Саша: Я реализовал по спеке! Acceptance criteria были чёткие.\nМарина: Blame game не решает проблему. Нужен системный ответ.", points: 0 },
          { id: "fb-c-c4", text: "Это системный провал коммуникации. Как PM, я отвечаю за acceptance criteria. Проведём blameless post-mortem и внедрим чеклист.", isGood: true, reaction: "Саша: Спасибо за честность. Давайте чеклист — это предотвратит повторение.\nАлексей: Зрело. Ирина, отправь всем затронутым промокод и извинение.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "growth",
    participants: FB_TEAM,
    messages: [
      { from: "ceo", text: "Месяц после запуска:\n• 8 500 подписчиков\n• Retention 84%\n• Но цель — 25 000 за 3 месяца\n• Текущий темп: ~11 100 к дедлайну" },
      { from: "ceo", text: "Нам нужно ускориться в 2x. Идеи?" },
      { from: "marketing", text: "Могу увеличить бюджет на Instagram и TikTok. CAC ~800 ₽ в paid." },
      { type: "interaction", interaction: {
        prompt: "CEO хочет 25 000 подписчиков. Олег предлагает paid. Ваше решение?",
        choices: [
          { id: "fb-g-c1", text: "Олег, давай x3 бюджет на paid. Instagram + TikTok + Google Ads.", isGood: false, reaction: "Борис: Paid — не sustainable. CAC 800 ₽ × 16 500 = 13.2M ₽. Нет такого бюджета.\nЛена: К тому же paid-когорты показывают retention на 20% ниже organic.", points: 1 },
          { id: "fb-g-c2", text: "Referral-программа: «Пригласи друга — оба получат неделю бесплатно». Self-reinforcing loop + CAC близок к нулю.", isGood: true, reaction: "Олег: О! Referral-когорта по нашим данным имеет retention +20% и LTV +35% vs paid.\nАлексей: Вот это growth thinking! Олег, запусти referral. Параллельно 30% бюджета на paid.", points: 5 },
          { id: "fb-g-c3", text: "Снизим цену до 299 ₽ — привлечём больше подписчиков.", isGood: false, reaction: "Борис: Price war — гонка ко дну. При 299 ₽ unit-экономика не сходится.\nЛена: CAC payback вырастет до 14 месяцев. Не sustainable.", points: 0 },
        ]
      }},
      { from: "analyst", text: "Referral запущен! Первая неделя: 1 200 приглашений, конверсия 28%. Это 336 новых подписчиков за неделю! 🚀" },
      { from: "ceo", text: "Это путь. Команда, вы молодцы. Проект удался! 🎉" },
    ]
  },
];

// B2B Chats
const B2B_CHATS: ChatSequence[] = [
  {
    phaseId: "b2b-discovery",
    participants: B2B_TEAM,
    messages: [
      { from: "ceo", text: "Команда, у нас 450 компаний, MRR $180K. Но средний чек падает. Нужен Enterprise-сегмент — крупные клиенты 500+ сотрудников." },
      { from: "sales", text: "У меня 15 Enterprise-лидов в pipeline. Они все спрашивают: «У вас есть SSO?», «А SOC-2?», «SCIM?». Мы не готовы." },
      { from: "ceo", text: "{USER} — как определим TAM для Enterprise? Стоит ли игра свеч?" },
      { type: "interaction", interaction: {
        prompt: "CEO хочет понять размер рынка. Наталья ждёт с лидами.",
        choices: [
          { id: "b2b-d-c1", text: "Возьмём отчёт Gartner по рынку PM-инструментов — $15B. Наша доля ~0.1%.", isGood: false, reaction: "Виктор: Top-down слишком грубый. $15B — весь рынок, не наш Enterprise-сегмент.\nНаталья: Нам нужна конкретная цифра для нашего ICP.", points: 1 },
          { id: "b2b-d-c2", text: "Bottom-up: количество компаний 500+ × вероятность конверсии × средний чек Enterprise. Наталья, сколько таких компаний в наших вертикалях?", isGood: true, reaction: "Наталья: В наших 3 вертикалях — ~2 000 компаний. При конверсии 5% и ARPA $3 500 = TAM ~$4.2M ARR.\nВиктор: $4.2M — это более чем удваивает наш текущий ARR. Стоит!", points: 5 },
        ]
      }},
      { from: "client", text: "Привет! Мы посмотрели CloudTask. Нам нужен SSO, SCIM, audit log и SOC-2. Без этого IT-отдел не пропустит." },
      { from: "sales", text: "{USER}, что отвечаем Дмитрию? Он из крупного клиента — 800 сотрудников, потенциальный deal $5K/мес." },
      { type: "interaction", interaction: {
        prompt: "Потенциальный Enterprise-клиент. Один запрос — или паттерн?",
        choices: [
          { id: "b2b-d-c3", text: "Дмитрий, конечно! Мы сделаем SSO, SCIM, audit log и SOC-2 за 2 месяца. Подписываем?", isGood: false, reaction: "Игорь: Стоп! SOC-2 — это 6-9 месяцев и $50K+. Мы не можем обещать за 2 месяца!\nНаталья: Over-promising → under-delivery. Это убьёт репутацию.", points: 0 },
          { id: "b2b-d-c4", text: "Спасибо, Дмитрий! Записываю. Наталья — проверь, какие из этих требований повторяются у других 15 лидов. Приоритизируем по частоте.", isGood: true, reaction: "Наталья: Проверила! SSO — 12 из 15 просят, audit log — 9, SCIM — 6, SOC-2 — 4.\nИгорь: SSO = первый приоритет. Могу сделать за 3-4 недели.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-pricing",
    participants: B2B_TEAM,
    messages: [
      { from: "sales", text: "Enterprise-лиды спрашивают про pricing. Текущий: Starter $29, Pro $79. Конкуренты берут $2 000-5 000/мес с Enterprise." },
      { from: "ceo", text: "Нам нужна модель, которая масштабируется с размером клиента и предсказуема для них." },
      { type: "interaction", interaction: {
        prompt: "Виктор ждёт предложение по pricing-модели.",
        choices: [
          { id: "b2b-p-c1", text: "Фиксированная $199/мес для Enterprise. Привлечём объёмом — низкая цена = быстрый рост.", isGood: false, reaction: "Виктор: $199 для Enterprise? Они подумают, что мы несерьёзные. Дёшево = low-quality в B2B.\nНаталья: Мои лиды и сами ожидают кастомный прайсинг.", points: 0 },
          { id: "b2b-p-c2", text: "Per-seat pricing от $15/user/мес, минимум 50 seats. При 500 сотрудниках = $7 500/мес. Масштабируемо и предсказуемо.", isGood: true, reaction: "Виктор: Предсказуемость для клиента + масштабируемость для нас. Идеально!\nНаталья: $7 500/мес — в рамках бенчмарка. Лиды не будут шокированы.", points: 5 },
        ]
      }},
      { from: "client", text: "Мы готовы на годовой контракт, но хотим скидку 40%. Стандартная практика." },
      { from: "sales", text: "{USER}, 40% — это $2 100 вместо $3 500. Как ответим?" },
      { type: "interaction", interaction: {
        prompt: "Клиент торгуется. Годовой контракт vs скидка 40%.",
        choices: [
          { id: "b2b-p-c3", text: "Ок, 40% за annual. Годовой контракт стоит любой скидки.", isGood: false, reaction: "Виктор: 40% — это $16 800 потерянного дохода в год. Unit-экономика не сходится!\nИгорь: CAC payback вырастет до 12+ мес.", points: 0 },
          { id: "b2b-p-c4", text: "Дмитрий, предлагаем 20% за annual + бесплатный onboarding стоимостью $5K. Value add вместо скидки.", isGood: true, reaction: "Дмитрий: Бесплатный onboarding — это ценно. Ок, давайте 20% + onboarding.\nНаталья: Value bundling! Клиент доволен, маржа сохранена 🎯", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-sales",
    participants: B2B_TEAM,
    messages: [
      { from: "sales", text: "Enterprise sales cycle: 3-6 месяцев. У нас 8 лидов в pipeline, средний deal $3 500/мес. Но закрытие тянется." },
      { from: "ceo", text: "6 месяцев — слишком долго. Нам нужно ускорить до 2-3 месяцев. Как?" },
      { type: "interaction", interaction: {
        prompt: "Виктор хочет ускорить sales cycle.",
        choices: [
          { id: "b2b-s-c1", text: "Наймём ещё 2 Sales Engineers. Больше людей — быстрее закрываем.", isGood: false, reaction: "Виктор: Это $200K+ в год. И больше людей ≠ быстрее. Нужен процессный подход.\nИгорь: Согласен, проблема в процессе, не в людях.", points: 1 },
          { id: "b2b-s-c2", text: "Product-Led Sales: бесплатный trial Enterprise-плана + автоматизированный onboarding. Клиент видит ценность ДО разговора с sales.", isGood: true, reaction: "Наталья: PLG → PLS — это тренд! Клиент приходит к разговору уже убеждённый.\nИгорь: Могу сделать self-serve trial за 2 недели. Ограничим до 30 дней.", points: 5 },
        ]
      }},
      { from: "client", text: "Мы прошли trial. Продукт хороший, но решение принимает IT-директор. Он хочет security review." },
      { from: "sales", text: "Дмитрий — наш champion, но decision maker — IT-директор. Нужен plan." },
      { type: "interaction", interaction: {
        prompt: "Champion есть, но decision maker хочет security review.",
        choices: [
          { id: "b2b-s-c3", text: "Попросим Дмитрия протолкнуть решение. Он же наш champion.", isGood: false, reaction: "Наталья: Давление на champion может его отпугнуть. Security concern нужно решать напрямую.", points: 0 },
          { id: "b2b-s-c4", text: "Подготовим security whitepaper + назначим встречу IT-директора с нашим CTO Игорем. Каждому stakeholder — свои аргументы.", isGood: true, reaction: "Игорь: Могу подготовить security whitepaper за 3 дня. Встреча — на следующей неделе.\nНаталья: Знание stakeholder map — ключ к Enterprise sales! 🎯", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-security",
    participants: B2B_TEAM,
    messages: [
      { from: "cto", text: "Проблема: 5 Enterprise-лидов застряли на этапе Security Review. Всем нужен SOC-2. Без него — ни одна компания 500+ не подпишет." },
      { from: "sales", text: "Дмитрий передал: IT-директор хочет SOC-2 Type II, SSO/SAML, audit logs и GDPR compliance. Это блокирует deal на $8K/мес." },
      { from: "ceo", text: "{USER}, SOC-2 Type II — это $50-80K и 6-12 месяцев. Как приоритизировать? У нас ограниченный бюджет." },
      { type: "interaction", interaction: {
        prompt: "SOC-2 Type II дорого и долго. Как подступиться?",
        choices: [
          { id: "b2b-sec-c1", text: "Отложим SOC-2 на год. Сначала наберём клиентов — потом инвестируем в compliance.", isGood: false, reaction: "Наталья: Без SOC-2 Enterprise НЕ купят. Это chicken-and-egg, но compliance — must-have.\nИгорь: 12 из 15 лидов спрашивали про SOC-2. Это blocker.", points: 1 },
          { id: "b2b-sec-c2", text: "Двухэтапный план: SOC-2 Type I за 3-4 мес ($30K) как quick win + параллельно SSO/SAML. Type II запустить сразу после.", isGood: true, reaction: "Игорь: Type I закроет 80% вопросов. SSO сделаю за 3-4 недели — это top-1 запрос.\nНаталья: С Type I + SSO я смогу закрыть минимум 3 deal-а! 🎯", points: 5 },
        ]
      }},
      { from: "client", text: "Наши данные должны храниться в ЕС. GDPR — обязательное условие. Ваши серверы в US?" },
      { from: "cto", text: "Да, вся инфраструктура в US-East. Перенос — сложный проект. {USER}, какой подход?" },
      { type: "interaction", interaction: {
        prompt: "Клиент требует data residency в ЕС. Инфраструктура в US.",
        choices: [
          { id: "b2b-sec-c3", text: "Откажем этому клиенту — перестройка инфраструктуры слишком дорогая для одного deal-а.", isGood: false, reaction: "Наталья: EU — это 40%+ нашего Enterprise pipeline! Отказ = потеря огромного рынка.\nВиктор: Нельзя отказываться от целого региона.", points: 0 },
          { id: "b2b-sec-c4", text: "Multi-region архитектура с tenant isolation. Начнём с EU-региона — один дополнительный кластер. Tenant-level routing выбирает регион для каждого клиента.", isGood: true, reaction: "Игорь: Могу развернуть EU-кластер за 6 недель. Tenant routing — ещё 2 недели.\nВиктор: Стратегическая инвестиция. Окупится уже на 3-м EU-клиенте.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-product",
    participants: B2B_TEAM,
    messages: [
      { from: "csm", text: "3 Enterprise-клиента подписаны! 🎉 Но запросы очень разные: admin console, RBAC, custom workflows, API integrations, white-label." },
      { from: "ceo", text: "Бэклог раздувается. Мы строим для Enterprise или поддерживаем SMB? Фокус размывается." },
      { from: "cto", text: "{USER}, два варианта: форкнуть кодовую базу или строить одну платформу. Что выбираем?" },
      { type: "interaction", interaction: {
        prompt: "Enterprise vs SMB — как сбалансировать roadmap?",
        choices: [
          { id: "b2b-pf-c1", text: "Форк кодовой базы. Отдельный продукт для Enterprise — чистая архитектура.", isGood: false, reaction: "Игорь: Форк = двойные затраты на поддержку. Баг-фиксы × 2, деплои × 2, команда × 2.\nВиктор: Technical debt убьёт нас за полгода.", points: 0 },
          { id: "b2b-pf-c2", text: "Единая платформа + feature flags + plan-based entitlements. Один продукт — разные возможности по тарифам.", isGood: true, reaction: "Игорь: Feature flags! LaunchDarkly или Unleash. Могу внедрить за 2 недели.\nВиктор: Один продукт, разные планы — это масштабируемо. Принято!", points: 5 },
        ]
      }},
      { from: "client", text: "Нам нужна интеграция с SAP. Готовы заплатить $50K за кастомную разработку." },
      { from: "sales", text: "{USER}, $50K — хороший revenue. Но Игорь говорит, что кастомный код = tech debt." },
      { type: "interaction", interaction: {
        prompt: "Enterprise-клиент хочет кастомную интеграцию с SAP за $50K.",
        choices: [
          { id: "b2b-pf-c3", text: "Берём $50K, делаем кастомную интеграцию. Revenue есть revenue.", isGood: false, reaction: "Игорь: Кастомный код для одного клиента = tech debt навсегда. Следующий захочет Salesforce, потом HubSpot...\nВиктор: Мы станем outsource-агентством, а не продуктовой компанией.", points: 1 },
          { id: "b2b-pf-c4", text: "Построим universal API + webhook platform. SAP-коннектор — первый из многих. $50K пойдут на платформу, не на кастом.", isGood: true, reaction: "Игорь: Platform thinking! API + webhooks = 50+ интеграций потенциально. SAP — первый кейс.\nНаталья: С API-платформой я могу продавать интеграции как фичу Enterprise-плана!", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-csm",
    participants: B2B_TEAM,
    messages: [
      { from: "csm", text: "🚨 Алерт! Наш крупнейший клиент ($8K/мес) — adoption всего 15%. Renewal через 2 месяца. Health Score = Red." },
      { from: "ceo", text: "Пётр, это $96K ARR. Потерять нельзя. {USER}, как спасаем ситуацию?" },
      { from: "csm", text: "Проблема: PM-отдел (30 человек) активно использует. Но бухгалтерия, HR, маркетинг — не залогинились ни разу." },
      { type: "interaction", interaction: {
        prompt: "Adoption 15% у крупнейшего клиента. Renewal через 2 месяца.",
        choices: [
          { id: "b2b-cs-c1", text: "Предложим скидку 30% на следующий год. Деньги решают всё.", isGood: false, reaction: "Виктор: Скидка не решит adoption. Они не пользуются — им не нужна скидка на то, что не работает.\nПётр: Проблема в ценности, не в цене.", points: 0 },
          { id: "b2b-cs-c2", text: "Executive Business Review + 30-day adoption sprint: dedicated CSM, weekly check-ins, role-specific onboarding для каждого департамента.", isGood: true, reaction: "Пётр: EBR покажет серьёзность. 30-day sprint с KPI: довести adoption до 50%.\nВиктор: Если adoption вырастет — renewal обеспечен. Инвестируем время!", points: 5 },
        ]
      }},
      { from: "csm", text: "Adoption sprint сработал! 15% → 52% за месяц. Клиент доволен. Теперь вопрос: как превратить retention в expansion?" },
      { from: "sales", text: "У них 800 сотрудников, а лицензий — на 200. Потенциал расширения огромный." },
      { type: "interaction", interaction: {
        prompt: "Клиент спасён. Как расширить контракт?",
        choices: [
          { id: "b2b-cs-c3", text: "Предложим скидку за добавление seats — чем больше, тем дешевле.", isGood: false, reaction: "Наталья: Скидки обесценивают продукт. Нужно показать ROI расширения.\nПётр: Value-based expansion, не discount-based.", points: 1 },
          { id: "b2b-cs-c4", text: "Найдём power users → champion program → land-and-expand: case study с ROI для других департаментов. Champions продадут внутри компании лучше нас.", isGood: true, reaction: "Пётр: 3 PM-lead-а стали champions. Один уже представил CloudTask маркетинг-директору!\nНаталья: Land & Expand = organic growth. NRR вырастет до 120%+ 🚀", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-metrics",
    participants: B2B_TEAM,
    messages: [
      { from: "ceo", text: "Совет директоров через неделю. Нужна финансовая модель. MRR = $265K (Enterprise $85K + SMB $180K). Рост 12% MoM." },
      { from: "enterprise", text: "Enterprise LTV/CAC = 5.2, SMB LTV/CAC = 3.1. Net Dollar Retention = 108%." },
      { from: "ceo", text: "{USER}, как интерпретировать эти данные для борда? Куда инвестировать?" },
      { type: "interaction", interaction: {
        prompt: "Enterprise LTV/CAC = 5.2 vs SMB = 3.1. Стратегия?",
        choices: [
          { id: "b2b-m-c1", text: "Оба хорошие — LTV/CAC > 3. Продолжаем как есть, не меняем стратегию.", isGood: false, reaction: "Аня: Пропускаем insight! Enterprise на 68% эффективнее. Нужна разная инвестиционная стратегия.\nВиктор: Борд ожидает action plan, не «всё хорошо».", points: 1 },
          { id: "b2b-m-c2", text: "Enterprise = 68% эффективнее → увеличить долю Enterprise в pipeline. SMB — сохранить как cash cow, но не масштабировать агрессивно.", isGood: true, reaction: "Аня: Верно! Shift investment: 60% ресурсов на Enterprise, 40% на SMB support.\nВиктор: Это story, которую борд хочет услышать. Чёткий, data-driven подход.", points: 5 },
        ]
      }},
      { from: "enterprise", text: "NDR = 108%. Для top-tier SaaS это 120-140% (Snowflake, Datadog). Борд спросит, как дотянуть до 130%." },
      { from: "csm", text: "У нас expansion revenue есть, но contraction тоже. 2 клиента уменьшили seats." },
      { type: "interaction", interaction: {
        prompt: "NDR 108% → как довести до 130%?",
        choices: [
          { id: "b2b-m-c3", text: "Поднимем цены на 20% — это автоматически увеличит NDR.", isGood: false, reaction: "Наталья: Повышение цен без дополнительной ценности → churn. NDR упадёт, а не вырастет.\nАня: Price increase ≠ NDR growth. NDR = expansion - contraction - churn.", points: 0 },
          { id: "b2b-m-c4", text: "Три рычага: seat expansion (land-and-expand) + upsell premium tiers + reduce contraction через proactive CSM. Системный подход.", isGood: true, reaction: "Пётр: Proactive CSM снизит contraction. Уже спас 2 клиента в этом месяце.\nАня: Seat expansion + upsell = 130% NDR за 2 квартала. Это реалистично! 📊", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "b2b-scale",
    participants: B2B_TEAM,
    messages: [
      { from: "ceo", text: "$3.2M ARR! 🎉 15 Enterprise-клиентов, 500 SMB. Цель борда: $10M ARR за 18 месяцев. Нужен repeatable sales engine." },
      { from: "sales", text: "Текущий процесс: каждая сделка уникальна. Нет playbook. Я всё делаю руками." },
      { from: "ceo", text: "{USER}, как построить масштабируемый sales process? Нанимать людей или строить процессы?" },
      { type: "interaction", interaction: {
        prompt: "Sales зависит от Натальи лично. Как масштабировать?",
        choices: [
          { id: "b2b-sc-c1", text: "Наймём VP of Sales + 10 Account Executives. Больше людей = больше deals.", isGood: false, reaction: "Виктор: $1.5M+ в год на зарплаты без процесса = burn rate без результата.\nНаталья: Без playbook новые AE не будут знать, как продавать Enterprise.", points: 1 },
          { id: "b2b-sc-c2", text: "Документируем winning playbook из 15 сделок → нанимаем 3 AE → iterate playbook → масштабируем до 10.", isGood: true, reaction: "Наталья: У меня 15 кейсов. Могу выделить паттерн: avg deal 90 дней, 3 stakeholder-а, security review на этапе 2.\nВиктор: Playbook → small team → iterate → scale. Последовательно!", points: 5 },
        ]
      }},
      { from: "enterprise", text: "Конкурент привлёк $50M и демпингует цены на 40%. Два наших лида ушли к ним. Что делаем?" },
      { from: "cto", text: "Ценовая война — проигрыш. У них runway 3+ года. Нам нужна другая стратегия." },
      { type: "interaction", interaction: {
        prompt: "Конкурент с $50M демпингует. Два лида потеряны.",
        choices: [
          { id: "b2b-sc-c3", text: "Тоже снижаем цены на 30%. Нельзя терять долю рынка.", isGood: false, reaction: "Виктор: Ценовая война с $50M — самоубийство. Мы прогорим за 6 месяцев.\nАня: Race to the bottom. Никто не выигрывает.", points: 0 },
          { id: "b2b-sc-c4", text: "Углубляем product moat: интеграции создают switching costs, данные клиентов привязаны к платформе, premium support. Конкурент не скопирует это за деньги.", isGood: true, reaction: "Игорь: У наших клиентов 50+ workflows внутри. Switching cost = 3-6 месяцев миграции.\nНаталья: Moat > Price. Два ушедших лида вернутся, когда поймут, что дешёвый продукт не закрывает их потребности.", points: 5 },
        ]
      }},
    ]
  },
];

// Marketplace Chats
const MP_CHATS: ChatSequence[] = [
  {
    phaseId: "mp-chicken",
    participants: MP_TEAM,
    messages: [
      { from: "ceo", text: "Запускаем SkillSwap. Маркетплейс менторов и учеников. Классическая проблема: кого привлекать первым?" },
      { from: "growth", text: "Без менторов каталог пустой → ученики уходят. Без учеников менторы не зарабатывают → уходят. Замкнутый круг." },
      { from: "ceo", text: "{USER}, какую сторону привлекаем первой? У нас бюджет на 3 месяца." },
      { type: "interaction", interaction: {
        prompt: "Классическая chicken & egg проблема маркетплейса.",
        choices: [
          { id: "mp-c-c1", text: "Привлекаем учеников первыми. Demand creates supply — если будут заявки, менторы придут.", isGood: false, reaction: "Софья: Ученики придут на пустой каталог и уйдут. Первое впечатление не вернуть.\nАртём: Нужна критическая масса supply ДО привлечения demand.", points: 1 },
          { id: "mp-c-c2", text: "Supply first. Лично приглашаем экспертов из профессиональных комьюнити. 0% комиссии на 3 месяца — incentive для старта.", isGood: true, reaction: "Софья: Я знаю 3 комьюнити с сильными экспертами. Могу начать outreach сегодня!\nАртём: 0% комиссии — smart move. Airbnb и Uber так же начинали.", points: 5 },
        ]
      }},
      { from: "community", text: "За 2 недели пригласила 50 менторов! Но бронирований почти нет — 3 за неделю 😔" },
      { from: "growth", text: "У нас 200 учеников зарегалось, но конверсия в бронирование — 1.5%. Что-то блокирует." },
      { type: "interaction", interaction: {
        prompt: "50 менторов, 200 учеников, 3 бронирования. Почему?",
        choices: [
          { id: "mp-c-c3", text: "Нужно больше рекламы. Мало трафика — мало бронирований.", isGood: false, reaction: "Артём: 200 учеников — достаточно для теста. При хорошем UX конверсия должна быть 15-20%.\nМаксим: Проблема в продукте, не в трафике.", points: 1 },
          { id: "mp-c-c4", text: "Нет trust-сигналов! Отзывы, рейтинги, верификация менторов — ученики не доверяют незнакомцам. Нужен trust layer.", isGood: true, reaction: "Софья: Точно! Менторы без отзывов и рейтингов выглядят подозрительно.\nМаксим: Добавлю верификацию + первые 50 менторов получат «Проверенный эксперт» бейдж.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-liquidity",
    participants: MP_TEAM,
    messages: [
      { from: "growth", text: "3 месяца: 200 менторов, 1 500 учеников, 180 бронирований/мес. Средний чек 2 500 ₽, комиссия 15%. Неплохо!" },
      { from: "ceo", text: "Но 30% менторов имеют 0 бронирований. И мне нужна главная метрика ликвидности. Что отслеживаем?" },
      { type: "interaction", interaction: {
        prompt: "Катя хочет метрику ликвидности. Артём готовит дашборд.",
        choices: [
          { id: "mp-l-c1", text: "GMV — объём транзакций. Показывает масштаб маркетплейса.", isGood: false, reaction: "Артём: GMV — vanity metric. 450K GMV может быть от 20 менторов, а 180 простаивают.\nКатя: Мне нужна метрика эффективности matching.", points: 1 },
          { id: "mp-l-c2", text: "Search-to-Fill Rate — % запросов, которые конвертируются в бронирование. Показывает, находят ли ученики нужного ментора.", isGood: true, reaction: "Артём: Бинго! Search-to-Fill = 12% сейчас. Бенчмарк — 30-40%.\nКатя: Отличная метрика. Рост Search-to-Fill = рост ликвидности.", points: 5 },
        ]
      }},
      { from: "community", text: "30% менторов с нулём бронирований. Они начинают уходить. Вчера 5 менторов удалили профиль 😟" },
      { from: "ceo", text: "Это churn supply. Если менторы уйдут — каталог обеднеет. {USER}, что делаем?" },
      { type: "interaction", interaction: {
        prompt: "Отток supply-стороны. Менторы не получают клиентов.",
        choices: [
          { id: "mp-l-c3", text: "Снизим комиссию для менторов с 0 бронирований до 5%. Экономический стимул.", isGood: false, reaction: "Артём: 0% комиссии × 0 бронирований = 0 дохода. Проблема не в комиссии, а в том, что их не находят!\nКатя: Согласна, нужно решать проблему discovery.", points: 1 },
          { id: "mp-l-c4", text: "Проблема в discovery. Улучшим алгоритм ранжирования, добавим категории, фильтры. Софья — помоги менторам переписать профили.", isGood: true, reaction: "Максим: Добавлю рекомендательный алгоритм — boost новым менторам в первые 30 дней.\nСофья: Сделаю шаблоны профилей + гайд. Помогу каждому лично!", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-growth",
    participants: MP_TEAM,
    messages: [
      { from: "growth", text: "6 месяцев: 500 менторов, 5 000 учеников. Рост замедляется. Нам нужны сетевые эффекты." },
      { from: "ceo", text: "Артём, какой тип network effect у нас? И как его усилить?" },
      { from: "growth", text: "У нас classic two-sided marketplace. Но я заметил: 20% менторов генерируют 80% бронирований. Power law." },
      { type: "interaction", interaction: {
        prompt: "Power law: 20% менторов = 80% бронирований. Стратегия?",
        choices: [
          { id: "mp-g-c1", text: "Сфокусируемся на топ-20%. Дадим им premium-статус, приоритетное размещение.", isGood: false, reaction: "Софья: Зависимость от 20% — огромный риск. Если 5 из них уйдут — потеряем четверть GMV.\nАртём: Нужно поднимать middle tier, а не усиливать зависимость.", points: 1 },
          { id: "mp-g-c2", text: "Помогаем остальным 80%: обучение, шаблоны, программа «менторства для менторов». Если хотя бы 20% из них станут хорошими — GMV вырастет кратно.", isGood: true, reaction: "Софья: Запущу программу «Академия менторов» — вебинары + peer-review.\nАртём: Если middle tier вырастет с 20% до 40% — GMV удвоится!", points: 5 },
        ]
      }},
      { from: "mentor", text: "Привет! Я топ-ментор Андрей. У меня 50+ учеников на платформе. Но некоторые просят перейти на прямые оплаты. Что делать?" },
      { type: "interaction", interaction: {
        prompt: "Disintermediation — ученики хотят платить напрямую, минуя платформу.",
        choices: [
          { id: "mp-g-c3", text: "Андрей, у нас в правилах запрет на прямые оплаты. Мы заблокируем нарушителей.", isGood: false, reaction: "Андрей: Если заблокируете — я просто уйду. И заберу 50 учеников.\nКатя: Наказание не работает. Нужно создавать ценность, которую нельзя получить offline.", points: 0 },
          { id: "mp-g-c4", text: "Андрей, мы добавим ценность: гарантия возврата, автоматическое расписание, сертификаты, analytics по ученикам. То, что нельзя получить вне платформы.", isGood: true, reaction: "Андрей: Аналитика и сертификаты — это круто! Мне проще продавать на платформе, если есть такие фичи.\nКатя: Создавать ценность > запрещать. Это единственный путь. ✅", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-trust",
    participants: MP_TEAM,
    messages: [
      { from: "community", text: "У нас проблема: ученик жалуется на no-show ментора. Оплата 2 500 ₽ прошла, ментор не вышел на связь. Уже 3-й такой случай за месяц." },
      { from: "ceo", text: "Trust — основа маркетплейса. Если ученики не доверяют — уйдут. {USER}, как системно решаем?" },
      { type: "interaction", interaction: {
        prompt: "No-show менторов. 3 случая за месяц. Trust под угрозой.",
        choices: [
          { id: "mp-t-c1", text: "Возвращаем деньги из нашей маржи. Клиент всегда прав.", isGood: false, reaction: "Артём: Из маржи = убыток для платформы. При масштабе 1000+ бронирований — разоримся.\nКатя: Нужна системная policy, а не ручные возвраты.", points: 1 },
          { id: "mp-t-c2", text: "Escrow-модель: деньги замораживаются до подтверждения обеими сторонами. Автоматический refund при no-show + штраф ментору (снижение рейтинга + предупреждение).", isGood: true, reaction: "Максим: Escrow сделаю за неделю. Stripe Connect поддерживает hold.\nСофья: Добавим 3-strike policy: 3 no-show = временная блокировка. Справедливо для обеих сторон.", points: 5 },
        ]
      }},
      { from: "dev", text: "Ещё проблема: заметил подозрительную активность — 15 новых аккаунтов оставили 5-звёздочные отзывы одному ментору за 2 дня. Похоже на fraud." },
      { from: "ceo", text: "{USER}, как предотвращать фейковые отзывы? Ручная модерация не масштабируется." },
      { type: "interaction", interaction: {
        prompt: "Fraud: фейковые отзывы. 15 подозрительных аккаунтов.",
        choices: [
          { id: "mp-t-c3", text: "Модерировать все отзывы вручную. Наймём 2 модераторов.", isGood: false, reaction: "Артём: При 1000+ отзывов/мес — не м��сштабируется. И человек не всегда видит паттерны.\nМаксим: Нужен алгоритмический подход.", points: 1 },
          { id: "mp-t-c4", text: "ML-фильтр: velocity check (слишком много отзывов за короткий период) + device fingerprinting + отзыв можно оставить только после реальной сессии.", isGood: true, reaction: "Максим: Verified purchase reviews — только после завершённого бронирования. Это отсечёт 95% фейков.\nСофья: Добавим «полезный отзыв» voting от учеников. Community-модерация!", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-economics",
    participants: MP_TEAM,
    messages: [
      { from: "growth", text: "Unit economics: CAC ментора = 1 200 ₽, LTV = 8 500 ₽ (LTV/CAC = 7.1). CAC ученика = 350 ₽, LTV = 900 ₽ (LTV/CAC = 2.6). Проблема на стороне учеников." },
      { from: "ceo", text: "Ученик LTV/CAC = 2.6 — ниже порога 3x. Нужно либо снизить CAC, либо поднять LTV. {USER}, стратегия?" },
      { type: "interaction", interaction: {
        prompt: "LTV/CAC учеников = 2.6. Ниже нормы. Как исправить?",
        choices: [
          { id: "mp-e-c1", text: "Урежем маркетинговый бюджет на 30%. Снизим CAC.", isGood: false, reaction: "Артём: Урезать маркетинг = замедлить рост. CAC снизится, но volume тоже.\nКатя: Нужно повышать LTV, не резать acquisition.", points: 1 },
          { id: "mp-e-c2", text: "Повышаем LTV: подписка «SkillSwap Pro» для учеников (приоритет бронирования + скидки + эксклюзивные менторы) + реферальная программа для снижения CAC.", isGood: true, reaction: "Артём: Подписка = recurring revenue! Если 10% учеников подпишутся по 990 ₽/мес — LTV утроится.\nСофья: Реферальная программа: приведи друга — оба получат скидку 20%. CAC → 0 для реферальных.", points: 5 },
        ]
      }},
      { from: "mentor", text: "Катя, я слышал, вы хотите поднять комиссию с 15% до 20%. Если это правда — я ухожу. И ещё 10 менторов со мной." },
      { from: "ceo", text: "Андрей, без паники. {USER}, как увеличить take rate без потери менторов?" },
      { type: "interaction", interaction: {
        prompt: "Нужно больше revenue. Менторы против повышения комиссии.",
        choices: [
          { id: "mp-e-c3", text: "Комиссия остаётся 15%. Вместо этого монетизируем через premium-размещение: менторы платят за boost в выдаче.", isGood: false, reaction: "Андрей: Платное размещение? Значит, кто богаче — тот выше? Это нечестно.\nСофья: Качественных менторов оттолкнёт. Нужен value-based подход.", points: 2 },
          { id: "mp-e-c4", text: "Tiered commission: 15% базовая, но менторы с «Pro»-статусом получают больше фич (аналитика, сертификаты, приоритетная поддержка) за 10% доп. от выручки. Добровольный upgrade.", isGood: true, reaction: "Андрей: Аналитика по ученикам и автоматические сертификаты — это ценно! Я бы заплатил.\nАртём: Добровольный tier = no resentment. Те, кто получают ценность — платят больше.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-pmf",
    participants: MP_TEAM,
    messages: [
      { from: "growth", text: "9 месяцев работы. 800 менторов, 12 000 учеников. Инвестор спрашивает: «Есть ли PMF?»" },
      { from: "ceo", text: "Мы провели Sean Ellis test: 38% ответили «Очень разочарован» если SkillSwap закроется. Порог — 40%. Близко, но не дотягиваем." },
      { from: "growth", text: "{USER}, 38% — это PMF или нет? Как интерпретировать для инвестора?" },
      { type: "interaction", interaction: {
        prompt: "Sean Ellis test = 38%. Порог = 40%. Есть PMF или нет?",
        choices: [
          { id: "mp-pmf-c1", text: "38% < 40% — значит, PMF нет. Нужно pivot или серьёзные изменения.", isGood: false, reaction: "Катя: 38% vs 40% — статистически незначимая разница. Не стоит делать радикальные выводы.\nАртём: Для маркетплейса Sean Ellis — не единственный сигнал.", points: 1 },
          { id: "mp-pmf-c2", text: "38% — strong signal, но PMF для маркетплейса измеряется иначе: organic supply growth, repeat rate > 30%, positive unit economics на когорте. Смотрим комплексно.", isGood: true, reaction: "Артём: Repeat rate = 42%! Менторы приходят сами. Organic supply growth = 25%/мес.\nКатя: Комплексный view: мы на пороге PMF. Ещё 1-2 итерации — и breakthrough.", points: 5 },
        ]
      }},
      { from: "ceo", text: "Инвестор: «Какой ваш moat? Почему кто-то не скопирует за 3 месяца?»" },
      { from: "growth", text: "Хороший вопрос. У нас нет технического moat. {USER}, что отвечаем?" },
      { type: "interaction", interaction: {
        prompt: "Инвестор спрашивает про moat. Технического moat нет.",
        choices: [
          { id: "mp-pmf-c3", text: "У нас уникальный UX и лучшая команда. Это наш moat.", isGood: false, reaction: "Катя: UX копируется за месяц. Команда — не moat в глазах инвестора.\nАртём: Нужен structural advantage.", points: 1 },
          { id: "mp-pmf-c4", text: "Network effects: 800 менторов с рейтингами, отзывами, историей — это data moat. Каждый новый ментор/ученик делает платформу ценнее. Конкурент начнёт с нуля.", isGood: true, reaction: "Артём: Liquidity begets liquidity! У нас 15 000+ отзывов. Конкурент начнёт с 0 отзывов — кто ему поверит?\nКатя: Вот это pitch! Network effects + data moat + liquidity advantage. Инвестор впечатлён! 💰", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-ops",
    participants: MP_TEAM,
    messages: [
      { from: "dev", text: "Support inbox: 60% тикетов — scheduling issues (перенос, отмена, путаница с часовыми поясами). Мы тонем в тикетах." },
      { from: "community", text: "Менторы жалуются: ученики не приходят, но отмену не оформляют. Менторы держат слот, теряют время." },
      { from: "ceo", text: "{USER}, 60% тикетов — scheduling. Это операционная проблема, не продуктовая. Или нет?" },
      { type: "interaction", interaction: {
        prompt: "60% тикетов — scheduling issues. Как решить системно?",
        choices: [
          { id: "mp-o-c1", text: "Наймём ещё 3 support-агентов. Быстрее будем отвечать на тикеты.", isGood: false, reaction: "Максим: Больше support = больше cost. 60% тикетов можно убрать продуктовым решением.\nКатя: Нанимать людей для решения продуктовой проблемы — антипаттерн.", points: 0 },
          { id: "mp-o-c2", text: "Автоматизация: интеграция с Google Calendar/Calendly, автоматические напоминания за 24ч и 1ч, self-serve перенос/отмена в 2 клика. Убираем 60% тикетов продуктом.", isGood: true, reaction: "Максим: Calendar sync + auto-reminders за 3 недели. Self-serve отмена — ещё неделя.\nСофья: Это уберёт 80% scheduling-тикетов. Менторы будут счастливы!", points: 5 },
        ]
      }},
      { from: "growth", text: "Хочу внедрить Quality Score для менторов. Нужно определить, какие сигналы включить." },
      { from: "community", text: "Софья: сейчас у нас только средний рейтинг. Но рейтинг 4.8 у ментора с 3 отзывами ≠ 4.8 с 50 отзывами." },
      { type: "interaction", interaction: {
        prompt: "Quality Score для менторов. Какие сигналы?",
        choices: [
          { id: "mp-o-c3", text: "Средний рейтинг + количество отзывов. Простая формула.", isGood: false, reaction: "Артём: Слишком простая. Не учитывает response time, no-show rate, repeat clients.\nМаксим: Нужна многофакторная модель.", points: 2 },
          { id: "mp-o-c4", text: "Composite score: рейтинг × confidence (кол-во отзывов) + response time + completion rate + repeat client % + recency. Bayesian average для новых менторов.", isGood: true, reaction: "Максим: Bayesian average! Новые менторы получают prior = 4.0 вместо пустого рейтинга. Справедливо.\nАртём: Composite score = объективное ранжирование. Менторы поймут, как улучшаться.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "mp-expansion",
    participants: MP_TEAM,
    messages: [
      { from: "ceo", text: "Мы доминируем в России. Следующий шаг — международная экспансия. Куда идём первыми?" },
      { from: "growth", text: "3 варианта: Казахстан (близкий рынок, русскоязычный), Турция (быстрорастущий EdTech), Индия (огромный TAM, но сложный рынок)." },
      { from: "ceo", text: "{USER}, какую модель экспансии выбираем? Полная локализация или light-touch?" },
      { type: "interaction", interaction: {
        prompt: "Международная экспансия. Какую модель выбрать?",
        choices: [
          { id: "mp-ex-c1", text: "Полная локализация: отдельная команда, кастомный продукт, local payment systems. Казахстан первый.", isGood: false, reaction: "Катя: Full localization = $200K+ на каждый рынок. При нашем runway — максимум 1 рынок.\nАртём: Слишком дорого для теста. Нужен lean-подход.", points: 1 },
          { id: "mp-ex-c2", text: "Lean expansion: начинаем с Казахстана — русскоязычный, минимальная локализация. Тестируем demand за $20K. Если Search-to-Fill > 20% за 3 мес — масштабируем.", isGood: true, reaction: "Артём: $20K = перевод UI + local payment + 50 менторов через outreach. Минимальный viable expansion.\nСофья: У меня контакты в казахстанских комьюнити. Могу привлечь первых 30 менторов за месяц!", points: 5 },
        ]
      }},
      { from: "growth", text: "Месяц в Казахстане: 200 менторов, 2 000 учеников. Но Search-to-Fill Rate = 12% (vs 35% дома). Проблема с matching." },
      { from: "community", text: "Менторы из КЗ жалуются: ученики ищут навыки, которых нет на платформе. Mismatch supply и demand." },
      { type: "interaction", interaction: {
        prompt: "Search-to-Fill в Казахстане = 12% vs 35% дома. Mismatch.",
        choices: [
          { id: "mp-ex-c3", text: "Добавим больше категорий и привлечём больше менторов. Volume решит проблему.", isGood: false, reaction: "Артём: Больше менторов без анализа спроса = больше менторов с 0 бронирований. Нужен demand-first подход.\nКатя: Не лечим симптом — ищем root cause.", points: 1 },
          { id: "mp-ex-c4", text: "Demand analysis: какие навыки ищут ученики, но не находят? Целенаправленный рекрутинг менторов под конкретный demand gap. Data-driven supply building.", isGood: true, reaction: "Артём: Топ-5 запросов без менторов: IT, дизайн, маркетинг, финансы, английский. Рекрутируем точечно!\nСофья: Таргетированный рекрутинг + welcome бонус. За 2 недели закрою top-3 gap.", points: 5 },
        ]
      }},
    ]
  },
];

// EdTech Chats
const ED_CHATS: ChatSequence[] = [
  {
    phaseId: "ed-product",
    participants: ED_TEAM,
    messages: [
      { from: "ceo", text: "Команда, утренний синк. 10 000 пользователей, completion rate 12%. Это в рамках рынка (5-15%), но я хочу больше." },
      { from: "data", text: "Собрал данные: 60% бросают после 3-го урока. Средняя длина сессии — 8 минут. Но те, кто доходят до урока 5, остаются на 3+ месяца." },
      { from: "ceo", text: "{USER}, какая метрика важнее completion rate? На что ориентироваться?" },
      { type: "interaction", interaction: {
        prompt: "Даниил просит определить ключевую метрику engagement.",
        choices: [
          { id: "ed-p-c1", text: "Completion rate — его и поднимем. Цель: 30% за квартал.", isGood: false, reaction: "Павел: Completion rate — vanity. Не все курсы нужно проходить до конца. Человек может получить ценность из 5 уроков из 20.\nМария: Согласна, фокус на completion вынудит нас «упрощать», а не «вовлекать».", points: 1 },
          { id: "ed-p-c2", text: "Learning velocity — сколько полезного контента пользователь потребляет в неделю. Показывает и engagement, и получаемую ценность.", isGood: true, reaction: "Павел: Learning velocity! Это input-метрика: потребление контента → retention → monetization.\nДаниил: Отличная метрика. Павел, настрой дашборд.", points: 5 },
        ]
      }},
      { from: "data", text: "Ещё: 60% drop-off на уроке 3. У тех, кто бросил, средний engagement — 0 интерактивных действий. Просто смотрят видео и уходят." },
      { from: "ux", text: "Проблема ясна: нет quick wins в начале. Человек смотрит 3 лекции и не чувствует прогресса." },
      { type: "interaction", interaction: {
        prompt: "60% drop-off после урока 3. Мария говорит: «нет quick wins».",
        choices: [
          { id: "ed-p-c3", text: "Добавим мобильное приложение — люди смогут учиться в дороге.", isGood: false, reaction: "Мария: Мобильность не решит drop-off. Если контент скучный на мобиле — бросят так же.\nПавел: Проблема в engagement loop, не в канале.", points: 1 },
          { id: "ed-p-c4", text: "Нужно переработать onboarding: quick wins в первые 10 минут, прогресс-бар, micro-achievements. Пользователь должен ПОЧУВСТВОВАТЬ рост.", isGood: true, reaction: "Мария: Именно! Геймификация onboarding + маленькие победы = привычка.\nДаниил: Duolingo так делает — первый урок за 5 минут, и ты уже «выучил 3 слова». Чувство прогресса.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-engagement",
    participants: ED_TEAM,
    messages: [
      { from: "ceo", text: "WAU/MAU = 25%. Цель — 45% за 3 мес. Нужна система вовлечения. Какой подход?" },
      { from: "ux", text: "Я изучила Hook Model Нира Эяля. Trigger → Action → Variable Reward → Investment. Может сработать для EdTech." },
      { from: "data", text: "У Duolingo WAU/MAU = 60%+. Они используют streaks, XP, leaderboards. Может, скопируем?" },
      { type: "interaction", interaction: {
        prompt: "Павел предлагает скопировать Duolingo. Мария предлагает Hook Model.",
        choices: [
          { id: "ed-e-c1", text: "Павел, добавим push-уведомления каждый день в 9:00 — «Не забудь учиться!». Простой trigger.", isGood: false, reaction: "Мария: Назойливые пуши — top-1 причина uninstall. Нужен internal trigger, не external.\nПавел: Данные подтверждают: после 3 пушей подряд 40% отключают уведомления.", points: 0 },
          { id: "ed-e-c2", text: "Полный Hook: утренний trigger (краткий совет дня) → 5-мин micro-lesson → variable reward (streak + XP + случайный бонус) → investment (заметки, прогресс, кастомизация).", isGood: true, reaction: "Мария: Это формирует привычку! Variable reward — ключ: человек не знает, какой бонус получит.\nДаниил: Чётко структурировано. Мария, начинай дизайн. Павел — A/B-тест через 2 недели.", points: 5 },
        ]
      }},
      { from: "data", text: "Внедрили streaks! 7-day retention +30% 🎉 НО... NPS упал на 5 пунктов. Пользователи пишут: «Чувствую себя виноватым, если пропускаю день»." },
      { from: "content", text: "Это плохой сигнал. Guilt-driven retention = токсичная геймификация." },
      { type: "interaction", interaction: {
        prompt: "Retention +30%, но NPS -5. Guilt от streaks.",
        choices: [
          { id: "ed-e-c3", text: "NPS — не наша проблема. Retention растёт — значит, работает. Оставляем как есть.", isGood: false, reaction: "Елена: NPS -5 → негативные отзывы → churn через 2-3 месяца. Это бомба замедленного действия.\nМария: Retention без удовольствия = extrinsic motivation. Это хрупко.", points: 0 },
          { id: "ed-e-c4", text: "Добавим «streak freeze» — можно пропустить 1-2 дня без потери серии. Guilt-free design. Duolingo так и сделали.", isGood: true, reaction: "Мария: Streak freeze снижает anxiety, сохраняя мотивацию. Гениально просто!\nПавел: Протестируем: группа со streak freeze vs без. Ожидаю NPS +8 при сохранении retention.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-scale",
    participants: ED_TEAM,
    messages: [
      { from: "ceo", text: "Мы на 50 000 пользователей! 🎉 Следующий шаг: B2B (корпоративное обучение) + международная экспансия." },
      { from: "investor", text: "Сергей тут. Я вижу потенциал B2B. Один корпоративный клиент = сотни подписок. Но они хотят кастомизацию." },
      { from: "content", text: "Корпоративные клиенты просят адаптировать курсы под свой стек и процессы. Мы не можем делать custom для каждого." },
      { type: "interaction", interaction: {
        prompt: "Корпоративные клиенты хотят кастомизацию. Как масштабировать?",
        choices: [
          { id: "ed-s-c1", text: "Наймём отдельную команду для создания кастомных курсов. Premium-сервис по $50K за проект.", isGood: false, reaction: "Сергей: $50K × 10 клиентов = $500K. Но каждый проект — 2 месяца работы. Не масштабируется.\nДаниил: Нам нужно решение на уровне платформы, не сервиса.", points: 1 },
          { id: "ed-s-c2", text: "Платформа-конструктор: шаблоны + модули + брендинг. Клиент собирает свой трек сам. 80% одинаково, 20% настраивается.", isGood: true, reaction: "Сергей: Platform play! Это scalable. Один раз делаете инструменты — клиенты собирают сами.\nЕлена: Могу создать 50 модулей-кирпичиков. Клиент комбинирует под свои нужды.", points: 5 },
        ]
      }},
      { from: "ceo", text: "И ещё: AI. Все конкуренты внедряют AI. Что приоритизируем?" },
      { from: "data", text: "Три варианта: AI-генерация курсов, AI-chatbot для ответов, adaptive learning paths." },
      { type: "interaction", interaction: {
        prompt: "AI-стратегия для EdTech. Павел предлагает 3 варианта.",
        choices: [
          { id: "ed-s-c3", text: "AI-chatbot для ответов на вопросы. Quick win — можно запустить за 2 недели.", isGood: false, reaction: "Павел: Chatbot — feature, не strategy. Не даёт конкурентного преимущества — все это могут.\nСергей: Инвесторы хотят видеть transformative AI, не chatbot.", points: 2 },
          { id: "ed-s-c4", text: "Adaptive learning paths: AI персонализирует последовательность уроков под уровень и цели каждого студента. Каждый учится по своему пути.", isGood: true, reaction: "Павел: Персонализация = killer feature. Данные у нас уже есть — 50K пользователей.\nСергей: ЭТО я покажу на борде. Adaptive learning = defensible moat. Инвестируем! 💰", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-content",
    participants: ED_TEAM,
    messages: [
      { from: "content", text: "У нас 120 курсов. Completion rate микро-курсов (< 2ч) = 45%, длинных (> 10ч) = 8%. Нужна стратегия." },
      { from: "ceo", text: "Елена, длинные курсы = higher perceived value = higher WTP. Но 8% completion — это провал. {USER}, как решаем?" },
      { type: "interaction", interaction: {
        prompt: "Completion rate: микро = 45%, длинные = 8%. Какая стратегия?",
        choices: [
          { id: "ed-c-c1", text: "Отказываемся от длинных курсов. Только микро-курсы — completion выше, студенты довольны.", isGood: false, reaction: "Елена: Длинные курсы = $99-199 ценник. Микро = $19. Потеряем 60% revenue!\nСергей: Инвесторы хотят видеть ARPU growth, не только completion.", points: 1 },
          { id: "ed-c-c2", text: "Модульная архитектура: длинные курсы разбиваем на серию связанных микро-модулей. Каждый модуль — самостоятельная ценность + общий прогресс. Лучшее из двух миров.", isGood: true, reaction: "Елена: 20-часовой курс → 10 модулей по 2ч. Каждый с сертификатом. Можно покупать по отдельности или bundle!\nПавел: Ожидаю completion per module = 35-40%, overall = 20%+. Кратный рост!", points: 5 },
        ]
      }},
      { from: "data", text: "Ещё вопрос: как определять, какие курсы создавать следующими? Авторы предлагают темы по своим интересам, не по рынку." },
      { from: "ceo", text: "{USER}, нам нужен data-driven подход к контент-планированию." },
      { type: "interaction", interaction: {
        prompt: "Какие курсы создавать? Author-driven vs data-driven.",
        choices: [
          { id: "ed-c-c3", text: "Опрос пользователей: «Какой курс хотите следующим?» Голосование решит.", isGood: false, reaction: "Павел: Пользователи не знают, чего хотят. Они попросят «ещё Python», а не «MLOps» — который растёт на 200%/год.\nЕлена: Survey bias — люди выбирают знакомое.", points: 2 },
          { id: "ed-c-c4", text: "Triangulation: поисковые запросы на платформе (что ищут, но не находят) + Google Trends + job market data (HH, LinkedIn). Пересечение трёх сигналов = приоритет.", isGood: true, reaction: "Павел: Search data: 2 000 запросов «AI/ML» — у нас 0 курсов! Job postings «AI PM» +180% за год.\nЕлена: Триангуляция! Три сигнала подтверждают одно — значит, делаем курс по AI для PM.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-data",
    participants: ED_TEAM,
    messages: [
      { from: "data", text: "Нужен North Star Metric. У нас 15+ метрик в дашборде — все важные, но нет единого фокуса." },
      { from: "ceo", text: "DAU/MAU = 25%, completion rate = 12%, NPS = 42. Что из этого — North Star? {USER}, помоги." },
      { type: "interaction", interaction: {
        prompt: "Какой North Star Metric для EdTech? DAU/MAU, completion, NPS?",
        choices: [
          { id: "ed-d-c1", text: "DAU/MAU — стандартная метрика engagement для любого digital-продукта.", isGood: false, reaction: "Павел: DAU/MAU = stickiness. Но для EdTech stickiness без learning outcome = бессмысленный scroll.\nДаниил: Нам нужна метрика, связанная с learning value.", points: 2 },
          { id: "ed-d-c2", text: "Weekly Learning Hours (WLH) — часы активного обучения в неделю. Коррелирует с retention, completion и NPS одновременно.", isGood: true, reaction: "Павел: WLH! Проверил корреляции: WLH > 2ч/нед → retention 85%, NPS 62. WLH < 30мин → retention 15%, NPS 28.\nДаниил: Одна метрика, которая предсказывает все остальные. Это наш North Star!", points: 5 },
        ]
      }},
      { from: "data", text: "Интересная находка: 70% пользователей ставят видео на паузу на 4-й минуте. Во всех курсах. Что это значит?" },
      { from: "ux", text: "4-я минута — это паттерн. Может быть, когнитивная перегрузка? Или что-то в UX?" },
      { type: "interaction", interaction: {
        prompt: "70% пауз на 4-й минуте. Паттерн по всем курсам.",
        choices: [
          { id: "ed-d-c3", text: "Сократить все видео до 3 минут. Если пауза на 4-й — значит, 4 минуты = максимум внимания.", isGood: false, reaction: "Павел: Correlation ≠ causation! Может, на 4-й минуте — первый сложный concept. Люди ставят паузу, чтобы записать.\nМария: Нужно посмотреть, ВОЗВРАЩАЮТСЯ ли они после паузы.", points: 1 },
          { id: "ed-d-c4", text: "Глубже: сегментируем. Если после паузы продолжают — это «заметки-пауза» (хорошо). Если уходят — cognitive overload. Добавим интерактивный чекпойнт на 4-й минуте.", isGood: true, reaction: "Павел: 60% возвращаются! Это заметки. Но 40% уходят — для них нужен checkpoint.\nМария: Interactive checkpoint на 4-й минуте: мини-квиз или reflection question. Break the passive watching!", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-community",
    participants: ED_TEAM,
    messages: [
      { from: "content", text: "Мы запустили форум. 2 000 пользователей зарегались, но активность = 3%. Только 60 человек пишут. Остальные — lurkers." },
      { from: "ux", text: "Классическая 1-9-90 проблема: 1% создаёт контент, 9% комментируют, 90% читают." },
      { from: "ceo", text: "{USER}, форум мёртв. Какой community format лучше работает для EdTech?" },
      { type: "interaction", interaction: {
        prompt: "Форум: 3% активность. Как оживить community?",
        choices: [
          { id: "ed-com-c1", text: "Добавим геймификацию в форум: баллы за посты, бейджи, лидерборд. Это мотивирует писать.", isGood: false, reaction: "Мария: Геймификация форума = посты ради баллов. Качество упадёт.\nЕлена: Нужен формат, где participation = обязательная часть обучения.", points: 1 },
          { id: "ed-com-c2", text: "Когортное обучение: группы по 20-30 человек, общие дедлайны, peer assignments. Community ≠ форум, community = совместный опыт.", isGood: true, reaction: "Мария: Cohort-based! Accountability + shared experience. Completion rate в когортах = 75% vs 12% solo.\nДаниил: Maven, Reforge, On Deck — все перешли на когорты. Это будущее EdTech.", points: 5 },
        ]
      }},
      { from: "content", text: "Запустили первую когорту: 25 человек. Проблема — 30% inactive после 1-й недели. Как удержать?" },
      { from: "ux", text: "Те, кто сделал peer assignment в первые 3 дня — retention 95%. Те, кто не сделал — 40%." },
      { type: "interaction", interaction: {
        prompt: "Когорта: 30% inactive после 1 недели. Peer assignment = retention driver.",
        choices: [
          { id: "ed-com-c3", text: "Отправим напоминания неактивным. Email + push каждый день.", isGood: false, reaction: "Мария: Спам = отписка. Нужен pull, не push.\nПавел: Данные ясны: peer assignment = activation event. Нужно туда направить.", points: 1 },
          { id: "ed-com-c4", text: "Buddy system: каждому участнику — learning buddy в первый день. Peer assignment = обязательный в первые 48ч. Social commitment = activation.", isGood: true, reaction: "Елена: Buddy system! Социальное обязательство перед конкретным человеком сильнее, чем перед платформой.\nПавел: Buddy assignment в первые 48ч → activation rate прогнозирую 85%+.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-ai",
    participants: ED_TEAM,
    messages: [
      { from: "ceo", text: "AI — главный тренд. Конкуренты внедряют AI-фичи. Нам нужно быстро определиться с AI-стратегией." },
      { from: "data", text: "Три варианта: 1) AI-генерация курсов, 2) AI-tutor (chatbot), 3) Adaptive learning paths. У каждого свои trade-offs." },
      { from: "ceo", text: "{USER}, у нас ресурсы на один AI-проект. Что приоритизируем?" },
      { type: "interaction", interaction: {
        prompt: "Один AI-проект. Генерация, tutor или adaptive paths?",
        choices: [
          { id: "ed-ai-c1", text: "AI-генерация курсов. Автоматизируем создание контента — масштабируем x10 быстрее.", isGood: false, reaction: "Елена: Качество AI-курсов пока = 60% от human-created. Для EdTech качество = всё.\nСергей: AI-generated content commodity. Все смогут это делать. Не moat.", points: 1 },
          { id: "ed-ai-c2", text: "Adaptive learning paths: AI анализирует уровень, цели и поведение каждого студента → персонализирует последовательность. Каждый учится по своему пути.", isGood: true, reaction: "Павел: У нас 50K пользователей = 50K learning profiles. Данные для ML уже есть!\nСергей: Adaptive learning = defensible moat. Чем больше данных — тем лучше модель. Network effects на данных!", points: 5 },
        ]
      }},
      { from: "data", text: "Строим knowledge graph для adaptive engine. Но как валидировать accuracy? Если AI рекомендует неправильный урок — доверие теряется." },
      { from: "content", text: "Я прошла тест — AI предложил мне beginners-урок по теме, которую я преподаю. Accuracy пока низкая." },
      { type: "interaction", interaction: {
        prompt: "AI accuracy низкая. Елене предложили beginners-урок. Как валидировать?",
        choices: [
          { id: "ed-ai-c3", text: "Больше training data. Подождём 3 месяца — модель улучшится с ростом данных.", isGood: false, reaction: "Павел: 3 месяца плохих рекомендаций = потеря доверия. Пользователи отключат AI.\nДаниил: Нужен feedback loop прямо сейчас.", points: 1 },
          { id: "ed-ai-c4", text: "Human-in-the-loop: AI предлагает → эксперт валидирует для первых 1000 рекомендаций. Diagnostic quiz при старте для calibration. Thumbs up/down на каждый урок для continuous learning.", isGood: true, reaction: "Елена: Diagnostic quiz! 10 вопросов → определяем уровень за 3 минуты. AI получает baseline.\nПавел: Thumbs feedback = reinforcement learning. Каждый клик улучшает модель. За 2 месяца accuracy вырастет до 85%+.", points: 5 },
        ]
      }},
    ]
  },
  {
    phaseId: "ed-growth",
    participants: ED_TEAM,
    messages: [
      { from: "ceo", text: "100K пользователей! Но рост замедляется: 8% MoM vs 15% три месяца назад. Нужен growth engine." },
      { from: "data", text: "Organic = 40%, paid = 35%, referral = 15%, B2B = 10%. Paid CAC растёт на 20% каждый квартал." },
      { from: "ceo", text: "{USER}, paid становится дорогим. Какой growth loop масштабируется?" },
      { type: "interaction", interaction: {
        prompt: "Paid CAC растёт. Нужен sustainable growth loop.",
        choices: [
          { id: "ed-g-c1", text: "Увеличим бюджет на paid. Volume discounts от платформ снизят CPM.", isGood: false, reaction: "Павел: Paid = rented audience. CAC растёт структурно — auction competition. Volume не поможет.\nСергей: Инвесторы не любят paid-dependent growth. LTV/CAC ухудшается.", points: 1 },
          { id: "ed-g-c2", text: "Certification loop: студент проходит курс → получает verifiable certificate → делится в LinkedIn → его коллеги видят → приходят учиться. Organic + referral + SEO в одном.", isGood: true, reaction: "Павел: LinkedIn share = free impression. Средний PM имеет 500+ connections. Один share = 500 потенциальных студентов.\nДаниил: Certification loop = viral loop! Каждый выпускник = маркетинговый канал. CAC → 0 для этого канала.", points: 5 },
        ]
      }},
      { from: "investor", text: "B2B клиент — банк, 5 000 сотрудников. Хотят custom LMS. Наш продукт — не LMS. Как ответить?" },
      { from: "content", text: "Если делаем LMS для каждого клиента — мы не EdTech, а outsource." },
      { type: "interaction", interaction: {
        prompt: "Банк хочет custom LMS. Мы — не LMS. Как ответить?",
        choices: [
          { id: "ed-g-c3", text: "Откажем. Мы B2C EdTech, не enterprise LMS vendor.", isGood: false, reaction: "Сергей: 5 000 seats × $5/мес = $300K ARR от одного клиента! Нельзя просто отказать.\nДаниил: Найдём middle ground.", points: 1 },
          { id: "ed-g-c4", text: "Не LMS, а Learning Experience Platform: наш контент + их брендинг + analytics dashboard для HR. Встраиваемся в их экосистему, но не становимся outsource.", isGood: true, reaction: "Сергей: LXP > LMS! Мы продаём контент + опыт, не software. $10/seat/мес = $600K ARR.\nЕлена: Контент-библиотека + white-label + HR analytics = scalable B2B offering. Не кастом для каждого!", points: 5 },
        ]
      }},
    ]
  },
];

// Map all chats by scenario
export const ALL_CHATS: Record<string, ChatSequence[]> = {
  freshbite: FB_CHATS,
  "b2b-saas": B2B_CHATS,
  marketplace: MP_CHATS,
  edtech: ED_CHATS,
};

// ===== Utility: Read chat points for results screen =====
export function getChatPointsForScenario(scenarioId: string): { total: number; perPhase: Record<string, number> } {
  try {
    const data = JSON.parse(localStorage.getItem(`sim-chat-state-${scenarioId}`) || "{}");
    let total = 0;
    const perPhase: Record<string, number> = {};
    for (const [phaseId, state] of Object.entries(data)) {
      const s = state as SavedChatState;
      if (s.earnedPoints) {
        total += s.earnedPoints;
        perPhase[phaseId] = s.earnedPoints;
      }
    }
    return { total, perPhase };
  } catch { return { total: 0, perPhase: {} }; }
}

// ===== Sound Effects (Web Audio API) =====
const audioCtxRef: { current: AudioContext | null } = { current: null };

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  } catch { return null; }
}

function playTone(frequency: number, duration: number, volume: number, type: OscillatorType = "sine") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playSoundMessage() {
  playTone(880, 0.08, 0.06, "sine");
  setTimeout(() => playTone(1100, 0.06, 0.04, "sine"), 50);
}

function playSoundInteraction() {
  playTone(660, 0.1, 0.05, "triangle");
  setTimeout(() => playTone(880, 0.1, 0.05, "triangle"), 80);
  setTimeout(() => playTone(1100, 0.08, 0.04, "triangle"), 160);
}

function playSoundChoice(isGood: boolean) {
  if (isGood) {
    playTone(523, 0.1, 0.06, "sine");
    setTimeout(() => playTone(659, 0.1, 0.06, "sine"), 100);
    setTimeout(() => playTone(784, 0.15, 0.05, "sine"), 200);
  } else {
    playTone(440, 0.12, 0.05, "triangle");
    setTimeout(() => playTone(370, 0.15, 0.04, "triangle"), 120);
  }
}

function playSoundComplete() {
  playTone(523, 0.12, 0.07, "sine");
  setTimeout(() => playTone(659, 0.12, 0.07, "sine"), 120);
  setTimeout(() => playTone(784, 0.12, 0.07, "sine"), 240);
  setTimeout(() => playTone(1047, 0.2, 0.06, "sine"), 360);
}

// ===== Chat Component =====
interface ChatSimulationProps {
  scenarioId: string;
  phaseId: string;
  onComplete: (earnedPoints: number) => void;
  storageKey: string;
  userName?: string;
}

// Helper: get user name from localStorage
function getUserName(): string {
  try {
    // Primary: dedicated user-name key
    const name = localStorage.getItem("user-name");
    if (name) return name;
    // Fallback: auth-state (legacy)
    const saved = localStorage.getItem("auth-state");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.name) return parsed.name;
    }
  } catch {}
  return "Вы";
}

// Avatar component: renders photo or fallback initials
function ParticipantAvatar({ participant, size = "sm" }: { participant: ChatParticipant; size?: "sm" | "xs" }) {
  const sizeClass = size === "sm" ? "w-7 h-7" : "w-6 h-6";
  const isUrl = participant.avatar.startsWith("http");
  if (isUrl) {
    return (
      <img
        src={participant.avatar}
        alt={participant.name}
        className={`${sizeClass} rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-white shadow-sm`}
      />
    );
  }
  return (
    <span className={`${sizeClass} rounded-full ${participant.color} flex items-center justify-center text-sm shrink-0 mt-0.5`}>
      {participant.avatar}
    </span>
  );
}

// Replace {USER} placeholder with actual user name in message text
function personalizeText(text: string, userName: string): string {
  return text.replace(/\{USER\}/g, userName);
}

interface SavedChatState {
  completed: boolean;
  choicesMade: Record<string, string>;
  earnedPoints: number;
  revealedCount: number;
}

export function ChatSimulation({ scenarioId, phaseId, onComplete, storageKey, userName: userNameProp }: ChatSimulationProps) {
  const resolvedUserName = userNameProp || getUserName();
  const chatData = ALL_CHATS[scenarioId]?.find(c => c.phaseId === phaseId);
  
  // If no chat data for this phase, immediately complete
  useEffect(() => {
    if (!chatData) {
      onComplete(0);
    }
  }, [chatData, onComplete]);

  const loadState = useCallback((): SavedChatState => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return data[phaseId] || { completed: false, choicesMade: {}, earnedPoints: 0, revealedCount: 0 };
    } catch { return { completed: false, choicesMade: {}, earnedPoints: 0, revealedCount: 0 }; }
  }, [storageKey, phaseId]);

  const saveState = useCallback((state: SavedChatState) => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
      data[phaseId] = state;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
  }, [storageKey, phaseId]);

  const saved = loadState();
  const wasPreviouslyCompleted = saved.completed;
  const [revealedCount, setRevealedCount] = useState(saved.completed ? (chatData?.messages.length || 0) : Math.max(saved.revealedCount, 1));
  const [choicesMade, setChoicesMade] = useState<Record<string, string>>(saved.choicesMade);
  const [earnedPoints, setEarnedPoints] = useState(saved.earnedPoints);
  const [isComplete, setIsComplete] = useState(saved.completed);
  const [isTyping, setIsTyping] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<{ id: string; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSkipChat = useCallback(() => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    const msgLen = chatData?.messages.length || 0;
    setRevealedCount(msgLen);
    setIsComplete(true);
    setIsTyping(false);
    setReactionMessage(null);
    const state: SavedChatState = { completed: true, choicesMade, earnedPoints, revealedCount: msgLen };
    saveState(state);
    onComplete(earnedPoints);
  }, [chatData, choicesMade, earnedPoints, saveState, onComplete]);

  const messages = chatData?.messages || [];
  const participants = chatData?.participants || {};

  // Check if current last message is an interaction that needs a choice
  const lastRevealedIdx = revealedCount - 1;
  const lastRevealed = lastRevealedIdx >= 0 && lastRevealedIdx < messages.length ? messages[lastRevealedIdx] : null;
  const needsChoice = lastRevealed && "type" in lastRevealed && !choicesMade[`${phaseId}-${lastRevealedIdx}`];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [revealedCount, reactionMessage, isTyping]);

  // Auto-advance: schedule next message reveal automatically
  useEffect(() => {
    if (!chatData || isComplete || isTyping || reactionMessage || needsChoice) return;
    if (revealedCount >= messages.length) {
      if (!isComplete && messages.length > 0) {
        setIsComplete(true);
        const state: SavedChatState = { completed: true, choicesMade, earnedPoints, revealedCount: messages.length };
        saveState(state);
        onComplete(earnedPoints);
        playSoundComplete();
      }
      return;
    }

    const nextMsg = messages[revealedCount];
    const delay = revealedCount === 0 ? 400 : (800 + Math.random() * 1200);

    autoAdvanceTimerRef.current = setTimeout(() => {
      if ("type" in nextMsg) {
        setRevealedCount(prev => prev + 1);
        playSoundInteraction();
        const state: SavedChatState = { completed: false, choicesMade, earnedPoints, revealedCount: revealedCount + 1 };
        saveState(state);
      } else {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setRevealedCount(prev => prev + 1);
          playSoundMessage();
          const state: SavedChatState = { completed: false, choicesMade, earnedPoints, revealedCount: revealedCount + 1 };
          saveState(state);
        }, 500 + Math.random() * 700);
      }
    }, delay);

    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, [revealedCount, isComplete, isTyping, reactionMessage, needsChoice, messages.length, choicesMade, earnedPoints]);

  if (!chatData) return null;

  const handleChoice = (interactionIdx: number, choice: ChatChoice) => {
    const key = `${phaseId}-${interactionIdx}`;
    if (choicesMade[key]) return;

    const newChoices = { ...choicesMade, [key]: choice.id };
    const newPoints = earnedPoints + choice.points;
    setChoicesMade(newChoices);
    setEarnedPoints(newPoints);
    setReactionMessage({ id: key, text: choice.reaction });
    playSoundChoice(choice.isGood);

    // Clear reaction after delay → auto-advance will pick up
    setTimeout(() => {
      setReactionMessage(null);
      // Save state so auto-advance can continue
      const state: SavedChatState = { completed: false, choicesMade: newChoices, earnedPoints: newPoints, revealedCount };
      saveState(state);
    }, 2200);
  };

  let interactionCounter = 0;

  // Don't render anything if no chat data for this phase
  if (!chatData) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-white dark:bg-card overflow-hidden mb-5 shadow-sm">
      {/* Chat Header — messenger style */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-3">
        <div className="relative">
          <div className="flex -space-x-2">
            {Object.values(participants).slice(0, 3).map((p, i) => (
              <img
                key={i}
                src={p.avatar}
                alt={p.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700 relative"
                style={{ zIndex: 3 - i }}
              />
            ))}
            {Object.values(participants).length > 3 && (
              <div className="w-8 h-8 rounded-full bg-slate-600 ring-2 ring-slate-700 flex items-center justify-center text-[0.625rem] text-white/70 font-medium relative" style={{ zIndex: 0 }}>
                +{Object.values(participants).length - 3}
              </div>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-800" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.8125rem] font-semibold text-white">Рабочий чат команды</p>
          <p className="text-[0.625rem] text-white/40">
            {Object.values(participants).length + 1} участников · онлайн
          </p>
        </div>
        {earnedPoints > 0 && (
          <span className="text-[0.6875rem] font-bold text-amber-300 bg-amber-900/30 px-2.5 py-1 rounded-full">
            +{earnedPoints} 🌰
          </span>
        )}
        {!isComplete && wasPreviouslyCompleted && (
          <button
            onClick={handleSkipChat}
            className="flex items-center gap-1 text-[0.6875rem] text-white/50 hover:text-white/80 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors"
            title="Пропустить чат (повторное прохождение)"
          >
            <SkipForward className="w-3 h-3" />
            <span>Пропустить</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="px-4 py-3 space-y-3 max-h-[480px] overflow-y-auto bg-gradient-to-b from-slate-50/50 to-white">
        {/* Date divider */}
        <div className="flex items-center justify-center py-1">
          <span className="text-[0.625rem] text-muted-foreground/30 bg-slate-100/80 px-3 py-1 rounded-full font-medium">
            Сегодня
          </span>
        </div>
        {messages.slice(0, revealedCount).map((msg, idx) => {
          if ("type" in msg) {
            const thisInteractionIdx = idx;
            interactionCounter++;
            const key = `${phaseId}-${thisInteractionIdx}`;
            const chosenId = choicesMade[key];
            const { interaction } = msg;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-2"
              >
                <div className="text-center mb-2">
                  <span className="text-[0.625rem] text-muted-foreground/40 bg-muted/30 px-2.5 py-1 rounded-full font-medium">
                    💬 Ваш ответ
                  </span>
                </div>
                {interaction.prompt && (
                  <p className="text-[0.6875rem] text-muted-foreground/60 text-center mb-2 italic">{interaction.prompt}</p>
                )}
                <div className="space-y-1.5">
                  {interaction.choices.map((choice) => {
                    const isChosen = chosenId === choice.id;
                    const isRevealed = !!chosenId;
                    return (
                      <button
                        key={choice.id}
                        onClick={() => !isRevealed && handleChoice(thisInteractionIdx, choice)}
                        disabled={!!isRevealed}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[0.8125rem] transition-all leading-relaxed ${
                          isRevealed
                            ? isChosen
                              ? choice.isGood
                                ? "bg-emerald-50 ring-2 ring-emerald-300 text-emerald-900"
                                : "bg-amber-50 ring-2 ring-amber-300 text-amber-900"
                              : "bg-slate-50/50 text-muted-foreground/40 ring-1 ring-border/10"
                            : "bg-teal-50/50 ring-1 ring-teal-200 hover:ring-teal-400 hover:bg-teal-50 cursor-pointer text-foreground"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isRevealed && isChosen && (
                            <span className={`mt-0.5 shrink-0 ${choice.isGood ? "text-emerald-500" : "text-amber-500"}`}>
                              {choice.isGood ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </span>
                          )}
                          <span>{choice.text}</span>
                          {isRevealed && isChosen && choice.points > 0 && (
                            <span className="ml-auto text-[0.625rem] font-bold text-amber-600 whitespace-nowrap shrink-0">+{choice.points} 🌰</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Reaction */}
                {reactionMessage && reactionMessage.id === key && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 space-y-2"
                  >
                    {reactionMessage.text.split("\n").map((line, li) => {
                      const match = line.match(/^(.+?):\s(.+)$/);
                      if (match) {
                        const name = match[1];
                        const text = match[2];
                        const participant = Object.values(participants).find(p => p.name === name);
                        return (
                          <div key={li} className="flex items-start gap-2">
                            {participant ? (
                              <ParticipantAvatar participant={participant} size="xs" />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">💬</span>
                            )}
                            <div className="bg-slate-50 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                              <p className="text-[0.625rem] font-semibold text-muted-foreground/70 mb-0.5">{name}</p>
                              <p className="text-[0.8125rem] text-foreground leading-relaxed">{text}</p>
                            </div>
                          </div>
                        );
                      }
                      return <p key={li} className="text-[0.8125rem] text-muted-foreground/70 px-8">{line}</p>;
                    })}
                  </motion.div>
                )}
                {/* Saved reaction for completed chats */}
                {chosenId && !reactionMessage && (() => {
                  const chosenChoice = interaction.choices.find(c => c.id === chosenId);
                  if (!chosenChoice) return null;
                  return (
                    <div className="mt-3 space-y-2">
                      {chosenChoice.reaction.split("\n").map((line, li) => {
                        const match = line.match(/^(.+?):\s(.+)$/);
                        if (match) {
                          const name = match[1];
                          const text = match[2];
                          const participant = Object.values(participants).find(p => p.name === name);
                          return (
                            <div key={li} className="flex items-start gap-2">
                              {participant ? (
                                <ParticipantAvatar participant={participant} size="xs" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">💬</span>
                              )}
                              <div className="bg-slate-50 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                                <p className="text-[0.625rem] font-semibold text-muted-foreground/70 mb-0.5">{name}</p>
                                <p className="text-[0.8125rem] text-foreground leading-relaxed">{text}</p>
                              </div>
                            </div>
                          );
                        }
                        return <p key={li} className="text-[0.8125rem] text-muted-foreground/70 px-8">{line}</p>;
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            );
          }

          // Regular message
          const participant = participants[msg.from];
          if (!participant) return null;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2"
            >
              <ParticipantAvatar participant={participant} size="sm" />
              <div className="bg-slate-50 rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[0.6875rem] font-semibold text-foreground">{participant.name}</span>
                  <span className="text-[0.5625rem] text-muted-foreground/40">{participant.role}</span>
                </div>
                <p className="text-[0.8125rem] text-foreground/90 leading-relaxed whitespace-pre-line">{personalizeText(msg.text, resolvedUserName)}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[0.5625rem] text-muted-foreground/30">{generateTimestamp(idx)}</span>
                  {idx < revealedCount - 1 && <CheckCheck className="w-3 h-3 text-teal-400/50" />}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (() => {
          const nextMsg = revealedCount < messages.length ? messages[revealedCount] : null;
          const typingParticipant = nextMsg && !("type" in nextMsg) ? participants[nextMsg.from] : null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2"
            >
              {typingParticipant && (
                <ParticipantAvatar participant={typingParticipant} size="sm" />
              )}
              <div className="bg-slate-100 rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                  className="w-1.5 h-1.5 rounded-full bg-slate-400"
                />
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-slate-400"
                />
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                  className="w-1.5 h-1.5 rounded-full bg-slate-400"
                />
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* Footer — messenger-style input bar */}
      <div className="px-3 py-2.5 border-t border-border/20 bg-slate-50/30">
        {isComplete ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium py-0.5">
            <CheckCheck className="w-4 h-4" />
            Чат завершён
            {earnedPoints > 0 && (
              <span className="text-amber-600 font-bold ml-2">+{earnedPoints} 🌰</span>
            )}
          </div>
        ) : needsChoice ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white dark:bg-card border border-teal-200 dark:border-teal-800 rounded-full px-4 py-2 text-[0.8125rem] text-teal-600/70 dark:text-teal-400/70 font-medium animate-pulse">
              Выберите ваш ответ выше...
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white dark:bg-card border border-border/40 rounded-full px-4 py-2 text-[0.8125rem] text-muted-foreground/30">
              Сообщение...
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5 text-teal-400/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
