import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { fetchWithRetry } from "./ai-helpers.tsx";
import { handleAIChatRequest } from "./ai-chat-handler.tsx";
import { checkOpenAIHealth, SOVUNYA_CONSTANTS } from "./openai-config.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Password", "x-site-key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-279b4dfa/health", (c) => {
  return c.json({ status: "ok" });
});

// OpenAI health check endpoint
app.get("/make-server-279b4dfa/health/openai", async (c) => {
  const health = await checkOpenAIHealth();
  return c.json({ 
    openai: health,
    sovunya: {
      name: SOVUNYA_CONSTANTS.NAME,
      emoji: SOVUNYA_CONSTANTS.EMOJI,
      role: SOVUNYA_CONSTANTS.ROLE,
      ready: health.ok
    }
  });
});

// Save exam result
app.post("/make-server-279b4dfa/exam-result", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, score, total, percentage, date, caseAnswers } = body;
    
    if (!sessionId || score === undefined || total === undefined) {
      return c.json({ error: "Missing required fields: sessionId, score, total" }, 400);
    }
    
    const key = `exam-result:${sessionId}`;
    
    // Get existing best result
    const existing = await kv.get(key);
    
    const newResult: any = { score, total, percentage, date, lastAttempt: date, attempts: 1 };
    
    // Save case answers separately
    if (caseAnswers && Object.keys(caseAnswers).length > 0) {
      const caseKey = `exam-cases:${sessionId}:${Date.now()}`;
      await kv.set(caseKey, { caseAnswers, date, score, percentage });
    }
    
    if (existing && existing.percentage > percentage) {
      existing.lastAttempt = date;
      existing.attempts = (existing.attempts || 1) + 1;
      await kv.set(key, existing);
      return c.json({ result: existing, isNewBest: false });
    }
    
    newResult.attempts = existing ? (existing.attempts || 1) + 1 : 1;
    await kv.set(key, newResult);
    return c.json({ result: newResult, isNewBest: true });
  } catch (err) {
    console.log(`Error saving exam result: ${err}`);
    return c.json({ error: `Error saving exam result: ${err}` }, 500);
  }
});

// Get exam result
app.get("/make-server-279b4dfa/exam-result/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const key = `exam-result:${sessionId}`;
    const result = await kv.get(key);
    return c.json({ result: result || null });
  } catch (err) {
    console.log(`Error getting exam result: ${err}`);
    return c.json({ error: `Error getting exam result: ${err}` }, 500);
  }
});

// Webhook proxy - forward events to external webhook
app.post("/make-server-279b4dfa/webhook", async (c) => {
  try {
    const body = await c.req.json();
    const WEBHOOK_URL = "https://eo92yp4mfsz07g8.m.pipedream.net";
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, serverTimestamp: new Date().toISOString() }),
    });
    return c.json({ success: true, status: res.status });
  } catch (err) {
    console.log(`Error forwarding webhook: ${err}`);
    return c.json({ error: `Error forwarding webhook: ${err}` }, 500);
  }
});

// AI Case Evaluation endpoint
app.post("/make-server-279b4dfa/evaluate-case", async (c) => {
  try {
    const body = await c.req.json();
    const { caseTitle, caseContext, caseTask, userAnswer, hints } = body;

    if (!userAnswer || userAnswer.trim().length < 50) {
      return c.json({ error: "Ответ слишком короткий (минимум 50 символов)" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

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
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
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
    
    if (!content) {
      return c.json({ error: "Empty response from OpenAI" }, 500);
    }

    const evaluation = JSON.parse(content);
    
    return c.json({ evaluation });
  } catch (err) {
    console.log(`Error evaluating case: ${err}`);
    return c.json({ error: `Error evaluating case: ${err}` }, 500);
  }
});

// AI Chat Assistant endpoint
app.post("/make-server-279b4dfa/ai-chat", async (c) => {
  try {
    const body = await c.req.json();
    const { question, lessonTitle, lessonContent, moduleTitle } = body;

    if (!question || question.trim().length < 3) {
      return c.json({ error: "Вопрос слишком короткий" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const systemPrompt = `Ты — AI-ассистент курса по продакт-менеджменту. Отвечай на русском языке. Давай полезные, конкретные ответы с примерами. Используй знания из текущего урока, если они релевантны вопросу.

Текущий модуль: ${moduleTitle || "Не указан"}
Текущий урок: ${lessonTitle || "Не указан"}
${lessonContent ? `\nКонтекст урока (сокращённо):\n${lessonContent.slice(0, 3000)}` : ""}

Правила:
- Отвечай кратко и по делу (3-6 абзацев максимум)
- Используй продуктовые фреймворки (JTBD, HADI, RICE, TAM/SAM/SOM и т.д.) где уместно
- Приводи примеры из реальных компаний
- Если вопрос не связан с продакт-менеджментом, вежливо перенаправь к теме курса`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`OpenAI API error in ai-chat: ${response.status} ${errText}`);
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return c.json({ error: "Empty response from OpenAI" }, 500);
    }

    return c.json({ answer: content });
  } catch (err) {
    console.log(`Error in ai-chat: ${err}`);
    return c.json({ error: `Error in ai-chat: ${err}` }, 500);
  }
});

// Save/Get notes
app.post("/make-server-279b4dfa/notes", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, lessonId, note } = body;
    if (!sessionId || !lessonId) {
      return c.json({ error: "Missing sessionId or lessonId" }, 400);
    }
    const key = `notes:${sessionId}:${lessonId}`;
    await kv.set(key, { note, updatedAt: new Date().toISOString() });
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error saving note: ${err}`);
    return c.json({ error: `Error saving note: ${err}` }, 500);
  }
});

app.get("/make-server-279b4dfa/notes/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const results = await kv.getByPrefix(`notes:${sessionId}:`);
    const notes: Record<string, string> = {};
    for (const item of results) {
      const lessonId = item.key.replace(`notes:${sessionId}:`, "");
      notes[lessonId] = item.value?.note || "";
    }
    return c.json({ notes });
  } catch (err) {
    console.log(`Error getting notes: ${err}`);
    return c.json({ error: `Error getting notes: ${err}` }, 500);
  }
});

// Save lesson rating
app.post("/make-server-279b4dfa/rating", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, lessonId, rating } = body;
    if (!sessionId || !lessonId || !rating) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    const key = `rating:${sessionId}:${lessonId}`;
    await kv.set(key, { rating, date: new Date().toISOString() });
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error saving rating: ${err}`);
    return c.json({ error: `Error saving rating: ${err}` }, 500);
  }
});

// ===== Practice Tasks Progress =====

// Save practice task completion for a lesson
app.post("/make-server-279b4dfa/practice", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, lessonId, completed, total } = body;

    if (!sessionId || !lessonId || !Array.isArray(completed) || total === undefined) {
      return c.json({ error: "Missing required fields: sessionId, lessonId, completed (array), total" }, 400);
    }

    const key = `practice:${sessionId}:${lessonId}`;
    const now = new Date().toISOString();

    const existing = await kv.get(key);
    const prevCount = existing?.completed?.length || 0;
    const newCount = completed.length;

    await kv.set(key, {
      completed,
      total,
      percentage: Math.round((newCount / total) * 100),
      updatedAt: now,
      firstSavedAt: existing?.firstSavedAt || now,
    });

    // Award XP for newly completed tasks (delta)
    const newlyDone = Math.max(0, newCount - prevCount);
    let xpAwarded = 0;
    if (newlyDone > 0) {
      const xpPerTask = 5;
      xpAwarded = newlyDone * xpPerTask;
      // Bonus XP for completing all tasks
      const allDoneBonus = newCount === total ? 15 : 0;
      xpAwarded += allDoneBonus;

      const xpKey = `xp:${sessionId}`;
      const xpData = await kv.get(xpKey) || { total: 0, log: [] };
      xpData.total += xpAwarded;
      xpData.log.push({
        source: "practice",
        lessonId,
        tasksCompleted: newlyDone,
        allDone: newCount === total,
        amount: xpAwarded,
        timestamp: now,
      });
      if (xpData.log.length > 200) {
        xpData.log = xpData.log.slice(-200);
      }
      await kv.set(xpKey, xpData);
    }

    // Update aggregate practice stats
    const aggKey = `practice-agg:${sessionId}`;
    const agg = await kv.get(aggKey) || { lessonsWithPractice: 0, totalTasks: 0, totalCompleted: 0, fullyCompletedLessons: 0 };
    // Recalculate: remove old counts, add new
    if (existing) {
      agg.totalCompleted -= prevCount;
      if (prevCount === existing.total) agg.fullyCompletedLessons -= 1;
    } else {
      agg.lessonsWithPractice += 1;
      agg.totalTasks += total;
    }
    agg.totalCompleted += newCount;
    if (newCount === total) agg.fullyCompletedLessons += 1;
    agg.updatedAt = now;
    await kv.set(aggKey, agg);

    return c.json({
      success: true,
      xpAwarded,
      allDone: newCount === total,
      stats: agg,
    });
  } catch (err) {
    console.log(`Error saving practice progress: ${err}`);
    return c.json({ error: `Error saving practice progress: ${err}` }, 500);
  }
});

