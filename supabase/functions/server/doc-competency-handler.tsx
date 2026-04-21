/**
 * doc-competency-handler.tsx
 * Document text extraction (PDF/DOCX) and AI Competency Gap Analysis routes
 */
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { fetchWithRetry } from "./ai-helpers.tsx";

export function registerDocCompetencyRoutes(app: Hono) {

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
        const binaryStr = atob(fileBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        extractedText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      } else if (ext === "pdf" || ext === "docx" || ext === "doc") {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured for document extraction" }, 500);

        const mimeMap: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          doc: "application/msword",
        };
        const mimeType = mimeMap[ext] || "application/octet-stream";

        const oaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{
              role: "user",
              content: [
                { type: "file", file: { filename: fileName, file_data: `data:${mimeType};base64,${fileBase64}` } },
                { type: "text", text: "Извлеки весь текст из этого документа (резюме/CV). Верни ТОЛЬКО чистый текст, сохраняя структуру: разделы, заголовки, списки. Не добавляй комментариев, не меняй содержание. Если текст на русском — оставь на русском. Если на английском — оставь на английском." },
              ],
            }],
            temperature: 0.1, max_tokens: 4000,
          }),
        });

        if (oaiResponse.ok) {
          const oaiData = await oaiResponse.json();
          extractedText = oaiData.choices?.[0]?.message?.content || "";
        } else {
          const errText = await oaiResponse.text();
          console.log(`OpenAI file extraction error (${oaiResponse.status}): ${errText}`);

          const binaryStr = atob(fileBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const rawText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

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

          if (extractedText.length > 20) {
            const cleanupRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: `Вот фрагменты текста, извлечённые из документа (резюме). Текст может содержать мусор и артефакты. Восстанови чистый текст резюме, убери мусор, сохрани структуру. Если текст невозможно восстановить, ответь "EXTRACTION_FAILED".\n\nТекст:\n${extractedText.slice(0, 3000)}` }],
                temperature: 0.1, max_tokens: 3000,
              }),
            });
            if (cleanupRes.ok) {
              const cleanData = await cleanupRes.json();
              const cleaned = cleanData.choices?.[0]?.message?.content || "";
              if (!cleaned.includes("EXTRACTION_FAILED") && cleaned.length > 20) extractedText = cleaned;
            }
          }
        }
      } else {
        return c.json({ error: `Неподдерживаемый формат файла: .${ext}` }, 400);
      }

      extractedText = extractedText.replace(/\s+/g, " ").trim().slice(0, 8000);

      if (extractedText.length < 20) {
        return c.json({ error: "Не удалось извлечь текст из файла. Попробуйте скопировать текст резюме вручную.", extractedText }, 400);
      }

      return c.json({ text: extractedText, charCount: extractedText.length });
    } catch (err) {
      console.log(`Error extracting document: ${err}`);
      return c.json({ error: `Error extracting document: ${err}` }, 500);
    }
  });

  // ===== AI Competency Gap Analysis =====
  app.post("/make-server-279b4dfa/competency-analysis", async (c) => {
    try {
      const body = await c.req.json();
      const { scores, roleName, roleScores, gaps, completionPct } = body;

      if (!scores || !roleName || !gaps) {
        return c.json({ error: "Missing required fields: scores, roleName, gaps" }, 400);
      }

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) return c.json({ error: "OpenAI API key not configured" }, 500);

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

      const scoresSummary = Object.entries(scores).map(([k, v]) => `${axisLabels[k] || k}: ${v}%`).join(", ");
      const gapsSummary = gaps.map((g: any) =>
        `${axisLabels[g.axis] || g.axis}: текущий ${g.currentScore}% -> целевой ${g.targetScore}% (gap ${g.gap}), незавершённые модули: ${g.modules.map((m: any) => `${m.title} (${m.completedPct}%)`).join(", ")}`
      ).join("\n");

      const systemPrompt = `Ты — AI-коуч по продакт-менеджменту. Анализируешь компетенции студента PM-курса и даёшь персонализированные рекомендации.\n\nОтвечай строго JSON:\n{\n  "summary": "1-2 предложения — общая оценка профиля",\n  "priorityActions": [\n    { "axis": "ключ оси", "action": "конкретное действие", "impact": "высокий|средний", "timeEstimate": "~X часов" }\n  ],\n  "learningPath": "порядок изучения модулей для максимального роста (2-3 предложения)",\n  "strengths": "что уже хорошо и как это использовать (1-2 предложения)",\n  "careerTip": "карьерный совет для выбранной роли (1-2 предложения)"\n}\n\nМаксимум 5 priorityActions. Советы должны быть конкретными и actionable.`;

      const userPrompt = `**Профиль студента PM-курса:**\nПрогресс: ${completionPct}% курса пройдено.\nЦелевая роль: ${roleName}\n\n**Текущие компетенции:**\n${scoresSummary}\n\n**Целевой профиль (${roleName}):**\n${Object.entries(roleScores || {}).map(([k, v]) => `${axisLabels[k] || k}: ${v}%`).join(", ")}\n\n**Обнаруженные gap-ы:**\n${gapsSummary || "Нет значительных gap-ов"}\n\nДай персонализированный анализ и план действий.`;

      const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.4, max_tokens: 1200,
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
      if (!content) return c.json({ error: "Empty response from OpenAI in competency-analysis" }, 500);

      const analysis = JSON.parse(content);
      await kv.set(cacheKey, { analysis, timestamp: Date.now() }).catch(() => {});
      return c.json({ analysis, cached: false });
    } catch (err) {
      console.log(`Error in competency-analysis: ${err}`);
      return c.json({ error: `Error in competency-analysis: ${err}` }, 500);
    }
  });
}
