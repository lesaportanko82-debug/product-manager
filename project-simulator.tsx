import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket, CheckCircle2, ArrowRight, Target, Users,
  BarChart3, Layers, Calendar, FlaskConical, MessageSquare,
  AlertTriangle, TrendingUp, Award, Star, ChevronDown,
  Lightbulb, XCircle, RefreshCw, Briefcase, Zap, Trophy,
  ShoppingCart, GraduationCap, Server, ArrowLeft, Gamepad2,
  Shield, Globe, HeartHandshake, BookOpen, Settings,
  Download, Linkedin, Share2, X
} from "lucide-react";
import { addLocalXP } from "./interactive-progress";
import { ChatSimulation, getChatPointsForScenario } from "./chat-simulation";
import { getUserName } from "./user-name";

// ===== Types =====
interface SimChoice {
  text: string;
  correct: boolean;
  feedback: string;
  points: number;
}

interface SimQuestion {
  id: string;
  question: string;
  context?: string;
  choices: SimChoice[];
  hint?: string;
}

interface SimPhase {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  narrative: string[];
  questions: SimQuestion[];
  summary: string;
}

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  description: string[];
  phases: SimPhase[];
}

// ===== Scenario 1: FreshBite (Food Delivery) =====
const FRESHBITE_PHASES: SimPhase[] = [
  {
    id: "brief", title: "Брифинг проекта", subtitle: "Изучите контекст и определите ключевые вызовы",
    icon: Briefcase, color: "text-slate-600", bgColor: "bg-slate-100",
    narrative: [
      "Вы — новый Head of Product в стартапе «FreshBite» (доставка еды). Компания растёт на 15% в месяц, MAU = 120 000, но retention 30-day = 18%. CEO хочет запустить подписочную модель «FreshBite+» за 3 месяца.",
      "Ваша задача — провести проект от исследования до запуска. У вас команда: 2 разработчика, 1 дизайнер, 1 аналитик, 1 маркетолог.",
    ],
    questions: [
      { id: "fb-b1", question: "С чего вы начнёте работу над проектом подписки?", context: "CEO настаивает на немедленном запуске разработки. У вас есть гипотеза, но нет данных.", choices: [
        { text: "Сразу начать разработку MVP подписки — скорость важнее", correct: false, feedback: "Без валидации гипотезы вы рискуете потратить 3 месяца на фичу, которая никому не нужна.", points: 0 },
        { text: "Провести CustDev-исследование текущих пользователей", correct: true, feedback: "Отлично! Потребность клиента первична. CustDev поможет понять, готовы ли пользователи платить за подписку.", points: 15 },
        { text: "Скопировать модель подписки конкурентов", correct: false, feedback: "Копирование не учитывает специфику вашей аудитории.", points: 5 },
        { text: "Провести A/B-тест с фейковой кнопкой подписки", correct: false, feedback: "Painted Door — хороший приём, но начинать стоит с глубинного CustDev.", points: 8 },
      ], hint: "Вспомните принцип: «Потребность клиента первична»." },
      { id: "fb-b2", question: "Какой фреймворк лучше всего подходит для определения рисков проекта?", choices: [
        { text: "SWOT-анализ", correct: false, feedback: "SWOT — стратегический обзор, не фокус на конкретных рисках гипотезы.", points: 3 },
        { text: "RAT (Riskiest Assumption Test)", correct: true, feedback: "RAT: 1) Выписать допущения, 2) Отранжировать, 3) Проверять сверху вниз.", points: 15 },
        { text: "PESTEL-анализ", correct: false, feedback: "PESTEL — макро-уровень. Для проектных рисков слишком широкий.", points: 2 },
        { text: "Бизнес-модель Canvas", correct: false, feedback: "Canvas даёт общую картину, но не приоритизирует рисковые допущения.", points: 5 },
      ] },
      { id: "fb-b3", question: "Вы провели 12 CustDev-интервью. Какой главный сигнал готовности рынка?", choices: [
        { text: "8 из 12 сказали «Было бы прикольно»", correct: false, feedback: "«Прикольно» — слабый сигнал. Compliance Bias.", points: 3 },
        { text: "5 из 12 уже платят конкурентам за подобную услугу", correct: true, feedback: "Если люди УЖЕ тратят деньги на решение проблемы — потребность реальна.", points: 15 },
        { text: "10 из 12 сказали, что цена 299 ₽/мес — нормальная", correct: false, feedback: "Гипотетический вопрос о цене и реальная оплата — разные вещи.", points: 4 },
        { text: "Средний NPS интервьюируемых = 45", correct: false, feedback: "NPS показывает лояльность к текущему продукту, не готовность к подписке.", points: 2 },
      ] },
    ],
    summary: "Вы определили проект, провели CustDev и выявили реальную потребность!"
  },
  {
    id: "personas", title: "Исследование и персоны", subtitle: "JTBD и CJM",
    icon: Users, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["На основе CustDev вы выделили 3 сегмента: «Занятые профессионалы» (60%), «Молодые семьи» (25%), «Фитнес-энтузиасты» (15%)."],
    questions: [
      { id: "fb-p1", question: "Как правильно сформулировать Job Story для «Занятых профессионалов»?", choices: [
        { text: "Как занятой профессионал, я хочу подписку на еду, чтобы экономить время", correct: false, feedback: "Это User Story, а не Job Story. Job Story фокусируется на контексте.", points: 5 },
        { text: "Когда у меня нет времени готовить после работы, я хочу получать готовые блюда, чтобы не думать о еде и чувствовать заботу о здоровье", correct: true, feedback: "Идеально! «Когда [ситуация] → хочу [результат] → чтобы [эмоция]».", points: 15 },
        { text: "Пользователь хочет подписку, потому что ему лень готовить", correct: false, feedback: "Слишком поверхностно. Нет контекста и эмоционального результата.", points: 2 },
        { text: "Занятой профессионал заказывает еду 4 раза в неделю", correct: false, feedback: "Это наблюдение (факт), а не Job Story.", points: 3 },
      ], hint: "Формат: «Когда [контекст] → хочу [результат] → чтобы [эмоция]»." },
      { id: "fb-p2", question: "Какой CJM-этап самый проблемный? Конверсия в первый заказ 35%, повторный 22%, подписка рассылка 8%.", choices: [
        { text: "Первый заказ — 35% мало", correct: false, feedback: "35% — неплохой показатель для доставки еды.", points: 3 },
        { text: "Повторный заказ — 22% критически низкий", correct: true, feedback: "22% повторных — главный drop-off. Подписка как retention-инструмент!", points: 15 },
        { text: "Подписка на рассылку — 8% очень мало", correct: false, feedback: "8% для email-подписки — нормальный показатель.", points: 4 },
        { text: "Все этапы одинаково проблемные", correct: false, feedback: "Нужно искать bottleneck — точку с наибольшим drop-off.", points: 1 },
      ] },
      { id: "fb-p3", question: "Какой инструмент лучше визуализирует путь клиента?", choices: [
        { text: "Affinity Diagram", correct: false, feedback: "Для группировки инсайтов, не для пути.", points: 5 },
        { text: "Customer Journey Map (CJM)", correct: true, feedback: "CJM: этапы → действия → точки контакта → эмоции → боли → возможности.", points: 15 },
        { text: "User Flow диаграмма", correct: false, feedback: "User Flow — экраны и переходы, не эмоции.", points: 4 },
        { text: "Канбан-доска", correct: false, feedback: "Канбан — управление задачами, не исследование.", points: 1 },
      ] },
    ],
    summary: "Персоны созданы, JTBD определены, CJM построена!"
  },
  {
    id: "metrics", title: "Метрики и Unit-экономика", subtitle: "North Star и расчёт экономики",
    icon: BarChart3, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["Текущие данные: ARPU = 480 ₽/мес, CAC = 1 200 ₽, средний чек = 650 ₽, частота = 2.8/мес, Churn = 12%/мес. Планируемая цена FreshBite+: 599 ₽/мес."],
    questions: [
      { id: "fb-m1", question: "Какую North Star Metric вы выберете для FreshBite+?", choices: [
        { text: "Количество активных подписчиков", correct: false, feedback: "Vanity metric — не показывает ценность для пользователя.", points: 4 },
        { text: "Количество заказов от подписчиков в неделю", correct: true, feedback: "Показывает: пользователи получают ценность + бизнес растёт. Истинная North Star!", points: 15 },
        { text: "MRR (Monthly Recurring Revenue)", correct: false, feedback: "MRR не отражает ценность для пользователя.", points: 6 },
        { text: "NPS подписчиков", correct: false, feedback: "NPS — lagging indicator прошлого опыта.", points: 3 },
      ], hint: "North Star = пересечение ценности для пользователя и роста бизнеса." },
      { id: "fb-m2", question: "Рассчитайте LTV подписчика (данные после 1-го месяца работы подписки: улучшенные показатели). Средний чек = 750 ₽, частота = 4.2/мес, маржа = 25%, Churn = 8%/мес. CAC остаётся 1 200 ₽.", choices: [
        { text: "LTV = 9 843 ₽", correct: true, feedback: "LTV = (750 × 4.2 × 0.25) / 0.08 = 9 843.75 ₽. LTV/CAC = 9 844/1 200 = 8.2 — отличный результат!", points: 15 },
        { text: "LTV = 3 150 ₽", correct: false, feedback: "Не забудьте разделить на Churn Rate.", points: 3 },
        { text: "LTV = 39 375 ₽", correct: false, feedback: "Не учли маржу (25%).", points: 4 },
        { text: "LTV = 2 625 ₽", correct: false, feedback: "Перепроверьте формулу.", points: 2 },
      ], hint: "LTV = (Средний чек × Частота × Маржа) / Churn Rate." },
      { id: "fb-m3", question: "FreshBite+: ARPU = 599 ₽/мес, CAC = 1 200 ₽. CAC Payback = 1 200/599 ≈ 2 мес. Какой Churn Rate обеспечит устойчивую unit-экономику (LTV/CAC ≥ 3)?", choices: [
        { text: "Churn ≤ 15%/мес: LTV ≈ 599×0.7/0.15 = 2 796 ₽, LTV/CAC = 2.3 — недостаточно", correct: false, feedback: "LTV = ARPU×Маржа/Churn = 599×0.7/0.15 = 2 796 ₽. LTV/CAC = 2.3 — ниже порога ×3.", points: 5 },
        { text: "Churn ≤ 10%/мес: LTV ≈ 599×0.7/0.10 = 4 193 ₽, LTV/CAC = 3.5 — устойчиво", correct: true, feedback: "При Churn 10% lifetime = 10 мес, LTV = 4 193 ₽, LTV/CAC = 3.5 ≥ 3. Бизнес масштабируем! CAC окупается за 2 мес, остаток — чистая маржа.", points: 15 },
        { text: "Churn ≤ 25%/мес: LTV ≈ 1 677 ₽, LTV/CAC = 1.4 — убыточно", correct: false, feedback: "При Churn 25% lifetime = 4 мес, LTV = 1 677 ₽, LTV/CAC = 1.4 — бизнес не окупается в долгосрочной перспективе.", points: 3 },
        { text: "Churn ≤ 5%/мес: идеально, но нереалистично", correct: false, feedback: "Churn 5% — прекрасный показатель, но для food delivery стартапа нереалистичен на старте. Цель — 10%.", points: 8 },
      ] },
    ],
    summary: "Метрики определены, unit-экономика сходится!"
  },
  {
    id: "prioritize", title: "Приоритизация фич", subtitle: "RICE и MVP",
    icon: Layers, color: "text-cyan-600", bgColor: "bg-cyan-50",
    narrative: ["Бэклог из 8 фич. Ресурсов на 3-4 в MVP. Нужна приоритизация."],
    questions: [
      { id: "fb-pr1", question: "RICE для «Бесплатная доставка»: Reach = 10 000, Impact = 3, Confidence = 90%, Effort = 2.", choices: [
        { text: "RICE = 13 500", correct: true, feedback: "RICE = (10 000 × 3 × 0.9) / 2 = 13 500. Очень высокий — в MVP!", points: 15 },
        { text: "RICE = 27 000", correct: false, feedback: "Забыли разделить на Effort.", points: 5 },
        { text: "RICE = 15 000", correct: false, feedback: "Confidence = 90% = 0.9, не 1.0.", points: 4 },
        { text: "RICE = 4 500", correct: false, feedback: "Перепроверьте формулу.", points: 2 },
      ], hint: "RICE = (Reach × Impact × Confidence) / Effort" },
      { id: "fb-pr2", question: "3 фичи с одинаковым RICE. Как выбрать для MVP?", choices: [
        { text: "Спросить CEO", correct: false, feedback: "Не проактивная позиция PM.", points: 2 },
        { text: "Выбрать по Confidence: чем выше — тем лучше для MVP", correct: true, feedback: "В MVP важна предсказуемость. Высокий Confidence снижает риск.", points: 15 },
        { text: "Выбрать самые сложные", correct: false, feedback: "В MVP — простое и ценное.", points: 1 },
        { text: "Бросить монетку", correct: false, feedback: "Есть данные — используйте их.", points: 0 },
      ] },
      { id: "fb-pr3", question: "Дизайнер хочет «красивые анимации» в MVP. Решение?", choices: [
        { text: "Добавить — UX важен", correct: false, feedback: "В MVP фокус на ценности, не полировке.", points: 3 },
        { text: "Отложить в бэклог — в MVP только core value", correct: true, feedback: "MVP = Minimum VIABLE Product. Фокус на гипотезе ценности.", points: 15 },
        { text: "Компромисс — только на главном экране", correct: false, feedback: "Увеличивает scope.", points: 5 },
        { text: "Пусть сделает параллельно", correct: false, feedback: "Opportunity cost — время на анимации ≠ время на ключевые экраны.", points: 3 },
      ] },
    ],
    summary: "Бэклог приоритизирован, MVP определён!"
  },
  {
    id: "agile", title: "Спринт-планирование", subtitle: "Scrum и командная работа",
    icon: Calendar, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["12 недель (6 спринтов). Команда: 2 dev (velocity 40 SP/спринт), 1 дизайнер, 1 аналитик."],
    questions: [
      { id: "fb-a1", question: "Как организовать спринт-планирование?", choices: [
        { text: "PM пишет задачи, команда оценивает", correct: false, feedback: "PM не должен диктовать задачи.", points: 5 },
        { text: "Команда декомпозирует user stories, оценивает SP, PM приоритизирует", correct: true, feedback: "Scrum: PM приоритизирует, команда декомпозирует и оценивает.", points: 15 },
        { text: "Каждый dev сам выбирает задачи", correct: false, feedback: "Без приоритизации — хаос.", points: 3 },
        { text: "Аналитик готовит спецификации", correct: false, feedback: "Waterfall-подход.", points: 2 },
      ] },
      { id: "fb-a2", question: "Середина спринта 2. Интеграция займёт +3 дня. Что делать?", choices: [
        { text: "Попросить работать сверхурочно", correct: false, feedback: "Овертаймы → выгорание → задержки.", points: 1 },
        { text: "Убрать low-priority задачу, сохранить sprint goal", correct: true, feedback: "Scope гибкий, sprint goal — нет.", points: 15 },
        { text: "Перенести спринт на неделю", correct: false, feedback: "Спринт — timebox. Меняем scope, не время.", points: 2 },
        { text: "Помочь разработчику лично", correct: false, feedback: "PM не должен кодить.", points: 4 },
      ] },
      { id: "fb-a3", question: "Какой артефакт Scrum покажет прогресс стейкхолдерам?", choices: [
        { text: "Daily Standup", correct: false, feedback: "Standup — для команды, не стейкхолдеров.", points: 3 },
        { text: "Sprint Review + Product Increment", correct: true, feedback: "Демо работающего продукта каждые 2 недели. Прозрачность!", points: 15 },
        { text: "Gantt-диаграмма", correct: false, feedback: "Gantt — Waterfall.", points: 2 },
        { text: "Еженедельный email-отчёт", correct: false, feedback: "Однонаправленная коммуникация.", points: 4 },
      ] },
    ],
    summary: "Спринт спланирован, команда синхронизирована!"
  },
  {
    id: "experiment", title: "A/B-тестирование", subtitle: "Дизайн эксперимента",
    icon: FlaskConical, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["MVP готов. 120 000 MAU. Проверяем: увеличит ли FreshBite+ частоту заказов с 2.8 до 3.5/мес."],
    questions: [
      { id: "fb-e1", question: "Минимальный размер выборки? (MDE = 25%, baseline = 2.8, α = 5%, power = 80%)", choices: [
        { text: "100 в каждой группе", correct: false, feedback: "Слишком мало — stat sig не достичь.", points: 2 },
        { text: "1 000 в каждой группе", correct: true, feedback: "Для MDE 25% ≈ 1 000 в группе. При MAU 120K — легко.", points: 15 },
        { text: "60 000 — половина MAU", correct: false, feedback: "Избыточно.", points: 4 },
        { text: "500", correct: false, feedback: "Риск ошибки II типа.", points: 5 },
      ] },
      { id: "fb-e2", question: "3 недели теста. Группа B = 3.2 заказа, контроль = 2.9. p = 0.12. Что делать?", choices: [
        { text: "Результат положительный — запускаем!", correct: false, feedback: "p = 0.12 > 0.05. НЕ статистически значимо.", points: 2 },
        { text: "Продолжить тест до stat sig (p < 0.05)", correct: true, feedback: "Тренд положительный, но «peeking» — классическая ошибка.", points: 15 },
        { text: "Увеличить выборку и перезапустить", correct: false, feedback: "Нельзя менять параметры на ходу.", points: 4 },
        { text: "Тест провалился — отменяем", correct: false, feedback: "p = 0.12 — не провал, а недостаточно данных.", points: 3 },
      ] },
      { id: "fb-e3", question: "Тест завершён: частота +22%, retention +15%, но ARPU подписчиков 520 ₽ (ниже ожидаемого). Почему?", choices: [
        { text: "Баг в аналитике", correct: false, feedback: "Не спешите с «багом» — это реальный инсайт.", points: 2 },
        { text: "Скидка 10% + бесплатная доставка снизили средний чек", correct: true, feedback: "Заказывают чаще, но дешевле. Нужна оптимизация ценовой модели.", points: 15 },
        { text: "Подписку покупают low-value клиенты", correct: false, feedback: "Частично, но главная причина — структурная: скидки.", points: 6 },
        { text: "Цена 599 ₽ слишком дёшево", correct: false, feedback: "Цена — не причина падения среднего чека заказа.", points: 3 },
      ] },
    ],
    summary: "Эксперимент проведён корректно!"
  },
  {
    id: "stakeholders", title: "Стейкхолдеры", subtitle: "Продажа результатов",
    icon: MessageSquare, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["CFO скептичен (потеря маржи). CTO хочет больше фич. CMO хочет запуск «вчера»."],
    questions: [
      { id: "fb-s1", question: "CFO: «Средний чек упал на 12%. Как компенсировать?»", choices: [
        { text: "«LTV подписчика в 2x выше обычного пользователя»", correct: true, feedback: "Переключаете фрейм на lifetime value. Data-driven!", points: 15 },
        { text: "«Уберём скидку 10%»", correct: false, feedback: "Убирать core value без тестирования — рискованно.", points: 4 },
        { text: "«Рынок подписок растёт»", correct: false, feedback: "Слабый аргумент для CFO.", points: 3 },
        { text: "«Пересмотрим в следующем квартале»", correct: false, feedback: "Уклонение.", points: 1 },
      ] },
      { id: "fb-s2", question: "CTO: «Добавим кешбэк, персонализацию и семейный план за +4 недели».", choices: [
        { text: "«Отлично! Давайте всё добавим»", correct: false, feedback: "Scope creep!", points: 1 },
        { text: "«Запускаем MVP сейчас, фичи — в roadmap Q2. Data от MVP покажет приоритеты»", correct: true, feedback: "Баланс speed-to-market и будущих улучшений.", points: 15 },
        { text: "«Нет, следуем плану»", correct: false, feedback: "Жёсткое «нет» создаёт конфликт.", points: 3 },
        { text: "«Давайте проголосуем»", correct: false, feedback: "Голосование — не data-driven.", points: 2 },
      ] },
      { id: "fb-s3", question: "CEO: «Retention 82%. Как довести до 90%?»", choices: [
        { text: "«82% — хороший результат. Давайте масштабируем»", correct: false, feedback: "Не игнорируйте запрос CEO.", points: 5 },
        { text: "«HADI: H = персонализация, A = рекомендации, D = A/B-тест, I = 30-day retention»", correct: true, feedback: "HADI-цикл показывает системный подход!", points: 15 },
        { text: "«Нужно нанять ещё разработчика»", correct: false, feedback: "Найм — не ответ на вопрос о retention.", points: 2 },
        { text: "«Push-уведомления и email»", correct: false, feedback: "Тактика без стратегии.", points: 4 },
      ] },
    ],
    summary: "Стейкхолдеры убеждены, запуск одобрен!"
  },
  {
    id: "crisis", title: "Кризис-менеджмент", subtitle: "Инциденты после запуска",
    icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50",
    narrative: ["Первая неделя: 3 200 подписчиков. Среда: лавина жалоб — подписчики не получают бесплатную доставку при заказах до 500 ₽."],
    questions: [
      { id: "fb-c1", question: "150+ тикетов за 2 часа. Что ПЕРВЫМ?", choices: [
        { text: "Созвать разработчиков чинить баг", correct: false, feedback: "Вы даже не знаете, баг ли это.", points: 4 },
        { text: "Проанализировать тикеты, определить root cause, затем действовать", correct: true, feedback: "Assess → Diagnose → Act → Communicate.", points: 15 },
        { text: "Написать пост-извинение в соцсетях", correct: false, feedback: "Извиняться без понимания проблемы — паника.", points: 3 },
        { text: "Отключить подписку", correct: false, feedback: "Радикально. Затронет и довольных пользователей.", points: 2 },
      ] },
      { id: "fb-c2", question: "Root cause: в условиях «бесплатная доставка на все заказы», dev реализовали «от 500 ₽». Кто виноват?", choices: [
        { text: "Разработчики", correct: false, feedback: "Blame game не решает проблему.", points: 2 },
        { text: "Системный провал коммуникации — ответственность PM за acceptance criteria", correct: true, feedback: "PM отвечает за чёткие acceptance criteria!", points: 15 },
        { text: "Маркетолог", correct: false, feedback: "Маркетолог описал то, что было в требованиях.", points: 3 },
        { text: "Никто", correct: false, feedback: "Без анализа не предотвратите повторение.", points: 4 },
      ] },
      { id: "fb-c3", question: "Проблема исправлена за 4 часа. Следующий шаг?", choices: [
        { text: "Забыть и двигаться дальше", correct: false, feedback: "Без post-mortem повторите ошибку.", points: 1 },
        { text: "Blameless post-mortem + checklist для acceptance criteria", correct: true, feedback: "Blameless post-mortem: что → почему → как предотвратить.", points: 15 },
        { text: "Уволить разработчика", correct: false, feedback: "Toxic culture. Blameless environment — основа!", points: 0 },
        { text: "Отчёт для CEO", correct: false, feedback: "Часть, но не главное. Важнее — системные изменения.", points: 5 },
      ] },
    ],
    summary: "Кризис разрешён! Процессные улучшения внедрены."
  },
  {
    id: "growth", title: "Масштабирование", subtitle: "Growth loops и анализ",
    icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["Месяц после запуска: 8 500 подписчиков, retention 84%. CEO: 25 000 за 3 мес. Текущий темп: ~11 100."],
    questions: [
      { id: "fb-g1", question: "Наиболее эффективный growth loop?", choices: [
        { text: "Paid acquisition (Instagram, Facebook)", correct: false, feedback: "Paid — не sustainable loop. Зависимость от бюджета.", points: 4 },
        { text: "Referral: «Пригласи друга — оба получат неделю бесплатно»", correct: true, feedback: "Self-reinforcing цикл с низким CAC!", points: 15 },
        { text: "Content marketing: блог", correct: false, feedback: "6+ месяцев до результата. Слишком медленно.", points: 5 },
        { text: "Снизить цену до 299 ₽", correct: false, feedback: "Price war — гонка ко дну.", points: 2 },
      ] },
      { id: "fb-g2", question: "Referral-когорта: retention +20%, LTV +35% vs paid. Вывод?", choices: [
        { text: "Полностью отказаться от paid", correct: false, feedback: "Referral имеет ceiling. Не отказывайтесь полностью.", points: 4 },
        { text: "70% referral, 30% paid + тестировать новые каналы", correct: true, feedback: "Data-driven reallocation. Диверсификация каналов.", points: 15 },
        { text: "50/50", correct: false, feedback: "Не учитывает разницу в LTV.", points: 6 },
        { text: "Нужно больше данных", correct: false, feedback: "8 500 подписчиков — достаточная выборка.", points: 5 },
      ] },
      { id: "fb-g3", question: "Какой PM-скил оказался самым важным в проекте?", choices: [
        { text: "Техническая экспертиза", correct: false, feedback: "PM не пишет код.", points: 3 },
        { text: "Data-driven решения в условиях неопределённости", correct: true, feedback: "Суть PM! Данные → гипотезы → тесты → итерации.", points: 15 },
        { text: "Навыки переговоров", correct: false, feedback: "Важны, но без данных — «на вере».", points: 5 },
        { text: "Знание фреймворков", correct: false, feedback: "Инструменты, не скил.", points: 6 },
      ] },
    ],
    summary: "Проект масштабирован! Полный PM-цикл пройден."
  },
];

