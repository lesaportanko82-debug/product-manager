/**
 * AI Chat Handler - Enhanced Sovunya Integration
 */

import { fetchWithRetry } from "./ai-helpers.tsx";
import { getSovunyaSystemPrompt } from "./sovunya-system-prompt.tsx";
import { getOpenAIConfig, SOVUNYA_CONSTANTS } from "./openai-config.tsx";

export async function handleAIChatRequest(body: any): Promise<{ answer?: string; error?: string; status?: number }> {
  const { question, lessonTitle, lessonContent, moduleTitle } = body;

  if (!question || question.trim().length < SOVUNYA_CONSTANTS.MIN_QUESTION_LENGTH) {
    return { error: "Вопрос слишком короткий", status: 400 };
  }

  if (question.length > SOVUNYA_CONSTANTS.MAX_QUESTION_LENGTH) {
    return { error: "Вопрос слишком длинный (максимум 500 символов)", status: 400 };
  }

  try {
    const config = getOpenAIConfig();
  } catch (err) {
    return { error: "OpenAI API key not configured", status: 500 };
  }

  const config = getOpenAIConfig();

  try {
    // Use enhanced Sovunya personality
    const systemPrompt = getSovunyaSystemPrompt(moduleTitle, lessonTitle, lessonContent);

    const response = await fetchWithRetry(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: config.defaultParams.temperature,
        max_tokens: config.defaultParams.maxTokens,
        presence_penalty: config.defaultParams.presencePenalty,
        frequency_penalty: config.defaultParams.frequencyPenalty,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`OpenAI API error in ai-chat: ${response.status} ${errText}`);
      return { error: `OpenAI API error: ${response.status}`, status: 500 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { error: "Empty response from OpenAI", status: 500 };
    }

    return { answer: content };
  } catch (err) {
    console.log(`Error in ai-chat handler: ${err}`);
    return { error: `Error in ai-chat: ${err}`, status: 500 };
  }
}
