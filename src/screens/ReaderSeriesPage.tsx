import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Circle,
  Clock3,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ReaderCover } from "../reader/library/ReaderCover";
import { loadEditorialReaderCatalog } from "../reader/library/editorialReaderClient";
import type { ReaderSeries } from "../reader/library/readerContentModel";
import { resolveReaderEntry } from "../reader/library/readerEntryResolver";
import { READER_SERIES_BY_ID } from "../reader/library/readerManifest";
import {
  chapterState,
  seriesCompletion,
} from "../reader/library/readerProgress";
import { useReaderProgress } from "../reader/library/useReaderProgress";
import "../reader/library/readerLibrary.css";
import { useLearning } from "../store/LearningStore";

const reviewedLexemeIds = (evidence: ReturnType<typeof useLearning>["state"]["evidence"]) => {
  const ids = new Set<string>();
  evidence.forEach((item) => {
    if (item.source !== "review" || !item.activityId.startsWith("review:")) return;
    const rating = Number(item.metadata?.rating);
    if (Number.isFinite(rating) && rating > 1) ids.add(item.activityId.slice("review:".length));
  });
  return ids;
};

export function ReaderSeriesPage() {
  const { seriesId = "" } = useParams();
  const { state, sync } = useLearning();
  const { progress } = useReaderProgress({
    ownerKey: sync.ownerKey,
    authenticated: Boolean(sync.session?.authenticated),
  });
  const staticSeries = READER_SERIES_BY_ID.get(seriesId);
  const [editorialSeries, setEditorialSeries] = useState<ReaderSeries | null>(null);
  const [editorialLoading, setEditorialLoading] = useState(!staticSeries);
  const [editorialUnavailable, setEditorialUnavailable] = useState(false);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const series = staticSeries ?? editorialSeries ?? undefined;

  useEffect(() => {
    if (staticSeries) {
      setEditorialSeries(null);
      setEditorialLoading(false);
      setEditorialUnavailable(false);
      return;
    }
    let active = true;
    setEditorialLoading(true);
    setEditorialUnavailable(false);
    loadEditorialReaderCatalog({ retry: catalogRetry > 0 })
      .then((catalog) => {
        if (active) setEditorialSeries(catalog.find((candidate) => candidate.seriesId === seriesId) ?? null);
      })
      .catch(() => { if (active) setEditorialUnavailable(true); })
      .finally(() => { if (active) setEditorialLoading(false); });
    return () => { active = false; };
  }, [catalogRetry, seriesId, staticSeries]);

  if (editorialLoading) {
    return <section className="reader-recovery" role="status"><BookOpenText size={44} aria-hidden="true" /><span>VẠN QUYỂN CÁC</span><h1>Đang lấy sách từ gian biên tập…</h1></section>;
  }

  if (editorialUnavailable) {
    return (
      <section className="reader-recovery" role="alert">
        <BookOpenText size={44} aria-hidden="true" />
        <span>VẠN QUYỂN CÁC</span>
        <h1>Gian phát hành đang ngoại tuyến</h1>
        <p>Không có tiến độ nào bị xóa. Hãy thử kết nối lại hoặc mở Thư Khố tích hợp.</p>
        <div>
          <Link className="reader-button reader-button--quiet" to="/reader"><ArrowLeft size={18} aria-hidden="true" /> Thư Khố</Link>
          <button className="reader-button reader-button--primary" type="button" onClick={() => setCatalogRetry((value) => value + 1)}>
            <RotateCcw size={18} aria-hidden="true" /> Thử lại
          </button>
        </div>
      </section>
    );
  }

  if (!series) {
    return (
      <section className="reader-recovery" role="status">
        <BookOpenText size={44} aria-hidden="true" />
        <span>VẠN QUYỂN CÁC</span>
        <h1>Quyển này chưa có trong Thư Khố</h1>
        <p>Liên kết có thể đã cũ. Những quyển đang phát hành vẫn mở bình thường.</p>
        <Link className="reader-button reader-button--primary" to="/reader">
          <ArrowLeft size={18} aria-hidden="true" /> Mở Thư Khố
        </Link>
      </section>
    );
  }

  const chapters = series.volumes.flatMap((volume) => volume.chapters);
  const entry = resolveReaderEntry({ progress, series });
  const completion = seriesCompletion(progress, series);
  const minutes = chapters.reduce((sum, chapter) => sum + chapter.estimatedMinutes, 0);
  const reviewed = reviewedLexemeIds(state.evidence);
  const familiar = series.focusLexemeIds.filter((id) => reviewed.has(id)).length;
  const familiarity = familiar > 0
    ? Math.round((familiar / series.focusLexemeIds.length) * 100)
    : null;

  return (
    <section className="reader-series-page" data-testid="reader-series-page">
      <Link className="reader-route-back" to="/reader"><ArrowLeft size={18} aria-hidden="true" /> Thư Khố</Link>
      <header className="reader-series-hero">
        <ReaderCover series={series} />
        <div>
          <span className="reader-kicker"><Sparkles size={15} aria-hidden="true" /> {series.volumes[0]?.titleVi}</span>
          <p lang="zh-Hans">{series.titleZh}</p>
          <h1>{series.titleVi}</h1>
          <strong className="reader-series-hook">{series.hookVi}</strong>
          <p>{series.synopsisVi}</p>
          <p className="reader-series-provenance">
            {staticSeries
              ? "Truyện nguyên bản soạn cho HANZI.OS · có AI hỗ trợ · chưa human review · không sao chép hoặc chuyển thể từ tiểu thuyết có sẵn."
              : `Nguồn do biên tập viên khai báo · ${series.source.provenanceNote}`}
          </p>
          <div className="reader-series-tags">
            <span>{series.genreIds.join(" · ")}</span>
            <span>{series.levelBand.label}</span>
            <span><Clock3 size={15} aria-hidden="true" /> {minutes} phút</span>
            <span><BookOpenText size={15} aria-hidden="true" /> {chapters.length} chương</span>
          </div>
          {familiarity !== null ? (
            <p className="reader-familiarity">Khoảng {familiarity}% từ trọng tâm đã có dấu vết ôn đúng trên thiết bị này.</p>
          ) : (
            <p className="reader-familiarity">Chưa đủ lần ôn từ để tính tỷ lệ quen thuộc.</p>
          )}
          <Link className="reader-button reader-button--primary reader-series-primary" to={`/reader/series/${entry.seriesId}/chapter/${entry.chapterId}`}>
            {entry.primaryLabel} <ArrowRight size={19} aria-hidden="true" />
          </Link>
          {completion.complete > 0 && <small className="reader-series-completion">Đã đọc {completion.complete}/{completion.total} chương</small>}
        </div>
      </header>

      <main className="reader-chapter-list" aria-labelledby="reader-chapter-list-title">
        <header>
          <small>DANH SÁCH CHƯƠNG</small>
          <h2 id="reader-chapter-list-title">{series.volumes[0]?.titleVi}</h2>
        </header>
        <ol>
          {chapters.map((chapter) => {
            const status = chapterState(progress, chapter.chapterId);
            const StatusIcon = status === "completed"
              ? CheckCircle2
              : status === "reading"
                ? PlayCircle
                : Circle;
            return (
              <li key={chapter.chapterId} data-reader-state={status}>
                <span className="reader-chapter-number">{String(chapter.chapterNumber).padStart(2, "0")}</span>
                <div>
                  <small lang="zh-Hans">{chapter.titleZh}</small>
                  <strong>{chapter.titleVi}</strong>
                  <p>{chapter.hookVi}</p>
                  <span><Clock3 size={14} aria-hidden="true" /> {chapter.estimatedMinutes} phút</span>
                </div>
                <span className="reader-chapter-status">
                  <StatusIcon size={17} aria-hidden="true" />
                  {status === "completed" ? "Đã hoàn thành" : status === "reading" ? "Đang đọc" : "Chưa đọc"}
                </span>
                <Link to={`/reader/series/${series.seriesId}/chapter/${chapter.chapterId}`} aria-label={`${status === "completed" ? "Đọc lại" : status === "reading" ? "Tiếp tục" : "Mở"} ${chapter.titleVi}`}>
                  {status === "completed" ? <RotateCcw size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                  {status === "completed" ? "Đọc lại" : status === "reading" ? "Tiếp tục" : "Mở chương"}
                </Link>
              </li>
            );
          })}
        </ol>
      </main>

      {series.seriesId === "first-day" && (
        <aside className="reader-series-challenge-link">
          <span>Muốn làm lại câu hỏi đọc hiểu lịch sử?</span>
          <Link to="/reader/challenge">Mở Khảo luyện đọc cũ</Link>
        </aside>
      )}
    </section>
  );
}