// ===== Scenario 2: B2B SaaS =====
const B2B_PHASES: SimPhase[] = [
  {
    id: "b2b-discovery", title: "Discovery и рынок", subtitle: "Исследование B2B-сегмента",
    icon: Briefcase, color: "text-slate-600", bgColor: "bg-slate-100",
    narrative: ["Вы — PM в компании «CloudTask» (B2B SaaS для управления проектами). Текущие клиенты: 450 компаний, MRR = $180K, Churn = 5%/мес. Задача: запустить Enterprise-план для крупных клиентов (500+ сотрудников)."],
    questions: [
      { id: "b2b-d1", question: "Как определить TAM для Enterprise-сегмента?", choices: [
        { text: "Посмотреть отчёт Gartner и взять общий размер рынка PM-инструментов", correct: false, feedback: "Top-down подход даёт слишком грубую оценку для конкретного сегмента.", points: 4 },
        { text: "Bottom-up: количество компаний 500+ × вероятность конверсии × средний чек Enterprise", correct: true, feedback: "Bottom-up: TAM = N × конверсия × ARPA. Конкретно и проверяемо!", points: 15 },
        { text: "Спросить отдел продаж сколько лидов приходит", correct: false, feedback: "Лиды ≠ TAM. Это текущий pipeline, не весь рынок.", points: 5 },
        { text: "Скопировать оценку конкурентов из их презентаций", correct: false, feedback: "У конкурентов другой ICP и pricing — их TAM не ваш.", points: 3 },
      ] },
      { id: "b2b-d2", question: "Потенциальный клиент (Enterprise) говорит: «Нам нужен SSO, SCIM, audit log и SOC-2 compliance». Как реагировать?", choices: [
        { text: "Пообещать всё за 2 месяца — главное продать", correct: false, feedback: "Over-promising → under-delivery → churn + репутационный ущерб.", points: 1 },
        { text: "Записать требования, приоритизировать по частоте запросов от разных Enterprise-лидов", correct: true, feedback: "Собрать паттерны из нескольких лидов → приоритизировать. Один клиент ≠ рынок.", points: 15 },
        { text: "Отказать — мы не готовы к Enterprise", correct: false, feedback: "Отказ без анализа — потеря возможности. Хотя бы зафиксируйте требования.", points: 3 },
        { text: "Сразу начать разработку SSO — это базовая потребность Enterprise", correct: false, feedback: "SSO может быть важен, но сначала валидируйте приоритет по всей когорте лидов.", points: 6 },
      ] },
      { id: "b2b-d3", question: "У вас 15 Enterprise-лидов. 12 из них просят SSO. Какой тип CustDev проводить?", choices: [
        { text: "Проблемные интервью — понять контекст запроса SSO", correct: false, feedback: "Контекст важен, но SSO — это не проблема, а техтребование. Нужно шире.", points: 5 },
        { text: "Решенческие интервью — показать прототип Enterprise-плана и спросить, готовы ли платить", correct: true, feedback: "Верно! 12 из 15 подтвердили потребность. Пора показать решение и валидировать WTP (willingness to pay).", points: 15 },
        { text: "Количественный опрос всех 450 клиентов", correct: false, feedback: "450 клиентов — не все Enterprise. Размываете фокус.", points: 4 },
        { text: "Конкурентный анализ — что предлагают другие за Enterprise", correct: false, feedback: "Полезно, но не заменяет разговор с вашими лидами.", points: 6 },
      ] },
    ],
    summary: "Discovery завершён! Enterprise-сегмент валидирован, TAM рассчитан."
  },
  {
    id: "b2b-pricing", title: "Pricing и экономика", subtitle: "Ценообразование B2B",
    icon: BarChart3, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["Текущий pricing: Starter $29/мес, Pro $79/мес. Enterprise-клиенты ожидают кастомный прайсинг. Средний deal size конкурентов: $2 000-5 000/мес."],
    questions: [
      { id: "b2b-p1", question: "Какую модель ценообразования выбрать для Enterprise?", choices: [
        { text: "Фиксированная цена $199/мес — привлечём объёмом", correct: false, feedback: "$199 — слишком дёшево для Enterprise. Дешёвый = несерьёзный в B2B.", points: 2 },
        { text: "Per-seat pricing от $15/user/мес с минимумом 50 seats", correct: true, feedback: "Per-seat scalable pricing. При 500 сотрудников = $7 500/мес. Предсказуемо для клиента, масштабируемо для вас.", points: 15 },
        { text: "Кастомный прайсинг для каждого клиента", correct: false, feedback: "Кастом = непредсказуемый pipeline и сложность forecasting.", points: 6 },
        { text: "Usage-based: $0.01 за каждую задачу", correct: false, feedback: "Usage-based непредсказуем для Enterprise — бюджеты планируются заранее.", points: 4 },
      ] },
      { id: "b2b-p2", question: "Enterprise-клиент хочет скидку 40% за годовой контракт. Ваша стратегия?", choices: [
        { text: "Согласиться — годовой контракт стоит любых скидок", correct: false, feedback: "40% — слишком много. Обрушит unit-экономику.", points: 3 },
        { text: "Предложить 20% за annual + бесплатный onboarding (стоимость $5K) — value add вместо скидки", correct: true, feedback: "Value bundling > price discount. Клиент получает ценность, вы сохраняете маржу.", points: 15 },
        { text: "Отказать — никаких скидок, цена одинакова для всех", correct: false, feedback: "Жёсткая позиция отпугнёт Enterprise. Нужна гибкость.", points: 4 },
        { text: "Предложить 40%, но за 3-летний контракт", correct: false, feedback: "3 года — слишком длинный lock-in для первого Enterprise-клиента.", points: 5 },
      ] },
      { id: "b2b-p3", question: "Ваш первый Enterprise deal: $3 500/мес, CAC = $25 000 (sales + onboarding). Когда окупится?", choices: [
        { text: "CAC payback = 7 месяцев", correct: true, feedback: "$25 000 / $3 500 ≈ 7.1 мес. Для B2B SaaS < 12 мес — отлично!", points: 15 },
        { text: "CAC payback = 3 месяца", correct: false, feedback: "$25 000 / $3 500 ≈ 7.1, не 3. Перепроверьте.", points: 3 },
        { text: "CAC payback = 12 месяцев", correct: false, feedback: "Пересчитайте: 25 000 / 3 500 ≈ 7.1 мес.", points: 5 },
        { text: "Невозможно рассчитать без Churn Rate", correct: false, feedback: "CAC Payback = CAC / MRR. Churn нужен для LTV, не payback.", points: 4 },
      ] },
    ],
    summary: "Pricing определён, первый deal закрыт!"
  },
  {
    id: "b2b-sales", title: "Sales-процесс и onboarding", subtitle: "Product-Led Sales",
    icon: Users, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["Enterprise sales cycle: 3-6 месяцев. Ваш подход: Product-Led Growth → Product-Led Sales. Нужно выстроить воронку."],
    questions: [
      { id: "b2b-s1", question: "Как ускорить Enterprise sales cycle с 6 до 3 месяцев?", choices: [
        { text: "Нанять больше Sales Engineers", correct: false, feedback: "Больше людей ≠ быстрее. Нужен процессный подход.", points: 4 },
        { text: "Дать бесплатный trial Enterprise-плана с автоматизированным onboarding", correct: true, feedback: "PLG → PLS: клиент видит ценность ДО общения с sales. Ускоряет принятие решений.", points: 15 },
        { text: "Снизить цену — проще согласовать бюджет", correct: false, feedback: "Низкая цена ≠ быстрее. В Enterprise согласование — процессный вопрос.", points: 3 },
        { text: "Отправлять больше cold emails", correct: false, feedback: "Outbound без inbound — низкая конверсия.", points: 2 },
      ] },
      { id: "b2b-s2", question: "Enterprise-клиент после trial говорит: «Продукт хороший, но решение принимает IT-директор. Он хочет security review.» Что делать?", choices: [
        { text: "Подготовить security whitepaper + назначить встречу IT-директора с вашим CTO", correct: true, feedback: "Правильно! Знание stakeholder map + подготовка материалов под каждого decision maker.", points: 15 },
        { text: "Попросить текущего контакта «протолкнуть» решение", correct: false, feedback: "Давление на champion может его отпугнуть.", points: 3 },
        { text: "Подождать — пусть решат сами", correct: false, feedback: "Пассивная позиция = потеря deal-а. Enterprise deals нужно nurture.", points: 1 },
        { text: "Предложить ещё больше скидку", correct: false, feedback: "Security concern ≠ ценовой вопрос. Не путайте возражения.", points: 2 },
      ] },
      { id: "b2b-s3", question: "После подписания контракта: как обеспечить успешный onboarding?", choices: [
        { text: "Отправить ссылку на документацию и видео-туториалы", correct: false, feedback: "Self-serve не работает для Enterprise. Нужен dedicated подход.", points: 3 },
        { text: "Назначить CSM, создать success plan с KPI на 30-60-90 дней", correct: true, feedback: "Customer Success = retention. 30-60-90 plan с измеримыми KPI — gold standard.", points: 15 },
        { text: "Пусть команда клиента сама разберётся — продукт интуитивный", correct: false, feedback: "Enterprise внедрение сложное. Без поддержки — высокий risk of churn.", points: 1 },
        { text: "Провести один обучающий вебинар", correct: false, feedback: "Один вебинар недостаточно для 500+ пользователей.", points: 4 },
      ] },
    ],
    summary: "Sales-процесс выстроен, первый Enterprise-клиент успешно онбордится!"
  },
  {
    id: "b2b-security", title: "Security и Compliance", subtitle: "Enterprise-требования безопасности",
    icon: Shield, color: "text-slate-600", bgColor: "bg-slate-100",
    narrative: ["5 Enterprise-лидов остановились на этапе Security Review. IT-директора требуют SOC-2 Type II, GDPR compliance, SSO/SAML и audit logs. Без этого — ни одна компания 500+ не подпишет контракт."],
    questions: [
      { id: "b2b-sec1", question: "SOC-2 Type II аудит стоит $50-80K и занимает 6-12 месяцев. Как приоритизировать?", choices: [
        { text: "Отложить SOC-2 — сначала наберём клиентов", correct: false, feedback: "Без SOC-2 Enterprise не купят. Chicken-and-egg, но compliance — must-have.", points: 3 },
        { text: "Начать с SOC-2 Type I (3-4 мес, $30K) + параллельно внедрить SSO/SAML как quick win", correct: true, feedback: "Type I → быстрая победа. SSO закрывает 80% запросов. Type II запустить параллельно.", points: 15 },
        { text: "Нанять CISO и пусть разбирается", correct: false, feedback: "CISO — дорого ($200K+/год). На этом этапе достаточно security consultant + roadmap.", points: 4 },
        { text: "Купить готовое compliance-решение (Vanta/Drata) и получить SOC-2 за месяц", correct: false, feedback: "Vanta/Drata ускоряют, но не до месяца. Type II — минимум 3 мес наблюдения.", points: 6 },
      ] },
      { id: "b2b-sec2", question: "Клиент требует data residency (данные только в ЕС). Ваша инфраструктура в US. Решение?", choices: [
        { text: "Отказать клиенту — слишком дорого перестраивать", correct: false, feedback: "EU — огромный рынок. Отказ = потеря 40%+ Enterprise pipeline.", points: 2 },
        { text: "Развернуть multi-region архитектуру с tenant isolation, начав с EU-региона", correct: true, feedback: "Multi-region — стратегическая инвестиция. Tenant-level routing позволяет выбирать регион для каждого клиента.", points: 15 },
        { text: "Использовать CDN и сказать, что данные «кешируются» в ЕС", correct: false, feedback: "CDN кеширует, но primary storage остаётся в US. Не проходит GDPR аудит.", points: 1 },
        { text: "Перенести всю инфраструктуру в ЕС", correct: false, feedback: "Полный перенос нарушит работу US-клиентов. Нужен multi-region, не миграция.", points: 5 },
      ] },
      { id: "b2b-sec3", question: "CISO клиента нашёл уязвимость во время pen-test. Vulnerability Disclosure: что делать?", choices: [
        { text: "Поблагодарить, пофиксить молча и не упоминать инцидент", correct: false, feedback: "Сокрытие инцидентов — нарушение trust и потенциально compliance.", points: 3 },
        { text: "Признать, пофиксить в 24ч, уведомить всех затронутых клиентов + опубликовать post-mortem", correct: true, feedback: "Transparency = trust. Быстрый fix + post-mortem показывают зрелость security-культуры.", points: 15 },
        { text: "Оспорить severity — это не критично", correct: false, feedback: "Спорить с CISO клиента = потерять доверие навсегда.", points: 1 },
        { text: "Заплатить bug bounty и попросить NDA", correct: false, feedback: "NDA для корпоративного клиента — red flag. Они расскажут всем.", points: 4 },
      ] },
    ],
    summary: "Security framework создан! SOC-2 Type I получен, SSO внедрён."
  },
  {
    id: "b2b-product", title: "Product-Market Fit", subtitle: "Enterprise feature set",
    icon: Layers, color: "text-cyan-600", bgColor: "bg-cyan-50",
    narrative: ["3 Enterprise-клиента подписаны. Их запросы сильно отличаются от SMB: admin console, role-based access, custom workflows, API integrations, white-label. Бэклог раздувается. Нужно найти PMF для Enterprise без потери SMB."],
    questions: [
      { id: "b2b-pf1", question: "Как сбалансировать Enterprise-roadmap и SMB-продукт?", choices: [
        { text: "Два отдельных продукта — форкнуть кодовую базу", correct: false, feedback: "Fork = двойные затраты на поддержку. Technical debt × 2.", points: 2 },
        { text: "Единая платформа с feature flags и plan-based entitlements", correct: true, feedback: "Feature flags + entitlements: один продукт, разные возможности по планам. Масштабируемо!", points: 15 },
        { text: "Полностью переключиться на Enterprise — выше ARPA", correct: false, feedback: "SMB = 85% текущего MRR. Переключение убьёт cash flow.", points: 3 },
        { text: "Просто добавлять всё в один план — пусть все получат Enterprise-фичи", correct: false, feedback: "Бесплатные Enterprise-фичи для SMB = нет upsell. Разрушает pricing.", points: 4 },
      ] },
      { id: "b2b-pf2", question: "Enterprise-клиент просит кастомную интеграцию с их ERP (SAP). Бюджет: $50K. Делать?", choices: [
        { text: "Да, кастомная интеграция за $50K — хороший revenue", correct: false, feedback: "$50K one-time vs recurring. Кастомный код = tech debt для одного клиента.", points: 4 },
        { text: "Построить universal API + webhook platform, начав с SAP коннектора как первого из многих", correct: true, feedback: "Platform thinking! SAP-коннектор = первый из 50+ интеграций. $50K funding для платформы.", points: 15 },
        { text: "Отказать — мы не делаем custom development", correct: false, feedback: "Отказ без альтернативы. Предложите платформенное решение.", points: 3 },
        { text: "Направить к системному интегратору", correct: false, feedback: "Теряете контроль над customer experience и revenue.", points: 5 },
      ] },
      { id: "b2b-pf3", question: "3 клиента, 3 разных запроса: custom reports, approval workflows, resource planning. Как приоритизировать?", choices: [
        { text: "По размеру контракта — самый крупный клиент получает фичу первым", correct: false, feedback: "Revenue-driven → building for one client. Не масштабируется.", points: 4 },
        { text: "Weighted scoring: frequency across clients × strategic value × development effort", correct: true, feedback: "Cross-client analysis! Approval workflows запрашивают все 3 → highest frequency → первый приоритет.", points: 15 },
        { text: "По скорости разработки — сначала быстрые фичи", correct: false, feedback: "Quick wins важны, но без strategic alignment — scatter effect.", points: 5 },
        { text: "Спросить Sales — они знают, что продаёт", correct: false, feedback: "Sales bias к текущим deals. Нужен product-led подход.", points: 3 },
      ] },
    ],
    summary: "Enterprise PMF найден! Платформенный подход, feature flags и API strategy."
  },
  {
    id: "b2b-csm", title: "Customer Success", subtitle: "Retention и expansion",
    icon: HeartHandshake, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["8 Enterprise-клиентов, MRR = $45K от Enterprise. Один клиент (крупнейший, $8K/мес) жалуется на adoption — только 15% его сотрудников активно используют продукт. Риск churn через 2 месяца при renewal."],
    questions: [
      { id: "b2b-cs1", question: "Adoption у крупнейшего клиента = 15%. Как диагностировать проблему?", choices: [
        { text: "Спросить у нашего контакта (buyer) почему мало пользуются", correct: false, feedback: "Buyer ≠ user. Он может не знать реальных проблем конечных пользователей.", points: 4 },
        { text: "Product usage analytics по ролям + интервью с end-users разных департаментов", correct: true, feedback: "Сегментация по ролям выявит: PM используют 80%, бухгалтерия 5%. Нужны role-specific onboarding flows.", points: 15 },
        { text: "Провести обучающий вебинар для всех сотрудников", correct: false, feedback: "Вебинар без диагностики — лечение без диагноза.", points: 5 },
        { text: "Добавить больше фич — наверное, функционала не хватает", correct: false, feedback: "Больше фич ≠ больше adoption. Feature overload может ухудшить UX.", points: 2 },
      ] },
      { id: "b2b-cs2", question: "Renewal через 2 месяца. Health Score клиента = Red. Ваш rescue plan?", choices: [
        { text: "Предложить скидку 30% на следующий год", correct: false, feedback: "Скидка не решает проблему adoption. Деньги ≠ ценность.", points: 3 },
        { text: "Executive Business Review + 30-day adoption sprint с dedicated CSM + weekly check-ins", correct: true, feedback: "EBR показывает серьёзность. 30-day sprint с measurable KPI. Если adoption вырастет — renewal обеспечен.", points: 15 },
        { text: "Принять churn — сосредоточиться на новых клиентах", correct: false, feedback: "$8K/мес × 12 = $96K ARR. Стоимость привлечения нового Enterprise > стоимость удержания.", points: 1 },
        { text: "Эскалировать на CEO клиента — пусть заставит людей пользоваться", correct: false, feedback: "Top-down mandate без bottom-up adoption = resentment. Нужен pull, не push.", points: 4 },
      ] },
      { id: "b2b-cs3", question: "Клиент успешно использует продукт. Как превратить retention в expansion?", choices: [
        { text: "Предложить скидку за добавление seats", correct: false, feedback: "Скидки обесценивают продукт. Нужно показать ROI от расширения.", points: 4 },
        { text: "Identify power users → champion program → land-and-expand в другие департаменты с ROI-кейсом", correct: true, feedback: "Land & Expand! Champions продают внутри компании лучше, чем Sales. ROI-кейс = ammunition для champion.", points: 15 },
        { text: "Добавить premium features и upsell", correct: false, feedback: "Upsell без expansion = ограниченный потолок. Департаменты > фичи.", points: 5 },
        { text: "Подождать, пока сами попросят больше лицензий", correct: false, feedback: "Пассивный подход. Net Dollar Retention не вырастет сам.", points: 2 },
      ] },
    ],
    summary: "Customer Success запущен! Churn предотвращён, NRR растёт."
  },
  {
    id: "b2b-metrics", title: "Метрики и прогнозы", subtitle: "B2B SaaS unit economics",
    icon: BarChart3, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["12 месяцев Enterprise-направления. MRR = $85K (Enterprise), $180K (SMB). Всего $265K MRR. Совет директоров хочет виде��ь path to $1M ARR и unit economics."],
    questions: [
      { id: "b2b-m1", question: "Enterprise LTV/CAC = 5.2, SMB LTV/CAC = 3.1. Как интерпретировать?", choices: [
        { text: "Оба хорошие — LTV/CAC > 3 = здоровый бизнес", correct: false, feedback: "Формально верно, но пропускаете insight: Enterprise = 68% эффективнее. Нужна разная стратегия.", points: 6 },
        { text: "Enterprise более эффективен → увеличить долю Enterprise в pipeline, но сохранить SMB как cash cow", correct: true, feedback: "Enterprise: выше LTV/CAC → больше инвестиций в канал. SMB: стабильный MRR → сохранить, но не масштабировать агрессивно.", points: 15 },
        { text: "Закрыть SMB и полностью переключиться на Enterprise", correct: false, feedback: "$180K MRR от SMB = cash flow для компании. Нельзя убивать дойную корову.", points: 2 },
        { text: "Данных недостаточно — нужен Cohort Analysis", correct: false, feedback: "Cohort analysis полезен, но LTV/CAC уже даёт actionable insight.", points: 4 },
      ] },
      { id: "b2b-m2", question: "Net Dollar Retention (NDR) = 108%. Что это значит и как улучшить до 130%?", choices: [
        { text: "108% означает рост 8% за год. Для улучшения — поднять цены", correct: false, feedback: "Цены ≠ NDR. Повышение цен без value = churn.", points: 3 },
        { text: "Expansion revenue > churn. Для 130%: seat expansion + upsell tiers + reduce contraction", correct: true, feedback: "NDR = (начало + expansion + upsell − contraction − churn) / начало. 130%+ = best-in-class B2B SaaS (Snowflake, Datadog).", points: 15 },
        { text: "108% — отличный показатель, не нужно улучшать", correct: false, feedback: "108% — неплохо, но top-tier B2B SaaS: 120-140%. Есть куда расти.", points: 5 },
        { text: "NDR — не важная метрика, лучше смотреть на MRR growth", correct: false, feedback: "NDR — arguably самая важная метрика B2B SaaS. Показывает здоровье existing base.", points: 1 },
      ] },
      { id: "b2b-m3", question: "Board хочет прогноз: когда $1M ARR? Текущий MRR = $265K, рост 12% month-over-month.", choices: [
        { text: "12 месяцев", correct: false, feedback: "$265K × 1.12^12 = $1.03M. Почти! Но ARR = MRR × 12, значит $265K MRR уже = $3.18M ARR.", points: 5 },
        { text: "Мы уже прошли $1M ARR: $265K × 12 = $3.18M ARR", correct: true, feedback: "ARR = Annual Recurring Revenue = MRR × 12. $265K × 12 = $3.18M. Уже достигнуто! Board нужно лучше формулировать цели 😄", points: 15 },
        { text: "6 месяцев", correct: false, feedback: "Проверьте расчёт: $265K MRR уже = $3.18M ARR.", points: 4 },
        { text: "Невозможно предсказать без детального bottoms-up forecast", correct: false, feedback: "При стабильном 12% MoM можно прогнозировать. Но сначала посчитайте текущий ARR!", points: 3 },
      ] },
    ],
    summary: "Финансовая модель построена! Board впечатлён unit economics."
  },
  {
    id: "b2b-scale", title: "Масштабирование Enterprise", subtitle: "Growth engine и стратегия",
    icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["$3.2M ARR. 15 Enterprise-клиентов, 500 SMB. Задача: $10M ARR за 18 месяцев. Нужно строить repeatable sales process и продуктовый moat."],
    questions: [
      { id: "b2b-sc1", question: "Как построить repeatable Enterprise sales process?", choices: [
        { text: "Нанять VP of Sales и 10 AE (Account Executives)", correct: false, feedback: "Нанять без процесса = burn rate без результата. Сначала playbook, потом масштабирование.", points: 3 },
        { text: "Документировать winning playbook из 15 сделок → hire 3 AE → iterate → scale to 10", correct: true, feedback: "Playbook → small team → iterate → scale. Последовательное масштабирование с обратной связью.", points: 15 },
        { text: "По��ностью перейти на PLG — no-touch sales", correct: false, feedback: "Enterprise $5K+/мес = touch-heavy. PLG помогает в lead gen, но closing = human.", points: 4 },
        { text: "Аутсорсить продажи партнёрам", correct: false, feedback: "Channel partnerships — дополнение, не замена direct sales на этом этапе.", points: 5 },
      ] },
      { id: "b2b-sc2", question: "Конкурент привлёк $50M и демпингует цены на 40%. Ваша стратегия?", choices: [
        { text: "Тоже снизить цены — нельзя терять клиентов", correct: false, feedback: "Ценова�� война с $50M — проигрыш. У них больше runway.", points: 2 },
        { text: "Углубить product moat: интеграции + switching costs + data lock-in + premium support", correct: true, feedback: "Moat > Price. Интеграции создают switching costs. Data и workflows клиента привязаны к вашему продукту. Конкурент не сможет скопировать за деньги.", points: 15 },
        { text: "Привлечь свой раунд $50M+", correct: false, feedback: "Fundraising — инструмент, не стратегия. Что делать с ден��гами?", points: 4 },
        { text: "Сфокусироваться на нише, которую конкурент игнорирует", correct: false, feedback: "Niche focus может работать, но вы уже 15 Enterprise клиентов. Не время сужаться.", points: 6 },
      ] },
      { id: "b2b-sc3", question: "Вы рассматриваете выход на новую вертикаль (Healthcare). Как валидировать?", choices: [
        { text: "Построить healthcare-специфичные фичи и запустить", correct: false, feedback: "Build before validate = риск потратить 6 мес на фичи без спроса.", points: 3 },
        { text: "10 discovery-интервью с healthcare PM → pilot с 2-3 клиентами → measure → decide", correct: true, feedback: "Lean approach! Discovery → Pilot → Measure → Scale. Healthcare = HIPAA compliance, специфичные workflows. Валидируйте willingness to pay.", points: 15 },
        { text: "Нанять healthcare domain expert и дать ему carte blanche", correct: false, feedback: "Domain expertise важна, но без structured validation — risk of overbuilding.", points: 5 },
        { text: "Посмотреть, что конкуренты делают в Healthcare", correct: false, feedback: "Competitive intelligence ≠ validation. Их подход может не работать.", points: 4 },
      ] },
    ],
    summary: "Enterprise growth engine запущен! $10M ARR на горизонте."
  },
];

