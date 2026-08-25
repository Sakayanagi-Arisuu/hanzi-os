import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
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
      title="Tra chữ"
      eyebrow="TRA NHANH"
      className="reader-word-dialog"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      {entry && (
        <div className="reader-word-entry" aria-busy={entry.lookupStatus === "loading"}>
          <div className="reader-word-glyph">
            <strong lang="zh-Hans">{entry.simplified}</strong>
            {entry.traditional && entry.traditional !== entry.simplified && (
              <span lang="zh-Hant">Phồn thể · {entry.traditional}</span>
            )}
          </div>
          <div className="reader-word-meaning">
            <p>{entry.pinyin ?? (entry.lookupStatus === "loading"
              ? "Đang tra Pinyin…"
              : "Chưa có Pinyin")}</p>
            <small>{entry.partOfSpeechVi}</small>
            <strong>{entry.contextualMeaningVi}</strong>
            {entry.otherMeaningsVi.length > 0 && (
              <details className="reader-word-other-meanings">
                <summary>
                  Các nghĩa khác <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <ul>{entry.otherMeaningsVi.map((meaning) => <li key={meaning}>{meaning}</li>)}</ul>
              </details>
            )}
          </div>
          <div className="reader-word-actions">
            <button type="button" className="reader-button reader-button--quiet" onClick={() => onSpeak(entry.simplified)}>
              <Volume2 size={18} aria-hidden="true" /> Nghe chữ
            </button>
            <button
              type="button"
              className="reader-button reader-button--primary"
              aria-pressed={saved}
              disabled={entry.lookupStatus === "loading"}
              onClick={() => onToggleSave(entry)}
            >
              {saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
              {saved ? "Đã lưu vào Sổ Từ" : "Lưu vào Sổ Từ"}
            </button>
          </div>
          <Link className="reader-dictionary-link" to={`/dictionary?q=${encodeURIComponent(entry.simplified)}`}>
            Xem thêm trong Tàng Tự Khố <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      )}
    </ReaderDialog>
  );
}
