import { ArrowLeft, BookOpen, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import "./LessonContentLoading.css";

/** Presentation only: the reader decides when content is ready or needs fallback. */
export function LessonContentLoading({ title, restoring = false }: { title?: string; restoring?: boolean }) {
  return <section className="lesson-page-reader jade-lesson lesson-content-loading" aria-label="Chuẩn bị bài học">
    <header className="lesson-loading-header">
      <Link to="/path"><ArrowLeft size={17} aria-hidden="true" /> Thiên Lộ</Link>
      <span>HỌC QUYỂN</span>
    </header>
    <div className="lesson-loading-body">
      <div className="lesson-loading-seal" aria-hidden="true">
        <i className="lesson-loading-orbit" /><i className="lesson-loading-inner-ring" />
        <BookOpen size={46} strokeWidth={1.35} />
        <span>学</span>
      </div>
      <div className="lesson-loading-copy">
        <span className="lesson-loading-eyebrow">THIÊN LỘ · LĨNH HỘI</span>
        <h2>{title || "Chuẩn bị bài học"}</h2>
        <p className="lesson-loading-status" role="status"><LoaderCircle size={17} aria-hidden="true" />{restoring ? "Đang mở lại phần lĩnh hội…" : "Đang tải nội dung bài học…"}</p>
        <p className="lesson-loading-description">{restoring ? "Mở nội dung và vị trí đọc đã lưu để bạn tiếp tục." : "Học quyển sẽ mở ngay khi nội dung sẵn sàng."}</p>
      </div>
      <div className="lesson-loading-preview" aria-hidden="true">
        <div><span /><span /><span /></div>
        <div><span /><span /><span /></div>
      </div>
    </div>
    <footer className="lesson-loading-footer"><span>Học từng bước · Vững từng chặng</span><span>HANZI.OS</span></footer>
  </section>;
}
