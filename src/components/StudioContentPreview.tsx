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
  const exercises = (Array.isArray(content.exercises) ? content.exercises : [])
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => entry !== null);
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
      const exercise = exercises[index % Math.max(1, exercises.length)];
      const example = dialogue[index % Math.max(1, dialogue.length)] ?? fallbackExample;
      return {
        id: `${revisionId}:grammar:${index + 1}`,
        category: "CONTENT STUDIO",
        label: text(row.pattern, `Điểm ngữ pháp ${index + 1}`),
        officialContent: text(row.pattern),
        explanationVi: text(row.explanationVi),
        modelExample: {
          hanzi: example.hanzi,
          pinyin: example.pinyin,
          meaningVi: example.meaningVi,
        },
        guidedPractice: {
          promptVi: text(exercise?.promptVi, "Tự tạo một câu mới theo mẫu trước khi mở đáp án."),
          modelAnswerHanzi: text(exercise?.answer, fallbackExample.hanzi),
          modelAnswerPinyin: text(exercise?.answerPinyin, fallbackExample.pinyin),
          modelAnswerMeaningVi: text(exercise?.answerMeaningVi, fallbackExample.meaningVi),
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  return {
    lessonId: text(content.targetLessonId, revisionId),
    authoringLessonId: revisionId,
    dialogue,
    grammar,
    topics: [{
      id: `${revisionId}:objective`,
      group: "MỤC TIÊU",
      officialTopic: "Bản xem trước có kiểm soát",
      promptVi: text(content.objectiveVi),
    }],
    tasks: exercises.map((exercise, index) => ({
      id: `${revisionId}:practice:${index + 1}`,
      titleVi: text(exercise.promptVi, `Thực hành ${index + 1}`),
      instructionVi: text(exercise.explanationVi),
      targetFunctions: [],
      modelDialogue: [{
        speaker: "Mẫu",
        hanzi: text(exercise.answer),
        pinyin: text(exercise.answerPinyin),
        meaningVi: text(exercise.answerMeaningVi),
      }],
    })),
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
      <section style={styles.card} aria-label="Bản xem trước hướng dẫn bộ đề">
        <span style={styles.label}>BẢN XEM TRƯỚC · BỘ ĐỀ</span>
        <strong style={{ ...styles.hanzi, fontSize: 32 }}>
          {text(content.examLevel).toUpperCase()} · CỬA {text(content.formKey).toUpperCase()}
        </strong>
        <small style={styles.pinyin}>
          {String(content.timeLimitMinutes ?? "—")} phút · {keys.length} câu
        </small>
        <em style={styles.meaning}>
          Đáp án chỉ hiện sau khi người học kết thúc phiên luyện đề.
        </em>
      </section>
    );
  }

  if (itemType === "graded_text") {
    const sentences = (Array.isArray(content.sentences) ? content.sentences : [])
      .map(asRecord)
      .filter((entry): entry is Record<string, unknown> => entry !== null);
    const questions = (Array.isArray(content.comprehension) ? content.comprehension : [])
      .map(asRecord)
      .filter((entry): entry is Record<string, unknown> => entry !== null);
    return (
      <article style={styles.card} aria-label="Bản xem trước bài đọc trong Vạn Quyển Các">
        <span style={styles.label}>VẠN QUYỂN CÁC · BẢN XEM TRƯỚC KHÔNG GHI TIẾN ĐỘ</span>
        <strong style={{ ...styles.hanzi, fontSize: "clamp(30px, 6vw, 52px)" }} lang="zh-Hans">{text(content.titleZh)}</strong>
        <em style={styles.meaning}>{text(content.summaryVi)}</em>
        <div style={{ display: "grid", gap: 20, marginTop: 28 }}>
          {sentences.map((sentence, index) => (
            <section key={`${index}:${text(sentence.hanzi)}`} style={{ paddingLeft: 14, borderLeft: "2px solid #2f6b5b" }}>
              <strong lang="zh-Hans" style={{ display: "block", color: "#edf7f4", fontSize: 22, lineHeight: 1.65 }}>{text(sentence.hanzi)}</strong>
              <small style={styles.pinyin}>{text(sentence.pinyin)}</small>
              <span style={styles.meaning}>{text(sentence.meaningVi)}</span>
            </section>
          ))}
        </div>
        {questions.length > 0 && (
          <section style={{ marginTop: 32 }} aria-label="Câu hỏi đọc hiểu trong bản xem trước">
            <span style={styles.label}>KHẢO LUYỆN ĐỌC · {questions.length} CÂU</span>
            {questions.map((question, index) => {
              const distractors = Array.isArray(question.distractors)
                ? question.distractors.filter((entry): entry is string => typeof entry === "string")
                : [];
              return (
                <div key={`${index}:${text(question.promptVi)}`} style={{ marginTop: 18 }}>
                  <strong>{index + 1}. {text(question.promptVi)}</strong>
                  <ul style={styles.options}>
                    {["Lựa chọn đúng được ẩn trong bản xem trước", ...distractors].map((option, optionIndex) =>
                      <li style={styles.option} key={`${optionIndex}:${option}`}>{option}</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </section>
        )}
      </article>
    );
  }

  const options = Array.isArray(content.options)
    ? content.options.filter((entry): entry is string => typeof entry === "string")
    : [];
  const firstExample = asRecord(
    (Array.isArray(content.examples) ? content.examples[0] : null)
      ?? (Array.isArray(content.dialogue) ? content.dialogue[0] : null)
      ?? (Array.isArray(content.sentences) ? content.sentences[0] : null),
  );
  return (
    <section style={styles.card} aria-label="Bản xem trước trong giao diện học">
      <span style={styles.label}>LEARNER UI PREVIEW · {itemType.toUpperCase()}</span>
      <strong style={styles.hanzi}>{text(
        content.hanzi
          ?? content.pattern
          ?? content.titleZh
          ?? firstExample?.hanzi,
        text(content.functionVi ?? content.conceptVi ?? content.promptVi),
      )}</strong>
      {(content.pinyin || firstExample?.pinyin) ? <small style={styles.pinyin}>{text(content.pinyin ?? firstExample?.pinyin)}</small> : null}
      <em style={styles.meaning}>{text(
        content.meaningVi
          ?? content.explanationVi
          ?? content.summaryVi
          ?? content.scenarioVi
          ?? content.ruleVi
          ?? firstExample?.meaningVi
          ?? content.promptVi,
      )}</em>
      {options.length > 0 && (
        <ol style={styles.options}>
          {options.map((option, index) => <li style={styles.option} key={`${index}:${option}`}>{option}</li>)}
        </ol>
      )}
    </section>
  );
}