// Get practice progress for a specific lesson
app.get("/make-server-279b4dfa/practice/:sessionId/:lessonId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const lessonId = c.req.param("lessonId");
    const key = `practice:${sessionId}:${lessonId}`;
    const data = await kv.get(key);
    return c.json({ practice: data || null });
  } catch (err) {
    console.log(`Error getting practice progress: ${err}`);
    return c.json({ error: `Error getting practice progress: ${err}` }, 500);
  }
});

// Get all practice progress for a session
app.get("/make-server-279b4dfa/practice/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const results = await kv.getByPrefix(`practice:${sessionId}:`);
    const practices: Record<string, any> = {};
    for (const item of results) {
      const lessonId = item.key.replace(`practice:${sessionId}:`, "");
      practices[lessonId] = item.value;
    }
    // Also get aggregate stats
    const agg = await kv.get(`practice-agg:${sessionId}`);
    return c.json({ practices, stats: agg || null });
  } catch (err) {
    console.log(`Error getting all practice progress: ${err}`);
    return c.json({ error: `Error getting all practice progress: ${err}` }, 500);
  }
});

// ===== PEER LEARNING: Comments & Discussions =====

// Post a comment on a lesson
app.post("/make-server-279b4dfa/comments", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, lessonId, text, userName, type } = body;

    if (!sessionId || !lessonId || !text || text.trim().length < 2) {
      return c.json({ error: "Missing required fields or comment too short" }, 400);
    }

    const commentId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const comment = {
      id: commentId,
      sessionId,
      lessonId,
      text: text.trim().slice(0, 1000),
      userName: userName || "Аноним",
      type: type || "comment", // "comment" | "insight" | "question"
      likes: 0,
      likedBy: [],
      createdAt: now,
    };

    const key = `comment:${lessonId}:${commentId}`;
    await kv.set(key, comment);

    // Update comment count
    const countKey = `comment-count:${lessonId}`;
    const count = await kv.get(countKey) || { total: 0 };
    count.total += 1;
    await kv.set(countKey, count);

    return c.json({ comment, success: true });
  } catch (err) {
    console.log(`Error posting comment: ${err}`);
    return c.json({ error: `Error posting comment: ${err}` }, 500);
  }
});

// Get comments for a lesson
app.get("/make-server-279b4dfa/comments/:lessonId", async (c) => {
  try {
    const lessonId = c.req.param("lessonId");
    const results = await kv.getByPrefix(`comment:${lessonId}:`);
    const comments = results
      .map((item: any) => item.value)
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Chronological order (oldest first) — chat-style
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    return c.json({ comments });
  } catch (err) {
    console.log(`Error getting comments: ${err}`);
    return c.json({ error: `Error getting comments: ${err}` }, 500);
  }
});

// Like a comment
app.post("/make-server-279b4dfa/comments/like", async (c) => {
  try {
    const body = await c.req.json();
    const { lessonId, commentId, sessionId } = body;
    if (!lessonId || !commentId || !sessionId) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    const key = `comment:${lessonId}:${commentId}`;
    const comment = await kv.get(key);
    if (!comment) return c.json({ error: "Comment not found" }, 404);

    const likedBy = comment.likedBy || [];
    if (likedBy.includes(sessionId)) {
      // Unlike
      comment.likedBy = likedBy.filter((id: string) => id !== sessionId);
      comment.likes = Math.max(0, (comment.likes || 0) - 1);
    } else {
      // Like
      comment.likedBy.push(sessionId);
      comment.likes = (comment.likes || 0) + 1;
    }
    await kv.set(key, comment);
    return c.json({ likes: comment.likes, liked: comment.likedBy.includes(sessionId) });
  } catch (err) {
    console.log(`Error liking comment: ${err}`);
    return c.json({ error: `Error liking comment: ${err}` }, 500);
  }
});

// Get quiz stats for social proof ("X% answered correctly")
app.get("/make-server-279b4dfa/quiz-stats/:lessonId", async (c) => {
  try {
    const lessonId = c.req.param("lessonId");
    const key = `quiz-stats:${lessonId}`;
    const stats = await kv.get(key) || { attempts: 0, correctRate: 0 };
    return c.json({ stats });
  } catch (err) {
    console.log(`Error getting quiz stats: ${err}`);
    return c.json({ error: `Error getting quiz stats: ${err}` }, 500);
  }
});

// Save quiz stats
app.post("/make-server-279b4dfa/quiz-stats", async (c) => {
  try {
    const body = await c.req.json();
    const { lessonId, correctRate } = body;
    if (!lessonId || correctRate === undefined) {
      return c.json({ error: "Missing fields" }, 400);
    }
    const key = `quiz-stats:${lessonId}`;
    const existing = await kv.get(key) || { attempts: 0, totalCorrectRate: 0 };
    existing.attempts += 1;
    existing.totalCorrectRate = (existing.totalCorrectRate || 0) + correctRate;
    existing.correctRate = Math.round(existing.totalCorrectRate / existing.attempts);
    await kv.set(key, existing);
    return c.json({ stats: existing });
  } catch (err) {
    console.log(`Error saving quiz stats: ${err}`);
    return c.json({ error: `Error saving quiz stats: ${err}` }, 500);
  }
});

// ===== CAPSTONE PROJECTS: AI Evaluation =====

app.post("/make-server-279b4dfa/capstone/evaluate", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, projectId: projId, projectTitle, fields, criteria } = body;

    if (!sessionId || !projId || !fields || Object.keys(fields).length === 0) {
      return c.json({ error: "Missing required fields for capstone evaluation" }, 400);
    }

    // Check all field values have some content
    const fieldValues = Object.values(fields) as string[];
    const totalLength = fieldValues.join("").length;
    if (totalLength < 100) {
      return c.json({ error: "Заполните все поля более подробно (минимум 100 символов суммарно)" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const criteriaList = (criteria || [
      "Понимание проблемы и сегмента",
      "Продуктовый подход и фреймворки",
      "Метрики успеха",
      "Практичность и реализуемость",
      "Глубина анализа"
    ]).join(", ");

    const systemPrompt = `Ты — эксперт по продакт-менеджменту. Оцени capstone-проект студента по курсу PM.

Критерии оценки (каждый от 0 до 5): ${criteriaList}

Формат ответа — строго JSON:
{
  "overallScore": число от 0 до 5 (среднее),
  "criteria": {
    "criterion_1": { "score": число, "label": "название критерия", "comment": "фидбэк" },
    "criterion_2": { "score": число, "label": "название критерия", "comment": "фидбэк" },
    "criterion_3": { "score": число, "label": "название критерия", "comment": "фидбэк" },
    "criterion_4": { "score": число, "label": "название критерия", "comment": "фидбэк" },
    "criterion_5": { "score": число, "label": "название критерия", "comment": "фидбэк" }
  },
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2", "что улучшить 3"],
  "summary": "Общий вывод 2-3 предложения на русском"
}`;

    const fieldsText = Object.entries(fields)
      .map(([key, val]) => `**${key}:**\n${val}`)
      .join("\n\n");

    const userPrompt = `**Проект: ${projectTitle}**\n\n${fieldsText}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`OpenAI API error in capstone evaluation: ${response.status} ${errText}`);
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return c.json({ error: "Empty response from OpenAI" }, 500);
    }

    const evaluation = JSON.parse(content);

    // Save result to KV
    const resultKey = `capstone:${sessionId}:${projId}`;
    const now = new Date().toISOString();
    const existing = await kv.get(resultKey);
    const attempts = existing?.attempts ? existing.attempts + 1 : 1;
    await kv.set(resultKey, {
      fields,
      evaluation,
      attempts,
      lastSubmittedAt: now,
      bestScore: Math.max(evaluation.overallScore, existing?.bestScore || 0),
    });

    // Award XP for capstone completion
    const xpKey = `xp:${sessionId}`;
    const xpData = await kv.get(xpKey) || { total: 0, log: [] };
    const xpAmount = attempts === 1 ? 50 : 20; // First time = 50 XP, subsequent = 20 XP
    xpData.total += xpAmount;
    xpData.log.push({
      source: "capstone",
      projectId: projId,
      amount: xpAmount,
      score: evaluation.overallScore,
      timestamp: now,
    });
    if (xpData.log.length > 200) xpData.log = xpData.log.slice(-200);
    await kv.set(xpKey, xpData);

    return c.json({ evaluation, xpAwarded: xpAmount, attempts });
  } catch (err) {
    console.log(`Error evaluating capstone: ${err}`);
    return c.json({ error: `Error evaluating capstone: ${err}` }, 500);
  }
});

// Get capstone results for a session
app.get("/make-server-279b4dfa/capstone/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const results = await kv.getByPrefix(`capstone:${sessionId}:`);
    const projects: Record<string, any> = {};
    for (const item of results) {
      const projId = item.key.replace(`capstone:${sessionId}:`, "");
      projects[projId] = item.value;
    }
    return c.json({ projects });
  } catch (err) {
    console.log(`Error getting capstone results: ${err}`);
    return c.json({ error: `Error getting capstone results: ${err}` }, 500);
  }
});

// Interactive progress sync endpoint
app.post("/make-server-279b4dfa/interactive-progress", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, blockId, blockType, lessonId, result, xpAmount } = body;
    if (!sessionId || !blockId) {
      return c.json({ error: "Missing sessionId or blockId" }, 400);
    }
    const key = `interactive:${sessionId}`;
    const data = await kv.get(key) || { blocks: {} };
    data.blocks[blockId] = {
      completed: true,
      blockType,
      lessonId,
      result,
      xp: xpAmount || 0,
      ts: new Date().toISOString(),
    };
    await kv.set(key, data);
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error saving interactive progress: ${err}`);
    return c.json({ error: `Error saving interactive progress: ${err}` }, 500);
  }
});

