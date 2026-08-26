import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CircleCheck,
  Gauge,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { derivePlacementRecommendation } from "../assessment/placementPolicy";
import { CONTENT_VERSION } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import {
  getPlacementGateSessionStorageKey,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "../lib/storageKeys";
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
  placement?: boolean;
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

export const createPlacementGateConfig = (
  config: HskLevelCheckConfig,
): HskLevelCheckConfig => {
  const measuredSkills = ["reading", "vocabulary", "grammar"] as const;
  const skillItems = Object.fromEntries(measuredSkills.map((skill) => [
    skill,
    config.items.filter((item) => item.skill === skill).slice(0, 4),
  ])) as Record<(typeof measuredSkills)[number], LevelCheckItem[]>;
  const items = Array.from({ length: 4 }, (_, index) =>
    measuredSkills.map((skill) => skillItems[skill][index]!),
  ).flat();
  if (items.length !== 12 || items.some((item) => !item)) {
    throw new Error(`HSK${config.level} placement gate requires four items per measured skill`);
  }
  return {
    ...config,
    placement: true,
    duration: "8–12 phút",
    distribution: "4 đọc · 4 từ · 4 ngữ pháp",
    bankId: `${config.bankId}:placement-gate-v1`,
    formVersion: `${config.formVersion}:placement-gate-v1`,
    storageKey: getPlacementGateSessionStorageKey(config.storageKey),
    items,
    disclosure: {
      ...config.disclosure,
      listeningVi: "Khảo Nghiệm Căn Cơ không dùng phần nghe TTS để quyết định tầng.",
    },
  };
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
  updatedAt?: number;
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
    const resume = value as Resume;
    if (resume.phase === "question" && resume.checked) {
      const recordedAnswer = resume.answers[current!.id] ?? resume.selected;
      const answers = recordedAnswer
        ? { ...resume.answers, [current!.id]: recordedAnswer }
        : resume.answers;
      return {
        ...resume,
        phase: resume.index === config.items.length - 1 ? "result" : "question",
        index: resume.index === config.items.length - 1 ? resume.index : resume.index + 1,
        selected: null,
        checked: false,
        answers,
        updatedAt: Date.now(),
      };
    }
    return resume;
  } catch {
    removeLocalStorage(config.storageKey);
    return null;
  }
};

