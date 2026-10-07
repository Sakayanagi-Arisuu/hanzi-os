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
import { Link, useNavigate, useSearchParams } from "react-router";
import { derivePlacementRecommendation } from "../assessment/placementPolicy";
import { createPlacementBaseline, evaluatePlacementSafety, hasLearningProgress, placementSafetyCopy, type PlacementBaseline } from "../assessment/placementSafety";
import { readPlacementContext, usePlacementContext } from "../assessment/usePlacementContext";
import "./PlacementNgocDien.css";
import { CONTENT_VERSION } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import {
  getPlacementGateSessionStorageKey,
  getOwnedPlacementStorageKey,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
  LEARNING_OWNER_STORAGE_KEY,
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
  baseline?: PlacementBaseline;
  dismissed?: boolean;
  upperLevelAlreadyChecked?: boolean;
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
    return typeof optionId === "string" && Boolean(item && (optionId === "unknown" || item.options.some((option) => option.optionId === optionId)));
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
      || (value.phase === "result" && Object.keys(value.answers ?? {}).length !== config.items.length)
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
      };
    }
    return resume;
  } catch {
    if (!config.placement) removeLocalStorage(config.storageKey);
    return null;
  }
};

export function HskLevelCheckPage({ config }: { config: HskLevelCheckConfig }) {
  const { sync } = useLearning();
  if (config.placement && !sync.ownerKey) return <p role="status">Đang mở hồ sơ khảo nghiệm…</p>;
  return <LevelCheckSession key={`${config.formVersion}:${sync.ownerKey}`} config={config.placement ? { ...config, storageKey: getOwnedPlacementStorageKey(config.storageKey, sync.ownerKey) } : config} />;
}