app.get("/make-server-279b4dfa/interactive-progress", async (c) => {
  try {
    const sessionId = c.req.query("sessionId");
    if (!sessionId) return c.json({ error: "Missing sessionId" }, 400);
    const key = `interactive:${sessionId}`;
    const data = await kv.get(key) || { blocks: {} };
    return c.json(data);
  } catch (err) {
    console.log(`Error getting interactive progress: ${err}`);
    return c.json({ error: `Error getting interactive progress: ${err}` }, 500);
  }
});

// ===== PM-Coach: Socratic Case Analysis =====
app.post("/make-server-279b4dfa/pm-coach", async (c) => {
  try {
    const body = await c.req.json();
    const { messages, userProduct, userChallenge, mode, pmLevel } = body;

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Missing messages array in pm-coach request" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured for pm-coach" }, 500);
    }

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
  "northStarMetric": "Пред��агаемая North Star метрика для этого продукта",
  "recommendedModules": ["Модул�� или тема из курса PM, которая поможет углубиться"]
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
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
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

    if (!content) {
      return c.json({ error: "Empty response from OpenAI in pm-coach" }, 500);
    }

    // If analysis or artifact mode, try to parse JSON
    if (mode === "analyze" || mode === "artifact") {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (mode === "artifact") {
            return c.json({ type: "artifact", artifact: parsed });
          }
          return c.json({ type: "analysis", analysis: parsed });
        }
      } catch (parseErr) {
        console.log(`JSON parse error in pm-coach ${mode}: ${parseErr}`);
      }
      // Fallback: return as text
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

// ===== Notebook Review: AI checks practice notebook entries for a module =====
app.post("/make-server-279b4dfa/notebook-review", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, moduleId, moduleTitle, entries } = body;

    if (!sessionId || !moduleId || !entries || !Array.isArray(entries) || entries.length === 0) {
      return c.json({ error: "Missing required fields: sessionId, moduleId, entries" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured for notebook-review" }, 500);
    }

    // Build the content from notebook entries
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
   - Некорректные отв��ты (ошибки в понимании): -5 до -10 🌰

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
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

    // Parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Clamp xpAdjustment
        const xp = Math.max(-10, Math.min(30, parseInt(parsed.xpAdjustment) || 0));

        // Save review to KV
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

    // Fallback if JSON parsing fails
    return c.json({
      feedback: content.slice(0, 500),
      strengths: [],
      improvements: [],
      xpAdjustment: 5,
    });
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
    xpData.log.push({
      source: "notebook-review",
      moduleId,
      amount: xpAdjustment,
      timestamp: new Date().toISOString(),
    });
    if (xpData.log.length > 200) {
      xpData.log = xpData.log.slice(-200);
    }
    await kv.set(xpKey, xpData);

    return c.json({ success: true, newTotal: xpData.total });
  } catch (err) {
    console.log(`Error saving notebook XP: ${err}`);
    return c.json({ error: `Error saving notebook XP: ${err}` }, 500);
  }
});

