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
  onSave,
}: {
  entry: ReaderReferenceEntry | null;
  open: boolean;
  saved: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onSave: (lexemeId: string) => void;
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
            <p>{entry.pinyin}</p>
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
            {entry.lexemeId ? (
              <button
                type="button"
                className="reader-button reader-button--primary"
                disabled={saved}
                onClick={() => onSave(entry.lexemeId!)}
              >
                {saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
                {saved ? "Đã lưu để ôn" : "Lưu để ôn"}
              </button>
            ) : (
              <p className="reader-reference-note">Mục giải nghĩa theo ngữ cảnh; chưa tạo thẻ ôn cốt lõi.</p>
            )}
          </div>
          <Link className="reader-dictionary-link" to={`/dictionary?q=${encodeURIComponent(entry.simplified)}`}>
            Mở trong Tàng Tự Khố <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      )}
    </ReaderDialog>
  );
}
