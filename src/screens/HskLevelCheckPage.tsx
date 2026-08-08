import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleCheck,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { CONTENT_VERSION } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../lib/storageKeys";
import { useLearning } from "../store/LearningStore";
import { emitSystemSignal } from "../system/systemSignals";

export type HskLevelCheckSkill = "listening" | "reading" | "vocabulary" | "grammar";

type LevelCheckItem = {
  id: string;
  sourceItemVersion: string;
  activityVersion: string;
  skill: HskLevelCheckSkill;
  construct: string;
  promptVi: string;
  stimulusText: string;
  syntheticTtsText: string | null;
  options: Array<{ optionId: string; text: string }>;
  correctOptionId: string;
  explanationVi: string;
  sourceLessonId: string;
  sourceUnitId: string;
};

export type HskLevelCheckConfig = {
  level: 1 | 2 | 3 | 4;
  lessonCount: number;
  duration: string;
  distribution: string;
  bankId: string;
  formVersion: string;
  storageKey: string;
  items: readonly LevelCheckItem[];
  disclosure: { listeningVi: string; resultVi: string };
  practiceDestinations: Record<HskLevelCheckSkill, { lessonId: string; label: string }>;
};

type Phase = "intro" | "question" | "result";
type Resume = {
  version: 1;
  contentVersion: string;
  formVersion: string;
  bankId: string;
  sessionId: string;
  phase: Phase;
  index: number;
  selected: string | null;
  checked: boolean;
  answers: Record<string, string>;
};

const skillLabels: Record<HskLevelCheckSkill, string> = {
  listening: "Nghe · TTS tổng hợp",
  reading: "Đọc hiểu",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp trong ngữ cảnh",
};

const validAnswers = (value: unknown, items: readonly LevelCheckItem[]): value is Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([itemId, optionId]) => {
    const item = items.find((candidate) => candidate.id === itemId);
    return typeof optionId === "string" && Boolean(item?.options.some((option) => option.optionId === optionId));
  });
};

const loadResume = (config: HskLevelCheckConfig): Resume | null => {
  const raw = readLocalStorage(config.storageKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Resume>;
    const current = config.items[value.index ?? -1];
    const selectedValid = value.selected === null
      || (typeof value.selected === "string" && Boolean(current?.options.some((option) => option.optionId === value.selected)));
    if (
      value.version !== 1
      || value.contentVersion !== CONTENT_VERSION
      || value.formVersion !== config.formVersion
      || value.bankId !== config.bankId
      || typeof value.sessionId !== "string"
      || !["intro", "question", "result"].includes(value.phase ?? "")
      || !Number.isInteger(value.index)
      || (value.index ?? -1) < 0
      || (value.index ?? config.items.length) >= config.items.length
      || typeof value.checked !== "boolean"
      || !selectedValid
      || !validAnswers(value.answers, config.items)
    ) throw new Error("stale HSK level-check resume");
    return value as Resume;
  } catch {
    removeLocalStorage(config.storageKey);
    return null;
  }
};