// ===== Scenario 3: Marketplace =====
const MARKETPLACE_PHASES: SimPhase[] = [
  {
    id: "mp-chicken", title: "Chicken & Egg проблема", subtitle: "Холодный старт маркетплейса",
    icon: Briefcase, color: "text-cyan-600", bgColor: "bg-cyan-50",
    narrative: ["Вы запускаете маркетплейс «SkillSwap» — платформу для обмена навыками (репетиторы, консультанты, менторы). Классическая проблема: без предложения нет спроса, без спроса нет предложения."],
    questions: [
      { id: "mp-c1", question: "Какую сторону маркетплейса привлекать первой?", choices: [
        { text: "Покупателей (учеников) — demand creates supply", correct: false, feedback: "Без предложений покупатели уйдут разочарованными. Пустой каталог.", points: 3 },
        { text: "Продавцов (менторов) — supply creates demand", correct: true, feedback: "Верно для большинства маркетплейсов! Качественный supply привлекает первых buyer-ов.", points: 15 },
        { text: "Обе стороны одновременно", correct: false, feedback: "Фокус на двух сторонах сразу — растягивает ресурсы.", points: 5 },
        { text: "Ни одну — сначала PR-кампания", correct: false, feedback: "PR без продукта = хайп без retention.", points: 1 },
      ], hint: "В маркетплейсах обычно начинают с supply-стороны." },
      { id: "mp-c2", question: "Как привлечь первых 100 менторов?", choices: [
        { text: "Платная реклама в LinkedIn", correct: false, feedback: "Слишком дорого для первых 100. CAC будет запредельным.", points: 3 },
        { text: "Лично пригласить экспертов из комьюнити + предложить 0% комиссии на 3 месяца", correct: true, feedback: "Ручной рекрутинг + временный incentive. Airbnb начинали так же!", points: 15 },
        { text: "Создать ботов-менторов для иллюзии выбора", correct: false, feedback: "Обман пользователей — репутационная катастрофа.", points: 0 },
        { text: "Подождать, пока менторы сами придут", correct: false, feedback: "Органический рост без усилий = месяцы ожидания.", points: 1 },
      ] },
      { id: "mp-c3", question: "Первые 50 менторов на платформе, но бронирований почти нет. Основная причина?", choices: [
        { text: "Маркетинг слабый — нужно больше рекламы", correct: false, feedback: "Реклама не поможет, если проблема в продукте.", points: 3 },
        { text: "Нет trust-сигналов: отзывов, рейтингов, верификации. Покупатели не доверяют.", correct: true, feedback: "Маркетплейсу нужен trust layer: отзывы, рейтинги, верификация, гарантия возврата.", points: 15 },
        { text: "Цены менторов слишком высокие", correct: false, feedback: "Без данных о ценовой чувствительности — преждевременный вывод.", points: 4 },
        { text: "UX слишком сложный", correct: false, feedback: "Возможно частично, но trust — главный барьер на старте маркетплейса.", points: 5 },
      ] },
    ],
    summary: "Холодный старт преодолён! Supply привлечён, trust-механизмы запущены."
  },
  {
    id: "mp-liquidity", title: "Ликвидность и метрики", subtitle: "Marketplace-specific KPI",
    icon: BarChart3, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["3 месяца работы: 200 менторов, 1 500 пользователей, 180 бронирований/мес. Средний чек = 2 500 ₽. Комиссия 15%."],
    questions: [
      { id: "mp-l1", question: "Какая главная метрика ликвидности маркетплейса?", choices: [
        { text: "GMV (Gross Merchandise Value)", correct: false, feedback: "GMV показывает объём, но не эффективность matching.", points: 5 },
        { text: "Search-to-Fill Rate (% запросов, которые конвертируются в бронирование)", correct: true, feedback: "Search-to-Fill показывает, находят ли покупатели то, что ищут. Главная метрика ликвидности!", points: 15 },
        { text: "Количество менторов", correct: false, feedback: "Vanity metric. 200 менторов бесполезны, если никто не бронирует.", points: 2 },
        { text: "NPS", correct: false, feedback: "NPS — lagging indicator, не метрика ликвидности.", points: 3 },
      ] },
      { id: "mp-l2", question: "Take rate (комиссия) = 15%. GMV = 450 000 ₽/мес. Какой Net Revenue?", choices: [
        { text: "67 500 ₽", correct: true, feedback: "Net Revenue = GMV × Take Rate = 450 000 × 0.15 = 67 500 ₽.", points: 15 },
        { text: "450 000 ₽", correct: false, feedback: "450K — это GMV, не ваш доход. Net Revenue = GMV × комиссия.", points: 2 },
        { text: "382 500 ₽", correct: false, feedback: "Это выплата менторам (85%), не ваш доход.", points: 4 },
        { text: "Невозможно рассчитать", correct: false, feedback: "Net Revenue = GMV × Take Rate. Все данные есть.", points: 1 },
      ] },
      { id: "mp-l3", question: "У 30% менторов 0 бронирований за месяц. Что делать?", choices: [
        { text: "Удалить неактивных менторов", correct: false, feedback: "Удаление уменьшит supply и каталог. Нужно активировать.", points: 3 },
        { text: "Улучшить discovery: алгоритм ранжирования, категории, фильтры + помочь менторам с профилем", correct: true, feedback: "Проблема не в менторах, а в matchmaking. Улучшите discovery + профили.", points: 15 },
        { text: "Снизить комиссию для неактивных", correct: false, feedback: "0% комиссии × 0 бронирований = 0 дохода. Проблема не в цене.", points: 4 },
        { text: "Оставить как есть — long tail нормален", correct: false, feedback: "30% с нулём — не long tail, а проблема ликвидности.", points: 5 },
      ] },
    ],
    summary: "Метрики маркетплейса определены, ликвидность растёт!"
  },
  {
    id: "mp-growth", title: "Network Effects и рост", subtitle: "Масштабирование маркетплейса",
    icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["6 месяцев: 500 менторов, 5 000 пользователей. Рост замедлился. Нужно запустить сетевые эффекты."],
    questions: [
      { id: "mp-g1", question: "Какой тип network effect у маркетплейса?", choices: [
        { text: "Direct (same-side): больше менторов → лучше для других менторов", correct: false, feedback: "Direct effects обычно негативные в маркетплейсах (конкуренция).", points: 3 },
        { text: "Cross-side (indirect): больше менторов → лучше для учеников → привлекает больше менторов", correct: true, feedback: "Cross-side effect — основа маркетплейса. Каждая сторона усиливает другую.", points: 15 },
        { text: "Data network effect: больше данных → лучше рекомендации", correct: false, feedback: "Data NE важен, но это вторичный эффект, не основной.", points: 6 },
        { text: "У маркетплейса нет network effects", correct: false, feedback: "Маркетплейсы — классический пример network effects!", points: 0 },
      ] },
      { id: "mp-g2", question: "Вы заметили, что 20% менторов генерируют 80% бронирований (power law). Стратегия?", choices: [
        { text: "Увеличить комиссию для топ-менторов — они и так зарабатывают", correct: false, feedback: "Штрафовать лучших = потерять их. Они уйдут к конкурентам.", points: 1 },
        { text: "Помочь остальным 80%: обучение, шаблоны профилей, программа менторства для менторов", correct: true, feedback: "Поднять middle-tier! Если 40% станут хорошими → GMV вырастет кратно.", points: 15 },
        { text: "Сфокусироваться только на топ-20%", correct: false, feedback: "Зависимость от 20% — огромный риск. Если они уйдут — бизнес рухнет.", points: 4 },
        { text: "Ограничить бронирования топ-менторов, чтобы распределить спрос", correct: false, feedback: "Искусственные ограничения ухудшат UX покупателей.", points: 2 },
      ] },
      { id: "mp-g3", question: "Какой главный риск масштабирования маркетплейса?", choices: [
        { text: "Конкуренция с другими платформами", correct: false, feedback: "Конкуренция важна, но не главный risk.", points: 5 },
        { text: "Disintermediation — менторы и ученики уходят общаться напрямую, минуя платформу", correct: true, feedback: "Главный risk маркетплейса! Решение: создавать ценность, которую невозможно получить offline (оплата, расписание, отзывы, гарантии).", points: 15 },
        { text: "Технический долг", correct: false, feedback: "Tech debt — проблема, но не экзистенциальный риск.", points: 3 },
        { text: "Регуляторные риски", correct: false, feedback: "Зависит от ниши. Для skill-sharing — не главный risk.", points: 4 },
      ] },
    ],
    summary: "Network effects запущены, маркетплейс готов к масштабированию!"
  },
  {
    id: "mp-trust", title: "Trust & Safety", subtitle: "Безопасность и доверие",
    icon: Shield, color: "text-slate-600", bgColor: "bg-slate-100",
    narrative: ["Маркетплейс растёт: 800 менторов, 8 000 пользователей. Но появились жалобы: 3 фейковых профиля менторов, 2 случая no-show, 1 негативный пост в соцсетях. Trust — фундамент маркетплейса."],
    questions: [
      { id: "mp-t1", question: "Как построить систему верификации менторов?", choices: [
        { text: "Ручная проверка каждого ментора — собеседование + проверка документов", correct: false, feedback: "Не масштабируется. При 800+ менторах — bottleneck.", points: 5 },
        { text: "Многоуровневая верификация: auto (LinkedIn/email) → peer review → platform badge + ongoing quality score", correct: true, feedback: "Tiered verification! Автоматизация на входе, social proof через отзывы, quality score для ongoing trust.", points: 15 },
        { text: "Просто добавить отзывы — рынок сам отсеет плохих", correct: false, feedback: "Отзывы важны, но без верификации на входе — fake profiles просочатся.", points: 4 },
        { text: "Требовать депозит от менторов", correct: false, feedback: "Депозит создаст barrier to entry и убьёт supply growth.", points: 2 },
      ] },
      { id: "mp-t2", question: "Пользователь жалуется на no-show ментора. Оплата уже прошла. Что делать?", choices: [
        { text: "Вернуть деньги из своей маржи", correct: false, feedback: "Из маржи = убыток для платформы. Нужна системная policy.", points: 4 },
        { text: "Полный refund + penalty для ментора + auto-reschedule с другим ментором + компенсация пользователю (скидка на след. бронирование)", correct: true, feedback: "4-step resolution: refund + penalty + alternative + goodwill. Пользователь получает больше, чем потерял → trust укрепляется.", points: 15 },
        { text: "Связаться с ментором и попросить перенести", correct: false, feedback: "Медленно + не решает проблему пользователя. Нужна instant resolution.", points: 3 },
        { text: "Создать escrow-систему — деньги блокируются до завершения сессии", correct: false, feedback: "Escrow — хорошая идея на будущее, но не решает текущую жалобу.", points: 6 },
      ] },
      { id: "mp-t3", question: "Как предотвратить fraud (фейковые отзывы, manipulated ratings)?", choices: [
        { text: "Модерация всех отзывов вручную", correct: false, feedback: "При 1000+ отзывов/мес — не масштабируется.", points: 4 },
        { text: "ML-модель anomaly detection + verified purchase requirement + review velocity limits + appeal process", correct: true, feedback: "Multi-layer fraud prevention! Только verified buyers пишут отзывы. ML ловит аномалии. Appeal process — fairness.", points: 15 },
        { text: "Убрать рейтинги совсем — они всё равно ненадёжные", correct: false, feedback: "Без рейтингов — нет trust signal. Нужно улучшить, не убирать.", points: 1 },
        { text: "Показывать только положительные отзывы", correct: false, feedback: "Только позитивные = не доверяют. Честные отзывы (включая негативные) повышают credibility.", points: 2 },
      ] },
    ],
    summary: "Trust & Safety framework создан! Верификация, escrow и fraud prevention."
  },
  {
    id: "mp-economics", title: "Unit Economics", subtitle: "Монетизация и маржинальность",
    icon: BarChart3, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["GMV = 2.5M ₽/мес, take rate = 15%, Net Revenue = 375K ₽/мес. Операционные расходы = 320K ₽/мес. Маржинальность всего 15%. Нужно улучшить unit economics."],
    questions: [
      { id: "mp-e1", question: "Как увеличить take rate без потери менторов?", choices: [
        { text: "Поднять комиссию с 15% до 25% для всех", correct: false, feedback: "Резкое повышение → отток менторов. Нужна value-based стратегия.", points: 2 },
        { text: "Tiered take rate: 15% базовый + premium features (promoted listing, analytics, CRM) за доп. комиссию или подписку", correct: true, feedback: "Value-added services! Менторы платят за инструменты, которые приносят им больше клиентов. Win-win.", points: 15 },
        { text: "Ввести подписку для учеников вместо комиссии", correct: false, feedback: "Подписка без достаточного supply breadth — low conversion.", points: 5 },
        { text: "Убрать комиссию и зарабатывать на рекламе", correct: false, feedback: "Реклама на маркетплейсе = конфликт интересов и плохой UX.", points: 1 },
      ] },
      { id: "mp-e2", question: "CAC для ментора = 1 200 ₽, среднее lifetime revenue от ментора = 8 500 ₽. LTV/CAC = 7.1. Для ученика: CAC = 350 ₽, LTV = 900 ₽. Где проблема?", choices: [
        { text: "Проблем нет — оба LTV/CAC > 3", correct: false, feedback: "Формально верно, но ученик LTV/CAC = 2.6, < 3. И маржинальность ученика ниже.", points: 5 },
        { text: "LTV ученика слишком низкий — нужно увеличить repeat rate и cross-sell", correct: true, feedback: "LTV ученика = 2.6x CAC (ниже benchmark). Repeat bookings + subscription + bundles → увеличить frequency.", points: 15 },
        { text: "CAC ментора слишком высокий — нужно снижать", correct: false, feedback: "LTV/CAC ментора = 7.1 — отличный показатель. Проблема в учениках.", points: 3 },
        { text: "Нужно больше данных для выводов", correct: false, feedback: "Данных достаточно для actionable insight: фокус на ученическом LTV.", points: 4 },
      ] },
      { id: "mp-e3", question: "Вы хотите запустить подписку «SkillSwap Pro» для учеников. Что включить?", choices: [
        { text: "Безлимитные бронирования за фикс. цену", correct: false, feedback: "Безлимитные бронирования → переиспользование → убыток. Менторам тоже нужно платить.", points: 3 },
        { text: "N бронирований/мес + скидка 10% + priority matching + progress tracking + replay записей", correct: true, feedback: "Value bundle! Определённое кол-во сессий → предсказуемый revenue. Скидка + фичи → higher perceived value.", points: 15 },
        { text: "Доступ к «премиум» менторам", correct: false, feedback: "Делить менторов на premium/обычных — создаёт two-tier marketplace tension.", points: 5 },
        { text: "Просто убрать рекламу", correct: false, feedback: "На маркетплейсе нет рекламы — нечего убирать.", points: 1 },
      ] },
    ],
    summary: "Unit economics оптимизированы! Take rate вырос, подписка запущена."
  },
  {
    id: "mp-pmf", title: "Product-Market Fit", subtitle: "Сигналы и метрики PMF",
    icon: Target, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["12 месяцев на рынке. 1 200 менторов, 15 000 пользователей. Вопрос: достигли ли мы PMF? Инвестор хочет видеть доказательства."],
    questions: [
      { id: "mp-pmf1", question: "Какой показатель лучше всего демонстрирует PMF для маркетплейса?", choices: [
        { text: "GMV растёт 20% MoM", correct: false, feedback: "Рост GMV может быть вызван paid acquisition. Без retention — нет PMF.", points: 5 },
        { text: "Cohort retention: 40%+ пользователей возвращаются за 2+ бронированиями в первые 60 дней", correct: true, feedback: "Repeat usage = PMF signal. Если люди возвращаются органически — продукт решает проблему.", points: 15 },
        { text: "NPS > 50", correct: false, feedback: "NPS — lagging indicator. Можно иметь высокий NPS и низкий retention.", points: 4 },
        { text: "Количество менторов растёт", correct: false, feedback: "Supply growth без demand activation = пустые profiles.", points: 3 },
      ] },
      { id: "mp-pmf2", question: "Sean Ellis test: 38% пользователей ответили «Очень разочарован» на вопрос о закрытии. Это PMF?", choices: [
        { text: "Нет, PMF требует 40%+", correct: false, feedback: "38% — пограничное значение. Нужен deeper analysis.", points: 5 },
        { text: "Почти. Сегментировать по когортам: если power users > 50% и новые > 30% — PMF в core segment достигнут", correct: true, feedback: "Segmented analysis! PMF может быть достигнут для определённого сегмента. 38% overall = 55% для repeat users?", points: 15 },
        { text: "Да, 38% ≈ 40%, достаточно близко", correct: false, feedback: "Округление — не аналитика. Нужно понять, КТО эти 38%.", points: 4 },
        { text: "Тест Sean Ellis не работает для маркетплейсов", correct: false, feedback: "Работает, но нужно проводить для обеих сторон: менторов и учеников.", points: 3 },
      ] },
      { id: "mp-pmf3", question: "Инвестор спрашивает: «Какой ваш moat?» Что ответить?", choices: [
        { text: "Мы первые на рынке — first mover advantage", correct: false, feedback: "First mover ≠ moat. Маркетплейсы легко копируются.", points: 3 },
        { text: "Network effects + data moat: reviews & ratings + matching algorithm trained on 50K+ interactions + switching costs для менторов с историей", correct: true, feedback: "Triple moat! Network effects (cross-side), Data (algorithm), Switching costs (reputation). Конкуренту нужны годы, чтобы dogfooding это.", points: 15 },
        { text: "Наша технология и UX лучше", correct: false, feedback: "Технология и UX копируются за 3-6 мес. Не moat.", points: 2 },
        { text: "У нас сильная команда", correct: false, feedback: "Team — execution advantage, не structural moat.", points: 4 },
      ] },
    ],
    summary: "PMF доказан! Network effects, data moat и healthy cohort retention."
  },
  {
    id: "mp-ops", title: "Операционная эффективность", subtitle: "Quality и процессы",
    icon: Settings, color: "text-cyan-600", bgColor: "bg-cyan-50",
    narrative: ["Маркетплейс растёт быстрее, чем операции. Поддержка тонет в тикетах (200+/неделя). 60% жалоб — scheduling issues. Время ответа: 18 часов. NPS падает."],
    questions: [
      { id: "mp-o1", question: "60% тикетов — scheduling issues. Как решить системно?", choices: [
        { text: "Нанять больше support agents", correct: false, feedback: "Больше agents = больше расходов, но не решает root cause.", points: 3 },
        { text: "Автоматизация: calendar sync + auto-reminders + self-service reschedule + smart conflict detection", correct: true, feedback: "Устранить root cause! Calendar integration уменьшит scheduling тикеты на 70%+. Автоматизация > найм.", points: 15 },
        { text: "Сделать FAQ и направить пользователей на self-service", correct: false, feedback: "FAQ не решает технические проблемы расписания.", points: 4 },
        { text: "Штрафовать менторов за проблемы с расписанием", correct: false, feedback: "Штрафы = менторы уходят. Supply-side retention важнее наказаний.", points: 2 },
      ] },
      { id: "mp-o2", question: "Вы хотите внедрить Quality Score для менторов. Какие сигналы включить?", choices: [
        { text: "Только рейтинг от учеников (1-5 звёзд)", correct: false, feedback: "Рейтинг — biased (selection bias, recency bias). Нужен composite score.", points: 4 },
        { text: "Composite: response time + show-up rate + completion rate + student ratings + repeat booking rate", correct: true, feedback: "Multi-signal quality score! Behavioral data (show-up, response time) + outcome data (ratings, repeat rate). Надёжнее, чем рейтинг.", points: 15 },
        { text: "Количество бронирований — популярность = качество", correct: false, feedback: "Popularity ≠ Quality. Matthew effect: богатые становятся богаче.", points: 3 },
        { text: "Длительность сессий — чем дольше, тем лучше", correct: false, feedback: "Длительность не коррелирует с ценностью. Иногда короткая сессия = focused = better.", points: 2 },
      ] },
      { id: "mp-o3", question: "Маркетплейс доступен в 3 городах. Как принять решение о запуске в 4-м?", choices: [
        { text: "Запустить в самом крупном городе — больше potential users", correct: false, feedback: "Крупный город = больше конкуренции и выше CAC.", points: 4 },
        { text: "Scoring model: waitlist demand + mentor supply potential + competitor density + operational feasibility", correct: true, feedback: "Data-driven expansion! Waitlist показывает demand. Low competition + high supply potential = sweet spot.", points: 15 },
        { text: "Запустить везде одновременно — digital product, не нужна локализация", correct: false, feedback: "Маркетплейс — local business. Quality требует city-by-city focus.", points: 2 },
        { text: "Там, где дешевле всего маркетинг", correct: false, feedback: "Дешёвый маркетинг ≠ demand. Можно потратить мало и получить 0.", points: 3 },
      ] },
    ],
    summary: "Операции оптимизированы! Автоматизация, quality scoring и data-driven expansion."
  },
  {
    id: "mp-expansion", title: "Международная экспансия", subtitle: "Growth и масштабирование",
    icon: Globe, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["Маркетплейс доминирует в своей стране: 3 000 менторов, 40 000 пользователей, GMV = 15M ₽/мес. Инвестор предлагает $3M за международную экспансию. Куда и как расширяться?"],
    questions: [
      { id: "mp-ex1", question: "Какую модель экспансии выбрать?", choices: [
        { text: "Копировать продукт as-is и запустить рекламу в новых странах", correct: false, feedback: "Copy-paste не работает cross-border. Культурные различия огромны.", points: 2 },
        { text: "Localize & Launch: local team + adapted UX + local payment methods + city-by-city в одной стране → затем следующая", correct: true, feedback: "Sequenced expansion! Один город → proof of concept → rollout в стране → следующая. Airbnb, Uber так делали.", points: 15 },
        { text: "Франшизная модель — найти локальных операторов", correct: false, feedback: "Франшиза теряет контроль над product и brand. Рано для маркетплейса.", points: 4 },
        { text: "Купить местного конкурента", correct: false, feedback: "M&A — дорого, сложно интегрировать. На $3M не хватит для acquisition + integration.", points: 5 },
      ] },
      { id: "mp-ex2", question: "Вы выбрали Казахстан как первый рынок. Средний чек ниже в 3 раза. Как адаптировать unit economics?", choices: [
        { text: "Те же цены — пусть привыкнут", correct: false, feedback: "PPP (Purchasing Power Parity) в 3 раза ниже. Ваши цены = luxury segment only. Маленький TAM.", points: 2 },
        { text: "PPP-pricing + lower CAC target + local mentors as supply + lean operations", correct: true, feedback: "PPP-adjusted pricing сохраняет take rate %, но абсолютные числа ниже. Компенсировать через lower ops cost + local team.", points: 15 },
        { text: "Freemium модель — заработаем позже на масштабе", correct: false, feedback: "Freemium без монетизации = cash burn. Нужно валидировать WTP с первого дня.", points: 3 },
        { text: "Только B2B — корпоративное обучение", correct: false, feedback: "B2B в новой стране без brand — длинный sales cycle. B2C сначала для brand awareness.", points: 5 },
      ] },
      { id: "mp-ex3", question: "Через 6 месяцев в Казахстане: 200 менторов, 2 000 пользователей, но Search-to-Fill Rate = 12% (vs 35% дома). Что делать?", choices: [
        { text: "Больше рекламы для привлечения учеников", correct: false, feedback: "Больше demand при низком Supply-to-Fill = ещё хуже UX. Supply проблема, не demand.", points: 2 },
        { text: "Сфокусировать supply на top-10 категорий с наибольшим demand + рекрутировать менторов в gap-категориях", correct: true, feedback: "Supply-demand matching! Analyze search queries без результатов → recruit в эти категории. Focus > breadth.", points: 15 },
        { text: "Закрыть Казахстан — рынок не готов", correct: false, feedback: "6 месяцев — слишком рано для выводов. Marketplace liquidity строится 12-18 мес.", points: 1 },
        { text: "Снизить стандарты верификации, чтобы быстрее набрать менторов", correct: false, feedback: "Lower quality → bad reviews → trust erosion → churn. Не жертвуйте quality ради quantity.", points: 3 },
      ] },
    ],
    summary: "Международная экспансия запущена! Первый зарубежный рынок растёт."
  },
];

