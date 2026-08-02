import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Filter,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { RELEASED_VOCABULARY } from "../data/curriculum";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

const normalizeSearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

export function DictionaryPage() {
  const { state, actions } = useLearning();
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(RELEASED_VOCABULARY[0]?.id ?? "");
  const results = useMemo(() => {
    const normalized = normalizeSearch(query);
    return RELEASED_VOCABULARY.filter((word) => {
      if (savedOnly && !state.savedWords.includes(word.id)) return false;
      if (!normalized) return true;
      const haystack = [word.simplified, word.traditional, word.pinyin, word.pinyinNumbered, word.meaning, ...word.tags].join(" ");
      return normalizeSearch(haystack).includes(normalized);
    });
  }, [query, savedOnly, state.savedWords]);
  const selected = RELEASED_VOCABULARY.find((word) => word.id === selectedId) ?? results[0];

  return (
    <div className="content-page dictionary-page">
      <header className="page-hero dictionary-hero">
        <div>
          <span className="system-kicker"><BookOpen size={15} /> TÀNG TỰ KHỐ · CHỈ MỤC TRÊN THIẾT BỊ</span>
          <h1>Tàng Tự Khố</h1>
          <p>Tra chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt; lưu trực tiếp vào lịch ôn cá nhân.</p>
        </div>
        <div className="lexicon-count"><strong>{RELEASED_VOCABULARY.length}</strong><span>mục từ đã phát hành</span></div>
      </header>

      <div className="dictionary-searchbar">
        <Search size={21} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm 你好, ni3 hao3, xin chào..." aria-label="Tìm trong từ điển" />
        {query && <button className="icon-button" type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={18} /></button>}
        <button className={savedOnly ? "filter-button active" : "filter-button"} type="button" onClick={() => setSavedOnly((value) => !value)}><Filter size={17} /> Đã lưu</button>
      </div>

      <div className="dictionary-layout">
        <section className="dictionary-results">
          <header><span>{results.length} KẾT QUẢ</span><small>Giản thể · Phồn thể · Pinyin · Việt</small></header>
          <div className="dictionary-result-list">
            {results.map((word) => (
              <button className={selected?.id === word.id ? "active" : ""} key={word.id} type="button" onClick={() => setSelectedId(word.id)}>
                <span className="tone-sequence" aria-label={`Thanh từ điển ${word.syllables.map((syllable) => syllable.lexicalTone || "nhẹ").join(", ")}`}>
                  {word.syllables.map((syllable) => (
                    <i className={`tone-mark tone-${syllable.lexicalTone}`} key={syllable.index}>{syllable.lexicalTone || "·"}</i>
                  ))}
                </span>
                <strong>{state.profile.script === "traditional" ? word.traditional : word.simplified}</strong>
                <span><b>{word.pinyin}</b><small>{word.meaning}</small></span>
                {state.savedWords.includes(word.id) && <BookmarkCheck size={16} />}
              </button>
            ))}
            {!results.length && <div className="empty-search"><Search size={28} /><strong>Không tìm thấy mục phù hợp</strong><p>Thử chữ Hán, pinyin hoặc một phần nghĩa tiếng Việt.</p></div>}
          </div>
        </section>

        {selected && (
          <aside className="dictionary-entry">
            <div className="entry-scanline" aria-hidden="true" />
            <header>
              <span>HỒ SƠ TỪ MỤC · NỘI DUNG ĐÃ PHÁT HÀNH</span>
              <div>
                <h1>{state.profile.script === "traditional" ? selected.traditional : selected.simplified}</h1>
                {selected.simplified !== selected.traditional && <small>{selected.simplified} / {selected.traditional}</small>}
              </div>
              <button className="sound-button" type="button" onClick={() => speakMandarin(selected.simplified)} aria-label={`Nghe ${selected.simplified}`}><Volume2 size={22} /></button>
            </header>
            <div className="entry-pronunciation">
              <span className="tone-sequence" aria-label={`Thanh từ điển ${selected.syllables.map((syllable) => syllable.lexicalTone || "nhẹ").join(", ")}`}>
                {selected.syllables.map((syllable) => (
                  <i className={`tone-mark tone-${syllable.lexicalTone}`} key={syllable.index}>{syllable.lexicalTone || "·"}</i>
                ))}
              </span>
              <strong>{selected.pinyin}</strong>
              <small>{selected.pinyinNumbered}</small>
            </div>
            <div className="entry-meaning">
              <small>{selected.partOfSpeech}</small>
              <h2>{selected.meaning}</h2>
            </div>
            <div className="entry-example">
              <span>NGỮ CẢNH DẪN Ý</span>
              <strong>{selected.example}</strong>
              <small>{selected.examplePinyin}</small>
              <p>{selected.exampleMeaning}</p>
              <button className="icon-button" type="button" onClick={() => speakMandarin(selected.example)} aria-label="Nghe câu ví dụ"><Volume2 size={18} /></button>
            </div>
            <div className="entry-tags">{selected.tags.map((tag) => <span key={tag}><Sparkles size={12} /> {tag}</span>)}</div>
            <button className={`save-word-button ${state.savedWords.includes(selected.id) ? "saved" : ""}`} type="button" onClick={() => actions.toggleSavedWord(selected.id)}>
              {state.savedWords.includes(selected.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              {state.savedWords.includes(selected.id) ? "Đã nối với ký ức trận" : "Lưu vào ký ức trận"}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
