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
import { Link } from "react-router";
import { useSystemFeedback } from "../components/SystemFeedback";
import { isMistakeFromActivePathContent } from "../lib/adaptive";
import { makeIdempotencyKey } from "../lib/evidence";
import {
  evaluateRemediationAttempt,
  toggleRemediationHint,
} from "../lib/remediation";
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
  "tone-pair": "cặp thanh điệu",
  listening: "nghe hiểu",
  sentence: "đọc câu",
  recall: "tự gọi lại",
};

const normalize = (value: string, preserveToneMarks: boolean) => {
  const normalized = preserveToneMarks
    ? value.normalize("NFC")
    : value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  return normalized
    .replace(/[^a-zA-ZÀ-ỹ0-9\u3400-\u9fff]+/gu, "")
    .toLocaleLowerCase("vi");
};

const matchesAnswer = (
  answer: string,
  expected: string,
  kind: MistakeRecord["kind"],
) => {
  const preserveToneMarks = kind === "pinyin"
    || kind === "tone"
    || kind === "tone-pair";
  const normalizedAnswer = normalize(answer, preserveToneMarks);
  const normalizedExpected = normalize(expected, preserveToneMarks);
  if (!normalizedAnswer) return false;
  return normalizedAnswer === normalizedExpected;
};

export function LocalMistakesPage() {
  const { state, actions } = useLearning();
  const { notify } = useSystemFeedback();
  const visibleMistakes = useMemo(
    () => state.mistakes.filter((mistake) =>
      isMistakeFromActivePathContent(
        mistake,
        state.profile.startingLevel,
      )
    ),
    [state.mistakes, state.profile.startingLevel],
  );
  const unresolved = useMemo(
    () => visibleMistakes.filter((mistake) => !mistake.resolved),
    [visibleMistakes],
  );
  const resolved = useMemo(
    () => visibleMistakes.filter((mistake) => mistake.resolved),
    [visibleMistakes],
  );
  const [activeId, setActiveId] = useState<string | null>(
    unresolved[0]?.id ?? null,
  );
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [hint, setHint] = useState({ visible: false, used: false });
  const [attemptKey, setAttemptKey] = useState(
    () => makeIdempotencyKey("mistake-attempt"),
  );
  const [submittedMistake, setSubmittedMistake] =
    useState<MistakeRecord | null>(null);
  const mistake = checked && submittedMistake
    ? submittedMistake
    : unresolved.find((item) => item.id === activeId) ?? unresolved[0];

  const resetAttempt = () => {
    const latest = submittedMistake
      ? state.mistakes.find((item) => item.id === submittedMistake.id)
      : null;
    if (latest?.resolved) {
      setActiveId(
        unresolved.find((item) => item.id !== latest.id)?.id ?? null,
      );
    }
    setAnswer("");
    setChecked(false);
    setCorrect(false);
    setHint({ visible: false, used: false });
    setAttemptKey(makeIdempotencyKey("mistake-attempt"));
    setSubmittedMistake(null);
  };

  const submit = () => {
    if (!mistake || !answer.trim()) return;
    const isCorrect = matchesAnswer(
      answer,
      mistake.correctAnswer,
      mistake.kind,
    );
    setCorrect(isCorrect);
    setChecked(true);
    const attempt = evaluateRemediationAttempt(
      mistake.correctedStreak,
      isCorrect,
      hint.used,
    );
    setSubmittedMistake({
      ...mistake,
      correctedStreak: attempt.correctedStreak,
      resolved: attempt.resolved,
    });
    actions.resolveMistake(
      mistake.id,
      isCorrect,
      answer,
      attemptKey,
      hint.used,
    );
    if (isCorrect) {
      notify(
        hint.used
          ? "Đáp án đúng sau khi mở gợi ý chỉ được ghi là practice local; chuỗi không tăng."
          : attempt.correctedStreak >= 2
            ? "Đã đóng lỗi trong practice local bằng hai lần tự gọi đúng liên tiếp."
            : "Đã hoàn thành lượt tự gọi đầu tiên trong practice local.",
      );
    }
  };

  const chooseMistake = (id: string) => {
    setActiveId(id);
    resetAttempt();
  };

  const toggleHint = () => {
    setHint(toggleRemediationHint);
  };

  if (!unresolved.length && !checked) {
    return (
      <div className="mistake-clear-state">
        <div className="clear-shield">
          <ShieldCheck size={43} />
          <span />
        </div>
        <span className="system-kicker">LOCAL PRACTICE · CLEAR</span>
        <h1>Không còn lỗi practice local đang mở</h1>
        <p>
          Trạng thái này chỉ được lưu trên thiết bị và không phải mastery hoặc
          authority của tài khoản.
        </p>
        <div>
          <Link className="secondary-button" to="/review">
            <BrainCircuit size={17} /> Vào Ký Ức Trận
          </Link>
          <Link className="primary-button" to="/path">
            Tiếp tục Thiên Lộ <ArrowRight size={17} />
          </Link>
        </div>
        {resolved.length > 0 && (
          <span className="resolved-count">
            <CheckCircle2 size={15} /> {resolved.length} lỗi đã đóng cục bộ
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="content-page mistakes-page">
      <header className="page-hero mistakes-hero">
        <div>
          <span className="system-kicker">
            <Swords size={15} /> LOCAL PRACTICE · NO MASTERY
          </span>
          <h1>Nghịch Cảnh Lục</h1>
          <p>
            Đây là practice lưu trên thiết bị. Kết quả, XP tương tác và trạng
            thái đóng lỗi không phải mastery hoặc authority của tài khoản.
          </p>
        </div>
        <div className="mistake-hero-stats">
          <span><strong>{unresolved.length}</strong><small>đang mở</small></span>
          <span><strong>{resolved.length}</strong><small>đã đóng local</small></span>
        </div>
      </header>

      <div className="mistake-layout">
        <aside className="mistake-index">
          <header className="section-heading">
            <div><span>LOCAL ANOMALIES</span><h2>Lỗi practice ưu tiên</h2></div>
            <ShieldX size={20} />
          </header>
          <div className="mistake-list">
            {unresolved.map((item, index) => (
              <button
                className={mistake?.id === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => chooseMistake(item.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{item.prompt}</strong>
                  <small>
                    {skillLabels[item.skill]} · sai {item.occurrences} lần
                  </small>
                </span>
                <i>{item.correctedStreak}/2</i>
              </button>
            ))}
          </div>
        </aside>

        {mistake && (
          <section className="correction-arena">
            <header>
              <span><Swords size={16} /> LOCAL REMEDIATION NODE</span>
              <strong>{mistake.correctedStreak}/2 lượt tự gọi đúng</strong>
            </header>
            <div className="correction-prompt">
              <small>
                {kindLabels[mistake.kind]} · {skillLabels[mistake.skill]}
              </small>
              <h2>{mistake.prompt}</h2>
              <p>Hãy tự nhập đáp án trước khi mở gợi ý.</p>
            </div>
            <label className="correction-input">
              <span>Câu trả lời của bạn</span>
              <input
                value={answer}
                disabled={checked}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                placeholder="Nhập nghĩa, pinyin hoặc đáp án..."
                autoComplete="off"
              />
            </label>
            <button
              className="hint-toggle"
              type="button"
              onClick={toggleHint}
            >
              {hint.visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {" "}
              {hint.visible ? "Ẩn gợi ý" : "Mở gợi ý"}
            </button>
            {hint.visible && (
              <div className="correction-hint">
                <Sparkles size={17} />
                <p>{mistake.explanation}</p>
              </div>
            )}
            {checked && (
              <div className={`correction-result ${correct ? "correct" : "wrong"}`}>
                {correct
                  ? <CheckCircle2 size={22} />
                  : <RotateCcw size={22} />}
                <div>
                  <strong>
                    {correct
                      ? hint.used
                        ? "Đúng sau khi đã mở gợi ý · chuỗi không tăng"
                        : "Hoàn thành một lượt tự gọi local"
                      : `Đáp án chuẩn: ${mistake.correctAnswer}`}
                  </strong>
                  <p>{mistake.explanation}</p>
                </div>
              </div>
            )}
            <footer>
              <span>
                <History size={15} /> Gặp lần cuối{" "}
                {new Date(mistake.lastAttemptAt).toLocaleDateString("vi-VN")}
              </span>
              {checked ? (
                <button
                  className={correct ? "primary-button" : "secondary-button"}
                  type="button"
                  onClick={resetAttempt}
                >
                  {correct
                    ? hint.used
                      ? "Thử lại không gợi ý"
                      : mistake.resolved
                        ? "Hoàn tất practice local"
                        : "Củng cố lần tiếp theo"
                    : "Thử lại"}
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={!answer.trim()}
                  type="button"
                  onClick={submit}
                >
                  Kiểm tra local <ArrowRight size={17} />
                </button>
              )}
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