// ===== Scenario 4: EdTech =====
const EDTECH_PHASES: SimPhase[] = [
  {
    id: "ed-product", title: "Продуктовая стратегия", subtitle: "Создание EdTech-платформы",
    icon: GraduationCap, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["Вы — CPO стартапа «LearnFlow» (онлайн-курсы для IT). 10 000 пользователей, completion rate = 12% (средний по рынку 5-15%). Задача: увеличить engagement и monetization."],
    questions: [
      { id: "ed-p1", question: "Completion rate 12%. Какая метрика важнее для бизнеса?", choices: [
        { text: "Completion rate — поднять до 30%", correct: false, feedback: "Completion rate — vanity metric. Не все курсы должны быть пройдены до конца.", points: 4 },
        { text: "Learning velocity — сколько полезного контента пользователь потребляет в неделю", correct: true, feedback: "Velocity = engagement + value. Показывает, что пользователь получает ценность регулярно.", points: 15 },
        { text: "Количество зарегистрированных пользователей", correct: false, feedback: "Registrations — top-of-funnel vanity metric.", points: 2 },
        { text: "Время на платформе", correct: false, feedback: "Время ≠ ценность. Можно провести 2 часа и ничего не усвоить.", points: 5 },
      ] },
      { id: "ed-p2", question: "Данные показывают: 60% пользователей бросают после 3-го урока. Почему?", choices: [
        { text: "Контент плохой", correct: false, feedback: "3 урока — достаточно, чтобы оценить контент. Проблема в другом.", points: 3 },
        { text: "Нет ощущения прогресса и быстрых побед (quick wins) в начале обучения", correct: true, feedback: "Onboarding + gamification + quick wins. Пользователь должен почувствовать прогресс в первые 10 минут.", points: 15 },
        { text: "Курс слишком длинный", correct: false, feedback: "Длина — не проблема, если есть engagement loops.", points: 5 },
        { text: "Нет мобильного приложения", correct: false, feedback: "Мобильность важна, но не решает проблему drop-off на уроке 3.", points: 4 },
      ] },
      { id: "ed-p3", question: "Какую модель монетизации выбрать для EdTech?", choices: [
        { text: "Разовая покупка курса ($99)", correct: false, feedback: "One-time revenue. Нет recurring. LTV ограничен.", points: 4 },
        { text: "Подписка + cohort-based курсы с live-сессиями", correct: true, feedback: "Подписка = recurring revenue + retention. Cohorts = social learning + accountability.", points: 15 },
        { text: "Freemium — базовые курсы бесплатно", correct: false, feedback: "Freemium может работать, но без retention-механизма конверсия будет низкой.", points: 6 },
        { text: "Рекламная модель", correct: false, feedback: "Реклама в EdTech — плохой UX и низкий RPM.", points: 2 },
      ] },
    ],
    summary: "Продуктовая стратегия определена!"
  },
  {
    id: "ed-engagement", title: "Engagement и retention", subtitle: "Геймификация и привычки",
    icon: Zap, color: "text-cyan-600", bgColor: "bg-cyan-50",
    narrative: ["Пора внедрить систему вовлечения. Цель: повысить WAU/MAU с 25% до 45% за 3 месяца."],
    questions: [
      { id: "ed-e1", question: "Какой Hook Model паттерн наиболее эффективен для EdTech?", choices: [
        { text: "Push-уведомления каждый день — «Не забудьте учиться!»", correct: false, feedback: "Назойливые пуши → uninstall. Нужен internal trigger, не external.", points: 2 },
        { text: "Trigger (напоминание утром) → Action (5 мин урок) → Variable Reward (streak + XP) → Investment (заметки, прогресс)", correct: true, feedback: "Nir Eyal Hook Model! Привычка формируется через 4 фазы. Variable reward — ключ к retention.", points: 15 },
        { text: "Скидки за ежедневный вход", correct: false, feedback: "Экономические стимулы — extrinsic motivation. Не формирует привычку.", points: 4 },
        { text: "Leaderboard среди всех пользователей", correct: false, feedback: "Глобальный leaderboard демотивирует новичков.", points: 5 },
      ] },
      { id: "ed-e2", question: "Вы внедрили streaks (серии дней). 7-day retention вырос на 30%. Но NPS упал на 5 пунктов. Почему?", choices: [
        { text: "Streaks не работают — откатить", correct: false, feedback: "Retention +30% → streaks работают. NPS — другой сигнал.", points: 3 },
        { text: "Пользователи чувствуют давление и guilt — нужна «заморозка» streak без наказания", correct: true, feedback: "Guilt-free design! Duolingo добавил streak freeze. Снижает anxiety, сохраняя мотивацию.", points: 15 },
        { text: "NPS всегда падает при геймификации", correct: false, feedback: "Неверно. Хорошая геймификация повышает и NPS и retention.", points: 2 },
        { text: "Просто совпадение — NPS не связан со streaks", correct: false, feedback: "5 пунктов — значимое падение. Исследуйте корреляцию.", points: 4 },
      ] },
      { id: "ed-e3", question: "Какой тип контента лучше всего повышает completion rate?", choices: [
        { text: "Длинные видео-лекции (45+ минут)", correct: false, feedback: "Длинные лекции = high cognitive load = drop-off.", points: 1 },
        { text: "Micro-learning: 5-7 мин модули + интерактивные задания после каждого", correct: true, feedback: "Micro-learning + spaced repetition + immediate practice. Наука подтверждает!", points: 15 },
        { text: "Текстовые лонгриды", correct: false, feedback: "Лонгриды хороши для reference, не для обучения.", points: 4 },
        { text: "Только практические задания без теории", correct: false, feedback: "Практика без теории = заучивание без понимания.", points: 5 },
      ] },
    ],
    summary: "Engagement-система работает! WAU/MAU растёт."
  },
  {
    id: "ed-scale", title: "Масштабирование EdTech", subtitle: "B2B2C и партнёрства",
    icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["10 000 → 50 000 пользователей за 6 месяцев. Следующий шаг: B2B (корпоративное обучение) + международная экспансия."],
    questions: [
      { id: "ed-s1", question: "Корпоративный клиент хочет кастомизировать курсы под своих сотрудников. Как масштабировать?", choices: [
        { text: "Делать кастомные курсы для каждого клиента — premium service", correct: false, feedback: "Не масштабируется. Каждый кастомный курс = месяцы работы.", points: 4 },
        { text: "Платформа-конструктор: шаблоны + модули + брендинг. Клиент собирает сам", correct: true, feedback: "Platform approach! Масштабируемая кастомизация. 80% одинаково, 20% настраивается.", points: 15 },
        { text: "Отказать — мы B2C компания", correct: false, feedback: "B2B = higher ARPA + lower churn. Отказываться — упущение.", points: 2 },
        { text: "Нанять team of authors для каждого клиента", correct: false, feedback: "Не масштабируется и убьёт unit-экономику.", points: 3 },
      ] },
      { id: "ed-s2", question: "Вы решили выйти на рынок Юго-Восточной Азии. Главный приоритет?", choices: [
        { text: "Перевести контент на 5 языков", correct: false, feedback: "Перевод — необходимо, но недостаточно. Нужна локализация.", points: 5 },
        { text: "Локализация: местные примеры, кейсы, менторы + адаптация pricing под PPP", correct: true, feedback: "Localization > Translation. Purchasing Power Parity pricing. Местные менторы для credibility.", points: 15 },
        { text: "Скопировать product as-is и запустить рекламу", correct: false, feedback: "Copy-paste не работает cross-border. Культурный контекст важен.", points: 2 },
        { text: "Найти локального партнёра и отдать ему лицензию", correct: false, feedback: "Лицензирование теряет контроль над product и brand.", points: 4 },
      ] },
      { id: "ed-s3", question: "AI-революция. Какой AI-feature приоритизировать для EdTech?", choices: [
        { text: "AI-генерация курсов из PDF", correct: false, feedback: "Качество AI-курсов пока недостаточно. Нужен human curation.", points: 4 },
        { text: "Adaptive learning path: AI персонализирует последовательность уроков под уровень и цели каждого студента", correct: true, feedback: "Персонализация — killer feature EdTech. Каждый учится по своему пути.", points: 15 },
        { text: "AI-чатбот для ответов на вопросы", correct: false, feedback: "Полезно, но не transformative. Chatbot — feature, не strategy.", points: 6 },
        { text: "AI-оценка домашних заданий", correct: false, feedback: "Narrow use case. Adaptive learning — шире и ценнее.", points: 5 },
      ] },
    ],
    summary: "EdTech масштабирован! B2B + международная экспансия запущены."
  },
  {
    id: "ed-content", title: "Контент-стратегия", subtitle: "Learning Science и UX",
    icon: BookOpen, color: "text-slate-600", bgColor: "bg-slate-100",
    narrative: ["У вас 50 курсов, но 80% revenue приносят 8 курсов. Остальные 42 — low engagement. Content team из 5 авторов. Нужна стратегия масштабирования контента без потери качества."],
    questions: [
      { id: "ed-c1", question: "Как определить, какие курсы создавать следующими?", choices: [
        { text: "Спросить авторов — они знают, что интересно рынку", correct: false, feedback: "Author bias. Авторы пишут о том, что знают, а не о том, что нужно рынку.", points: 3 },
        { text: "Data-driven: search queries без результатов + job market trends + completion rates существующих курсов по теме", correct: true, feedback: "Demand signals! Search gaps = unmet demand. Job trends = future demand. Completion data = content format insights.", points: 15 },
        { text: "Копировать топ-курсы конкурентов", correct: false, feedback: "Me-too strategy. Нет дифференциации.", points: 2 },
        { text: "Создавать курсы по всем trending технологиям", correct: false, feedback: "Trends ≠ demand. Hype cycle: сегодня trending, через 3 мес — забыто.", points: 4 },
      ] },
      { id: "ed-c2", question: "Completion rate микро-курсов (< 2 часов) = 45%, длинных (> 10 часов) = 8%. Стратегия?", choices: [
        { text: "Только микро-курсы — отказаться от длинных", correct: false, feedback: "Длинные курсы = higher perceived value = higher WTP. Нужно другое решение.", points: 4 },
        { text: "Модульная архитектура: длинные курсы → learning paths из микро-модулей + milestone certificates", correct: true, feedback: "Best of both worlds! Длинный курс = цепочка микро-модулей. Completion rate каждого модуля высокий. Milestone rewards сохраняют мотивацию.", points: 15 },
        { text: "Добавить дедлайны к длинным курсам — давление поможет", correct: false, feedback: "Давление без поддержки = stress + drop-off. Особенно для adult learners.", points: 3 },
        { text: "Геймифицировать длинные курсы (бейджи, XP)", correct: false, feedback: "Геймификация помогает, но не решает структурную проблему. 10 часов = cognitive overload.", points: 6 },
      ] },
      { id: "ed-c3", question: "Как обеспечить quality control при масштабировании контента?", choices: [
        { text: "Нанять больше редакторов для проверки", correct: false, feedback: "Не масштабируется линейно. Каждый курс = 20+ часов review.", points: 4 },
        { text: "Rubric-based review + learner feedback loops + A/B testing content formats + automated quality metrics", correct: true, feedback: "Scalable QA! Rubric = consistent standards. A/B testing = data-driven optimization. Automated metrics (engagement, completion) = early warning.", points: 15 },
        { text: "UGC — пусть пользователи создают контент", correct: false, feedback: "UGC = inconsistent quality. Для EdTech critical — нужен curation layer.", points: 3 },
        { text: "Только один формат для всех курсов — стандартизация", correct: false, feedback: "Один формат ≠ один size. Разные темы требуют разных подходов (видео vs text vs interactive).", points: 5 },
      ] },
    ],
    summary: "Контент-стратегия оптимизирована! Модульная архитектура и data-driven production."
  },
  {
    id: "ed-data", title: "Data и аналитика", subtitle: "Learning Analytics платформа",
    icon: BarChart3, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["50 000 пользователей генерируют терабайты данных: watch time, quiz scores, navigation patterns, pause/rewind events. Данные есть, но insights нет. Нужна Learning Analytics платформа."],
    questions: [
      { id: "ed-d1", question: "Какой North Star Metric для EdTech-платформы?", choices: [
        { text: "DAU/MAU ratio", correct: false, feedback: "Stickiness важна, но не показывает learning outcome.", points: 5 },
        { text: "Weekly Learning Hours × Knowledge Retention Score — «эффективные часы обучения»", correct: true, feedback: "Compound metric! Количество (hours) × Качество (retention). Показывает реальный learning outcome, не просто engagement.", points: 15 },
        { text: "Количество завершённых курсов", correct: false, feedback: "Completions = vanity metric. Можно завершить и ничего не запомнить.", points: 3 },
        { text: "Revenue per user", correct: false, feedback: "RPU — бизнес-метрика, не product North Star.", points: 4 },
      ] },
      { id: "ed-d2", question: "Данные показывают: 70% пользователей ставят видео на паузу на 4-й минуте. Что это значит?", choices: [
        { text: "Видео слишком длинное — сократить до 3 минут", correct: false, feedback: "Correlation ≠ causation. Может быть, на 4-й минуте — сложный concept.", points: 4 },
        { text: "Нужен deeper analysis: что на 4-й минуте? Если complex topic — добавить interactive checkpoint. Если boring — re-edit.", correct: true, feedback: "Root cause analysis! Pause event = cognitive load signal ИЛИ disengagement signal. Нужно различать через дополнительные данные (rewind vs exit).", points: 15 },
        { text: "Нормально — люди делают перерывы", correct: false, feedback: "70% на одной и той же минуте — не случайность. Это сигнал.", points: 2 },
        { text: "Добавить таймстампы и оглавление в видео", correct: false, feedback: "Полезно, но не решает root cause проблемы на конкретной минуте.", points: 5 },
      ] },
      { id: "ed-d3", question: "Вы строите предиктивную модель churn. Какие features наиболее predicting?", choices: [
        { text: "Последний login — чем давнее, тем выше риск", correct: false, feedback: "Recency — single signal. Слишком поздний indicator — пользователь уже ушёл.", points: 4 },
        { text: "Engagement velocity (trend): снижение weekly sessions + declining quiz scores + decreased social interactions over 2 weeks", correct: true, feedback: "Trend-based features > snapshot features! Падающий тренд за 2 недели = early warning. Время для intervention пока пользователь ещё активен.", points: 15 },
        { text: "Количество купленных курсов", correct: false, feedback: "Purchases ≠ engagement. Можно купить 10 курсов и бросить все.", points: 2 },
        { text: "NPS score", correct: false, feedback: "NPS собирается раз в квартал — слишком медленно для real-time prediction.", points: 3 },
      ] },
    ],
    summary: "Learning Analytics платформа запущена! Data-driven decisions по контенту и retention."
  },
  {
    id: "ed-community", title: "Community и Social Learning", subtitle: "Peer learning и сообщество",
    icon: Users, color: "text-cyan-600", bgColor: "bg-cyan-50",
    narrative: ["Исследования показывают: social learning повышает retention на 40-60%. У вас 50 000 одиночных learners. Нет community features. Cohort-based completion = 35% vs solo = 12%. Время строить community layer."],
    questions: [
      { id: "ed-com1", question: "Какой community format наиболее эффективен для EdTech?", choices: [
        { text: "Форум (как StackOverflow)", correct: false, feedback: "Форумы = low engagement для learning. Работает для Q&A, не для social learning.", points: 4 },
        { text: "Cohort-based learning groups (10-15 человек) + study buddies + weekly live sessions", correct: true, feedback: "Small groups + accountability + live interaction. Maven, Reforge, Coursera — лидеры cohort-based EdTech. Доказано: completion rate когорт (35%) vs соло (12%).", points: 15 },
        { text: "Discord сервер для всех пользователей", correct: false, feedback: "1 канал на 50K = noise. Нужна структура, не хаос.", points: 3 },
        { text: "Менторство 1-to-1", correct: false, feedback: "1:1 не масштабируется и слишком дорого для mass market.", points: 5 },
      ] },
      { id: "ed-com2", question: "Как мотивировать пользователей помогать друг другу (peer teaching)?", choices: [
        { text: "Платить за каждый ответ на вопрос", correct: false, feedback: "Monetary incentives → gaming the system. Ответы ради денег ≠ качественная помощь.", points: 2 },
        { text: "Reputation system: helper badges + leaderboard + unlock perks (early access, mentor status) за полезные ответы", correct: true, feedback: "Intrinsic motivation + status! StackOverflow effect: reputation > money. Feynman technique: teaching = best learning.", points: 15 },
        { text: "Обязать каждого помогать — условие для получения сертификата", correct: false, feedback: "Обязаловка = resentment. Peer help должна быть opt-in.", points: 3 },
        { text: "Добавить лайки к ответам", correct: false, feedback: "Лайки — weak signal. Нужна deeper engagement loop.", points: 4 },
      ] },
      { id: "ed-com3", question: "Вы запустили cohorts. Проблема: 30% участников inactive после 1-й недели. Что делать?", choices: [
        { text: "Убрать inactive из когорты", correct: false, feedback: "Exclusion demotivирует и уменьшает group size → снижает social learning effect.", points: 2 },
        { text: "Week 1 activation sprint: ice-breaker + pair assignment + micro-milestone + personal check-in от facilitator", correct: true, feedback: "Onboarding cohort members! Ice-breaker → connection. Pair work → accountability. Micro-milestone → quick win. Personal check-in → care.", points: 15 },
        { text: "Автоматические reminder emails каждый день", correct: false, feedback: "Email spam = unsubscribe. Нужен human touch, не automation.", points: 3 },
        { text: "Уменьшить размер когорты до 5 человек", correct: false, feedback: "5 = слишком мало для diversity мнений. 10-15 — sweet spot.", points: 5 },
      ] },
    ],
    summary: "Community layer запущен! Cohorts, peer learning и reputation system."
  },
  {
    id: "ed-ai", title: "AI и персонализация", subtitle: "Adaptive learning engine",
    icon: Zap, color: "text-teal-600", bgColor: "bg-teal-50",
    narrative: ["AI-революция меняет EdTech. Ваши данные: 50 000 learners, 2M+ quiz attempts, 500K+ video watch sessions. Enough data для ML-моделей. Конкуренты уже внедряют AI. Нужно действовать."],
    questions: [
      { id: "ed-ai1", question: "Какой AI use case приоритизировать первым?", choices: [
        { text: "AI-генерация курсов — заменить авторов", correct: false, feedback: "AI-generated content = low quality for serious education. Нужен human expertise + AI augmentation.", points: 3 },
        { text: "Adaptive learning paths: AI определяет knowledge gaps и рекомендует персональную последовательность уроков", correct: true, feedback: "Highest impact! Каждый ученик — уникальный путь. AI анализирует: quiz results → knowledge map → рекомендует следующий урок. Knewton, ALEKS доказали эффективность.", points: 15 },
        { text: "AI-чатбот для ответов на вопросы по контенту", correct: false, feedback: "Useful feature, но не transformative. Q&A bot — incremental improvement.", points: 5 },
        { text: "AI-powered marketing — персонализированные push-уведомления", correct: false, feedback: "Marketing AI — low impact на learning outcomes. Product AI → first.", points: 4 },
      ] },
      { id: "ed-ai2", question: "Вы строите knowledge graph для adaptive learning. Как валидировать его accuracy?", choices: [
        { text: "A/B тест: группа с adaptive path vs control (static path)", correct: false, feedback: "A/B тест — для финальной валидации, не для building. Нужно сначала убедиться, что граф корректен.", points: 6 },
        { text: "Expert validation (преподаватели) + learner performance correlation + iterative refinement с real user data", correct: true, feedback: "Triple validation! Experts проверяют связи. Performance data подтверждает: если граф правильный, адаптивные студенты учатся быстрее.", points: 15 },
        { text: "Автоматически из curriculum structure", correct: false, feedback: "Curriculum structure ≠ knowledge dependencies. Порядок в курсе не всегда оптимален.", points: 3 },
        { text: "LLM сгенерирует knowledge graph из текста курсов", correct: false, feedback: "LLM может помочь с первым draft, но hallucinations → inaccurate dependencies. Нужна human validation.", points: 4 },
      ] },
      { id: "ed-ai3", question: "AI-tutor или AI-copilot? Какой product framing выбрать?", choices: [
        { text: "AI-tutor: заменяет преподавателя, полностью автономное обучение", correct: false, feedback: "Full AI-tutor = uncanny valley. Студенты не доверяют AI для сложных тем. И вы теряете human connection.", points: 3 },
        { text: "AI-copilot: помогает студенту (hints, explanations, Socratic questions) + помогает преподавателю (analytics, content suggestions)", correct: true, feedback: "AI augments both sides! Студент: personalized hints (не ответы). Преподаватель: insights о class performance. Human-in-the-loop = trust + quality.", points: 15 },
        { text: "AI-grader: автоматическая проверка заданий", correct: false, feedback: "Grading — narrow use case. Copilot — broader impact на весь learning experience.", points: 5 },
        { text: "Не внедрять AI — сфокусироваться на контенте", correct: false, feedback: "AI — table stakes в 2026. Без него — competitive disadvantage.", points: 1 },
      ] },
    ],
    summary: "AI engine запущен! Adaptive learning, knowledge graph и AI-copilot."
  },
  {
    id: "ed-growth", title: "Growth и масштабирование", subtitle: "B2B2C и глобальный рост",
    icon: Globe, color: "text-emerald-600", bgColor: "bg-emerald-50",
    narrative: ["100 000 B2C пользователей. 10 B2B клиентов (корп. обучение). MRR = $150K. Задача: $1M MRR за 18 месяцев. Growth loops, international expansion, new verticals."],
    questions: [
      { id: "ed-g1", question: "Какой growth loop наиболее эффективен для EdTech?", choices: [
        { text: "Paid acquisition — увеличить бюджет на рекламу", correct: false, feedback: "Paid = linear growth. CAC растёт с масштабом.", points: 3 },
        { text: "Content-led + certification loop: free content → brand awareness → paid courses → certificate → LinkedIn share → new users", correct: true, feedback: "Viral loop через сертификаты! Каждый выпускник = маркетинговый канал. LinkedIn share = earned media. HubSpot Academy, Google Certs — так и работают.", points: 15 },
        { text: "Referral program — $10 за приведённого друга", correct: false, feedback: "Monetary referrals в EdTech = low quality users. Нужен organic viral loop.", points: 4 },
        { text: "SEO — создавать landing pages для каждого курса", correct: false, feedback: "SEO — good channel, но не growth loop. Нет flywheel effect.", points: 5 },
      ] },
      { id: "ed-g2", question: "B2B клиент (банк, 5 000 сотрудников) хочет custom LMS. Ваш продукт — не LMS. Как ответить?", choices: [
        { text: "Отказать — мы не LMS", correct: false, feedback: "Отказ без альтернативы = потеря $100K+ deal.", points: 3 },
        { text: "Embedded learning: API + SDK для интеграции вашего контента в их LMS + analytics dashboard для HR", correct: true, feedback: "Platform strategy! Не конкурировать с LMS, а стать content layer внутри любого LMS. B2B2C: их сотрудники учатся на вашем контенте.", points: 15 },
        { text: "Построить LMS — расширить продукт", correct: false, feedback: "LMS — отдельный market с Cornerstone, SAP SuccessFactors. Не ваша война.", points: 4 },
        { text: "Предложить white-label решение", correct: false, feedback: "White-label теряет brand. Ваш бренд = ваш moat для talent acquisition.", points: 5 },
      ] },
      { id: "ed-g3", question: "Вы рассматриваете новую вертикаль: healthcare training (nurses, doctors). Барьер входа?", choices: [
        { text: "Конкуренция — рынок уже занят", correct: false, feedback: "Healthcare EdTech — underserved market. Legacy players, low tech adoption.", points: 4 },
        { text: "Regulatory compliance (CE credits, accreditation bodies) + domain expertise + content validation by medical professionals", correct: true, feedback: "Healthcare = regulated industry. CE credits требуют аккредитации. Контент должен быть валидирован MDs. Barrier = moat: кто пройдёт его первым — выиграет.", points: 15 },
        { text: "Технически сложно — нужны 3D-симуляторы", correct: false, feedback: "3D — nice-to-have, не barrier. Видео + quiz + cases работает для 80% training.", points: 3 },
        { text: "Барьеров нет — просто создать курсы для медиков", correct: false, feedback: "Огромное заблуждение! Healthcare = one of the most regulated industries.", points: 1 },
      ] },
    ],
    summary: "Growth engine запущен! B2B2C, certification loop и новые вертикали."
  },
];

