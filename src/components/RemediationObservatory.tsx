import { RemediationAtlas } from "./RemediationAtlas";
import {
  AudioWaveform,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenText,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Ear,
  Eye,
  EyeOff,
  Languages,
  Lightbulb,
  Map,
  Mic2,
  Orbit,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  selectRemediationSession,
  summarizeRemediationResults,
  type RemediationObservatoryFeedback,
  type RemediationObservatoryItem,
  type RemediationObservatoryResult,
  type RemediationObservatorySkill,
} from "../mistakes/remediationObservatory";

type ObservatoryPhase = "map" | "attempt" | "feedback" | "summary";

type RemediationObservatoryProps = {
  items: readonly RemediationObservatoryItem[];
  resolvedCount: number;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (
    item: RemediationObservatoryItem,
    answer: string,
    usedHint: boolean,
  ) => Promise<RemediationObservatoryFeedback>;
  onSpeak?: (text: string) => void;
};

function SkillGlyph({
  skill,
  size = 22,
}: {
  skill: RemediationObservatorySkill;
  size?: number;
}) {
  if (skill === "listening") return <Ear size={size} />;
  if (skill === "pronunciation") return <AudioWaveform size={size} />;
  if (skill === "speaking") return <Mic2 size={size} />;
  if (skill === "grammar") return <BookOpen size={size} />;
  if (skill === "vocabulary") return <Languages size={size} />;
  if (skill === "reading") return <BookOpenText size={size} />;
  if (skill === "writing") return <PenLine size={size} />;
  return <CircleHelp size={size} />;
}

function AstralBackdrop() {
  return (
    <div className="rem-astral-backdrop" aria-hidden="true">
      <span className="rem-star-field" />
      <span className="rem-horizon-glow" />
      <span className="rem-side-instrument rem-side-instrument--left" />
      <span className="rem-side-instrument rem-side-instrument--right" />
      <span className="rem-celestial-line rem-celestial-line--one" />
      <span className="rem-celestial-line rem-celestial-line--two" />
    </div>
  );
}