// ===== PM Interview Simulator: AI Evaluation =====
app.post("/make-server-279b4dfa/interview-evaluate", async (c) => {
  try {
    const body = await c.req.json();
    const { questionType, question, answer, rubric, timeUsed } = body;

    if (!answer || answer.trim().length < 30) {
      return c.json({ error: "Ответ слишком короткий (минимум 30 символов)" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

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

// ===== AI Resume Review =====
app.post("/make-server-279b4dfa/resume-review", async (c) => {
  try {
    const body = await c.req.json();
    const { resumeText, targetRole } = body;

    if (!resumeText || resumeText.trim().length < 100) {
      return c.json({ error: "Резюме слишком короткое (минимум 100 символов)" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

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

// ===== Certificate Verification =====
app.post("/make-server-279b4dfa/certificate/save", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, userName, completedLessons, totalLessons, examScore, completedAt } = body;
    if (!sessionId || !userName) {
      return c.json({ error: "Missing sessionId or userName" }, 400);
    }
    const certId = `cert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const certData = {
      certId,
      userName,
      completedLessons,
      totalLessons,
      examScore,
      completedAt: completedAt || new Date().toISOString(),
      issuedAt: new Date().toISOString(),
    };
    await kv.set(`certificate:${certId}`, certData);
    await kv.set(`certificate-by-session:${sessionId}`, certData);
    return c.json({ certId, success: true });
  } catch (err) {
    console.log(`Error saving certificate: ${err}`);
    return c.json({ error: `Error saving certificate: ${err}` }, 500);
  }
});

app.get("/make-server-279b4dfa/certificate/verify/:certId", async (c) => {
  try {
    const certId = c.req.param("certId");
    const data = await kv.get(`certificate:${certId}`);
    if (!data) return c.json({ valid: false, error: "Certificate not found" }, 404);
    return c.json({ valid: true, certificate: data });
  } catch (err) {
    console.log(`Error verifying certificate: ${err}`);
    return c.json({ error: `Error verifying certificate: ${err}` }, 500);
  }
});

// ===== TTS Audio for lessons =====
app.post("/make-server-279b4dfa/tts", async (c) => {
  try {
    const body = await c.req.json();
    const { text } = body;
    if (!text || text.trim().length < 10) {
      return c.json({ error: "Text too short for TTS" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    // Truncate to ~4000 chars for TTS limits
    const truncated = text.slice(0, 4000);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: truncated,
        voice: "nova",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`OpenAI TTS error: ${response.status} ${errText}`);
      return c.json({ error: `TTS error: ${response.status}` }, 500);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    return c.json({ audio: base64, format: "mp3" });
  } catch (err) {
    console.log(`Error in TTS: ${err}`);
    return c.json({ error: `Error in TTS: ${err}` }, 500);
  }
});

// ===== Document text extraction (PDF/DOCX) =====
app.post("/make-server-279b4dfa/extract-document", async (c) => {
  try {
    const body = await c.req.json();
    const { fileBase64, fileName } = body;

    if (!fileBase64 || !fileName) {
      return c.json({ error: "Missing fileBase64 or fileName" }, 400);
    }

    const ext = fileName.toLowerCase().split(".").pop();
    let extractedText = "";

    if (ext === "txt") {
      // Plain text — decode directly
      const binaryStr = atob(fileBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      extractedText = textDecoder.decode(bytes);
    } else if (ext === "pdf" || ext === "docx" || ext === "doc") {
      // Use OpenAI to extract text from binary documents (PDF/DOCX/DOC)
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) {
        return c.json({ error: "OpenAI API key not configured for document extraction" }, 500);
      }

      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        doc: "application/msword",
      };
      const mimeType = mimeMap[ext] || "application/octet-stream";

      // Use OpenAI file input API (GPT-4o-mini supports PDF/DOCX natively)
      const oaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "file",
                  file: {
                    filename: fileName,
                    file_data: `data:${mimeType};base64,${fileBase64}`,
                  },
                },
                {
                  type: "text",
                  text: "Извлеки весь текст из этого документа (резюме/CV). Верни ТОЛЬКО чистый текст, сохраняя структуру: разделы, заголовки, списки. Не добавляй комментариев, не меняй содержание. Если текст на русском — оставь на русском. Если на английском — оставь на английском.",
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (oaiResponse.ok) {
        const oaiData = await oaiResponse.json();
        extractedText = oaiData.choices?.[0]?.message?.content || "";
      } else {
        const errText = await oaiResponse.text();
        console.log(`OpenAI file extraction error (${oaiResponse.status}): ${errText}`);

        // Fallback: basic text extraction from raw bytes
        const binaryStr = atob(fileBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = textDecoder.decode(bytes);

        if (ext === "pdf") {
          const textParts: string[] = [];
          const parenRegex = /\(([^)]+)\)/g;
          let match;
          while ((match = parenRegex.exec(rawText)) !== null) {
            const t = match[1].trim();
            if (t.length > 1 && /[a-zA-Zа-яА-ЯёЁ0-9]/.test(t)) {
              textParts.push(t.replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, " "));
            }
          }
          extractedText = textParts.join(" ").replace(/\s+/g, " ").trim();
        } else if (ext === "docx") {
          const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
          const parts: string[] = [];
          let m;
          while ((m = wtRegex.exec(rawText)) !== null) {
            if (m[1].trim()) parts.push(m[1]);
          }
          extractedText = parts.join(" ");
        } else {
          const readable = rawText.match(/[\x20-\x7E\u0400-\u04FF]{3,}/g) || [];
          extractedText = readable.join(" ").replace(/\s+/g, " ").trim();
        }

        // Try OpenAI cleanup if we got some text from fallback
        if (extractedText.length > 20) {
          const cleanupRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{
                role: "user",
                content: `Вот фрагменты текста, извлечённые из документа (резюме). Текст может содержать мусор и артефакты. Восстанови чистый текст резюме, убери мусор, сохрани структуру. Если текст невозможно восстановить, ответь "EXTRACTION_FAILED".\n\nТекст:\n${extractedText.slice(0, 3000)}`
              }],
              temperature: 0.1, max_tokens: 3000,
            }),
          });
          if (cleanupRes.ok) {
            const cleanData = await cleanupRes.json();
            const cleaned = cleanData.choices?.[0]?.message?.content || "";
            if (!cleaned.includes("EXTRACTION_FAILED") && cleaned.length > 20) {
              extractedText = cleaned;
            }
          }
        }
      }
    } else {
      return c.json({ error: `Неподдерживаемый формат файла: .${ext}` }, 400);
    }

    extractedText = extractedText.replace(/\s+/g, " ").trim().slice(0, 8000);

    if (extractedText.length < 20) {
      return c.json({
        error: "Не удалось извлечь текст из файла. Попробуйте скопировать текст резюме вручную.",
        extractedText
      }, 400);
    }

    return c.json({ text: extractedText, charCount: extractedText.length });
  } catch (err) {
    console.log(`Error extracting document: ${err}`);
    return c.json({ error: `Error extracting document: ${err}` }, 500);
  }
});

// AI Competency Gap Analysis endpoint
app.post("/make-server-279b4dfa/competency-analysis", async (c) => {
  try {
    const body = await c.req.json();
    const { scores, roleName, roleScores, gaps, completionPct } = body;

    if (!scores || !roleName || !gaps) {
      return c.json({ error: "Missing required fields: scores, roleName, gaps" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    // Check cache first
    const cacheKey = `competency-ai:${roleName}:${Object.values(scores).join(",")}`;
    const cached = await kv.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 6 * 60 * 60 * 1000) {
      console.log(`Competency analysis cache hit for role: ${roleName}`);
      return c.json({ analysis: cached.analysis, cached: true });
    }

    const axisLabels: Record<string, string> = {
      strategy: "Стратегия", analytics: "Аналитика", ux_design: "UX/Дизайн",
      technical: "Техническая грамотность", growth: "Growth",
      communication: "Коммуникация", leadership: "Лидерство", execution: "Execution"
    };

    const scoresSummary = Object.entries(scores)
      .map(([k, v]) => `${axisLabels[k] || k}: ${v}%`)
      .join(", ");

    const gapsSummary = gaps.map((g: any) =>
      `${axisLabels[g.axis] || g.axis}: текущий ${g.currentScore}% -> целевой ${g.targetScore}% (gap ${g.gap}), незавершённые модули: ${g.modules.map((m: any) => `${m.title} (${m.completedPct}%)`).join(", ")}`
    ).join("\n");

    const systemPrompt = `Ты — AI-коуч по продакт-менеджменту. Анализируешь компетенции студента PM-курса и даёшь персонализированные рекомендации.

От��ечай строго JSON:
{
  "summary": "1-2 предложения — общая оценка профиля",
  "priorityActions": [
    { "axis": "ключ оси", "action": "конкретное действие", "impact": "высокий|средний", "timeEstimate": "~X часов" }
  ],
  "learningPath": "порядок изучения модулей для максимального роста (2-3 предложения)",
  "strengths": "что уже хорошо и как это использовать (1-2 предложения)",
  "careerTip": "карьерный совет для выбранной роли (1-2 предложения)"
}

Максимум 5 priorityActions. Советы должны быть конкретными и actionable.`;

    const userPrompt = `**Профиль студента PM-курса:**
Прогресс: ${completionPct}% курса пройдено.
Целевая роль: ${roleName}

**Текущие компетенции:**
${scoresSummary}

**Целевой профиль (${roleName}):**
${Object.entries(roleScores || {}).map(([k, v]) => `${axisLabels[k] || k}: ${v}%`).join(", ")}

**Обнаруженные gap-ы:**
${gapsSummary || "Нет значительных gap-ов"}

Дай персонализированный анализ и план действий.`;

    const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`OpenAI API error in competency-analysis: ${response.status} ${errText}`);
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return c.json({ error: "Empty response from OpenAI in competency-analysis" }, 500);
    }

    const analysis = JSON.parse(content);

    // Cache for 6 hours
    await kv.set(cacheKey, { analysis, timestamp: Date.now() }).catch(() => {});

    return c.json({ analysis, cached: false });
  } catch (err) {
    console.log(`Error in competency-analysis: ${err}`);
    return c.json({ error: `Error in competency-analysis: ${err}` }, 500);
  }
});

// ===== Auth: Signup =====
app.post("/make-server-279b4dfa/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    if (!email || !password) return c.json({ error: "Missing email or password" }, 400);
    if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { name: name || email.split("@")[0] },
      email_confirm: true,
    });
    if (error) { console.log(`Signup error: ${error.message}`); return c.json({ error: error.message }, 400); }
    return c.json({ user: { id: data.user?.id, email: data.user?.email } });
  } catch (err) {
    console.log(`Error in signup: ${err}`);
    return c.json({ error: `Signup error: ${err}` }, 500);
  }
});

// ===== Auth: Link session to user =====
app.post("/make-server-279b4dfa/link-session", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, userId } = body;
    if (!sessionId || !userId) return c.json({ error: "Missing sessionId or userId" }, 400);
    await kv.set(`user-session:${userId}`, { sessionId, linkedAt: new Date().toISOString() });
    await kv.set(`session-user:${sessionId}`, { userId, linkedAt: new Date().toISOString() });
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Error linking session: ${err}` }, 500); }
});

// ===== Auth: Get session for user =====
app.get("/make-server-279b4dfa/user-session/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const mapping = await kv.get(`user-session:${userId}`);
    return c.json({ mapping: mapping || null });
  } catch (err) { return c.json({ error: `Error getting user session: ${err}` }, 500); }
});

// ===== Auth: Forgot password (admin reset) =====
app.post("/make-server-279b4dfa/forgot-password", async (c) => {
  try {
    const body = await c.req.json();
    const { email, newPassword } = body;
    if (!email || !newPassword) return c.json({ error: "Missing email or newPassword" }, 400);
    if (newPassword.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) { console.log(`Error listing users for password reset: ${listErr.message}`); return c.json({ error: `Error finding user: ${listErr.message}` }, 500); }
    const user = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) return c.json({ error: "User with this email not found" }, 404);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateErr) { console.log(`Error updating password: ${updateErr.message}`); return c.json({ error: `Error updating password: ${updateErr.message}` }, 500); }
    return c.json({ success: true });
  } catch (err) { console.log(`Error in forgot-password: ${err}`); return c.json({ error: `Error in forgot-password: ${err}` }, 500); }
});

// ===== User Progress: Save to Supabase =====
app.post("/make-server-279b4dfa/user-progress/save", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const { completedLessons, bookmarks, examScore, sessionId } = body;
    await kv.set(`user-progress:${user.id}`, {
      completedLessons: Array.isArray(completedLessons) ? completedLessons : [],
      bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
      examScore: examScore ?? null,
      sessionId: sessionId || null,
      updatedAt: new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch (err) { console.log(`Error saving user progress: ${err}`); return c.json({ error: `Error saving user progress: ${err}` }, 500); }
});

// ===== User Progress: Load from Supabase =====
app.get("/make-server-279b4dfa/user-progress/:userId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    if (user.id !== userId) return c.json({ error: "Forbidden" }, 403);
    const progress = await kv.get(`user-progress:${userId}`);
    return c.json({ progress: progress || null });
  } catch (err) { console.log(`Error loading user progress: ${err}`); return c.json({ error: `Error loading user progress: ${err}` }, 500); }
});

// ===== Admin: Get all users =====
const ADMIN_PASSWORD = "rediska";

app.get("/make-server-279b4dfa/admin/users", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) { console.log(`Error listing users: ${listErr.message}`); return c.json({ error: `Error listing users: ${listErr.message}` }, 500); }
    // Fetch Postgres user_access rows for all users in one query
    const { data: pgRows } = await supabase
      .from("user_access")
      .select("user_id, plan, status, expires_at, updated_at");
    const pgByUserId: Record<string, { plan: string; status: string; expires_at: string | null; updated_at: string | null }> = {};
    for (const row of (pgRows || []) as any[]) {
      pgByUserId[row.user_id] = { plan: row.plan, status: row.status, expires_at: row.expires_at, updated_at: row.updated_at };
    }

    const users = await Promise.all((listData?.users || []).map(async (u: any) => {
      const blocked = await kv.get(`blocked-user:${u.id}`);
      const progress = await kv.get(`user-progress:${u.id}`);
      const accessData = await kv.get(`user-access:${u.id}`);
      const pgRow = pgByUserId[u.id];

      // Merge: KV OR Postgres — whichever gives paid access
      let accessLevel = "free";
      let accessExpiresAt: string | null = null;
      let accessGrantedAt: string | null = null;

      // Check KV first (admin manual grants)
      if (accessData?.level === "lifetime") {
        accessLevel = "lifetime";
        accessGrantedAt = accessData?.grantedAt || null;
      } else if ((accessData?.level === "monthly" || accessData?.level === "month") && accessData?.expiresAt) {
        accessLevel = new Date(accessData.expiresAt) < new Date() ? "free" : "monthly";
        accessExpiresAt = accessData?.expiresAt || null;
        accessGrantedAt = accessData?.grantedAt || null;
      }

      // Check Postgres (YooKassa/super-task payments) — overrides KV if paid
      if (pgRow && pgRow.status === "active") {
        if (pgRow.plan === "lifetime") {
          accessLevel = "lifetime";
          accessGrantedAt = pgRow.updated_at || accessGrantedAt;
        } else if ((pgRow.plan === "month" || pgRow.plan === "monthly")) {
          const notExpired = !pgRow.expires_at || new Date(pgRow.expires_at) > new Date();
          if (notExpired && accessLevel !== "lifetime") {
            accessLevel = "monthly";
            accessExpiresAt = pgRow.expires_at;
            accessGrantedAt = pgRow.updated_at || accessGrantedAt;
          }
        }
      }

      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.email?.split("@")[0] || "-",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        isBlocked: blocked?.blocked === true,
        completedLessons: progress?.completedLessons?.length || 0,
        examScore: progress?.examScore || null,
        accessLevel,
        accessExpiresAt,
        accessGrantedAt,
      };
    }));
    return c.json({ users });
  } catch (err) { console.log(`Error in admin/users: ${err}`); return c.json({ error: `Error in admin/users: ${err}` }, 500); }
});

