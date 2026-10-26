import { useEffect, useState } from "react";
import { Link } from "react-router";
import { loadPublishedStudioVocabulary } from "../content/publishedStudioClient";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";

/** Supplementary reading only: never feeds scoring, session regeneration or commands. */
export function PublishedVocabularyReference({
  wordId,
  lessonId,
}: {
  wordId?: string;
  lessonId?: string;
}) {
  const [opened, setOpened] = useState(false);
  const [reference, setReference] = useState<DictionaryWord | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");

  useEffect(() => {
    if (!opened || !wordId) return;
    const controller = new AbortController();
    setPhase("loading");
    loadPublishedStudioVocabulary(fetch, controller.signal)
      .then((words) => {
        if (controller.signal.aborted) return;
        setReference(words.find((word) => word.sourceVocabularyId === wordId || word.id === wordId) ?? null);
        setPhase("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase("unavailable");
      });
    return () => controller.abort();
  }, [opened, wordId]);

  if (!wordId && !lessonId) return null;
  const params = new URLSearchParams();
  if (wordId) {
    params.set("word", wordId);
    params.set("view", "detail");
  } else if (lessonId) params.set("lesson", lessonId);

  return (
    <details className="memory-example-panel" onToggle={(event) => setOpened(event.currentTarget.open)}>
      <summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>
        {wordId ? "Tra ngữ cảnh của từ này" : "Tra từ trong bài gốc"}
      </summary>
      {opened && wordId && (
        <div>
          {phase === "loading" && <p role="status">Đang tải ngữ cảnh…</p>}
          {reference && <>
            <strong lang="zh-Hans">{reference.simplified}</strong>
            <span>{reference.pinyin} · {reference.meaning}</span>
            <p lang="zh-Hans">{reference.example}</p>
            <span>{reference.examplePinyin}</span>
            <p>{reference.exampleMeaning}</p>
          </>}
          {phase === "ready" && !reference && <p>Mở Từ điển để xem nghĩa và ví dụ của từ này.</p>}
          {phase === "unavailable" && <p>Ngữ cảnh mới tạm chưa tải được. Bạn vẫn có thể mở Từ điển.</p>}
        </div>
      )}
      <Link className="secondary-button" to={`/dictionary?${params.toString()}`}>
        Mở Từ điển{reference ? ` · ${reference.simplified}` : ""}
      </Link>
    </details>
  );
}
