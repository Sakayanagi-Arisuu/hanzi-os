import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleCheck,
  Crosshair,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTION_BY_ID,
  ASSESSMENT_QUESTIONS,
  FOUNDATION_SCREENING_BLUEPRINT,
  type AssessmentQuestion,
} from "../data/assessment";
import { CONTENT_VERSION, LESSON_BY_ID } from "../data/curriculum";
import {
  parseAssessmentResume,
  type AssessmentResumeV4,
} from "../learning/assessmentResumeProtocol";
import { makeIdempotencyKey } from "../lib/evidence";
import { removeLegacyLearningResumeStorage } from "../lib/storageKeys";
import { getNextLesson } from "../lib/adaptive";
import { selectAssessmentForm } from "../lib/assessment/formSelector";
import {
  formatObservedEstimate,
  summarizeAssessmentEvidence,
} from "../lib/assessment/skillEstimate";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import {
  deleteAssessmentResume,
  readAssessmentResume,
  writeAssessmentResume,
  type OwnerScopedCacheScope,
} from "../sync/indexedDb";
import {
  assessmentResumeEntryKey,
  ownerScopedResumeCacheScope,
  reportLearningResumeStorageError,
  resolveLearningResumeOwnerScope,
} from "../sync/learningResumeStore";

const screeningSkillLabels = {
  pronunciation: "Nhận diện âm/Pinyin",
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
} as const;

const resultForScore = (score: number) => score >= 75
  ? { lessonId: "characters-1", title: "Hán tự nền tảng", realm: "Ôn nhận diện chữ và cấu trúc" }
  : score >= 50
    ? { lessonId: "daily-1", title: "Đời sống hằng ngày", realm: "Củng cố câu nền tảng" }
    : score >= 25
      ? { lessonId: "survival-1", title: "Sinh tồn giao tiếp", realm: "Củng cố giao tiếp sinh tồn" }
      : { lessonId: "boot-1", title: "Bốn thanh điệu", realm: "Ôn âm và thanh điệu nền tảng" };