function LevelCheckSession({ config }: { config: HskLevelCheckConfig }) {
  const { state, actions, sync } = useLearning();
  const context = usePlacementContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => loadResume(config), [config]);
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "intro");
  const [index, setIndex] = useState(initial?.index ?? 0);
  const [selected, setSelected] = useState<string | null>(initial?.selected ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>(initial?.answers ?? {});
  const [sessionId, setSessionId] = useState(initial?.sessionId ?? (() => makeIdempotencyKey(`hsk${config.level}-level-check-session`)));
  const [baseline, setBaseline] = useState<PlacementBaseline | undefined>(() => initial ? initial.baseline
    : config.placement && (readLocalStorage(config.storageKey) || readLocalStorage(config.storageKey.split(":owner:")[0]!)) ? undefined : createPlacementBaseline(state, sync.ownerKey));
  const [clock, setClock] = useState(Date.now());
  const [saveError, setSaveError] = useState(false);
  const [closed, setClosed] = useState(initial?.dismissed ?? false);
  const upperLevelAlreadyChecked = initial?.upperLevelAlreadyChecked === true || searchParams.get("from") === "higher";
  const stateSafety = config.placement ? evaluatePlacementSafety(baseline, state, sync.ownerKey, clock) : "current";
  const safety = config.placement && baseline?.contextSnapshot && context.snapshot && baseline.contextSnapshot !== context.snapshot ? "learning-changed" : stateSafety;
  const progressed = hasLearningProgress(state) || context.preservePath;
  const answerCommitLock = useRef(false);
  const acceptanceLock = useRef(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const latestContext = useRef(context);
  useEffect(() => { latestContext.current = context; }, [context]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = config.items[index];
  const levelCode = `hsk${config.level}`;
  const assessmentName = "Khảo Nghiệm Căn Cơ";
  const assessmentAction = "Khảo Nghiệm";

  useEffect(() => {
    if (config.placement && phase === "question") questionHeading.current?.focus({ preventScroll: true });
  }, [config.placement, index, phase]);

  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  useEffect(() => {
    if (safety !== "current" || closed || phase === "intro" || (config.placement && !context.ready)) return;
    const saved = writeLocalStorage(config.storageKey, JSON.stringify({
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
      baseline,
      upperLevelAlreadyChecked,
    } satisfies Resume));
    if (!saved) setSaveError(true);
  }, [answers, baseline, closed, safety, context.ready, config.placement, config.bankId, config.formVersion, config.storageKey, index, phase, selected, sessionId, upperLevelAlreadyChecked]);

  useEffect(() => {
    answerCommitLock.current = false;
  }, [index, phase]);

  const start = () => {
    if (config.placement && !context.ready) return;
    const previous = readLocalStorage(config.storageKey);
    if (config.placement && previous && !writeLocalStorage(`${config.storageKey}:history:${sessionId}`, previous)) { setSaveError(true); return; }
    const nextBaseline = { ...createPlacementBaseline(state, sync.ownerKey), contextSnapshot: context.snapshot ?? undefined, preservePath: progressed };
    const nextSessionId = makeIdempotencyKey(`hsk${config.level}-level-check-session`);
    if (!writeLocalStorage(config.storageKey, JSON.stringify({ version: 1, contentVersion: CONTENT_VERSION,
      formVersion: config.formVersion, bankId: config.bankId, sessionId: nextSessionId,
      phase: "question", index: 0, selected: null, checked: false, answers: {},
      updatedAt: Date.now(), baseline: nextBaseline, upperLevelAlreadyChecked } satisfies Resume))) { setSaveError(true); return; }
    setBaseline(nextBaseline);
    setSessionId(nextSessionId);
    acceptanceLock.current = false;
    setClosed(false);
    setSaveError(false);
    setClock(Date.now());
    emitSystemSignal({ type: "level-check.started", sourceId: `level-check:${levelCode}` });
    setPhase("question");
    setIndex(0);
    setSelected(null);
    setAnswers({});
  };

  const commitAnswer = async (optionId: string) => {
    if (!current || answerCommitLock.current) return;
    if (config.placement && (!context.ready || safety !== "current" || evaluatePlacementSafety(baseline, state, sync.ownerKey) !== "current")) { setClock(Date.now()); return; }
    answerCommitLock.current = true;
    if (config.placement) {
      try {
        const latest = await readPlacementContext(sync.ownerKey);
        if (!mounted.current || readLocalStorage(LEARNING_OWNER_STORAGE_KEY) !== sync.ownerKey) { answerCommitLock.current = false; return; }
        if (!latestContext.current.ready || latest.snapshot !== latestContext.current.localSnapshot
          || baseline?.contextSnapshot !== latestContext.current.snapshot) { context.retry(); answerCommitLock.current = false; return; }
      } catch { setSaveError(true); answerCommitLock.current = false; return; }
    }
    const correct = optionId === current.correctOptionId;
    const nextAnswers = { ...answers, [current.id]: optionId };
    const isLastQuestion = index === config.items.length - 1;
    const nextPhase: Phase = isLastQuestion ? "result" : "question";
    const nextIndex = isLastQuestion ? index : index + 1;

    const saved = writeLocalStorage(config.storageKey, JSON.stringify({
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
      baseline,
      upperLevelAlreadyChecked,
    } satisfies Resume));
    if (!saved) { answerCommitLock.current = false; setSaveError(true); return; }
    setSaveError(false);

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

  if (config.placement && !context.ready) return <section className="np-session np-stale"><div className="np-session-body"><h1>Đối chiếu hành trình của bạn</h1><p role="status">{context.failed ? "Chưa đọc được tiến trình trên thiết bị. Hãy thử lại để tiếp tục an toàn." : "Đang kiểm tra phiên đã lưu và tiến trình hiện tại…"}</p></div><footer className="np-actions"><Link className="np-back" to="/assessment">Quay lại</Link>{context.failed && <button className="np-primary" onClick={context.retry}>Thử lại</button>}</footer></section>;

  if (config.placement && (safety !== "current" || closed)) return <section className="np-session np-stale">
    <header><Link to="/assessment" className="np-back" aria-label="Về cổng khảo nghiệm"><ArrowLeft size={20} /></Link><span>KHẢO NGHIỆM CĂN CƠ · HSK{config.level}</span></header>
    <div className="np-session-body"><ShieldCheck size={38} /><h1>{closed ? "Lượt khảo nghiệm đã được lưu" : "Cần một lượt khảo nghiệm mới"}</h1>
      <p>{closed ? "Kết quả trước đã được xử lý. Bạn có thể khảo sát lại năng lực hoặc tiếp tục hành trình." : placementSafetyCopy[safety as Exclude<typeof safety, "current">]}</p><p>Phiên cũ được giữ lại. Bài đã học, lịch ôn và tiến trình hiện tại không thay đổi.</p>{saveError && <p role="alert">Chưa lưu được phiên. Hãy kiểm tra dung lượng trình duyệt rồi thử lại.</p>}</div>
    <footer className="np-actions"><Link className="np-back" to="/path">Về Thiên Lộ</Link><button className="np-primary" onClick={start}>Khảo nghiệm mới <ArrowRight size={18} /></button></footer>
  </section>;

  if (phase === "intro" && config.placement) return <section className="np-session np-stale" data-testid={`${levelCode}-level-check-intro`}>
    <header><Link to="/assessment" className="np-back" aria-label="Chọn lại tầng"><ArrowLeft size={20} /></Link><span>NGỌC ĐIỆN · HSK{config.level}</span></header>
    <div className="np-session-body"><span className="np-eyebrow">CHUẨN BỊ KHẢO NGHIỆM</span><h1>Khảo Nghiệm Căn Cơ HSK{config.level}</h1><p>12 câu · 8–12 phút · Đọc hiểu, từ vựng và ngữ pháp.</p><ul><li>Chọn đáp án rồi xác nhận để chuyển câu.</li><li>Chọn “Chưa biết” khi chưa chắc, không cần đoán.</li><li>Có thể tạm dừng. Phiên được tiếp tục trong 7 ngày nếu bạn chưa học thêm.</li><li>Nghe, nói và viết chưa được đo trong lượt này.</li></ul><p>{progressed ? "Bạn đã có tiến trình học. Kết quả chỉ gợi ý củng cố, giữ nguyên lộ trình hiện tại." : "Kết quả chỉ định hướng học tập; không cộng thành thạo hay tự mở khóa bài nền."}</p></div>
    <footer className="np-actions">{saveError && <p role="alert">Chưa lưu được lượt mới. Hãy kiểm tra dung lượng trình duyệt rồi thử lại.</p>}<Link className="np-back" to="/assessment">Quay lại</Link><button className="np-primary" onClick={start}>Bắt đầu Khảo Nghiệm <ArrowRight size={18} /></button></footer>
  </section>;

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
      upperLevelAlreadyChecked,
    );
    const recommendationCopy = recommendation.band === "advance"
      ? recommendation.nextAssessmentLevel
        ? `Các câu đã làm gợi ý bạn có thể thử HSK${recommendation.nextAssessmentLevel}. Bạn cũng có thể dừng và củng cố HSK${config.level}.`
        : `Kết quả gợi ý học và củng cố nội dung HSK${config.level}; chưa đủ để kết luận thành thạo cấp độ này.`
      : recommendation.band === "matched"
        ? `${recommendation.acceptedLevelLabel} là điểm khởi hành phù hợp với kết quả hiện tại.`
        : recommendation.nextAssessmentLevel
          ? `Chưa đủ bằng chứng để nhận HSK${config.level}. Hệ thống cần xác minh tiếp ở HSK${recommendation.nextAssessmentLevel}.`
          : "Nền HSK1 chưa vững; bắt đầu từ HSK0 sẽ an toàn và ít bỏ sót nhất.";
    const acceptPlacement = async () => {
      if (recommendation.acceptedStartingLevel === null || acceptanceLock.current) return;
      acceptanceLock.current = true;
      if (config.placement) {
        try {
          const latest = await readPlacementContext(sync.ownerKey);
          if (!mounted.current || readLocalStorage(LEARNING_OWNER_STORAGE_KEY) !== sync.ownerKey) { acceptanceLock.current = false; return; }
          const savedResume = loadResume(config);
          if (!latestContext.current.ready || latest.snapshot !== latestContext.current.localSnapshot
            || baseline?.contextSnapshot !== latestContext.current.snapshot || safety !== "current"
            || savedResume?.sessionId !== sessionId || savedResume.dismissed) { context.retry(); setSaveError(true); acceptanceLock.current = false; return; }
        } catch { setSaveError(true); acceptanceLock.current = false; return; }
      }
      const accepted = actions.acceptDiagnosticPlacement(
        recommendation.acceptedStartingLevel,
        recommendation.overallAccuracy * 100,
        config.placement ? baseline : undefined,
      );
      if (!accepted) { setClock(Date.now()); setSaveError(true); acceptanceLock.current = false; return; }
      const raw = readLocalStorage(config.storageKey);
      if (raw) writeLocalStorage(config.storageKey, JSON.stringify({ ...JSON.parse(raw), dismissed: true }));
      setClosed(true);
      navigate("/path");
    };
    return (
      <div className={`assessment-result uncalibrated-result ${config.placement ? "np-session np-result" : ""}`} data-testid={`${levelCode}-level-check-result`}>
        <div className={config.placement ? "np-session-body" : undefined}>
        <div className="result-sigil passed"><CircleCheck size={38} /><span /></div>
        <span className="system-kicker">{assessmentName.toUpperCase()} HSK{config.level} · ĐÃ HOÀN TẤT</span>
        <h1>{progressed ? "Gợi ý củng cố căn cơ" : "Đề xuất điểm khởi hành"}</h1>
        <div className="assessment-score"><strong>{totalCorrect}/{config.items.length}</strong><span> câu đúng quan sát</span></div>
        <p>{recommendationCopy} Đây là gợi ý lộ trình, không phải điểm thi hay chứng chỉ HSK.</p>
        {progressed && <p className="np-resume">Bạn đã có hành trình học. Hệ thống giữ nguyên điểm khởi hành và bài đang học; kết quả này giúp chọn phần cần củng cố.</p>}
        {saveError && <p role="alert">Chưa áp dụng được kết quả. Hãy thử lại hoặc trở về Thiên Lộ; tiến trình hiện tại vẫn được giữ.</p>}
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
          <span>Vùng nên củng cố trước: {destination.label}. Nghe, nói và viết chưa được xác định bởi điểm định hướng này.</span>
        </div>
        {config.placement && <details className="np-method"><summary>Xem lại câu trả lời và lời giải</summary>{config.items.map((item, i) => <article className="np-review" key={item.id}><strong>Câu {i + 1} · {skillLabels[item.skill]}</strong><p>{item.stimulusText}</p><p>Bạn chọn: {item.options.find((option) => option.optionId === answers[item.id])?.text ?? "Chưa biết"}</p><p>Đáp án: {item.options.find((option) => option.optionId === item.correctOptionId)?.text}</p><p>{item.explanationVi}</p></article>)}</details>}
        </div>
        <div className={`assessment-actions ${config.placement ? "np-result-actions" : ""}`}>
          {progressed ? <Link className="secondary-button" to="/path">Giữ lộ trình · về Thiên Lộ</Link> :
          <>
          {recommendation.band === "advance" && recommendation.nextAssessmentLevel && recommendation.acceptedLevelLabel
            ? <button className="secondary-button" type="button" onClick={acceptPlacement}>Dừng tại {recommendation.acceptedLevelLabel}</button>
            : <Link className="secondary-button" to="/assessment">Chọn lại tầng {assessmentAction.toLocaleLowerCase("vi")}</Link>}
          </>}
          {recommendation.nextAssessmentLevel
            ? <Link className="primary-button" to={`/assessment/placement/hsk${recommendation.nextAssessmentLevel}${recommendation.band === "step-down" ? "?from=higher" : ""}`}>
                {recommendation.band === "advance" ? "Thử thách" : "Xác minh"} HSK{recommendation.nextAssessmentLevel} <ArrowRight size={17} />
              </Link>
            : <button className="primary-button" type="button" onClick={acceptPlacement}>
                {progressed ? "Lưu gợi ý · giữ lộ trình" : `Nhận định hướng ${recommendation.acceptedLevelLabel}`} <ArrowRight size={17} />
              </button>}
        </div>
      </div>
    );
  }

  if (!current) return null;
  const progress = Math.round((index / config.items.length) * 100);
  return (
    <div className={`assessment-live ${levelCode}-level-check ${config.placement ? "np-session np-live" : ""}`} data-testid={`${levelCode}-level-check-live`}>
      <header>
        <Link className="icon-button" to="/assessment" aria-label={`Rời ${assessmentName}`}><ArrowLeft size={20} /></Link>
        <div role="progressbar" aria-label="Tiến độ khảo nghiệm" aria-valuenow={index} aria-valuemin={0} aria-valuemax={config.items.length}><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1}/{config.items.length}</span>
      </header>
      <section className="assessment-question" data-motion-scene={current.id}><div className="realm-emblem realm-emblem-compact" aria-hidden="true" />
        <span className="system-kicker"><Sparkles size={15} /> {skillLabels[current.skill]}</span>
        <p>{current.promptVi}</p>
        {current.syntheticTtsText ? <>
          <button className="sound-orb" type="button" onClick={() => speakMandarin(current.syntheticTtsText!, .82, `level-check:${levelCode}:item:${current.id}`)} aria-label="Nghe câu bằng TTS tổng hợp"><Volume2 size={37} /><span /></button>
          <p>Giọng máy tổng hợp dùng để luyện nghe trên thiết bị.</p>
        </> : <h1 ref={questionHeading} tabIndex={-1} aria-label={`Câu ${index + 1}: ${current.stimulusText}`}>{current.stimulusText}</h1>}
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
                onClick={() => config.placement ? setSelected(option.optionId) : commitAnswer(option.optionId)}
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
      {config.placement && <footer className="np-question-actions">
        <div><span>HSK{config.level} · {skillLabels[current.skill]}</span>{saveError ? <p role="alert">Chưa lưu được câu trả lời. Hãy thử lại.</p> : <p>Chưa chắc? Chọn “Chưa biết” để kết quả sát năng lực hơn.</p>}</div>
        <button className="np-back" type="button" onClick={() => commitAnswer("unknown")}>Chưa biết</button>
        <button className="np-primary" type="button" disabled={!selected} onClick={() => selected && commitAnswer(selected)}>{index === config.items.length - 1 ? "Xem kết quả" : "Xác nhận"}<ArrowRight size={18} /></button>
      </footer>}
    </div>
  );
}
