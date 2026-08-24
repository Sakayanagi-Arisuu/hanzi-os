import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Volume2,
} from "lucide-react";
import type { RefObject } from "react";
import { Link } from "react-router";
import type { ReaderReferenceEntry } from "./readerLexicon";
import { ReaderDialog } from "./ReaderDialog";

export function ReaderWordDialog({
  entry,
  open,
  saved,
  returnFocusRef,
  onClose,
  onSpeak,
  onToggleSave,
}: {
  entry: ReaderReferenceEntry | null;
  open: boolean;
  saved: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onToggleSave: (entry: ReaderReferenceEntry) => void;
}) {
  return (
    <ReaderDialog
      open={open && Boolean(entry)}
      title={entry?.simplified ?? "Tra từ"}
      eyebrow="TRA TỪ TRONG TRANG"
      className="reader-word-dialog"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      {entry && (
        <div className="reader-word-entry">
          <div className="reader-word-glyph">
            <strong lang="zh-Hans">{entry.simplified}</strong>
            {entry.traditional && entry.traditional !== entry.simplified && (
              <span lang="zh-Hant">Phồn thể · {entry.traditional}</span>
            )}
          </div>
          <div className="reader-word-meaning">
            <p>{entry.pinyin ?? "Đang đối chiếu Pinyin trong Tàng Tự Khố"}</p>
            <small>{entry.partOfSpeechVi}</small>
            <strong>{entry.contextualMeaningVi}</strong>
            {entry.otherMeaningsVi.length > 0 && (
              <details>
                <summary>Các nghĩa khác</summary>
                <ul>{entry.otherMeaningsVi.map((meaning) => <li key={meaning}>{meaning}</li>)}</ul>
              </details>
            )}
          </div>
          <div className="reader-word-actions">
            <button type="button" className="reader-button reader-button--quiet" onClick={() => onSpeak(entry.simplified)}>
              <Volume2 size={18} aria-hidden="true" /> Nghe từ
            </button>
            <button
              type="button"
              className="reader-button reader-button--primary"
              aria-pressed={saved}
              onClick={() => onToggleSave(entry)}
            >
              {saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
              {entry.lexemeId
                ? (saved ? "Đã lưu để ôn" : "Lưu để ôn")
                : (saved ? "Đã lưu vào Sổ Từ" : "Lưu vào Sổ Từ")}
            </button>
          </div>
          {!entry.lexemeId && (
            <p className="reader-reference-note">Mục tham chiếu được lưu riêng trong Vạn Quyển Các; không tự tạo mastery hay thẻ FSRS.</p>
          )}
          <Link className="reader-dictionary-link" to={`/dictionary?q=${encodeURIComponent(entry.simplified)}`}>
            Mở trong Tàng Tự Khố <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      )}
    </ReaderDialog>
  );
}
