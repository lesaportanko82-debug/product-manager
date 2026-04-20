import { useState, useEffect } from "react";

interface Rates {
  rub: number;
  kzt: number;
}

const CACHE_KEY = "currency-rates-cache";
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

    // Загружаем актуальный курс
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(data => {
        if (data?.rates?.RUB && data?.rates?.KZT) {
          const r = { rub: data.rates.RUB, kzt: data.rates.KZT };
          setRates(r);
          saveCache(r);
        } else {
          // fallback при ошибке
          setRates({ rub: 84, kzt: 510 });
        }
      })
      .catch(() => {
        setRates({ rub: 84, kzt: 510 });
      })
      .finally(() => setLoading(false));
  }, []);

  /** Форматирует сумму в рублях: «7 140 ₽» */
  function formatRub(usd: number) {
    if (!rates) return null;
    const amount = Math.round(usd * rates.rub);
    return amount.toLocaleString("ru-RU") + " ₽";
  }

  /** Форматирует сумму в тенге: «43 350 ₸» */
  function formatKzt(usd: number) {
    if (!rates) return null;
    const amount = Math.round(usd * rates.kzt);
    return amount.toLocaleString("ru-RU") + " ₸";
  }

  return { rates, loading, formatRub, formatKzt };
}
