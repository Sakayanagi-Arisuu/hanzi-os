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
import {
  HSK4_LEVEL_CHECK_BANK_ID,
  HSK4_LEVEL_CHECK_DISCLOSURE,
  HSK4_LEVEL_CHECK_FORM_VERSION,
  HSK4_LEVEL_CHECK_ITEMS,
  type Hsk4LevelCheckSkill,
} from "../data/hsk4LevelCheck";
import { CONTENT_VERSION } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import {
  HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "../lib/storageKeys";
import { useLearning } from "../store/LearningStore";

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

const skillLabels: Record<Hsk4LevelCheckSkill, string> = {
  listening: "Nghe · TTS tổng hợp",
  reading: "Đọc hiểu",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp trong ngữ cảnh",
};

const practiceDestinations: Record<Hsk4LevelCheckSkill, {
  lessonId: string;
  label: string;
}> = {
  listening: { lessonId: "hsk4-personal-community-analysis-concept-actor-map", label: "Nghe văn bản dài và lập sơ đồ bằng chứng" },
  reading: { lessonId: "hsk4-long-input-structure-map-lesson-01", label: "Đọc nhiều đoạn và kiểm tra suy luận" },
  vocabulary: { lessonId: "hsk4-personal-community-analysis-concept-actor-map", label: "Củng cố từ vựng HSK4 trong ngữ liệu dài" },
  grammar: {
    lessonId: "hsk4-precision-reference-quantity-lesson-01",
    label: "Củng cố ngữ pháp tóm tắt và lập luận HSK4",
  },
};

const validAnswers = (value: unknown): value is Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(([itemId, optionId]) => {
    const item = HSK4_LEVEL_CHECK_ITEMS.find((candidate) =>
      candidate.id === itemId
    );
    return typeof optionId === "string"
      && Boolean(item?.options.some((option) => option.optionId === optionId));
  });
};

const loadResume = (): Resume | null => {
  const raw = readLocalStorage(HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Resume>;
    const current = HSK4_LEVEL_CHECK_ITEMS[value.index ?? -1];
    const selectedValid = value.selected === null
      || (typeof value.selected === "string"
        && Boolean(current?.options.some((option) =>
          option.optionId === value.selected
        )));
    if (
      value.version !== 1
      || value.contentVersion !== CONTENT_VERSION
      || value.formVersion !== HSK4_LEVEL_CHECK_FORM_VERSION
      || value.bankId !== HSK4_LEVEL_CHECK_BANK_ID
      || typeof value.sessionId !== "string"
      || !["intro", "question", "result"].includes(value.phase ?? "")
      || !Number.isInteger(value.index)
      || (value.index ?? -1) < 0
      || (value.index ?? HSK4_LEVEL_CHECK_ITEMS.length)
        >= HSK4_LEVEL_CHECK_ITEMS.length
      || typeof value.checked !== "boolean"
      || !selectedValid
      || !validAnswers(value.answers)
    ) {
      throw new Error("stale HSK4 level-check resume");
    }
    return value as Resume;
  } catch {
    removeLocalStorage(HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY);
    return null;
  }
};

const freshSessionId = () => makeIdempotencyKey("hsk4-level-check-session");

