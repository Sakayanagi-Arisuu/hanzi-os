import {
  ArrowRight,
  Bookmark,
  Trash2,
  Volume2,
} from "lucide-react";
import type { RefObject } from "react";
import { Link } from "react-router";
import type { ReaderSavedEntry } from "./readerProgress";
import { ReaderDialog } from "./ReaderDialog";

export function ReaderSavedWordsDialog({
  entries,
  open,
  returnFocusRef,
  onClose,
  onSpeak,
  onRemove,
}: {
  entries: ReaderSavedEntry[];
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onRemove: (entryId: string) => void;
}) {
  return (
    <ReaderDialog
      open={open}
      title="Sổ Từ Vạn Quyển"
      eyebrow={`${entries.length} MỤC TRA THEO NGỮ CẢNH`}
      className="reader-saved-words-dialog"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
      <div className="reader-saved-words">
        <p>Từ cốt lõi vẫn đi vào khu Ôn và FSRS. Những chữ ngoài giáo trình được giữ ở đây, không tự tính mastery.</p>
        {entries.length > 0 ? (
          <ul>
            {entries.map((entry) => (
              <li key={entry.entryId}>
                <span className="reader-saved-words__glyph" lang="zh-Hans">{entry.simplified}</span>
                <span>
                  <strong>{entry.pinyin ?? "Chưa có Pinyin cốt lõi"}</strong>
                  <small>{entry.contextualMeaningVi}</small>
                </span>
                <button type="button" onClick={() => onSpeak(entry.simplified)} aria-label={`Nghe ${entry.simplified}`}>
                  <Volume2 size={18} aria-hidden="true" />
                </button>
                <Link to={`/dictionary?q=${encodeURIComponent(entry.simplified)}`} aria-label={`Tra sâu ${entry.simplified}`}>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <button type="button" onClick={() => onRemove(entry.entryId)} aria-label={`Bỏ lưu ${entry.simplified}`}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="reader-saved-words__empty">
            <Bookmark size={28} aria-hidden="true" />
            <strong>Sổ Từ đang trống</strong>
            <span>Mở một chương rồi chạm chữ Hán bất kỳ để tra và lưu.</span>
          </div>
        )}
        <Link className="reader-button reader-button--quiet reader-saved-words__review" to="/review">
          Mở khu Ôn từ cốt lõi <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </ReaderDialog>
  );
}
