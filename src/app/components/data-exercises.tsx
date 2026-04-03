import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3, TrendingUp, Target, CheckCircle2, X,
  ChevronRight, Zap, AlertTriangle, Calculator, ArrowRight
} from "lucide-react";
import { addLocalXP } from "./interactive-progress";

interface Exercise {
  id: string;
  title: string;
  category: "ab_test" | "funnel" | "unit_economics" | "cohort" | "segmentation" | "retention" | "pricing";
  difficulty: "easy" | "medium" | "hard";
  scenario: string;
  data: { headers: string[]; rows: (string | number)[][] };
  questions: { q: string; options: string[]; correctIndex: number; explanation: string }[];
  xp: number;
}

const CATEGORY_CONFIG = {
  ab_test: { label: "A/B-тесты", icon: Target, color: "text-violet-600", bg: "bg-violet-50" },
  funnel: { label: "Воронки", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
  unit_economics: { label: "Юнит-экономика", icon: Calculator, color: "text-amber-600", bg: "bg-amber-50" },
  cohort: { label: "Когорты", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50" },
  segmentation: { label: "Сегментация", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
  retention: { label: "Retention", icon: TrendingUp, color: "text-pink-600", bg: "bg-pink-50" },
  pricing: { label: "Ценообразование", icon: Calculator, color: "text-indigo-600", bg: "bg-indigo-50" },
};

const EXERCISES: Exercise[] = [
  // ===== A/B TESTS =====
  {
    id: "ab1", title: "A/B-тест кнопки CTA", category: "ab_test", difficulty: "easy", xp: 10,
    scenario: "Вы тестируете новый текст кнопки на лендинге. Тест длился 7 дней.",
    data: {
      headers: ["Вариант", "Посетители", "Клики", "Конверсия", "p-value"],
      rows: [
        ["Control (\"Попробовать\")", 5200, 156, "3.0%", "—"],
        ["Test (\"Начать бесплатно\")", 5150, 206, "4.0%", "0.012"],
      ],
    },
    questions: [
      { q: "Статистически значимый ли результат?", options: ["Да, p < 0.05", "Нет, нужно больше данных", "Невозможно определить", "Да, но только при p < 0.01"], correctIndex: 0, explanation: "p=0.012 < 0.05, результат статистически значимый." },
      { q: "Какой следующий шаг?", options: ["Раскатить тест на 100%", "Проверить downstream-метрики (retention, revenue)", "Запустить ещё один тест", "Ничего не делать"], correctIndex: 1, explanation: "Даже при значимом p-value нужно проверить, не ухудшились ли downstream-метрики (novelty effect, качество лидов)." },
    ],
  },
  {
    id: "ab2", title: "Парадокс Симпсона в A/B", category: "ab_test", difficulty: "hard", xp: 20,
    scenario: "A/B-тест нового онбординга. По сегментам Test ЛУЧШЕ контроля. Но общие цифры кажутся обратными — классический парадокс Симпсона.",
    data: {
      headers: ["Сегмент", "Вариант", "Пользователи", "Активация", "%"],
      rows: [
        ["Мобильные", "Control", 1000, 200, "20%"],
        ["Мобильные", "Test", 4000, 920, "23%"],
        ["Десктоп", "Control", 4000, 1200, "30%"],
        ["Десктоп", "Test", 1000, 320, "32%"],
        ["Всего", "Control", 5000, 1400, "28%"],
        ["Всего", "Test", 5000, 1240, "24.8%"],
      ],
    },
    questions: [
      { q: "Что происходит с данными?", options: ["Test хуже по всем сегментам — не раскатывать", "Парадокс Симпсона: Test ЛУЧШЕ в каждом сегменте, но выглядит хуже в агрегате из-за неравного распределения трафика", "Данные некорректны — баг в трекинге", "Test хорош только для мобильных"], correctIndex: 1, explanation: "Классический Парадокс Симпсона: в сегменте Мобильные Test: 23% vs Control: 20% (+3 п.п.); в Десктоп Test: 32% vs Control: 30% (+2 п.п.). Но в агрегате Test выглядит хуже (24.8% vs 28%), потому что Test получил 80% мобильных (с низкой базовой конверсией), а Control — 80% десктопных. Тренд полностью меняется при агрегации!" },
      { q: "Какое решение принять?", options: ["Откатить Test — в общих цифрах он хуже", "Раскатить Test на 100% — он лучше в обоих сегментах", "Раскатить Test с равным сплитом по сегментам, чтобы исключить эффект распределения трафика", "Запустить ещё один тест отдельно для мобильных"], correctIndex: 2, explanation: "Test показывает улучшение в обоих сегментах (+3 п.п. мобильные, +2 п.п. десктоп). Агрегированные цифры обманчивы из-за неравномерного трафика. Правильное решение — раскатить Test, но следить за корректным сплитом. При равном распределении (50/50 mobile/desktop) общий результат Test составит ~(0.5×23%)+(0.5×32%) = 27.5% vs Control ~(0.5×20%)+(0.5×30%) = 25% — Test победит." },
    ],
  },
  {
    id: "ab3", title: "Multiple testing: 3 варианта", category: "ab_test", difficulty: "medium", xp: 15,
    scenario: "Вы запустили A/B/C-тест с тремя вариантами оплаты. Тест длился 14 дней.",
    data: {
      headers: ["Вариант", "Пользователи", "Оплаты", "Конверсия", "p-value vs Control"],
      rows: [
        ["A (Control): 1 шаг", 8000, 320, "4.0%", "—"],
        ["B: 2 шага с прогрессом", 8100, 356, "4.4%", "0.24"],
        ["C: 1 шаг + Apple Pay", 7900, 395, "5.0%", "0.004"],
      ],
    },
    questions: [
      { q: "Вариант B значимо лучше Control?", options: ["Да, конверсия выше", "Нет, p=0.24 > 0.05", "Да, если применить Bonferroni-поправку", "Невозможно определить"], correctIndex: 1, explanation: "p=0.24 значительно выше порога 0.05. Разница 0.4 п.п. может быть случайной." },
      { q: "Нужна ли поправка на множественное сравнение для варианта C?", options: ["Нет, p и так < 0.05", "Да, порог = 0.05/2 = 0.025, C по-прежнему значим", "Да, порог = 0.05/3 = 0.017, C по-прежнему значим", "Поправка не нужна для 3 вариантов"], correctIndex: 2, explanation: "По Bonferroni: порог = 0.05/3 ≈ 0.017. p=0.004 < 0.017 — вариант C статистически значим даже с поправкой." },
      { q: "Средний чек варианта C на 8% ниже. Что делать?", options: ["Раскатить C — конверсия важнее", "Отклонить C — revenue per user ниже", "Посчитать Revenue per Visitor и сравнить", "Запустить отдельный тест на чек"], correctIndex: 2, explanation: "Revenue per Visitor = конверсия × средний чек. RPV(A)=4.0%×$100=$4.0, RPV(C)=5.0%×$92=$4.6 — вариант C приносит больше revenue per visitor." },
    ],
  },
  {
    id: "ab4", title: "Novelty & Primacy Effect", category: "ab_test", difficulty: "hard", xp: 20,
    scenario: "Тест нового дизайна дашборда. В первую неделю Test показывал +25% engagement, к 4-й неделе эффект снизился.",
    data: {
      headers: ["Неделя", "Control DAU", "Test DAU", "Control Engagement", "Test Engagement", "Δ"],
      rows: [
        ["Неделя 1", 3200, 3180, "12 мин", "15 мин", "+25%"],
        ["Неделя 2", 3150, 3190, "11.5 мин", "13.8 мин", "+20%"],
        ["Неделя 3", 3100, 3170, "11.2 мин", "12.3 мин", "+10%"],
        ["Неделя 4", 3080, 3160, "11.0 мин", "11.5 мин", "+5%"],
      ],
    },
    questions: [
      { q: "Что объясняет снижение эффекта?", options: ["Баг в трекинге", "Novelty effect — новизна привлекает, потом привыкают", "Сезонность", "Недостаточно данных"], correctIndex: 1, explanation: "Классический novelty effect: пользователи активнее взаимодействуют с новым дизайном из любопытства, но со временем привыкают." },
      { q: "Стоит ли раскатывать?", options: ["Да, эффект всё ещё +5%", "Нет, тренд к нулю", "Подождать ещё 4 недели и оценить стабилизацию", "Вернуть старый дизайн"], correctIndex: 2, explanation: "Нужно дождаться стабилизации. Если через 4+ недель эффект удержится на +3-5%, это реальный прирост. Если уйдёт в 0 — novelty effect." },
    ],
  },
  // ===== FUNNELS =====
  {
    id: "fn1", title: "Анализ воронки регистрации", category: "funnel", difficulty: "easy", xp: 10,
    scenario: "Воронка регистрации SaaS-продукта за последний месяц:",
    data: {
      headers: ["Этап", "Пользователи", "Конверсия в след. этап", "Потери"],
      rows: [
        ["Лендинг", 10000, "—", "—"],
        ["Клик 'Попробовать'", 3200, "32%", "6800"],
        ["Начал регистрацию", 1800, "56%", "1400"],
        ["Завершил регистрацию", 840, "47%", "960"],
        ["Первое действие", 320, "38%", "520"],
        ["Возврат на 2-й день", 120, "37.5%", "200"],
      ],
    },
    questions: [
      { q: "Где самое большое падение (bottleneck)?", options: ["Лендинг → Клик CTA", "Начал → Завершил регистрацию", "Завершил → Первое действие", "Первое действие → D2 retention"], correctIndex: 0, explanation: "Лендинг → CTA: 68% потерь (6800 из 10000). Это самый большой абсолютный bottleneck — именно здесь уходит большинство. Важно: большие абсолютные потери не всегда означают наибольший потенциал роста — это разбирает следующий вопрос." },
      { q: "На каком этапе наибольший потенциал роста?", options: ["Улучшить лендинг (SEO, копирайт)", "Ускорить регистрацию (убрать шаги)", "Улучшить onboarding (Aha-moment быстрее)", "Всё одновременно"], correctIndex: 2, explanation: "Лендинг теряет больше в абсолютных числах, но его конверсия (32%) — типичная для SaaS. Конверсия 38% «Завершил регистрацию → Первое действие» критична: пользователь уже внутри продукта, но не получает ценность. Ускорение Aha-moment создаёт compound-эффект и поднимает D2-retention — именно здесь наибольший потенциал роста." },
    ],
  },
  {
    id: "fn2", title: "E-commerce checkout воронка", category: "funnel", difficulty: "medium", xp: 15,
    scenario: "Интернет-магазин одежды, воронка покупки за март:",
    data: {
      headers: ["Этап", "Сессии", "Конверсия", "Δ к февралю"],
      rows: [
        ["Каталог", 85000, "—", "+12%"],
        ["Карточка товара", 42000, "49%", "+8%"],
        ["Добавил в корзину", 14700, "35%", "+2%"],
        ["Перешёл к оплате", 5880, "40%", "-15%"],
        ["Ввёл данные оплаты", 3530, "60%", "-3%"],
        ["Завершил покупку", 2940, "83%", "+1%"],
      ],
    },
    questions: [
      { q: "Какой этап деградировал больше всего?", options: ["Каталог → Карточка", "Карточка → Корзина", "Корзина → Оплата (-15%)", "Оплата → Ввод данных"], correctIndex: 2, explanation: "Корзина → Оплата упала на 15% к прошлому месяцу. Это самое резкое ухудшение — нужно исследовать причины (цены доставки? промокоды?)." },
      { q: "Гипотеза: в марте добавили показ стоимости доставки на этапе корзины. Как проверить?", options: ["Убрать стоимость доставки", "Запустить A/B-тест: показывать стоимость vs скрывать", "Сравнить средний чек", "Опрос пользователей"], correctIndex: 1, explanation: "A/B-тест — лучший способ изолировать эффект. Опрос даст субъективные данные, убирать стоимость нечестно — можно сравнить варианты: «показать сразу» vs «показать при оформлении»." },
      { q: "Общая конверсия лендинг→покупка:", options: ["3.5%", "2.9%", "5.0%", "4.1%"], correctIndex: 0, explanation: "2940/85000 = 3.46% ≈ 3.5%. Для e-commerce одежды это нормальный показатель (средний 2-4%)." },
    ],
  },
  {
    id: "fn3", title: "B2B SaaS: Trial → Paid", category: "funnel", difficulty: "hard", xp: 20,
    scenario: "B2B продукт, анализ конверсии trial → paid за Q1 по источникам трафика:",
    data: {
      headers: ["Источник", "Signups", "Activated", "Act %", "Trial End", "Paid", "Paid %"],
      rows: [
        ["Organic Search", 1200, 840, "70%", 780, 195, "25%"],
        ["Google Ads", 2800, 1120, "40%", 980, 147, "15%"],
        ["Product Hunt", 950, 665, "70%", 600, 60, "10%"],
        ["Referral", 400, 340, "85%", 320, 128, "40%"],
        ["Sales-led", 150, 135, "90%", 130, 78, "60%"],
      ],
    },
    questions: [
      { q: "Какой канал имеет лучшую unit-экономику (при одинаковом CAC)?", options: ["Organic — больше всего paid", "Google Ads — масштабируется", "Referral — лучший % конверсии из mass-каналов", "Sales-led — 60% конверсия"], correctIndex: 2, explanation: "Referral: 85% activation × 40% paid = лучшее сочетание volume + quality. Sales-led выше по %, но не масштабируется. Organic хорош, но Referral конвертит в 1.6× лучше." },
      { q: "Google Ads приводит больше signups, но Paid %=15%. Что делать?", options: ["Отключить Google Ads", "Оптимизировать targeting на более качественную аудиторию", "Увеличить бюджет — volume компенсирует", "Добавить шаг квалификации до trial"], correctIndex: 1, explanation: "40% activation говорит о проблеме с качеством трафика. Нужно оптимизировать targeting: использовать look-alike на Referral/Organic аудитории, добавить негативные ключевики." },
    ],
  },
  // ===== UNIT ECONOMICS =====
  {
    id: "ue1", title: "Unit-экономика подписки", category: "unit_economics", difficulty: "medium", xp: 15,
    scenario: "Оцените юнит-экономику SaaS-продукта:",
    data: {
      headers: ["Метрика", "Значение"],
      rows: [
        ["Цена подписки", "$29/мес"],
        ["Средний срок жизни клиента", "8 месяцев"],
        ["Gross margin", "75%"],
        ["CAC (стоимость привлечения)", "$120"],
        ["Churn rate", "12.5%/мес"],
        ["Referral rate", "10%"],
      ],
    },
    questions: [
      { q: "Чему равен LTV?", options: ["$232", "$174", "$120", "$58"], correctIndex: 1, explanation: "LTV = ARPU × Lifetime × Gross Margin = $29 × 8 × 0.75 = $174." },
      { q: "Отношение LTV/CAC?", options: ["1.0x", "1.45x", "1.93x", "2.5x"], correctIndex: 1, explanation: "LTV/CAC = $174/$120 = 1.45x. Это ниже целевого 3x — бизнес пока не масштабируем." },
      { q: "Что приоритетнее для роста?", options: ["Снизить CAC", "Увеличить retention (снизить churn)", "Поднять цену", "Увеличить referral"], correctIndex: 1, explanation: "Churn 12.5%/мес — очень высокий. Снижение churn до 8% увеличит lifetime с 8 до 12.5 мес, LTV до $272, LTV/CAC до 2.27x — максимальный compound effect." },
    ],
  },
  {
    id: "ue2", title: "Маркетплейс: юниты двух сторон", category: "unit_economics", difficulty: "hard", xp: 20,
    scenario: "Маркетплейс услуг клининга. Данные за Q1:",
    data: {
      headers: ["Метрика", "Клиенты", "Исполнители"],
      rows: [
        ["CAC", "$35", "$80"],
        ["Заказов/мес", "1.2", "8"],
        ["Средний чек", "$65", "—"],
        ["Комиссия", "15%", "—"],
        ["Lifetime", "6 мес", "10 мес"],
        ["Churn", "16%/мес", "10%/мес"],
      ],
    },
    questions: [
      { q: "Revenue per client per month?", options: ["$65", "$9.75", "$11.70", "$78"], correctIndex: 2, explanation: "Rev/client/month = заказов × чек × комиссия = 1.2 × $65 × 0.15 = $11.70." },
      { q: "LTV клиента (без gross margin)?", options: ["$70.20", "$58.50", "$35.10", "$120"], correctIndex: 0, explanation: "LTV = $11.70 × 6 мес = $70.20." },
      { q: "На какой стороне выгоднее инвестировать в retention?", options: ["Клиенты — churn выше", "Исполнители — дороже привлечь", "Одинаково", "Нужно считать supply/demand ratio"], correctIndex: 1, explanation: "CAC исполнителя $80 vs $35 клиента. При CAC 2.3× выше, каждый потерянный исполнитель стоит значительно дороже. Плюс 1 исполнитель обслуживает 8 заказов/мес — мультипликатор на supply-side." },
    ],
  },
  {
    id: "ue3", title: "Freemium модель: конверсия в Premium", category: "unit_economics", difficulty: "medium", xp: 15,
    scenario: "Productivity-приложение с freemium моделью:",
    data: {
      headers: ["Метрика", "Free", "Premium ($9.99/мес)"],
      rows: [
        ["MAU", "500 000", "15 000"],
        ["Конверсия Free → Premium", "—", "3%"],
        ["Lifetime", "4 мес (active)", "14 мес"],
        ["CAC (blended)", "$1.50", "$50 (attributed)"],
        ["Marginal cost / user / month", "$0.20", "$0.80"],
        ["Referral от Premium", "—", "0.3 приглашения/мес"],
      ],
    },
    questions: [
      { q: "LTV Premium-пользователя?", options: ["$139.86", "$128.66", "$79.93", "$99.90"], correctIndex: 1, explanation: "LTV = (ARPU - marginal cost) × lifetime = ($9.99 - $0.80) × 14 = $128.66." },
      { q: "Окупаются ли Free-пользователи?", options: ["Да, через рекламу", "Нет, убыточны (cost $0.20 × 4 мес = $0.80)", "Да, через конверсию в Premium", "Зависит от viral coefficient"], correctIndex: 2, explanation: "Free → Premium = 3%. LTV Premium = $128.66. Ожидаемая ценность Free-пользователя = 3% × $128.66 = $3.86 vs cost $0.80+$1.50 CAC = $2.30. Окупаются, но с небольшой маржой." },
    ],
  },
  // ===== COHORTS =====
  {
    id: "ch1", title: "Когортный анализ retention", category: "cohort", difficulty: "medium", xp: 15,
    scenario: "Retention по недельным когортам мобильного приложения:",
    data: {
      headers: ["Когорта", "Размер", "W1", "W2", "W3", "W4", "W8"],
      rows: [
        ["Январь W1", 1200, "45%", "28%", "22%", "18%", "12%"],
        ["Январь W2", 1100, "43%", "26%", "20%", "16%", "10%"],
        ["Февраль W1", 1500, "48%", "32%", "26%", "22%", "16%"],
        ["Февраль W2", 1400, "50%", "35%", "28%", "24%", "18%"],
      ],
    },
    questions: [
      { q: "Есть ли Product-Market Fit?", options: ["Да — retention улучшается", "Нет — retention не выходит на плато", "Сигналы PMF появляются", "Невозможно определить"], correctIndex: 2, explanation: "Февральские когорты показывают улучшение retention на каждом этапе. Это сигнал, что продукт улучшается, но W8=16-18% всё ещё может быть недостаточным для PMF." },
      { q: "На чём фокусироваться?", options: ["Acquisition — больше пользователей", "W1 retention — onboarding", "W1→W2 drop — ранний engagement", "W4→W8 — долгосрочный retention"], correctIndex: 2, explanation: "Самое большое абсолютное падение — W1→W2 (с ~48% до ~32%). Это говорит о проблемах с ранним engagement после первого визита." },
    ],
  },
  {
    id: "ch2", title: "Revenue retention когорт", category: "cohort", difficulty: "hard", xp: 20,
    scenario: "Net Revenue Retention (NRR) по ежемесячным когортам B2B SaaS:",
    data: {
      headers: ["Когорта", "MRR M0", "M3", "M6", "M12", "NRR M12"],
      rows: [
        ["Q1'25", "$45K", "$42K", "$38K", "$31K", "69%"],
        ["Q2'25", "$52K", "$50K", "$48K", "$44K", "85%"],
        ["Q3'25", "$60K", "$61K", "$63K", "$66K", "110%"],
        ["Q4'25", "$55K", "$58K", "$62K", "—", "—"],
      ],
    },
    questions: [
      { q: "Когда продукт достиг NRR > 100%?", options: ["Q1'25", "Q2'25", "Q3'25", "Не достиг"], correctIndex: 2, explanation: "Q3: $66K/$60K = 110% NRR > 100%. Expansion revenue (upsells) впервые превысила churn. Это ключевой milestone для B2B SaaS." },
      { q: "Что изменилось между Q2 и Q3?", options: ["Привлекли крупных клиентов", "Внедрили upsell/expansion стратегию", "Снизили churn", "Все варианты — нужно исследовать"], correctIndex: 3, explanation: "NRR выросла с 85% до 110% — это огромный скачок. Может быть комбинация: снизился churn (retention лучше) + появился expansion. Нужно декомпозировать: GRR (gross retention) + expansion rate." },
      { q: "Какой показатель NRR считается лучшим для B2B SaaS?", options: ["> 80%", "> 100%", "> 120%", "> 150%"], correctIndex: 2, explanation: "> 120% NRR — gold standard для B2B SaaS (как Snowflake, Datadog). > 100% означает, что бизнес растёт даже без новых клиентов." },
    ],
  },
  {
    id: "ch3", title: "Activation rate по когортам", category: "cohort", difficulty: "easy", xp: 10,
    scenario: "Активация новых пользователей (выполнили ключевое действие в первые 24ч) после изменений в онбординге:",
    data: {
      headers: ["Неделя", "Signups", "Activated", "Rate", "Изменение"],
      rows: [
        ["W1 (до)", 800, 240, "30%", "Baseline"],
        ["W2 (прогресс-бар)", 780, 281, "36%", "+20%"],
        ["W3 (+чеклист)", 820, 336, "41%", "+37%"],
        ["W4 (+персонализация)", 790, 356, "45%", "+50%"],
        ["W5 (стабилизация)", 810, 365, "45%", "+50%"],
      ],
    },
    questions: [
      { q: "Какое изменение дало наибольший прирост?", options: ["Прогресс-бар (+6 п.п.)", "Чеклист (+5 п.п.)", "Персонализация (+4 п.п.)", "Все примерно одинаковы"], correctIndex: 0, explanation: "Прогресс-бар: +6 п.п. (30%→36%). Чеклист: +5 п.п. Персонализация: +4 п.п. Первое изменение дало самый большой инкрементальный эффект." },
      { q: "Стоит ли продолжать итерации?", options: ["Да, можно довести до 60%", "Нет, вышли на плато (W4=W5)", "Переключиться на retention", "Зависит от cost of change"], correctIndex: 2, explanation: "Активация стабилизировалась на 45% (W4=W5). Закон убывающей отдачи. Время переключиться на следующий bottleneck — retention после активации." },
    ],
  },
  // ===== SEGMENTATION =====
  {
    id: "seg1", title: "RFM-сегментация клиентов", category: "segmentation", difficulty: "medium", xp: 15,
    scenario: "E-commerce: RFM-анализ базы клиентов (Recency × Frequency × Monetary):",
    data: {
      headers: ["Сегмент", "Клиентов", "%", "Avg Order Value", "Orders/year", "Last order"],
      rows: [
        ["Champions", 2500, "5%", "$120", "12", "< 7 дней"],
        ["Loyal", 5000, "10%", "$85", "8", "< 30 дней"],
        ["Potential Loyalists", 7500, "15%", "$70", "3", "< 30 дней"],
        ["At Risk", 10000, "20%", "$90", "6", "60-90 дней"],
        ["Hibernating", 15000, "30%", "$50", "2", "> 120 дней"],
        ["Lost", 10000, "20%", "$45", "1", "> 180 дней"],
      ],
    },
    questions: [
      { q: "На каком сегменте фокусировать retention-кампанию?", options: ["Champions — удержать лучших", "At Risk — 20% базы с высоким AOV скоро уйдут", "Hibernating — самый большой сегмент", "Lost — вернуть потерянных"], correctIndex: 1, explanation: "At Risk: 10K клиентов × $90 AOV × 6 заказов = $5.4M/год revenue under threat. Они ещё не потеряны, но уходят. ROI retention-кампании здесь максимален." },
      { q: "Как монетизировать Potential Loyalists?", options: ["Скидки на повторные покупки", "Программа лояльности с тирами", "Cross-sell и bundle offers", "Все три + personalized recommendations"], correctIndex: 3, explanation: "PL сегмент: AOV $70, 3 заказа/год, недавно были. Их нужно нурчить комплексно: loyalty rewards, personalized рекомендации, cross-sell. Цель — перевести в Loyal (8 заказов/год, AOV $85)." },
    ],
  },
  {
    id: "seg2", title: "Географическая сегментация метрик", category: "segmentation", difficulty: "medium", xp: 15,
    scenario: "Мобильная игра: метрики по регионам за март:",
    data: {
      headers: ["Регион", "DAU", "D1 Ret.", "D7 Ret.", "ARPDAU", "CPI"],
      rows: [
        ["US", "120K", "42%", "18%", "$0.15", "$2.80"],
        ["EU (Tier 1)", "85K", "38%", "15%", "$0.10", "$1.90"],
        ["LATAM", "200K", "35%", "12%", "$0.03", "$0.40"],
        ["SEA", "310K", "30%", "10%", "$0.02", "$0.25"],
        ["Japan", "45K", "48%", "24%", "$0.35", "$4.50"],
      ],
    },
    questions: [
      { q: "В каком регионе лучшая unit-экономика (LTV/CPI)?", options: ["US — высокий ARPDAU", "Japan — лучший retention + ARPDAU", "LATAM — самый дешёвый CPI", "SEA — максимум DAU"], correctIndex: 1, explanation: "Japan: ARPDAU $0.35, D7 24%. Если D30~15%, LTV ≈ $0.35×30×0.15×3 ≈ $4.73, CPI=$4.50, LTV/CPI≈1.05. US: LTV≈$0.15×30×0.18×3≈$2.43, CPI=$2.80, LTV/CPI≈0.87. Japan выгоднее." },
      { q: "Для масштабирования на каком регионе фокусироваться?", options: ["SEA — максимум DAU", "US — крупнейший рынок по revenue", "Japan — лучшая экономика", "LATAM — дешёвый рост"], correctIndex: 2, explanation: "Japan: лучший LTV/CPI, лучший retention, лучший ARPDAU. Хоть DAU и маленький (45K), экономика позволяет масштабировать profitably. US на втором месте." },
    ],
  },
  // ===== RETENTION =====
  {
    id: "ret1", title: "Churn-анализ SaaS: leaky bucket", category: "retention", difficulty: "medium", xp: 15,
    scenario: "B2B SaaS с MRR $200K. Churn растёт уже 4 месяца:",
    data: {
      headers: ["Месяц", "Начало MRR", "New", "Expansion", "Churn", "Конец MRR", "Gross Churn %"],
      rows: [
        ["Янв", "$180K", "$25K", "$8K", "-$12K", "$201K", "6.7%"],
        ["Фев", "$201K", "$22K", "$6K", "-$18K", "$211K", "9.0%"],
        ["Мар", "$211K", "$28K", "$5K", "-$31K", "$213K", "14.7%"],
        ["Апр", "$213K", "$24K", "$7K", "-$28K", "$216K", "13.1%"],
      ],
    },
    questions: [
      { q: "Какой тренд churn?", options: ["Стабильный ~7%", "Резкий рост с 6.7% до 14.7%", "Незначительное колебание", "Снижение"], correctIndex: 1, explanation: "Churn вырос с 6.7% до 14.7% — более чем вдвое за 3 месяца. При 14.7% monthly churn lifetime = 6.8 месяцев." },
      { q: "Что делать в первую очередь?", options: ["Увеличить продажи для компенсации", "Провести exit-интервью с ушедшими клиентами", "Запустить скидки для удержания", "Нанять больше менеджеров"], correctIndex: 1, explanation: "Сначала нужно понять причину. Exit-интервью с 10-15 клиентами, ушедшими в марте-апреле, вскроют паттерн: продуктовая проблема? Конкурент? Ценовое давление?" },
      { q: "MRR растёт (201→216K) несмотря на churn. Это хорошо?", options: ["Да, рост есть!", "Нет — маскирует проблему: новые клиенты заливают дыру", "Зависит от burn rate", "Нужно больше данных"], correctIndex: 1, explanation: "В апреле Churn ($28K) > New ($24K). При таком тренде MRR начнёт падать через 1-2 месяца. Это 'leaky bucket' — сначала чини ведро, потом лей воду." },
    ],
  },
  {
    id: "ret2", title: "Feature adoption и retention", category: "retention", difficulty: "hard", xp: 20,
    scenario: "Корреляция между использованием фич и D30 retention за 6 месяцев:",
    data: {
      headers: ["Фича", "% юзеров", "D30 Ret. если да", "D30 Ret. если нет", "Δ"],
      rows: [
        ["Создал проект", "68%", "52%", "8%", "+44 п.п."],
        ["Пригласил коллегу", "23%", "71%", "22%", "+49 п.п."],
        ["Настроил интеграцию", "15%", "78%", "25%", "+53 п.п."],
        ["Использовал шаблон", "41%", "45%", "18%", "+27 п.п."],
        ["Экспортировал отчёт", "12%", "82%", "26%", "+56 п.п."],
      ],
    },
    questions: [
      { q: "Какая фича — лучший кандидат для Aha-moment?", options: ["Создал проект — самый высокий %", "Пригласил коллегу — Δ49 и разумный %", "Экспортировал отчёт — самый большой Δ", "Настроил интеграцию"], correctIndex: 1, explanation: "Экспорт и интеграция — маркеры power users, а не причина retention. 'Пригласил коллегу' (23%, Δ49) — каузальный кандидат: совместная работа создаёт switching cost." },
      { q: "Корреляция ≠ каузация. Как проверить?", options: ["Раскатить nudge на приглашение", "A/B-тест: промптить приглашение vs нет, измерить D30", "Посмотреть на больших данных", "Провести интервью"], correctIndex: 1, explanation: "A/B-тест: группа A — nudge 'пригласите коллегу' на D2, группа B — без. Если D30 retention группы A значимо выше — каузальная связь подтверждена." },
    ],
  },
  {
    id: "ret3", title: "Win-back кампания: 4 варианта", category: "retention", difficulty: "medium", xp: 15,
    scenario: "Win-back email для inactive 60+ дней пользователей. 4 варианта, по 5000 писем:",
    data: {
      headers: ["Вариант", "Open %", "Вернулись", "Return %", "Остались D14", "D14 %"],
      rows: [
        ["A: 'Мы скучаем'", "18%", 120, "2.4%", 15, "12.5%"],
        ["B: 'Новые фичи'", "24%", 280, "5.6%", 84, "30%"],
        ["C: 'Скидка 50%'", "22%", 350, "7.0%", 52, "14.9%"],
        ["D: 'Ваш прогресс'", "21%", 310, "6.2%", 96, "31%"],
      ],
    },
    questions: [
      { q: "Какой вариант лучше по net retained users?", options: ["C — больше вернулись (350)", "B — хороший return + D14 30%", "D — баланс volume и quality: 310×31%=96", "A — самый дешёвый"], correctIndex: 2, explanation: "D: 96 retained. B: 84. C: 52. A: 15. D выигрывает И без скидки (полная маржа). 'Ваш прогресс' персонализирован и показывает ценность." },
      { q: "Почему скидка 50% показала худший D14?", options: ["Маленькая скидка", "Привлекла price-sensitive юзеров без sticky-мотивации", "Баг в трекинге", "Мало данных"], correctIndex: 1, explanation: "Скидка привлекает cherry-pickers: возвращаются за скидкой, не за продуктом. Когда скидка кончается — уходят снова. D14=14.9%." },
    ],
  },
  // ===== PRICING =====
  {
    id: "pr1", title: "Van Westendorp: оптимальная цена", category: "pricing", difficulty: "medium", xp: 15,
    scenario: "Опрос 200 клиентов (Van Westendorp Price Sensitivity Meter). Пересечения кривых:",
    data: {
      headers: ["Порог", "Цена", "Что означает"],
      rows: [
        ["Point of Marginal Cheapness", "$9/мес", "Ниже — подозрительно дёшево"],
        ["Optimal Price Point (OPP)", "$19/мес", "Минимум сопротивления"],
        ["Indifference Price Point", "$25/мес", "50/50 считают дорого/приемлемо"],
        ["Point of Marginal Expensiveness", "$39/мес", "Выше — слишком дорого"],
      ],
    },
    questions: [
      { q: "Какую цену для максимума подписчиков?", options: ["$9 — минимальная", "$19 — OPP", "$25 — Indifference", "$39 — премиум"], correctIndex: 1, explanation: "OPP ($19) — точка минимального сопротивления. Для volume-стратегии это оптимум." },
      { q: "Для premium позиционирования?", options: ["$19-25", "$25-39", "$39+", "$9-19"], correctIndex: 1, explanation: "Диапазон $25-39 — зона приемлемого премиума. $25-29 — sweet spot для value-based pricing." },
      { q: "Конкурент продаёт за $15. Что делать?", options: ["Снизить до $14", "Остаться на $19, усилить value proposition", "Freemium $0 + $25 Pro", "Зависит от позиционирования"], correctIndex: 3, explanation: "Pricing зависит от позиционирования. Low-cost? $14. Value leader? $19 + лучший продукт. Premium? $29 + exclusive features. Нет универсального ответа." },
    ],
  },
  {
    id: "pr2", title: "Pricing tiers: decoy effect", category: "pricing", difficulty: "easy", xp: 10,
    scenario: "A/B-тест pricing page. A: 2 тарифа. B: 3 тарифа (добавлен дорогой якорь). 30 дней:",
    data: {
      headers: ["Вариант", "Тариф", "Цена", "Выбрали %", "RPV"],
      rows: [
        ["A (2 тарифа)", "Basic", "$19", "62%", ""],
        ["A (2 тарифа)", "Pro", "$49", "38%", "$30.40"],
        ["B (3 тарифа)", "Basic", "$19", "18%", ""],
        ["B (3 тарифа)", "Pro", "$49", "57%", ""],
        ["B (3 тарифа)", "Ultimate", "$99", "25%", "$56.10"],
      ],
    },
    questions: [
      { q: "Как Ultimate повлиял на выбор Pro?", options: ["Не повлиял", "Pro выросла с 38% до 57%", "Pro упала", "Pro осталась стабильной"], correctIndex: 1, explanation: "Anchoring effect: Ultimate за $99 сделала Pro за $49 'выгодным'. Без якоря $49 казалась дорогой. С якорем — 'всего половина от Ultimate'." },
      { q: "Revenue per 100 users вырос на:", options: ["+25%", "+50%", "+84%", "+100%"], correctIndex: 2, explanation: "A: $30.40. B: $56.10 (0.18×$19 + 0.57×$49 + 0.25×$99 = $3.42+$27.93+$24.75). Рост ($56.10-$30.40)/$30.40 = +84.5% ≈ +84%. Один дополнительный тариф почти удвоил revenue!" },
    ],
  },
  {
    id: "pr3", title: "Tier migration analysis", category: "pricing", difficulty: "hard", xp: 20,
    scenario: "SaaS с тремя тарифами. Анализ миграции между тарифами за Q4:",
    data: {
      headers: ["Тариф", "Цена", "Клиентов Q3", "Upgrade→", "Downgrade→", "Churn", "Клиентов Q4"],
      rows: [
        ["Starter $19", "", 2400, "180 → Pro", "—", "192 (8%)", 2228],
        ["Pro $49", "", 1200, "60 → Ent", "96 → Starter", "48 (4%)", 1276],
        ["Enterprise $149", "", 400, "—", "20 → Pro", "6 (1.5%)", 434],
      ],
    },
    questions: [
      { q: "Net revenue impact миграций (без учёта churn)?", options: ["Положительный: upgrades > downgrades", "Отрицательный", "Нейтральный", "Нельзя определить"], correctIndex: 0, explanation: "Upgrades: 180×($49-$19) + 60×($149-$49) = $5,400 + $6,000 = $11,400/мес. Downgrades: 96×($49-$19) + 20×($149-$49) = $2,880 + $2,000 = $4,880/мес. Net = +$6,520/мес." },
      { q: "96 юзеров downgrade Pro→Starter. Что делать?", options: ["Запретить downgrade", "Исследовать: какие фичи Pro они не используют?", "Снизить цену Pro", "Добавить фичи в Pro"], correctIndex: 1, explanation: "96 downgrades из 1200 = 8% — высоко. Нужно понять: они перешли потому что не используют Pro-фичи? Тогда проблема в activation фич. Или цена непропорциональна ценности? Интервью + usage data." },
    ],
  },
  // ===== MORE SEGMENTATION =====
  {
    id: "seg3", title: "Power Users: behavioral кластеры", category: "segmentation", difficulty: "hard", xp: 20,
    scenario: "Productivity SaaS: 4 поведенческих кластера за 90 дней:",
    data: {
      headers: ["Кластер", "% MAU", "Sessions/week", "Actions/session", "Features", "NPS", "MRR %"],
      rows: [
        ["Power Users", "8%", "22", "45", "12/15", "72", "35%"],
        ["Regular Users", "32%", "8", "18", "6/15", "45", "40%"],
        ["Light Users", "35%", "2", "6", "2/15", "28", "18%"],
        ["Dormant", "25%", "0.3", "2", "1/15", "12", "7%"],
      ],
    },
    questions: [
      { q: "Какой кластер — главный драйвер роста?", options: ["Power Users — 35% MRR от 8%", "Regular — 40% MRR, стабильный", "Light — самый большой потенциал", "Dormant — 25% MAU"], correctIndex: 0, explanation: "Power Users: 8%→35% MRR, NPS=72 = promoters. Они приводят referrals, расширяют usage. Фокус: что делает их power users? Как перевести Regular→Power?" },
      { q: "Light→Regular конверсия увеличит MRR на:", options: ["~5%", "~10-15%", "~30%", "Невозможно оценить"], correctIndex: 1, explanation: "Light = 35% MAU, 18% MRR. Если 50% Light станут Regular (MRR/user ~3× выше), это ≈ +10-15% MRR. Рычаг: упростить discovery фич." },
      { q: "Что делать с Dormant (25%)?", options: ["Скидки", "Re-engagement серия → если нет — let them go", "Звонок от sales", "Добавить фичи для них"], correctIndex: 1, explanation: "Dormant (NPS=12, 0.3 sessions/week) — продукт им не подходит. 3-шаговая re-engagement серия. Если не помогло — не ваш ICP. Ресурсы лучше на Light→Regular." },
    ],
  },
];

const LS_KEY = "data-exercises-progress";

function getProgress(): Record<string, { score: number; maxScore: number }> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}

export function DataExercises({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);
  const progress = getProgress();

  const handleAnswer = (idx: number) => {
    if (answers[currentQ] !== undefined) return;
    setAnswers(prev => ({ ...prev, [currentQ]: idx }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (!selected) return;
    if (currentQ < selected.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setShowExplanation(false);
    } else {
      // Complete
      const correct = selected.questions.filter((q, i) => answers[i] === q.correctIndex).length;
      const result = { score: correct, maxScore: selected.questions.length };
      const prog = getProgress();
      const isNew = !prog[selected.id];
      prog[selected.id] = result;
      try { localStorage.setItem(LS_KEY, JSON.stringify(prog)); } catch {}
      if (isNew && correct > 0) addLocalXP(selected.xp);
      setCompleted(true);
    }
  };

  const resetExercise = () => {
    setCurrentQ(0);
    setAnswers({});
    setShowExplanation(false);
    setCompleted(false);
  };

  // List view
  if (!selected) {
    const categories = Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][];
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
        <div className="max-w-[720px] mx-auto px-6 py-10">
          <button onClick={onClose} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
            <X className="w-4 h-4" /> Закрыть
          </button>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full text-[0.75rem] font-medium mb-4">
              <BarChart3 className="w-3 h-3" /> Real Data Exercises
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Аналитические задачи</h1>
            <p className="text-[0.875rem] text-muted-foreground">Решайте задачи на реальных данных: A/B-тесты, воронки, юнит-экономика</p>
          </div>
          {categories.map(([cat, cfg]) => {
            const Icon = cfg.icon;
            const exercises = EXERCISES.filter(e => e.category === cat);
            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <h3 className="text-[0.8125rem] font-semibold">{cfg.label}</h3>
                  <span className="text-[0.625rem] text-muted-foreground/40">{exercises.filter(e => progress[e.id]).length}/{exercises.length}</span>
                </div>
                <div className="space-y-2">
                  {exercises.map(ex => {
                    const done = progress[ex.id];
                    return (
                      <button key={ex.id} onClick={() => { setSelected(ex); resetExercise(); }} className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border/40 hover:border-teal-200 transition-all text-left group dark:hover:border-teal-800">
                        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Zap className={`w-4 h-4 shrink-0 ${cfg.color}`} />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.8125rem] font-medium">{ex.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[0.5625rem] px-1.5 py-0.5 rounded-full ${ex.difficulty === "easy" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : ex.difficulty === "medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>{ex.difficulty === "easy" ? "Легко" : ex.difficulty === "medium" ? "Средне" : "Сложно"}</span>
                            <span className="text-[0.5625rem] text-muted-foreground/40">+{ex.xp} XP</span>
                          </div>
                        </div>
                        {done && <span className="text-[0.625rem] font-bold text-teal-600 dark:text-teal-400">{done.score}/{done.maxScore}</span>}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-teal-500" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Exercise view
  const question = selected.questions[currentQ];
  const isAnswered = answers[currentQ] !== undefined;
  const isCorrect = isAnswered && answers[currentQ] === question?.correctIndex;

  if (completed) {
    const correct = selected.questions.filter((q, i) => answers[i] === q.correctIndex).length;
    const pct = Math.round((correct / selected.questions.length) * 100);
    return (
      <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
        <div className="max-w-[720px] mx-auto px-6 py-10">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border/40 p-8 text-center">
            <div className={`text-5xl mb-4 ${pct >= 80 ? "" : pct >= 50 ? "" : ""}`}>{pct >= 80 ? "🎯" : pct >= 50 ? "📊" : "📈"}</div>
            <h2 className="text-xl font-bold mb-2">{correct}/{selected.questions.length} правильно</h2>
            <p className="text-muted-foreground text-[0.875rem] mb-6">{pct >= 80 ? "Отличный аналитический подход!" : pct >= 50 ? "Хорошо, но есть пространство для роста" : "Продолжайте практиковаться!"}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={resetExercise} className="px-4 py-2.5 bg-muted/50 rounded-xl text-[0.8125rem] font-medium hover:bg-muted">Пройти заново</button>
              <button onClick={() => setSelected(null)} className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-[0.8125rem] font-medium hover:from-teal-600 hover:to-emerald-600">Другая задача</button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-200 via-slate-100 to-teal-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950/50">
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground/60 hover:text-foreground mb-6 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Назад
        </button>
        <h2 className="text-lg font-bold mb-2">{selected.title}</h2>
        <p className="text-[0.8125rem] text-muted-foreground mb-4">{selected.scenario}</p>

        {/* Data table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full bg-card rounded-xl border border-border/40 overflow-hidden text-[0.75rem]">
            <thead className="bg-muted/50">
              <tr>{selected.data.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {selected.data.rows.map((row, i) => (
                <tr key={i} className="border-t border-border/20">
                  {row.map((cell, j) => <td key={j} className="px-3 py-2 tabular-nums">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Question */}
        <div className="mb-2 text-[0.625rem] text-muted-foreground/50">Вопрос {currentQ + 1} из {selected.questions.length}</div>
        <div className="bg-card rounded-2xl border border-border/40 p-5 mb-4">
          <p className="text-[0.875rem] font-medium mb-4">{question.q}</p>
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const selected_ = answers[currentQ] === i;
              const correct_ = i === question.correctIndex;
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={isAnswered} className={`w-full text-left px-4 py-3 rounded-xl text-[0.8125rem] transition-all ${
                  isAnswered
                    ? correct_ ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700" : selected_ ? "bg-red-100 text-red-900 ring-1 ring-red-300 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-700" : "bg-muted/20 text-muted-foreground/50"
                    : "bg-muted/30 border border-border/40 hover:border-teal-200 hover:bg-teal-50/30 dark:hover:border-teal-700 dark:hover:bg-teal-900/10"
                }`}>
                  {opt}
                </button>
              );
            })}
          </div>
          {showExplanation && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-3.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
              <p className="text-[0.75rem] text-teal-800 dark:text-teal-300 leading-relaxed">{question.explanation}</p>
            </motion.div>
          )}
        </div>
        {isAnswered && (
          <button onClick={nextQuestion} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-emerald-600 transition-all">
            {currentQ < selected.questions.length - 1 ? <>Следующий вопрос <ArrowRight className="w-4 h-4" /></> : <>Завершить <CheckCircle2 className="w-4 h-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}