function SessionRail({
  total,
  current,
  results,
}: {
  total: number;
  current: number;
  results: readonly RemediationObservatoryResult[];
}) {
  return (
    <div className="rem-session-rail" aria-label={`Tiến độ ${Math.min(current + 1, total)} trên ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const result = results[index];
        const state = result
          ? result.resolved ? "resolved" : "retry"
          : index === current ? "active" : "pending";
        return (
          <span className={`rem-session-stop rem-session-stop--${state}`} key={index}>
            <i>{result ? result.resolved ? <Check size={12} /> : <CircleAlert size={12} /> : index + 1}</i>
            {index < total - 1 && <b />}
          </span>
        );
      })}
    </div>
  );
}

function AttemptView({
  item,
  answer,
  hintVisible,
  current,
  total,
  results,
  submitting,
  error,
  onAnswer,
  onToggleHint,
  onSubmit,
  onSpeak,
  onExit,
}: {
  item: RemediationObservatoryItem;
  answer: string;
  hintVisible: boolean;
  current: number;
  total: number;
  results: readonly RemediationObservatoryResult[];
  submitting: boolean;
  error?: string | null;
  onAnswer: (answer: string) => void;
  onToggleHint: () => void;
  onSubmit: () => void;
  onSpeak?: (text: string) => void;
  onExit: () => void;
}) {
  return (
    <section className="rem-session-view rem-attempt-view" aria-labelledby="rem-session-title">
      <header className="rem-session-heading">
        <button className="rem-icon-action" type="button" onClick={onExit} aria-label="Thoát lượt hóa giải"><X size={20} /></button>
        <div><span className="rem-session-emblem" aria-hidden="true"><Orbit size={30} /></span><h1 id="rem-session-title">Tái đấu</h1><p>{current + 1} / {total}</p></div>
        <span className="rem-live-mark"><i /> LƯỢT ĐANG DIỄN RA</span>
      </header>

      <div className="rem-session-body">
        <div className="rem-context-pills">
          <span><Map size={15} /> {item.originLabel} · {item.originDetail}</span>
          <span><ShieldCheck size={15} /> {item.skillLabel}</span>
        </div>

        <section className="rem-question-card">
          <span className="rem-question-type">{item.instruction || item.kindLabel}</span>
          <h2>{item.prompt}</h2>
          {item.promptMeta && <p>{item.promptMeta}</p>}
          {item.spokenText && onSpeak && (
            <button className="rem-listen-action" type="button" onClick={() => onSpeak(item.spokenText!)}>
              <Volume2 size={18} /> Nghe lại
            </button>
          )}
        </section>

        {hintVisible && (
          <aside className="rem-hint-panel" role="note">
            <Lightbulb size={18} /><span><strong>Gợi ý đã được ghi nhận</strong>{item.hint}</span>
          </aside>
        )}

        {item.options.length > 0 ? (
          <fieldset className="rem-answer-field">
            <legend>Chọn một đáp án</legend>
            <div className="rem-answer-grid" role="radiogroup" aria-label="Các phương án">
              {item.options.map((option, index) => (
                <button
                  className={[
                    answer === option ? "is-selected" : "",
                    /^[\p{Script=Han}\s。，！？、]+$/u.test(option) && option.length <= 8 ? "is-compact" : "is-prose",
                  ].filter(Boolean).join(" ")}
                  key={`${item.id}:${option}`}
                  type="button"
                  role="radio"
                  aria-checked={answer === option}
                  onClick={() => onAnswer(option)}
                >
                  <span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <label className="rem-text-answer">
            <span>Câu trả lời của bạn</span>
            <input
              autoComplete="off"
              value={answer}
              placeholder="Tự nhập đáp án..."
              onChange={(event) => onAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && answer.trim()) onSubmit();
              }}
            />
          </label>
        )}

        {error && <div className="rem-inline-error" role="alert"><CircleAlert size={17} /> {error}</div>}
      </div>

      <footer className="rem-session-actions">
        <button className="rem-secondary-action" type="button" onClick={onToggleHint}>
          {hintVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          {hintVisible ? "Ẩn gợi ý" : "Cần gợi ý"}
        </button>
        <button className="rem-primary-action" type="button" disabled={!answer.trim() || submitting} onClick={onSubmit}>
          {submitting ? "Đang kiểm tra..." : "Kiểm tra"} <ArrowRight size={18} />
        </button>
      </footer>

      <div className="rem-session-statusbar">
        <span><CircleAlert size={17} /> Tiến trình sai sót</span>
        <SessionRail total={total} current={current} results={results} />
        <button type="button" onClick={onExit}><ArrowLeft size={15} /> Thoát</button>
      </div>
    </section>
  );
}

function FeedbackView({
  item,
  feedback,
  current,
  total,
  results,
  onNext,
  onExit,
}: {
  item: RemediationObservatoryItem;
  feedback: RemediationObservatoryFeedback;
  current: number;
  total: number;
  results: readonly RemediationObservatoryResult[];
  onNext: () => void;
  onExit: () => void;
}) {
  const positive = feedback.outcome === "correct";
  const displayedCorrectAnswer = feedback.correctAnswer ?? (positive ? feedback.answer : null);
  return (
    <section className="rem-session-view rem-feedback-view" aria-labelledby="rem-feedback-title">
      <header className="rem-session-heading">
        <button className="rem-icon-action" type="button" onClick={onExit} aria-label="Thoát lượt hóa giải"><X size={20} /></button>
        <div><span className="rem-session-emblem" aria-hidden="true"><Orbit size={30} /></span><h1 id="rem-feedback-title">Giải lỗi</h1><p>{current + 1} / {total}</p></div>
        <span className="rem-live-mark"><i /> ĐÃ GHI NHẬN</span>
      </header>

      <div className="rem-session-body rem-feedback-body">
        <article className={`rem-feedback-card ${positive ? "is-positive" : "is-negative"}`}>
          <section className="rem-feedback-answer">
            <small>KẾT QUẢ</small>
            <div className="rem-feedback-verdict">
              <span className="rem-result-seal">{positive ? <CheckCircle2 size={29} /> : <XCircle size={29} />}</span>
              <strong>{positive ? "Chính xác" : "Chưa đúng"}</strong>
            </div>
            <h2>{item.prompt}</h2>
            {item.promptMeta && <p>{item.promptMeta}</p>}
            <div className="rem-answer-comparison">
              {displayedCorrectAnswer && <span><small>ĐÁP ÁN ĐÚNG</small><strong>{displayedCorrectAnswer}</strong></span>}
            </div>
          </section>
          <section className="rem-feedback-explanation">
            <article><Lightbulb size={19} /><div><strong>Vì sao?</strong><p>{feedback.explanation}</p></div></article>
            <article><CircleAlert size={19} /><div><strong>Bạn đã trả lời</strong><p>{feedback.answer}</p>{!positive && displayedCorrectAnswer && <p>Đối chiếu với đáp án đúng: {displayedCorrectAnswer}</p>}</div></article>
            <article><BookOpenText size={19} /><div><strong>Luyện lại trong ngữ cảnh</strong><p>{item.originLabel} · {item.originDetail}. Đọc lại câu hỏi và tự giải thích nghĩa trước lượt tiếp theo.</p></div></article>
          </section>
        </article>
      </div>

      <footer className="rem-session-actions rem-feedback-actions">
        <span>{feedback.usedHint ? <Eye size={16} /> : <ShieldCheck size={16} />}{feedback.usedHint ? "Đã dùng gợi ý" : "Không dùng gợi ý"}</span>
        <button className="rem-primary-action" type="button" onClick={onNext}>
          {current + 1 < total ? "Sang lỗi tiếp theo" : "Xem kết quả"} <ArrowRight size={18} />
        </button>
      </footer>

      <div className="rem-session-statusbar">
        <span>{feedback.usedHint ? <Eye size={16} /> : <ShieldCheck size={16} />}{feedback.usedHint ? "Đã dùng gợi ý" : "Không dùng gợi ý"}</span>
        <SessionRail total={total} current={current} results={results} />
        <button type="button" onClick={onExit}><ArrowLeft size={15} /> Thoát</button>
      </div>
    </section>
  );
}

function SummaryView({
  results,
  onRetry,
  onMap,
}: {
  results: readonly RemediationObservatoryResult[];
  onRetry: () => void;
  onMap: () => void;
}) {
  const summary = summarizeRemediationResults(results);
  const visibleSkillRows = summary.skills.length <= 3
    ? summary.skills
    : [
        ...summary.skills.slice(0, 2),
        {
          ...summary.skills[2]!,
          label: "Kỹ năng khác",
          total: summary.skills.slice(2).reduce((sum, row) => sum + row.total, 0),
          resolved: summary.skills.slice(2).reduce((sum, row) => sum + row.resolved, 0),
        },
      ];
  return (
    <section className="rem-session-view rem-summary-view" aria-labelledby="rem-summary-title">
      <header className="rem-session-heading rem-summary-heading">
        <span className="rem-summary-orbit"><Orbit size={24} /></span>
        <div><span className="rem-session-emblem" aria-hidden="true"><Orbit size={30} /></span><h1 id="rem-summary-title">Hóa giải</h1><p>Đã xử lý {summary.total} / {summary.total}</p></div>
        <span className="rem-live-mark"><i /> LƯỢT HOÀN TẤT</span>
      </header>

      <div className="rem-session-body rem-summary-body">
        <article className="rem-summary-card">
          <div className="rem-summary-metrics">
            <div className="rem-summary-gauge is-resolved">
              <span><ShieldCheck size={31} /></span>
              <strong>{summary.resolved}</strong>
              <small>đã hóa giải</small>
            </div>
            <div className="rem-summary-gauge is-retry">
              <span><RotateCcw size={29} /></span>
              <strong>{summary.retry}</strong>
              <small>cần luyện lại</small>
            </div>
          </div>
          <div className="rem-summary-details">
            <header><div><span>KẾT QUẢ THEO KỸ NĂNG</span><h2>{summary.retry > 0 ? "Vẫn còn tín hiệu cần luyện" : "Lượt hóa giải đã hoàn tất"}</h2></div></header>
            <div className="rem-skill-results">
              {visibleSkillRows.map((row) => (
                <article key={row.skill}>
                  <span className="rem-result-skill-icon"><SkillGlyph skill={row.skill} size={20} /></span>
                  <strong>{row.label}</strong>
                  <small>{row.resolved}/{row.total}</small>
                  <i className={row.resolved === row.total ? "is-resolved" : "is-retry"}>{row.resolved === row.total ? <Check size={15} /> : <CircleAlert size={15} />}</i>
                </article>
              ))}
            </div>
          </div>
        </article>

        <div className="rem-summary-notes">
          <article><CheckCircle2 size={22} /><div><strong>{summary.unassistedCorrect} câu đúng không gợi ý</strong><p>Chỉ các lượt này mới đủ điều kiện hóa giải lỗi hiện tại.</p></div></article>
          <article><RotateCcw size={22} /><div><strong>{summary.retry} lỗi sẽ quay lại</strong><p>Lượt sai hoặc có gợi ý được giữ lại cho lần ôn tiếp theo.</p></div></article>
        </div>
      </div>

      <footer className="rem-session-actions rem-summary-actions" />

      <div className="rem-session-statusbar rem-summary-statusbar">
        <button type="button" onClick={onMap}><CheckCircle2 size={16} /> Kết quả đã tự động lưu</button>
        <SessionRail total={summary.total} current={summary.total} results={results} />
        <div>
          {summary.retry > 0 && <button className="rem-secondary-action" type="button" onClick={onRetry}><RotateCcw size={17} /> Luyện tiếp {summary.retry} lỗi</button>}
          <Link className="rem-primary-action" to="/path">Về Thiên Lộ <ArrowRight size={18} /></Link>
        </div>
      </div>
    </section>
  );
}

export function RemediationObservatory({
  items,
  resolvedCount,
  submitting = false,
  error,
  onSubmit,
  onSpeak,
}: RemediationObservatoryProps) {
  const [phase, setPhase] = useState<ObservatoryPhase>("map");
  const [session, setSession] = useState<readonly RemediationObservatoryItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState<RemediationObservatoryFeedback | null>(null);
  const [results, setResults] = useState<readonly RemediationObservatoryResult[]>([]);

  const currentItem = session[current] ?? null;
  const retryItems = useMemo(() => session.filter((item) => {
    const result = results.find((entry) => entry.itemId === item.id);
    return result && !result.resolved;
  }), [results, session]);

  const resetQuestion = () => {
    setAnswer("");
    setHintVisible(false);
    setHintUsed(false);
    setFeedback(null);
  };

  const start = () => {
    const selected = selectRemediationSession(items);
    if (selected.length === 0) return;
    setSession(selected);
    setResults([]);
    setCurrent(0);
    resetQuestion();
    setPhase("attempt");
  };

  const submitAnswer = async () => {
    if (!currentItem || !answer.trim() || submitting) return;
    try {
      const nextFeedback = await onSubmit(currentItem, answer.trim(), hintUsed);
      const result: RemediationObservatoryResult = {
        ...nextFeedback,
        itemId: currentItem.id,
        skill: currentItem.skill,
        skillLabel: currentItem.skillLabel,
      };
      setFeedback(nextFeedback);
      setResults((currentResults) => [
        ...currentResults.filter((entry) => entry.itemId !== currentItem.id),
        result,
      ]);
      setPhase("feedback");
    } catch {
      // The adapter exposes the actionable, localized error beside the answer.
    }
  };

  const next = () => {
    if (current + 1 >= session.length) {
      setPhase("summary");
      return;
    }
    setCurrent((value) => value + 1);
    resetQuestion();
    setPhase("attempt");
  };

  const exitToMap = () => {
    setPhase("map");
    setSession([]);
    setResults([]);
    setCurrent(0);
    resetQuestion();
  };

  const retry = () => {
    if (retryItems.length === 0) {
      exitToMap();
      return;
    }
    setSession(retryItems);
    setResults([]);
    setCurrent(0);
    resetQuestion();
    setPhase("attempt");
  };

  return (
    <div className="content-page rem-observatory rem-celestial" data-rem-phase={phase}>
      <AstralBackdrop />
      {phase === "map" && <RemediationAtlas items={items} resolvedCount={resolvedCount} onStart={start} />}
      {phase === "attempt" && currentItem && (
        <AttemptView
          item={currentItem}
          answer={answer}
          hintVisible={hintVisible}
          current={current}
          total={session.length}
          results={results}
          submitting={submitting}
          error={error}
          onAnswer={setAnswer}
          onToggleHint={() => {
            setHintVisible((visible) => !visible);
            setHintUsed(true);
          }}
          onSubmit={() => void submitAnswer()}
          onSpeak={onSpeak}
          onExit={exitToMap}
        />
      )}
      {phase === "feedback" && currentItem && feedback && (
        <FeedbackView
          item={currentItem}
          feedback={feedback}
          current={current}
          total={session.length}
          results={results}
          onNext={next}
          onExit={exitToMap}
        />
      )}
      {phase === "summary" && <SummaryView results={results} onRetry={retry} onMap={exitToMap} />}
    </div>
  );
}
