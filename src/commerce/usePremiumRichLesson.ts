import { useEffect, useState } from "react";
import type { RichLessonContent } from "../learning/richLessonContent";

type Result = { lessonId: string; content: RichLessonContent | null; error: string };

export function usePremiumRichLesson(lessonId: string | undefined, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!enabled || !lessonId) return;
    const controller = new AbortController();
    fetch(`/api/content/premium-rich?lessonId=${encodeURIComponent(lessonId)}`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 403
        ? "Gói Premium HSK4 chưa có hiệu lực."
        : "Chưa tải được nội dung HSK4. Hãy thử lại.");
      const body = await response.json() as { schemaVersion?: number; lesson?: RichLessonContent };
      if (body.schemaVersion !== 1 || body.lesson?.lessonId !== lessonId) throw new Error("Nội dung HSK4 không hợp lệ.");
      if (!controller.signal.aborted) setResult({ lessonId, content: body.lesson, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ lessonId, content: null, error: String(error.message ?? error) });
    });
    return () => controller.abort();
  }, [lessonId, enabled, revision]);
  const current = enabled && result?.lessonId === lessonId ? result : null;
  return {
    content: current?.content ?? null,
    loading: enabled && !current,
    error: current?.error ?? "",
    retry: () => setRevision(value => value + 1),
  };
}
