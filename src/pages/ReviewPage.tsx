import {
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheck,
  Gauge,
  RotateCcw,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Rating } from "ts-fsrs";
import type { Grade } from "ts-fsrs";
import { WORD_BY_ID } from "../data/curriculum";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

const ratingOptions = [
  { rating: Rating.Again, key: "1", label: "Quên", hint: "Ôn lại rất sớm", className: "again" },
  { rating: Rating.Hard, key: "2", label: "Khó", hint: "Khoảng cách ngắn", className: "hard" },
  { rating: Rating.Good, key: "3", label: "Nhớ", hint: "Lịch chuẩn FSRS", className: "good" },
  { rating: Rating.Easy, key: "4", label: "Dễ", hint: "Khoảng cách dài", className: "easy" },
] as const;

export function ReviewPage() {
  const { state, actions, dueWordIds } = useLearning();
  const defaultQueue = () => [...dueWordIds];
  const [queue, setQueue] = useState(defaultQueue);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});

  const currentId = queue[index];
  const word = WORD_BY_ID.get(currentId);
  const card = currentId ? state.fsrsCards[currentId] : undefined;
  const complete = index >= queue.length;

  const grade = (rating: Grade) => {
    if (!word) return;
    actions.gradeReview(word.id, rating);
    setRatings((current) => ({ ...current, [rating]: (current[rating] ?? 0) + 1 }));
    setIndex((current) => current + 1);
    setRevealed(false);
  };

  const restart = () => {
    setQueue(defaultQueue());
    setIndex(0);
    setRevealed(false);
    setRatings({});
  };

  if (complete || !word) {
    return (
      <div className="review-complete-screen">
        <div className="memory-complete-core"><BrainCircuit size={42} /><span /></div>
        <span className="system-kicker">MEMORY CYCLE · {queue.length ? "COMPLETE" : "STANDBY"}</span>
        <h1>{queue.length ? "Ký ức đã tái đồng bộ" : "Chưa có ký ức đến hạn"}</h1>
        <p>{queue.length ? "FSRS đã điều chỉnh lịch xuất hiện tiếp theo theo mức bạn tự đánh giá." : "Từ chỉ đi vào Ký Ức Trận sau khi bạn gặp chúng trong bài học hoặc chủ động lưu. Hãy lĩnh hội trước, truy hồi sau."}</p>
        <div className="review-summary-grid">
          <div><small>Tổng thẻ</small><strong>{queue.length}</strong></div>
          <div><small>Quên / Khó</small><strong>{(ratings[Rating.Again] ?? 0) + (ratings[Rating.Hard] ?? 0)}</strong></div>
          <div><small>Nhớ / Dễ</small><strong>{(ratings[Rating.Good] ?? 0) + (ratings[Rating.Easy] ?? 0)}</strong></div>
          <div><small>Nhận được</small><strong>+{queue.length * 5} XP</strong></div>
        </div>
        {queue.length ? (
          <button className="secondary-button" type="button" onClick={restart}><RotateCcw size={17} /> Mở lượt ôn mới</button>
        ) : (
          <Link className="primary-button" to="/path"><Sparkles size={17} /> Học bài để kích hoạt ký ức</Link>
        )}
      </div>
    );
  }

  const character = state.profile.script === "traditional" ? word.traditional : word.simplified;
  const progress = Math.round((index / queue.length) * 100);

  return (
    <div className="content-page review-page">
      <header className="page-hero review-hero">
        <div>
          <span className="system-kicker"><BrainCircuit size={15} /> FSRS MEMORY CORE</span>
          <h1>Ký Ức Trận</h1>
          <p>Nhìn câu hỏi, tự gọi lại đáp án trong đầu rồi mới lật thẻ. Hệ thống sẽ tính lịch ôn từ phản hồi của bạn.</p>
        </div>
        <div className="review-live-stats">
          <span><strong>{queue.length - index}</strong><small>đang chờ</small></span>
          <span><strong>{state.reviewCount}</strong><small>lượt đã ôn</small></span>
          <span><strong>{state.skillMastery.vocabulary}%</strong><small>từ vựng</small></span>
        </div>
      </header>

      <div className="review-session-bar">
        <span>MEMORY BLOCK {String(index + 1).padStart(2, "0")}</span>
        <div><i style={{ width: `${progress}%` }} /></div>
        <strong>{index + 1}/{queue.length}</strong>
      </div>

      <section className={`memory-card ${revealed ? "revealed" : ""}`}>
        <div className="memory-grid" aria-hidden="true" />
        <div className="memory-card-head">
          <span><Sparkles size={15} /> HSK {word.hsk} · {word.partOfSpeech}</span>
          <button className="icon-button" type="button" onClick={() => speakMandarin(character)} aria-label={`Nghe ${character}`}><Volume2 size={20} /></button>
        </div>
        <div className="memory-front">
          <span className="memory-character">{character}</span>
          <p>{revealed ? word.pinyin : "Gọi lại cách đọc và ý nghĩa"}</p>
        </div>
        {revealed && (
          <div className="memory-back">
            <div><small>Ý nghĩa</small><strong>{word.meaning}</strong></div>
            <div><small>Ngữ cảnh</small><strong>{word.example}</strong><span>{word.examplePinyin}</span><p>{word.exampleMeaning}</p></div>
            <div className="memory-tags">{word.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        )}
        {!revealed && (
          <button className="reveal-button" type="button" onClick={() => setRevealed(true)}>
            Hiện đáp án <ChevronRight size={18} />
          </button>
        )}
      </section>

      {revealed && (
        <section className="rating-console">
          <div className="rating-heading">
            <Gauge size={19} />
            <span><strong>Bạn nhớ tốt đến đâu?</strong><small>Đánh giá khả năng gọi lại, không đánh giá sự quen mắt.</small></span>
          </div>
          <div className="rating-buttons">
            {ratingOptions.map((option) => (
              <button className={option.className} key={option.rating} type="button" onClick={() => grade(option.rating)}>
                <kbd>{option.key}</kbd>
                <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                {option.rating === Rating.Good && <Check size={17} />}
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="fsrs-status-line">
        <span><CalendarClock size={15} /> Lần ôn trước: {card?.last_review ? new Date(card.last_review).toLocaleDateString("vi-VN") : "thẻ mới"}</span>
        <span><Zap size={15} /> +5 XP mỗi phán định</span>
        <span><CircleCheck size={15} /> Tự động lưu sau mỗi thẻ</span>
      </footer>
    </div>
  );
}
