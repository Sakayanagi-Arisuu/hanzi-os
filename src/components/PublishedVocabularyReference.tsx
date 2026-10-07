import { useEffect, useState } from "react";
import { Link } from "react-router";
import { loadPublishedStudioVocabulary } from "../content/publishedStudioClient";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";
import { LESSON_BY_ID, RELEASED_WORD_BY_ID } from "../data/curriculum";

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
  const knownWord = wordId ? RELEASED_WORD_BY_ID.get(wordId) : undefined;
  const knownLesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined;

  useEffect(() => {
    if (!opened || !knownWord) return;
    const controller = new AbortController();
    setPhase("loading");
    loadPublishedStudioVocabulary(fetch, controller.signal)
      .then((words) => {
        if (controller.signal.aborted) return;
        setReference(words.find((word) => word.sourceVocabularyId === knownWord.id) ?? null);
        setPhase("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setPhase("unavailable");
      });
    return () => controller.abort();
  }, [opened, knownWord]);

  if (!knownWord && !knownLesson) return null;
  const params = new URLSearchParams();
  if (knownWord) {
    params.set("word", knownWord.id);
    params.set("view", "detail");
  } else if (knownLesson) params.set("lesson", knownLesson.id);

  return (
    <details className="memory-example-panel" onToggle={(event) => setOpened(event.currentTarget.open)}>
      <summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>
        {knownWord ? `Tra ngữ cảnh của ${knownWord.simplified}` : "Tra từ trong bài gốc"}
      </summary>
      {opened && knownWord && (
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
        Mở Từ điển{knownWord ? ` · ${knownWord.simplified}` : ""}
      </Link>
    </details>
  );
}
