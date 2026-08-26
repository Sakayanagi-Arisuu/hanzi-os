import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Headphones,
  LibraryBig,
  RotateCcw,
  Settings2,
  Sparkles,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import {
  READER_PRESENTATION_WORD_BY_ID,
  type ReaderStoryPresentation,
} from "./readerPresentationContent";

export type ReaderJourneyStage =
  | "shelf"
  | "briefing"
  | "reading"
  | "checkpoint"
  | "result";

export type ReaderCheckpointView = {
  label: string;
  position: number;
  total: number;
  prompt: string;
  options: string[];
  selected: string | null;
  state: "idle" | "pending" | "recorded";
  outcome: "correct" | "incorrect" | null;
  explanation?: string;
};

export type ReaderResultView = {
  correctCount: number;
  total: number;
  outcomes: Array<"correct" | "incorrect">;
};

type ReaderExperienceProps = {
  story: ReaderStoryPresentation;
  stage: ReaderJourneyStage;
  checkpoint?: ReaderCheckpointView | null;
  result?: ReaderResultView | null;
  savedWordIds: string[];
  supportUsed: boolean;
  busy?: boolean;
  scriptPreference?: "simplified" | "traditional";
  onStageChange: (stage: ReaderJourneyStage) => void;
  onStart: () => void;
  onExit: () => void;
  onSupportUsed: () => void;
  onSpeak: (text: string, rate?: number) => void;
  onToggleSavedWord: (wordId: string) => void;
  onSelectOption?: (option: string) => void;
  onSubmitOption?: () => void;
  onContinueCheckpoint?: () => void;
  onRestart: () => void;
};

type Sheet = "support" | "word" | null;

const uniqueStoryWordIds = (story: ReaderStoryPresentation) => [
  ...new Set(story.sentences.flatMap((sentence) => sentence.wordIds)),
];

function InlineSentence({
  text,
  wordIds,
  onWord,
}: {
  text: string;
  wordIds: string[];
  onWord: (wordId: string) => void;
}) {
  const candidates = wordIds
    .map((id) => ({ id, word: READER_PRESENTATION_WORD_BY_ID.get(id)?.simplified ?? "" }))
    .filter((item) => item.word)
    .sort((left, right) => right.word.length - left.word.length);
  const parts: Array<{ text: string; wordId?: string }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const match = candidates.find((candidate) => text.startsWith(candidate.word, cursor));
    if (match) {
      parts.push({ text: match.word, wordId: match.id });
      cursor += match.word.length;
    } else {
      parts.push({ text: text[cursor] ?? "" });
      cursor += 1;
    }
  }
  return <>{parts.map((part, index) => part.wordId ? (
    <button
      className="reader-inline-word"
      key={`${part.wordId}-${index}`}
      type="button"
      onClick={() => onWord(part.wordId!)}
      aria-label={`Tra từ ${part.text}`}
    >{part.text}</button>
  ) : <span key={`plain-${index}`}>{part.text}</span>)}</>;
}