// ===== Admin: Set user access level =====
app.post("/make-server-279b4dfa/admin/users/:userId/set-access", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { level } = body;
    const now = new Date();
    let expiresAt: string | null = null;
    if (level === "monthly") {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
      expiresAt = exp.toISOString();
    }

    // Write to KV (legacy / fast path)
    await kv.set(`user-access:${userId}`, { level, grantedAt: now.toISOString(), expiresAt });

    // Write to Postgres user_access (same table super-task uses after YooKassa payment)
    // Plan values: "lifetime" | "month" (canonical) | "free"
    try {
      const { createClient } = await import("npm:@supabase/supabase-js@2");
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const pgPlan = level === "monthly" ? "month" : level; // normalize: "monthly" → "month"
      const pgStatus = level === "free" ? "inactive" : "active";
      await supabase.from("user_access").upsert(
        { user_id: userId, plan: pgPlan, status: pgStatus, expires_at: expiresAt, updated_at: now.toISOString() },
        { onConflict: "user_id" }
      );
      console.log(`[set-access] KV + Postgres updated: userId="${userId}" level="${level}"`);
    } catch (pgErr) {
      console.log(`[set-access] Postgres write failed (KV succeeded): ${pgErr}`);
    }

    return c.json({ success: true, userId, level, expiresAt });
  } catch (err) { return c.json({ error: `Error setting user access: ${err}` }, 500); }
});

// ===== Get user access level (authenticated) =====
// Sources of truth (in priority order):
//   1. Postgres table `user_access` — written by super-task after YooKassa payment
//      canonical plan values: "month" | "lifetime"
//   2. KV store — written by Robokassa / manual grant flows
//      plan/level values: "monthly" | "lifetime" (legacy) or "month" (newer)
//
// Unified return values: level = "month" | "lifetime" | "free"
// Frontend maps "month" and "lifetime" → active access; "free" → paywall.
app.get("/make-server-279b4dfa/user-access/:userId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);

    const paramUserId = c.req.param("userId"); // userId from URL
    const authUserId  = user.id;               // userId from JWT

    // ── [1] User ID consistency: JWT vs URL param ─────────────────────────
    console.log(`[user-access] [ID-CHECK] authUserId (JWT)   = "${authUserId}"`);
    console.log(`[user-access] [ID-CHECK] paramUserId (URL)  = "${paramUserId}"`);

    if (authUserId !== paramUserId) {
      console.log(`[user-access] [ID-MISMATCH] JWT="${authUserId}" ≠ param="${paramUserId}" → 403`);
      return c.json({
        error: "user mismatch: access belongs to another user",
        authUserId,
        paramUserId,
      }, 403);
    }

    const userId = authUserId; // confirmed: JWT == param
    console.log(`[user-access] [ID-CHECK] ✅ userId confirmed = "${userId}"`);

    // Helper: always echo resolvedUserId so the frontend can cross-check
    const reply = (payload: Record<string, unknown>, status = 200) =>
      c.json({ ...payload, resolvedUserId: userId }, status as any);

    // ── [2] Postgres user_access (written by super-task / YooKassa) ───────
    try {
      const { data: pgRow, error: pgErr } = await supabase
        .from("user_access")
        .select("user_id, plan, status, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (pgErr) {
        console.log(`[user-access] PG error: ${pgErr.message} code=${pgErr.code}`);
      } else if (pgRow) {
        const { user_id: pgUserId, plan, status, expires_at } =
          pgRow as { user_id: string; plan: string; status: string; expires_at: string | null };

        // Cross-check PG row user_id vs authenticated user
        console.log(`[user-access] [ID-CHECK] PG row user_id = "${pgUserId}"`);
        if (pgUserId !== userId) {
          console.log(`[user-access] [ID-MISMATCH] PG row belongs to "${pgUserId}" ≠ auth "${userId}"`);
          return reply({
            level: "free", expiresAt: null, source: "postgres",
            error: "user mismatch: access belongs to another user",
            pgUserId,
          });
        }

        console.log(`[user-access] PG row: plan="${plan}" status="${status}" expires_at="${expires_at}"`);

        if (status !== "active") {
          console.log(`[user-access] PG: status="${status}" ≠ active → free`);
          return reply({ level: "free", expiresAt: null, source: "postgres" });
        }

        if (plan === "lifetime") {
          console.log(`[user-access] PG: ✅ lifetime active → GRANTED`);
          return reply({ level: "lifetime", expiresAt: null, source: "postgres" });
        }

        if (plan === "month" || plan === "monthly") {
          if (expires_at === null) {
            console.log(`[user-access] PG: ✅ plan="${plan}" expires_at=null → GRANTED (no expiry set by super-task)`);
            return reply({ level: "month", expiresAt: null, source: "postgres" });
          }
          const isExpired = new Date(expires_at) <= new Date();
          if (isExpired) {
            console.log(`[user-access] PG: plan="${plan}" expired at ${expires_at} → free`);
            return reply({ level: "free", expiresAt: expires_at, source: "postgres", reason: "expired" });
          }
          console.log(`[user-access] PG: ✅ plan="${plan}" valid until ${expires_at} → GRANTED`);
          return reply({ level: "month", expiresAt: expires_at, source: "postgres" });
        }

        console.log(`[user-access] PG: unknown plan="${plan}" → free`);
        return reply({ level: "free", expiresAt: null, source: "postgres", reason: `unknown plan: ${plan}` });
      } else {
        console.log(`[user-access] PG: no row for user_id="${userId}" → checking KV`);
      }
    } catch (pgEx) {
      console.log(`[user-access] PG exception:`, pgEx);
    }

    // ── [3] KV fallback (Robokassa / manual grants) ───────────────────────
    const accessData = await kv.get(`user-access:${userId}`);
    console.log(`[user-access] KV[user-access:${userId}]:`, JSON.stringify(accessData));

    if (!accessData) {
      console.log(`[user-access] KV: no entry → free`);
      return reply({ level: "free", expiresAt: null, source: "none" });
    }

    const kvLevel: string       = accessData.level    || "";
    const kvExpires: string | null = accessData.expiresAt || null;
    const kvUserId: string      = accessData.userId   || "";

    // Cross-check userId stored in KV (if present)
    if (kvUserId && kvUserId !== userId) {
      console.log(`[user-access] [ID-MISMATCH] KV entry userId="${kvUserId}" ≠ auth "${userId}"`);
      return reply({
        level: "free", expiresAt: null, source: "kv",
        error: "user mismatch: access belongs to another user",
        kvUserId,
      });
    }

    if (kvLevel === "lifetime") {
      console.log(`[user-access] KV: ✅ lifetime → GRANTED`);
      return reply({ level: "lifetime", expiresAt: null, source: "kv" });
    }

    if (kvLevel === "month" || kvLevel === "monthly") {
      if (kvExpires !== null && new Date(kvExpires) <= new Date()) {
        console.log(`[user-access] KV: "${kvLevel}" expired at ${kvExpires} → free`);
        return reply({ level: "free", expiresAt: kvExpires, source: "kv", reason: "expired" });
      }
      console.log(`[user-access] KV: ✅ "${kvLevel}" active → GRANTED`);
      return reply({ level: "month", expiresAt: kvExpires, source: "kv" });
    }

    console.log(`[user-access] KV: unrecognised level="${kvLevel}" → free`);
    return reply({ level: "free", expiresAt: null, source: "kv", reason: `unknown level: ${kvLevel}` });
  } catch (err) {
    console.log(`[user-access] unexpected error:`, err);
    return c.json({ error: `Error getting user access: ${err}` }, 500);
  }
});