export function Hsk4LevelCheckPage() {
  const { state, actions } = useLearning();
  const initial = useMemo(loadResume, []);
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "intro");
  const [index, setIndex] = useState(initial?.index ?? 0);
  const [selected, setSelected] = useState<string | null>(
    initial?.selected ?? null,
  );
  const [checked, setChecked] = useState(initial?.checked ?? false);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initial?.answers ?? {},
  );
  const [sessionId, setSessionId] = useState(
    initial?.sessionId ?? freshSessionId,
  );
  const current = HSK4_LEVEL_CHECK_ITEMS[index];

  useEffect(() => {
    writeLocalStorage(HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      contentVersion: CONTENT_VERSION,
      formVersion: HSK4_LEVEL_CHECK_FORM_VERSION,
      bankId: HSK4_LEVEL_CHECK_BANK_ID,
      sessionId,
      phase,
      index,
      selected,
      checked,
      answers,
    } satisfies Resume));
  }, [answers, checked, index, phase, selected, sessionId]);

  const start = () => {
    setPhase("question");
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers({});
  };

  const restart = () => {
    setSessionId(freshSessionId());
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
      activityId: `hsk4-level-check:${current.id}`,
      skill: current.skill,
      outcome: correct ? "correct" : "incorrect",
      score: correct ? 100 : 0,
      metadata: {
        formVersion: HSK4_LEVEL_CHECK_FORM_VERSION,
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
        priorExposure: state.evidence.some((item) =>
          item.activityId === `hsk4-level-check:${current.id}`
        ),
      },
    });
  };

  const next = () => {
    if (index < HSK4_LEVEL_CHECK_ITEMS.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    setPhase("result");
  };

  const skillResults = useMemo(() => Object.fromEntries(
    (Object.keys(skillLabels) as Hsk4LevelCheckSkill[]).map((skill) => {
      const items = HSK4_LEVEL_CHECK_ITEMS.filter((item) =>
        item.skill === skill
      );
      const correct = items.filter((item) =>
        answers[item.id] === item.correctOptionId
      ).length;
      return [skill, { correct, total: items.length }];
    }),
  ) as Record<Hsk4LevelCheckSkill, { correct: number; total: number }>, [answers]);

  if (phase === "intro") {
    return (
      <div className="assessment-intro hsk4-level-check" data-testid="hsk4-level-check-intro">
        <div className="assessment-core"><BrainCircuit size={38} /><span /></div>
        <span className="system-kicker">ĐẠI KHẢO CẢNH GIỚI HSK4 · 72 CÂU</span>
        <h1>Đại Khảo Cảnh Giới HSK4</h1>
        <p>
          Kiểm tra toàn bộ phần nghe, đọc, từ vựng và ngữ pháp đã học trong 78
          bài HSK4. Phiên đang làm được lưu trên thiết bị để bạn có thể quay lại.
        </p>
        <div className="assessment-facts">
          <span><Gauge size={18} /><strong>35–40 phút</strong><small>thời lượng gợi ý</small></span>
          <span><BrainCircuit size={18} /><strong>72 câu</strong><small>18 nghe · 18 đọc · 18 từ · 18 ngữ pháp</small></span>
          <span><ShieldCheck size={18} /><strong>Ấn Minh Bạch Nội Dung</strong><small>AI tự rà 5 pass · humanReviewed=false</small></span>
        </div>
        <p>{HSK4_LEVEL_CHECK_DISCLOSURE.listeningVi} {HSK4_LEVEL_CHECK_DISCLOSURE.resultVi}</p>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">Quay lại lộ trình</Link>
          <button className="primary-button" type="button" onClick={start}>
            {initial?.phase === "question" ? "Tiếp tục phiên" : "Bắt đầu tự kiểm tra"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const totalCorrect = HSK4_LEVEL_CHECK_ITEMS.filter((item) =>
      answers[item.id] === item.correctOptionId
    ).length;
    const weakest = (Object.entries(skillResults) as Array<[
      Hsk4LevelCheckSkill,
      { correct: number; total: number },
    ]>).sort((left, right) =>
      left[1].correct / left[1].total - right[1].correct / right[1].total
    )[0]![0];
    const destination = practiceDestinations[weakest];
    return (
      <div className="assessment-result uncalibrated-result" data-testid="hsk4-level-check-result">
        <div className="result-sigil passed"><CircleCheck size={38} /><span /></div>
        <span className="system-kicker">ĐẠI KHẢO HSK4 · TỰ KIỂM HOÀN TẤT</span>
        <h1>Bản Đồ Bù Khuyết HSK4</h1>
        <div className="assessment-score"><strong>{totalCorrect}/72</strong><span> câu đúng quan sát</span></div>
        <p>{HSK4_LEVEL_CHECK_DISCLOSURE.resultVi}</p>
        <div className="mastery-skill-list">
          {(Object.entries(skillResults) as Array<[
            Hsk4LevelCheckSkill,
            { correct: number; total: number },
          ]>).map(([skill, result]) => (
            <div key={skill}>
              <span>{skillLabels[skill]}</span>
              <strong>{result.correct}/{result.total}</strong>
            </div>
          ))}
        </div>
        <div className="assessment-destination">
          <small>VÙNG NÊN ÔN TRƯỚC</small>
          <strong>{destination.label}</strong>
          <span>Kết quả này không thay đổi khóa bài hay trạng thái hoàn thành.</span>
        </div>
        <div className="assessment-actions">
          <button className="secondary-button" type="button" onClick={restart}>
            <RotateCcw size={17} /> Làm form mới
          </button>
          <Link className="primary-button" to={`/lesson/${destination.lessonId}`}>
            Ôn vùng gợi ý <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const correct = selected === current.correctOptionId;
  const progress = Math.round(((index + 1) / HSK4_LEVEL_CHECK_ITEMS.length) * 100);
  return (
    <div className="assessment-live hsk4-level-check" data-testid="hsk4-level-check-live">
      <header>
        <Link className="icon-button" to="/path" aria-label="Rời level check"><ArrowLeft size={20} /></Link>
        <div><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1}/72</span>
      </header>
      <section className="assessment-question">
        <span className="system-kicker"><Sparkles size={15} /> {skillLabels[current.skill]}</span>
        <p>{current.promptVi}</p>
        {current.syntheticTtsText ? (
          <>
            <button
              className="sound-orb"
              type="button"
              onClick={() => speakMandarin(current.syntheticTtsText!)}
              aria-label="Nghe câu bằng TTS tổng hợp"
            ><Volume2 size={37} /><span /></button>
            <p>TTS tổng hợp · chỉ dùng luyện tập · không đo mastery nghe</p>
          </>
        ) : (
          <h1>{current.stimulusText}</h1>
        )}
        <div className="assessment-options" role="radiogroup" aria-label={`Các lựa chọn cho câu ${index + 1}`}>
          {current.options.map((option, optionIndex) => {
            const optionCorrect = checked
              && option.optionId === current.correctOptionId;
            const optionWrong = checked
              && selected === option.optionId
              && option.optionId !== current.correctOptionId;
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
                  onSelect: (nextIndex) => setSelected(
                    current.options[nextIndex]!.optionId,
                  ),
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
        <div>
          {checked ? (
            <>
              <strong>{correct ? "Chính xác" : `Đáp án: ${current.correctOptionId}`}</strong>
              <p>{current.explanationVi}</p>
            </>
          ) : (
            <p>Chọn một phương án. Câu trả lời được lưu theo đúng phiên và phiên bản nội dung.</p>
          )}
        </div>
        <button className="primary-button" disabled={selected === null} type="button" onClick={checked ? next : check}>
          {checked ? (index === 71 ? "Xem kết quả" : "Câu tiếp theo") : "Xác nhận"}
          <ArrowRight size={17} />
        </button>
      </footer>
    </div>
  );
}
