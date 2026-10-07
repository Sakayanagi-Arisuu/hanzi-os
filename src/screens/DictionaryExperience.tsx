import { ArrowLeft, Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, Compass, Layers3, MapPin, Search, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";
import { LESSON_BY_ID, RELEASED_LESSONS } from "../data/curriculum";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { DictionaryStudyDialog } from "./DictionaryStudyDialog";
import { DictionaryLessonPicker } from "./DictionaryLessonPicker";
import "./DictionaryExperience.css";
import "./DictionaryReference.css";

type Props = {
  words: DictionaryWord[]; results: DictionaryWord[]; selected?: DictionaryWord;
  related: DictionaryWord[]; lessonId: string | null; query: string;
  setQuery: (query: string) => void; select: (id: string) => void;
  setSavedOnly: (saved: boolean) => void; status: string;
};

export function DictionaryExperience({ words, results, selected, related, lessonId, query, setQuery, select, setSavedOnly, status }: Props) {
  const { state, actions, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const view = params.get("view") ?? (params.has("lesson") ? "lesson" : params.get("q") ? "search" : "explore");
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState("all");
  const [detailTab, setDetailTab] = useState("meaning");
  const [compact, setCompact] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [studyWords, setStudyWords] = useState<DictionaryWord[] | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [pageCapacity, setPageCapacity] = useState(5);
  useEffect(() => {
    const region = resultsRef.current;
    if (!region) return;
    const update = () => {
      const height = region.clientHeight;
      const width = region.clientWidth;
      const columns = view === "saved" ? 1 : window.innerWidth <= 1100 ? 2 : 4;
      const reserved = view === "lesson" && kind === "all" ? 88 : 0;
      const rowHeight = view === "saved" ? 82 : 150;
      setPageCapacity(Math.max(1, Math.floor((height - reserved) / rowHeight)) * (width < 340 && view !== "saved" ? 2 : columns));
    };
    const observer = new ResizeObserver(update);
    observer.observe(region); update();
    return () => observer.disconnect();
  }, [view, kind]);
  useEffect(() => {
    const media = matchMedia("(max-width: 760px), (max-height: 740px)");
    const update = () => { setCompact(media.matches); setNarrow(matchMedia("(max-width: 760px)").matches); };
    update(); window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useEffect(() => { setSavedOnly(view === "saved"); setPage(0); setMobilePreview(false); }, [view, setSavedOnly]);
  useEffect(() => { setPage(0); }, [query, kind]);
  const go = (next: string, word?: DictionaryWord, lesson?: string, searchTerm = query) => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("view", next);
    if (lesson) nextParams.set("lesson", lesson);
    else if (next !== "detail" && next !== "lesson") nextParams.delete("lesson");
    if (word) { select(word.id); nextParams.set("word", word.id); }
    else nextParams.delete("word");
    if (next !== "search") setKind("all");
    if (next === "search") { nextParams.set("q",searchTerm); setQuery(searchTerm); }
    if (lesson || next === "saved") { nextParams.delete("q"); setQuery(""); }
    if (next === "explore") { nextParams.delete("q"); nextParams.delete("word"); setQuery(""); }
    navigate({ pathname: "/dictionary", search: nextParams.toString() });
  };
  const saved = words.filter(word => word.isCore && state.savedWords.includes(word.id));
  const completedIds = sync.session?.authenticated
    ? new Set(normalized.authoritativeProgress?.lessons.filter(lesson=>lesson.passed).map(lesson=>lesson.lessonId) ?? [])
    : new Set(Object.keys(state.completedLessons));
  const learnedIds = new Set(RELEASED_LESSONS.filter(lesson => completedIds.has(lesson.id)).flatMap(lesson => lesson.wordIds));
  const encountered = words.filter(word => learnedIds.has(word.id));
  const mistakeIds = new Set(state.mistakes.filter(mistake => !mistake.resolved).map(mistake => mistake.wordId));
  const revisit = words.filter(word => mistakeIds.has(word.id));
  const topics = useMemo(() => [...new Set(words.filter(word => word.isCore).flatMap(word => word.tags))].slice(0,3), [words]);
  const filtered = results.filter(word => kind === "all" || (kind === "word" ? [...word.simplified].length > 1 : kind === "character" ? [...word.simplified].length === 1 : kind === "core" ? word.isCore : kind === "encountered" ? learnedIds.has(word.id) : !word.isCore));
  const entry = view === "detail" || view === "explore" ? selected : filtered.find(word=>word.id===selected?.id) ?? filtered[0];
  const size = Math.min(pageCapacity, compact ? (view === "saved" ? narrow ? 2 : 3 : 4) : view === "saved" ? 5 : 8);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages - 1);
  const pageWords = filtered.slice(currentPage*size,(currentPage+1)*size);
  const pickWord = (word: DictionaryWord, preview = true) => { select(word.id); if(preview)setMobilePreview(true); const next=new URLSearchParams(location.search);next.set("word",word.id);navigate({search:next.toString()},{replace:true}); };
  const wordCard = (word: DictionaryWord) => view==="saved" ? <div className={`lex-saved-row ${checkedIds.includes(word.id)?"checked":""}`} key={word.id}>
    <label className="lex-check"><input type="checkbox" aria-label={`Chọn ${word.simplified} để tự ôn`} checked={checkedIds.includes(word.id)} onChange={()=>{setCheckedIds(ids=>ids.includes(word.id)?ids.filter(id=>id!==word.id):[...ids,word.id]);pickWord(word,false);}}/></label>
    <button className="lex-saved-entry" aria-label={`Mở ${word.simplified}`} onClick={()=>pickWord(word)}><strong lang="zh-Hans">{surface(word)}</strong><span><span>{word.pinyin}</span><small>{word.meaning}</small></span><small className="lex-row-topic">{word.tags[0]}</small><small className="lex-row-source">{RELEASED_LESSONS.find(lesson=>lesson.wordIds.includes(word.id))?.title ?? "Kho từ"}</small></button>{sound(word)}
  </div> : <button className={entry?.id===word.id?"active":""} aria-pressed={entry?.id===word.id} key={word.id} onClick={()=>pickWord(word)}><strong lang="zh-Hans">{surface(word)}</strong><span>{word.pinyin}</span><small>{word.meaning}</small></button>;
  const title = view === "saved" ? "Ngọc giản đã lưu" : view === "lesson" ? "Tra cứu theo bài" : view === "detail" ? "Hồ sơ mục từ" : "Khám phá từ và chữ Hán";
  const surface = (word: DictionaryWord) => state.profile.script === "traditional" ? word.traditional : word.simplified;
  const sourceId = entry ? (LESSON_BY_ID.get(lessonId ?? "")?.wordIds.includes(entry.id) ? lessonId : RELEASED_LESSONS.find(lesson => lesson.wordIds.includes(entry.id))?.id ?? entry.sourceLessonIds?.[0] ?? (entry.id===selected?.id?lessonId:null)) : null;
  const source = sourceId ? LESSON_BY_ID.get(sourceId) : null;
  const sound = (word: DictionaryWord) => <button className="lex-sound" type="button" aria-label={`Nghe ${word.simplified}`} onClick={() => speakMandarin(word.simplified)}><Volume2 size={20}/></button>;
  const save = (word: DictionaryWord) => word.isCore && <button className="lex-secondary" type="button" onClick={() => actions.toggleSavedWord(word.id)}>{state.savedWords.includes(word.id) ? <BookmarkCheck/> : <Bookmark/>}{state.savedWords.includes(word.id) ? "Đã lưu ngọc giản" : "Lưu ngọc giản"}</button>;
  const row = (word: DictionaryWord) => <button className="lex-mini-word" key={word.id} type="button" onClick={() => go("detail",word)}><span><strong lang="zh-Hans">{surface(word)}</strong><small>{word.pinyin}</small></span><span>{word.meaning}</span></button>;
  const search = <form className="lex-search" role="search" onSubmit={event=>{event.preventDefault();if(view==="explore")go("search");}}><Search/><input aria-label="Tìm trong từ điển" placeholder={view === "saved" ? "Tìm trong ngọc giản" : view === "lesson" ? "Tìm trong bài này" : "Tìm Hanzi, Pinyin hoặc nghĩa Việt"} value={query} onChange={event => setQuery(event.target.value)}/>{view==="explore" && <button type="submit" aria-label="Tra cứu mục từ"><ChevronRight/></button>}</form>;
  const pager = <nav className="lex-pagination" aria-label="Trang mục từ"><span>{filtered.length.toLocaleString("vi-VN")} mục</span><button type="button" aria-label="Trang trước" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft/></button><span>{currentPage+1}/{pages}</span><button type="button" aria-label="Trang sau" disabled={currentPage+1 >= pages} onClick={() => setPage(currentPage+1)}><ChevronRight/></button></nav>;
  return <div className={`lex-experience lex-${view}`}>
    {studyWords && <DictionaryStudyDialog words={studyWords} onClose={()=>setStudyWords(null)}/>}
    {view==="explore" && <nav className="lex-atlas" aria-label="Các điểm khám phá trên bản đồ">{["人","水","火","学习","中国"].map(text=><button key={text} aria-label={`Tra cứu ${text}`} onClick={()=>go("search",undefined,undefined,text)}><strong lang="zh-Hans">{text}</strong><MapPin size={22}/></button>)}</nav>}
    <header className="lex-heading">{view !== "explore" && <button type="button" aria-label="Về khám phá Tàng Tự Khố" onClick={() => go("explore")}><ArrowLeft/></button>}<div><div className="realm-emblem" aria-hidden="true" /><span>TÀNG TỰ KHỐ</span><h1>{title}</h1><p>{view === "saved" ? "Từ và chữ bạn muốn giữ lại" : view === "lesson" ? "Từ và chữ trong Thiên Lộ" : view === "detail" ? "Nghĩa, cách dùng và hành trình học" : "Khám phá Hanzi, từ vựng và ý nghĩa theo hành trình của riêng bạn."}</p></div></header>
    {status && <p className="lex-status" role="status">{status}</p>}
    {view === "explore" ? <>
      <div className="lex-explore-search">{search}<nav className="lex-shortcuts" aria-label="Khám phá kho từ"><button onClick={() => go("lesson",undefined,RELEASED_LESSONS.find(lesson=>completedIds.has(lesson.id))?.id ?? RELEASED_LESSONS[0]?.id)}><BookOpen/> Theo bài</button><button onClick={() => { setKind("word"); go("search"); }}>Từ</button><button onClick={() => { setKind("character"); go("search"); }}>Chữ</button><button onClick={() => go("saved")}><Bookmark/> Đã lưu</button></nav></div>
      <div className="lex-explore-grid">
        <section className="lex-discovery-card"><h2><Compass/> Đã gặp trong Thiên Lộ</h2><div>{encountered.slice(-3).map(row)}{!encountered.length && <p>Hoàn thành bài học để xem các từ đã gặp.</p>}</div><button onClick={() => go("lesson",undefined,RELEASED_LESSONS.find(lesson=>completedIds.has(lesson.id))?.id ?? RELEASED_LESSONS[0]?.id)}>Tra theo bài <ChevronRight/></button></section>
        <section className="lex-discovery-card"><h2><Layers3/> Theo chủ đề</h2><div>{topics.map(topic=><button className="lex-topic" key={topic} onClick={()=>go("search",undefined,undefined,topic)}><Compass/>{topic}</button>)}</div><button onClick={()=>go("search")}>Xem kho từ <ChevronRight/></button></section>
        <section className="lex-discovery-card"><h2><Search/> Cần xem lại</h2><div>{!sync.session?.authenticated && revisit.slice(0,3).map(row)}{sync.session?.authenticated ? <p>Xem các từ và câu cần luyện tiếp trong Nghịch Cảnh Lục.</p> : !revisit.length && <p>Chưa có từ gắn với lỗi đang mở.</p>}</div><Link to="/mistakes">Mở lỗi cần luyện <ChevronRight/></Link></section>
        <section className="lex-discovery-card"><h2><Bookmark/> Ngọc giản đã lưu</h2><div>{saved.slice(0,3).map(row)}{!saved.length && <p>Lưu mục từ để xem lại tại đây.</p>}</div><button onClick={()=>go("saved")}>Xem tất cả <ChevronRight/></button></section>
        {entry && <aside className="lex-suggestion"><span>ĐỀ XUẤT CHO BẠN</span><strong className="lex-large-hanzi" lang="zh-Hans">{surface(entry)}</strong><div className="lex-pronunciation">{entry.pinyin}{sound(entry)}</div><p>{entry.meaning}</p><small><BookOpen/> {source?.title ?? "Khám phá trong kho từ"}</small><button className="lex-primary" onClick={()=>go("detail",entry)}>Mở hồ sơ mục từ <ChevronRight/></button>{save(entry)}</aside>}
      </div>
    </> : <><nav className="lex-mobile-panes" aria-label="Vùng nội dung"><button aria-pressed={!mobilePreview} onClick={()=>setMobilePreview(false)}>{view==="detail"?"Nội dung":"Danh sách"}</button><button aria-pressed={mobilePreview} disabled={!entry} onClick={()=>setMobilePreview(true)}>Ngọc lệnh</button></nav><div className="lex-workspace" data-preview={mobilePreview}>
      <section className="lex-main-panel" aria-label={title}>
      {view === "detail" && entry ? <>
        <div className="lex-entry-heading"><strong className="lex-large-hanzi" lang="zh-Hans">{surface(entry)}</strong><div><div className="lex-pronunciation">{entry.pinyin}{sound(entry)}</div><p>{entry.meaning}</p><small>{entry.partOfSpeech} · {entry.isCore ? "Từ cốt lõi" : "Mở rộng"}</small></div></div>
        <nav className="lex-detail-tabs" aria-label="Nội dung hồ sơ">{[["meaning","Nghĩa và cách dùng"],["example","Ví dụ"],["related","Từ liên quan"],["source","Nguồn"]].map(([id,label])=><button key={id} aria-pressed={detailTab===id} onClick={()=>setDetailTab(id!)}>{label}</button>)}</nav>
        <div className="lex-detail-body" data-tab={detailTab}>
          <section className="lex-definition"><h2><Layers3/> Chữ trong từ</h2><div className="lex-character-parts">{[...entry.simplified].map((char,index)=>{const characterWord=words.find(word=>word.simplified===char);return <div key={index}><Link to={`/characters?char=${encodeURIComponent(char)}`}><strong lang="zh-Hans">{char}</strong><small>{characterWord?.pinyin}</small></Link><p>{characterWord?.meaning ?? "Mở Thần Văn Lô để xem cấu trúc và nét chữ."}</p></div>;})}</div><h2><BookOpen/> Nghĩa và cách dùng</h2>{entry.senses.map(sense=><p key={sense}>{sense}</p>)}{entry.classifiers.length>0 && <p>Lượng từ: {entry.classifiers.join(" · ")}</p>}</section>
          <section className="lex-examples"><h2>Ví dụ</h2>{entry.example ? <div><strong lang="zh-Hans">{entry.example}</strong><span>{entry.examplePinyin}</span><p>{entry.exampleMeaning}</p><button className="lex-sound" aria-label="Nghe câu ví dụ" onClick={()=>speakMandarin(entry.example!)}><Volume2/></button></div> : <p>Mục này chưa có câu ví dụ đã phát hành.</p>}</section>
          <section className="lex-related"><h2>Từ liên quan</h2><div>{related.slice(0,3).map(row)}</div></section>
          <section className="lex-source"><h2>Nguồn và phạm vi</h2><p>{entry.sourceKind === "studio" ? `Biên Tập Viện · ${entry.sourceTitle}` : entry.isCore ? "Gói bài học HSK0–4 của HANZI.OS." : "CVDICT · CC BY-SA 4.0. Nghĩa tham chiếu chưa qua duyệt giáo viên."}</p><p>Âm thanh tổng hợp của trình duyệt, không phải bản thu người bản ngữ.</p></section>
        </div>
      </> : <>
        <div className="lex-filters">{view === "lesson" && <DictionaryLessonPicker value={params.get("lesson")??""} onChange={id=>go("lesson",undefined,id)}/>}{search}</div>
        <nav className="lex-filter-tabs" aria-label="Loại mục từ">{(view==="lesson" ? [["all","Tất cả"],["core","Cốt lõi"],["extended","Mở rộng"],["encountered","Đã gặp"]] : [["all","Tất cả"],["word","Từ"],["character","Chữ"]]).map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>setKind(id!)}>{label}</button>)}</nav>
        {view==="saved" && <div className="lex-selection-bar"><label className="lex-check"><input type="checkbox" aria-label="Chọn các mục trên trang này" checked={pageWords.length>0 && pageWords.every(word=>checkedIds.includes(word.id))} onChange={event=>setCheckedIds(ids=>event.target.checked?[...new Set([...ids,...pageWords.map(word=>word.id)])]:ids.filter(id=>!pageWords.some(word=>word.id===id)))}/></label><span>Đã chọn {checkedIds.length} mục</span><button disabled={!checkedIds.length} onClick={()=>setCheckedIds([])}>Bỏ chọn</button></div>}
        <div ref={resultsRef} className={`lex-results ${view==="lesson" && kind==="all"?"lex-grouped-results":""}`}>{view==="lesson" && kind==="all" ? [true,false].map(core=>{const group=pageWords.filter(word=>word.isCore===core);return group.length>0 && <section key={String(core)}><h2>{core?"Từ cốt lõi trong bài":"Mở rộng theo bài"}</h2><div className="lex-word-grid">{group.map(wordCard)}</div></section>;}) : <div className="lex-word-grid">{pageWords.map(wordCard)}</div>}{!filtered.length && <p role="status">Không có mục phù hợp. Thử đổi từ tìm hoặc bộ lọc.</p>}</div>{pager}
      </>}
      </section>
      {entry && <aside className="lex-jade-panel"><div><span>{view==="detail"?"GẶP TRONG THIÊN LỘ":entry.isCore?"TỪ CỐT LÕI":"MỤC MỞ RỘNG"}</span>{view!=="detail" && <><strong className="lex-large-hanzi" lang="zh-Hans">{surface(entry)}</strong><div className="lex-pronunciation">{entry.pinyin}{sound(entry)}</div><p>{entry.meaning}</p></>}{view==="saved" && <div className="lex-source-lesson"><small>Cách dùng</small><p>{entry.partOfSpeech} · {entry.exampleMeaning ?? entry.meaning}</p></div>}<div className="lex-source-lesson"><small>Nguồn</small><strong>{source?.title??(entry.sourceKind==="studio"?"Biên Tập Viện":"Kho từ điển")}</strong></div>{view==="detail" && sourceId && <Link className="lex-source-link" to={`/lesson/${encodeURIComponent(sourceId)}`}>Mở bài trong Thiên Lộ <ChevronRight/></Link>}</div>
        <div className="lex-panel-actions">
          {view==="saved" ? <><button className="lex-primary" disabled={!saved.some(word=>checkedIds.includes(word.id))} onClick={()=>setStudyWords(saved.filter(word=>checkedIds.includes(word.id)))}><Bookmark/> Ôn mục đã chọn</button><button className="lex-secondary" onClick={()=>go("detail",entry)}><BookOpen/> Mở hồ sơ mục từ</button></> : view==="detail" ? <><button className="lex-primary" onClick={()=>setStudyWords([entry])}><Bookmark/> Tự ôn mục từ</button>{save(entry)}</> : <><button className="lex-primary" onClick={()=>go("detail",entry)}><Bookmark/> Mở hồ sơ mục từ</button>{sourceId && <Link className="lex-secondary" to={`/lesson/${encodeURIComponent(sourceId)}`}><BookOpen/> Mở bài học</Link>}</>}
        </div></aside>}
    </div></>}
  </div>;
}