export function LocalAssessmentPage() {
  const { state, actions, sync } = useLearning();
  const [resumeStatus, setResumeStatus] = useState<"loading" | "ready">("loading");
  const [resumeScope, setResumeScope] = useState<OwnerScopedCacheScope | null>(null);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<AssessmentQuestion[]>([]);
  const [phase, setPhase] = useState<"intro" | "question" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [sessionId, setSessionId] = useState(() =>
    makeIdempotencyKey("diagnostic-session")
  );
  const [finalScore, setFinalScore] = useState(state.diagnostic.completed ? state.diagnostic.score : 0);

  const exposedGroups = useMemo(() => new Set(
    state.evidence.flatMap((item) => {
      if (!item.activityId.startsWith("diagnostic:")) return [];
      const question = ASSESSMENT_QUESTION_BY_ID.get(
        item.activityId.slice("diagnostic:".length),
      );
      return question ? [question.exposureGroupId] : [];
    }),
  ), [state.evidence]);
  const formSelection = useMemo(() => selectAssessmentForm({
    items: ASSESSMENT_QUESTIONS,
    blueprint: FOUNDATION_SCREENING_BLUEPRINT,
    exposedGroups,
    seed: sessionId,
  }), [exposedGroups, sessionId]);
  const resumeEntryKey = assessmentResumeEntryKey({
    blueprintId: FOUNDATION_SCREENING_BLUEPRINT.id,
    formVersion: ASSESSMENT_FORM_VERSION,
  });

  const current = activeQuestions[index];

  useEffect(() => {
    let cancelled = false;
    setResumeStatus("loading");
    setResumeScope(null);
    removeLegacyLearningResumeStorage();

    const loadSession = async () => {
      try {
        const ownerScope = await resolveLearningResumeOwnerScope(sync.ownerKey);
        const cacheScope = ownerScopedResumeCacheScope(ownerScope, resumeEntryKey);
        const record = await readAssessmentResume<unknown>(cacheScope);
        const restored = parseAssessmentResume({
          value: record?.value,
          contentVersion: CONTENT_VERSION,
          formVersion: ASSESSMENT_FORM_VERSION,
          blueprintId: FOUNDATION_SCREENING_BLUEPRINT.id,
          itemCount: FOUNDATION_SCREENING_BLUEPRINT.itemCount,
          bank: ASSESSMENT_QUESTIONS,
        });
        if (record && !restored) await deleteAssessmentResume(cacheScope);
        if (cancelled) return;

        if (restored) {
          setSessionId(restored.session.sessionId);
          setActiveQuestions(restored.items);
          setPhase("question");
          setIndex(restored.session.index);
          setSelected(restored.session.selected);
          setChecked(restored.session.checked);
          setHasRestoredSession(true);
        } else {
          setSessionId(makeIdempotencyKey("diagnostic-session"));
          setActiveQuestions([]);
          setPhase("intro");
          setIndex(0);
          setSelected(null);
          setChecked(false);
          setHasRestoredSession(false);
        }
        setResumeScope(cacheScope);
      } catch (error) {
        if (cancelled) return;
        setSessionId(makeIdempotencyKey("diagnostic-session"));
        setActiveQuestions([]);
        setPhase("intro");
        setIndex(0);
        setSelected(null);
        setChecked(false);
        setHasRestoredSession(false);
        reportLearningResumeStorageError(error);
      } finally {
        if (!cancelled) setResumeStatus("ready");
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [resumeEntryKey, sync.ownerKey]);

  useEffect(() => {
    if (
      resumeStatus !== "ready"
      || phase !== "question"
      || !resumeScope
      || resumeScope.entryKey !== resumeEntryKey
      || resumeScope.expectedOwnerGeneration.ownerKey !== sync.ownerKey
      || activeQuestions.length !== FOUNDATION_SCREENING_BLUEPRINT.itemCount
    ) return;
    const snapshot: AssessmentResumeV4 = {
      version: 4,
      contentVersion: CONTENT_VERSION,
      formVersion: ASSESSMENT_FORM_VERSION,
      blueprintId: FOUNDATION_SCREENING_BLUEPRINT.id,
      sessionId,
      items: activeQuestions.map((item) => ({
        id: item.id,
        itemVersion: item.itemVersion,
      })),
      index,
      selected,
      checked,
    };
    void writeAssessmentResume({
      ...resumeScope,
      value: snapshot,
    }).catch(reportLearningResumeStorageError);
  }, [activeQuestions, checked, index, phase, resumeEntryKey, resumeScope, resumeStatus, selected, sessionId, sync.ownerKey]);

  const check = () => {
    if (!current || !selected || checked) return;
    setChecked(true);
    const isCorrect = selected === current.correct;
    actions.recordPracticeEvidence({
      idempotencyKey: `${sessionId}:${current.id}`,
      activityVersion: ASSESSMENT_FORM_VERSION,
      source: "diagnostic",
      method: "diagnostic-selection",
      activityId: `diagnostic:${current.id}`,
      skill: current.skill,
      outcome: isCorrect ? "correct" : "incorrect",
      score: isCorrect ? 100 : 0,
      metadata: {
        selectedAnswer: selected,
        correctAnswer: current.correct,
        itemVersion: current.itemVersion,
        construct: current.construct,
        modality: current.modality,
        equivalentGroupId: current.equivalentGroupId,
        exposureGroupId: current.exposureGroupId,
        reviewStatus: current.reviewStatus,
        calibrationStatus: current.calibrationStatus,
        measurementEligible: current.measurementEligible,
        priorExposure: state.evidence.some((item) =>
          item.activityId === `diagnostic:${current.id}`
        ),
      },
    });
  };

  const next = () => {
    if (index < activeQuestions.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    const summary = summarizeAssessmentEvidence(state.evidence, { sessionId });
    const score = summary.overall.observedAccuracy ?? 0;
    setFinalScore(score);
    actions.completeDiagnostic(score);
    if (resumeScope) {
      void deleteAssessmentResume(resumeScope).catch(
        reportLearningResumeStorageError,
      );
    }
    setPhase("result");
  };

  const startAssessment = () => {
    if (formSelection.kind !== "selected") return;
    setActiveQuestions(formSelection.items);
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setHasRestoredSession(false);
    setPhase("question");
  };

  if (resumeStatus === "loading") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BrainCircuit size={44} />
        <h1>Đang khôi phục phiên khảo nghiệm</h1>
        <p>Hệ thống đang xác nhận đúng hồ sơ học và form câu hỏi đã chọn.</p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="assessment-intro">
        <div className="assessment-core"><Crosshair size={38} /><span /></div>
        <span className="system-kicker">KHẢO NGHIỆM CĂN CƠ · CHƯA HIỆU CHỈNH</span>
        <h1>Khảo Nghiệm Căn Cơ</h1>
        <p>Form trên thiết bị chỉ đo Chỉ Số Quan Sát để gợi ý điểm luyện. Nó chưa được hiệu chỉnh bằng pilot, không bỏ qua Điều Kiện Khai Mở và không suy diễn năng lực nói hoặc viết.</p>
        <div className="assessment-facts">
          <span><Gauge size={18} /><strong>4–6 phút</strong><small>thời lượng</small></span>
          <span><BrainCircuit size={18} /><strong>10 câu</strong><small>đa năng lực</small></span>
          <span><ShieldCheck size={18} /><strong>Review pending</strong><small>không phải chứng nhận trình độ</small></span>
        </div>
        {formSelection.kind === "insufficient-bank" && !hasRestoredSession && (
          <p role="status">Các câu trong form hiện tại đã được xem. Chưa có form tương đương chưa lộ đáp án, nên hệ thống không chấm lại hoặc thay đổi định tuyến.</p>
        )}
        <div className="assessment-actions">
          <Link className="secondary-button" to="/lesson/boot-1">Tôi bắt đầu từ số 0</Link>
          <button className="primary-button" disabled={formSelection.kind !== "selected"} type="button" onClick={startAssessment}>Bắt đầu khảo nghiệm <ArrowRight size={18} /></button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const result = resultForScore(finalScore);
    const lesson = LESSON_BY_ID.get(result.lessonId);
    const nextAccessibleLesson = getNextLesson(state);
    const summary = summarizeAssessmentEvidence(state.evidence, { sessionId });
    return (
      <div className="assessment-result">
        <div className="result-sigil passed"><CircleCheck size={38} /><span /></div>
        <span className="system-kicker">KHẢO NGHIỆM HOÀN TẤT · CHƯA HIỆU CHỈNH</span>
        <h1>Bản Đồ Bù Khuyết đã sẵn sàng</h1>
        <div className="assessment-score"><strong>{summary.overall.correct}/{summary.overall.n}</strong><span>mục đo được</span></div>
        <p>{formatObservedEstimate(summary.overall)}. Đây là Khoảng Quan Sát, không phải mastery đã hiệu chỉnh hay chứng nhận HSK.</p>
        <div className="mastery-skill-list">
          {(Object.entries(summary.skills) as Array<[
            keyof typeof screeningSkillLabels,
            (typeof summary.skills)[keyof typeof summary.skills],
          ]>).map(([skill, estimate]) => (
            <div key={skill}>
              <span>{screeningSkillLabels[skill]}</span>
              <strong>{formatObservedEstimate(estimate)}</strong>
            </div>
          ))}
        </div>
        <p>Vùng kiến thức gợi ý: <strong>{result.realm}</strong>. Nói, viết và stimulus nghe tổng hợp chưa được đo đủ chuẩn; kết quả không thay thế prerequisite.</p>
        <div className="assessment-destination">
          <small>SUGGESTED KNOWLEDGE AREA</small>
          <strong>{lesson?.title ?? result.title}</strong>
          <span>{lesson?.objective}</span>
        </div>
        <div className="assessment-actions">
          <button className="secondary-button" disabled type="button"><RotateCcw size={17} /> Chưa có form tương đương</button>
          <Link className="primary-button" to={nextAccessibleLesson ? `/lesson/${nextAccessibleLesson.id}` : "/path"}>Tiếp tục từ nút đang mở <ArrowRight size={17} /></Link>
        </div>
      </div>
    );
  }

  if (!current || activeQuestions.length === 0) {
    return (
      <div className="lesson-state-screen">
        <Crosshair size={44} />
        <h1>Form khảo nghiệm không còn hợp lệ</h1>
        <p>Phiên này đã được loại bỏ để tránh chấm nhầm một bộ câu hỏi khác.</p>
        <Link className="primary-button" to="/">Trở về tổng quan</Link>
      </div>
    );
  }

  const progress = Math.round(((index + 1) / activeQuestions.length) * 100);
  return (
    <div className="assessment-live">
      <header>
        <Link className="icon-button" to="/" aria-label="Rời khảo nghiệm"><ArrowLeft size={20} /></Link>
        <div><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1}/{activeQuestions.length}</span>
      </header>
      <section className="assessment-question">
        <span className="system-kicker"><Sparkles size={15} /> {current.meta}</span>
        {current.audio ? (
          <button className="sound-orb" type="button" onClick={() => speakMandarin(current.audio!)} aria-label="Nghe câu hỏi"><Volume2 size={37} /><span /></button>
        ) : <h1>{current.prompt}</h1>}
        {current.audio && <p>Nhấn để nghe lại · Âm Mẫu Tổng Hợp · TTS chỉ dùng luyện tập, không tính vào ước lượng</p>}
        <div
          className="assessment-options"
          role="radiogroup"
          aria-label={`Các lựa chọn cho câu ${index + 1}`}
        >
          {current.options.map((option, optionIndex) => {
            const correct = checked && option === current.correct;
            const wrong = checked && selected === option && option !== current.correct;
            return (
              <button
                className={`${selected === option ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
                data-radio-index={optionIndex}
                disabled={checked}
                key={option}
                role="radio"
                aria-checked={selected === option}
                tabIndex={selected === option || (!selected && optionIndex === 0) ? 0 : -1}
                type="button"
                onClick={() => setSelected(option)}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: optionIndex,
                  itemCount: current.options.length,
                  onSelect: (nextIndex) => setSelected(
                    current.options[nextIndex]!,
                  ),
                })}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option}</strong>{correct ? <Check size={18} /> : wrong ? <X size={18} /> : null}
              </button>
            );
          })}
        </div>
      </section>
      <footer className={checked ? (selected === current.correct ? "correct" : "wrong") : ""}>
        <div>
          {checked ? <><strong>{selected === current.correct ? "Nhận định chính xác" : `Đáp án: ${current.correct}`}</strong><p>{current.explanation}</p></> : <p>Chọn phương án gần nhất với hiểu biết hiện tại của bạn.</p>}
        </div>
        <button className="primary-button" disabled={!selected} type="button" onClick={checked ? next : check}>{checked ? (index === activeQuestions.length - 1 ? "Hoàn tất" : "Câu tiếp theo") : "Xác nhận"}<ArrowRight size={17} /></button>
      </footer>
    </div>
  );
}