export function HskLevelCheckPage({ config }: { config: HskLevelCheckConfig }) {
  const { state, actions } = useLearning();
  const initial = useMemo(() => loadResume(config), [config]);
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "intro");
  const [index, setIndex] = useState(initial?.index ?? 0);
  const [selected, setSelected] = useState<string | null>(initial?.selected ?? null);
  const [checked, setChecked] = useState(initial?.checked ?? false);
  const [answers, setAnswers] = useState<Record<string, string>>(initial?.answers ?? {});
  const [sessionId, setSessionId] = useState(initial?.sessionId ?? (() => makeIdempotencyKey(`hsk${config.level}-level-check-session`)));
  const current = config.items[index];
  const levelCode = `hsk${config.level}`;

  useEffect(() => {
    writeLocalStorage(config.storageKey, JSON.stringify({
      version: 1,
      contentVersion: CONTENT_VERSION,
      formVersion: config.formVersion,
      bankId: config.bankId,
      sessionId,
      phase,
      index,
      selected,
      checked,
      answers,
    } satisfies Resume));
  }, [answers, checked, config.bankId, config.formVersion, config.storageKey, index, phase, selected, sessionId]);

  const start = () => {
    emitSystemSignal({ type: "level-check.started", sourceId: `level-check:${levelCode}` });
    setPhase("question");
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers({});
  };

  const restart = () => {
    setSessionId(makeIdempotencyKey(`${levelCode}-level-check-session`));
    setPhase("intro");
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers({});
  };

  const check = () => {
    if (!current || selected === null || checked) return;
    const correct = selected === current.correctOptionId;
    setAnswers((value) => ({ ...value, [current.id]: selected }));
    setChecked(true);
    actions.recordPracticeEvidence({
      idempotencyKey: `${sessionId}:${current.id}`,
      activityVersion: current.activityVersion,
      source: "diagnostic",
      method: "diagnostic-selection",
      activityId: `${levelCode}-level-check:${current.id}`,
      skill: current.skill,
      outcome: correct ? "correct" : "incorrect",
      score: correct ? 100 : 0,
      metadata: {
        formVersion: config.formVersion,
        sourceItemVersion: current.sourceItemVersion,
        selectedOptionId: selected,
        correctOptionId: current.correctOptionId,
        construct: current.construct,
        sourceLessonId: current.sourceLessonId,
        sourceUnitId: current.sourceUnitId,
        syntheticTts: current.syntheticTtsText !== null,
        humanReviewed: false,
        measurementEligible: false,
        masteryEligible: false,
        prerequisiteWaiverEligible: false,
        priorExposure: state.evidence.some((item) => item.activityId === `${levelCode}-level-check:${current.id}`),
      },
    });
    emitSystemSignal({
      type: correct ? "learning.correct" : "learning.retry",
      sourceId: `level-check:${levelCode}:item:${current.id}`,
      eventId: `${sessionId}:feedback:${current.id}`,
    });
  };

  const next = () => {
    if (index < config.items.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    setPhase("result");
    emitSystemSignal({
      type: "level-check.completed",
      sourceId: `level-check:${levelCode}:result`,
      eventId: `${sessionId}:result`,
      message: `Đại khảo HSK${config.level} hoàn tất. Bản đồ bù khuyết đã được tạo.`,
    });
  };

  const skillResults = useMemo(() => Object.fromEntries(
    (Object.keys(skillLabels) as HskLevelCheckSkill[]).map((skill) => {
      const items = config.items.filter((item) => item.skill === skill);
      return [skill, {
        correct: items.filter((item) => answers[item.id] === item.correctOptionId).length,
        total: items.length,
      }];
    }),
  ) as Record<HskLevelCheckSkill, { correct: number; total: number }>, [answers, config.items]);

  if (phase === "intro") return (
    <div className={`assessment-intro ${levelCode}-level-check`} data-testid={`${levelCode}-level-check-intro`}>
      <div className="assessment-core"><BrainCircuit size={38} /><span /></div>
      <span className="system-kicker">ĐẠI KHẢO CẢNH GIỚI HSK{config.level} · {config.items.length} CÂU</span>
      <h1>Đại Khảo Cảnh Giới HSK{config.level}</h1>
      <p>Kiểm tra toàn bộ phần nghe, đọc, từ vựng và ngữ pháp đã học trong {config.lessonCount} bài HSK{config.level}. Phiên đang làm được lưu trên thiết bị để bạn có thể quay lại.</p>
      <div className="assessment-facts">
        <span><Gauge size={18} /><strong>{config.duration}</strong><small>thời lượng gợi ý</small></span>
        <span><BrainCircuit size={18} /><strong>{config.items.length} câu</strong><small>{config.distribution}</small></span>
        <span><ShieldCheck size={18} /><strong>Bài tự luyện</strong><small>có giải thích sau mỗi câu</small></span>
      </div>
      <p>Phần nghe dùng giọng máy tổng hợp. Kết quả giúp bạn chọn vùng nên ôn tiếp và không thay thế bài thi HSK chính thức.</p>
      <div className="assessment-actions">
        <Link className="secondary-button" to="/path">Quay lại lộ trình</Link>
        <button className="primary-button" type="button" onClick={start}>Bắt đầu tự kiểm tra <ArrowRight size={18} /></button>
      </div>
    </div>
  );

  if (phase === "result") {
    const totalCorrect = config.items.filter((item) => answers[item.id] === item.correctOptionId).length;
    const weakest = (Object.entries(skillResults) as Array<[HskLevelCheckSkill, { correct: number; total: number }]>).sort(
      (left, right) => left[1].correct / left[1].total - right[1].correct / right[1].total,
    )[0]![0];
    const destination = config.practiceDestinations[weakest];
    return (
      <div className="assessment-result uncalibrated-result" data-testid={`${levelCode}-level-check-result`}>
        <div className="result-sigil passed"><CircleCheck size={38} /><span /></div>
        <span className="system-kicker">ĐẠI KHẢO HSK{config.level} · TỰ KIỂM HOÀN TẤT</span>
        <h1>Bản Đồ Bù Khuyết HSK{config.level}</h1>
        <div className="assessment-score"><strong>{totalCorrect}/{config.items.length}</strong><span> câu đúng quan sát</span></div>
        <p>Kết quả này giúp bạn chọn vùng nên ôn tiếp; nó không phải điểm thi HSK chính thức.</p>
        <div className="mastery-skill-list">
          {(Object.entries(skillResults) as Array<[HskLevelCheckSkill, { correct: number; total: number }]>).map(([skill, result]) => (
            <div key={skill}><span>{skillLabels[skill]}</span><strong>{result.correct}/{result.total}</strong></div>
          ))}
        </div>
        <div className="assessment-destination">
          <small>VÙNG NÊN ÔN TRƯỚC</small>
          <strong>{destination.label}</strong>
          <span>Kết quả này không thay đổi khóa bài hay trạng thái hoàn thành.</span>
        </div>
        <div className="assessment-actions">
          <button className="secondary-button" type="button" onClick={restart}><RotateCcw size={17} /> Làm form mới</button>
          <Link className="primary-button" to={`/lesson/${destination.lessonId}`}>Ôn vùng gợi ý <ArrowRight size={17} /></Link>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const correct = selected === current.correctOptionId;
  const progress = Math.round(((index + 1) / config.items.length) * 100);
  return (
    <div className={`assessment-live ${levelCode}-level-check`} data-testid={`${levelCode}-level-check-live`}>
      <header>
        <Link className="icon-button" to="/path" aria-label="Rời level check"><ArrowLeft size={20} /></Link>
        <div><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1}/{config.items.length}</span>
      </header>
      <section className="assessment-question">
        <span className="system-kicker"><Sparkles size={15} /> {skillLabels[current.skill]}</span>
        <p>{current.promptVi}</p>
        {current.syntheticTtsText ? <>
          <button className="sound-orb" type="button" onClick={() => speakMandarin(current.syntheticTtsText!, .82, `level-check:${levelCode}:item:${current.id}`)} aria-label="Nghe câu bằng TTS tổng hợp"><Volume2 size={37} /><span /></button>
          <p>Giọng máy tổng hợp dùng để luyện nghe trên thiết bị.</p>
        </> : <h1>{current.stimulusText}</h1>}
        <div className="assessment-options" role="radiogroup" aria-label={`Các lựa chọn cho câu ${index + 1}`}>
          {current.options.map((option, optionIndex) => {
            const optionCorrect = checked && option.optionId === current.correctOptionId;
            const optionWrong = checked && selected === option.optionId && option.optionId !== current.correctOptionId;
            return (
              <button
                className={`${selected === option.optionId ? "selected" : ""} ${optionCorrect ? "correct" : ""} ${optionWrong ? "wrong" : ""}`}
                data-option-id={option.optionId}
                disabled={checked}
                key={option.optionId}
                role="radio"
                aria-checked={selected === option.optionId}
                tabIndex={selected === option.optionId || (!selected && optionIndex === 0) ? 0 : -1}
                type="button"
                onClick={() => setSelected(option.optionId)}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: optionIndex,
                  itemCount: current.options.length,
                  onSelect: (nextIndex) => setSelected(current.options[nextIndex]!.optionId),
                })}
              >
                <span>{option.optionId}</span>
                <strong>{option.text}</strong>
                {optionCorrect ? <Check size={18} /> : optionWrong ? <X size={18} /> : null}
              </button>
            );
          })}
        </div>
      </section>
      <footer className={checked ? (correct ? "correct" : "wrong") : ""}>
        <div>{checked ? <><strong>{correct ? "Chính xác" : `Đáp án: ${current.correctOptionId}`}</strong><p>{current.explanationVi}</p></> : <p>Chọn một phương án. Câu trả lời được lưu theo đúng phiên và phiên bản nội dung.</p>}</div>
        <button className="primary-button" disabled={selected === null} type="button" onClick={checked ? next : check}>
          {checked ? (index === config.items.length - 1 ? "Xem kết quả" : "Câu tiếp theo") : "Xác nhận"} <ArrowRight size={17} />
        </button>
      </footer>
    </div>
  );
}