// ===== All Scenarios =====
const ALL_SCENARIOS: Scenario[] = [
  {
    id: "freshbite", title: "FreshBite+", subtitle: "Доставка еды — подписочная модель",
    icon: Rocket, color: "text-teal-600", bgGradient: "from-teal-500 to-emerald-500",
    description: [
      "Полный PM-цикл от CustDev до масштабирования",
      "9 этапов с командными чатами и квизами",
      "Запуск подписочной модели, unit-экономика, A/B-тесты",
    ],
    phases: FRESHBITE_PHASES,
  },
  {
    id: "b2b-saas", title: "CloudTask", subtitle: "B2B SaaS — Enterprise-план",
    icon: Server, color: "text-slate-600", bgGradient: "from-slate-600 to-teal-600",
    description: [
      "8 этапов: от Discovery до масштабирования Enterprise",
      "Security, compliance, Customer Success и unit economics",
      "Ценообразование, sales-процесс и growth engine",
    ],
    phases: B2B_PHASES,
  },
  {
    id: "marketplace", title: "SkillSwap", subtitle: "Маркетплейс — обмен навыками",
    icon: ShoppingCart, color: "text-cyan-600", bgGradient: "from-teal-600 to-cyan-500",
    description: [
      "8 этапов: от холодного старта до международной экспансии",
      "Trust & Safety, unit economics, PMF и операционная эффективность",
      "Network effects, ликвидность и масштабирование",
    ],
    phases: MARKETPLACE_PHASES,
  },
  {
    id: "edtech", title: "LearnFlow", subtitle: "EdTech — онлайн-обучение",
    icon: GraduationCap, color: "text-emerald-600", bgGradient: "from-emerald-600 to-teal-500",
    description: [
      "8 этапов: от product strategy до глобального масштабирования",
      "Контент, data analytics, community, AI и персонализация",
      "Engagement, геймификация, B2B2C и growth loops",
    ],
    phases: EDTECH_PHASES,
  },
];

