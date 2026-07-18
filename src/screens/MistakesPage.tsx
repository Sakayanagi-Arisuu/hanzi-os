import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Swords,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSystemFeedback } from "../components/SystemFeedback";
import { useLearning } from "../store/LearningStore";
import type { MistakeRecord } from "../types";

const skillLabels: Record<MistakeRecord["skill"], string> = {
  pronunciation: "phát âm",
  listening: "nghe",
  speaking: "nói",
  reading: "đọc",
  writing: "viết",
  vocabulary: "từ vựng",
  grammar: "ngữ pháp",
};

const kindLabels: Record<MistakeRecord["kind"], string> = {
  meaning: "giải nghĩa",
  pinyin: "pinyin",
  tone: "thanh điệu",
  listening: "nghe hiểu",
  sentence: "đọc câu",
  recall: "tự gọi lại",
};

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9\u3400-\u9fff]+/g, "")
  .toLowerCase();

const matchesAnswer = (answer: string, expected: string) => {
  const normalizedAnswer = normalize(answer);
  const normalizedExpected = normalize(expected);
  if (!normalizedAnswer) return false;
  return normalizedExpected.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedExpected);
};

export function MistakesPage() {
  const { state, actions } = useLearning();
  const { notify } = useSystemFeedback();
  const unresolved = useMemo(() => state.mistakes.filter((mistake) => !mistake.resolved), [state.mistakes]);
  const resolved = useMemo(() => state.mistakes.filter((mistake) => mistake.resolved), [state.mistakes]);
  const [activeId, setActiveId] = useState<string | null>(unresolved[0]?.id ?? null);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [submittedMistake, setSubmittedMistake] = useState<MistakeRecord | null>(null);
  const mistake = checked && submittedMistake
    ? submittedMistake
    : unresolved.find((item) => item.id === activeId) ?? unresolved[0];

  const resetAttempt = () => {
    const latest = submittedMistake ? state.mistakes.find((item) => item.id === submittedMistake.id) : null;
    if (latest?.resolved) setActiveId(unresolved.find((item) => item.id !== latest.id)?.id ?? null);
    setAnswer("");
    setChecked(false);
    setCorrect(false);
    setShowHint(false);
    setSubmittedMistake(null);
  };

  const submit = () => {
    if (!mistake || !answer.trim()) return;
    const isCorrect = matchesAnswer(answer, mistake.correctAnswer);
    setCorrect(isCorrect);
    setChecked(true);
    const correctedStreak = isCorrect ? mistake.correctedStreak + 1 : 0;
    setSubmittedMistake({ ...mistake, correctedStreak, resolved: correctedStreak >= 2 });
    actions.resolveMistake(mistake.id, isCorrect);
    if (isCorrect) notify(
      correctedStreak >= 2
        ? "Lỗ hổng đã được đóng bằng hai lần truy hồi chính xác liên tiếp."
        : "Đã phá giải tầng đầu. Cần thêm một lần tự gọi đúng để đóng lỗ hổng.",
    );
  };

  const chooseMistake = (id: string) => {
    setActiveId(id);
    resetAttempt();
  };

  if (!unresolved.length && !checked) {
    return (
      <div className="mistake-clear-state">
        <div className="clear-shield"><ShieldCheck size={43} /><span /></div>
        <span className="system-kicker">ANOMALY FIELD · CLEAR</span>
        <h1>Nghịch Cảnh đã được phá giải</h1>
        <p>Không còn lỗi nào cần sửa ngay. Tiếp tục bài mới hoặc ôn FSRS để hệ thống thu thập bằng chứng mới.</p>
        <div>
          <Link className="secondary-button" to="/review"><BrainCircuit size={17} /> Vào Ký Ức Trận</Link>
          <Link className="primary-button" to="/path">Tiếp tục Thiên Lộ <ArrowRight size={17} /></Link>
        </div>
        {resolved.length > 0 && <span className="resolved-count"><CheckCircle2 size={15} /> {resolved.length} lỗ hổng đã đóng</span>}
      </div>
    );
  }

  return (
    <div className="content-page mistakes-page">
      <header className="page-hero mistakes-hero">
        <div>
          <span className="system-kicker"><Swords size={15} /> PERSONAL REMEDIATION FIELD</span>
          <h1>Nghịch Cảnh Lục</h1>
          <p>Mỗi lỗi được giữ lại cho đến khi bạn tự gọi đúng đáp án hai lần liên tiếp. Xem lại không được tính là mastery.</p>
        </div>
        <div className="mistake-hero-stats"><span><strong>{unresolved.length}</strong><small>đang mở</small></span><span><strong>{resolved.length}</strong><small>đã phá giải</small></span></div>
      </header>

      <div className="mistake-layout">
        <aside className="mistake-index">
          <header className="section-heading"><div><span>OPEN ANOMALIES</span><h2>Lỗ hổng ưu tiên</h2></div><ShieldX size={20} /></header>
          <div className="mistake-list">
            {unresolved.map((item, index) => (
              <button className={mistake?.id === item.id ? "active" : ""} key={item.id} type="button" onClick={() => chooseMistake(item.id)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{item.prompt}</strong><small>{skillLabels[item.skill]} · sai {item.occurrences} lần</small></span>
                <i>{item.correctedStreak}/2</i>
              </button>
            ))}
          </div>
        </aside>

        {mistake && (
          <section className="correction-arena">
            <header>
              <span><Swords size={16} /> REMEDIATION NODE</span>
              <strong>{mistake.correctedStreak}/2 lần đúng liên tiếp</strong>
            </header>
            <div className="correction-prompt">
              <small>{kindLabels[mistake.kind]} · {skillLabels[mistake.skill]}</small>
              <h2>{mistake.prompt}</h2>
              <p>Hãy tự nhập đáp án trước khi mở gợi ý.</p>
            </div>
            <label className="correction-input">
              <span>Câu trả lời của bạn</span>
              <input value={answer} disabled={checked} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Nhập nghĩa, pinyin hoặc đáp án..." autoComplete="off" />
            </label>
            <button className="hint-toggle" type="button" onClick={() => setShowHint((value) => !value)}>
              {showHint ? <EyeOff size={16} /> : <Eye size={16} />} {showHint ? "Ẩn gợi ý" : "Mở gợi ý"}
            </button>
            {showHint && <div className="correction-hint"><Sparkles size={17} /><p>{mistake.explanation}</p></div>}
            {checked && (
              <div className={`correction-result ${correct ? "correct" : "wrong"}`}>
                {correct ? <CheckCircle2 size={22} /> : <RotateCcw size={22} />}
                <div><strong>{correct ? "Phá giải thành công một tầng" : `Đáp án chuẩn: ${mistake.correctAnswer}`}</strong><p>{mistake.explanation}</p></div>
              </div>
            )}
            <footer>
              <span><History size={15} /> Gặp lần cuối {new Date(mistake.lastAttemptAt).toLocaleDateString("vi-VN")}</span>
              {checked ? (
                <button className={correct ? "primary-button" : "secondary-button"} type="button" onClick={resetAttempt}>{correct ? (mistake.resolved ? "Hoàn tất phá giải" : "Củng cố lần tiếp theo") : "Thử lại"}<ArrowRight size={17} /></button>
              ) : (
                <button className="primary-button" disabled={!answer.trim()} type="button" onClick={submit}>Phán định <ArrowRight size={17} /></button>
              )}
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
