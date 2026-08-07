import type { CSSProperties } from "react";
import type { StudioItemType } from "../content/studioContent";
import type {
  RichDialogueTurn,
  RichLessonContent,
} from "../learning/richLessonContent";
import { LessonDepthPanel } from "./LessonDepthPanel";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const text = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

const dialogueTurns = (content: Record<string, unknown>): RichDialogueTurn[] =>
  (Array.isArray(content.dialogue) ? content.dialogue : [])
    .map((entry, index) => {
      const row = asRecord(entry);
      return row ? {
        speaker: text(row.speaker, index % 2 === 0 ? "A" : "B"),
        hanzi: text(row.hanzi),
        pinyin: text(row.pinyin),
        meaningVi: text(row.meaningVi),
      } : null;
    })
    .filter((entry): entry is RichDialogueTurn => entry !== null);

const lessonPreview = (
  revisionId: string,
  content: Record<string, unknown>,
): RichLessonContent => {
  const dialogue = dialogueTurns(content);
  const fallbackExample = dialogue[0] ?? {
    speaker: "A",
    hanzi: "你好！",
    pinyin: "Nǐ hǎo!",
    meaningVi: "Xin chào!",
  };
  const grammar = (Array.isArray(content.grammar) ? content.grammar : [])
    .map((entry, index) => {
      const row = asRecord(entry);
      if (!row) return null;
      return {
        id: `${revisionId}:grammar:${index + 1}`,
        category: "CONTENT STUDIO",
        label: text(row.pattern, `Điểm ngữ pháp ${index + 1}`),
        officialContent: text(row.pattern),
        explanationVi: text(row.explanationVi),
        modelExample: {
          hanzi: fallbackExample.hanzi,
          pinyin: fallbackExample.pinyin,
          meaningVi: fallbackExample.meaningVi,
        },
        guidedPractice: {
          promptVi: text(row.promptVi, "Tự tạo một câu mới theo mẫu trước khi mở đáp án."),
          modelAnswerHanzi: fallbackExample.hanzi,
          modelAnswerPinyin: fallbackExample.pinyin,
          modelAnswerMeaningVi: fallbackExample.meaningVi,
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  return {
    lessonId: revisionId,
    authoringLessonId: revisionId,
    dialogue,
    grammar,
    topics: [{
      id: `${revisionId}:objective`,
      group: "MỤC TIÊU",
      officialTopic: "Bản xem trước có kiểm soát",
      promptVi: text(content.objectiveVi),
    }],
    tasks: [],
    characters: [],
  };
};

const styles: Record<string, CSSProperties> = {
  card: { padding: 20, border: "1px solid #274c43", background: "#06130f", color: "#dcebe7" },
  label: { display: "block", color: "#61f2c0", fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: ".12em" },
  hanzi: { display: "block", margin: "16px 0 6px", color: "#f3c969", fontSize: "clamp(34px, 7vw, 68px)" },
  pinyin: { display: "block", color: "#7ecdb5", fontSize: 15 },
  meaning: { display: "block", marginTop: 8, color: "#b6c9c3", fontStyle: "normal" },
  options: { display: "grid", gap: 8, margin: "18px 0 0", padding: 0, listStyle: "none" },
  option: { padding: 12, border: "1px solid #274c43", background: "#091b16" },
};

export function StudioContentPreview({
  revisionId,
  itemType,
  content,
}: {
  revisionId: string;
  itemType: StudioItemType;
  content: Record<string, unknown>;
}) {
  if (itemType === "lesson") {
    return (
      <div className="lesson-page">
        <LessonDepthPanel
          lessonId={revisionId}
          contentOverride={lessonPreview(revisionId, content)}
        />
      </div>
    );
  }

  if (itemType === "exam_form") {
    const keys = Array.isArray(content.itemStableKeys)
      ? content.itemStableKeys.filter((entry): entry is string => typeof entry === "string")
      : [];
    return (
      <section style={styles.card} aria-label="Bản xem trước hướng dẫn Mock Exam">
        <span style={styles.label}>LEARNER UI PREVIEW · MOCK EXAM FORM</span>
        <strong style={{ ...styles.hanzi, fontSize: 32 }}>
          {text(content.examLevel).toUpperCase()} · FORM {text(content.formKey).toUpperCase()}
        </strong>
        <small style={styles.pinyin}>
          {String(content.timeLimitMinutes ?? "—")} phút · {keys.length} câu
        </small>
        <em style={styles.meaning}>
          Đáp án được giữ phía máy chủ; learner chỉ review sau khi phiên kết thúc.
        </em>
      </section>
    );
  }

  const options = Array.isArray(content.options)
    ? content.options.filter((entry): entry is string => typeof entry === "string")
    : [];
  return (
    <section style={styles.card} aria-label="Bản xem trước trong giao diện học">
      <span style={styles.label}>LEARNER UI PREVIEW · {itemType.toUpperCase()}</span>
      <strong style={styles.hanzi}>{text(content.hanzi ?? content.pattern, text(content.promptVi))}</strong>
      {content.pinyin ? <small style={styles.pinyin}>{text(content.pinyin)}</small> : null}
      <em style={styles.meaning}>{text(content.meaningVi ?? content.explanationVi ?? content.promptVi)}</em>
      {options.length > 0 && (
        <ol style={styles.options}>
          {options.map((option, index) => <li style={styles.option} key={`${index}:${option}`}>{option}</li>)}
        </ol>
      )}
    </section>
  );
}
