import {
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Headphones,
  Languages,
  LibraryBig,
  Volume2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { STORIES, WORD_BY_ID } from "../data/curriculum";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

export function ReaderPage() {
  const { state, actions } = useLearning();
  const story = STORIES[0];
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeSentence, setActiveSentence] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState(story.sentences[0].wordIds[0]);
  const knownWords = useMemo(
    () => [...new Set(story.sentences.flatMap((sentence) => sentence.wordIds))],
    [story],
  );
  const selectedWord = WORD_BY_ID.get(selectedWordId);
  const sentence = story.sentences[activeSentence];

  return (
    <div className="content-page reader-page">
      <header className="page-hero reader-hero">
        <div>
          <span className="system-kicker"><LibraryBig size={15} /> GRADED READING ARCHIVE</span>
          <h1>Vạn Quyển Các</h1>
          <p>Đọc một lượt lấy ý, nghe lại câu, rồi bật hỗ trợ đúng lúc thay vì dịch từng chữ ngay từ đầu.</p>
        </div>
        <div className="reader-hero-stats">
          <span><strong>{STORIES.length}</strong><small>truyện khả dụng</small></span>
          <span><strong>{knownWords.length}</strong><small>từ trọng tâm</small></span>
          <span><strong>{story.estimatedMinutes}</strong><small>phút đọc</small></span>
        </div>
      </header>

      <div className="reader-toolbar">
        <div>
          <span>{story.level}</span>
          <span><Clock3 size={14} /> {story.estimatedMinutes} phút</span>
        </div>
        <div className="reader-toggles">
          <button className={showPinyin ? "active" : ""} type="button" onClick={() => setShowPinyin((value) => !value)}>
            {showPinyin ? <Eye size={16} /> : <EyeOff size={16} />} Pinyin
          </button>
          <button className={showTranslation ? "active" : ""} type="button" onClick={() => setShowTranslation((value) => !value)}>
            <Languages size={16} /> Bản dịch
          </button>
          <button type="button" onClick={() => speakMandarin(story.sentences.map((item) => item.chinese).join(""), 0.75)}>
            <Headphones size={16} /> Nghe toàn bài
          </button>
        </div>
      </div>

      <div className="reading-layout">
        <article className="story-manuscript">
          <header>
            <span>ARCHIVE · {story.id.toUpperCase()}</span>
            <h1>{story.chineseTitle}</h1>
            <h2>{story.title}</h2>
            <p>{story.summary}</p>
          </header>
          <div className="story-sentences">
            {story.sentences.map((item, index) => (
              <button className={activeSentence === index ? "active" : ""} key={item.chinese} type="button" onClick={() => setActiveSentence(index)}>
                <span className="sentence-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="sentence-copy">
                  <strong>{item.chinese}</strong>
                  {showPinyin && <small>{item.pinyin}</small>}
                  {showTranslation && <em>{item.translation}</em>}
                </span>
                <span className="sentence-audio" onClick={(event) => { event.stopPropagation(); speakMandarin(item.chinese, 0.76); }} role="button" tabIndex={0} aria-label={`Nghe câu ${index + 1}`}><Volume2 size={18} /></span>
              </button>
            ))}
          </div>
          <footer><Check size={16} /> Chọn từng câu để mở bảng phân tích từ bên phải.</footer>
        </article>

        <aside className="reader-inspector">
          <header className="section-heading">
            <div><span>SENTENCE {String(activeSentence + 1).padStart(2, "0")}</span><h2>Phân tích nhanh</h2></div>
            <BookOpenText size={20} />
          </header>
          <div className="active-sentence-panel">
            <strong>{sentence.chinese}</strong>
            <span>{sentence.pinyin}</span>
            <p>{sentence.translation}</p>
          </div>
          <div className="word-chip-list">
            {sentence.wordIds.map((wordId) => {
              const word = WORD_BY_ID.get(wordId);
              if (!word) return null;
              return <button className={selectedWordId === wordId ? "active" : ""} key={wordId} type="button" onClick={() => setSelectedWordId(wordId)}>{word.simplified}<small>{word.pinyin}</small></button>;
            })}
          </div>
          {selectedWord && (
            <div className="reader-word-detail">
              <div>
                <span>{state.profile.script === "traditional" ? selectedWord.traditional : selectedWord.simplified}</span>
                <button className="icon-button" type="button" onClick={() => speakMandarin(selectedWord.simplified)} aria-label="Nghe từ"><Volume2 size={18} /></button>
              </div>
              <h3>{selectedWord.pinyin}</h3>
              <p>{selectedWord.meaning}</p>
              <small>{selectedWord.partOfSpeech} · HSK {selectedWord.hsk}</small>
              <button className={state.savedWords.includes(selectedWord.id) ? "saved" : ""} type="button" onClick={() => actions.toggleSavedWord(selectedWord.id)}>
                {state.savedWords.includes(selectedWord.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                {state.savedWords.includes(selectedWord.id) ? "Đã lưu" : "Lưu để ôn"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