export function HskLevelCheckPage({ config }: { config: HskLevelCheckConfig }) {
  const { state, actions } = useLearning();
  const navigate = useNavigate();
  const initial = useMemo(() => loadResume(config), [config]);
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "intro");
  const [index, setIndex] = useState(initial?.index ?? 0);
  const [selected, setSelected] = useState<string | null>(initial?.selected ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>(initial?.answers ?? {});
  const [sessionId] = useState(initial?.sessionId ?? (() => makeIdempotencyKey(`hsk${config.level}-level-check-session`)));
  const answerCommitLock = useRef(false);
  const current = config.items[index];
  const levelCode = `hsk${config.level}`;
  const assessmentName = "Khảo Nghiệm Căn Cơ";
  const assessmentAction = "Khảo Nghiệm";

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
      checked: false,
      answers,
      updatedAt: Date.now(),
    } satisfies Resume));
  }, [answers, config.bankId, config.formVersion, config.storageKey, index, phase, selected, sessionId]);

  useEffect(() => {
    answerCommitLock.current = false;
  }, [index, phase]);

  const start = () => {
    emitSystemSignal({ type: "level-check.started", sourceId: `level-check:${levelCode}` });
    setPhase("question");
    setIndex(0);
    setSelected(null);
    setAnswers({});
  };

  const commitAnswer = (optionId: string) => {
    if (!current || answerCommitLock.current) return;
    answerCommitLock.current = true;
    const correct = optionId === current.correctOptionId;
    const nextAnswers = { ...answers, [current.id]: optionId };
    const isLastQuestion = index === config.items.length - 1;
    const nextPhase: Phase = isLastQuestion ? "result" : "question";
    const nextIndex = isLastQuestion ? index : index + 1;

    writeLocalStorage(config.storageKey, JSON.stringify({
      version: 1,
      contentVersion: CONTENT_VERSION,
      formVersion: config.formVersion,
      bankId: config.bankId,
      sessionId,
      phase: nextPhase,
      index: nextIndex,
      selected: null,
      checked: false,
      answers: nextAnswers,
      updatedAt: Date.now(),
    } satisfies Resume));

    setAnswers(nextAnswers);
    setSelected(null);
    setIndex(nextIndex);
    setPhase(nextPhase);
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
        selectedOptionId: optionId,
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
    if (isLastQuestion) {
      emitSystemSignal({
        type: "level-check.completed",
        sourceId: `level-check:${levelCode}:result`,
        eventId: `${sessionId}:result`,
        message: `${assessmentName} HSK${config.level} hoàn tất. Điểm khởi hành đã được đề xuất.`,
      });
    }
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
      <span className="system-kicker">{assessmentName.toUpperCase()} HSK{config.level} · {config.items.length} CÂU</span>
      <h1>{assessmentName} HSK{config.level}</h1>
      <p>Khảo sát nghe, đọc, từ vựng và ngữ pháp trong phạm vi {config.lessonCount} bài HSK{config.level}. Phiên đang làm được giữ trên thiết bị để hành giả có thể quay lại đúng câu.</p>
      <div className="assessment-facts">
        <span><Gauge size={18} /><strong>{config.duration}</strong><small>thời lượng gợi ý</small></span>
        <span><BrainCircuit size={18} /><strong>{config.items.length} câu</strong><small>{config.distribution}</small></span>
        <span><ShieldCheck size={18} /><strong>Không lộ đáp án</strong><small>kết quả sau câu cuối</small></span>
      </div>
      <p>{config.disclosure.listeningVi} Kết quả chỉ đề xuất điểm khởi hành trong HANZI.OS, không thay thế bài thi HSK chính thức.</p>
      <div className="assessment-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            actions.skipDiagnostic();
            navigate("/lesson/boot-1");
          }}
        >Ta chưa biết gì · bỏ qua {assessmentAction}</button>
        <button className="primary-button" type="button" onClick={start}>Bắt đầu {assessmentAction} <ArrowRight size={18} /></button>
      </div>
    </div>
  );

  if (phase === "result") {
    const totalCorrect = config.items.filter((item) => answers[item.id] === item.correctOptionId).length;
    const weakest = (Object.entries(skillResults) as Array<[HskLevelCheckSkill, { correct: number; total: number }]>).filter(
      ([, result]) => result.total > 0,
    ).sort(
      (left, right) => left[1].correct / left[1].total - right[1].correct / right[1].total,
    )[0]![0];
    const destination = config.practiceDestinations[weakest];
    const recommendation = derivePlacementRecommendation(
      config.level,
      (Object.entries(skillResults) as Array<[
        HskLevelCheckSkill,
        { correct: number; total: number },
      ]>)
        .filter(([skill]) => skill !== "listening")
        .map(([, result]) => result),
    );
    const recommendationCopy = recommendation.band === "advance"
      ? recommendation.nextAssessmentLevel
        ? `Căn cơ HSK${config.level} đã đủ vững. Muốn xếp tầng cao hơn, hành giả cần tiếp tục ${assessmentAction} HSK${recommendation.nextAssessmentLevel}.`
        : "Căn cơ HSK4 đã đủ vững trong phạm vi ba phương diện được quan sát."
      : recommendation.band === "matched"
        ? `${recommendation.acceptedLevelLabel} là điểm khởi hành phù hợp với kết quả hiện tại.`
        : recommendation.nextAssessmentLevel
          ? `Chưa đủ bằng chứng để nhận HSK${config.level}. Hệ thống cần xác minh tiếp ở HSK${recommendation.nextAssessmentLevel}.`
          : "Nền HSK1 chưa vững; bắt đầu từ HSK0 sẽ an toàn và ít bỏ sót nhất.";
    const acceptPlacement = () => {
      if (recommendation.acceptedStartingLevel === null) return;
      actions.acceptDiagnosticPlacement(
        recommendation.acceptedStartingLevel,
        recommendation.overallAccuracy * 100,
      );
      navigate("/path");
    };
    return (
      <div className="assessment-result uncalibrated-result" data-testid={`${levelCode}-level-check-result`}>
        <div className="result-sigil passed"><CircleCheck size={38} /><span /></div>
        <span className="system-kicker">{assessmentName.toUpperCase()} HSK{config.level} · ĐÃ HOÀN TẤT</span>
        <h1>Đề Xuất Cảnh Giới Khởi Hành</h1>
        <div className="assessment-score"><strong>{totalCorrect}/{config.items.length}</strong><span> câu đúng quan sát</span></div>
        <p>{recommendationCopy} Đây là gợi ý lộ trình, không phải điểm thi hay chứng chỉ HSK.</p>
        <div className="mastery-skill-list">
          {(Object.entries(skillResults) as Array<[HskLevelCheckSkill, { correct: number; total: number }]>).filter(
            ([, result]) => result.total > 0,
          ).map(([skill, result]) => (
            <div key={skill}><span>{skillLabels[skill]}</span><strong>{result.correct}/{result.total}</strong></div>
          ))}
        </div>
        <div className="assessment-destination">
          <small>{recommendation.nextAssessmentLevel ? "BƯỚC XÁC MINH TIẾP" : "CẢNH GIỚI ĐỀ XUẤT"}</small>
          <strong>
            {recommendation.nextAssessmentLevel
              ? `${assessmentAction} HSK${recommendation.nextAssessmentLevel}`
              : recommendation.acceptedLevelLabel}
          </strong>
          <span>Vùng nên củng cố trước: {destination.label}. Nghe TTS hiển thị riêng; nói và viết chưa được chấm.</span>
        </div>
        <div className="assessment-actions">
          {recommendation.band === "advance" && recommendation.nextAssessmentLevel && recommendation.acceptedLevelLabel
            ? <button className="secondary-button" type="button" onClick={acceptPlacement}>Dừng tại {recommendation.acceptedLevelLabel}</button>
            : <Link className="secondary-button" to="/assessment">Chọn lại tầng {assessmentAction.toLocaleLowerCase("vi")}</Link>}
          {recommendation.nextAssessmentLevel
            ? <Link className="primary-button" to={`/assessment/placement/hsk${recommendation.nextAssessmentLevel}`}>
                {recommendation.band === "advance" ? "Thử thách" : "Xác minh"} HSK{recommendation.nextAssessmentLevel} <ArrowRight size={17} />
              </Link>
            : <button className="primary-button" type="button" onClick={acceptPlacement}>
                Nhận lộ trình {recommendation.acceptedLevelLabel} <ArrowRight size={17} />
              </button>}
        </div>
      </div>
    );
  }

  if (!current) return null;
  const progress = Math.round(((index + 1) / config.items.length) * 100);
  return (
    <div className={`assessment-live ${levelCode}-level-check`} data-testid={`${levelCode}-level-check-live`}>
      <header>
        <Link className="icon-button" to="/assessment" aria-label={`Rời ${assessmentName}`}><ArrowLeft size={20} /></Link>
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
            return (
              <button
                className={selected === option.optionId ? "selected" : ""}
                data-option-id={option.optionId}
                data-radio-index={optionIndex}
                key={option.optionId}
                role="radio"
                aria-checked={selected === option.optionId}
                tabIndex={selected === option.optionId || (!selected && optionIndex === 0) ? 0 : -1}
                type="button"
                onClick={() => commitAnswer(option.optionId)}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: optionIndex,
                  itemCount: current.options.length,
                  onSelect: (nextIndex) => setSelected(current.options[nextIndex]!.optionId),
                })}
              >
                <span>{option.optionId}</span>
                <strong>{option.text}</strong>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
