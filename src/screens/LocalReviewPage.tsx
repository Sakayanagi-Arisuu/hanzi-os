import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Rating, type Grade } from "ts-fsrs";
import { ReviewRatingConsole } from "../components/ReviewRatingConsole";
import { ReviewMemoryArena } from "../components/ReviewMemoryArena";
import { MemoryReviewLobby } from "../components/MemoryReviewLobby";
import { MemoryReviewComplete } from "../components/MemoryReviewComplete";
import { LESSON_BY_ID, RELEASED_WORD_BY_ID } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import {
  buildReviewForecast,
  buildReviewMemoryDistribution,
  countReviewsToday,
  getNextReviewDate,
  summarizeReviewSession,
  type ReviewSessionEntry,
} from "../learning/reviewPresentation";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { emitSystemSignal } from "../system/systemSignals";

const ratingOptions = [
  {
    rating: Rating.Again,
    key: "1",
    label: "Quên",
    hint: "Ôn lại rất sớm",
    className: "again",
  },
  {
    rating: Rating.Hard,
    key: "2",
    label: "Khó",
    hint: "Khoảng cách ngắn",
    className: "hard",
  },
  {
    rating: Rating.Good,
    key: "3",
    label: "Ổn",
    hint: "Lịch chuẩn FSRS",
    className: "good",
  },
  {
    rating: Rating.Easy,
    key: "4",
    label: "Dễ",
    hint: "Khoảng cách dài",
    className: "easy",
  },
] as const;