// ===== My Access: lookup by userId + site-key, NO JWT validation =====
// Принимает ?userId=UUID, проверяет x-site-key (Authorization = anon key, валидируется gateway).
// Читает Postgres (service role, обходит RLS) + KV с несколькими паттернами ключей.
// Не вызывает auth.getUser() — устраняет проблему холодного старта.
app.get("/make-server-279b4dfa/my-access", async (c) => {
  try {
    const siteKey = c.req.header("x-site-key");
    if (siteKey !== "super_secret_12345") {
      console.log(`[my-access] bad site key: "${siteKey}"`);
      return c.json({ level: "free", source: "bad-key" }, 401);
    }

    const userId = c.req.query("userId") || c.req.query("user_id") || "";
    if (!userId) {
      console.log("[my-access] no userId param → free");
      return c.json({ level: "free", source: "no-userid" });
    }
    console.log(`[my-access] userId="${userId}"`);

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Вспомогательная функция: преобразовать строку Postgres → уровень доступа
    const parseRow = (row: Record<string, unknown>): string | null => {
      console.log(`[my-access] PG row raw:`, JSON.stringify(row));
      // Гибкие имена столбцов: plan / type / access_type / access_level
      const plan   = String(row.plan ?? row.type ?? row.access_type ?? row.access_level ?? "").toLowerCase().trim();
      // Гибкий статус: status / is_active / active
      const active = row.status === "active" || row.is_active === true || row.active === true;
      // expires_at / expired_at / valid_until
      const exp    = (row.expires_at ?? row.expired_at ?? row.valid_until ?? null) as string | null;
      console.log(`[my-access] PG parsed: plan="${plan}" active=${active} exp="${exp}"`);

      if (!active) return null;
      if (plan === "lifetime" || plan === "forever" || plan === "full") return "lifetime";
      if (plan === "month" || plan === "monthly" || plan === "paid") {
        const ok = !exp || new Date(exp) > new Date();
        return ok ? "monthly" : null;
      }
      // Любой активный план → открываем как lifetime (не узнаём тип)
      if (plan && plan !== "free") return "lifetime";
      return null;
    };

    // 1. Postgres: по user_id (UUID)
    {
      const { data: pgRow, error: pgErr } = await supabase
        .from("user_access")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (pgErr) {
        console.log(`[my-access] PG(user_id) error: ${pgErr.message} code=${pgErr.code}`);
      } else if (pgRow) {
        const level = parseRow(pgRow as Record<string, unknown>);
        if (level === "lifetime") return c.json({ level: "lifetime", userId, source: "postgres-user_id" });
        if (level === "monthly")  return c.json({ level: "monthly",  userId, source: "postgres-user_id" });
        // Строка есть, но доступ истёк или free
        console.log(`[my-access] PG row found but no paid access → KV`);
      } else {
        console.log(`[my-access] no PG row by user_id → try id column`);
      }
    }

    // 2. Postgres: по id (если super-task пишет в колонку "id" а не "user_id")
    {
      const { data: pgRow, error: pgErr } = await supabase
        .from("user_access")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!pgErr && pgRow) {
        const level = parseRow(pgRow as Record<string, unknown>);
        if (level === "lifetime") return c.json({ level: "lifetime", userId, source: "postgres-id" });
        if (level === "monthly")  return c.json({ level: "monthly",  userId, source: "postgres-id" });
        console.log(`[my-access] PG(id) row found but no paid access`);
      }
    }

    // 3. KV с несколькими возможными паттернами ключей
    const kvKeys = [
      `user-access:${userId}`,  // наш стандарт
      `access:${userId}`,       // альтернатива
      `paid:${userId}`,         // ещё вариант
    ];
    for (const key of kvKeys) {
      const kvData = await kv.get(key);
      if (!kvData) continue;
      console.log(`[my-access] KV["${key}"]:`, JSON.stringify(kvData));
      const lvl = String(kvData.level ?? kvData.plan ?? kvData.type ?? "").toLowerCase();
      if (lvl === "lifetime") return c.json({ level: "lifetime", userId, source: `kv:${key}` });
      if (lvl === "month" || lvl === "monthly") {
        const exp = kvData.expiresAt ?? kvData.expires_at ?? null;
        if (!exp || new Date(exp) > new Date()) return c.json({ level: "monthly", userId, source: `kv:${key}` });
      }
    }

    console.log(`[my-access] no paid access found → free`);
    return c.json({ level: "free", userId, source: "none" });
  } catch (err) {
    console.log(`[my-access] error:`, err);
    return c.json({ level: "free", source: "error", error: String(err) });
  }
});

// ===== Admin: Debug access for a specific userId (shows raw Postgres + KV) =====
app.get("/make-server-279b4dfa/admin/debug-access/:userId", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);

    const userId = c.req.param("userId");
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // PG: by user_id
    const { data: pgByUserId, error: pgErr1 } = await supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle();
    // PG: by id
    const { data: pgById, error: pgErr2 } = await supabase.from("user_access").select("*").eq("id", userId).maybeSingle();
    // All rows (for inspection)
    const { data: allRows } = await supabase.from("user_access").select("*").limit(20);

    // KV
    const kvKeys = [`user-access:${userId}`, `access:${userId}`, `paid:${userId}`];
    const kvResults: Record<string, unknown> = {};
    for (const k of kvKeys) { kvResults[k] = await kv.get(k); }

    return c.json({
      userId,
      postgres: {
        byUserId: pgByUserId ?? null,
        byUserIdError: pgErr1?.message ?? null,
        byId: pgById ?? null,
        byIdError: pgErr2?.message ?? null,
        allRows: allRows ?? [],
      },
      kv: kvResults,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ===== Admin: Toggle user access =====
app.post("/make-server-279b4dfa/admin/users/:userId/toggle-access", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { blocked } = body;
    await kv.set(`blocked-user:${userId}`, { blocked: !!blocked, updatedAt: new Date().toISOString() });
    return c.json({ success: true, userId, blocked: !!blocked });
  } catch (err) { return c.json({ error: `Error toggling user access: ${err}` }, 500); }
});

// ===== Check if user is blocked =====
app.get("/make-server-279b4dfa/check-access/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const blocked = await kv.get(`blocked-user:${userId}`);
    return c.json({ blocked: blocked?.blocked === true });
  } catch (_err) { return c.json({ blocked: false }); }
});

// ===== Admin: Delete user =====
app.delete("/make-server-279b4dfa/admin/users/:userId", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) { console.log(`Error deleting user: ${error.message}`); return c.json({ error: `Error deleting user: ${error.message}` }, 500); }
    await kv.del(`blocked-user:${userId}`);
    await kv.del(`user-access:${userId}`);
    await kv.del(`user-progress:${userId}`);
    await kv.del(`user-modules:${userId}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Error deleting user: ${err}` }, 500); }
});

// ===== Admin: Change user email =====
app.post("/make-server-279b4dfa/admin/users/:userId/change-email", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "Email is required" }, 400);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase.auth.admin.updateUserById(userId, { email });
    if (error) { console.log(`Error changing email: ${error.message}`); return c.json({ error: `Error changing email: ${error.message}` }, 500); }
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Error changing email: ${err}` }, 500); }
});

// ===== Admin: Change user password =====
app.post("/make-server-279b4dfa/admin/users/:userId/change-password", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const { password } = await c.req.json();
    if (!password || password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) { console.log(`Error changing password: ${error.message}`); return c.json({ error: `Error changing password: ${error.message}` }, 500); }
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Error changing password: ${err}` }, 500); }
});

// ===== Admin: Get module overrides for user =====
app.get("/make-server-279b4dfa/admin/users/:userId/modules", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const data = await kv.get(`user-modules:${userId}`);
    return c.json({ blockedModules: data?.blockedModules || [] });
  } catch (err) { return c.json({ error: `Error getting modules: ${err}` }, 500); }
});

// ===== Admin: Set module overrides for user =====
app.post("/make-server-279b4dfa/admin/users/:userId/modules", async (c) => {
  try {
    const adminPass = c.req.header("X-Admin-Password");
    if (adminPass !== ADMIN_PASSWORD) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.param("userId");
    const { blockedModules } = await c.req.json();
    await kv.set(`user-modules:${userId}`, { blockedModules: blockedModules || [], updatedAt: new Date().toISOString() });
    return c.json({ success: true, blockedModules });
  } catch (err) { return c.json({ error: `Error setting modules: ${err}` }, 500); }
});

// ===== ROBOKASSA PAYMENT INTEGRATION =====

// SHA-256 signature for Robokassa (configured in Robokassa account settings)
async function robokassaSign(str: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(str).digest("hex");
}

