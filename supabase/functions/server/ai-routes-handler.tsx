/**
 * ai-routes-handler.tsx
 * AI endpoints: evaluate-case, ai-chat, openai-proxy, pm-coach,
 * notebook-review, notebook-xp, interview-evaluate, resume-review
 */
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { fetchWithRetry } from "./ai-helpers.tsx";
import { handleAIChatRequest } from "./ai-chat-handler.tsx";

// Helper: call OpenAI with automatic Pipedream→direct fallback
async function callOpenAI(apiKey: string, payload: object): Promise<string> {
  const PIPEDREAM_URL = "https://eov7cjgjy9fs5pi.m.pipedream.net";
  const OPENAI_URL   = "https://api.openai.com/v1/chat/completions";

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
  const body = JSON.stringify(payload);

  try {
    const res = await fetch(PIPEDREAM_URL, { method: "POST", headers, body });
    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
      console.log(`Pipedream returned empty content, falling back to direct OpenAI`);
    } else {
      const errText = await res.text().catch(() => "");
      console.log(`Pipedream returned ${res.status}: ${errText} — falling back to direct OpenAI`);
    }
  } catch (err) {
    console.log(`Pipedream fetch error: ${err} — falling back to direct OpenAI`);
  }

  const res2 = await fetch(OPENAI_URL, { method: "POST", headers, body });
  if (!res2.ok) {
    const errText = await res2.text().catch(() => "");
    console.log(`Direct OpenAI error ${res2.status}: ${errText}`);
    throw new Error(`OpenAI API error: ${res2.status}`);
  }
  const data2 = await res2.json();
  const content2 = data2.choices?.[0]?.message?.content;
  if (!content2) throw new Error("Empty response from OpenAI");
  return content2;
}

