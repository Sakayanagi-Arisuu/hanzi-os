import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronRight,
  Database,
  Filter,
  Layers3,
  ListTree,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  getLessonExpansionPack,
  getLessonIdForMegaWord,
  loadMegaLexicon,
  MEGA_LEXICON_SEARCHABLE_COUNT,
  searchMegaVocabularyByHanzi,
  type MegaLexiconArtifact,
  type MegaVocabularyItem,
} from "../content/megaLexicon";
import {
  loadPublishedStudioVocabulary,
  mergePublishedStudioVocabulary,
} from "../content/publishedStudioClient";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";
import {
  LESSON_BY_ID,
  RELEASED_LESSONS,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import "./DictionaryPage.css";

const normalizeSearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const megaToneNumbers = (word: MegaVocabularyItem) => [...word.pinyinNumbered.matchAll(/[1-5]/gu)]
  .map((match) => Number(match[0]) % 5);

const coreWords: DictionaryWord[] = RELEASED_VOCABULARY.map((word) => ({
  ...word,
  senses: [word.meaning],
  classifiers: [],
  toneNumbers: word.syllables.map((syllable) => syllable.lexicalTone),
  isCore: true,
}));

const megaWordView = (word: MegaVocabularyItem): DictionaryWord => ({
  ...word,
  toneNumbers: megaToneNumbers(word),
  tags: [
    word.editorialDepth === "curated" ? "Chuyên đề biên tập sâu" : "Kho tham chiếu mở rộng",
    word.referenceLevel === "mở rộng" ? "Trung văn hiện đại" : `Mốc ${word.referenceLevel}`,
  ],
  isCore: false,
});

export function DictionaryPage() {
  const location = useLocation();
  const requested = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedLessonId = requested.get("lesson");
  const requestedQuery = requested.get("q") ?? "";
  const journeyChallenge = requested.get("challenge") === "1";
  const { state, actions } = useLearning();
  const { checkpoint, recordReceipt } = useLearningJourney();
  const challengedWordIdsRef = useRef(new Set<string>());
  const [artifact, setArtifact] = useState<MegaLexiconArtifact | null>(null);
  const [publishedVocabulary, setPublishedVocabulary] = useState<DictionaryWord[]>([]);
  const [publishedVocabularyState, setPublishedVocabularyState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [showPublishedVocabularyLoading, setShowPublishedVocabularyLoading] = useState(false);
  const [deepLookupWords, setDeepLookupWords] = useState<DictionaryWord[]>([]);
  const [deepLookupPending, setDeepLookupPending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(requestedQuery);
  const [lessonScope, setLessonScope] = useState(Boolean(requestedLessonId));
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(coreWords[0]?.id ?? "");
  const [visibleLimit, setVisibleLimit] = useState(160);

  useEffect(() => {
    let active = true;
    loadMegaLexicon()
      .then((value) => { if (active) setArtifact(value); })
      .catch((reason: unknown) => { if (active) setLoadError(reason instanceof Error ? reason.message : "Không thể tải kho mở rộng."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadingTimer = window.setTimeout(() => setShowPublishedVocabularyLoading(true), 350);
    loadPublishedStudioVocabulary(fetch, controller.signal)
      .then((words) => {
        window.clearTimeout(loadingTimer);
        setShowPublishedVocabularyLoading(false);
        setPublishedVocabulary(words);
        setPublishedVocabularyState("ready");
      })
      .catch(() => {
        window.clearTimeout(loadingTimer);
        if (controller.signal.aborted) return;
        setShowPublishedVocabularyLoading(false);
        setPublishedVocabulary([]);
        setPublishedVocabularyState("unavailable");
      });
    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, []);

  useEffect(() => { setVisibleLimit(160); }, [query, savedOnly]);
  useEffect(() => {
    let active = true;
    if (!/\p{Script=Han}/u.test(query.trim())) {
      setDeepLookupWords([]);
      setDeepLookupPending(false);
      return () => { active = false; };
    }
    setDeepLookupPending(true);
    searchMegaVocabularyByHanzi(query)
      .then((words) => {
        if (active) setDeepLookupWords(words.map(megaWordView));
      })
      .catch(() => {
        if (active) setDeepLookupWords([]);
      })
      .finally(() => {
        if (active) setDeepLookupPending(false);
      });
    return () => { active = false; };
  }, [query]);
  useEffect(() => {
    setQuery(requestedQuery);
    setLessonScope(Boolean(requestedLessonId));
  }, [requestedLessonId, requestedQuery]);

  const baseWords = useMemo(() => {
    const base = artifact ? [...coreWords, ...artifact.vocabulary.map(megaWordView)] : coreWords;
    return mergePublishedStudioVocabulary(base, publishedVocabulary);
  }, [artifact, publishedVocabulary]);
  const allWords = useMemo(() => {
    const surfaces = new Set(baseWords.map((word) => word.simplified));
    return [...baseWords, ...deepLookupWords.filter((word) => !surfaces.has(word.simplified))];
  }, [baseWords, deepLookupWords]);
  const requestedLesson = requestedLessonId ? LESSON_BY_ID.get(requestedLessonId) ?? null : null;
  const lessonWordIds = useMemo(() => {
    if (!requestedLesson) return null;
    const packIds = artifact
      ? getLessonExpansionPack(artifact, requestedLesson.id)?.wordIds ?? []
      : [];
    const studioIds = publishedVocabulary
      .filter((word) => word.sourceLessonIds?.includes(requestedLesson.id))
      .map((word) => word.id);
    return new Set([...requestedLesson.wordIds, ...packIds, ...studioIds]);
  }, [artifact, publishedVocabulary, requestedLesson]);
  const results = useMemo(() => {
    const normalized = normalizeSearch(query);
    return allWords.filter((word) => {
      if (lessonScope && lessonWordIds && !lessonWordIds.has(word.id)) return false;
      if (savedOnly && (!word.isCore || !state.savedWords.includes(word.id))) return false;
      if (!normalized) return true;
      const haystack = [word.simplified, word.traditional, word.pinyin, word.pinyinNumbered, word.meaning, ...word.tags].join(" ");
      return normalizeSearch(haystack).includes(normalized);
    });
  }, [allWords, lessonScope, lessonWordIds, query, savedOnly, state.savedWords]);
  const selected = results.find((word) => word.id === selectedId) ?? results[0];
  const selectResult = (wordId: string) => {
    setSelectedId(wordId);
    if (!journeyChallenge || !requestedLessonId || !checkpoint) return;
    challengedWordIdsRef.current.add(wordId);
    if (challengedWordIdsRef.current.size < 3) return;
    recordReceipt({
      stage: "transfer",
      source: "dictionary",
      lessonId: requestedLessonId,
      activityId: `dictionary:${checkpoint.journeyId}:three-distinct-entries`,
    });
  };
  const coreLessonByWordId = useMemo(() => {
    const map = new Map<string, string>();
    for (const lesson of RELEASED_LESSONS) for (const wordId of lesson.wordIds) if (!map.has(wordId)) map.set(wordId, lesson.id);
    return map;
  }, []);
  const selectedPathLessonId = selected
    ? selected.isCore
      ? requestedLesson?.wordIds.includes(selected.id) ? requestedLesson.id : coreLessonByWordId.get(selected.id) ?? null
      : selected.sourceLessonIds?.[0] ?? (artifact ? getLessonIdForMegaWord(artifact, selected.id) : null)
    : null;
  const relatedWords = useMemo(() => {
    if (!selected) return [];
    const characters = new Set([...selected.simplified]);
    return allWords
      .filter((word) => word.id !== selected.id && [...word.simplified].some((character) => characters.has(character)))
      .sort((left, right) => Number(right.isCore) - Number(left.isCore) || left.simplified.length - right.simplified.length)
      .slice(0, 8);
  }, [allWords, selected]);

  return (
    <div className="content-page dictionary-page">
      <header className="page-hero dictionary-hero">
        <div>
          <span className="system-kicker"><BookOpen size={15} /> TÀNG TỰ KHỐ · TỪ VÀ CỤM TỪ</span>
          <h1>Từ điển Trung – Việt</h1>
          <p>Tra giản thể, phồn thể, Pinyin hoặc tiếng Việt; xem từng lớp nghĩa, từ loại, lượng từ, câu dùng và những từ liên quan trong cùng một hồ sơ.</p>
          <div className="dictionary-scope-switch" aria-label="Phân biệt kho từ và kho chữ">
            <span><strong>Đang ở Tàng Tự Khố</strong> · tra cả từ</span>
            <Link to="/characters">Sang Thần Văn Lô · học từng chữ</Link>
            <Link to="/path">Học theo Thiên Lộ <ChevronRight size={15} /></Link>
          </div>
        </div>
        <div className="lexicon-count"><strong>{(artifact ? baseWords.length : MEGA_LEXICON_SEARCHABLE_COUNT + Math.max(0, baseWords.length - coreWords.length)).toLocaleString("vi-VN")}</strong><span>mục từ có thể tra bằng chữ Hán</span></div>
      </header>

      <div className="dictionary-searchbar">
        <Search size={21} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm 你好, ni3 hao3, xin chào..." aria-label="Tìm trong từ điển" />
        {query && <button className="icon-button" type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={18} /></button>}
        <button className={savedOnly ? "filter-button active" : "filter-button"} type="button" onClick={() => setSavedOnly((value) => !value)}><Filter size={17} /> Đã lưu</button>
      </div>

      {!artifact && !loadError && <div className="dictionary-corpus-state"><Database size={16} /> Đang nối thêm 9.077 mục mở rộng…</div>}
      {publishedVocabularyState === "loading" && showPublishedVocabularyLoading && <div className="dictionary-corpus-state" role="status"><Database size={16} /> Đang kiểm tra mục từ mới từ Biên Tập Viện…</div>}
      {publishedVocabularyState === "ready" && publishedVocabulary.length > 0 && <div className="dictionary-corpus-state" role="status"><Database size={16} /> Đã nối {publishedVocabulary.length.toLocaleString("vi-VN")} mục từ mới do Biên Tập Viện phát hành.</div>}
      {publishedVocabularyState === "unavailable" && <div className="dictionary-corpus-state error" role="status"><Database size={16} /> Kho hiện tại vẫn dùng được; mục từ mới từ Biên Tập Viện đang tạm gián đoạn.</div>}
      {deepLookupPending && <div className="dictionary-corpus-state"><Database size={16} /> Đang mở mảnh từ điển chuyên sâu cho “{query.trim()}”…</div>}
      {loadError && <div className="dictionary-corpus-state error"><Database size={16} /> Kho cốt lõi vẫn dùng được; kho mở rộng chưa tải được.</div>}

      {requestedLesson && (
        <section className="dictionary-lesson-context" aria-label="Phạm vi từ của bài">
          <BookOpen size={18} />
          <div><span>TỪ TRONG BÀI</span><strong>{requestedLesson.title}</strong><small>{lessonWordIds?.size ?? requestedLesson.wordIds.length} mục cốt lõi và mở rộng</small></div>
          <button type="button" aria-pressed={lessonScope} onClick={() => setLessonScope((value) => !value)}>
            {lessonScope ? "Tra toàn bộ từ điển" : "Chỉ xem từ của bài"}
          </button>
        </section>
      )}

      <div className="dictionary-layout">
        <section className="dictionary-results">
          <header><span>{results.length.toLocaleString("vi-VN")} KẾT QUẢ</span><small>Giản thể · Phồn thể · Pinyin · Việt</small></header>
          <div className="dictionary-result-list">
            {results.slice(0, visibleLimit).map((word) => (
              <button className={selected?.id === word.id ? "active" : ""} key={word.id} type="button" onClick={() => selectResult(word.id)}>
                <span className="tone-sequence" aria-label={`Thanh từ điển ${word.toneNumbers.map((tone) => tone || "nhẹ").join(", ")}`}>
                  {word.toneNumbers.map((tone, index) => (
                    <i className={`tone-mark tone-${tone}`} key={`${word.id}-${index}`}>{tone || "·"}</i>
                  ))}
                </span>
                <strong>{state.profile.script === "traditional" ? word.traditional : word.simplified}</strong>
                <span><b>{word.pinyin}</b><small>{word.meaning}</small></span>
                {word.isCore && state.savedWords.includes(word.id) && <BookmarkCheck size={16} />}
                {word.sourceKind === "studio"
                  ? <em>BIÊN TẬP</em>
                  : !word.isCore && <em>{word.editorialDepth === "curated" ? "SÂU" : "MỞ RỘNG"}</em>}
              </button>
            ))}
            {visibleLimit < results.length && <button className="dictionary-load-more" type="button" onClick={() => setVisibleLimit((value) => value + 160)}>Hiện thêm 160 mục</button>}
            {!results.length && <div className="empty-search"><Search size={28} /><strong>Không tìm thấy mục phù hợp</strong><p>Thử chữ Hán, pinyin hoặc một phần nghĩa tiếng Việt.</p></div>}
          </div>
        </section>

        {selected && (
          <aside className="dictionary-entry">
            <div className="entry-scanline" aria-hidden="true" />
            <header>
              <span>{selected.sourceKind === "studio" ? "HỒ SƠ TỪ MỤC · BIÊN TẬP VIỆN" : selected.isCore ? "HỒ SƠ TỪ MỤC · BÀI CỐT LÕI" : selected.editorialDepth === "curated" ? "HỒ SƠ TỪ MỤC · BIÊN TẬP SÂU" : "HỒ SƠ TỪ MỤC · KHO MỞ RỘNG"}</span>
              <div>
                <h1>{state.profile.script === "traditional" ? selected.traditional : selected.simplified}</h1>
                {selected.simplified !== selected.traditional && <small>{selected.simplified} / {selected.traditional}</small>}
              </div>
              <button className="sound-button" type="button" onClick={() => speakMandarin(selected.simplified)} aria-label={`Nghe ${selected.simplified}`}><Volume2 size={22} /></button>
            </header>
            <div className="entry-pronunciation">
              <span className="tone-sequence" aria-label={`Thanh từ điển ${selected.toneNumbers.map((tone) => tone || "nhẹ").join(", ")}`}>
                {selected.toneNumbers.map((tone, index) => (
                  <i className={`tone-mark tone-${tone}`} key={`${selected.id}-detail-${index}`}>{tone || "·"}</i>
                ))}
              </span>
              <strong>{selected.pinyin}</strong>
              <small>{selected.pinyinNumbered}</small>
            </div>
            <div className="entry-meaning">
              <small>{selected.partOfSpeech}</small>
              <h2>Nghĩa tiếng Việt</h2>
              <ol>{selected.senses.map((sense) => <li key={sense}>{sense}</li>)}</ol>
            </div>
            {selected.classifiers.length > 0 && <div className="entry-classifiers"><ListTree size={17} /><span><small>LƯỢNG TỪ / CÁCH ĐẾM</small><strong>{selected.classifiers.join(" · ")}</strong></span></div>}
            {selected.example && (
              <div className="entry-example">
                <span>NGỮ CẢNH DẪN Ý</span>
                <strong>{selected.example}</strong>
                <small>{selected.examplePinyin}</small>
                <p>{selected.exampleMeaning}</p>
                <button className="icon-button" type="button" onClick={() => speakMandarin(selected.example!)} aria-label="Nghe câu ví dụ"><Volume2 size={18} /></button>
              </div>
            )}
            {!selected.example && <div className="entry-reference-note"><Database size={17} /><span><strong>Mục tham chiếu {selected.referenceLevel === "7-9" ? "nâng cao 7–9" : `cấp ${selected.referenceLevel}`}</strong><small>Luyện nhận diện và nghe trong ải từ vựng; phần ví dụ chuyên sâu đang được mở rộng dần.</small></span></div>}
            <div className="entry-tags">{selected.tags.map((tag) => <span key={tag}><Sparkles size={12} /> {tag}</span>)}</div>
            <section className="dictionary-character-links" aria-label="Hán tự trong mục từ">
              <span>CHỮ TRONG TỪ</span>
              <div>{[...selected.simplified].map((character, index) => (
                <Link key={`${character}-${index}`} to={`/characters?char=${encodeURIComponent(character)}${selectedPathLessonId ? `&lesson=${encodeURIComponent(selectedPathLessonId)}` : ""}`}>{character}</Link>
              ))}</div>
            </section>
            {relatedWords.length > 0 && <section className="dictionary-related-words">
              <span><Layers3 size={15} /> TỪ CÓ CHUNG HÁN TỰ</span>
              <div>{relatedWords.map((word) => <button key={word.id} type="button" onClick={() => setSelectedId(word.id)}><strong>{word.simplified}</strong><small>{word.pinyin} · {word.meaning}</small></button>)}</div>
            </section>}
            <details className="dictionary-source-details">
              <summary>Nguồn và phạm vi mục từ</summary>
              <p>{selected.sourceKind === "studio"
                ? `“${selected.sourceTitle}” được Biên Tập Viện phát hành ngày ${new Date(selected.sourcePublishedAt ?? 0).toLocaleDateString("vi-VN")}. Mục tra cứu này không tự tạo điểm thông thạo.`
                : selected.isCore
                  ? "Mục từ nằm trong gói bài học HSK0–4 của HANZI.OS."
                  : "Nghĩa tham chiếu Trung–Việt từ CVDICT (CC BY-SA 4.0), đối chiếu danh sách HSK đã ghim; mục chưa qua duyệt giáo viên."}</p>
            </details>
            {selected.isCore ? (
              <button className={`save-word-button ${state.savedWords.includes(selected.id) ? "saved" : ""}`} type="button" onClick={() => actions.toggleSavedWord(selected.id)}>
                {state.savedWords.includes(selected.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                {state.savedWords.includes(selected.id) ? "Đã nối với Ký Ức Trận" : "Lưu vào Ký Ức Trận"}
              </button>
            ) : selectedPathLessonId ? (
              <Link className="save-word-button" to={`/lesson/${encodeURIComponent(selectedPathLessonId)}`} viewTransition>Học từ này trong Thiên Lộ <ChevronRight size={18} /></Link>
            ) : selected.sourceKind === "studio" ? (
              <span className="save-word-button" aria-label="Mục từ do Biên Tập Viện phát hành">Mục từ đã phát hành</span>
            ) : (
              <span className="save-word-button" aria-label="Mục tham chiếu đang mở trong Tàng Tự Khố">Mục tham chiếu đang mở</span>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
