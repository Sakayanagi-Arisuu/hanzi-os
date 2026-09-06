import {
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
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { LessonQuestResult } from "../components/LessonQuestResult";
import { LessonTheoryPanel } from "../components/LessonTheoryPanel";
import { HanziPinyinInput } from "../components/HanziPinyinInput";
import { LESSON_BY_ID, WORD_BY_ID } from "../data/curriculum";
import { getLessonGuide } from "../data/lessonGuides";
import { getLessonTeachingGuide } from "../learning/lessonPedagogy";
import { learnerFacingCopy } from "../learning/lessonTeachingFlow";
import type {
  PublishedStudioLesson,
  PublishedStudioLessonEnhancement,
} from "../content/publishedStudioLessons";
import { usePublishedStudioLessons } from "../content/usePublishedStudioLessons";
import {
  parseLessonResume,
  scoreLessonResumeAnswers,
  type LessonResumeAnswer,
  type LessonResumePhase,
  type LessonResumeV5,
} from "../learning/resumeProtocol";
import {
  calculateLessonFirstClearXp,
  isLocalLessonRewardClaimed,
} from "../learning/interactionXp";
import { resolveExerciseSpeechText } from "../learning/exerciseSpeech";
import {
  localLessonActivityProvenance,
  localLessonSessionProvenance,
  materializeLocalLessonRuntime,
} from "../learning/localLessonRuntime";
import {
  isLessonReleased,
  isLessonUnlocked,
} from "../lib/adaptive";
import { answersMatch, type Exercise } from "../lib/exerciseGeneration";
import { makeIdempotencyKey } from "../lib/evidence";
import { removeLegacyLearningResumeStorage } from "../lib/storageKeys";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { emitSystemSignal } from "../system/systemSignals";
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

const exerciseIcon = (kind: Exercise["kind"]) => {
  if (kind === "listening") return Headphones;
  if (kind === "sentence") return BookOpenText;
  if (kind === "recall") return PenLine;
  return Sparkles;
};

export function LessonPage() {
  const { lessonId } = useParams();
  const { sync } = useLearning();
  const publishedLessons = usePublishedStudioLessons();
  if (sync.session === null) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BrainCircuit size={44} />
        <h1>Đang xác nhận tài khoản học</h1>
        <p>Hệ thống đang xác định sẽ dùng tiến độ trên thiết bị hay tiến độ tài khoản đã xác nhận.</p>
      </div>
    );
  }
  return sync.session.authenticated
    ? <AuthenticatedLessonPage
        publishedLesson={lessonId ? publishedLessons.lessons.get(lessonId) : undefined}
        publishedLessonEnhancement={lessonId ? publishedLessons.enhancements.get(lessonId) : undefined}
        publishedLessonStatus={publishedLessons.status}
        retryPublishedLesson={publishedLessons.retry}
      />
    : <LocalLessonPage
        publishedLesson={lessonId ? publishedLessons.lessons.get(lessonId) : undefined}
        publishedLessonEnhancement={lessonId ? publishedLessons.enhancements.get(lessonId) : undefined}
        publishedLessonStatus={publishedLessons.status}
        retryPublishedLesson={publishedLessons.retry}
      />;
}

