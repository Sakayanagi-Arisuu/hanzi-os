import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  CircleCheck,
  CircleX,
  Headphones,
  Lightbulb,
  LockKeyhole,
  PenLine,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { LESSON_BY_ID, WORD_BY_ID } from "../data/curriculum";
import { getLessonGuide } from "../data/lessonGuides";
import {
  parseLessonResume,
  summarizeLessonResumeAnswers,
  type LessonResumeAnswer,
  type LessonResumePhase,
  type LessonResumeV5,
} from "../learning/resumeProtocol";
import {
  localLessonActivityProvenance,
  localLessonSessionProvenance,
  materializeLocalLessonRuntime,
} from "../learning/localLessonRuntime";
import {
  isLessonIdAvailableForStartingLevel,
  isLessonReleased,
  isLessonUnlocked,
} from "../lib/adaptive";
import { answersMatch, type Exercise } from "../lib/exerciseGeneration";
import { makeIdempotencyKey } from "../lib/evidence";
import { removeLegacyLearningResumeStorage } from "../lib/storageKeys";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import {
  deleteLessonResume,
  readLessonResume,
  writeLessonResume,
  type OwnerScopedCacheScope,
} from "../sync/indexedDb";
import {
  lessonResumeEntryKey,
  ownerScopedResumeCacheScope,
  reportLearningResumeStorageError,
  resolveLearningResumeOwnerScope,
} from "../sync/learningResumeStore";
import type { VocabularyItem } from "../types";
import { AuthenticatedLessonPage } from "./AuthenticatedLessonPage";

const displayCharacter = (word: VocabularyItem, script: "simplified" | "traditional") =>
  script === "traditional" ? word.traditional : word.simplified;

const exerciseIcon = (kind: Exercise["kind"]) => {
  if (kind === "listening") return Headphones;
  if (kind === "sentence") return BookOpenText;
  if (kind === "recall") return PenLine;
  return Sparkles;
};

export function LessonPage() {
  const { sync } = useLearning();
  if (sync.session === null) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BrainCircuit size={44} />
        <h1>Đang xác nhận tài khoản học</h1>
        <p>Danh tính phải được xác định trước khi chọn authority local hoặc server.</p>
      </div>
    );
  }
  return sync.session.authenticated
    ? <AuthenticatedLessonPage />
    : <LocalLessonPage />;
}

