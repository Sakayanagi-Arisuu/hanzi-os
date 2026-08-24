import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Languages,
  List,
  RefreshCw,
  Settings2,
  Type,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router";
import { speakMandarin } from "../lib/speech";
import { ReaderDialog } from "../reader/library/ReaderDialog";
import { ReaderWordDialog } from "../reader/library/ReaderWordDialog";
import { loadEditorialReaderCatalog } from "../reader/library/editorialReaderClient";
import {
  loadReaderChapter,
  prefetchReaderChapter,
} from "../reader/library/readerChapterLoader";
import type {
  ReaderChapter,
  ReaderParagraph,
  ReaderSeries,
} from "../reader/library/readerContentModel";
import {
  hydrateReaderReferenceEntry,
  resolveReaderTokenEntry,
  type ReaderReferenceEntry,
} from "../reader/library/readerLexicon";
import { READER_SERIES_BY_ID } from "../reader/library/readerManifest";
import {
  completeReaderChapter,
  recordReaderSupport,
  resolveReadingMode,
  toggleReaderSavedEntry,
  updateReaderPosition,
  type ReaderMode,
} from "../reader/library/readerProgress";
import { useReaderProgress } from "../reader/library/useReaderProgress";
import "../reader/library/readerLibrary.css";
import { useLearning } from "../store/LearningStore";

type ChapterLoadState =
  | { phase: "loading"; slow: boolean }
  | { phase: "ready"; chapter: ReaderChapter }
  | { phase: "error"; timeout: boolean };

function ParagraphText({
  paragraph,
  onToken,
}: {
  paragraph: ReaderParagraph;
  onToken: (entry: ReaderReferenceEntry, target: HTMLButtonElement, paragraphId: string) => void;
}) {
  return (
    <p className="reader-chinese-copy" lang="zh-Hans">
      {paragraph.segments.map((segment) => {
        if (segment.kind === "text") return <span key={`text-${segment.sequence}`}>{segment.text}</span>;
        const entry = resolveReaderTokenEntry(segment, paragraph.vi);
        return (
          <button
            key={`token-${segment.sequence}`}
            className="reader-inline-token"
            type="button"
            aria-label={`Tra từ ${segment.surface}`}
            onClick={(event) => onToken(entry, event.currentTarget, paragraph.paragraphId)}
          >
            {segment.surface}
          </button>
        );
      })}
    </p>
  );
}