function LocalLessonPage({
  publishedLesson,
  publishedLessonEnhancement,
  publishedLessonStatus,
  retryPublishedLesson,
}: {
  publishedLesson?: PublishedStudioLesson;
  publishedLessonEnhancement?: PublishedStudioLessonEnhancement;
  publishedLessonStatus: "loading" | "ready" | "fallback";
  retryPublishedLesson: () => void;
}) {
  const { lessonId } = useParams();
  const { state, actions, sync } = useLearning();
  const { currentStep, recordReceipt } = useLearningJourney();
  const requestedLesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined;
  const availableForPath = Boolean(
    requestedLesson
    && isLessonReleased(requestedLesson)
  );
  const unavailableLesson = Boolean(requestedLesson && !availableForPath);
  const lesson = availableForPath ? requestedLesson : undefined;
  const presentedLesson = lesson && publishedLesson?.lesson.id === lesson.id
    ? publishedLesson.lesson
    : lesson;
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
  const [selectedUsedHint, setSelectedUsedHint] = useState(false);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<LessonResumeAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [reviewingTheory, setReviewingTheory] = useState(false);
  const [theoryReady, setTheoryReady] = useState(false);

  const guide = useMemo(
    () => getLessonTeachingGuide(
      lesson?.id ?? "",
      publishedLesson?.guide ?? getLessonGuide(lesson?.id ?? ""),
    ),
    [lesson?.id, publishedLesson],
  );
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
  const { correctCount, gateScore, requiredPassed } = useMemo(
    () => scoreLessonResumeAnswers(exercises, answers),
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
      setSelectedUsedHint(restored?.selectedUsedHint === true);
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
      selectedUsedHint,
      checked,
      answers,
      finished,
      earnedXp,
    };
    void writeLessonResume({
      ...resumeScope,
      value: snapshot,
    }).catch(reportLearningResumeStorageError);
  }, [answers, checked, earnedXp, exercises, finished, index, lesson, lessonUnlocked, phase, resumeEntryKey, resumeScope, resumeStatus, selected, selectedUsedHint, sessionId, state.profile.script, sync.ownerKey]);

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
        <span>PHONG ẤN · CẦN THỬ LUYỆN TIÊN QUYẾT</span>
        <h1>Thử Luyện này chưa khai mở</h1>
        <p>Đạt 70% ở bài trước trên thiết bị để tiếp tục chuỗi học; kết quả này không thay thế tiến độ tài khoản đã xác nhận.</p>
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
    setSelectedUsedHint(false);
    setChecked(false);
    setAnswers([]);
    setFinished(false);
    setEarnedXp(0);
    setClaimingReward(false);
    setRewardError(null);
    setReviewingTheory(false);
    setTheoryReady(false);
  };

  if (phase === "briefing" && !finished) {
    return (
      <div className="lesson-briefing-page">
        <div className="lesson-briefing-scroll">
          <section className="briefing-hero">
            <header className="lesson-briefing-masthead">
              <Link className="lesson-briefing-back" to="/path" aria-label="Trở về Thiên Lộ">
                <ArrowLeft size={18} /><span>Thiên Lộ</span>
              </Link>
              <strong>{lesson.minutes} phút</strong>
            </header>
            <div className="briefing-hero-copy">
              <span className="system-kicker"><BrainCircuit size={16} /> MỤC TIÊU BÀI HỌC</span>
              <h1>{presentedLesson?.title}</h1>
              <p className="briefing-chinese">{presentedLesson?.chineseTitle}</p>
              <p>{learnerFacingCopy(presentedLesson?.objective ?? lesson.objective)}</p>
            </div>
          </section>

          <LessonTheoryPanel
            guide={guide}
            lessonId={lesson.id}
            lessonObjective={presentedLesson?.objective ?? lesson.objective}
            preferGuide={Boolean(publishedLesson?.guide)}
            lessonWords={lessonWords}
            script={state.profile.script}
            practiceKinds={exercises.map((exercise) => exercise.kind)}
            practiceWordIds={exercises.map((exercise) => exercise.wordId)}
            contentOverride={publishedLesson?.richContent}
            enhancement={publishedLessonEnhancement}
            ready={theoryReady || answers.length > 0 || index > 0}
            onReadinessChange={setTheoryReady}
            onComplete={() => {
              emitSystemSignal({ type: "lesson.started", sourceId: `lesson:${lesson.id}` });
              setPhase("exercise");
            }}
            completionLabel={answers.length > 0 || index > 0 || selected
              ? `Tiếp tục câu ${index + 1}/${exercises.length}`
              : "Bước vào Thử Luyện"}
          />

          {publishedLessonStatus === "fallback" && <p className="synthetic-audio-note" role="status">Bản biên soạn mới chưa tải được; bài cốt lõi và tiến độ vẫn hoạt động. <button className="secondary-button" type="button" onClick={retryPublishedLesson}>Thử tải lại</button></p>}

          <p className="synthetic-audio-note">
            Âm Mẫu Tổng Hợp · TTS của trình duyệt chỉ dùng để luyện nghe và nhại; không phải audio người thật hay bằng chứng phát âm.
          </p>
        </div>
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
  const isCorrect = answersMatch(selected, current.correct);

  const checkAnswer = async () => {
    if (!selected?.trim() || checked) return;
    const provenance = localRuntime
      ? localLessonActivityProvenance(localRuntime, index)
      : null;
    if (!provenance) return;
    const disposition = await actions.recordAnswer({
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
      usedHint: selectedUsedHint,
    }, provenance);
    if (disposition === "rejected" || disposition === "conflict") return;
    const submittedAnswer: LessonResumeAnswer = {
      exerciseId: current.id,
      selectedAnswer: selected,
      usedHint: selectedUsedHint,
    };
    const nextAnswers = [...answers, submittedAnswer];
    if (scoreLessonResumeAnswers(exercises, nextAnswers).gateScore >= 70) recordReceipt({
      stage: "learn",
      source: "lesson",
      lessonId: lesson.id,
      activityId: `${sessionId}:journey-learn`,
    });
    emitSystemSignal({
      type: isCorrect ? "learning.correct" : "learning.retry",
      sourceId: `lesson:${lesson.id}:activity:${current.id}`,
      eventId: `${sessionId}:feedback:${current.id}`,
    });
    setChecked(true);
    setAnswers(nextAnswers);
  };

  const next = async () => {
    if (index < exercises.length - 1) {
      setIndex((currentIndex) => currentIndex + 1);
      setSelected(null);
      setSelectedUsedHint(false);
      setChecked(false);
      return;
    }
    const previous = state.completedLessons[lesson.id];
    const reward = calculateLessonFirstClearXp({
      lessonXp: lesson.xp,
      gateScore,
      previousBestScore: previous?.bestScore,
    });
    const firstClear = reward > 0;
    if (!localRuntime) return;
    const disposition = await actions.completeLesson(
      lesson.id,
      score,
      `${sessionId}:complete`,
      exercises.length,
      localLessonSessionProvenance(localRuntime),
    );
    if (disposition === "rejected" || disposition === "conflict") return;
    setEarnedXp(disposition === "inserted" ? reward : 0);
    setFinished(true);
    emitSystemSignal({
      type: gateScore >= 70 ? "lesson.completed" : "learning.retry",
      sourceId: `lesson:${lesson.id}:result`,
      eventId: `${sessionId}:result`,
      message: gateScore >= 70
        ? firstClear
          ? `Nhiệm vụ ${lesson.title} hoàn thành. Rương phần thưởng đã xuất hiện.`
          : `Nhiệm vụ ${lesson.title} đã được luyện lại.`
        : undefined,
    });
    if (firstClear) emitSystemSignal({
      type: "path.unlocked",
      sourceId: `lesson:${lesson.id}:unlock`,
      eventId: `${sessionId}:unlock`,
    });
  };

  const claimReward = async () => {
    if (claimingReward) return;
    setClaimingReward(true);
    setRewardError(null);
    const awarded = await actions.claimLessonReward(lesson.id);
    setClaimingReward(false);
    if (!awarded) {
      setRewardError("Chưa thể mở rương lúc này. Hãy thử lại sau.");
    }
  };

  if (finished) {
    const passed = gateScore >= 70;
    const completion = state.completedLessons[lesson.id];
    const rewardClaimed = passed && isLocalLessonRewardClaimed({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonXp: lesson.xp,
      completedAt: completion?.completedAt,
      activityLog: state.activityLog,
    });
    const rewardState = !passed
      ? "unavailable" as const
      : rewardClaimed || earnedXp === 0
        ? "claimed" as const
        : claimingReward ? "claiming" as const : "claimable" as const;
    return (
      <LessonQuestResult
        lessonId={lesson.id}
        lessonTitle={presentedLesson?.title ?? lesson.title}
        chineseTitle={presentedLesson?.chineseTitle ?? lesson.chineseTitle}
        passed={passed}
        correctCount={correctCount}
        totalCount={exercises.length}
        gateScore={gateScore}
        requiredPassed={requiredPassed}
        rewardXp={lesson.xp}
        rewardState={rewardState}
        rewardError={rewardError}
        onClaimReward={() => void claimReward()}
        onRetry={restart}
        onNavigate={clearSession}
        retryDestination="/mistakes"
        retryDestinationLabel="Xem câu cần ôn"
        continueDestination={currentStep?.stage === "learn"
          ? undefined
          : currentStep?.to}
        continueDestinationLabel={currentStep?.stage === "learn"
          ? undefined
          : currentStep ? `Tiếp tục bước ${currentStep.stageLabel}` : undefined}
      />
    );
  }
  const currentSpeechText = resolveExerciseSpeechText(
    current,
    current.wordId ? WORD_BY_ID.get(current.wordId) : undefined,
    state.profile.script,
  );

  const ExerciseIcon = exerciseIcon(current.kind);
  const progress = Math.round(((index + 1) / exercises.length) * 100);

  return (
    <div className="lesson-live-page">
      <header className="lesson-live-header">
        <Link className="lesson-return-link" to="/path" aria-label="Rời bài và trở về Thiên Lộ; tiến độ đã được tự lưu">
          <ArrowLeft size={18} /><span>Thiên Lộ</span>
        </Link>
        <div className="lesson-progress-track"><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1} / {exercises.length}</span>
        <button className="lesson-theory-button" type="button" onClick={() => {
          if (!checked) setSelectedUsedHint(true);
          setReviewingTheory(true);
        }} aria-pressed={reviewingTheory}>
          <BookOpenText size={17} /><span>Lý thuyết</span>
        </button>
      </header>

      <div className="lesson-context">
        <span><ExerciseIcon size={16} /> {current.instruction}</span>
        <strong>{presentedLesson?.title ?? lesson.title} · {presentedLesson?.chineseTitle ?? lesson.chineseTitle}</strong>
      </div>

      <section className={`exercise-stage ${reviewingTheory ? "is-theory-review" : ""}`}>
        {reviewingTheory ? (
          <LessonTheoryPanel
            compact
            guide={guide}
            lessonId={lesson.id}
            lessonObjective={presentedLesson?.objective ?? lesson.objective}
            preferGuide={Boolean(publishedLesson?.guide)}
            lessonWords={lessonWords}
            script={state.profile.script}
            practiceKinds={exercises.map((exercise) => exercise.kind)}
            practiceWordIds={exercises.map((exercise) => exercise.wordId)}
            contentOverride={publishedLesson?.richContent}
            enhancement={publishedLessonEnhancement}
          />
        ) : (
          <>
        <div className={`exercise-prompt kind-${current.kind}`}>
          {current.kind === "listening" ? (
            <button className="sound-orb" type="button" onClick={() => currentSpeechText && speakMandarin(currentSpeechText)} aria-label="Phát âm thanh">
              <Volume2 size={38} />
              <span aria-hidden="true" />
            </button>
          ) : (
            <>
              <h1>{current.prompt}</h1>
              {current.promptMeta && <p>{current.promptMeta}</p>}
              {currentSpeechText && current.kind !== "recall" && (
                <button className="listen-inline" type="button" onClick={() => speakMandarin(currentSpeechText)}>
                  <Volume2 size={17} /> Nghe
                </button>
              )}
            </>
          )}
          {current.kind === "listening" && <p>{current.promptMeta}</p>}
          {current.spokenText && (
            <small className="synthetic-audio-note compact">
              Âm Mẫu Tổng Hợp · TTS luyện tập
            </small>
          )}
        </div>

        {current.kind === "recall" ? (
          <div className={`recall-answer ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
            <label htmlFor="recall-input">Hán tự bạn tự gọi lại</label>
            <HanziPinyinInput
              key={current.id}
              inputId="recall-input"
              value={selected ?? ""}
              disabled={checked}
              script={state.profile.script}
              onChange={setSelected}
              onAssistanceUsed={() => setSelectedUsedHint(true)}
              onSubmit={checkAnswer}
            />
            <small>Gõ trực tiếp để được tính vào ngưỡng. Bàn phím pinyin nội bộ là hỗ trợ nhập và câu đúng có hỗ trợ không mở khóa bài.</small>
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
          </>
        )}
      </section>

      <footer className={`answer-console ${reviewingTheory ? "lesson-theory-console" : checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
        {reviewingTheory ? (
          <>
            <p><BookOpenText size={17} /> Tiến độ vẫn được giữ; câu hiện tại được ghi là đã dùng trợ giúp.</p>
            <button className="primary-button" type="button" onClick={() => setReviewingTheory(false)}>
              Quay lại câu {index + 1} <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
        {checked ? (
          <div className="answer-explanation">
            {isCorrect ? <CircleCheck size={23} /> : <Lightbulb size={23} />}
            <div>
              <strong>{isCorrect
                ? selectedUsedHint
                  ? "Đúng với hỗ trợ · không tính vào ngưỡng"
                  : "Phán định chính xác"
                : `Đáp án đúng: ${current.correct}`}</strong>
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
          </>
        )}
      </footer>
    </div>
  );
}
