import { Check, LibraryBig, LockKeyhole, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { PronunciationLessonOption } from "../learning/pronunciationPractice";

const FOCUSABLE = "button:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function PronunciationLessonLibrary({
  open,
  options,
  selectedLessonId,
  onClose,
  onSelect,
}: {
  open: boolean;
  options: readonly PronunciationLessonOption[];
  selectedLessonId: string;
  onClose: () => void;
  onSelect: (lessonId: string) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(options.length / 6));
  const currentPage = Math.min(page, pageCount - 1);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    panelRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="pronunciation-library-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className="pronunciation-library-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pronunciation-library-title"
        tabIndex={-1}
        data-testid="pronunciation-lesson-library"
      >
        <header>
          <span aria-hidden="true"><LibraryBig /></span>
          <div>
            <p>VẠN ÂM ĐIỆN · KHO BÀI LUYỆN</p>
            <h2 id="pronunciation-library-title">Luyện nói theo Thiên Lộ</h2>
            <small>Các bài đã mở trên Thiên Lộ có câu luyện phù hợp xuất hiện tại đây.</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng kho bài luyện"><X /></button>
        </header>

        {options.length > 0 ? (
          <div className="pronunciation-library-list">
            {options.slice(currentPage * 6, currentPage * 6 + 6).map((option, index) => {
              const selected = option.id === selectedLessonId;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={selected ? "is-selected" : ""}
                  onClick={() => onSelect(option.id)}
                  aria-current={selected ? "true" : undefined}
                >
                  <span>{String(currentPage * 6 + index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{option.title}</strong>
                    <small>{option.chineseTitle} · {option.challengeCount} câu luyện</small>
                  </div>
                  {selected ? <Check aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pronunciation-library-empty">
            <LockKeyhole aria-hidden="true" />
            <strong>Chưa có bài đủ điều kiện luyện đọc</strong>
            <span>Vượt một bài trên Thiên Lộ để mở câu luyện tương ứng tại đây.</span>
            <Link to="/path">Mở Thiên Lộ</Link>
          </div>
        )}
        {pageCount > 1 && <nav className="jade-library-pages" aria-label="Trang kho bài luyện">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Trang trước</button>
          <span aria-live="polite">{currentPage + 1} / {pageCount} · {options.length} bài</span>
          <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Trang sau</button>
        </nav>}
      </section>
    </div>
  );
}