export function registerAIRoutes(app: Hono) {

  // AI Case Evaluation
  app.post("/make-server-279b4dfa/evaluate-case", async (c) => {
    try {
      const body = await c.req.json();
      const { caseTitle, caseContext, caseTask, userAnswer, hints } = body;

      if (!userAnswer || userAnswer.trim().length < 50) {
        return c.json({ error: "Ответ слишком короткий (минимум 50 символов)" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

      const systemPrompt = `Ты — эксперт-оценщик кейсов по продакт-менеджменту. Ты оцениваешь ответы студентов на продуктовые кейсы.

Оцени ответ студента по следующим критериям (каждый от 1 до 10):
1. **Структура и логика** — насколько ответ структурирован, последователен и логичен
2. **Глубина анализа** — насколько глубоко студент проанализировал проблему, учёл контекст
3. **Продуктовый подход** — использование продуктовых фреймворков (JTBD, HADI, RICE, MVP и т.д.)
4. **Практичность решения** — насколько предложенное решение реализуемо и конкретно
5. **Метрики и оценка результата** — определены ли метрики успеха и способы оценки

Дай общую оценку от 1 до 10 и развёрнутый фидбек на русском языке.

Формат ответа — строго JSON:
{
  "overallScore": число от 1 до 10,
  "criteria": {
    "structure": { "score": число, "comment": "краткий комментарий" },
    "depth": { "score": число, "comment": "краткий комментарий" },
    "productApproach": { "score": число, "comment": "краткий комментарий" },
    "practicality": { "score": число, "comment": "краткий комментарий" },
    "metrics": { "score": число, "comment": "кратки комментарий" }
  },
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2", "что улучшить 3"],
  "summary": "Общий вывод 2-3 предложения"
}`;

      const userPrompt = `**Кейс: ${caseTitle}**

**Контекст:**
${caseContext}

**Задание:**
${caseTask}

${hints && hints.length > 0 ? `**Подсказки для оценки:**\n${hints.join('\n')}` : ''}

**Ответ студента:**
${userAnswer}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`OpenAI API error: ${response.status} ${errText}`);
        return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return c.json({ error: "Empty response from OpenAI" }, 500);

      const evaluation = JSON.parse(content);
      return c.json({ evaluation });
    } catch (err) {
      console.log(`Error evaluating case: ${err}`);
      return c.json({ error: `Error evaluating case: ${err}` }, 500);
    }
  });

  // AI Chat Assistant — uses Sovunya integration from ai-chat-handler.tsx
  app.post("/make-server-279b4dfa/ai-chat", async (c) => {
    try {
      const body = await c.req.json();
      const result = await handleAIChatRequest(body);
      if (result.error) {
        return c.json({ error: result.error }, (result.status || 500) as any);
      }
      return c.json({ answer: result.answer });
    } catch (err) {
      console.log(`Error in ai-chat: ${err}`);
      return c.json({ error: `Error in ai-chat: ${err}` }, 500);
    }
  });

  // OpenAI Proxy endpoint
  app.post("/make-server-279b4dfa/openai-proxy", async (c) => {
    try {
      const body = await c.req.json();
      const { prompt } = body;

      if (!prompt || String(prompt).trim().length < 3) {
        return c.json({ error: "Prompt слишком короткий" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

      const text = await callOpenAI(OPENAI_API_KEY, {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Ты — AI-ассистент курса по продакт-менеджменту. Отвечай на русском языке. Давай полезные, конкретные ответы с примерами. Отвечай кратко и по делу (3-6 абзацев максимум). Используй продуктовые фреймворки (JTBD, HADI, RICE, TAM/SAM/SOM и т.д.) где уместно.",
          },
          { role: "user", content: String(prompt).trim() },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return c.json({ text });
    } catch (err) {
      console.log(`Error in openai-proxy: ${err}`);
      return c.json({ error: `Error in openai-proxy: ${err}` }, 500);
    }
  });

  // PM-Coach: Socratic Case Analysis
  app.post("/make-server-279b4dfa/pm-coach", async (c) => {
    try {
      const body = await c.req.json();
      const { messages, userProduct, userChallenge, mode, pmLevel } = body;

      if (!messages || !Array.isArray(messages)) {
        return c.json({ error: "Missing messages array in pm-coach request" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured for pm-coach" }, 500);

      const levelContext = pmLevel === "senior"
        ? "Пользователь — Senior PM: задавай глубокие стратегические вопросы, используй advanced-фреймворки (системное мышление, second-order effects, opportunity cost)."
        : pmLevel === "middle"
        ? "Пользователь — Middle PM: помоги структурировать мышление, подтолкни к использованию фреймворков (JTBD, RICE, CJM, Impact Mapping)."
        : "Пользователь — Junior PM: будь терпеливым наставником, объясняй фреймворки, помоги перейти от «что делать» к «почему и как».";

      const systemPrompt = `Ты — PM-Коуч, эксперт по продакт-менеджменту, работающий по сократовскому методу. Ты НЕ даёшь прямые ответы — ты задаёшь вопросы, которые подталкивают пользователя к самостоятельным выводам.

${levelContext}

ПРАВИЛА:
1. Задавай ОДИН конкретный вопрос за раз (не список вопросов).
2. Каждый вопрос должен быть связан с предыдущим ответом пользователя — показывай, что ты слушаешь.
3. Используй продуктовые фреймворки (JTBD, CJM, RICE, Impact Mapping, Pirate Metrics, North Star Metric, Lean Canvas) — но вплетай их в вопросы, а не перечисляй.
4. Если пользователь застрял — дай мягкую подсказку через наводящий вопрос.
5. Через 4-6 раундов вопросов, когда контекст достаточен — предложи перейти к анализу (скажи: "У меня достаточно контекста для анализа. Хотите, я подготовлю структурированный разбор?").
6. Отвечай на русском языке, пиши кратко (2-4 предложения + вопрос).
7. Будь тёплым, но профессиональным. Не используй markdown-заголовки.
8. Начинай с уточнения: кто пользователь продукта, какая проблема, как выглядит текущая ситуация.

${mode === "analyze" ? `
РЕЖИМ АНАЛИЗА: Пользователь попросил финальный разбор. На основе всего разговора сгенерируй структурированный анализ в формате JSON:
{
  "summary": "Краткое резюме кейса (2-3 предложения)",
  "situation": "Описание текущей ситуации продукта",
  "keyInsights": ["инсайт 1", "инсайт 2", "инсайт 3"],
  "frameworks": [
    { "name": "Название фреймворка", "application": "Как именно применить к этому кейсу" }
  ],
  "actionPlan": [
    { "step": 1, "action": "Конкретное действие", "metric": "Как измерить результат", "timeframe": "Когда" }
  ],
  "risks": ["риск 1", "риск 2"],
  "northStarMetric": "Предлагаемая North Star метрика для этого продукта",
  "recommendedModules": ["Модуль или тема из курса PM, которая поможет углубиться"]
}
Отвечай ТОЛЬКО валидным JSON, без дополнительного текста.` : ""}
${mode === "roleplay" ? `
РЕЖИМ РОЛЕВОЙ ИГРЫ: Ты теперь играешь роль стейкхолдера. Пользователь защищает свое продуктовое решение перед тобой.
Роль: ${body.stakeholderRole || "CEO"}
Характер стейкхолдера по ролям:
- CEO: Фокус на бизнес-результатах, ROI, стратегии роста, конкурентном преимуществе. Задаёшь жёсткие вопросы про unit-экономику, масштабируемость, time-to-market. Нетерпелив — хочешь конкретику.
- CTO: Фокус на техническом долге, масштабируемости, архитектуре, сроках разработки. Скептичен к фичам без чёткого ТЗ. Спрашиваешь про trade-offs и edge cases.
- Investor: Фокус на TAM/SAM/SOM, unit-экономике, burnout rate, product-market fit, competitive moat. Хочешь понять 10x potential. Сравниваешь с портфельными компаниями.
- Head_of_Sales: Фокус на том, как продать, какой ICP, conversion rate, sales cycle, objections handling. Прагматичен — спрашиваешь "а клиент за это заплатит?"

ПРАВИЛА ролевой игры:
1. Оставайся полностью в роли стейкхолдера. Не выходи из роли.
2. Задавай 1-2 острых вопроса за раз, основываясь на ответе пользователя.
3. Если ответ слабый — дави, требуй конкретику, цифры, доказательства.
4. Если ответ сильный — признай, но копай глубже в новом направлении.
5. Будь реалистичным — именно так говорят стейкхолдеры на реальных встречах.
6. Пиши кратко (2-4 предложения), на русском.
7. НЕ используй markdown-заголовки.` : ""}
${mode === "artifact" ? `
РЕЖИМ АРТЕФАКТА: Сгенерируй заполненный продуктовый артефакт на основе всего разговора. Тип артефакта: ${body.artifactType || "lean_canvas"}.

Форматы артефактов (отвечай ТОЛЬКО валидным JSON):

Если тип "lean_canvas":
{
  "type": "lean_canvas",
  "title": "Lean Canvas — [Название продукта]",
  "cells": {
    "problem": ["Проблема 1", "Проблема 2", "Проблема 3"],
    "customerSegments": ["Сегмент 1", "Сегмент 2"],
    "uniqueValueProposition": "Уникальное ценностное предложение",
    "solution": ["Решение 1", "Решение 2", "Решение 3"],
    "channels": ["Канал 1", "Канал 2"],
    "revenueStreams": ["Источник дохода 1", "Источник дохода 2"],
    "costStructure": ["Статья расходов 1", "Статья расходов 2"],
    "keyMetrics": ["Метрика 1", "Метрика 2", "Метрика 3"],
    "unfairAdvantage": "Нечестное преимущество"
  }
}

Если тип "rice":
{
  "type": "rice",
  "title": "RICE-приоритизация",
  "items": [
    { "feature": "Название фичи", "reach": число, "impact": число от 0.25 до 3, "confidence": число от 0.5 до 1, "effort": число, "score": число, "rationale": "Обоснование" }
  ]
}

Если тип "cjm":
{
  "type": "cjm",
  "title": "Customer Journey Map — [Персона]",
  "persona": "Описание персоны",
  "stages": [
    { "name": "Название этапа", "actions": ["Действие 1"], "thoughts": ["Мысль 1"], "emotions": "positive|neutral|negative", "painPoints": ["Боль 1"], "opportunities": ["Возможность 1"] }
  ]
}

Если тип "impact_map":
{
  "type": "impact_map",
  "title": "Impact Map",
  "goal": "Бизнес-цель",
  "actors": [
    { "name": "Актор", "impacts": [{ "impact": "Воздействие", "deliverables": ["Фича/инициатива 1"] }] }
  ]
}

Отвечай ТОЛЬКО валидным JSON.` : ""}
Контекст продукта пользователя: ${userProduct || "не указан"}
Вызов/задача: ${userChallenge || "не указана"}`;

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: apiMessages,
          temperature: (mode === "analyze" || mode === "artifact") ? 0.4 : 0.75,
          max_tokens: (mode === "analyze" || mode === "artifact") ? 2500 : 800,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`OpenAI API error in pm-coach: ${response.status} ${errText}`);
        return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return c.json({ error: "Empty response from OpenAI in pm-coach" }, 500);

      if (mode === "analyze" || mode === "artifact") {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (mode === "artifact") return c.json({ type: "artifact", artifact: parsed });
            return c.json({ type: "analysis", analysis: parsed });
          }
        } catch (parseErr) {
          console.log(`JSON parse error in pm-coach ${mode}: ${parseErr}`);
        }
        return c.json({ type: "message", content });
      }

      return c.json({ type: "message", content });
    } catch (err) {
      console.log(`Error in pm-coach: ${err}`);
      return c.json({ error: `Error in pm-coach: ${err}` }, 500);
    }
  });

  // Save PM-Coach session
  app.post("/make-server-279b4dfa/pm-coach/save", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, coachSession } = body;
      if (!sessionId || !coachSession) {
        return c.json({ error: "Missing sessionId or coachSession in pm-coach save" }, 400);
      }
      const key = `pm-coach:${sessionId}:${coachSession.id}`;
      await kv.set(key, coachSession);
      return c.json({ success: true });
    } catch (err) {
      console.log(`Error saving pm-coach session: ${err}`);
      return c.json({ error: `Error saving pm-coach session: ${err}` }, 500);
    }
  });

  // Get PM-Coach sessions
  app.get("/make-server-279b4dfa/pm-coach/sessions/:sessionId", async (c) => {
    try {
      const sessionId = c.req.param("sessionId");
      const results = await kv.getByPrefix(`pm-coach:${sessionId}:`);
      const sessions = results.map((r: any) => r.value).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return c.json({ sessions });
    } catch (err) {
      console.log(`Error getting pm-coach sessions: ${err}`);
      return c.json({ error: `Error getting pm-coach sessions: ${err}` }, 500);
    }
  });

  // Notebook Review: AI checks practice notebook entries for a module
  app.post("/make-server-279b4dfa/notebook-review", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, moduleId, moduleTitle, entries } = body;

      if (!sessionId || !moduleId || !entries || !Array.isArray(entries) || entries.length === 0) {
        return c.json({ error: "Missing required fields: sessionId, moduleId, entries" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured for notebook-review" }, 500);

      const entriesText = entries.map((e: any, i: number) =>
        `--- Задание ${i + 1} (${e.lessonTitle}) ---\nЗадача: ${e.taskText}\nОтвет студента: ${e.answer}\n`
      ).join("\n");

      const systemPrompt = `Ты — преподаватель курса по продакт-менеджменту. Тебе переданы ответы студента на практические задания из модуля "${moduleTitle}".

Твоя задача:
1. Оцени качество каждого ответа в контексте курса
2. Определи сильные стороны работы
3. Укажи конкретные области для улучшения
4. Назначь бонус/штраф в каштанах (XP):
   - Отличная работа (глубокие ответы, примеры, фреймворки): +15 до +30 🌰
   - Хорошая работа (корректно, но без глубины): +5 до +15 🌰
   - Поверхностные ответы (слишком коротко, нет конкретики): 0 🌰
   - Некорректные ответы (ошибки в понимании): -5 до -10 🌰

ВАЖНО: Отвечай строго в JSON формате:
{
  "feedback": "Общая оценка работы студента (2-3 предложения)",
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2"],
  "xpAdjustment": 15
}

Будь конкретен, упоминай конкретные задания. XP — целое число от -10 до +30.`;

      const response = await fetchWithRetry(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: entriesText },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.log(`OpenAI API error in notebook-review: ${response.status} ${errText}`);
        return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const xp = Math.max(-10, Math.min(30, parseInt(parsed.xpAdjustment) || 0));

          const reviewKey = `notebook-review:${sessionId}:${moduleId}`;
          await kv.set(reviewKey, {
            feedback: parsed.feedback || "",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
            xpAdjustment: xp,
            reviewedAt: new Date().toISOString(),
            entriesCount: entries.length,
          });

          return c.json({
            feedback: parsed.feedback || "",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
            xpAdjustment: xp,
          });
        }
      } catch (parseErr) {
        console.log(`Error parsing notebook-review JSON: ${parseErr}, content: ${content}`);
      }

      return c.json({ feedback: content.slice(0, 500), strengths: [], improvements: [], xpAdjustment: 5 });
    } catch (err) {
      console.log(`Error in notebook-review: ${err}`);
      return c.json({ error: `Error in notebook-review: ${err}` }, 500);
    }
  });

  // Save notebook XP adjustment
  app.post("/make-server-279b4dfa/notebook-xp", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, moduleId, xpAdjustment } = body;

      if (!sessionId || !moduleId || xpAdjustment === undefined) {
        return c.json({ error: "Missing required fields for notebook-xp" }, 400);
      }

      const xpKey = `xp:${sessionId}`;
      const xpData = await kv.get(xpKey) || { total: 0, log: [] };
      xpData.total += xpAdjustment;
      if (xpData.total < 0) xpData.total = 0;
      xpData.log.push({ source: "notebook-review", moduleId, amount: xpAdjustment, timestamp: new Date().toISOString() });
      if (xpData.log.length > 200) xpData.log = xpData.log.slice(-200);
      await kv.set(xpKey, xpData);

      return c.json({ success: true, newTotal: xpData.total });
    } catch (err) {
      console.log(`Error saving notebook XP: ${err}`);
      return c.json({ error: `Error saving notebook XP: ${err}` }, 500);
    }
  });

  // PM Interview Simulator: AI Evaluation
  app.post("/make-server-279b4dfa/interview-evaluate", async (c) => {
    try {
      const body = await c.req.json();
      const { questionType, question, answer, rubric, timeUsed } = body;

      if (!answer || answer.trim().length < 30) {
        return c.json({ error: "Ответ слишком короткий (минимум 30 символов)" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

      const systemPrompt = `Ты — опытный интервьюер на позицию Product Manager в FAANG-компании. Оцени ответ кандидата на вопрос типа "${questionType}".

Критерии оценки: ${rubric}

Кандидат потратил ${Math.round((timeUsed || 0) / 60)} минут на ответ.

Формат ответа — строго JSON:
{
  "overallScore": число от 1 до 10,
  "criteria": {
    "structure": { "score": число, "comment": "комментарий" },
    "depth": { "score": число, "comment": "комментарий" },
    "frameworks": { "score": число, "comment": "комментарий" },
    "communication": { "score": число, "comment": "комментарий" }
  },
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2", "что улучшить 3"],
  "summary": "Общий вывод 1-2 предложения",
  "sampleAnswer": "Краткий пример сильного ответа (3-4 предложения)"
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Вопрос: ${question}\n\nОтвет кандидата:\n${answer}` },
          ],
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`OpenAI API error in interview-evaluate: ${response.status} ${errText}`);
        return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return c.json({ error: "Empty response from OpenAI" }, 500);

      const evaluation = JSON.parse(content);
      return c.json({ evaluation });
    } catch (err) {
      console.log(`Error in interview-evaluate: ${err}`);
      return c.json({ error: `Error in interview-evaluate: ${err}` }, 500);
    }
  });

  // AI Resume Review
  app.post("/make-server-279b4dfa/resume-review", async (c) => {
    try {
      const body = await c.req.json();
      const { resumeText, targetRole } = body;

      if (!resumeText || resumeText.trim().length < 100) {
        return c.json({ error: "Резюме слишком короткое (минимум 100 символов)" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

      const systemPrompt = `Ты — HR-эксперт и карьерный коуч, специализирующийся на найме Product Manager'ов. Проанализируй резюме кандидата на позицию "${targetRole || "Product Manager"}".

Оцени по следующим аспектам:
1. Насколько резюме соответствует целевой позиции PM
2. Есть ли метрики и конкретные результаты (не "улучшил", а "увеличил конверсию на 15%")
3. Используются ли PM-фреймворки и терминология
4. Структура и читаемость
5. Что важное отсутствует для данной позиции

Формат ответа — строго JSON:
{
  "overallScore": число от 1 до 10,
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2", "что улучшить 3"],
  "missingSkills": ["навык 1", "навык 2"],
  "rewriteSuggestions": [
    { "original": "исходная формулировка из резюме", "improved": "улучшенная формулировка с метриками" }
  ],
  "summary": "Общий вывод 2-3 предложения"
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Целевая позиция: ${targetRole}\n\nРезюме:\n${resumeText.slice(0, 5000)}` },
          ],
          temperature: 0.4,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`OpenAI API error in resume-review: ${response.status} ${errText}`);
        return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return c.json({ error: "Empty response from OpenAI" }, 500);

      const review = JSON.parse(content);
      return c.json({ review });
    } catch (err) {
      console.log(`Error in resume-review: ${err}`);
      return c.json({ error: `Error in resume-review: ${err}` }, 500);
    }
  });
}