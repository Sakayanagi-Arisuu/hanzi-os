import {
  ArrowRight,
  Bookmark,
  Compass,
  LibraryBig,
  PenLine,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ReaderCover } from "../reader/library/ReaderCover";
import { ReaderSavedWordsDialog } from "../reader/library/ReaderSavedWordsDialog";
import { loadEditorialReaderCatalog } from "../reader/library/editorialReaderClient";
import type { ReaderSeries } from "../reader/library/readerContentModel";
import {
  READER_DISCOVERABLE_SERIES,
  READER_SERIES_BY_ID,
} from "../reader/library/readerManifest";
import {
  READER_SHELF_OPTIONS,
  type ReaderShelfOption,
} from "../reader/library/readerShelfCatalog";
import {
  chapterState,
  removeReaderSavedEntry,
  seriesCompletion,
} from "../reader/library/readerProgress";
import { useReaderProgress } from "../reader/library/useReaderProgress";
import "../reader/library/readerLibrary.css";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

const LIBRARY_VIEW_KEY = "hanzi-os-reader-library-view-v2";

type DiscoveryState = {
  query: string;
  level: string;
  shelf: ReaderShelfOption["shelfId"];
};

const emptyDiscovery: DiscoveryState = {
  query: "",
  level: "Tất cả",
  shelf: "all",
};

const isShelfId = (value: unknown): value is DiscoveryState["shelf"] =>
  READER_SHELF_OPTIONS.some((option) => option.shelfId === value);

const readLibraryView = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LIBRARY_VIEW_KEY) ?? "{}") as Partial<DiscoveryState> & { scrollY?: number };
    return {
      discovery: {
        query: typeof parsed.query === "string" ? parsed.query : "",
        level: typeof parsed.level === "string" ? parsed.level : "Tất cả",
        shelf: isShelfId(parsed.shelf) ? parsed.shelf : "all",
      },
      scrollY: Number.isFinite(parsed.scrollY) ? Number(parsed.scrollY) : 0,
    };
  } catch {
    return { discovery: emptyDiscovery, scrollY: 0 };
  }
};

const writeLibraryView = (discovery: DiscoveryState, scrollY = window.scrollY) => {
  try {
    sessionStorage.setItem(LIBRARY_VIEW_KEY, JSON.stringify({ ...discovery, scrollY }));
  } catch {
    // View state is optional; reading progress uses its own durable store.
  }
};

const matchesShelf = (series: ReaderSeries, shelf: DiscoveryState["shelf"]) => {
  if (shelf === "all") return true;
  if (series.shelfId === shelf) return true;
  const label = READER_SHELF_OPTIONS.find((option) => option.shelfId === shelf)?.label;
  return Boolean(label && series.genreIds.includes(label));
};

