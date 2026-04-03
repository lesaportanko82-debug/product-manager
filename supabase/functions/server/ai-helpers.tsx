/**
 * AI Helpers — retry logic, response caching, and utility functions
 */
import * as kv from "./kv_store.tsx";

// ===== Retry with exponential backoff =====

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 2, baseDelayMs = 1000, maxDelayMs = 5000 } = retryOpts;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Don't retry on 4xx client errors (except 429 rate limit)
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      // Retry on 5xx or 429
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        console.log(`OpenAI request attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response; // Return last failed response
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        console.log(`OpenAI request attempt ${attempt + 1} threw error: ${err}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error("fetchWithRetry: all attempts exhausted");
}

// ===== AI Response Cache =====

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashQuestion(lessonId: string, question: string): string {
  // Simple hash: normalize question and combine with lessonId
  const normalized = question.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
  let hash = 0;
  const combined = `${lessonId}:${normalized}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ai-cache:${Math.abs(hash).toString(36)}`;
}

export async function getCachedAIResponse(
  lessonId: string,
  question: string
): Promise<string | null> {
  try {
    const key = hashQuestion(lessonId, question);
    const cached = await kv.get(key);
    if (!cached) return null;
    // Check TTL
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      // Expired, delete async
      kv.del(key).catch(() => {});
      return null;
    }
    console.log(`AI cache hit for key: ${key}`);
    return cached.answer;
  } catch {
    return null;
  }
}

export async function setCachedAIResponse(
  lessonId: string,
  question: string,
  answer: string
): Promise<void> {
  try {
    const key = hashQuestion(lessonId, question);
    await kv.set(key, { answer, timestamp: Date.now(), lessonId });
  } catch (err) {
    console.log(`Error caching AI response: ${err}`);
  }
}

// ===== Fallback responses =====

const FALLBACK_RESPONSES: Record<string, string> = {
  "ai-chat": "K сожалению, AI-ассистент временно недоступен. Попробуйте повторить запрос через несколько минут. Если проблема сохраняется, продолжайте изучение материала урока - все ключевые концепции подробно описаны в тексте.",
  "evaluate-case": "Автоматическая проверка кейса временно недоступна. Ваш ответ сохранён - вы можете вернуться к проверке позже. Попробуйте самостоятельно оценить свой ответ по критериям: структура, глубина анализа, продуктовый подход, практичность и метрики.",
};

export function getFallbackResponse(endpoint: string): string {
  return FALLBACK_RESPONSES[endpoint] || "Сервис временно недоступен. Пожалуйста, попробуйте позже.";
}
