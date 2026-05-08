/**
 * core-routes-handler.tsx
 * Core utility routes: exam, webhook, notes, ratings, practice,
 * comments, quiz-stats, capstone, interactive-progress, certificate, TTS
 */
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

export function registerCoreRoutes(app: Hono) {

  // Save exam result
  app.post("/make-server-279b4dfa/exam-result", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, score, total, percentage, date, caseAnswers } = body;

      if (!sessionId || score === undefined || total === undefined) {
        return c.json({ error: "Missing required fields: sessionId, score, total" }, 400);
      }

      const key = `exam-result:${sessionId}`;
      const existing = await kv.get(key);
      const newResult: any = { score, total, percentage, date, lastAttempt: date, attempts: 1 };

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
      const result = await kv.get(`exam-result:${sessionId}`);
      return c.json({ result: result || null });
    } catch (err) {
      console.log(`Error getting exam result: ${err}`);
      return c.json({ error: `Error getting exam result: ${err}` }, 500);
    }
  });

  // Webhook proxy
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

  // Save notes
  app.post("/make-server-279b4dfa/notes", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, lessonId, note } = body;
      if (!sessionId || !lessonId) return c.json({ error: "Missing sessionId or lessonId" }, 400);
      await kv.set(`notes:${sessionId}:${lessonId}`, { note, updatedAt: new Date().toISOString() });
      return c.json({ success: true });
    } catch (err) {
      console.log(`Error saving note: ${err}`);
      return c.json({ error: `Error saving note: ${err}` }, 500);
    }
  });

  // Get notes
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
      if (!sessionId || !lessonId || !rating) return c.json({ error: "Missing required fields" }, 400);
      await kv.set(`rating:${sessionId}:${lessonId}`, { rating, date: new Date().toISOString() });
      return c.json({ success: true });
    } catch (err) {
      console.log(`Error saving rating: ${err}`);
      return c.json({ error: `Error saving rating: ${err}` }, 500);
    }
  });

  // Save practice task completion
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
        completed, total,
        percentage: Math.round((newCount / total) * 100),
        updatedAt: now,
        firstSavedAt: existing?.firstSavedAt || now,
      });

      const newlyDone = Math.max(0, newCount - prevCount);
      let xpAwarded = 0;
      if (newlyDone > 0) {
        const xpPerTask = 5;
        xpAwarded = newlyDone * xpPerTask + (newCount === total ? 15 : 0);
        const xpKey = `xp:${sessionId}`;
        const xpData = await kv.get(xpKey) || { total: 0, log: [] };
        xpData.total += xpAwarded;
        xpData.log.push({ source: "practice", lessonId, tasksCompleted: newlyDone, allDone: newCount === total, amount: xpAwarded, timestamp: now });
        if (xpData.log.length > 200) xpData.log = xpData.log.slice(-200);
        await kv.set(xpKey, xpData);
      }

      const aggKey = `practice-agg:${sessionId}`;
      const agg = await kv.get(aggKey) || { lessonsWithPractice: 0, totalTasks: 0, totalCompleted: 0, fullyCompletedLessons: 0 };
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

      return c.json({ success: true, xpAwarded, allDone: newCount === total, stats: agg });
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
      const data = await kv.get(`practice:${sessionId}:${lessonId}`);
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
      const agg = await kv.get(`practice-agg:${sessionId}`);
      return c.json({ practices, stats: agg || null });
    } catch (err) {
      console.log(`Error getting all practice progress: ${err}`);
      return c.json({ error: `Error getting all practice progress: ${err}` }, 500);
    }
  });

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
        id: commentId, sessionId, lessonId,
        text: text.trim().slice(0, 1000),
        userName: userName || "Аноним",
        type: type || "comment",
        likes: 0, likedBy: [], createdAt: now,
      };

      await kv.set(`comment:${lessonId}:${commentId}`, comment);
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
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
      if (!lessonId || !commentId || !sessionId) return c.json({ error: "Missing required fields" }, 400);
      const key = `comment:${lessonId}:${commentId}`;
      const comment = await kv.get(key);
      if (!comment) return c.json({ error: "Comment not found" }, 404);

      const likedBy = comment.likedBy || [];
      if (likedBy.includes(sessionId)) {
        comment.likedBy = likedBy.filter((id: string) => id !== sessionId);
        comment.likes = Math.max(0, (comment.likes || 0) - 1);
      } else {
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

  // Get quiz stats
  app.get("/make-server-279b4dfa/quiz-stats/:lessonId", async (c) => {
    try {
      const lessonId = c.req.param("lessonId");
      const stats = await kv.get(`quiz-stats:${lessonId}`) || { attempts: 0, correctRate: 0 };
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
      if (!lessonId || correctRate === undefined) return c.json({ error: "Missing fields" }, 400);
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

  // Capstone: AI Evaluation
  app.post("/make-server-279b4dfa/capstone/evaluate", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, projectId: projId, projectTitle, fields, criteria } = body;

      if (!sessionId || !projId || !fields || Object.keys(fields).length === 0) {
        return c.json({ error: "Missing required fields for capstone evaluation" }, 400);
      }

      const totalLength = (Object.values(fields) as string[]).join("").length;
      if (totalLength < 100) {
        return c.json({ error: "Заполните все поля более подробно (минимум 100 символов суммарно)" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

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

      const fieldsText = Object.entries(fields).map(([key, val]) => `**${key}:**\n${val}`).join("\n\n");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `**Проект: ${projectTitle}**\n\n${fieldsText}` },
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
      if (!content) return c.json({ error: "Empty response from OpenAI" }, 500);

      const evaluation = JSON.parse(content);

      const resultKey = `capstone:${sessionId}:${projId}`;
      const now = new Date().toISOString();
      const existing = await kv.get(resultKey);
      const attempts = existing?.attempts ? existing.attempts + 1 : 1;
      await kv.set(resultKey, {
        fields, evaluation, attempts,
        lastSubmittedAt: now,
        bestScore: Math.max(evaluation.overallScore, existing?.bestScore || 0),
      });

      const xpKey = `xp:${sessionId}`;
      const xpData = await kv.get(xpKey) || { total: 0, log: [] };
      const xpAmount = attempts === 1 ? 50 : 20;
      xpData.total += xpAmount;
      xpData.log.push({ source: "capstone", projectId: projId, amount: xpAmount, score: evaluation.overallScore, timestamp: now });
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

  // Interactive progress sync
  app.post("/make-server-279b4dfa/interactive-progress", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, blockId, blockType, lessonId, result, xpAmount } = body;
      if (!sessionId || !blockId) return c.json({ error: "Missing sessionId or blockId" }, 400);
      const key = `interactive:${sessionId}`;
      const data = await kv.get(key) || { blocks: {} };
      data.blocks[blockId] = {
        completed: true, blockType, lessonId, result,
        xp: xpAmount || 0, ts: new Date().toISOString(),
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
      const data = await kv.get(`interactive:${sessionId}`) || { blocks: {} };
      return c.json(data);
    } catch (err) {
      console.log(`Error getting interactive progress: ${err}`);
      return c.json({ error: `Error getting interactive progress: ${err}` }, 500);
    }
  });

  // Certificate: Save
  app.post("/make-server-279b4dfa/certificate/save", async (c) => {
    try {
      const body = await c.req.json();
      const { sessionId, userName, completedLessons, totalLessons, examScore, completedAt } = body;
      if (!sessionId || !userName) return c.json({ error: "Missing sessionId or userName" }, 400);
      const certId = `cert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const certData = {
        certId, userName, completedLessons, totalLessons, examScore,
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

  // Certificate: Verify
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

  // TTS Audio for lessons
  app.post("/make-server-279b4dfa/tts", async (c) => {
    try {
      const body = await c.req.json();
      const { text } = body;
      if (!text || text.trim().length < 10) return c.json({ error: "Text too short for TTS" }, 400);

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

      const truncated = text.slice(0, 4000);
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "tts-1", input: truncated, voice: "nova", response_format: "mp3" }),
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
}
