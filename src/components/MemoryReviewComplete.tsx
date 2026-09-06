import { Link } from "react-router";

type MemoryReviewCompleteProps = {
  independent: number;
  needsReview: number;
  nextReview: Date | null;
  onReviewWeak?: () => void;
  pending?: number;
  total: number;
  withHint: number;
};

const formatNextReview = (date: Date | null) => date
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date)
  : "Chưa có lịch mới";

export function MemoryReviewComplete({
  independent,
  needsReview,
  nextReview,
  onReviewWeak,
  pending = 0,
  total,
  withHint,
}: MemoryReviewCompleteProps) {
  return (
    <div className="memory-experience memory-completion" role="status" aria-live="polite">
      <div className="memory-completion-sigil" aria-hidden="true">✓</div>
      <span className="memory-completion-code">MEM-04 · KẾT TRẬN</span>
      <h1>Kết trận hoàn tất</h1>
      <p><strong>{total}/{total}</strong> thẻ đã xử lý</p>

      <section className="memory-completion-stats" aria-label="Kết quả tự đánh giá của phiên">
        <div className="independent"><i aria-hidden="true">✓</i><strong>{independent}</strong><span>tự nhớ</span></div>
        <div className="hint"><i aria-hidden="true">?</i><strong>{withHint}</strong><span>có gợi ý</span></div>
        <div className="weak"><i aria-hidden="true">◎</i><strong>{needsReview}</strong><span>cần ôn lại</span></div>
      </section>

      <section className="memory-save-status">
        <div><i className="memory-status-symbol" aria-hidden="true">印</i><span>{pending ? `${pending} đánh giá đang chờ đồng bộ` : "Đã lưu an toàn"}</span></div>
        <div><i className="memory-status-symbol" aria-hidden="true">历</i><span>Lần ôn tiếp theo<strong>{formatNextReview(nextReview)}</strong></span></div>
      </section>

      <div className="memory-completion-actions">
        <Link className="memory-complete-primary" to="/path" viewTransition>Về Thiên Lộ</Link>
        {onReviewWeak ? (
          <button type="button" onClick={onReviewWeak}>↻ Ôn tiếp thẻ yếu</button>
        ) : needsReview ? (
          <Link to="/mistakes">↻ Ôn tiếp thẻ yếu</Link>
        ) : (
          <button type="button" disabled>↻ Không có thẻ yếu</button>
        )}
      </div>
      <small>Tự đánh giá dùng để xếp lịch FSRS, không tự tạo bằng chứng thành thạo.</small>
    </div>
  );
}
