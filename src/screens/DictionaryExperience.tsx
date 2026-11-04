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
import { currentWorkspaceScope } from '../sync/workspaceSync';
import { saveDictionaryActivity } from '../sync/dictionaryActivity';
import "./DictionaryExperience.css";
import "./DictionaryReference.css";
import "./DictionaryLookup.css";
import { DictionarySearchBox } from './DictionarySearchBox';
import { clearDictionaryRecent, readDictionaryRecent, rememberDictionaryQuery } from './dictionaryRecent';

type Props = {
  words: DictionaryWord[]; results: DictionaryWord[]; selected?: DictionaryWord;
  related: DictionaryWord[]; lessonId: string | null; query: string;
  setQuery: (query: string) => void; select: (id: string) => Promise<boolean>;
  setSavedOnly: (saved: boolean) => void; status: string; pending: boolean; incomplete: boolean;
};

export function DictionaryExperience({ words, results, selected, related, lessonId, query, setQuery, select, setSavedOnly, status, pending, incomplete }: Props) {
  const { state, actions, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const view = params.get("view") ?? (params.has("lesson") ? "lesson" : params.get("q") ? "search" : "explore");
  const page = Math.max(0, Number(params.get('page')) || 0);
  const kind = params.get('kind') ?? 'all';
  const updateParams = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(location.search);
    next.set('view', view);
    for (const [key, value] of Object.entries(values)) { if (value === null) next.delete(key); else next.set(key, value); }
    navigate({ search: next.toString() }, { replace: true, state: location.state });
  };
  const setPage = (value: number) => updateParams({ page: String(value) });
  const setKind = (value: string) => updateParams({ kind: value, page: null });
  const changeQuery = (value: string) => { setQuery(value); setPreviewWord(undefined); updateParams({ q: value || null, word: null, page: null }); };
  const [previewWord, setPreviewWord] = useState<DictionaryWord>();
  const [recent, setRecent] = useState<string[]>([]);
  const [recentStatus, setRecentStatus] = useState('');
  const historyIdentity = JSON.stringify([sync.ownerKey, normalized.resetEpoch]);
  const historyIdentityRef = useRef(historyIdentity);
  historyIdentityRef.current = historyIdentity;
  useEffect(() => {
    let active = true;
    setRecent([]); setRecentStatus('');
    void currentWorkspaceScope(sync.ownerKey).then(async scope => {
      if (!scope) return;
      const queries = await readDictionaryRecent(scope);
      if (active) setRecent(queries);
    }).catch(() => { if (active) setRecentStatus('Chưa đọc được lịch sử tra trên thiết bị.'); });
    return () => { active = false; };
  }, [sync.ownerKey, normalized.resetEpoch]);
  const remember = async (value: string) => {
    const owner = sync.ownerKey;
    const identity = historyIdentity;
    try {
      const scope = await currentWorkspaceScope(owner);
      if (!scope) return;
      const queries = await rememberDictionaryQuery(scope, value);
      if (historyIdentityRef.current === identity) setRecent(queries);
    } catch { if (historyIdentityRef.current === identity) setRecentStatus('Chưa lưu được lịch sử tra; mục từ vẫn mở được.'); }
  };
  const clearRecent = async () => {
    const owner = sync.ownerKey;
    const identity = historyIdentity;
    try {
      const scope = await currentWorkspaceScope(owner);
      if (!scope) return;
      await clearDictionaryRecent(scope);
      if (historyIdentityRef.current === identity) { setRecent([]); setRecentStatus('Đã xóa lịch sử tra gần đây trên thiết bị.'); }
    } catch { if (historyIdentityRef.current === identity) setRecentStatus('Chưa xóa được lịch sử tra. Hãy thử lại.'); }
  };
  const [detailTab, setDetailTab] = useState("meaning");
  const [compact, setCompact] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [studyWords, setStudyWords] = useState<DictionaryWord[] | null>(null);
  useEffect(() => { setCheckedIds([]); setStudyWords(null); }, [historyIdentity]);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => { setSaveStatus(''); }, [view, query]);
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const saveLock = useRef(false);
  const playbackLock = useRef(false);
  const playbackRetry = useRef<{ key: string; operationId: string } | null>(null);
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
    const update = () => { setCompact(media.matches); setNarrow(matchMedia("(max-width: 1000px)").matches); };
    update(); window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useEffect(() => { setSavedOnly(view === "saved"); setMobilePreview(false); setPreviewWord(undefined); }, [view, setSavedOnly]);
  const go = async (next: string, word?: DictionaryWord, lesson?: string, searchTerm = query, nextKind = "all") => {
    if (word && !await select(word.id)) return;
    if (word || searchTerm.trim()) void remember(word?.simplified ?? searchTerm);
    const nextParams = new URLSearchParams(location.search);
    if (next !== 'detail') { nextParams.delete('page'); nextParams.set('kind', nextKind); }
    if (next === 'detail') nextParams.set('q', query);
    nextParams.set("view", next);
    if (lesson) nextParams.set("lesson", lesson);
    else if (next !== "detail" && next !== "lesson") nextParams.delete("lesson");
    if (word) { nextParams.set("word", word.id); }
    else nextParams.delete("word");
    if (next === "search") { nextParams.set("q",searchTerm); setQuery(searchTerm); }
    if (lesson || next === "saved") { nextParams.delete("q"); setQuery(""); }
    if (next === "explore") { nextParams.delete("q"); nextParams.delete("word"); setQuery(""); }
    const returnParams = new URLSearchParams(location.search);
    if (word) returnParams.set('word', word.id);
    navigate({ pathname: "/dictionary", search: nextParams.toString() }, { state: next === 'detail'
      ? { dictionaryReturn: view === 'detail' ? location.state?.dictionaryReturn : `?${returnParams}`,
        dictionaryScroll: view === 'detail' ? location.state?.dictionaryScroll : document.querySelector('.lex-suggestions')?.scrollTop ?? 0 } : null });
  };
  const saved = words.filter(word => word.isCore && state.savedWords.includes(word.id));
  const completedIds = sync.session?.authenticated
    ? new Set(normalized.authoritativeProgress?.lessons.filter(lesson=>lesson.passed).map(lesson=>lesson.lessonId) ?? [])
    : new Set(Object.keys(state.completedLessons));
  const learnedIds = new Set(RELEASED_LESSONS.filter(lesson => completedIds.has(lesson.id)).flatMap(lesson => lesson.wordIds));
  const encountered = words.filter(word => learnedIds.has(word.id));
  const topics = useMemo(() => [...new Set(words.filter(word => word.isCore).flatMap(word => word.tags))].slice(0,3), [words]);
  const filtered = results.filter(word => kind === "all" || (kind === "word" ? [...word.simplified].length > 1 : kind === "character" ? [...word.simplified].length === 1 : kind === "core" ? word.isCore : kind === "encountered" ? learnedIds.has(word.id) : !word.isCore));
  const entry = view === 'detail' ? selected : previewWord && filtered.some(word => word.id === previewWord.id) ? previewWord
    : filtered.find(word => word.id === selected?.id) ?? filtered[0];
  const size = Math.min(pageCapacity, compact ? (view === "saved" ? narrow ? 2 : 3 : 4) : view === "saved" ? 5 : 8);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages - 1);
  const pageWords = filtered.slice(currentPage*size,(currentPage+1)*size);
  const pickWord = async (word: DictionaryWord, preview = true) => { if (!await select(word.id)) return; void remember(word.simplified); if(preview)setMobilePreview(true); const next=new URLSearchParams(location.search);next.set("word",word.id);navigate({search:next.toString()},{replace:true}); };
  const wordCard = (word: DictionaryWord) => view==="saved" ? <div className={`lex-saved-row ${checkedIds.includes(word.id)?"checked":""}`} key={word.id}>
    <label className="lex-check"><input type="checkbox" aria-label={`Chọn ${word.simplified} để tự ôn`} checked={checkedIds.includes(word.id)} onChange={()=>{setCheckedIds(ids=>ids.includes(word.id)?ids.filter(id=>id!==word.id):[...ids,word.id]);pickWord(word,false);}}/></label>
    <button className="lex-saved-entry" aria-label={`Mở ${word.simplified}`} onClick={()=>pickWord(word)}><strong lang="zh-Hans">{surface(word)}</strong><span><span>{word.pinyin}</span><small>{word.meaning}</small></span><small className="lex-row-topic">{word.tags[0]}</small><small className="lex-row-source">{RELEASED_LESSONS.find(lesson=>lesson.wordIds.includes(word.id))?.title ?? "Kho từ"}</small></button>{sound(word)}
  </div> : <button className={entry?.id===word.id?"active":""} aria-pressed={entry?.id===word.id} key={word.id} onClick={()=>pickWord(word)}><strong lang="zh-Hans">{surface(word)}</strong><span>{word.pinyin}</span><small>{word.meaning}</small></button>;
  const title = view === "saved" ? "Ngọc giản đã lưu" : view === "lesson" ? "Tra cứu theo bài" : view === "detail" ? "Hồ sơ mục từ" : "Khám phá từ và chữ Hán";
  const surface = (word: DictionaryWord) => state.profile.script === "traditional" ? word.traditional : word.simplified;
  const sourceId = entry ? (LESSON_BY_ID.get(lessonId ?? "")?.wordIds.includes(entry.id) ? lessonId : RELEASED_LESSONS.find(lesson => lesson.wordIds.includes(entry.id))?.id ?? entry.sourceLessonIds?.[0] ?? (entry.id===selected?.id?lessonId:null)) : null;
  const source = sourceId ? LESSON_BY_ID.get(sourceId) : null;
  const play = async (word: DictionaryWord, stimulus: 'word' | 'example' = 'word') => {
    if (playbackLock.current) return;
    const text = stimulus === 'example' ? word.example : word.simplified;
    if (!text) return;
    playbackLock.current = true;
    try {
      const scope = await currentWorkspaceScope(sync.ownerKey);
      if (!scope) throw new Error('Learning scope changed');
      const key = JSON.stringify([scope.ownerGeneration, scope.resetEpoch, word.id, stimulus]);
      const operationId = playbackRetry.current?.key === key ? playbackRetry.current.operationId : `dictionary-tts:${crypto.randomUUID()}`;
      playbackRetry.current = { key, operationId };
      await saveDictionaryActivity(scope, word, operationId, 'tts', word.id === entry?.id ? sourceId : null, stimulus);
      playbackRetry.current = null;
      speakMandarin(text);
      setSaveStatus('Đang đọc bằng giọng máy.');
    } catch { setSaveStatus('Chưa lưu được yêu cầu đọc máy. Dữ liệu cũ vẫn được giữ; hãy thử lại.'); }
    finally { playbackLock.current = false; }
  };
  const sound = (word: DictionaryWord) => <button className="lex-sound" type="button" aria-label={`Nghe ${word.simplified}`} onClick={() => void play(word)}><Volume2 size={20}/></button>;
  const toggleSave = async (word: DictionaryWord) => {
    if (saveLock.current) return;
    saveLock.current = true; setSavingWord(word.id);
    try {
      await actions.toggleSavedWord(word.id);
      setSaveStatus(state.savedWords.includes(word.id) ? 'Đã bỏ lưu ngọc giản.' : 'Đã lưu ngọc giản.');
    } catch { setSaveStatus('Chưa lưu được mục từ. Dữ liệu cũ vẫn được giữ; hãy thử lại.'); }
    finally { saveLock.current = false; setSavingWord(null); }
  };
  const save = (word: DictionaryWord) => word.isCore && <button className="lex-secondary" type="button" disabled={savingWord !== null} onClick={() => void toggleSave(word)}>{state.savedWords.includes(word.id) ? <BookmarkCheck/> : <Bookmark/>}{savingWord === word.id ? 'Đang lưu…' : state.savedWords.includes(word.id) ? "Đã lưu ngọc giản" : "Lưu ngọc giản"}</button>;
  const row = (word: DictionaryWord) => <button className="lex-mini-word" key={word.id} type="button" onClick={() => go("detail",word)}><span><strong lang="zh-Hans">{surface(word)}</strong><small>{word.pinyin}</small></span><span>{word.meaning}</span></button>;
  const search = <DictionarySearchBox query={query} onChange={changeQuery} results={filtered}
    initiallyExpanded={view === 'explore'} restoreScroll={location.state?.dictionaryScroll ?? 0}
    onPreview={setPreviewWord} surface={surface} pending={pending} incomplete={incomplete}
    placeholder={view === 'saved' ? 'Tìm trong ngọc giản' : view === 'lesson' ? 'Tìm trong bài này' : 'Tìm Hanzi, Pinyin hoặc nghĩa Việt'}
    onPick={(word, open) => { if (open || narrow) void go('detail', word); else { setPreviewWord(word); void pickWord(word, false); } }}
    onAll={() => { void remember(query); if (view === 'explore') void go('search', undefined, undefined, query, kind); }}/>;
  const returnToResults = () => {
    const target = location.state?.dictionaryReturn;
    navigate({ pathname: '/dictionary', search: typeof target === 'string' && target.startsWith('?') ? target : '' }, { state: { dictionaryScroll: location.state?.dictionaryScroll ?? 0 } });
  };
  const pager = <nav className="lex-pagination" aria-label="Trang mục từ"><span>{filtered.length.toLocaleString("vi-VN")} mục</span><button type="button" aria-label="Trang trước" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft/></button><span>{currentPage+1}/{pages}</span><button type="button" aria-label="Trang sau" disabled={currentPage+1 >= pages} onClick={() => setPage(currentPage+1)}><ChevronRight/></button></nav>;
  return <div className={`lex-experience lex-${view} ${query.trim() ? "lex-querying" : ""}`}>
    {studyWords && <DictionaryStudyDialog words={studyWords} onClose={()=>setStudyWords(null)}/>}
    {view==="explore" && <nav className="lex-atlas" aria-label="Các điểm khám phá trên bản đồ">{["人","水","火","学习","中国"].map(text=><button key={text} aria-label={`Tra cứu ${text}`} onClick={()=>go("search",undefined,undefined,text)}><strong lang="zh-Hans">{text}</strong><MapPin size={22}/></button>)}</nav>}
    <header className="lex-heading">{view !== "explore" && <button type="button" aria-label={view === "detail" ? "Quay lại kết quả tra cứu" : "Về khám phá Tàng Tự Khố"} onClick={() => view === "detail" ? returnToResults() : go("explore")}><ArrowLeft/></button>}<div><div className="realm-emblem" aria-hidden="true" /><span>TÀNG TỰ KHỐ</span><h1>{title}</h1><p>{view === "saved" ? "Từ và chữ bạn muốn giữ lại" : view === "lesson" ? "Từ và chữ trong Thiên Lộ" : view === "detail" ? "Nghĩa, cách dùng và hành trình học" : "Khám phá Hanzi, từ vựng và ý nghĩa theo hành trình của riêng bạn."}</p></div></header>
    {(saveStatus || status) && <p className="lex-status" role="status">{saveStatus || status}</p>}
    {view === 'detail' && !entry ? <div className="lex-unavailable">
      <p role="status">Chưa tìm thấy mục từ gốc trong dữ liệu hiện có. Nguồn có thể chưa tải được hoặc đã thay đổi. Lịch sử và ngọc giản đã lưu vẫn được giữ.</p>
      <button className="lex-primary" type="button" onClick={() => go('search')}>Tra mục từ khác</button>
    </div> : view === "explore" ? <>
      <div className="lex-lookup-layout">
        <div className="lex-lookup-left">
          {search}
          {!query.trim() && <section className="lex-recent" aria-label="Tra gần đây">
            <div><h2>Tra gần đây</h2>{recent.length > 0 && <button type="button" onClick={() => void clearRecent()}>Xóa lịch sử</button>}</div>
            {recent.length ? <div className="lex-recent-items">{recent.map(value => <button key={value} onClick={() => changeQuery(value)}>{value}</button>)}</div>
              : <p>Nhập chữ Hán, Pinyin hoặc nghĩa Việt để tra từ.</p>}
            {recentStatus && <p role="status">{recentStatus}</p>}
          </section>}
          <nav className="lex-shortcuts" aria-label="Khám phá kho từ">
            <button onClick={() => go("lesson",undefined,RELEASED_LESSONS.find(lesson=>completedIds.has(lesson.id))?.id ?? RELEASED_LESSONS[0]?.id)}><BookOpen/> Theo bài</button>
            <button onClick={() => go('search', undefined, undefined, query, 'word')}>Từ</button>
            <button onClick={() => go('search', undefined, undefined, query, 'character')}>Chữ</button>
            <button onClick={() => go("saved")}><Bookmark/> Đã lưu</button>
          </nav>
          <div className="lex-discover-links">
            <details><summary><Compass size={17}/> Đã gặp trong Thiên Lộ</summary><div>{encountered.slice(-3).map(row)}{!encountered.length && <p>Hoàn thành bài học để xem các từ đã gặp.</p>}</div></details>
            <details><summary><Layers3 size={17}/> Theo chủ đề</summary><div>{topics.map(topic => <button className="lex-topic" key={topic} onClick={() => go('search', undefined, undefined, topic)}>{topic}</button>)}</div></details>
            <Link to="/mistakes"><Search size={17}/> Cần xem lại</Link>
            <button onClick={() => go('saved')}><Bookmark size={17}/> Ngọc giản đã lưu</button>
          </div>
        </div>
        {entry && <aside className="lex-suggestion lex-lookup-preview" aria-label="Hồ sơ mục từ đang chọn">
          <span>{query.trim() ? 'HỒ SƠ MỤC TỪ' : 'KHÁM PHÁ MỤC TỪ'}</span>
          <div className="lex-preview-content">
            <div className="lex-preview-heading"><strong className="lex-large-hanzi" lang="zh-Hans">{surface(entry)}</strong><div><div className="lex-pronunciation">{entry.pinyin}{sound(entry)}</div><p>{entry.meaning}</p></div></div>
            {entry.example ? <div className="lex-preview-example"><BookOpen/><div><strong lang="zh-Hans">{entry.example}</strong><small>{entry.examplePinyin}</small><p>{entry.exampleMeaning}</p></div></div> : <p className="lex-preview-no-example">{entry.partOfSpeech || 'Xem nghĩa và nguồn trong hồ sơ mục từ.'}</p>}
          </div>
          <div className="lex-preview-actions"><button className="lex-primary" onClick={() => go('detail',entry)}>Mở hồ sơ mục từ <ChevronRight/></button>{save(entry)}<small>Âm thanh tổng hợp · hỗ trợ tra cứu</small></div>
        </aside>}
      </div>
    </> : <><nav className="lex-mobile-panes" aria-label="Vùng nội dung"><button aria-pressed={!mobilePreview} onClick={()=>setMobilePreview(false)}>{view==="detail"?"Nội dung":"Danh sách"}</button><button aria-pressed={mobilePreview} disabled={!entry} onClick={()=>setMobilePreview(true)}>Ngọc lệnh</button></nav><div className="lex-workspace" data-preview={mobilePreview}>
      <section className="lex-main-panel" aria-label={title}>
      {view === "detail" && entry ? <>
        <div className="lex-entry-heading"><strong className="lex-large-hanzi" lang="zh-Hans">{surface(entry)}</strong><div><div className="lex-pronunciation">{entry.pinyin}{sound(entry)}</div><p>{entry.meaning}</p><small>{entry.partOfSpeech} · {entry.isCore ? "Từ cốt lõi" : "Mở rộng"}</small></div></div>
        <nav className="lex-detail-tabs" aria-label="Nội dung hồ sơ">{[["meaning","Nghĩa và cách dùng"],["example","Ví dụ"],["related","Từ liên quan"],["source","Nguồn"]].map(([id,label])=><button key={id} aria-pressed={detailTab===id} onClick={()=>setDetailTab(id!)}>{label}</button>)}</nav>
        <div className="lex-detail-body" data-tab={detailTab}>
          <section className="lex-definition"><h2><Layers3/> Chữ trong từ</h2><div className="lex-character-parts">{[...entry.simplified].map((char,index)=>{const characterWord=words.find(word=>word.simplified===char);return <div key={index}><Link to={`/characters?char=${encodeURIComponent(char)}`}><strong lang="zh-Hans">{char}</strong><small>{characterWord?.pinyin}</small></Link><p>{characterWord?.meaning ?? "Mở Thần Văn Lô để xem cấu trúc và nét chữ."}</p></div>;})}</div><h2><BookOpen/> Nghĩa và cách dùng</h2>{entry.senses.map(sense=><p key={sense}>{sense}</p>)}{entry.classifiers.length>0 && <p>Lượng từ: {entry.classifiers.join(" · ")}</p>}</section>
          <section className="lex-examples"><h2>Ví dụ</h2>{entry.example ? <div><strong lang="zh-Hans">{entry.example}</strong><span>{entry.examplePinyin}</span><p>{entry.exampleMeaning}</p><button className="lex-sound" type="button" aria-label="Nghe câu ví dụ" onClick={() => void play(entry, 'example')}><Volume2/></button></div> : <p>Mục này chưa có câu ví dụ đã phát hành.</p>}</section>
          <section className="lex-related"><h2>Từ liên quan</h2><div>{related.slice(0,3).map(row)}</div></section>
          <section className="lex-source"><h2>Nguồn và phạm vi</h2><p>{entry.sourceKind === "studio" ? `Biên Tập Viện · ${entry.sourceTitle}` : entry.isCore ? "Gói bài học HSK0–4 của HANZI.OS." : "CVDICT · CC BY-SA 4.0. Nghĩa tham chiếu chưa qua duyệt giáo viên."}</p><p>Âm thanh tổng hợp của trình duyệt, không phải bản thu người bản ngữ.</p>
            <h2>Tiếp tục tu luyện</h2><div className="lex-journey-links">
              {sourceId && <Link to={`/lesson/${encodeURIComponent(sourceId)}`}>Thiên Lộ · {source?.title ?? 'Mở bài học'}</Link>}
              {sourceId && <Link to={`/pronunciation?lesson=${encodeURIComponent(sourceId)}`}>Vạn Âm Điện · Luyện âm theo bài</Link>}
              {entry.isCore && <Link to={`/review?word=${encodeURIComponent(entry.id)}`}>Ký Ức Trận · Ôn thẻ đủ điều kiện</Link>}
              <Link to={`/mistakes?word=${encodeURIComponent(entry.id)}`}>Nghịch Cảnh Lục · Lỗi liên quan</Link>
              <Link to="/reader">Vạn Quyển Các · Đọc trong ngữ cảnh</Link>
            </div><p>Tra cứu và tự ôn không tính là nhớ lại độc lập. Ký Ức Trận chỉ ưu tiên mục này nếu có thẻ đủ điều kiện trong hàng ôn.</p></section>
        </div>
      </> : <>
        <div className="lex-filters">{view === "lesson" && <DictionaryLessonPicker value={params.get("lesson")??""} onChange={id=>go("lesson",undefined,id)}/>}{search}</div>
        <nav className="lex-filter-tabs" aria-label="Loại mục từ">{(view==="lesson" ? [["all","Tất cả"],["core","Cốt lõi"],["extended","Mở rộng"],["encountered","Đã gặp"]] : [["all","Tất cả"],["word","Từ"],["character","Chữ"]]).map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>setKind(id!)}>{label}</button>)}</nav>
        {view==="saved" && <div className="lex-selection-bar"><label className="lex-check"><input type="checkbox" aria-label="Chọn các mục trên trang này" checked={pageWords.length>0 && pageWords.every(word=>checkedIds.includes(word.id))} onChange={event=>setCheckedIds(ids=>event.target.checked?[...new Set([...ids,...pageWords.map(word=>word.id)])]:ids.filter(id=>!pageWords.some(word=>word.id===id)))}/></label><span>Đã chọn {checkedIds.length} mục</span><button disabled={!checkedIds.length} onClick={()=>setCheckedIds([])}>Bỏ chọn</button></div>}
        <div ref={resultsRef} className={`lex-results ${view==="lesson" && kind==="all"?"lex-grouped-results":""}`}>{view==="lesson" && kind==="all" ? [true,false].map(core=>{const group=pageWords.filter(word=>word.isCore===core);return group.length>0 && <section key={String(core)}><h2>{core?"Từ cốt lõi trong bài":"Mở rộng theo bài"}</h2><div className="lex-word-grid">{group.map(wordCard)}</div></section>;}) : <div className="lex-word-grid">{pageWords.map(wordCard)}</div>}{!filtered.length && <p role="status">{pending ? 'Đang tìm trong kho từ…' : incomplete ? 'Chưa thấy mục phù hợp trong kho đã tải. Thử đổi từ tìm hoặc kết nối lại.' : 'Không có mục phù hợp. Thử đổi từ tìm hoặc bộ lọc.'}</p>}</div>{pager}
      </>}
      </section>
      {entry && <aside className="lex-jade-panel"><div><span>{view==="detail"?"GẶP TRONG THIÊN LỘ":entry.isCore?"TỪ CỐT LÕI":"MỤC MỞ RỘNG"}</span>{view!=="detail" && <><strong className="lex-large-hanzi" lang="zh-Hans">{surface(entry)}</strong><div className="lex-pronunciation">{entry.pinyin}{sound(entry)}</div><p>{entry.meaning}</p></>}{view==="saved" && <div className="lex-source-lesson"><small>Cách dùng</small><p>{entry.partOfSpeech} · {entry.exampleMeaning ?? entry.meaning}</p></div>}<div className="lex-source-lesson"><small>Nguồn</small><strong>{source?.title??(entry.sourceKind==="studio"?"Biên Tập Viện":"Kho từ điển")}</strong></div>{view==="detail" && sourceId && <Link className="lex-source-link" to={`/lesson/${encodeURIComponent(sourceId)}`}>Mở bài trong Thiên Lộ <ChevronRight/></Link>}</div>
        <div className="lex-panel-actions">
          {view==="saved" ? <><button className="lex-primary" disabled={!saved.some(word=>checkedIds.includes(word.id))} onClick={()=>setStudyWords(saved.filter(word=>checkedIds.includes(word.id)))}><Bookmark/> Ôn mục đã chọn</button><button className="lex-secondary" onClick={()=>go("detail",entry)}><BookOpen/> Mở hồ sơ mục từ</button></> : view==="detail" ? <><button className="lex-primary" onClick={()=>setStudyWords([entry])}><Bookmark/> Tự ôn mục từ</button>{save(entry)}</> : <><button className="lex-primary" onClick={()=>go("detail",entry)}><Bookmark/> Mở hồ sơ mục từ</button>{sourceId && <Link className="lex-secondary" to={`/lesson/${encodeURIComponent(sourceId)}`}><BookOpen/> Mở bài học</Link>}</>}
        </div></aside>}
    </div></>}
    {view === 'detail' && entry && <div className="lex-mobile-detail-actions"><button className="lex-primary" onClick={() => setStudyWords([entry])}>Tự ôn mục từ</button>{save(entry)}</div>}
    {view === 'saved' && <div className="lex-mobile-detail-actions"><button className="lex-primary" disabled={!saved.some(word => checkedIds.includes(word.id))} onClick={() => setStudyWords(saved.filter(word => checkedIds.includes(word.id)))}>Ôn mục đã chọn</button></div>}
  </div>;
}
