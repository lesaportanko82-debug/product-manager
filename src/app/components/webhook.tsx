const WEBHOOK_URL = "https://eo92yp4mfsz07g8.m.pipedream.net";

export type WebhookEvent = 
  | { type: "lesson_completed"; lessonId: string; lessonTitle: string; moduleTitle: string; totalCompleted: number; totalLessons: number }
  | { type: "lesson_uncompleted"; lessonId: string; lessonTitle: string }
  | { type: "exam_started"; sessionId: string }
  | { type: "exam_completed"; sessionId: string; score: number; total: number; percentage: number; timeSpent: number }
  | { type: "quiz_completed"; lessonId: string; lessonTitle: string; score: number; total: number }
  | { type: "course_progress"; completedLessons: number; totalLessons: number; percentage: number };

export async function sendWebhook(event: WebhookEvent): Promise<void> {
  try {
    const payload = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: localStorage.getItem("exam-session-id") || "anonymous",
    };

    // Fire and forget - don't block the UI
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.log(`Webhook send failed (non-critical): ${err}`);
    });
  } catch (err) {
    console.log(`Webhook preparation error (non-critical): ${err}`);
  }
}