function LocalLessonPage() {
  const { lessonId } = useParams();
  const { state, actions, sync } = useLearning();
  const requestedLesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined;
  const availableForPath = Boolean(
    requestedLesson
    && isLessonReleased(requestedLesson)
    && isLessonIdAvailableForStartingLevel(
      requestedLesson.id,
      state.profile.startingLevel,
    ),
  );
  const unavailableLesson = Boolean(requestedLesson && !availableForPath);
  const lesson = availableForPath ? requestedLesson : undefined;
  const lessonUnlocked = Boolean(lesson && isLessonUnlocked(lesson, state));
  const [resumeStatus, setResumeStatus] = useState<"loading" | "ready">("loading");
  const [resumeScope, setResumeScope] = useState<OwnerScopedCacheScope | null>(null);
  const [sessionId, setSessionId] = useState(() =>
    makeIdempotencyKey(`lesson-session:${lesson?.id ?? "unknown"}`)
  );
  const [phase, setPhase] = useState<LessonResumePhase>("briefing");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<LessonResumeAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);

  const guide = useMemo(() => getLessonGuide(lesson?.id ?? ""), [lesson?.id]);
  const lessonWords = useMemo(
    () => lesson?.wordIds.map((id) => WORD_BY_ID.get(id)).filter((word): word is VocabularyItem => Boolean(word)) ?? [],
    [lesson],
  );
  const localRuntime = useMemo(() => {
    if (!lesson) return null;
    const result = materializeLocalLessonRuntime(
      lesson,
      state.profile.script,
      sessionId,
    );
    return result.ok ? result.runtime : null;
  }, [lesson, sessionId, state.profile.script]);
  const { correctCount, requiredCorrectCount } = useMemo(
    () => summarizeLessonResumeAnswers(exercises, answers),
    [answers, exercises],
  );

  const resumeEntryKey = lesson ? lessonResumeEntryKey({
    lessonId: lesson.id,
    contentVersion: lesson.contentVersion,
    script: state.profile.script,
  }) : "";

  useEffect(() => {
    let cancelled = false;
    setResumeStatus("loading");
    setResumeScope(null);
    removeLegacyLearningResumeStorage();

    if (!lesson || !lessonUnlocked) {
      setResumeStatus("ready");
      return () => {
        cancelled = true;
      };
    }

    const applySession = (restored: LessonResumeV5 | null) => {
      const nextSessionId = restored?.sessionId
        ?? makeIdempotencyKey(`lesson-session:${lesson.id}`);
      const runtimeResult = materializeLocalLessonRuntime(
        lesson,
        state.profile.script,
        nextSessionId,
      );
      setSessionId(
        nextSessionId,
      );
      setPhase(restored?.phase ?? "briefing");
      setExercises(
        restored?.exercises
          ?? (runtimeResult.ok
            ? runtimeResult.runtime.activities.map(
                (activity) => activity.exercise,
              )
            : []),
      );
      setIndex(restored?.index ?? 0);
      setSelected(restored?.selected ?? null);
      setChecked(restored?.checked ?? false);
      setAnswers(restored?.answers ?? []);
      setFinished(restored?.finished ?? false);
      setEarnedXp(restored?.earnedXp ?? 0);
    };

    const loadSession = async () => {
      try {
        const ownerScope = await resolveLearningResumeOwnerScope(sync.ownerKey);
        const cacheScope = ownerScopedResumeCacheScope(ownerScope, resumeEntryKey);
        const record = await readLessonResume<unknown>(cacheScope);
        const restored = parseLessonResume(
          record?.value,
          lesson,
          state.profile.script,
        );
        if (record && !restored) await deleteLessonResume(cacheScope);
        if (cancelled) return;
        applySession(restored);
        setResumeScope(cacheScope);
      } catch (error) {
        if (cancelled) return;
        applySession(null);
        reportLearningResumeStorageError(error);
      } finally {
        if (!cancelled) setResumeStatus("ready");
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [lesson, lessonUnlocked, resumeEntryKey, state.profile.script, sync.ownerKey]);

  useEffect(() => {
    if (
      resumeStatus !== "ready"
      || !lesson
      || !lessonUnlocked
      || !resumeScope
      || resumeScope.entryKey !== resumeEntryKey
      || resumeScope.expectedOwnerGeneration.ownerKey !== sync.ownerKey
      || exercises.length === 0
    ) return;
    const snapshot: LessonResumeV5 = {
      version: 5,
      contentVersion: lesson.contentVersion,
      sessionId,
      lessonId: lesson.id,
      script: state.profile.script,
      phase,
      exercises,
      index,
      selected,
      checked,
      answers,
      finished,
      earnedXp,
    };
    void writeLessonResume({
      ...resumeScope,
      value: snapshot,
    }).catch(reportLearningResumeStorageError);
  }, [answers, checked, earnedXp, exercises, finished, index, lesson, lessonUnlocked, phase, resumeEntryKey, resumeScope, resumeStatus, selected, sessionId, state.profile.script, sync.ownerKey]);

  if (!lesson) {
    return (
      <div className="lesson-state-screen">
        {unavailableLesson ? <LockKeyhole size={44} /> : <CircleX size={44} />}
        <h1>{unavailableLesson ? "Nội dung này chưa được phát hành" : "Không tìm thấy thử luyện"}</h1>
        {unavailableLesson && <p>HANZI.OS chỉ mở các bài đã qua cổng phát hành; bản nháp không được tính vào tiến độ hay nhiệm vụ.</p>}
        <Link className="primary-button" to="/path"><ArrowLeft size={17} /> Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (!lessonUnlocked) {
    return (
      <div className="lesson-state-screen locked-screen">
        <LockKeyhole size={44} />
        <span>LOCAL PROTOTYPE · SEQUENCE REQUIRED</span>
        <h1>Bài tự luyện cục bộ này chưa mở</h1>
        <p>Đạt 70% ở bài local trước để tiếp tục chuỗi prototype; đây không phải prerequisite do máy chủ xác nhận.</p>
        <Link className="primary-button" to="/path"><ArrowLeft size={17} /> Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (resumeStatus === "loading") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BrainCircuit size={44} />
        <h1>Đang khôi phục phiên thử luyện</h1>
        <p>Hệ thống đang xác nhận đúng hồ sơ học và mốc đặt lại trước khi mở nội dung.</p>
      </div>
    );
  }

  const clearSession = () => {
    if (!resumeScope) return;
    void deleteLessonResume(resumeScope).catch(reportLearningResumeStorageError);
  };

  const restart = () => {
    const nextSessionId = makeIdempotencyKey(`lesson-session:${lesson.id}`);
    const runtimeResult = materializeLocalLessonRuntime(
      lesson,
      state.profile.script,
      nextSessionId,
    );
    setSessionId(nextSessionId);
    setPhase("briefing");
    setExercises(runtimeResult.ok
      ? runtimeResult.runtime.activities.map((activity) => activity.exercise)
      : []);
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setFinished(false);
    setEarnedXp(0);
  };

  if (phase === "briefing" && !finished) {
    return (
      <div className="lesson-briefing-page">
        <header className="briefing-topbar">
          <Link className="icon-button" to="/path" aria-label="Trở về Thiên Lộ"><ArrowLeft size={20} /></Link>
          <span>KNOWLEDGE TRANSFER · 01/02</span>
          <strong>{lesson.minutes} phút · {lesson.xp} XP</strong>
        </header>

        <section className="briefing-hero">
          <div>
            <span className="system-kicker"><BrainCircuit size={16} /> LĨNH HỘI TRƯỚC · TRUY HỒI SAU</span>
            <h1>{lesson.title}</h1>
            <p className="briefing-chinese">{lesson.chineseTitle}</p>
            <p>{lesson.objective}</p>
          </div>
          <div className="mastery-gate">
            <Target size={26} />
            <span>Ngưỡng tự kiểm local</span>
            <strong>70%</strong>
            <small>Hiểu quy tắc rồi tự gọi lại, không học bằng đoán đáp án.</small>
          </div>
        </section>

        <div className="briefing-grid">
          <section className="briefing-concept">
            <header><span>01 · CỐT LÕI</span><BrainCircuit size={20} /></header>
            <h2>{guide.concept}</h2>
            <p>{guide.rule}</p>
            <div className="guide-examples">
              {guide.examples.map((example) => (
                <button key={example.chinese} type="button" onClick={() => speakMandarin(example.chinese)}>
                  <Volume2 size={17} />
                  <span><strong>{example.chinese}</strong><small>{example.pinyin}</small></span>
                  <em>{example.meaning}</em>
                </button>
              ))}
            </div>
          </section>

          <aside className="briefing-intel">
            <div className="pitfall-panel">
              <span><AlertTriangle size={17} /> ĐIỂM MÙ THƯỜNG GẶP</span>
              <p>{guide.pitfall}</p>
            </div>
            <div className="checkpoint-panel">
              <span><Target size={17} /> TỰ KIỂM TRƯỚC KHI VÀO TRẬN</span>
              <p>{guide.checkpoint}</p>
            </div>
          </aside>
        </div>

        <section className="briefing-lexicon">
          <header><span>02 · TÍN HIỆU MỤC TIÊU</span><small>{lessonWords.length} mục trong bài</small></header>
          <div>
            {lessonWords.map((word) => {
              const character = displayCharacter(word, state.profile.script);
              return (
                <button key={word.id} type="button" onClick={() => speakMandarin(character)}>
                  <strong>{character}</strong>
                  <span>{word.pinyin}</span>
                  <small>{word.meaning}</small>
                  <Volume2 size={15} />
                </button>
              );
            })}
          </div>
        </section>

        <p className="synthetic-audio-note">
          Âm thanh trong bài là TTS tổng hợp của trình duyệt, chỉ dùng để luyện nghe và nhại; không phải audio bản ngữ hay bằng chứng phát âm.
        </p>

        <footer className="briefing-actions">
          <p><Lightbulb size={17} /> Phiên làm bài sẽ tự lưu sau mỗi lựa chọn và tiếp tục đúng vị trí khi tải lại trang.</p>
          <button className="primary-button" type="button" onClick={() => setPhase("exercise")}>
            Bước vào Thử Luyện <Play size={17} />
          </button>
        </footer>
      </div>
    );
  }

  const current = exercises[index];
  if (!current) {
    return (
      <div className="lesson-state-screen">
        <CircleX size={44} />
        <h1>Phiên thử luyện chưa thể khởi tạo</h1>
        <button className="primary-button" type="button" onClick={restart}><RotateCcw size={17} /> Khởi tạo lại</button>
      </div>
    );
  }

  const score = Math.round((correctCount / Math.max(1, exercises.length)) * 100);
  const requiredTotal = exercises.filter((exercise) => exercise.requiredForPass).length;
  const requiredPassed = requiredTotal === 0
    || requiredCorrectCount / requiredTotal >= 0.7;
  const gateScore = requiredPassed ? score : Math.min(score, 69);
  const isCorrect = answersMatch(selected, current.correct);

  const checkAnswer = () => {
    if (!selected?.trim() || checked) return;
    const provenance = localRuntime
      ? localLessonActivityProvenance(localRuntime, index)
      : null;
    if (!provenance) return;
    const disposition = actions.recordAnswer({
      lessonId: lesson.id,
      questionId: current.id,
      wordId: current.wordId,
      kind: current.kind,
      skill: current.skill,
      prompt: current.kind === "listening" ? current.spokenText ?? current.prompt : current.prompt,
      selectedAnswer: selected,
      correctAnswer: current.correct,
      explanation: current.explanation,
      isCorrect,
      idempotencyKey: `${sessionId}:answer:${current.id}`,
      activityVersion: current.activityVersion,
      requiredForPass: current.requiredForPass,
    }, provenance);
    if (disposition === "rejected" || disposition === "conflict") return;
    setChecked(true);
    setAnswers((currentAnswers) => [...currentAnswers, {
      exerciseId: current.id,
      selectedAnswer: selected,
    }]);
  };

  const next = () => {
    if (index < exercises.length - 1) {
      setIndex((currentIndex) => currentIndex + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    const previous = state.completedLessons[lesson.id];
    const firstMastery = gateScore >= 70 && (!previous || previous.bestScore < 70);
    const reward = firstMastery
      ? lesson.xp
      : previous
        ? Math.round(lesson.xp * 0.2)
        : Math.round(lesson.xp * 0.25);
    if (!localRuntime) return;
    const disposition = actions.completeLesson(
      lesson.id,
      score,
      `${sessionId}:complete`,
      exercises.length,
      localLessonSessionProvenance(localRuntime),
    );
    if (disposition === "rejected" || disposition === "conflict") return;
    setEarnedXp(disposition === "inserted" ? reward : 0);
    setFinished(true);
  };

  if (finished) {
    const passed = gateScore >= 70;
    const bestScore = Math.max(gateScore, state.completedLessons[lesson.id]?.bestScore ?? 0);
    return (
      <div className="lesson-result-screen">
        <div className={`result-sigil ${passed ? "passed" : "retry"}`}>
          {passed ? <CircleCheck size={38} /> : <RotateCcw size={38} />}
          <span />
        </div>
        <span className="system-kicker">LOCAL PROTOTYPE · NOT SERVER EVIDENCE</span>
        <h1>{passed ? "Đã hoàn tất tự kiểm cục bộ" : "Phiên tự luyện đã được lưu local"}</h1>
        <p>{passed ? "Kết quả local đã vượt ngưỡng 70% và chỉ mở bước tiếp theo trong chuỗi prototype ẩn danh; tài khoản server không dùng kết quả này làm mastery." : requiredPassed ? "Các câu sai được giữ trong nhật ký local để luyện lại; chúng chưa phải evidence có thẩm quyền." : "Checkpoint thanh điệu local chưa đạt 70%. Hãy ôn phần cốt lõi rồi thử lại; không có prerequisite server nào được mở."}</p>
        <div className="result-metrics">
          <div><small>Điểm tự kiểm local</small><strong>{gateScore}%</strong></div>
          <div><small>Tốt nhất trên máy này</small><strong>{bestScore}%</strong></div>
          <div><small>XP tương tác local</small><strong>+{earnedXp} XP</strong></div>
        </div>
        <div className="mastery-threshold"><span style={{ width: `${gateScore}%` }} /><i style={{ left: "70%" }}>70% · TỰ KIỂM LOCAL</i></div>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={restart}><RotateCcw size={17} /> Học và thử lại</button>
          {passed ? (
            <Link className="primary-button" to="/path" onClick={clearSession}>Tiếp tục Thiên Lộ <ArrowRight size={17} /></Link>
          ) : (
            <Link className="primary-button" to="/mistakes" onClick={clearSession}>Phá giải Nghịch Cảnh <ArrowRight size={17} /></Link>
          )}
        </div>
      </div>
    );
  }

  const ExerciseIcon = exerciseIcon(current.kind);
  const progress = Math.round(((index + 1) / exercises.length) * 100);

  return (
    <div className="lesson-live-page">
      <header className="lesson-live-header">
        <Link className="icon-button" to="/path" aria-label="Thoát bài học"><X size={20} /></Link>
        <div className="lesson-progress-track"><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1} / {exercises.length}</span>
        <span className="lesson-xp"><Zap size={15} /> {lesson.xp} XP</span>
      </header>

      <div className="lesson-context">
        <span><ExerciseIcon size={16} /> {current.instruction}</span>
        <strong>{lesson.title} · {lesson.chineseTitle}</strong>
      </div>

      <section className="exercise-stage">
        <div className={`exercise-prompt kind-${current.kind}`}>
          {current.kind === "listening" ? (
            <button className="sound-orb" type="button" onClick={() => current.spokenText && speakMandarin(current.spokenText)} aria-label="Phát âm thanh">
              <Volume2 size={38} />
              <span aria-hidden="true" />
            </button>
          ) : (
            <>
              <h1>{current.prompt}</h1>
              {current.promptMeta && <p>{current.promptMeta}</p>}
              {current.spokenText && current.kind !== "recall" && (
                <button className="listen-inline" type="button" onClick={() => speakMandarin(current.spokenText!)}>
                  <Volume2 size={17} /> Nghe
                </button>
              )}
            </>
          )}
          {current.kind === "listening" && <p>{current.promptMeta}</p>}
          {current.spokenText && (
            <small className="synthetic-audio-note compact">
              TTS tổng hợp · chỉ dùng luyện tập
            </small>
          )}
        </div>

        {current.kind === "recall" ? (
          <div className={`recall-answer ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
            <label htmlFor="recall-input">Hán tự bạn tự gọi lại</label>
            <input
              id="recall-input"
              value={selected ?? ""}
              disabled={checked}
              autoComplete="off"
              autoFocus
              inputMode="text"
              placeholder="Nhập chữ Hán..."
              onChange={(event) => setSelected(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && selected?.trim()) checkAnswer();
              }}
            />
            <small>Không chấp nhận pinyin: mục tiêu là tự tái tạo chữ từ trí nhớ.</small>
          </div>
        ) : (
          <div className="answer-grid">
            {current.options.map((option, optionIndex) => {
              const chosen = selected === option;
              const revealCorrect = checked && option === current.correct;
              const revealWrong = checked && chosen && option !== current.correct;
              return (
                <button
                  className={`${chosen ? "selected" : ""} ${revealCorrect ? "correct" : ""} ${revealWrong ? "wrong" : ""}`}
                  disabled={checked}
                  key={option}
                  type="button"
                  onClick={() => setSelected(option)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <strong>{option}</strong>
                  {revealCorrect && <Check size={19} />}
                  {revealWrong && <X size={19} />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer className={`answer-console ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
        {checked ? (
          <div className="answer-explanation">
            {isCorrect ? <CircleCheck size={23} /> : <Lightbulb size={23} />}
            <div>
              <strong>{isCorrect ? "Phán định chính xác" : `Đáp án đúng: ${current.correct}`}</strong>
              <p>{current.explanation}</p>
            </div>
          </div>
        ) : (
          <p><Lightbulb size={17} /> {current.kind === "recall" ? "Tự gọi lại trước khi xác nhận; đừng mở từ điển." : "Chọn một đáp án để hệ thống phân tích."}</p>
        )}
        <button className="primary-button" disabled={!selected?.trim()} type="button" onClick={checked ? next : checkAnswer}>
          {checked ? (index === exercises.length - 1 ? "Hoàn tất thử luyện" : "Câu tiếp theo") : "Xác nhận"}
          <ArrowRight size={17} />
        </button>
      </footer>
    </div>
  );
}