// ===== Storage =====
const STORAGE_KEY_PREFIX = "sim-project-";
const RESULTS_KEY = "sim-results";

function loadProgress(scenarioId: string): { answers: Record<string, number>; currentPhase: number } {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + scenarioId) || "{}");
    return { answers: data.answers || {}, currentPhase: typeof data.currentPhase === "number" ? data.currentPhase : 0 };
  } catch { return { answers: {}, currentPhase: 0 }; }
}

function saveProgress(scenarioId: string, answers: Record<string, number>, currentPhase: number) {
  localStorage.setItem(STORAGE_KEY_PREFIX + scenarioId, JSON.stringify({ answers, currentPhase }));
}

function saveResult(scenarioId: string, scorePct: number) {
  try {
    const data = JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}");
    // Store best score
    if (!data[scenarioId] || scorePct > data[scenarioId]) {
      data[scenarioId] = scorePct;
    }
    localStorage.setItem(RESULTS_KEY, JSON.stringify(data));
  } catch {}
}

function getResults(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}"); } catch { return {}; }
}

/** Exported: get simulator completion stats for progress dashboard */
export function getSimulatorStats(): { completed: number; total: number; bestScore: number; scenarioNames: string[] } {
  const results = getResults();
  const completedIds = ALL_SCENARIOS.filter(s => results[s.id] !== undefined);
  return {
    completed: completedIds.length,
    total: ALL_SCENARIOS.length,
    bestScore: completedIds.length > 0 ? Math.max(...completedIds.map(s => results[s.id])) : 0,
    scenarioNames: completedIds.map(s => s.title),
  };
}

// ===== Main Component =====
export function ProjectSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  if (!selectedScenario) {
    return <ScenarioSelector onSelect={setSelectedScenario} />;
  }

  const scenario = ALL_SCENARIOS.find(s => s.id === selectedScenario)!;
  return <SimulatorEngine key={selectedScenario} scenario={scenario} onBack={() => setSelectedScenario(null)} onSelectScenario={setSelectedScenario} />;
}