export function LocalReviewPage() {
  const { state, actions, dueWordIds } = useLearning();
  const { checkpoint, recordReceipt } = useLearningJourney();
  const location = useLocation();
  const requestedLessonId = useMemo(
    () => new URLSearchParams(location.search).get("lesson"),
    [location.search],
  );
  const reinforcementWordIds = useMemo(() =>
    (requestedLessonId ? LESSON_BY_ID.get(requestedLessonId)?.wordIds ?? [] : [])
      .filter((wordId) => Boolean(state.fsrsCards[wordId])),
  [requestedLessonId, state.fsrsCards]);
  const vocabularyEvidenceCount = state.evidence.filter((item) =>
    item.masteryEligible && item.skill === "vocabulary"
  ).length;
  const defaultQueue = () => [...new Set([
    ...reinforcementWordIds,
    ...dueWordIds,
  ])];
  const [queue, setQueue] = useState(defaultQueue);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [sessionEntries, setSessionEntries] = useState<ReviewSessionEntry[]>([]);
  const [reviewKey, setReviewKey] = useState(() =>
    makeIdempotencyKey("review-card")
  );
  const cardHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const currentId = queue[index];
  const word = RELEASED_WORD_BY_ID.get(currentId);
  const card = currentId ? state.fsrsCards[currentId] : undefined;
  const complete = index >= queue.length;

  useEffect(() => {
    if (!complete || queue.length === 0 || !checkpoint?.completedStages.learn) return;
    recordReceipt({
      stage: "review",
      source: "review",
      lessonId: checkpoint.anchorLessonId,
      activityId: `review:${checkpoint.journeyId}:${queue.join(",")}`,
    });
  }, [checkpoint, complete, queue, recordReceipt]);

  useEffect(() => {
    if (currentId) cardHeadingRef.current?.focus();
  }, [currentId]);

  const grade = async (rating: Grade) => {
    if (!word) return;
    await actions.gradeReview(word.id, rating, reviewKey, hintUsed);
    emitSystemSignal({
      type: "review.recalled",
      sourceId: `review:${word.id}`,
      eventId: `${reviewKey}:recalled`,
    });
    if (index === queue.length - 1) emitSystemSignal({
      type: "review.queue-cleared",
      sourceId: "review:local-queue",
      eventId: `${reviewKey}:queue-cleared`,
    });
    setSessionEntries((current) => [...current, {
      hintUsed,
      rating: Number(rating),
      wordId: word.id,
    }]);
    setIndex((current) => current + 1);
    setRevealed(false);
    setHintUsed(false);
    setReviewKey(makeIdempotencyKey("review-card"));
  };

  const startQueue = (wordIds = defaultQueue()) => {
    setQueue(wordIds);
    setIndex(0);
    setRevealed(false);
    setHintUsed(false);
    setSessionEntries([]);
    setReviewKey(makeIdempotencyKey("review-card"));
    setStarted(true);
  };

  const forecast = useMemo(
    () => buildReviewForecast(state.fsrsCards),
    [state.fsrsCards],
  );
  const distribution = useMemo(
    () => buildReviewMemoryDistribution(state.fsrsCards),
    [state.fsrsCards],
  );

  if (!started) {
    return (
      <MemoryReviewLobby
        activatedCount={Object.keys(state.fsrsCards).length}
        dueCount={defaultQueue().length}
        forecast={forecast}
        distribution={distribution}
        reviewedToday={countReviewsToday(state.evidence)}
        onStart={() => startQueue()}
      />
    );
  }

  if (complete || !word) {
    const summary = summarizeReviewSession(sessionEntries);
    const weakWordIds = sessionEntries
      .filter((entry) => entry.rating <= Number(Rating.Hard))
      .map((entry) => entry.wordId);
    return (
      <MemoryReviewComplete
        independent={summary.independent}
        needsReview={summary.needsReview}
        nextReview={getNextReviewDate(state.fsrsCards)}
        onReviewWeak={weakWordIds.length ? () => startQueue([...new Set(weakWordIds)]) : undefined}
        total={summary.total}
        withHint={summary.withHint}
      />
    );
  }

  const character = state.profile.script === "traditional"
    ? word.traditional
    : word.simplified;
  const progress = Math.round((index / queue.length) * 100);

  return (
    <div className="memory-experience memory-session review-page">
      <header className="memory-session-toolbar">
        <div className="review-session-bar">
          <span><i className="memory-symbol" aria-hidden="true">阵</i> MEM-{revealed ? "03 · ĐỐI CHIẾU" : "02 · TRUY HỒI"}</span>
          <div className="review-progress-rail"><i style={{ width: `${progress}%` }} /><b aria-hidden="true" /></div>
          <strong><b>{index + 1}</b> / {queue.length}</strong>
        </div>
        <button type="button" onClick={() => setStarted(false)}><span aria-hidden="true">×</span> Thoát</button>
      </header>

      <div className="review-card-scroll">
        <ReviewMemoryArena
          audioSourceId={`review:local:${word.id}`}
          character={character}
          example={word.example}
          exampleMeaning={word.exampleMeaning}
          examplePinyin={word.examplePinyin}
          meaning={word.meaning}
          hintUsed={hintUsed}
          onUseHint={() => setHintUsed(true)}
          partOfSpeech={word.partOfSpeech}
          pinyin={word.pinyin}
          revealed={revealed}
          tags={word.tags}
          titleId="local-review-card-title"
          titleRef={cardHeadingRef}
        />

        <footer className="fsrs-status-line">
          <span>
            <i className="memory-symbol" aria-hidden="true">历</i>
            Lần ôn trước: {card?.last_review
              ? new Date(card.last_review).toLocaleDateString("vi-VN")
              : "thẻ mới"}
          </span>
          <span><i className="memory-symbol" aria-hidden="true">⚡</i> {vocabularyEvidenceCount} bằng chứng từ vựng</span>
          <span><i className="memory-symbol" aria-hidden="true">✓</i> Tự động lưu sau mỗi thẻ</span>
        </footer>
      </div>

      {revealed ? (
        <ReviewRatingConsole
          heading="Bạn nhớ tốt đến đâu?"
          headingId="local-review-rating-title"
          helper="Đánh giá khả năng gọi lại, không đánh giá sự quen mắt."
          onGrade={grade}
          options={ratingOptions}
        />
      ) : (
        <section
          className="review-action-console review-reveal-console"
          aria-label="Thao tác thẻ ôn"
          data-review-action="reveal"
        >
          <div className="review-action-inner">
            <div className="rating-heading">
              <span className="review-command-sigil" aria-hidden="true">✦</span>
              <span>
                <b>GIAO THỨC TRUY HỒI</b>
                <strong>Tự gọi lại trước khi xem đáp án</strong>
                <small>Nói thầm cách đọc và ý nghĩa, rồi mới giải mã mảnh ký ức.</small>
              </span>
            </div>
            <button
              className="reveal-button"
              type="button"
              onClick={() => setRevealed(true)}
            >
              <span><small>GIẢI MÃ</small>Hiện đáp án</span> <i className="memory-symbol" aria-hidden="true">›</i>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
