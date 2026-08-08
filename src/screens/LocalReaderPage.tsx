import {
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Headphones,
  Languages,
  LibraryBig,
  Volume2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  RELEASED_STORIES,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

export function LocalReaderPage() {
  const { state, actions } = useLearning();
  const story = RELEASED_STORIES[0];
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeSentence, setActiveSentence] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState(
    story?.sentences[0]?.wordIds[0] ?? "",
  );
  const [comprehensionAnswer, setComprehensionAnswer] =
    useState<string | null>(null);
  const [comprehensionChecked, setComprehensionChecked] = useState(false);
  const [comprehensionKey, setComprehensionKey] = useState(() =>
    makeIdempotencyKey("reader-local-check")
  );
  // Pinyin is visible at first render, so this local practice is assisted from
  // the outset. It remains inspectable practice and never mastery evidence.
  const [usedSupport, setUsedSupport] = useState(true);

  const knownWords = useMemo(
    () => story
      ? [...new Set(story.sentences.flatMap((item) => item.wordIds))]
      : [],
    [story],
  );
  const selectedWord = RELEASED_WORD_BY_ID.get(selectedWordId);
  const sentence = story?.sentences[activeSentence];
  const question = story?.comprehension[0];

  if (!story || !sentence || !question) {
    return (
      <div className="lesson-state-screen">
        <BookOpenText size={44} />
        <h1>Chưa có bài đọc phù hợp</h1>
        <p>Bài đọc mới sẽ xuất hiện khi sẵn sàng cho cấp độ của bạn.</p>
      </div>
    );
  }

  const comprehensionCorrect =
    comprehensionAnswer === question.correctAnswer;

  const checkComprehension = () => {
    if (!comprehensionAnswer || comprehensionChecked) return;
    setComprehensionChecked(true);
    actions.recordPracticeEvidence({
      idempotencyKey: comprehensionKey,
      activityVersion: `${story.contentVersion}:${question.id}:1`,
      source: "reader",
      method: "reading-comprehension",
      activityId: `${story.id}:${question.id}`,
      skill: "reading",
      outcome: comprehensionCorrect ? "correct" : "incorrect",
      score: comprehensionCorrect ? 100 : 0,
      metadata: {
        selectedAnswer: comprehensionAnswer,
        correctAnswer: question.correctAnswer,
        translationVisible: showTranslation,
        usedHint: usedSupport || showTranslation,
        priorExposure: state.evidence.some((item) =>
          item.activityId === `${story.id}:${question.id}`
        ),
        measurementEligible: false,
        answerExposure: "public-client",
      },
    });
  };

  const retryComprehension = () => {
    setComprehensionAnswer(null);
    setComprehensionChecked(false);
    setUsedSupport(true);
    setComprehensionKey(makeIdempotencyKey("reader-local-check"));
  };

  const playAudioSupport = (text: string, rate?: number) => {
    setUsedSupport(true);
    speakMandarin(text, rate);
  };

  return (
    <div className="content-page reader-page">
      <header className="page-hero reader-hero">
        <div>
          <span className="system-kicker">
            <LibraryBig size={15} /> LOCAL READING PRACTICE
          </span>
          <h1>Vạn Quyển Các</h1>
          <p>
            Nội dung được lưu sẵn trên thiết bị để bạn có thể luyện cả khi mất
            mạng. Kết quả được giữ lại để xem và ôn thêm khi cần.
          </p>
        </div>
        <div className="reader-hero-stats">
          <span>
            <strong>{RELEASED_STORIES.length}</strong>
              <small>truyện luyện đọc</small>
          </span>
          <span>
            <strong>{knownWords.length}</strong>
            <small>từ trọng tâm</small>
          </span>
          <span>
            <strong>{story.estimatedMinutes}</strong>
            <small>phút đọc</small>
          </span>
        </div>
      </header>

      <div className="reader-toolbar">
        <div>
          <span>{story.level}</span>
          <span><Clock3 size={14} /> {story.estimatedMinutes} phút</span>
        </div>
        <div className="reader-toggles">
          <button
            className={showPinyin ? "active" : ""}
            type="button"
            onClick={() => setShowPinyin((value) => {
              if (!value) setUsedSupport(true);
              return !value;
            })}
          >
            {showPinyin
              ? <Eye size={16} />
              : <EyeOff size={16} />} Pinyin
          </button>
          <button
            className={showTranslation ? "active" : ""}
            type="button"
            onClick={() => setShowTranslation((value) => {
              if (!value) setUsedSupport(true);
              return !value;
            })}
          >
            <Languages size={16} /> Bản dịch
          </button>
          <button
            type="button"
            onClick={() => playAudioSupport(
              story.sentences.map((item) => item.chinese).join(""),
              0.75,
            )}
          >
            <Headphones size={16} /> Nghe toàn bài
          </button>
        </div>
      </div>

      <div className="reading-layout">
        <article className="story-manuscript">
          <header>
            <span>BÍ QUYỂN · LUYỆN TRÊN THIẾT BỊ · {story.id.toUpperCase()}</span>
            <h1>{story.chineseTitle}</h1>
            <h2>{story.title}</h2>
            <p>{story.summary}</p>
          </header>
          <div className="story-sentences">
            {story.sentences.map((item, index) => (
              <button
                className={activeSentence === index ? "active" : ""}
                key={item.chinese}
                type="button"
                onClick={() => setActiveSentence(index)}
              >
                <span className="sentence-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sentence-copy">
                  <strong>{item.chinese}</strong>
                  {showPinyin && <small>{item.pinyin}</small>}
                  {showTranslation && <em>{item.translation}</em>}
                </span>
                <span className="sentence-audio" aria-hidden="true">
                  <Volume2 size={18} />
                </span>
              </button>
            ))}
          </div>
          <footer>
            <Check size={16} /> Chọn từng câu để mở bảng phân tích.
          </footer>

          <section
            className="reader-check"
            aria-labelledby="reader-check-title"
          >
            <span>THỬ THÁCH ĐỌC HIỂU · TỰ KIỂM</span>
            <h3 id="reader-check-title">{question.prompt}</h3>
            <div role="radiogroup" aria-labelledby="reader-check-title">
              {question.options.map((option, optionIndex) => {
                const chosen = comprehensionAnswer === option;
                const revealCorrect = comprehensionChecked
                  && option === question.correctAnswer;
                const checkedChoice = comprehensionChecked && chosen;
                return (
                  <button
                    className={`${chosen ? "selected" : ""} ${revealCorrect ? "correct" : ""} ${checkedChoice && !comprehensionCorrect ? "wrong" : ""}`}
                    data-radio-index={optionIndex}
                    disabled={comprehensionChecked}
                    key={option}
                    role="radio"
                    aria-checked={chosen}
                    tabIndex={
                      chosen || (!comprehensionAnswer && optionIndex === 0)
                        ? 0
                        : -1
                    }
                    type="button"
                    onClick={() => setComprehensionAnswer(option)}
                    onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                      currentIndex: optionIndex,
                      itemCount: question.options.length,
                      onSelect: (nextIndex) => setComprehensionAnswer(
                        question.options[nextIndex]!,
                      ),
                    })}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {comprehensionChecked && (
              <p
                className={comprehensionCorrect ? "correct" : "wrong"}
                aria-live="polite"
              >
                {comprehensionCorrect
                  ? <CheckCircle2 size={18} />
                  : <XCircle size={18} />}
                <span>
                  <strong>
                    {comprehensionCorrect ? "Đã hiểu đúng" : "Chưa đúng"}
                  </strong>
                  {question.explanation} Đây là lượt tự luyện trên thiết bị,
                  chưa phải bằng chứng tinh thông đã được xác thực.
                </span>
              </p>
            )}
            <button
              className={
                comprehensionChecked
                  ? "secondary-button"
                  : "primary-button"
              }
              disabled={!comprehensionAnswer}
              type="button"
              onClick={
                comprehensionChecked
                  ? retryComprehension
                  : checkComprehension
              }
            >
              {comprehensionChecked
                ? "Làm lại câu hiểu bài"
                : "Xác nhận practice"}
            </button>
          </section>
        </article>

        <aside className="reader-inspector">
          <header className="section-heading">
            <div>
              <span>
                SENTENCE {String(activeSentence + 1).padStart(2, "0")}
              </span>
              <h2>Phân tích nhanh</h2>
            </div>
            <BookOpenText size={20} />
          </header>
          <div className="active-sentence-panel">
            <strong>{sentence.chinese}</strong>
            <span>{sentence.pinyin}</span>
            {showTranslation && <p>{sentence.translation}</p>}
            <button
              className="secondary-button"
              type="button"
              onClick={() => playAudioSupport(sentence.chinese, 0.76)}
            >
              <Volume2 size={17} /> Nghe câu này
            </button>
          </div>
          <div className="word-chip-list">
            {sentence.wordIds.map((wordId) => {
              const word = RELEASED_WORD_BY_ID.get(wordId);
              if (!word) return null;
              return (
                <button
                  className={selectedWordId === wordId ? "active" : ""}
                  key={wordId}
                  type="button"
                  onClick={() => {
                    setUsedSupport(true);
                    setSelectedWordId(wordId);
                  }}
                >
                  {word.simplified}<small>{word.pinyin}</small>
                </button>
              );
            })}
          </div>
          {selectedWord && (
            <div className="reader-word-detail">
              <div>
                <span>
                  {state.profile.script === "traditional"
                    ? selectedWord.traditional
                    : selectedWord.simplified}
                </span>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => playAudioSupport(selectedWord.simplified)}
                  aria-label="Nghe từ"
                >
                  <Volume2 size={18} />
                </button>
              </div>
              <h3>{selectedWord.pinyin}</h3>
              <p>{selectedWord.meaning}</p>
              <small>{selectedWord.partOfSpeech} · practice local</small>
              <button
                className={
                  state.savedWords.includes(selectedWord.id) ? "saved" : ""
                }
                type="button"
                onClick={() => actions.toggleSavedWord(selectedWord.id)}
              >
                {state.savedWords.includes(selectedWord.id)
                  ? <BookmarkCheck size={17} />
                  : <Bookmark size={17} />}
                {state.savedWords.includes(selectedWord.id)
                  ? "Đã lưu"
                  : "Lưu để ôn"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