// Test mode: set ROBOKASSA_IS_TEST=1 in secrets to enable test payments
// In test mode: uses test passwords + adds IsTest=1 to payment URL
const ROBOKASSA_IS_TEST = Deno.env.get("ROBOKASSA_IS_TEST") === "1";

// Robokassa: initialize payment (create order, return payment URL)
app.post("/make-server-279b4dfa/robokassa/init", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, plan, accessToken, appUrl } = body;

    if (!userId || !plan || !accessToken) {
      return c.json({ error: "Missing required fields: userId, plan, accessToken" }, 400);
    }
    if (plan !== "monthly" && plan !== "lifetime") {
      return c.json({ error: "Invalid plan. Must be 'monthly' or 'lifetime'" }, 400);
    }

    // Verify user authentication
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !user) {
      console.log(`Robokassa init: unauthorized. Error: ${authErr?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const ROBOKASSA_LOGIN = Deno.env.get("ROBOKASSA_LOGIN");
    const password1 = ROBOKASSA_IS_TEST
      ? Deno.env.get("ROBOKASSA_TEST_PASSWORD1")
      : Deno.env.get("ROBOKASSA_PASSWORD1");

    if (!ROBOKASSA_LOGIN || !password1) {
      console.log("Robokassa: credentials not configured");
      return c.json({ error: "Robokassa payment is not configured on the server" }, 500);
    }

    // Amounts in RUB. Боевые цены: месяц = 7000, вечный = 9000
    const amount = plan === "lifetime" ? "9000.00" : "7000.00";
    const description = plan === "lifetime"
      ? "Вечный доступ к курсу по продакт-менеджменту"
      : "Доступ к курсу по продакт-менеджменту на 30 дней";

    const invId = Date.now();

    // When OutSumCurrency is used, signature MUST include the currency:
    // SHA256(MerchantLogin:OutSum:InvId:OutSumCurrency:Password1)
    const OUT_SUM_CURRENCY = "USD";
    const signatureValue = await robokassaSign(
      `${ROBOKASSA_LOGIN}:${amount}:${invId}:${OUT_SUM_CURRENCY}:${password1}`
    );

    // Save order to KV
    await kv.set(`robokassa-order:${invId}`, {
      userId,
      plan,
      amount,
      currency: OUT_SUM_CURRENCY,
      status: "pending",
      is_test: ROBOKASSA_IS_TEST,
      createdAt: new Date().toISOString(),
      appUrl: appUrl || "",
      userEmail: user.email || "",
    });
    console.log(`Robokassa: order ${invId} created for user ${userId}, plan=${plan}, isTest=${ROBOKASSA_IS_TEST}`);

    // Callback URLs
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serverBase = `${supabaseUrl}/functions/v1/make-server-279b4dfa`;
    const encodedAppUrl = encodeURIComponent(appUrl || "");

    const paymentUrl = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
    paymentUrl.searchParams.set("MerchantLogin", ROBOKASSA_LOGIN);
    paymentUrl.searchParams.set("OutSum", amount);
    paymentUrl.searchParams.set("OutSumCurrency", OUT_SUM_CURRENCY); // Remove for RUB
    paymentUrl.searchParams.set("InvId", String(invId));
    paymentUrl.searchParams.set("Description", description);
    paymentUrl.searchParams.set("SignatureValue", signatureValue);
    paymentUrl.searchParams.set("ResultURL", `${serverBase}/robokassa/result`);
    paymentUrl.searchParams.set("SuccessURL", `${serverBase}/robokassa/success?appUrl=${encodedAppUrl}&invId=${invId}`);
    paymentUrl.searchParams.set("FailURL", `${serverBase}/robokassa/fail?appUrl=${encodedAppUrl}&invId=${invId}`);
    paymentUrl.searchParams.set("Culture", "ru");
    paymentUrl.searchParams.set("Encoding", "utf-8");
    if (ROBOKASSA_IS_TEST) {
      paymentUrl.searchParams.set("IsTest", "1");
    }

    return c.json({ paymentUrl: paymentUrl.toString(), invId });
  } catch (err) {
    console.log(`Error initializing Robokassa payment: ${err}`);
    return c.json({ error: `Error initializing payment: ${err}` }, 500);
  }
});

// Robokassa: ResultURL — server-to-server payment notification
app.post("/make-server-279b4dfa/robokassa/result", async (c) => {
  try {
    const rawBody = await c.req.text();
    const params = new URLSearchParams(rawBody);

    const outSum = params.get("OutSum") || params.get("out_sum");
    const invId = params.get("InvId") || params.get("inv_id");
    const signatureValue = params.get("SignatureValue") || params.get("signature_value");

    console.log(`Robokassa result: OutSum=${outSum}, InvId=${invId}`);

    if (!outSum || !invId || !signatureValue) {
      console.log(`Robokassa result: missing params. Body: ${rawBody}`);
      return c.text("bad sign", 400);
    }

    // Load order first to know if it was a test payment
    const orderForCheck = await kv.get(`robokassa-order:${invId}`);
    const isTestPayment = orderForCheck?.is_test === true;

    const password2 = isTestPayment
      ? Deno.env.get("ROBOKASSA_TEST_PASSWORD2")
      : Deno.env.get("ROBOKASSA_PASSWORD2");

    if (!password2) {
      console.log(`Robokassa: PASSWORD2 not configured (isTest=${isTestPayment})`);
      return c.text("error: server configuration", 500);
    }

    // Verify: SHA256(OutSum:InvId:Password2)
    const expectedSig = await robokassaSign(`${outSum}:${invId}:${password2}`);
    if (expectedSig.toLowerCase() !== signatureValue.toLowerCase()) {
      console.log(`Robokassa sig mismatch. Expected: ${expectedSig}, Got: ${signatureValue}, isTest=${isTestPayment}`);
      return c.text("bad sign", 400);
    }

    const order = orderForCheck;
    if (!order) {
      console.log(`Robokassa: order not found for invId=${invId}`);
      return c.text("order not found", 404);
    }

    // Idempotent: if already completed just return OK
    if (order.status === "completed") {
      return c.text(`OK${invId}`);
    }

    // Grant access
    const now = new Date();
    let expiresAt: string | null = null;
    if (order.plan === "monthly") {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
      expiresAt = exp.toISOString();
    }

    await kv.set(`user-access:${order.userId}`, {
      level: order.plan,
      grantedAt: now.toISOString(),
      expiresAt,
      paidVia: "robokassa",
      invId: String(invId),
      amount: outSum,
      is_test: isTestPayment,
    });

    await kv.set(`robokassa-order:${invId}`, {
      ...order,
      status: "completed",
      completedAt: now.toISOString(),
      paidOutSum: outSum,
      rawCallback: rawBody,
    });

    console.log(`Robokassa: access granted for user ${order.userId}, plan=${order.plan}, isTest=${isTestPayment}`);
    return c.text(`OK${invId}`);
  } catch (err) {
    console.log(`Error processing Robokassa result: ${err}`);
    return c.text("error", 500);
  }
});

// Robokassa: SuccessURL — user redirect after successful payment
app.get("/make-server-279b4dfa/robokassa/success", (c) => {
  const appUrl = c.req.query("appUrl") || "";
  const invId = c.req.query("invId") || "";
  const decodedAppUrl = appUrl ? decodeURIComponent(appUrl) : "";
  const redirectTo = decodedAppUrl
    ? `${decodedAppUrl}?payment=success&invId=${invId}`
    : `/?payment=success`;

  return c.html(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Оплата прошла успешно</title>
  <meta http-equiv="refresh" content="3;url=${redirectTo}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)}
    .card{background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.08)}
    .emoji{font-size:4rem;margin-bottom:1rem}
    h1{color:#16a34a;font-size:1.5rem;margin-bottom:.75rem}
    p{color:#6b7280;font-size:.9375rem;line-height:1.6;margin-bottom:.75rem}
    a{display:inline-block;margin-top:.5rem;background:#16a34a;color:#fff;padding:.75rem 1.5rem;border-radius:12px;text-decoration:none;font-weight:600}
    a:hover{background:#15803d}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">✅</div>
    <h1>Оплата прошла успешно!</h1>
    <p>Добро пожаловать! Ваш доступ к курсу активирован.<br>Войдите снова, чтобы продолжить обучение.</p>
    <p style="font-size:.8125rem;color:#9ca3af">Вы будете перенаправлены через 3 секунды...</p>
    <a href="${redirectTo}">Перейти в курс →</a>
  </div>
</body>
</html>`);
});

