/**
 * OpenAI Configuration and Health Check
 * 
 * This file provides utilities for OpenAI API configuration
 * and health checking across the PM Academy application.
 */

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  defaultParams: {
    temperature: number;
    maxTokens: number;
    presencePenalty: number;
    frequencyPenalty: number;
  };
}

export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  return {
    apiKey,
    model: "gpt-4o-mini",
    baseURL: "https://eov7cjgjy9fs5pi.m.pipedream.net",
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1200,
      presencePenalty: 0.1,
      frequencyPenalty: 0.1,
    },
  };
}

export async function checkOpenAIHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = getOpenAIConfig();
    
    const response = await fetch(`${config.baseURL}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      return { ok: false, error: `OpenAI API returned ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export const SOVUNYA_CONSTANTS = {
  EMOJI: "🦉",
  NAME: "Совунья",
  ROLE: "AI-ассистент курса PM Академия",
  MAX_QUESTION_LENGTH: 500,
  MIN_QUESTION_LENGTH: 3,
  CACHE_TTL_HOURS: 24,
  RESPONSE_TIME_TARGET_MS: 3000,
} as const;
