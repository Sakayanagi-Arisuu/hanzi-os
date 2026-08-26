import {
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  RotateCcw,
  ScanLine,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Rating, type Grade } from "ts-fsrs";
import { ReviewRatingConsole } from "../components/ReviewRatingConsole";
import { ReviewMemoryArena } from "../components/ReviewMemoryArena";
import { RELEASED_WORD_BY_ID } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { useLearning } from "../store/LearningStore";
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
    label: "Nhớ",
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
  const vocabularyEvidenceCount = state.evidence.filter((item) =>
    item.masteryEligible && item.skill === "vocabulary"
  ).length;
  const defaultQueue = () => [...dueWordIds];
  const [queue, setQueue] = useState(defaultQueue);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [reviewKey, setReviewKey] = useState(() =>
    makeIdempotencyKey("review-card")
  );
  const cardHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const currentId = queue[index];
  const word = RELEASED_WORD_BY_ID.get(currentId);
  const card = currentId ? state.fsrsCards[currentId] : undefined;
  const complete = index >= queue.length;

  useEffect(() => {
    if (currentId) cardHeadingRef.current?.focus();
  }, [currentId]);

  const grade = async (rating: Grade) => {
    if (!word) return;
    await actions.gradeReview(word.id, rating, reviewKey);
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
    setRatings((current) => ({
      ...current,
      [rating]: (current[rating] ?? 0) + 1,
    }));
    setIndex((current) => current + 1);
    setRevealed(false);
    setReviewKey(makeIdempotencyKey("review-card"));
  };

  const restart = () => {
    setQueue(defaultQueue());
    setIndex(0);
    setRevealed(false);
    setRatings({});
    setReviewKey(makeIdempotencyKey("review-card"));
  };

  if (complete || !word) {
    return (
      <div className="review-complete-screen">
        <div className="memory-complete-core">
          <BrainCircuit size={42} />
          <span />
        </div>
        <span className="system-kicker">
          KÝ ỨC TRẬN · {queue.length ? "ĐÃ KHÉP VÒNG" : "ĐANG CHỜ"}
        </span>
        <h1>
          {queue.length
            ? "Ký ức đã tái đồng bộ"
            : "Chưa có ký ức đến hạn"}
        </h1>
        <p>
          {queue.length
            ? "FSRS đã điều chỉnh lịch xuất hiện tiếp theo theo mức bạn tự đánh giá."
            : "Từ chỉ đi vào Ký Ức Trận sau khi bạn gặp chúng trong bài học hoặc chủ động lưu. Hãy lĩnh hội trước, truy hồi sau."}
        </p>
        <div className="review-summary-grid">
          <div><small>Tổng thẻ</small><strong>{queue.length}</strong></div>
          <div>
            <small>Quên / Khó</small>
            <strong>
              {(ratings[Rating.Again] ?? 0) + (ratings[Rating.Hard] ?? 0)}
            </strong>
          </div>
          <div>
            <small>Nhớ / Dễ</small>
            <strong>
              {(ratings[Rating.Good] ?? 0) + (ratings[Rating.Easy] ?? 0)}
            </strong>
          </div>
          <div><small>Năng lượng tương tác</small><strong>+{queue.length * 5} XP</strong></div>
        </div>
        {queue.length ? (
          <button className="secondary-button" type="button" onClick={restart}>
            <RotateCcw size={17} /> Mở lượt ôn mới
          </button>
        ) : (
          <Link className="primary-button" to="/path" viewTransition>
            <Sparkles size={17} /> Học bài để kích hoạt ký ức
          </Link>
        )}
      </div>
    );
  }

  const character = state.profile.script === "traditional"
    ? word.traditional
    : word.simplified;
  const progress = Math.round((index / queue.length) * 100);

  return (
    <div className="content-page review-page">
      <div className="review-session-header">
        <header className="page-hero review-hero">
          <div className="review-hero-identity">
            <span className="review-hero-sigil" aria-hidden="true">
              <BrainCircuit size={24} /><i /><b>03</b>
            </span>
            <div className="review-hero-copy">
              <span className="system-kicker">
                KÝ ỨC TRẬN · LỊCH FSRS
              </span>
              <h1>Ký Ức Trận</h1>
              <p>Triệu hồi · tự nhớ · phán định. Mỗi mảnh ký ức được tái đồng bộ ngay trên thiết bị.</p>
            </div>
          </div>
          <div className="review-live-stats">
            <span><strong>{queue.length - index}</strong><small>đang chờ</small></span>
            <span><strong>{state.reviewCount}</strong><small>lượt đã ôn</small></span>
            <span>
              <strong>{vocabularyEvidenceCount}</strong>
              <small>bằng chứng từ vựng</small>
            </span>
          </div>
        </header>

        <div className="review-session-bar">
          <span><ScanLine size={14} /> MẢNH KÝ ỨC {String(index + 1).padStart(2, "0")}</span>
          <div className="review-progress-rail"><i style={{ width: `${progress}%` }} /><b aria-hidden="true" /></div>
          <strong><b>{index + 1}</b> / {queue.length}</strong>
        </div>
      </div>

      <div className="review-card-scroll">
        <ReviewMemoryArena
          audioSourceId={`review:local:${word.id}`}
          character={character}
          example={word.example}
          exampleMeaning={word.exampleMeaning}
          examplePinyin={word.examplePinyin}
          meaning={word.meaning}
          partOfSpeech={word.partOfSpeech}
          pinyin={word.pinyin}
          revealed={revealed}
          tags={word.tags}
          titleId="local-review-card-title"
          titleRef={cardHeadingRef}
        />

        <footer className="fsrs-status-line">
          <span>
            <CalendarClock size={15} />
            Lần ôn trước: {card?.last_review
              ? new Date(card.last_review).toLocaleDateString("vi-VN")
              : "thẻ mới"}
          </span>
          <span><Zap size={15} /> +5 XP tương tác mỗi phán định</span>
          <span><CircleCheck size={15} /> Tự động lưu sau mỗi thẻ</span>
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
              <span className="review-command-sigil" aria-hidden="true"><Sparkles size={19} /></span>
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
              <span><small>GIẢI MÃ</small>Hiện đáp án</span> <ChevronRight size={18} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
