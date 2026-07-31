import {
  BookOpenCheck,
  Languages,
  MessageCircleMore,
  MessagesSquare,
  Volume2,
} from "lucide-react";
import {
  getRichLessonContent,
  RICH_LESSON_DISCLOSURE,
  type RichDialogueTurn,
} from "../learning/richLessonContent";
import { speakMandarin } from "../lib/speech";

const Dialogue = ({ turns }: { turns: RichDialogueTurn[] }) => (
  <div className="rich-dialogue">
    {turns.map((turn, index) => (
      <button
        key={`${turn.speaker}-${index}-${turn.hanzi}`}
        type="button"
        onClick={() => speakMandarin(turn.hanzi)}
        aria-label={`Nghe câu ${turn.hanzi}`}
      >
        <span className="dialogue-speaker">{turn.speaker}</span>
        <span>
          <strong>{turn.hanzi}</strong>
          <small>{turn.pinyin}</small>
          <em>{turn.meaningVi}</em>
        </span>
        <Volume2 size={16} />
      </button>
    ))}
  </div>
);

export function LessonDepthPanel({ lessonId }: { lessonId: string }) {
  const content = getRichLessonContent(lessonId);
  if (!content) return null;
  const headingId = `${lessonId}-depth-heading`;

  return (
    <section className="lesson-depth-panel" aria-labelledby={headingId}>
      <header>
        <span id={headingId}>03 · ỨNG DỤNG CHUYÊN SÂU</span>
        <small>
          {content.dialogue.length} lượt thoại · {content.grammar.length} điểm ngữ pháp
        </small>
      </header>

      <p className="rich-review-disclosure">
        <BookOpenCheck size={16} /> {RICH_LESSON_DISCLOSURE.reviewVi}
      </p>

      <div className="lesson-depth-grid">
        <section className="rich-dialogue-panel">
          <h2><MessageCircleMore size={19} /> Hội thoại mẫu</h2>
          <p>Nghe từng câu, đọc theo rồi đổi vai A/B để nhại lại cả đoạn.</p>
          <Dialogue turns={content.dialogue} />
        </section>

        <section className="rich-grammar-panel">
          <h2><Languages size={19} /> Ngữ pháp trong ngữ cảnh</h2>
          <p>Mở từng điểm, đọc ví dụ rồi tự nói câu trước khi xem mẫu.</p>
          <div className="rich-grammar-list">
            {content.grammar.map((point, index) => (
              <details key={point.id} open={index === 0}>
                <summary>
                  <span>{point.category}</span>
                  <strong>{point.label}</strong>
                </summary>
                <div className="rich-grammar-body">
                  <p>{point.explanationVi}</p>
                  <button
                    type="button"
                    onClick={() => speakMandarin(point.modelExample.hanzi)}
                    className="grammar-model-example"
                  >
                    <Volume2 size={16} />
                    <span>
                      <strong>{point.modelExample.hanzi}</strong>
                      <small>{point.modelExample.pinyin}</small>
                      <em>{point.modelExample.meaningVi}</em>
                    </span>
                  </button>
                  <div className="guided-practice-card">
                    <span>TỰ NÓI TRƯỚC KHI MỞ ĐÁP ÁN</span>
                    <p>{point.guidedPractice.promptVi}</p>
                    <details>
                      <summary>Xem câu mẫu</summary>
                      <button
                        type="button"
                        onClick={() => speakMandarin(
                          point.guidedPractice.modelAnswerHanzi,
                        )}
                      >
                        <Volume2 size={15} />
                        <span>
                          <strong>{point.guidedPractice.modelAnswerHanzi}</strong>
                          <small>{point.guidedPractice.modelAnswerPinyin}</small>
                          <em>{point.guidedPractice.modelAnswerMeaningVi}</em>
                        </span>
                      </button>
                    </details>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>

      {(content.topics.length > 0 || content.tasks.length > 0) && (
        <section className="rich-task-panel">
          <h2><MessagesSquare size={19} /> Nhiệm vụ giao tiếp</h2>
          {content.topics.map((topic) => (
            <div className="rich-topic" key={topic.id}>
              <span>{topic.group}</span>
              <strong>{topic.officialTopic}</strong>
              <p>{topic.promptVi}</p>
            </div>
          ))}
          {content.tasks.map((task) => (
            <details key={task.id} open>
              <summary>{task.titleVi}</summary>
              <p>{task.instructionVi}</p>
              <Dialogue turns={task.modelDialogue} />
            </details>
          ))}
        </section>
      )}
    </section>
  );
}
