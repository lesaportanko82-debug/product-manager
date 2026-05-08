import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { PRICING_PLANS } from "./pricing-plans";

interface Rates {
  rub: number;
  kzt: number;
  /** Цена месячного тарифа в рублях (рассчитана сервером по курсу ЦБ РФ) */
  monthlyRub: number;
  /** Цена вечного тарифа в рублях (рассчитана сервером по курсу ЦБ РФ) */
  lifetimeRub: number;
}

const CACHE_KEY = "currency-rates-cache-v4";
const CACHE_TTL = 60 * 60 * 1000; // 1 час

function loadCache(): { rates: Rates; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(rates: Rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }));
  } catch { /* ignore */ }
}

const FALLBACK_RATE = 90;
const FALLBACK_RATES: Rates = {
  rub: FALLBACK_RATE,
  kzt: 510,
  monthlyRub:  Math.round(PRICING_PLANS.monthly.priceUsd  * FALLBACK_RATE),
  lifetimeRub: Math.round(PRICING_PLANS.lifetime.priceUsd * FALLBACK_RATE),
};

export function useCurrencyRates() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем кэш
    const cached = loadCache();
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setRates(cached.rates);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRates() {
      // 1) Пробуем серверный эндпоинт (курс ЦБ РФ — тот же, что использует платёжный шлюз)
      try {
        const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-279b4dfa/payment/exchange-rate`;
        const res = await fetch(serverUrl, {
          headers: { "Authorization": `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok) {
          const data = await res.json();
          // Берём только курс ЦБ; рублёвые цены считаем сами из PRICING_PLANS
          if (data?.usdToRub) {
            const rubRate: number = data.usdToRub;
            // Also try to get KZT from open.er-api.com asynchronously (best effort)
            let kzt = 510;
            try {
              const erRes = await fetch("https://open.er-api.com/v6/latest/USD", {
                signal: AbortSignal.timeout(4000),
              });
              if (erRes.ok) {
                const erData = await erRes.json();
                kzt = erData?.rates?.KZT || 510;
              }
            } catch { /* ignore KZT fetch failure */ }

            const r: Rates = {
              rub: rubRate,
              kzt,
              monthlyRub:  Math.round(PRICING_PLANS.monthly.priceUsd  * rubRate),
              lifetimeRub: Math.round(PRICING_PLANS.lifetime.priceUsd * rubRate),
            };
            if (!cancelled) {
              setRates(r);
              saveCache(r);
            }
            return;
          }
        }
      } catch { /* fallthrough to open.er-api.com */ }

      // 2) Fallback — open.er-api.com
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.rates?.RUB && data?.rates?.KZT) {
            const rubRate: number = data.rates.RUB;
            const r: Rates = {
              rub: rubRate,
              kzt: data.rates.KZT,
              monthlyRub:  Math.round(PRICING_PLANS.monthly.priceUsd  * rubRate),
              lifetimeRub: Math.round(PRICING_PLANS.lifetime.priceUsd * rubRate),
            };
            if (!cancelled) {
              setRates(r);
              saveCache(r);
            }
            return;
          }
        }
      } catch { /* fallthrough to hardcoded fallback */ }

      if (!cancelled) setRates(FALLBACK_RATES);
    }

    fetchRates().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  /** Форматирует сумму в рублях по текущему курсу: «7 820 ₽» */
  function formatRub(usd: number): string | null {
    if (!rates) return null;
    return Math.round(usd * rates.rub).toLocaleString("ru-RU") + " \u20bd";
  }

  /** Возвращает рублёвую цену тарифа, рассчитанную сервером по ЦБ РФ */
  function getPlanPriceRub(plan: "monthly" | "lifetime"): number | null {
    if (!rates) return null;
    return plan === "lifetime" ? rates.lifetimeRub : rates.monthlyRub;
  }

  /** Форматирует сумму в тенге: «43 350 ₸» */
  function formatKzt(usd: number): string | null {
    if (!rates) return null;
    const amount = Math.round(usd * rates.kzt);
    return amount.toLocaleString("ru-RU") + " \u20b8";
  }

  return { rates, loading, formatRub, formatKzt, getPlanPriceRub };
}