export function ReaderExperience({
  story,
  stage,
  checkpoint = null,
  result = null,
  savedWordIds,
  supportUsed,
  busy = false,
  scriptPreference = "simplified",
  onStageChange,
  onStart,
  onExit,
  onSupportUsed,
  onSpeak,
  onToggleSavedWord,
  onSelectOption,
  onSubmitOption,
  onContinueCheckpoint,
  onRestart,
}: ReaderExperienceProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [relatedPassageOpen, setRelatedPassageOpen] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState(
    story.sentences[0]?.wordIds[0] ?? "",
  );
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const immersive = stage === "reading" || stage === "checkpoint";
  const knownWordIds = useMemo(() => uniqueStoryWordIds(story), [story]);
  const selectedWord = READER_PRESENTATION_WORD_BY_ID.get(selectedWordId);

  useEffect(() => {
    document.body.classList.toggle("reader-immersive", immersive);
    return () => document.body.classList.remove("reader-immersive");
  }, [immersive]);

  useEffect(() => {
    if (!sheet) return;
    sheetCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheet(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sheetRef.current
        ? [...sheetRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          )]
        : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [sheet]);

  const openWord = (wordId: string) => {
    setSelectedWordId(wordId);
    onSupportUsed();
    setSheet("word");
  };
  const enablePinyin = () => {
    setShowPinyin((value) => !value);
    if (!showPinyin) onSupportUsed();
  };
  const enableTranslation = () => {
    setShowTranslation((value) => !value);
    if (!showTranslation) onSupportUsed();
  };
  const speak = (text: string, rate?: number) => {
    onSupportUsed();
    onSpeak(text, rate);
  };

  const stageProgress = stage === "reading"
    ? 32
    : stage === "checkpoint"
      ? 68 + ((checkpoint?.position ?? 0) / Math.max(checkpoint?.total ?? 1, 1)) * 24
      : 100;

  return (
    <section className={`reader-journey reader-journey--${stage}`} data-testid="reader-journey">
      {stage === "shelf" && (
        <div className="reader-shelf">
          <div className="reader-shelf-copy">
            <span className="reader-eyebrow"><LibraryBig size={15} /> VẠN QUYỂN CÁC · THƯ KHỐ ĐANG MỞ</span>
            <h1>Mở một câu chuyện.<br />Hiểu một thế giới.</h1>
            <p>Đọc tiếng Trung theo ngữ cảnh, chạm vào từ chưa biết và kiểm tra điều bạn thật sự hiểu.</p>
          </div>
          <button className="reader-book-card" type="button" aria-label={`Mở quyển ${story.title}`} onClick={() => onStageChange("briefing")}>
            <span className="reader-book-seal"><BookOpenText size={34} /><i>阅</i></span>
            <span className="reader-book-copy">
              <small>TRUYỆN NHẬP MÔN · HSK 1</small>
              <strong>{story.title}</strong>
              <em>{story.chineseTitle}</em>
              <span><Clock3 size={14} /> {story.estimatedMinutes} phút · {knownWordIds.length} từ trọng tâm</span>
            </span>
            <span className="reader-book-open-label">Mở quyển <ChevronRight size={19} aria-hidden="true" /></span>
          </button>
          <p className="reader-shelf-note">Một bản đọc đã sẵn sàng. Tiến độ được giữ trên thiết bị của bạn.</p>
        </div>
      )}

      {stage === "briefing" && (
        <div className="reader-briefing">
          <button className="reader-back-link" type="button" onClick={() => onStageChange("shelf")}>
            <ArrowLeft size={18} /> Trở lại thư khố
          </button>
          <div className="reader-briefing-book" aria-hidden="true">
            <span><BookOpenText size={54} /></span><i>读</i>
          </div>
          <div className="reader-briefing-copy">
            <span className="reader-eyebrow"><Sparkles size={14} /> TRUYỆN NHẬP MÔN · HSK 1</span>
            <p className="reader-briefing-chinese">{story.chineseTitle}</p>
            <h1>{story.title}</h1>
            <p>{story.summary}</p>
            <div className="reader-briefing-meta">
              <span><Clock3 size={16} /> {story.estimatedMinutes} phút</span>
              <span><BookOpenText size={16} /> {story.sentences.length} đoạn ngắn</span>
              <span><Bookmark size={16} /> {knownWordIds.length} từ có thể lưu</span>
            </div>
            {scriptPreference === "traditional" && (
              <p className="reader-script-note">Bản đọc này hiện dùng giản thể; từ tra cứu có đối chiếu phồn thể.</p>
            )}
            <div className="reader-briefing-actions">
              <button className="reader-secondary-action" type="button" onClick={() => setSheet("support")}>
                <Settings2 size={18} /> Tùy chọn hỗ trợ
              </button>
              <button className="reader-primary-action" disabled={busy} type="button" onClick={onStart}>
                Bước vào trang sách <ArrowRight size={19} />
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "reading" && (
        <div className="reader-session-shell">
          <header className="reader-session-header">
            <button type="button" onClick={onExit} aria-label="Khép lại trang đọc"><X size={20} /></button>
            <div><small>{story.chineseTitle}</small><strong>{story.title}</strong></div>
            <button type="button" onClick={() => setSheet("support")}><Settings2 size={18} /><span>Hỗ trợ</span></button>
            <div className="reader-session-progress" role="progressbar" aria-label="Tiến độ đọc" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stageProgress}><i style={{ width: `${stageProgress}%` }} /></div>
          </header>
          <main className="reader-manuscript-scroll">
            <article className="reader-manuscript">
              <header>
                <span>第 一 页</span>
                <h1>{story.chineseTitle}</h1>
                <p>{story.title}</p>
              </header>
              {story.sentences.map((sentence, index) => (
                <section className="reader-paragraph" key={`${story.id}-${index}`}>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <p lang="zh-Hans">
                    <InlineSentence text={sentence.chinese} wordIds={sentence.wordIds} onWord={openWord} />
                  </p>
                  {showPinyin && <span>{sentence.pinyin}</span>}
                  {showTranslation && <em>{sentence.translation}</em>}
                </section>
              ))}
              <p className="reader-word-hint"><Eye size={15} /> Chạm vào từ trong bài để tra nhanh và lưu ôn tập.</p>
            </article>
          </main>
          <footer className="reader-session-footer">
            <span>{supportUsed ? "Bạn đã dùng hỗ trợ trong lượt này." : "Đọc theo nhịp của bạn; hỗ trợ luôn ở góc trên."}</span>
            <button className="reader-primary-action" type="button" onClick={() => onStageChange("checkpoint")}>
              Đã đọc xong <ArrowRight size={19} />
            </button>
          </footer>
        </div>
      )}

      {stage === "checkpoint" && checkpoint && (
        <div className="reader-session-shell">
          <header className="reader-session-header">
            <button type="button" onClick={onExit} aria-label="Khép lại trang đọc"><X size={20} /></button>
            <div><small>ĐIỂM KIỂM TRA</small><strong>{story.title}</strong></div>
            <button type="button" onClick={() => setSheet("support")}><Settings2 size={18} /><span>Hỗ trợ</span></button>
            <div className="reader-session-progress" role="progressbar" aria-label="Tiến độ điểm kiểm tra" aria-valuemin={0} aria-valuemax={checkpoint.total} aria-valuenow={checkpoint.position}><i style={{ width: `${stageProgress}%` }} /></div>
          </header>
          <main className="reader-manuscript-scroll reader-checkpoint-scroll">
            <article className="reader-checkpoint-card">
              <header>
                <span>{checkpoint.label} · {checkpoint.position + 1}/{checkpoint.total}</span>
                <h1>{checkpoint.prompt}</h1>
              </header>
              <button className="reader-passage-disclosure" type="button" onClick={() => setRelatedPassageOpen((open) => !open)} aria-expanded={relatedPassageOpen}>
                <BookOpenText size={17} /> {relatedPassageOpen ? "Ẩn đoạn liên quan" : "Xem lại đoạn liên quan"}
              </button>
              {relatedPassageOpen && (
                <div className="reader-related-passage" lang="zh-Hans">
                  {story.sentences.map((sentence) => sentence.chinese).join("")}
                </div>
              )}
              <div className="reader-checkpoint-options" role="radiogroup" aria-label="Các lựa chọn đọc hiểu">
                {checkpoint.options.map((option, optionIndex) => (
                  <button
                    className={checkpoint.selected === option ? "selected" : ""}
                    disabled={checkpoint.state !== "idle" || busy}
                    key={option}
                    role="radio"
                    aria-checked={checkpoint.selected === option}
                    tabIndex={checkpoint.selected === option || (!checkpoint.selected && optionIndex === 0) ? 0 : -1}
                    type="button"
                    onClick={() => onSelectOption?.(option)}
                    onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                      currentIndex: optionIndex,
                      itemCount: checkpoint.options.length,
                      onSelect: (nextIndex) => onSelectOption?.(checkpoint.options[nextIndex]!),
                    })}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option}</strong>
                  </button>
                ))}
              </div>
              {checkpoint.state === "recorded" && checkpoint.outcome && (
                <div className={`reader-checkpoint-feedback ${checkpoint.outcome}`} role="status" aria-live="polite">
                  {checkpoint.outcome === "correct" ? <CheckCircle2 size={21} /> : <XCircle size={21} />}
                  <span><strong>{checkpoint.outcome === "correct" ? "Đã định vị đúng chi tiết" : "Chi tiết này chưa khớp"}</strong>{checkpoint.explanation ?? "Kết quả tổng hợp sẽ hiện sau điểm kiểm tra cuối."}</span>
                </div>
              )}
            </article>
          </main>
          <footer className="reader-session-footer">
            <span>{checkpoint.state === "pending" ? "Đang giữ lựa chọn của bạn…" : "Mỗi câu chỉ kiểm tra một dấu vết trong bài."}</span>
            <button
              className="reader-primary-action"
              disabled={busy || checkpoint.state === "pending" || (checkpoint.state === "idle" && !checkpoint.selected)}
              type="button"
              onClick={checkpoint.state === "recorded" ? onContinueCheckpoint : onSubmitOption}
            >
              {checkpoint.state === "recorded"
                ? checkpoint.position + 1 >= checkpoint.total ? "Xem kết quả" : "Điểm tiếp theo"
                : checkpoint.state === "pending" ? "Đang ghi nhận" : "Chốt lựa chọn"}
              <ArrowRight size={19} />
            </button>
          </footer>
        </div>
      )}

      {stage === "result" && result && (
        <div className="reader-result">
          <div className="reader-result-seal"><BookOpenText size={42} /><span>{result.correctCount}/{result.total}</span></div>
          <span className="reader-eyebrow"><Sparkles size={14} /> TRANG SÁCH ĐÃ KHÉP</span>
          <h1>{result.correctCount === result.total ? "Bạn đã nắm trọn câu chuyện" : "Bạn đã tìm được mạch chính"}</h1>
          <p>{result.correctCount === result.total
            ? "Các chi tiết quan trọng đều đã được kết nối đúng."
            : "Một vài chi tiết còn mờ; đọc lại sẽ giúp chúng gắn vào ngữ cảnh tự nhiên hơn."}</p>
          <div className="reader-result-observations" aria-label="Kết quả các điểm kiểm tra">
            {result.outcomes.map((outcome, index) => <span className={outcome} key={`${outcome}-${index}`}>{outcome === "correct" ? <CheckCircle2 size={17} /> : <XCircle size={17} />} Dấu vết {index + 1}</span>)}
          </div>
          <p className="reader-result-note"><BookmarkCheck size={16} /> {savedWordIds.filter((id) => knownWordIds.includes(id)).length} từ trong truyện đã lưu · {supportUsed ? "có dùng hỗ trợ" : "đọc độc lập"}</p>
          <div className="reader-result-actions">
            <Link className="reader-secondary-action" to="/path">Tiếp tục Thiên Lộ</Link>
            <button className="reader-primary-action" type="button" onClick={onRestart}><RotateCcw size={18} /> Đọc lại câu chuyện</button>
          </div>
        </div>
      )}

      {sheet && (
        <div className="reader-sheet-scrim" onMouseDown={() => setSheet(null)}>
          <div className="reader-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="reader-sheet-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>{sheet === "support" ? "HỖ TRỢ ĐỌC" : "TRA NHANH"}</small><strong id="reader-sheet-title">{sheet === "support" ? "Mở đúng lúc bạn cần" : selectedWord?.simplified ?? "Từ trong bài"}</strong></div>
              <button ref={sheetCloseRef} type="button" onClick={() => setSheet(null)} aria-label={sheet === "support" ? "Đóng bảng hỗ trợ" : "Đóng bảng tra từ"}><X size={20} /></button>
            </header>
            {sheet === "support" ? (
              <div className="reader-support-sheet">
                <button className={showPinyin ? "active" : ""} type="button" onClick={enablePinyin}><Eye size={19} /><span><strong>Pinyin</strong><small>{showPinyin ? "Đang hiện dưới câu" : "Hiện khi cần đối chiếu âm"}</small></span></button>
                <button className={showTranslation ? "active" : ""} type="button" onClick={enableTranslation}><BookOpenText size={19} /><span><strong>Nghĩa tiếng Việt</strong><small>{showTranslation ? "Đang hiện dưới câu" : "Giữ ẩn để tập đọc trực tiếp"}</small></span></button>
                <button type="button" onClick={() => speak(story.sentences.map((sentence) => sentence.chinese).join(""), 0.76)}><Headphones size={19} /><span><strong>Nghe toàn bài</strong><small>Giọng tổng hợp chỉ để đối chiếu cách đọc</small></span></button>
              </div>
            ) : selectedWord ? (
              <div className="reader-word-sheet">
                <div className="reader-word-glyph"><strong>{selectedWord.simplified}</strong>{selectedWord.traditional !== selectedWord.simplified && <span>Phồn thể {selectedWord.traditional}</span>}</div>
                <p><b>{selectedWord.pinyin}</b><span>{selectedWord.meaning}</span><small>{selectedWord.partOfSpeech}</small></p>
                <div>
                  <button className="reader-secondary-action" type="button" onClick={() => speak(selectedWord.simplified)}><Volume2 size={17} /> Nghe từ</button>
                  <button className="reader-primary-action" type="button" onClick={() => onToggleSavedWord(selectedWord.id)}>{savedWordIds.includes(selectedWord.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{savedWordIds.includes(selectedWord.id) ? "Đã lưu để ôn" : "Lưu để ôn"}</button>
                </div>
                <Link to={`/dictionary?q=${encodeURIComponent(selectedWord.simplified)}`}>Mở mục từ đầy đủ <ArrowRight size={16} /></Link>
              </div>
            ) : <p>Chưa có dữ liệu tra nhanh cho từ này.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