export function ReaderLibraryPage() {
  const { sync } = useLearning();
  const { progress, setProgress, storageError } = useReaderProgress({
    ownerKey: sync.ownerKey,
    authenticated: Boolean(sync.session?.authenticated),
  });
  const initialView = useMemo(readLibraryView, []);
  const [discovery, setDiscovery] = useState(initialView.discovery);
  const [filtersExpanded, setFiltersExpanded] = useState(
    initialView.discovery.query.length > 0 || initialView.discovery.level !== "Tất cả",
  );
  const [savedWordsOpen, setSavedWordsOpen] = useState(false);
  const [editorialSeries, setEditorialSeries] = useState<ReaderSeries[]>([]);
  const discoveryRef = useRef(discovery);
  const catalogRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const savedWordsTriggerRef = useRef<HTMLButtonElement>(null);
  discoveryRef.current = discovery;

  const seriesCatalog = useMemo(() => {
    const staticIds = new Set(READER_DISCOVERABLE_SERIES.map((series) => series.seriesId));
    return [...READER_DISCOVERABLE_SERIES, ...editorialSeries.filter((series) => !staticIds.has(series.seriesId))];
  }, [editorialSeries]);
  const seriesById = useMemo(
    () => new Map(seriesCatalog.map((series) => [series.seriesId, series])),
    [seriesCatalog],
  );
  const libraryChapterCount = seriesCatalog.reduce(
    (sum, series) => sum + series.volumes.flatMap((volume) => volume.chapters).length,
    0,
  );
  const savedEntries = Object.values(progress.savedEntries)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt));

  useEffect(() => {
    const restore = window.requestAnimationFrame(() => window.scrollTo({ top: initialView.scrollY }));
    const persist = () => writeLibraryView(discoveryRef.current);
    window.addEventListener("scroll", persist, { passive: true });
    return () => {
      window.cancelAnimationFrame(restore);
      window.removeEventListener("scroll", persist);
      writeLibraryView(discoveryRef.current);
    };
  }, [initialView.scrollY]);

  useEffect(() => {
    writeLibraryView(discovery);
  }, [discovery]);

  useEffect(() => {
    let active = true;
    loadEditorialReaderCatalog()
      .then((series) => { if (active) setEditorialSeries(series); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filtered = seriesCatalog.filter((series) => {
    const query = discovery.query.trim().toLocaleLowerCase("vi");
    const queryMatch = !query || [
      series.titleVi,
      series.titleZh,
      series.synopsisVi,
      series.hookVi,
      ...series.genreIds,
    ].some((value) => value.toLocaleLowerCase("vi").includes(query));
    const levelMatch = discovery.level === "Tất cả"
      || series.levelBand.min === discovery.level
      || series.levelBand.max === discovery.level
      || series.levelBand.label.includes(discovery.level);
    return queryMatch && levelMatch && matchesShelf(series, discovery.shelf);
  });

  const continueSeries = progress.lastSeriesId
    ? seriesById.get(progress.lastSeriesId) ?? READER_SERIES_BY_ID.get(progress.lastSeriesId)
    : null;
  const continueChapter = continueSeries?.discoverable
    ? continueSeries.volumes.flatMap((volume) => volume.chapters)
      .find((chapter) => chapter.chapterId === progress.lastChapterId)
    : null;

  const openDiscovery = () => {
    setFiltersExpanded(true);
    window.requestAnimationFrame(() => {
      catalogRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
      window.requestAnimationFrame(() => searchRef.current?.focus());
    });
  };

  const clearFilters = () => {
    setDiscovery(emptyDiscovery);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  return (
    <section className="reader-library" data-testid="reader-library">
      <header className="reader-library-topbar">
        <div className="reader-library-identity">
          <span><LibraryBig size={17} aria-hidden="true" /> VẠN QUYỂN CÁC</span>
          <strong>{seriesCatalog.length} quyển đang phát hành · đọc và tra từ ngay</strong>
        </div>
        <div className="reader-topbar-actions">
          <Link className="reader-editor-trigger" to="/studio/library">
            <PenLine size={17} aria-hidden="true" /> Dành cho biên tập viên
          </Link>
          <button ref={savedWordsTriggerRef} type="button" className="reader-saved-words-trigger" onClick={() => setSavedWordsOpen(true)}>
            <Bookmark size={18} aria-hidden="true" /> Sổ từ <span>{savedEntries.length}</span>
          </button>
          <button type="button" className="reader-explore-trigger" onClick={openDiscovery}>
            <Compass size={19} aria-hidden="true" /> Khám phá
          </button>
        </div>
      </header>

      <main>
        {continueSeries && continueChapter && chapterState(progress, continueChapter.chapterId) === "reading" && (
          <aside className="reader-continue-strip" aria-label="Trang sách đang đọc dở">
            <span><small>ĐANG ĐỌC</small><strong>{continueSeries.titleVi}</strong></span>
            <span>{continueChapter.titleVi} · tiếp tục từ đoạn đã lưu</span>
            <Link to={`/reader/series/${continueSeries.seriesId}/chapter/${continueChapter.chapterId}`}>
              Tiếp tục <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </aside>
        )}

        <section ref={catalogRef} className="reader-catalog" aria-labelledby="reader-catalog-title">
          <header className="reader-catalog-heading">
            <div>
              <small>THƯ KHỐ ĐANG MỞ · {libraryChapterCount} CHƯƠNG ĐỌC ĐƯỢC</small>
              <h1 id="reader-catalog-title">Chọn một thế giới để khai quyển</h1>
              <p>Tu tiên, trùng sinh, ma pháp, light novel, bí ẩn, khoa huyễn, võ hiệp, triết lý và đời sống — toàn bộ là truyện nguyên bản HANZI.OS.</p>
            </div>
            <button
              type="button"
              className="reader-filter-toggle"
              aria-expanded={filtersExpanded}
              aria-controls="reader-catalog-filters"
              onClick={() => setFiltersExpanded((expanded) => !expanded)}
            >
              <SlidersHorizontal size={18} aria-hidden="true" /> Bộ lọc
            </button>
          </header>

          <div className="reader-shelf-tabs" aria-label="Lọc theo thể loại">
            {READER_SHELF_OPTIONS.map((option) => (
              <button
                key={option.shelfId}
                type="button"
                aria-pressed={discovery.shelf === option.shelfId}
                title={option.description}
                onClick={() => setDiscovery((current) => ({ ...current, shelf: option.shelfId }))}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filtersExpanded && (
            <div id="reader-catalog-filters" className="reader-catalog-filters">
              <div className="reader-search-field">
                <label htmlFor="reader-search"><Search size={18} aria-hidden="true" /> Tìm theo tên, nội dung hoặc thể loại</label>
                <input
                  ref={searchRef}
                  id="reader-search"
                  type="search"
                  value={discovery.query}
                  onChange={(event) => setDiscovery((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Ví dụ: tu tiên, trùng sinh, ma pháp, triết lý…"
                />
              </div>
              <fieldset>
                <legend>Độ khó gợi ý</legend>
                <div>
                  {["Tất cả", "HSK1", "HSK2", "HSK3", "HSK4"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={discovery.level === level}
                      onClick={() => setDiscovery((current) => ({ ...current, level }))}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </fieldset>
              {(discovery.query || discovery.level !== "Tất cả" || discovery.shelf !== "all") && (
                <button type="button" className="reader-clear-filters" onClick={clearFilters}>
                  <X size={17} aria-hidden="true" /> Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          <p className="reader-catalog-count" aria-live="polite">
            Hiển thị <strong>{filtered.length}</strong> / {seriesCatalog.length} quyển đang mở
          </p>

          {filtered.length > 0 ? (
            <div className="reader-book-grid" data-testid="reader-book-grid">
              {filtered.map((series) => {
                const chapters = series.volumes.flatMap((volume) => volume.chapters);
                const completion = seriesCompletion(progress, series);
                return (
                  <Link
                    key={series.seriesId}
                    className="reader-library-book-card"
                    to={`/reader/series/${series.seriesId}`}
                    aria-label={`Mở mô tả ${series.titleVi}`}
                  >
                    <ReaderCover series={series} catalog />
                    <span className="reader-library-book-card__copy">
                      <small lang="zh-Hans">{series.titleZh}</small>
                      <strong>{series.titleVi}</strong>
                      <span>{series.genreIds.slice(0, 2).join(" · ")}</span>
                      <span>{series.levelBand.min === series.levelBand.max ? series.levelBand.min : `${series.levelBand.min}–${series.levelBand.max}`} · {chapters.length} chương</span>
                      {completion.complete > 0 && <em>Đã đọc {completion.complete}/{completion.total}</em>}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="reader-catalog-empty" role="status">
              <Search size={28} aria-hidden="true" />
              <strong>Chưa có quyển khớp bộ lọc này</strong>
              <span>Thử thể loại khác hoặc xóa từ khóa để mở lại toàn bộ thư khố.</span>
              <button type="button" className="reader-button reader-button--quiet" onClick={clearFilters}>Mở toàn bộ quyển</button>
            </div>
          )}
        </section>

        {storageError && (
          <p className="reader-storage-warning" role="status">
            Trình duyệt chưa thể lưu vị trí mới. Bạn vẫn có thể tiếp tục đọc và thử lưu lại sau.
          </p>
        )}
      </main>

      <ReaderSavedWordsDialog
        entries={savedEntries}
        open={savedWordsOpen}
        returnFocusRef={savedWordsTriggerRef}
        onClose={() => setSavedWordsOpen(false)}
        onSpeak={(text) => speakMandarin(text, 0.76)}
        onRemove={(entryId) => setProgress((current) => removeReaderSavedEntry(current, entryId))}
      />
    </section>
  );
}
