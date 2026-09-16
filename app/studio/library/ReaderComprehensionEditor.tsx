"use client";

import type { ReaderComprehensionQuestion } from "../../../src/reader/library/readerContentModel";
import styles from "./library.module.css";

export function ReaderComprehensionEditor({ questions, onChange }: {
  questions: ReaderComprehensionQuestion[];
  onChange: (questions: ReaderComprehensionQuestion[]) => void;
}) {
  const update = (index: number, patch: Partial<ReaderComprehensionQuestion>) =>
    onChange(questions.map((question, position) => position === index ? { ...question, ...patch } : question));
  return <section className={styles.quizEditor} aria-label="Soạn khảo luyện sau khi đọc">
    <header><h4>Khảo luyện sau khi đọc</h4><span>{questions.length}/10 câu</span></header>
    <p>Câu hỏi phải trả lời được từ chương này. Giải thích cần chỉ ra chi tiết trong bài đọc. Không thêm câu hỏi thì chương vẫn đọc và hoàn thành được.</p>
    {questions.map((question, index) => <fieldset key={question.questionId}>
      <legend>Câu {index + 1}</legend>
      <label><span>Câu hỏi</span><textarea required maxLength={1000} value={question.promptVi} onChange={(event) => update(index, { promptVi: event.target.value })} /></label>
      <div className={styles.grid2}>{question.options.map((option, optionIndex) => <label key={optionIndex}>
        <span>Lựa chọn {String.fromCharCode(65 + optionIndex)}</span>
        <input required maxLength={600} value={option} onChange={(event) => update(index, { options: question.options.map((value, position) => position === optionIndex ? event.target.value : value) })} />
      </label>)}</div>
      <label><span>Đáp án đúng</span><select value={question.answerIndex} onChange={(event) => update(index, { answerIndex: Number(event.target.value) })}>
        {question.options.map((_, position) => <option key={position} value={position}>Lựa chọn {String.fromCharCode(65 + position)}</option>)}
      </select></label>
      <label><span>Giải thích và chi tiết đối chiếu trong chương</span><textarea required maxLength={2000} value={question.explanationVi} onChange={(event) => update(index, { explanationVi: event.target.value })} /></label>
      <details><summary>Xem trước đáp án và phản hồi</summary><p>{question.promptVi || "Chưa có câu hỏi"}</p><strong>{question.options[question.answerIndex] || "Chưa có đáp án"}</strong><p>{question.explanationVi || "Chưa có giải thích"}</p></details>
      <button type="button" className={styles.secondary} onClick={() => onChange(questions.filter((_, position) => position !== index))}>Xóa câu {index + 1}</button>
    </fieldset>)}
    <button type="button" className={styles.secondary} disabled={questions.length >= 10} onClick={() => onChange([...questions, {
      questionId: `q-${crypto.randomUUID()}`, promptVi: "", options: ["", "", ""], answerIndex: 0, explanationVi: "",
    }])}>Thêm câu khảo luyện</button>
    <small>Câu hỏi đi cùng bản phát hành của chương và phải qua quy trình duyệt. Sau khi sửa bài đọc, hãy đối chiếu lại toàn bộ câu hỏi trước khi gửi duyệt.</small>
  </section>;
}