// Robokassa: FailURL — user redirect after failed/cancelled payment
app.get("/make-server-279b4dfa/robokassa/fail", (c) => {
  const appUrl = c.req.query("appUrl") || "";
  const decodedAppUrl = appUrl ? decodeURIComponent(appUrl) : "";
  const redirectTo = decodedAppUrl ? `${decodedAppUrl}?payment=failed` : `/?payment=failed`;

  return c.html(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ошибка оплаты</title>
  <meta http-equiv="refresh" content="4;url=${redirectTo}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)}
    .card{background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.08)}
    .emoji{font-size:4rem;margin-bottom:1rem}
    h1{color:#dc2626;font-size:1.5rem;margin-bottom:.75rem}
    p{color:#6b7280;font-size:.9375rem;line-height:1.6;margin-bottom:.75rem}
    .btn{display:inline-block;margin-top:.5rem;background:#dc2626;color:#fff;padding:.75rem 1.5rem;border-radius:12px;text-decoration:none;font-weight:600}
    .btn:hover{background:#b91c1c}
    .tg{margin-top:1rem;font-size:.875rem;color:#9ca3af}
    .tg a{background:#2AABEE;color:#fff;padding:.25rem .75rem;border-radius:8px;text-decoration:none;font-size:.875rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">❌</div>
    <h1>Оплата не прошла</h1>
    <p>Что-то пошло не так. Попробуйте ещё раз или свяжитесь с администратором.</p>
    <a class="btn" href="${redirectTo}">Вернуться в курс</a>
    <div class="tg">или <a href="https://t.me/ohh_lessya" target="_blank">написать @ohh_lessya</a></div>
  </div>
</body>
</html>`);
});

// Robokassa: check order status (for frontend polling)
app.get("/make-server-279b4dfa/robokassa/order/:invId", async (c) => {
  try {
    const invId = c.req.param("invId");
    const order = await kv.get(`robokassa-order:${invId}`);
    if (!order) return c.json({ error: "Order not found" }, 404);
    return c.json({
      invId,
      status: order.status,
      plan: order.plan,
      is_test: order.is_test || false,
      createdAt: order.createdAt,
      completedAt: order.completedAt || null,
    });
  } catch (err) {
    console.log(`Error getting Robokassa order: ${err}`);
    return c.json({ error: `Error getting order: ${err}` }, 500);
  }
});

// Payment status endpoint (for /payment-success page polling)
app.get("/make-server-279b4dfa/payment/status", async (c) => {
  try {
    const invId = c.req.query("invoiceId");
    if (!invId) return c.json({ status: "unknown" });
    const order = await kv.get(`robokassa-order:${invId}`);
    if (!order) return c.json({ status: "not_found" });
    const mappedStatus =
      order.status === "completed" ? "paid"
      : order.status === "pending" ? "pending"
      : "failed";
    return c.json({
      invoiceId: invId,
      status: mappedStatus,
      plan: order.plan,
      is_test: order.is_test || false,
      createdAt: order.createdAt,
      paidAt: order.completedAt || null,
    });
  } catch (err) {
    console.log(`Error getting payment status: ${err}`);
    return c.json({ error: `Error getting payment status: ${err}` }, 500);
  }
});

// ===== Payment Proxy (CORS fix for super-task) =====
app.post("/make-server-279b4dfa/payment/init", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Payment proxy: forwarding to super-task, plan=", body.plan);

    const res = await fetch("https://bjhsgjsxhvwtuerahuha.supabase.co/functions/v1/super-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-site-key": "super_secret_12345",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    console.log("Payment proxy: super-task responded", res.status, JSON.stringify(data));

    return c.json(data, res.status as any);
  } catch (err) {
    console.log(`Payment proxy error: ${err}`);
    return c.json({ error: `Proxy error: ${err}` }, 500);
  }
});

// ===== YooKassa Payment Integration =====
// YooKassa: initialize payment (create order, return payment URL)
app.post("/make-server-279b4dfa/yookassa/init", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, plan, accessToken, appUrl } = body;

    if (!userId || !plan || !accessToken) {
      return c.json({ error: "Missing required fields: userId, plan, accessToken" }, 400);
    }
    if (plan !== "monthly" && plan !== "lifetime") {
      return c.json({ error: "Invalid plan. Must be 'monthly' or 'lifetime'" }, 400);
    }

    // Verify user authentication
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !user) {
      console.log(`YooKassa init: unauthorized. Error: ${authErr?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const YOOKASSA_SHOP_ID = Deno.env.get("YOOKASSA_SHOP_ID");
    const YOOKASSA_SECRET_KEY = Deno.env.get("YOOKASSA_SECRET_KEY");

    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      console.log("YooKassa: credentials not configured");
      return c.json({ error: "YooKassa payment is not configured on the server" }, 500);
    }

    // Amounts in RUB. Боевые цены: месяц = 7000, вечный = 9000
    const amount = plan === "lifetime" ? "9000.00" : "7000.00";
    const description = plan === "lifetime"
      ? "Вечный доступ к курсу по продакт-менеджменту"
      : "Доступ к курсу по продакт-менеджменту на 30 дней";

    const idempotenceKey = `${userId}-${plan}-${Date.now()}`;

    // Create YooKassa payment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serverBase = `${supabaseUrl}/functions/v1/make-server-279b4dfa`;
    const encodedAppUrl = encodeURIComponent(appUrl || "");

    const paymentPayload = {
      amount: {
        value: amount,
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${serverBase}/yookassa/success?appUrl=${encodedAppUrl}`,
      },
      description,
      metadata: {
        userId,
        plan,
        userEmail: user.email || "",
      },
    };

    const yookassaAuth = btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`);
    const yookassaResponse = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${yookassaAuth}`,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await yookassaResponse.json();

    if (!yookassaResponse.ok || !paymentData.id) {
      console.log(`YooKassa error: ${JSON.stringify(paymentData)}`);
      return c.json({ error: "Не удалось создать платёж в YooKassa" }, 500);
    }

    // Save order to KV
    await kv.set(`yookassa-order:${paymentData.id}`, {
      userId,
      plan,
      amount,
      currency: "RUB",
      status: paymentData.status,
      createdAt: new Date().toISOString(),
      appUrl: appUrl || "",
      userEmail: user.email || "",
      yookassaId: paymentData.id,
    });

    console.log(`YooKassa: payment ${paymentData.id} created for user ${userId}, plan=${plan}`);

    return c.json({
      paymentUrl: paymentData.confirmation.confirmation_url,
      paymentId: paymentData.id,
    });
  } catch (err) {
    console.log(`Error initializing YooKassa payment: ${err}`);
    return c.json({ error: `Error initializing payment: ${err}` }, 500);
  }
});

// YooKassa: webhook notification
app.post("/make-server-279b4dfa/yookassa/webhook", async (c) => {
  try {
    const body = await c.req.json();
    const event = body.event;
    const payment = body.object;

    console.log(`YooKassa webhook: event=${event}, paymentId=${payment?.id}, status=${payment?.status}`);

    if (event !== "payment.succeeded" || !payment || payment.status !== "succeeded") {
      return c.json({ received: true });
    }

    const paymentId = payment.id;
    const order = await kv.get(`yookassa-order:${paymentId}`);

    if (!order) {
      console.log(`YooKassa: order not found for paymentId=${paymentId}`);
      return c.json({ error: "Order not found" }, 404);
    }

    // Idempotent: if already completed just return OK
    if (order.status === "succeeded") {
      return c.json({ received: true });
    }

    // Grant access
    const now = new Date();
    let expiresAt: string | null = null;
    if (order.plan === "monthly") {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + 30);
      expiresAt = exp.toISOString();
    }

    await kv.set(`user-access:${order.userId}`, {
      level: order.plan,
      grantedAt: now.toISOString(),
      expiresAt,
      paidVia: "yookassa",
      paymentId,
      amount: payment.amount.value,
    });

    await kv.set(`yookassa-order:${paymentId}`, {
      ...order,
      status: "succeeded",
      completedAt: now.toISOString(),
      paidAmount: payment.amount.value,
    });

    console.log(`YooKassa: access granted for user ${order.userId}, plan=${order.plan}`);
    return c.json({ received: true });
  } catch (err) {
    console.log(`Error processing YooKassa webhook: ${err}`);
    return c.json({ error: "Internal error" }, 500);
  }
});

// YooKassa: SuccessURL — user redirect after payment
app.get("/make-server-279b4dfa/yookassa/success", (c) => {
  const appUrl = c.req.query("appUrl") || "";
  const decodedAppUrl = appUrl ? decodeURIComponent(appUrl) : "";
  const redirectTo = decodedAppUrl
    ? `${decodedAppUrl}?payment=success`
    : `/?payment=success`;

  return c.html(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Оплата прошла успешно</title>
  <meta http-equiv="refresh" content="3;url=${redirectTo}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)}
    .card{background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.08)}
    .emoji{font-size:4rem;margin-bottom:1rem}
    h1{color:#16a34a;font-size:1.5rem;margin-bottom:.75rem}
    p{color:#6b7280;font-size:.9375rem;line-height:1.6;margin-bottom:.75rem}
    a{display:inline-block;margin-top:.5rem;background:#16a34a;color:#fff;padding:.75rem 1.5rem;border-radius:12px;text-decoration:none;font-weight:600}
    a:hover{background:#15803d}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">✅</div>
    <h1>Оплата прошла!</h1>
    <p>Доступ к курсу активируется автоматически. Перезайдите в аккаунт.</p>
    <a href="${redirectTo}">Вернуться в курс</a>
  </div>
</body>
</html>`);
});

Deno.serve(app.fetch);