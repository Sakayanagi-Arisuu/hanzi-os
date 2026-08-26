import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ListChecks,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useSystemFeedback } from "../components/SystemFeedback";
import { isMistakeFromActivePathContent } from "../lib/adaptive";
import { makeIdempotencyKey } from "../lib/evidence";
import {
  evaluateRemediationAttempt,
  toggleRemediationHint,
} from "../lib/remediation";
import { useLearning } from "../store/LearningStore";
import { emitSystemSignal } from "../system/systemSignals";
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
    () => visibleMistakes.filter((mistake) =>
      !mistake.resolved && mistake.correctedStreak < 1
    ),
    [visibleMistakes],
  );
  const resolved = useMemo(
    () => visibleMistakes.filter((mistake) =>
      mistake.resolved || mistake.correctedStreak >= 1
    ),
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
  const [attemptedIds, setAttemptedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [repairedIds, setRepairedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const mistake = checked && submittedMistake
    ? submittedMistake
    : unresolved.find((item) => item.id === activeId) ?? unresolved[0];

  const nextSessionMistake = useMemo(() => {
    if (!submittedMistake) return null;
    const candidates = unresolved.filter((item) =>
      item.id !== submittedMistake.id && !attemptedIds.has(item.id)
    );
    return candidates.find((item) => item.skill === submittedMistake.skill)
      ?? candidates[0]
      ?? null;
  }, [attemptedIds, submittedMistake, unresolved]);

  useEffect(() => {
    if (!checked) return;
    const frame = window.requestAnimationFrame(() => {
      const region = scrollRegionRef.current;
      if (!region) return;
      region.scrollTo({
        top: region.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [checked]);

  const resetAttempt = (nextId?: string) => {
    const latest = submittedMistake
      ? state.mistakes.find((item) => item.id === submittedMistake.id)
      : null;
    if (nextId) {
      setActiveId(nextId);
    } else if (latest?.resolved) {
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
    window.requestAnimationFrame(() => {
      scrollRegionRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
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
    setAttemptedIds((current) => new Set(current).add(mistake.id));
    if (attempt.resolved) {
      setRepairedIds((current) => new Set(current).add(mistake.id));
    }
    actions.resolveMistake(
      mistake.id,
      isCorrect,
      answer,
      attemptKey,
      hint.used,
    );
    emitSystemSignal({
      type: attempt.resolved ? "mistake.resolved" : isCorrect ? "learning.correct" : "learning.retry",
      sourceId: `mistake:${mistake.id}`,
      eventId: `${attemptKey}:system-feedback`,
    });
    if (isCorrect) {
      notify(
        hint.used
          ? "Đã hiểu cách làm. Lỗi này sẽ được kiểm tra lại ở một lượt sau."
          : "Đã xử lý lỗi bằng một lượt tự trả lời độc lập; tiếp tục lộ trình để gặp kỹ năng trong ngữ cảnh khác.",
      );
    }
  };

  const chooseMistake = (id: string) => {
    resetAttempt(id);
  };

  const toggleHint = () => {
    setHint(toggleRemediationHint);
  };

  if (!unresolved.length && !checked) {
    return (
      <div className="mistake-focus-empty">
        <div className="mistake-focus-empty-icon"><ShieldCheck size={34} /></div>
        <span className="system-kicker">NGHỊCH CẢNH LỤC</span>
        <h1>Không còn lỗi cần luyện lại</h1>
        <p>Lỗi mới sẽ tự xuất hiện tại đây sau khi bạn học.</p>
        <div className="mistake-focus-empty-actions">
          <Link className="primary-button" to="/path">
            Tiếp tục Thiên Lộ <ArrowRight size={17} />
          </Link>
          <Link className="mistake-focus-text-link" to="/review">
            Ôn tại Ký Ức Trận
          </Link>
        </div>
        {resolved.length > 0 && (
          <span className="mistake-focus-empty-note">
            <CheckCircle2 size={15} /> {resolved.length} lỗi đã hoàn tất
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="content-page mistakes-page mistake-focus-page">
      <header className="mistake-focus-heading">
        <div>
          <span className="system-kicker">NGHỊCH CẢNH LỤC</span>
          <h1>Luyện lại lỗi đang vướng</h1>
          <p>{unresolved.length} lỗi đang chờ · tập trung từng lỗi một.</p>
        </div>
        <div className="mistake-focus-goal" aria-label="Tiến độ lượt luyện">
          <ShieldCheck size={20} />
          <span>
            <strong>{repairedIds.size} lỗi đã xử lý</strong>
            <small>không lặp lại ngay</small>
          </span>
        </div>
      </header>

      <div className="mistake-focus-workspace">
        <div className="mistake-focus-toolbar">
          <details className="mistake-focus-queue">
            <summary>
              <ListChecks size={18} />
              Đổi lỗi · {Math.max(1, unresolved.findIndex((item) => item.id === mistake?.id) + 1)}/{unresolved.length}
            </summary>
            <div className="mistake-focus-queue-panel">
              <div className="mistake-focus-queue-list">
                {unresolved.map((item, index) => (
                  <button
                    className={mistake?.id === item.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => chooseMistake(item.id)}
                  >
                    <span>{index + 1}</span>
                    <strong>{item.prompt}</strong>
                    <small>{skillLabels[item.skill]} · gặp {item.occurrences} lần</small>
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>

        {mistake && (
          <section className="mistake-focus-trial" aria-labelledby="mistake-focus-prompt">
            <header className="mistake-focus-trial-header">
              <span>{skillLabels[mistake.skill]}</span>
              <strong className={`mistake-focus-phase${checked ? " feedback" : ""}`}>
                {checked ? "Hiểu lỗi" : "Tự trả lời"}
              </strong>
            </header>

            <div className="mistake-focus-scroll" ref={scrollRegionRef}>
              <div className="mistake-focus-prompt">
                <span>{kindLabels[mistake.kind]}</span>
                <h2 id="mistake-focus-prompt">{mistake.prompt}</h2>
                <p>Tự trả lời trước khi mở gợi ý.</p>
              </div>

              <div className="mistake-focus-supports">
                <button type="button" onClick={toggleHint} disabled={checked}>
                  {hint.visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  {hint.visible ? "Ẩn gợi ý" : "Cần gợi ý"}
                </button>
              </div>

              {hint.visible && (
                <div className="mistake-focus-hint" role="note">
                  <Sparkles size={19} />
                  <div><p>{mistake.explanation}</p><small>Gợi ý được ghi nhận; lỗi này sẽ được kiểm tra lại sau.</small></div>
                </div>
              )}

              <label className="mistake-focus-input">
                <span>Câu trả lời của bạn</span>
                <input
                  value={answer}
                  disabled={checked}
                  onChange={(event) => setAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submit();
                  }}
                  placeholder="Tự nhập đáp án..."
                  autoComplete="off"
                />
              </label>

              {checked && (
                <div className={`mistake-focus-result ${correct ? "correct" : "incorrect"}`} role="status" aria-live="polite">
                  {correct ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  <div>
                    <strong>
                      {correct
                        ? hint.used
                          ? "Đã hiểu cách làm"
                          : "Đã xử lý lỗi này"
                        : "Chưa đúng — xem điểm cần sửa"}
                    </strong>
                    <p>
                      {correct
                        ? hint.used
                          ? "Lỗi này sẽ quay lại ở lượt sau, không lặp ngay."
                          : `Câu này không lặp lại ngay. Tiếp tục ${mistake.lessonId === "review" ? "Ký Ức Trận" : "Thiên Lộ"} để gặp kỹ năng trong ngữ cảnh khác.`
                        : `Đáp án đúng: ${mistake.correctAnswer}. ${mistake.explanation}`}
                    </p>
                  </div>
                </div>
              )}

            </div>

            <footer className="mistake-focus-actions">
              {checked ? (
                nextSessionMistake ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => resetAttempt(nextSessionMistake.id)}
                  >
                    {nextSessionMistake.skill === mistake.skill
                      ? "Câu khác cùng kỹ năng"
                      : "Lỗi tiếp theo"}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <Link
                    className="primary-button"
                    to={mistake.lessonId === "review" ? "/review" : "/path"}
                  >
                    {mistake.lessonId === "review" ? "Trở lại Ký Ức Trận" : "Tiếp tục Thiên Lộ"}
                    <ArrowRight size={17} />
                  </Link>
                )
              ) : (
                <button
                  className="primary-button"
                  disabled={!answer.trim()}
                  type="button"
                  onClick={submit}
                >
                  Kiểm tra <ArrowRight size={17} />
                </button>
              )}
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
