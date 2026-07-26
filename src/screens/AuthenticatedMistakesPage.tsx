import { LockKeyhole, Map } from "lucide-react";
import { Link } from "react-router";

/**
 * Authenticated remediation deliberately fails closed until a server-issued
 * mistake form and append-only attempt projection exist. This surface must not
 * import the local answer-bearing mistake aggregate.
 */
export function AuthenticatedMistakesPage() {
  return (
    <div
      className="lesson-state-screen"
      role="status"
      aria-live="polite"
    >
      <LockKeyhole size={44} />
      <h1>Nghịch Cảnh có thẩm quyền chưa khả dụng</h1>
      <p>
        Tài khoản sẽ không dùng đáp án, chuỗi sửa lỗi, XP hoặc trạng thái đóng
        lỗi do trình duyệt tự khai. Tính năng này chỉ mở khi máy chủ có thể phát
        hành và chấm một phiên remediation đúng content version.
      </p>
      <Link className="primary-button" to="/path">
        <Map size={17} /> Trở về Thiên Lộ
      </Link>
    </div>
  );
}