export function ReaderChapterPage() {
  const { seriesId = "", chapterId = "" } = useParams();
  const navigate = useNavigate();
  const { state, actions, sync } = useLearning();
  const { progress, scopeReady, setProgress, storageError } = useReaderProgress({
    ownerKey: sync.ownerKey,
    authenticated: Boolean(sync.session?.authenticated),
  });
  const staticSeries = READER_SERIES_BY_ID.get(seriesId);
  const [editorialSeries, setEditorialSeries] = useState<ReaderSeries | null>(null);
  const [editorialLoading, setEditorialLoading] = useState(!staticSeries);
  const series = staticSeries ?? editorialSeries ?? undefined;
  const chapters = series?.volumes.flatMap((volume) => volume.chapters) ?? [];
  const summaryIndex = chapters.findIndex((chapter) => chapter.chapterId === chapterId);
  const summary = summaryIndex >= 0 ? chapters[summaryIndex] : null;
  const previous = summaryIndex > 0 ? chapters[summaryIndex - 1] : null;
  const next = summaryIndex >= 0 ? chapters[summaryIndex + 1] : null;
  const [retryVersion, setRetryVersion] = useState(0);
  const [loadState, setLoadState] = useState<ChapterLoadState>({ phase: "loading", slow: false });
  const [mode, setMode] = useState<ReaderMode>("zh-only");
  const [showPinyin, setShowPinyin] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ReaderReferenceEntry | null>(null);
  const [activeParagraphId, setActiveParagraphId] = useState("");
  const [completionAnnouncement, setCompletionAnnouncement] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const supportTriggerRef = useRef<HTMLButtonElement>(null);
  const tokenTriggerRef = useRef<HTMLElement>(null);
  const lookupSequenceRef = useRef(0);
  const restoredChapterRef = useRef("");
  const progressRef = useRef(progress);
  const modeRef = useRef(mode);
  progressRef.current = progress;
  modeRef.current = mode;

  useEffect(() => {
    document.body.classList.add("reader-library-immersive");
    return () => document.body.classList.remove("reader-library-immersive");
  }, []);

  useEffect(() => {
    if (staticSeries) {
      setEditorialLoading(false);
      return;
    }
    let active = true;
    setEditorialLoading(true);
    loadEditorialReaderCatalog()
      .then((catalog) => {
        if (active) setEditorialSeries(catalog.find((candidate) => candidate.seriesId === seriesId) ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setEditorialLoading(false); });
    return () => { active = false; };
  }, [seriesId, staticSeries]);

  useEffect(() => {
    if (!series || !summary) return;
    let active = true;
    setLoadState({ phase: "loading", slow: false });
    const slowTimer = window.setTimeout(() => {
      if (active) setLoadState((current) => current.phase === "loading" ? { phase: "loading", slow: true } : current);
    }, 300);
    const timeoutTimer = window.setTimeout(() => {
      if (active) setLoadState((current) => current.phase === "loading" ? { phase: "error", timeout: true } : current);
    }, 10_000);
    void loadReaderChapter(seriesId, chapterId, { retry: retryVersion > 0 })
      .then((chapter) => {
        if (!active) return;
        setLoadState({ phase: "ready", chapter });
        if (next) prefetchReaderChapter(seriesId, next.chapterId);
      })
      .catch(() => {
        if (active) setLoadState({ phase: "error", timeout: false });
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
        window.clearTimeout(timeoutTimer);
      });
    return () => {
      active = false;
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [chapterId, next, retryVersion, series, seriesId, summary]);

  const chapter = loadState.phase === "ready" ? loadState.chapter : null;
  const completed = Boolean(chapter && progress.chapters[chapter.chapterId]?.completedAt);

  useEffect(() => {
    if (!chapter || !scopeReady) return;
    const restoreKey = `${progress.ownerKey}:${chapter.chapterId}`;
    if (restoredChapterRef.current === restoreKey) return;
    restoredChapterRef.current = restoreKey;
    const restored = progressRef.current.chapters[chapter.chapterId];
    const targetId = restored?.paragraphId ?? chapter.paragraphs[0]?.paragraphId;
    const restoredMode = resolveReadingMode(restored);
    modeRef.current = restoredMode;
    setMode(restoredMode);
    setActiveParagraphId(targetId ?? "");
    const frame = window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      const target = targetId ? document.getElementById(targetId) : null;
      if (container && target) container.scrollTop = Math.max(0, target.offsetTop - 24);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chapter, progress.ownerKey, scopeReady]);

  useEffect(() => {
    if (!chapter || !scrollRef.current || !scopeReady) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      const paragraphId = visible?.target.id;
      if (!paragraphId) return;
      setActiveParagraphId(paragraphId);
      setProgress((current) => {
        if (
          current.chapters[chapter.chapterId]?.paragraphId === paragraphId
          && current.chapters[chapter.chapterId]?.readingMode === modeRef.current
        ) return current;
        return updateReaderPosition({
          document: current,
          seriesId: chapter.seriesId,
          chapterId: chapter.chapterId,
          paragraphId,
          readingMode: modeRef.current,
        });
      });
    }, { root: scrollRef.current, rootMargin: "-18% 0px -58%", threshold: [0.1, 0.5, 0.9] });
    chapter.paragraphs.forEach((paragraph) => {
      const element = document.getElementById(paragraph.paragraphId);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [chapter, mode, scopeReady, setProgress]);

  const recordSupport = useCallback((
    kind: "lookup" | "tts" | "translation" | "pinyin",
    referenceEntryId: string | null = null,
    paragraphId: string | null = activeParagraphId || null,
  ) => {
    if (!chapter) return;
    setProgress((current) => recordReaderSupport(current, {
      kind,
      seriesId: chapter.seriesId,
      chapterId: chapter.chapterId,
      paragraphId,
      referenceEntryId,
    }));
  }, [activeParagraphId, chapter, setProgress]);

  const chooseMode = (nextMode: ReaderMode) => {
    if (!chapter || nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === "bilingual") recordSupport("translation");
    setProgress((current) => updateReaderPosition({
      document: current,
      seriesId: chapter.seriesId,
      chapterId: chapter.chapterId,
      paragraphId: activeParagraphId || chapter.paragraphs[0]?.paragraphId || "",
      readingMode: nextMode,
    }));
  };

  const openWord = (
    entry: ReaderReferenceEntry,
    target: HTMLButtonElement,
    paragraphId: string,
  ) => {
    tokenTriggerRef.current = target;
    setSelectedEntry(entry);
    recordSupport("lookup", entry.entryId, paragraphId);
    const sequence = ++lookupSequenceRef.current;
    void hydrateReaderReferenceEntry(entry).then((hydrated) => {
      if (lookupSequenceRef.current === sequence) setSelectedEntry(hydrated);
    }).catch(() => undefined);
  };

  const closeWord = () => {
    lookupSequenceRef.current += 1;
    setSelectedEntry(null);
  };
  const speak = (text: string) => {
    recordSupport("tts", selectedEntry?.entryId ?? null);
    speakMandarin(text, 0.76);
  };
  const toggleSavedEntry = (entry: ReaderReferenceEntry) => {
    if (entry.lexemeId) {
      void actions.toggleSavedWord(entry.lexemeId);
      return;
    }
    const sourceType = entry.sourceType === "original-context-gloss"
      || entry.sourceType === "mega-lexicon"
      || entry.sourceType === "reader-character-fallback"
      ? entry.sourceType
      : null;
    if (!sourceType) return;
    setProgress((current) => toggleReaderSavedEntry(current, {
      entryId: entry.entryId,
      simplified: entry.simplified,
      ...(entry.traditional ? { traditional: entry.traditional } : {}),
      pinyin: entry.pinyin,
      partOfSpeechVi: entry.partOfSpeechVi,
      contextualMeaningVi: entry.contextualMeaningVi,
      sourceType,
    }));
  };
  const togglePinyin = () => {
    setShowPinyin((current) => {
      if (!current) recordSupport("pinyin");
      return !current;
    });
  };
  const finishChapter = () => {
    if (!chapter) return;
    setProgress((current) => completeReaderChapter(current, chapter));
    setCompletionAnnouncement("Đã lưu hoàn thành chương. Đọc lại sẽ không cộng thêm phần thưởng hay kết quả học.");
  };
  const replay = () => {
    if (!chapter) return;
    const first = chapter.paragraphs[0]?.paragraphId ?? "";
    setActiveParagraphId(first);
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    setProgress((current) => updateReaderPosition({
      document: current,
      seriesId: chapter.seriesId,
      chapterId: chapter.chapterId,
      paragraphId: first,
      readingMode: mode,
    }));
  };

  const activeIndex = useMemo(() => chapter
    ? Math.max(0, chapter.paragraphs.findIndex((paragraph) => paragraph.paragraphId === activeParagraphId))
    : 0, [activeParagraphId, chapter]);
  const progressPercent = chapter
    ? Math.round(((activeIndex + 1) / Math.max(1, chapter.paragraphs.length)) * 100)
    : 0;

  if (editorialLoading) {
    return <section className="reader-chapter-loader" role="status" aria-live="polite"><BookOpenText size={42} aria-hidden="true" /><strong>Đang lấy chương từ gian biên tập…</strong></section>;
  }

  if (!series || !summary) {
    return (
      <section className="reader-recovery reader-recovery--immersive" role="status">
        <BookOpenText size={44} aria-hidden="true" />
        <h1>Chương này chưa còn trong bản mục lục</h1>
        <p>Liên kết có thể đã cũ. Thư Khố vẫn giữ mọi chương đang phát hành.</p>
        <Link className="reader-button reader-button--primary" to={series ? `/reader/series/${series.seriesId}` : "/reader"}>
          <ArrowLeft size={18} aria-hidden="true" /> {series ? "Mở danh sách chương" : "Mở Thư Khố"}
        </Link>
      </section>
    );
  }

  if (loadState.phase === "loading") {
    return (
      <section className="reader-chapter-loader" role="status" aria-live="polite">
        <BookOpenText size={42} aria-hidden="true" />
        <h1>Đang mở chương {summary.chapterNumber}</h1>
        <p>{loadState.slow ? "Trang sách đang được lấy từ kho trên thiết bị…" : "Đang lật tới đúng trang đã lưu…"}</p>
        {loadState.slow && <span className="reader-loading-line" aria-hidden="true" />}
      </section>
    );
  }

  if (loadState.phase === "error") {
    return (
      <section className="reader-recovery reader-recovery--immersive" role="alert">
        <BookOpenText size={44} aria-hidden="true" />
        <h1>{loadState.timeout ? "Chương đang mở lâu hơn dự kiến" : "Chưa thể mở trang sách"}</h1>
        <p>Nội dung đã phát hành vẫn nằm trên thiết bị. Hãy thử mở lại hoặc trở về danh sách chương.</p>
        <div>
          <Link className="reader-button reader-button--quiet" to={`/reader/series/${series.seriesId}`}>Danh sách chương</Link>
          <button className="reader-button reader-button--primary" type="button" onClick={() => setRetryVersion((value) => value + 1)}>
            <RefreshCw size={18} aria-hidden="true" /> Thử lại
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="reader-chapter-shell" data-testid="reader-chapter-shell" data-reader-mode={mode}>
      <header className="reader-chapter-header">
        <button type="button" onClick={() => navigate("/reader")} aria-label="Thoát phiên đọc và trở về Thư Khố">
          <X size={21} aria-hidden="true" />
        </button>
        <div>
          <small>{series.titleVi}</small>
          <strong>Chương {chapter!.chapterNumber} · {chapter!.titleVi}</strong>
        </div>
        <span className="reader-chapter-percent" aria-hidden="true">{progressPercent}%</span>
        <button
          ref={supportTriggerRef}
          type="button"
          aria-label="Hỗ trợ đọc"
          onClick={() => setSupportOpen(true)}
        >
          <Settings2 size={18} aria-hidden="true" /><span>Hỗ trợ</span>
        </button>
        <div className="reader-chapter-progress" role="progressbar" aria-label="Tiến độ trong chương" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <div className="reader-chapter-scroll" ref={scrollRef}>
        <article className="reader-reading-surface">
          <header>
            <span>第 {chapter!.chapterNumber} 章</span>
            <h1 lang="zh-Hans">{chapter!.titleZh}</h1>
            <p>{chapter!.titleVi}</p>
            <small className="reader-lookup-hint">Chạm bất kỳ chữ Hán nào để tra và lưu.</small>
          </header>
          {chapter!.paragraphs.map((paragraph, index) => (
            <section className="reader-prose-paragraph" id={paragraph.paragraphId} key={paragraph.paragraphId} data-paragraph-number={index + 1}>
              <ParagraphText paragraph={paragraph} onToken={openWord} />
              {showPinyin && <p className="reader-pinyin-copy">{paragraph.pinyin}</p>}
              {mode === "bilingual" && <p className="reader-vietnamese-copy" lang="vi">{paragraph.vi}</p>}
            </section>
          ))}
          <p className="reader-end-mark"><span aria-hidden="true">终</span> Hết chương {chapter!.chapterNumber}</p>
        </article>
      </div>

      <footer className="reader-chapter-footer">
        <div className="reader-chapter-secondary-nav">
          {previous ? (
            <Link to={`/reader/series/${series.seriesId}/chapter/${previous.chapterId}`} aria-label={`Chương trước: ${previous.titleVi}`}>
              <ChevronLeft size={19} aria-hidden="true" /><span>Trước</span>
            </Link>
          ) : <span aria-hidden="true" />}
          <Link to={`/reader/series/${series.seriesId}`}><List size={18} aria-hidden="true" /><span>Mục lục</span></Link>
          {next ? (
            <Link to={`/reader/series/${series.seriesId}/chapter/${next.chapterId}`} aria-label={`Chương sau: ${next.titleVi}`}>
              <span>Sau</span><ChevronRight size={19} aria-hidden="true" />
            </Link>
          ) : <span aria-hidden="true" />}
        </div>
        {completed ? (
          next ? (
            <Link className="reader-button reader-button--primary" to={`/reader/series/${series.seriesId}/chapter/${next.chapterId}`}>
              Mở chương tiếp <ArrowRight size={19} aria-hidden="true" />
            </Link>
          ) : (
            <button className="reader-button reader-button--primary" type="button" onClick={replay}>
              Đọc lại từ đầu <RefreshCw size={18} aria-hidden="true" />
            </button>
          )
        ) : (
          <button className="reader-button reader-button--primary" type="button" onClick={finishChapter}>
            Hoàn thành chương <CheckCircle2 size={19} aria-hidden="true" />
          </button>
        )}
      </footer>

      <p className="reader-live-region" aria-live="polite">{completionAnnouncement}{storageError ? " Trình duyệt chưa thể xác nhận lần lưu mới." : ""}</p>

      <ReaderDialog
        open={supportOpen}
        title="Hỗ trợ đọc"
        eyebrow="CHỈ MỞ KHI CẦN"
        className="reader-support-dialog"
        returnFocusRef={supportTriggerRef}
        onClose={() => setSupportOpen(false)}
      >
        <div className="reader-support-options">
          <fieldset>
            <legend>Chế độ văn bản</legend>
            <div role="radiogroup" aria-label="Chế độ văn bản">
              <button type="button" role="radio" aria-checked={mode === "zh-only"} onClick={() => chooseMode("zh-only")}>
                <Type size={19} aria-hidden="true" /><span><strong>Chỉ tiếng Trung</strong><small>Tập trung vào bản gốc</small></span>
              </button>
              <button type="button" role="radio" aria-checked={mode === "bilingual"} onClick={() => chooseMode("bilingual")}>
                <Languages size={19} aria-hidden="true" /><span><strong>Song ngữ Trung–Việt</strong><small>Dịch ngay dưới đúng đoạn</small></span>
              </button>
            </div>
          </fieldset>
          <button type="button" aria-pressed={showPinyin} onClick={togglePinyin}>
            <Type size={19} aria-hidden="true" /><span><strong>Pinyin toàn đoạn</strong><small>{showPinyin ? "Đang hiện" : "Đang ẩn"}</small></span>
          </button>
          <button type="button" onClick={() => speak(chapter!.paragraphs.map((paragraph) => paragraph.zhHans).join(""))}>
            <Headphones size={19} aria-hidden="true" /><span><strong>Nghe toàn chương</strong><small>Giọng tổng hợp của thiết bị · không tự phát</small></span>
          </button>
        </div>
      </ReaderDialog>

      <ReaderWordDialog
        entry={selectedEntry}
        open={Boolean(selectedEntry)}
        saved={Boolean(selectedEntry && (selectedEntry.lexemeId
          ? state.savedWords.includes(selectedEntry.lexemeId)
          : progress.savedEntries[selectedEntry.entryId]))}
        returnFocusRef={tokenTriggerRef}
        onClose={closeWord}
        onSpeak={speak}
        onToggleSave={toggleSavedEntry}
      />
    </section>
  );
}
