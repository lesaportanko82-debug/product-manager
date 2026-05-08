/**
 * ═══════════════════════════════════════════════════════════════
 *  PRICING PLANS — единственный source of truth для цен тарифов
 *
 *  Эти значения используются:
 *    • в UI-карточках тарифов (paywall-modal, paywall-screen, demo-upgrade-banner)
 *    • в теле запроса на оплату (amount → YooKassa / super-task)
 *    • на сервере (payment-handler.tsx) для валидации суммы
 *
 *  При изменении цены меняйте ТОЛЬКО здесь. Всё остальное
 *  обновится автоматически.
 * ═══════════════════════════════════════════════════════════════
 */

export const PRICING_PLANS = {
  monthly: {
    planId:      "month",
    title:       "Доступ на месяц",
    priceRub:    13800,
    priceUsd:    150,
    oldPriceUsd: 350,
    accessDays:  30,
    description: "Доступ к курсу по продакт-менеджменту на 30 дней",
    label:       "/ месяц",
    badge:       "ранний доступ",
  },
  lifetime: {
    planId:      "lifetime",
    title:       "Вечный доступ",
    priceRub:    16600,
    priceUsd:    180,
    oldPriceUsd: 400,
    accessDays:  null as null,
    description: "Вечный доступ к курсу по продакт-менеджменту",
    label:       "навсегда",
    badge:       "навсегда",
  },
} as const;

/** Форматирует рублёвую цену: «7 000 ₽» */
export function formatPriceRub(priceRub: number): string {
  return priceRub.toLocaleString("ru-RU") + " ₽";
}

/** Возвращает строку для поля amount в запросе на оплату: «7000.00» */
export function toPaymentAmount(priceRub: number): string {
  return priceRub.toFixed(2);
}