// ===== Scenario Selector =====
function ScenarioSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const results = getResults();
  const completedCount = Object.keys(results).length;
  const bestScore = Object.values(results).length > 0 ? Math.max(...Object.values(results)) : 0;

  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 px-8 py-10 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Симулятор проектов</p>
            <h2 className="text-2xl font-bold">Выберите сценарий</h2>
          </div>
        </div>
        <p className="text-white/80 text-sm leading-relaxed max-w-xl">
          4 глубоких сценария из разных индустрий (8-9 этапов каждый). Каждое решение проверяет знания из курса и начисляет каштаны.
        </p>
        {/* Mini progress bar */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-white/70">Общий прогресс: <strong className="text-white">{completedCount}/4</strong></span>
            {completedCount > 0 && (
              <span className="text-white/70">Лучший: <strong className="text-white">{bestScore}%</strong></span>
            )}
          </div>
          <div className="flex gap-1.5">
            {ALL_SCENARIOS.map(s => {
              const r = results[s.id];
              return (
                <div key={s.id} className="flex-1 h-2 rounded-full overflow-hidden bg-white/15">
                  {r !== undefined && (
                    <div className={`h-full rounded-full transition-all ${r >= 80 ? 'bg-emerald-400' : r >= 50 ? 'bg-teal-300' : 'bg-amber-400'}`} style={{ width: '100%' }} />
                  )}
                </div>
              );
            })}
          </div>
          {completedCount > 0 && (
            <div className="flex gap-1.5 mt-1">
              {ALL_SCENARIOS.map(s => {
                const r = results[s.id];
                return (
                  <div key={s.id} className="flex-1 text-center">
                    {r !== undefined && (
                      <span className="text-[0.5625rem] text-white/50 font-medium">{r}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scenarios grid */}
      <div className="p-6 space-y-3">
        {ALL_SCENARIOS.map(scenario => {
          const Icon = scenario.icon;
          const result = results[scenario.id];
          const isCompleted = result !== undefined;
          const totalQ = scenario.phases.reduce((a, p) => a + p.questions.length, 0);

          return (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario.id)}
              className="w-full text-left rounded-xl border border-border/40 p-5 transition-all hover:border-teal-200 hover:shadow-md group bg-gradient-to-br from-white to-slate-50/80"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${scenario.bgGradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold">{scenario.title}</h3>
                    {isCompleted && (
                      <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${
                        result >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {result}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{scenario.subtitle}</p>
                  <ul className="space-y-1">
                    {scenario.description.map((line, li) => (
                      <li key={li} className="flex items-start gap-1.5 text-xs text-muted-foreground/60">
                        <span className="w-1 h-1 rounded-full bg-teal-400/60 mt-1.5 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/50">
                    <span>{scenario.phases.length} этапов</span>
                    <span>{totalQ} решений</span>
                    <span>~{Math.ceil(totalQ * 0.7)} мин</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
              {isCompleted && (
                <>
                  <div className="mt-3 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${result >= 80 ? 'bg-emerald-500' : result >= 50 ? 'bg-teal-500' : 'bg-amber-500'}`}
                      style={{ width: `${result}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[0.625rem] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Пройден
                    </span>
                    <span className="inline-flex items-center gap-1 text-[0.625rem] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                      <Award className="w-3 h-3" /> Сертификат доступен
                    </span>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Simulator Results Actions (Share / Download Card / Mini Certificate) =====

function drawResultsCard(
  canvas: HTMLCanvasElement,
  scenarioTitle: string,
  scenarioSubtitle: string,
  pct: number,
  gradeLabel: string,
  totalScore: number,
  maxScore: number,
  phases: SimPhase[],
  phaseScores: { earned: number; max: number }[],
  userName: string,
  grandTotalXP: number,
): void {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(0.5, "#134e4a");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.2, 200, 0, Math.PI * 2);
  ctx.fillStyle = "#14b8a6";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.1, H * 0.8, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Top border accent
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, "#14b8a6");
  accent.addColorStop(0.5, "#06b6d4");
  accent.addColorStop(1, "#10b981");
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 5);

  // Platform name
  ctx.fillStyle = "rgba(148,163,184,0.5)";
  ctx.font = "500 14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PM COURSE \u00B7 SIMULATOR RESULTS", 60, 50);

  // Scenario title
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
  ctx.fillText(scenarioTitle, 60, 100);

  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.font = "400 18px system-ui, -apple-system, sans-serif";
  ctx.fillText(scenarioSubtitle, 60, 130);

  // Score circle
  const cx = W - 180;
  const cy = 120;
  const r = 60;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20,184,166,0.15)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
  ctx.strokeStyle = pct >= 80 ? "#10b981" : pct >= 50 ? "#14b8a6" : "#f59e0b";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${pct}%`, cx, cy + 10);
  ctx.fillStyle = "rgba(148,163,184,0.6)";
  ctx.font = "400 11px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${totalScore}/${maxScore}`, cx, cy + 30);

  // Grade badge
  ctx.textAlign = "left";
  const cleanGrade = gradeLabel.replace(/[^\p{L}\p{N}\s\-]/gu, "").trim();
  ctx.fillStyle = "rgba(20,184,166,0.2)";
  const badgeW = ctx.measureText(cleanGrade).width + 32;
  ctx.beginPath();
  ctx.roundRect(60, 150, badgeW, 32, 16);
  ctx.fill();
  ctx.fillStyle = "#5eead4";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(cleanGrade, 76, 171);

  // XP
  ctx.fillStyle = "rgba(245,158,11,0.2)";
  ctx.beginPath();
  ctx.roundRect(60 + badgeW + 12, 150, 120, 32, 16);
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${grandTotalXP} XP`, 76 + badgeW + 12, 171);

  // Phase breakdown
  const phaseStartY = 220;
  const barH = 28;
  const barGap = 8;

  phases.forEach((p, i) => {
    const y = phaseStartY + i * (barH + barGap);
    const ps = phaseScores[i];
    const ppct = ps.max > 0 ? ps.earned / ps.max : 0;

    ctx.fillStyle = "rgba(148,163,184,0.7)";
    ctx.font = "500 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 1}. ${p.title}`, 60, y + 18);

    const barX = 340;
    const bW = W - 400;
    ctx.fillStyle = "rgba(51,65,85,0.5)";
    ctx.beginPath();
    ctx.roundRect(barX, y + 4, bW, 20, 10);
    ctx.fill();

    ctx.fillStyle = ppct >= 0.8 ? "#10b981" : ppct >= 0.5 ? "#14b8a6" : "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(barX, y + 4, Math.max(bW * ppct, 6), 20, 10);
    ctx.fill();

    ctx.fillStyle = "rgba(226,232,240,0.8)";
    ctx.font = "600 12px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${ps.earned}/${ps.max}`, W - 60, y + 18);
  });

  // User name + date
  const bottomY = H - 50;
  ctx.fillStyle = "rgba(148,163,184,0.4)";
  ctx.font = "400 14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(userName || "Student", 60, bottomY);
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }), W - 60, bottomY);
}

function generateCertCode(scenarioId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = scenarioId.substring(0, 3).toUpperCase();
  return `PM-${prefix}-${ts}-${rand}`;
}

function drawMiniCertificate(
  canvas: HTMLCanvasElement,
  scenarioTitle: string,
  pct: number,
  gradeLabel: string,
  firstName: string,
  lastName: string,
  passportNumber: string,
  certCode: string,
): void {
  const W = 1200;
  const H = 1560;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fefce8");
  bg.addColorStop(0.3, "#fffdf5");
  bg.addColorStop(0.7, "#fffdf5");
  bg.addColorStop(1, "#fef9c3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Triple border
  const drawBorder = (inset: number, color: string, w: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  };
  drawBorder(20, "#d4a853", 3);
  drawBorder(30, "#c9973a", 1.5);
  drawBorder(40, "#d4a853", 3);

  // Corner ornaments
  [[50, 50], [W - 50, 50], [50, H - 50], [W - 50, H - 50]].forEach(([ccx, ccy]) => {
    ctx.beginPath();
    ctx.arc(ccx, ccy, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#d4a853";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ccx, ccy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fffdf5";
    ctx.fill();
  });

  // Unique cert code — top right
  ctx.fillStyle = "rgba(139,118,53,0.35)";
  ctx.font = "500 11px monospace";
  ctx.textAlign = "right";
  ctx.fillText(certCode, W - 60, 70);

  // Header ornament
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 120);
  ctx.lineTo(W - 200, 120);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, 120);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#d4a853";
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();

  ctx.textAlign = "center";

  // Title
  ctx.fillStyle = "#92732a";
  ctx.font = "300 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u0421 \u0415 \u0420 \u0422 \u0418 \u0424 \u0418 \u041A \u0410 \u0422", W / 2, 180);

  ctx.fillStyle = "#b8942f";
  ctx.font = "italic 400 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u043E\u0431 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u043C \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0438 PM-\u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u0430", W / 2, 215);

  // Divider
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(300, 240);
  ctx.lineTo(W - 300, 240);
  ctx.stroke();

  ctx.fillStyle = "#8b7635";
  ctx.font = "400 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u041D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u043C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F, \u0447\u0442\u043E", W / 2, 300);

  // Full name (lastName + firstName)
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 46px system-ui, -apple-system, sans-serif";
  const displayName = `${lastName} ${firstName}`.trim() || "\u0421\u0442\u0443\u0434\u0435\u043D\u0442";
  ctx.fillText(displayName, W / 2, 365);

  const nameW = ctx.measureText(displayName).width;
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameW / 2 - 20, 382);
  ctx.lineTo(W / 2 + nameW / 2 + 20, 382);
  ctx.stroke();

  // Passport number under name
  if (passportNumber.trim()) {
    ctx.fillStyle = "rgba(139,118,53,0.55)";
    ctx.font = "400 14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442: ${passportNumber}`, W / 2, 412);
  }

  ctx.fillStyle = "#8b7635";
  ctx.font = "400 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u0440\u043E\u0448\u0451\u043B(\u0430) \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0438\u044E \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u043E\u0433\u043E \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F", W / 2, 460);

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
  ctx.fillText(`\u00AB${scenarioTitle}\u00BB`, W / 2, 520);

  ctx.fillStyle = "#8b7635";
  ctx.font = "400 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u0438 \u043F\u0440\u043E\u0434\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043B(\u0430) \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u043A\u043E\u043C\u043F\u0435\u0442\u0435\u043D\u0446\u0438\u0439:", W / 2, 575);

  // Score circle
  const scoreCx = W / 2;
  const scoreCy = 700;
  const scoreR = 80;

  ctx.beginPath();
  ctx.arc(scoreCx, scoreCy, scoreR + 10, 0, Math.PI * 2);
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(scoreCx, scoreCy, scoreR, 0, Math.PI * 2);
  const scoreGrad = ctx.createRadialGradient(scoreCx, scoreCy, 0, scoreCx, scoreCy, scoreR);
  if (pct >= 80) { scoreGrad.addColorStop(0, "#ecfdf5"); scoreGrad.addColorStop(1, "#d1fae5"); }
  else if (pct >= 50) { scoreGrad.addColorStop(0, "#f0fdfa"); scoreGrad.addColorStop(1, "#ccfbf1"); }
  else { scoreGrad.addColorStop(0, "#fffbeb"); scoreGrad.addColorStop(1, "#fef3c7"); }
  ctx.fillStyle = scoreGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(scoreCx, scoreCy, scoreR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
  ctx.strokeStyle = pct >= 80 ? "#10b981" : pct >= 50 ? "#14b8a6" : "#f59e0b";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${pct}%`, scoreCx, scoreCy + 16);

  const cleanGrade = gradeLabel.replace(/[^\p{L}\p{N}\s\-]/gu, "").trim();
  ctx.fillStyle = "#8b7635";
  ctx.font = "600 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(cleanGrade, scoreCx, scoreCy + scoreR + 45);

  // Stars
  ctx.fillStyle = "#d4a853";
  ctx.font = "24px system-ui";
  [[scoreCx - 130, scoreCy - 30], [scoreCx + 130, scoreCy - 30], [scoreCx - 120, scoreCy + 40], [scoreCx + 120, scoreCy + 40]].forEach(([sx, sy]) => {
    ctx.fillText("\u2726", sx, sy);
  });

  // Laurel leaves
  const drawLeaf = (lx: number, ly: number, angle: number, flip: boolean) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);
    if (flip) ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -15, 0, -30);
    ctx.quadraticCurveTo(-8, -15, 0, 0);
    ctx.fillStyle = "rgba(180,150,50,0.25)";
    ctx.fill();
    ctx.restore();
  };
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 3 + i * Math.PI * 0.12;
    drawLeaf(scoreCx - scoreR - 30, scoreCy + 20 - i * 18, a, false);
    drawLeaf(scoreCx + scoreR + 30, scoreCy + 20 - i * 18, -a, true);
  }

  // Divider
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(200, 910);
  ctx.lineTo(W - 200, 910);
  ctx.stroke();

  // Skills
  ctx.fillStyle = "#8b7635";
  ctx.font = "400 15px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u041F\u0440\u043E\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u044D\u0442\u0430\u043F\u044B \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0438\u0438:", W / 2, 950);

  const skillLabels = [
    "CustDev \u0438 Discovery", "\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0438 Unit-\u044D\u043A\u043E\u043D\u043E\u043C\u0438\u043A\u0430",
    "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0438 MVP", "Agile \u0438 Scrum",
    "A/B-\u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", "\u0421\u0442\u0435\u0439\u043A\u0445\u043E\u043B\u0434\u0435\u0440-\u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442",
    "\u041A\u0440\u0438\u0437\u0438\u0441-\u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442", "Growth \u0438 \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435"
  ];
  const colW = 400;
  const startX = W / 2 - colW;
  ctx.textAlign = "left";
  skillLabels.forEach((label, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    ctx.fillStyle = "#64748b";
    ctx.font = "400 14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`\u2714  ${label}`, startX + col * colW, 990 + row * 30);
  });

  // --- Personal data block ---
  ctx.textAlign = "center";
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(250, 1120);
  ctx.lineTo(W - 250, 1120);
  ctx.stroke();

  const dataY = 1155;
  const leftCol = W / 2 - 200;
  const rightCol = W / 2 + 20;
  ctx.textAlign = "left";

  // Last name
  ctx.fillStyle = "rgba(139,118,53,0.5)";
  ctx.font = "400 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u0424\u0430\u043C\u0438\u043B\u0438\u044F:", leftCol, dataY);
  ctx.fillStyle = "#1e293b";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(lastName || "\u2014", leftCol + 80, dataY);

  // First name
  ctx.fillStyle = "rgba(139,118,53,0.5)";
  ctx.font = "400 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u0418\u043C\u044F:", rightCol, dataY);
  ctx.fillStyle = "#1e293b";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(firstName || "\u2014", rightCol + 50, dataY);

  // Passport
  if (passportNumber.trim()) {
    ctx.fillStyle = "rgba(139,118,53,0.5)";
    ctx.font = "400 12px system-ui, -apple-system, sans-serif";
    ctx.fillText("\u2116 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430:", leftCol, dataY + 30);
    ctx.fillStyle = "#1e293b";
    ctx.font = "600 14px monospace";
    ctx.fillText(passportNumber, leftCol + 110, dataY + 30);
  }

  // Cert code
  const certLineY = dataY + (passportNumber.trim() ? 60 : 30);
  ctx.fillStyle = "rgba(139,118,53,0.5)";
  ctx.font = "400 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("\u2116 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u0430:", leftCol, certLineY);
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 14px monospace";
  ctx.fillText(certCode, leftCol + 120, certLineY);

  // Seal
  ctx.textAlign = "center";
  const sealCx = W / 2;
  const sealCy = 1320;
  const sealR = 45;
  ctx.beginPath();
  ctx.arc(sealCx, sealCy, sealR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(212,168,83,0.15)";
  ctx.fill();
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealCx, sealCy, sealR - 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#92732a";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("PM", sealCx, sealCy - 4);
  ctx.font = "400 10px system-ui, -apple-system, sans-serif";
  ctx.fillText("COURSE", sealCx, sealCy + 12);

  // Date
  ctx.fillStyle = "#8b7635";
  ctx.font = "400 15px system-ui, -apple-system, sans-serif";
  ctx.fillText(new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }), W / 2, 1400);

  // Verification note
  ctx.fillStyle = "rgba(139,118,53,0.3)";
  ctx.font = "italic 400 11px system-ui, -apple-system, sans-serif";
  ctx.fillText(`\u0414\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E\u0434\u043B\u0438\u043D\u043D\u043E\u0441\u0442\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043E\u0434: ${certCode}`, W / 2, 1430);

  // Bottom ornament
  ctx.strokeStyle = "#d4a853";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 1470);
  ctx.lineTo(W - 200, 1470);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, 1470);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#d4a853";
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

function SimResultsActions({
  scenario,
  pct,
  gradeLabel,
  totalScore,
  maxScore,
  phases,
  phaseScores,
  grandTotalXP,
}: {
  scenario: Scenario;
  pct: number;
  gradeLabel: string;
  totalScore: number;
  maxScore: number;
  phases: SimPhase[];
  phaseScores: { earned: number; max: number }[];
  grandTotalXP: number;
}) {
  const [showModal, setShowModal] = useState<"card" | "cert" | null>(null);
  const [certStep, setCertStep] = useState<"form" | "preview">("form");
  const [certFirstName, setCertFirstName] = useState("");
  const [certLastName, setCertLastName] = useState("");
  const [certPassport, setCertPassport] = useState("");
  const [certCode, setCertCode] = useState("");
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const certCanvasRef = useRef<HTMLCanvasElement>(null);
  const userName = getUserName();

  // Draw card canvas when modal opens
  useEffect(() => {
    if (showModal === "card" && cardCanvasRef.current) {
      drawResultsCard(
        cardCanvasRef.current, scenario.title, scenario.subtitle,
        pct, gradeLabel, totalScore, maxScore, phases, phaseScores, userName, grandTotalXP,
      );
    }
  }, [showModal]);

  // Draw cert canvas when switching to preview
  useEffect(() => {
    if (showModal === "cert" && certStep === "preview" && certCanvasRef.current) {
      drawMiniCertificate(
        certCanvasRef.current, scenario.title, pct, gradeLabel,
        certFirstName, certLastName, certPassport, certCode,
      );
    }
  }, [showModal, certStep, certCode]);

  const openCertModal = useCallback(() => {
    setCertStep("form");
    // Pre-fill from userName if available
    const parts = (userName || "").trim().split(/\s+/);
    if (parts.length >= 2) {
      setCertFirstName(parts[0]);
      setCertLastName(parts.slice(1).join(" "));
    } else if (parts.length === 1 && parts[0]) {
      setCertFirstName(parts[0]);
    }
    setShowModal("cert");
  }, [userName]);

  const handleCertGenerate = useCallback(() => {
    const code = generateCertCode(scenario.id);
    setCertCode(code);
    setCertStep("preview");
  }, [scenario.id]);

  const closeModal = useCallback(() => {
    setShowModal(null);
    setCertStep("form");
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeModal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showModal, closeModal]);

  const downloadCanvas = useCallback((canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const shareLinkedIn = useCallback(() => {
    const cleanG = gradeLabel.replace(/[^\p{L}\p{N}\s\-]/gu, "").trim();
    const text = encodeURIComponent(
      `\u042F \u043F\u0440\u043E\u0448\u0451\u043B PM-\u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u00AB${scenario.title}\u00BB \u0441 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u043C ${pct}%! ${cleanG}\n\n` +
      `\u041F\u0440\u043E\u043A\u0430\u0447\u0430\u043D\u043D\u044B\u0435 \u043D\u0430\u0432\u044B\u043A\u0438: CustDev, \u041C\u0435\u0442\u0440\u0438\u043A\u0438, \u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0438\u0437\u0430\u0446\u0438\u044F, A/B-\u0442\u0435\u0441\u0442\u044B, \u0421\u0442\u0435\u0439\u043A\u0445\u043E\u043B\u0434\u0435\u0440\u044B\n\n` +
      `#ProductManagement #PMSkills #Simulator`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${text}`,
      "_blank", "width=600,height=500"
    );
  }, [scenario.title, pct, gradeLabel]);

  const certFormValid = certFirstName.trim().length >= 1 && certLastName.trim().length >= 1;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
        className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Поделиться результатами</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={shareLinkedIn}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Linkedin className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[0.6875rem] font-medium text-muted-foreground group-hover:text-blue-700 transition-colors">LinkedIn</span>
          </button>
          <button onClick={() => setShowModal("card")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
              <Download className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-[0.6875rem] font-medium text-muted-foreground group-hover:text-teal-700 transition-colors text-center leading-tight">Скачать карточку</span>
          </button>
          <button onClick={openCertModal}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 bg-white dark:bg-card hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[0.6875rem] font-medium text-muted-foreground group-hover:text-amber-700 transition-colors text-center leading-tight">Мини-сертификат</span>
          </button>
        </div>
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={closeModal}
              onKeyDown={(e) => e.stopPropagation()}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-5 border-b border-border/40">
                <div>
                  <h3 className="text-lg font-bold">
                    {showModal === "card" ? "Карточка результатов" : "Мини-сертификат"}
                  </h3>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {showModal === "card"
                      ? "Скачайте и поделитесь в соцсетях"
                      : certStep === "form"
                        ? "Заполните данные для сертификата"
                        : "Сертификат о прохождении симулятора"}
                  </p>
                </div>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                {/* === Card preview === */}
                {showModal === "card" && (
                  <>
                    <div className="rounded-xl overflow-hidden border border-border/30 mb-4">
                      <canvas ref={cardCanvasRef} className="w-full h-auto" />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadCanvas(cardCanvasRef.current, `pm-sim-results-${scenario.id}.png`)}
                        className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Скачать PNG
                      </button>
                      <button onClick={closeModal}
                        className="px-6 py-3 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors">
                        Закрыть
                      </button>
                    </div>
                  </>
                )}

                {/* === Certificate form step === */}
                {showModal === "cert" && certStep === "form" && (
                  <div className="space-y-5">
                    <div className="rounded-xl bg-gradient-to-r from-amber-50 via-amber-50/50 to-amber-50 border border-amber-200/60 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-800 mb-1">Персональный сертификат</p>
                          <p className="text-xs text-amber-700/70 leading-relaxed">
                            Заполните данные ниже. Они будут указаны на сертификате вместе с уникальным кодом верификации.
                            Номер документа — опционально.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground/70 mb-1.5 uppercase tracking-wider">
                          Имя <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={certFirstName}
                          onChange={(e) => setCertFirstName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          autoComplete="off"
                          placeholder="Александр"
                          className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white dark:bg-muted text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-muted-foreground/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground/70 mb-1.5 uppercase tracking-wider">
                          Фамилия <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={certLastName}
                          onChange={(e) => setCertLastName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          autoComplete="off"
                          placeholder="Иванов"
                          className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white dark:bg-muted text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-muted-foreground/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground/70 mb-1.5 uppercase tracking-wider">
                        Номер паспорта / документа <span className="text-muted-foreground/30">(опционально)</span>
                      </label>
                      <input
                        type="text"
                        value={certPassport}
                        onChange={(e) => setCertPassport(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        autoComplete="off"
                        placeholder="1234 567890"
                        className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white dark:bg-muted text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-muted-foreground/30 font-mono"
                      />
                      <p className="text-[0.6875rem] text-muted-foreground/40 mt-1.5">
                        Данные хранятся только на вашем устройстве и не передаются на сервер.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCertGenerate}
                        disabled={!certFormValid}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          certFormValid
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-sm"
                            : "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                        }`}>
                        <Award className="w-4 h-4" /> Сгенерироват�� сертификат
                      </button>
                      <button onClick={closeModal}
                        className="px-6 py-3 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {/* === Certificate preview step === */}
                {showModal === "cert" && certStep === "preview" && (
                  <>
                    {/* Cert code badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/50">Код верификации:</span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-xs font-mono font-bold text-amber-700 select-all">
                          {certCode}
                        </span>
                      </div>
                      <button
                        onClick={() => setCertStep("form")}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors">
                        Изменить данные
                      </button>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border/30 mb-4">
                      <canvas ref={certCanvasRef} className="w-full h-auto" />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadCanvas(certCanvasRef.current, `pm-sim-certificate-${scenario.id}.png`)}
                        className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" /> Скачать сертификат PNG
                      </button>
                      <button onClick={closeModal}
                        className="px-6 py-3 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors">
                        Закрыть
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

// ===== Simulator Engine =====
function SimulatorEngine({ scenario, onBack, onSelectScenario }: { scenario: Scenario; onBack: () => void; onSelectScenario: (id: string) => void }) {
  const PHASES = scenario.phases;
  const saved = loadProgress(scenario.id);
  const [currentPhase, setCurrentPhase] = useState(saved.currentPhase);
  const [answers, setAnswers] = useState<Record<string, number>>(saved.answers);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showResults, setShowResults] = useState(() => {
    const allAnswered = PHASES.every(p => p.questions.every(q => saved.answers[q.id] !== undefined));
    return allAnswered && getResults()[scenario.id] !== undefined;
  });
  const [showIntro, setShowIntro] = useState(() => {
    const allAnswered = PHASES.every(p => p.questions.every(q => saved.answers[q.id] !== undefined));
    return Object.keys(saved.answers).length === 0 && !allAnswered;
  });
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [chatCompleted, setChatCompleted] = useState<Record<string, boolean>>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(`sim-chat-state-${scenario.id}`) || "{}");
      const result: Record<string, boolean> = {};
      for (const key of Object.keys(data)) {
        if (data[key]?.completed) result[key] = true;
      }
      return result;
    } catch { return {}; }
  });
  const [showChat, setShowChat] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const xpAwardedRef = useRef<Set<string>>(new Set());

  // Load previously awarded XP IDs
  useEffect(() => {
    try {
      const awarded = JSON.parse(localStorage.getItem(`sim-xp-awarded-${scenario.id}`) || "[]");
      xpAwardedRef.current = new Set(awarded);
    } catch {}
  }, [scenario.id]);

  useEffect(() => {
    saveProgress(scenario.id, answers, currentPhase);
  }, [answers, currentPhase, scenario.id]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPhase, activeQuestion, showSummary, showResults, showIntro]);

  useEffect(() => {
    if (xpToast !== null) {
      const t = setTimeout(() => setXpToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [xpToast]);

  const phase = PHASES[currentPhase];
  const totalQuestions = PHASES.reduce((a, p) => a + p.questions.length, 0);
  const totalScore = Object.entries(answers).reduce((sum, [qId, choiceIdx]) => {
    for (const p of PHASES) {
      const q = p.questions.find(qq => qq.id === qId);
      if (q) return sum + q.choices[choiceIdx].points;
    }
    return sum;
  }, 0);
  const maxScore = PHASES.reduce((a, p) => a + p.questions.reduce((b, q) => b + Math.max(...q.choices.map(c => c.points)), 0), 0);

  const awardXP = useCallback((questionId: string, points: number) => {
    if (xpAwardedRef.current.has(questionId)) return;
    if (points <= 0) return;
    const xpAmount = Math.round(points * 1.5); // 1.5x multiplier for simulator
    addLocalXP(xpAmount);
    xpAwardedRef.current.add(questionId);
    try {
      localStorage.setItem(`sim-xp-awarded-${scenario.id}`, JSON.stringify([...xpAwardedRef.current]));
    } catch {}
    setXpToast(xpAmount);
  }, [scenario.id]);

  const handleSelectChoice = useCallback((choiceIdx: number) => {
    if (showFeedback) return;
    setSelectedChoice(choiceIdx);
  }, [showFeedback]);

  const handleConfirm = useCallback(() => {
    if (selectedChoice === null) return;
    setShowFeedback(true);
    const q = phase.questions[activeQuestion];
    setAnswers(prev => ({ ...prev, [q.id]: selectedChoice }));
    awardXP(q.id, q.choices[selectedChoice].points);
  }, [selectedChoice, phase, activeQuestion, awardXP]);

  const handleNext = useCallback(() => {
    setSelectedChoice(null);
    setShowFeedback(false);
    if (activeQuestion < phase.questions.length - 1) {
      setActiveQuestion(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  }, [activeQuestion, phase]);

  const handleNextPhase = useCallback(() => {
    setShowSummary(false);
    if (currentPhase < PHASES.length - 1) {
      setCurrentPhase(prev => prev + 1);
      setActiveQuestion(0);
      setShowChat(true);
    } else {
      // Completion: save result & bonus XP
      const pct = Math.round((totalScore / maxScore) * 100);
      saveResult(scenario.id, pct);
      // Bonus XP for completion
      const bonusKey = `sim-completion-${scenario.id}`;
      if (!xpAwardedRef.current.has(bonusKey)) {
        const bonus = pct >= 90 ? 100 : pct >= 80 ? 75 : pct >= 50 ? 50 : 25;
        addLocalXP(bonus);
        xpAwardedRef.current.add(bonusKey);
        try { localStorage.setItem(`sim-xp-awarded-${scenario.id}`, JSON.stringify([...xpAwardedRef.current])); } catch {}
        setXpToast(bonus);
      }
      setShowResults(true);
    }
  }, [currentPhase, PHASES.length, totalScore, maxScore, scenario.id]);

  const handleRestart = useCallback(() => {
    setAnswers({});
    setCurrentPhase(0);
    setActiveQuestion(0);
    setSelectedChoice(null);
    setShowFeedback(false);
    setShowSummary(false);
    setShowResults(false);
    setShowIntro(true);
    setShowChat(true);
    setChatCompleted({});
    localStorage.removeItem(STORAGE_KEY_PREFIX + scenario.id);
    localStorage.removeItem(`sim-xp-awarded-${scenario.id}`);
    localStorage.removeItem(`sim-chat-state-${scenario.id}`);
    xpAwardedRef.current = new Set();
  }, [scenario.id]);

  const handleChatComplete = useCallback((phaseId: string, chatPoints: number) => {
    setChatCompleted(prev => ({ ...prev, [phaseId]: true }));
    if (chatPoints > 0) {
      const chatXpKey = `chat-${phaseId}`;
      if (!xpAwardedRef.current.has(chatXpKey)) {
        addLocalXP(chatPoints);
        xpAwardedRef.current.add(chatXpKey);
        try { localStorage.setItem(`sim-xp-awarded-${scenario.id}`, JSON.stringify([...xpAwardedRef.current])); } catch {}
        setXpToast(chatPoints);
      }
    }
    setShowChat(false);
  }, [scenario.id]);

  const handleJumpToPhase = useCallback((idx: number) => {
    const completedPhases = PHASES.filter((p, i) =>
      p.questions.every(q => answers[q.id] !== undefined) && i < idx
    ).length;
    if (idx <= completedPhases) {
      setCurrentPhase(idx);
      setActiveQuestion(0);
      setSelectedChoice(null);
      setShowFeedback(false);
      setShowSummary(false);
      setShowResults(false);
      setShowChat(!chatCompleted[PHASES[idx].id]);
    }
  }, [answers, PHASES, chatCompleted]);

  const getPhaseScore = useCallback((phaseIdx: number) => {
    const p = PHASES[phaseIdx];
    let earned = 0, max = 0;
    for (const q of p.questions) {
      max += Math.max(...q.choices.map(c => c.points));
      if (answers[q.id] !== undefined) earned += q.choices[answers[q.id]].points;
    }
    return { earned, max };
  }, [answers, PHASES]);

  const ScenarioIcon = scenario.icon;

  // ===== XP Toast =====
  const XPToastEl = (
    <AnimatePresence>
      {xpToast !== null && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full shadow-lg text-xs font-bold"
        >
          +{xpToast} 🌰
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ===== Intro =====
  if (showIntro) {
    return (
      <div ref={containerRef} className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 overflow-hidden relative">
        <div className={`bg-gradient-to-r ${scenario.bgGradient} px-8 py-10 text-white`}>
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Все сценарии
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ScenarioIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Симулятор</p>
              <h2 className="text-2xl font-bold">{scenario.title}</h2>
            </div>
          </div>
          <ul className="space-y-1 mt-1">
            {scenario.description.map((line, li) => (
              <li key={li} className="flex items-start gap-2 text-white/75 text-sm leading-relaxed">
                <span className="w-1 h-1 rounded-full bg-white/40 mt-2 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-8">
          <div className="space-y-2 mb-8">
            {PHASES.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-card border border-border/40">
                  <div className={`w-8 h-8 rounded-lg ${p.bgColor} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${p.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground/50 font-medium">Этап {i + 1}</p>
                    <p className="text-sm font-medium truncate">{p.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-teal-500" /> {totalQuestions} решений</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> {maxScore} макс. баллов</span>
            <span className="flex items-center gap-1.5">🌰 до {Math.round(maxScore * 1.5) + 100} каштанов</span>
          </div>

          <button
            onClick={() => setShowIntro(false)}
            className={`w-full py-4 bg-gradient-to-r ${scenario.bgGradient} text-white rounded-2xl font-semibold text-base hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 group`}
          >
            Начать симуляцию
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // ===== Results =====
  if (showResults) {
    const pct = Math.round((totalScore / maxScore) * 100);
    const grade = pct >= 90 ? { label: "Эксперт 🏆", color: "text-amber-600", bg: "bg-amber-50" }
                : pct >= 70 ? { label: "Профессионал ⭐", color: "text-teal-600", bg: "bg-teal-50" }
                : pct >= 50 ? { label: "Практик 📈", color: "text-cyan-600", bg: "bg-cyan-50" }
                : { label: "Стажёр 📚", color: "text-slate-600", bg: "bg-slate-50" };

    const chatPoints = getChatPointsForScenario(scenario.id);
    const quizXP = Math.round(totalScore * 1.5);
    const bonusXP = pct >= 90 ? 100 : pct >= 80 ? 75 : pct >= 50 ? 50 : 25;
    const grandTotalXP = quizXP + chatPoints.total + bonusXP;

    return (
      <div ref={containerRef} className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 overflow-hidden relative">
        {XPToastEl}
        <div className={`bg-gradient-to-r ${scenario.bgGradient} px-8 py-10 text-white text-center`}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Сценарий «{scenario.title}» завершён!</h2>
        </div>
        <div className="p-8">
          <div className="text-center mb-6">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-5xl font-bold tracking-tight mb-1">
              {totalScore}<span className="text-lg text-muted-foreground/40">/{maxScore}</span>
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${grade.bg} ${grade.color} text-sm font-semibold mt-2`}>
              {grade.label}
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-xs text-muted-foreground/50 mt-2">
              {pct >= 80 ? "🎖 Бейдж «PM-профи» получен!" : `Наберите 80%+ для получения бейджа «PM-профи» (сейчас ${pct}%)`}
            </motion.p>
          </div>

          {/* XP Summary Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="rounded-xl bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-50 border border-amber-200/60 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-amber-800">Заработано каштанов 🌰</span>
              <span className="text-lg font-bold text-amber-700">{grandTotalXP}</span>
            </div>
            <div className="space-y-1.5 text-[0.75rem]">
              <div className="flex items-center justify-between text-amber-700/70">
                <span className="flex items-center gap-1.5">📝 Квиз-вопросы (×1.5)</span>
                <span className="tabular-nums font-medium">{quizXP}</span>
              </div>
              {chatPoints.total > 0 && (
                <div className="flex items-center justify-between text-amber-700/70">
                  <span className="flex items-center gap-1.5">💬 Командные чаты</span>
                  <span className="tabular-nums font-medium">{chatPoints.total}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-amber-700/70">
                <span className="flex items-center gap-1.5">🎯 Бонус за прохождение</span>
                <span className="tabular-nums font-medium">{bonusXP}</span>
              </div>
              <div className="h-px bg-amber-200/60 my-1.5" />
              <div className="flex items-center justify-between text-amber-800 font-semibold text-[0.8125rem]">
                <span>Итого</span>
                <span className="tabular-nums">{grandTotalXP} 🌰</span>
              </div>
            </div>
          </motion.div>

          {/* Recommendation for low scores */}
          {pct < 70 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
              className="rounded-xl bg-gradient-to-r from-slate-50 via-slate-100 to-teal-50 border border-slate-200/80 p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200/60 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Рекомендация: повторите теорию</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    Результат ниже 70% — это нормально! Вернитесь к теоретическим модулям, чтобы закрепить знания, и попробуйте снова.
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[0.625rem]">
                    {scenario.id === "freshbite" && (
                      <>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 2: Метрики</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 5: Unit-экономика</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 7: A/B-тесты</span>
                      </>
                    )}
                    {scenario.id === "b2b-saas" && (
                      <>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 3: Discovery</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 4: Стратегия</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 6: Pricing</span>
                      </>
                    )}
                    {scenario.id === "marketplace" && (
                      <>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 1: Основы PM</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 3: Discovery</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 8: Go-to-Market</span>
                      </>
                    )}
                    {scenario.id === "edtech" && (
                      <>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 2: Метрики</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 4: Стратегия</span>
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">Модуль 9: Retention</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-2 mb-8">
            {PHASES.map((p, i) => {
              const { earned, max } = getPhaseScore(i);
              const phasePct = Math.round((earned / max) * 100);
              const phaseChatPts = chatPoints.perPhase[p.id] || 0;
              const Icon = p.icon;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-card border border-border/40">
                  <div className={`w-8 h-8 rounded-lg ${p.bgColor} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${p.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      {phaseChatPts > 0 && (
                        <span className="text-[0.5625rem] text-amber-600/70 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          💬 +{phaseChatPts}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${phasePct >= 80 ? 'bg-emerald-500' : phasePct >= 50 ? 'bg-teal-500' : 'bg-amber-500'}`}
                          style={{ width: `${phasePct}%` }} />
                      </div>
                      <span className="text-[0.6875rem] text-muted-foreground/50 tabular-nums shrink-0">{earned}/{max}</span>
                    </div>
                  </div>
                  {phasePct >= 80 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                </motion.div>
              );
            })}
          </div>

          {/* Share / Download / Certificate */}
          <SimResultsActions
            scenario={scenario}
            pct={pct}
            gradeLabel={grade.label}
            totalScore={totalScore}
            maxScore={maxScore}
            phases={PHASES}
            phaseScores={PHASES.map((_, i) => getPhaseScore(i))}
            grandTotalXP={grandTotalXP}
          />

          {/* Next Steps Section */}
          {(() => {
            const results = getResults();
            const currentIdx = ALL_SCENARIOS.findIndex(s => s.id === scenario.id);
            const nextScenario = ALL_SCENARIOS.find((s, i) => i > currentIdx && !results[s.id]);
            const otherIncomplete = ALL_SCENARIOS.filter(s => s.id !== scenario.id && !results[s.id]);
            const allDone = ALL_SCENARIOS.every(s => results[s.id] !== undefined);
            const completedCount = ALL_SCENARIOS.filter(s => results[s.id] !== undefined).length;

            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="mb-6">
                {allDone ? (
                  <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/60 p-5 text-center">
                    <div className="text-3xl mb-2">🎓</div>
                    <p className="text-sm font-semibold text-emerald-800 mb-1">Все 4 сценария пройдены!</p>
                    <p className="text-xs text-emerald-700/70">Вы прошли все симуляции. Попробуйте улучшить результат или вернитесь к теоретическим модулям.</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gradient-to-r from-teal-50 via-white to-teal-50 border border-teal-200/60 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="w-4 h-4 text-teal-600" />
                      <p className="text-sm font-semibold text-teal-800">Что дальше?</p>
                      <span className="ml-auto text-[0.6875rem] text-teal-600/70 bg-teal-100 px-2 py-0.5 rounded-full font-medium">{completedCount}/4 пройдено</span>
                    </div>
                    <div className="space-y-2">
                      {(nextScenario ? [nextScenario, ...otherIncomplete.filter(s => s.id !== nextScenario.id)] : otherIncomplete).slice(0, 2).map((s) => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.id}
                            onClick={() => onSelectScenario(s.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-card border border-border/40 hover:border-teal-300 hover:shadow-sm transition-all group text-left"
                          >
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.bgGradient} flex items-center justify-center shrink-0`}>
                              <Icon className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[0.8125rem] font-semibold truncate">{s.title}</p>
                              <p className="text-[0.6875rem] text-muted-foreground/60 truncate">{s.subtitle}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}

          <div className="flex gap-3">
            <button onClick={onBack}
              className="flex-1 py-3 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Все сценарии
            </button>
            <button onClick={handleRestart}
              className="flex-1 py-3 border border-border/60 rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Пройти заново
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Phase Summary =====
  if (showSummary) {
    const { earned, max } = getPhaseScore(currentPhase);
    const phasePct = Math.round((earned / max) * 100);
    const Icon = phase.icon;
    return (
      <div ref={containerRef} className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 overflow-hidden relative">
        {XPToastEl}
        <div className={`px-8 py-8 ${phase.bgColor} border-b border-border/20`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${phase.bgColor} border border-white/50 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${phase.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/50 font-medium">Этап {currentPhase + 1} завершён</p>
              <h3 className="text-lg font-bold">{phase.title}</h3>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="text-center mb-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                phasePct >= 80 ? 'bg-emerald-50 text-emerald-700' : phasePct >= 50 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
              }`}>
              {phasePct >= 80 ? <CheckCircle2 className="w-4 h-4" /> : <Star className="w-4 h-4" />}
              {earned}/{max} баллов ({phasePct}%)
            </motion.div>
          </div>
          <div className="bg-white dark:bg-card rounded-xl border border-border/40 p-5 mb-6">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{phase.summary}</p>
            </div>
          </div>
          <button onClick={handleNextPhase}
            className={`w-full py-3.5 bg-gradient-to-r ${scenario.bgGradient} text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 group`}>
            {currentPhase < PHASES.length - 1 ? (
              <>Этап {currentPhase + 2}: {PHASES[currentPhase + 1].title}<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
            ) : (
              <>Посмотреть результаты<Trophy className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ===== Main Game =====
  const q = phase.questions[activeQuestion];
  const prevAnswer = answers[q.id];
  const hasPrevAnswer = prevAnswer !== undefined;
  const Icon = phase.icon;

  return (
    <div ref={containerRef} className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/60 overflow-hidden relative">
      {XPToastEl}
      {/* Header */}
      <div className="px-6 py-4 bg-white/80 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} className="p-1 rounded-lg hover:bg-muted/30 transition-colors mr-1" title="Все сценарии">
              <ArrowLeft className="w-4 h-4 text-muted-foreground/40" />
            </button>
            <div className={`w-8 h-8 rounded-lg ${phase.bgColor} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${phase.color}`} />
            </div>
            <div>
              <p className="text-[0.625rem] text-muted-foreground/50 font-medium uppercase tracking-wider">{scenario.title} · Этап {currentPhase + 1}/{PHASES.length}</p>
              <h3 className="text-sm font-semibold">{phase.title}</h3>
            </div>
          </div>
          <span className="text-xs text-muted-foreground/50 tabular-nums font-medium">{totalScore} 🌰</span>
        </div>
        <div className="flex gap-1">
          {PHASES.map((_, i) => (
            <button key={i} onClick={() => handleJumpToPhase(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < currentPhase ? 'bg-emerald-400 cursor-pointer hover:bg-emerald-500'
                : i === currentPhase ? 'bg-teal-500'
                : 'bg-muted cursor-default'
              }`} />
          ))}
        </div>
        {/* Global scenario progress */}
        {(() => {
          const gResults = getResults();
          const gCount = ALL_SCENARIOS.filter(s => gResults[s.id] !== undefined).length;
          if (gCount === 0) return null;
          return (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/15">
              <span className="text-[0.5625rem] text-muted-foreground/40 font-medium whitespace-nowrap">Сценарии {gCount}/4</span>
              <div className="flex gap-1 flex-1">
                {ALL_SCENARIOS.map(s => (
                  <div key={s.id} className={`flex-1 h-1 rounded-full ${
                    gResults[s.id] !== undefined
                      ? gResults[s.id] >= 80 ? 'bg-emerald-400' : gResults[s.id] >= 50 ? 'bg-teal-400' : 'bg-amber-400'
                      : s.id === scenario.id ? 'bg-teal-300/50' : 'bg-muted/60'
                  }`} />
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Chat Simulation */}
      {activeQuestion === 0 && showChat && !chatCompleted[phase.id] && (
        <div className="px-6 pt-5">
          <ChatSimulation
            scenarioId={scenario.id}
            phaseId={phase.id}
            storageKey={`sim-chat-state-${scenario.id}`}
            onComplete={(pts) => handleChatComplete(phase.id, pts)}
          />
        </div>
      )}

      {/* Narrative (shown after chat is completed or skipped) */}
      {activeQuestion === 0 && (chatCompleted[phase.id] || !showChat) && (
        <div className="px-6 pt-5">
          <div className={`rounded-xl ${phase.bgColor} border border-border/20 p-4`}>
            {phase.narrative.map((text, i) => {
              const name = getUserName();
              const personalized = name !== "Вы" ? text.replace(/Вы —/g, `${name},`).replace(/Ваша задача/g, `${name}, ваша задача`) : text;
              return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-2 last:mb-0">{personalized}</p>;
            })}
          </div>
        </div>
      )}

      {/* Question (hidden while chat is active) */}
      {(!showChat || chatCompleted[phase.id]) && <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground/50 font-medium tabular-nums">Вопрос {activeQuestion + 1}/{phase.questions.length}</span>
          <div className="flex gap-1">
            {phase.questions.map((_, qi) => (
              <div key={qi} className={`w-2 h-2 rounded-full ${
                answers[phase.questions[qi].id] !== undefined ? 'bg-emerald-400' : qi === activeQuestion ? 'bg-teal-500' : 'bg-muted'
              }`} />
            ))}
          </div>
        </div>

        {q.context && (
          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 mb-4 border border-border/20">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground/70 leading-relaxed">{q.context}</p>
          </div>
        )}

        <h4 className="text-base font-semibold mb-5 leading-relaxed">{q.question}</h4>

        <div className="space-y-2 mb-5">
          {q.choices.map((choice, ci) => {
            const isSelected = selectedChoice === ci;
            const isAnswered = showFeedback || hasPrevAnswer;
            const answerIdx = showFeedback ? selectedChoice : prevAnswer;
            const isCorrect = choice.correct;
            const wasChosen = answerIdx === ci;

            return (
              <motion.button key={ci} layout
                onClick={() => !isAnswered && handleSelectChoice(ci)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-start gap-3 ${
                  isAnswered
                    ? isCorrect ? 'bg-emerald-50 ring-2 ring-emerald-300 text-emerald-900'
                      : wasChosen ? 'bg-red-50 ring-2 ring-red-300 text-red-900'
                      : 'bg-white/60 text-muted-foreground/60 ring-1 ring-border/20'
                    : isSelected ? 'bg-teal-50 ring-2 ring-teal-400 text-teal-900 shadow-sm'
                    : 'bg-white dark:bg-card ring-1 ring-border/40 hover:ring-teal-200 hover:bg-teal-50/30 dark:hover:bg-teal-900/20 cursor-pointer'
                }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isAnswered
                    ? isCorrect ? 'bg-emerald-500 text-white' : wasChosen ? 'bg-red-400 text-white' : 'bg-muted text-muted-foreground/50'
                    : isSelected ? 'bg-teal-500 text-white' : 'bg-muted text-muted-foreground/50'
                }`}>
                  {isAnswered ? (isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : wasChosen ? <XCircle className="w-3.5 h-3.5" /> : String.fromCharCode(65 + ci)) : String.fromCharCode(65 + ci)}
                </span>
                <div className="flex-1">
                  <span className="leading-relaxed">{choice.text}</span>
                  {isAnswered && (wasChosen || isCorrect) && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="text-xs leading-relaxed mt-2 pt-2 border-t border-current/10">
                      {choice.feedback}
                    </motion.p>
                  )}
                </div>
                {isAnswered && wasChosen && (
                  <span className={`text-xs font-bold shrink-0 ${choice.points > 0 ? 'text-amber-600' : 'text-red-400'}`}>
                    +{choice.points} 🌰
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {q.hint && !showFeedback && !hasPrevAnswer && <HintBlock hint={q.hint} />}

        <div className="flex items-center justify-between pt-2">
          {!showFeedback && !hasPrevAnswer ? (
            <button onClick={handleConfirm} disabled={selectedChoice === null}
              className="ml-auto px-6 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
              Подтвердить
            </button>
          ) : (
            <button onClick={handleNext}
              className="ml-auto px-6 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-all shadow-sm flex items-center gap-2 group">
              {activeQuestion < phase.questions.length - 1 ? 'Далее' : 'Завершить этап'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>}
    </div>
  );
}

function HintBlock({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">
        <Lightbulb className="w-3.5 h-3.5" />
        {open ? "Скрыть подсказку" : "Показать подсказку"}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <p className="text-xs text-amber-700/70 bg-amber-50 rounded-lg p-3 mt-2 border border-amber-100 leading-relaxed">💡 {hint}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
