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
  Sparkles,
  Telescope,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import {
  buildSevenDayLabels,
  buildSevenDaySignals,
  buildSkillSignals,
  buildSourceSignals,
  countActiveSignals,
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

function MapView({
  items,
  resolvedCount,
  onStart,
}: {
  items: readonly RemediationObservatoryItem[];
  resolvedCount: number;
  onStart: () => void;
}) {
  const priority = selectRemediationSession(items);
  const skillSignals = buildSkillSignals(items);
  const sourceSignals = buildSourceSignals(items);
  const trend = buildSevenDaySignals(items);
  const trendLabels = buildSevenDayLabels();
  const totalSignals = countActiveSignals(items);
  const maxTrend = Math.max(1, ...trend);
  const sourceTotal = Math.max(1, sourceSignals.reduce((sum, source) => sum + source.count, 0));
  const lessonSignals = sourceSignals.find((source) => source.source === "lesson")?.count ?? 0;
  const trendPoints = trend.map((count, index) => {
    const x = 16 + index * 44.5;
    const y = 67 - count / maxTrend * 46;
    return `${x},${y}`;
  }).join(" ");

  return (
    <section className="rem-map-view" aria-labelledby="rem-map-title">
      <header className="rem-map-heading">
        <span className="rem-map-heading-mark" aria-hidden="true"><Orbit size={29} /></span>
        <div>
          <h1 id="rem-map-title">Bản đồ điểm yếu</h1>
          <p>Dấu vết được tổng hợp từ những lượt học đã chấm.</p>
        </div>
      </header>

      <div className="rem-map-grid">
        <section className="rem-radar-panel" aria-label="Bản đồ kỹ năng đang vướng">
          <div className="rem-radar" aria-hidden="true">
            <span className="rem-radar-ring rem-radar-ring--outer" />
            <span className="rem-radar-ring rem-radar-ring--middle" />
            <span className="rem-radar-ring rem-radar-ring--inner" />
            <span className="rem-radar-axis rem-radar-axis--x" />
            <span className="rem-radar-axis rem-radar-axis--y" />
            <span className="rem-radar-orbit rem-radar-orbit--one" />
            <span className="rem-radar-orbit rem-radar-orbit--two" />
            <span className="rem-radar-core"><ShieldCheck size={43} /><i /></span>
            {skillSignals.slice(0, 5).map((signal, index) => (
              <span
                className={`rem-skill-node rem-skill-node--${index + 1} ${signal.count >= 4 ? "is-high" : signal.count >= 3 ? "is-medium" : "is-low"}`}
                key={signal.skill}
              >
                <i className="rem-node-icon"><SkillGlyph skill={signal.skill} size={27} /></i>
                <b className="rem-node-count">{signal.count}</b>
                <strong className="rem-node-caption">{signal.label}</strong>
              </span>
            ))}
          </div>
          <div className="rem-radar-legend">
            <span><i className="is-cyan" /> {skillSignals.length} vùng đang phát tín hiệu</span>
            <span><i className="is-jade" /> {resolvedCount} dấu vết đã hóa giải</span>
          </div>
        </section>

        <aside className="rem-map-side">
          <section className="rem-signal-summary">
            <span className="rem-summary-compass" aria-hidden="true"><Telescope size={28} /></span>
            <div>
              <h2>{totalSignals} lỗi đang vướng</h2>
              <p>Được đối chiếu liên tục từ lịch sử học thật</p>
            </div>
            <div
              className="rem-signal-dial"
              style={{ "--rem-lesson-share": `${lessonSignals / sourceTotal * 360}deg` } as CSSProperties}
              aria-label={`${lessonSignals} lỗi từ bài học trên tổng ${sourceTotal} lỗi`}
            >
              <span><strong>{totalSignals}</strong><small>TỔNG</small></span>
            </div>
          </section>

          <section className="rem-priority-panel">
            <header><h2>{priority.length} lỗi ưu tiên hôm nay</h2><span><Sparkles size={15} /> TỰ ĐỘNG XẾP HẠNG</span></header>
            <div className="rem-priority-list">
              {priority.length === 0 && (
                <div className="rem-priority-empty">
                  <ShieldCheck size={25} />
                  <strong>Không còn lỗi cần hóa giải</strong>
                  <p>Dấu vết mới sẽ xuất hiện sau một lượt học được chấm.</p>
                </div>
              )}
              {priority.map((item) => (
                <article key={item.id}>
                  <span className="rem-priority-glyph"><SkillGlyph skill={item.skill} size={21} /></span>
                  <div>
                    <strong>{item.skillLabel}</strong>
                    <p>{item.prompt}</p>
                  </div>
                  <small><BookOpenText size={13} /> {item.originLabel} · {item.originDetail}</small>
                  <i>{item.occurrenceCount}</i>
                </article>
              ))}
            </div>
          </section>

          <div className="rem-map-metrics">
            <section>
              <header><span>Nguồn dấu vết</span><BookOpenText size={17} /></header>
              <div className="rem-source-chart">
                <span
                  className="rem-source-orbit"
                  style={{ "--rem-lesson-share": `${lessonSignals / sourceTotal * 360}deg` } as CSSProperties}
                ><i /></span>
                <div>
                  {sourceSignals.map((source) => (
                    <p key={source.source}><i /> {source.label}<strong>{source.count}</strong></p>
                  ))}
                </div>
              </div>
            </section>
            <section>
              <header><span>Dấu vết gần đây · 7 ngày</span><Sparkles size={15} /></header>
              <div className="rem-trend-chart" aria-label="Số nhóm lỗi có lần xuất hiện gần nhất trong bảy ngày">
                <svg viewBox="0 0 300 78" preserveAspectRatio="none" aria-hidden="true">
                  <defs><linearGradient id="remTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4ef2c2" stopOpacity=".2" /><stop offset="1" stopColor="#4ef2c2" stopOpacity="0" /></linearGradient></defs>
                  <polygon points={`16,72 ${trendPoints} 283,72`} fill="url(#remTrendFill)" />
                  <polyline points={trendPoints} fill="none" stroke="#4ef2c2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  {trend.map((count, index) => <circle key={index} cx={16 + index * 44.5} cy={67 - count / maxTrend * 46} r="3" fill="#071821" stroke="#70f9d0" strokeWidth="2" />)}
                </svg>
                <div>{trendLabels.map((label) => <small key={label}>{label}</small>)}</div>
              </div>
            </section>
          </div>
        </aside>
      </div>

      <footer className="rem-map-actions">
        <span><ShieldCheck size={17} /> Một lượt tối đa 5 lỗi · không cộng mastery khi dùng gợi ý</span>
        <button className="rem-primary-action" type="button" disabled={priority.length === 0} onClick={onStart}>
          Bắt đầu hóa giải <ArrowRight size={18} />
        </button>
      </footer>
    </section>
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
                    option.length > 18 ? "is-prose" : "is-compact",
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
            <article><CircleAlert size={19} /><div><strong>Đừng nhầm</strong><p>{positive ? "Một câu đúng có gợi ý chưa phải recall độc lập." : "Lỗi vẫn ở lại hàng đợi và sẽ trở lại trong một lượt sau."}</p></div></article>
            <article><BookOpenText size={19} /><div><strong>Ví dụ</strong><p>{item.promptMeta || `${item.originLabel} · ${item.originDetail}`}</p></div></article>
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
    <div className="content-page rem-observatory" data-rem-phase={phase}>
      <AstralBackdrop />
      {phase === "map" && <MapView items={items} resolvedCount={resolvedCount} onStart={start} />}
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
