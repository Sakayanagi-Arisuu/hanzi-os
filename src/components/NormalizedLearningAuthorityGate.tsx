import { BrainCircuit, RefreshCw, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import type {
  NormalizedLearningProjectionPhase,
  NormalizedLearningProjectionRuntimeReason,
} from "../store/NormalizedLearningProjectionStore";

const messageForReason = (
  reason: NormalizedLearningProjectionRuntimeReason | null,
) => {
  if (reason === "content-unavailable" || reason === "no-released-enrollment") {
    return "Gói học hiện tại chưa có enrollment gắn với nội dung đã được duyệt và phát hành. Dữ liệu cục bộ không được dùng để mở bài thay thế.";
  }
  if (reason === "authentication-required" || reason === "owner-scope-mismatch") {
    return "Quyền sở hữu kho học đã thay đổi. Hãy chờ hệ thống xác nhận đúng tài khoản trước khi tiếp tục.";
  }
  if (reason === "reset-mismatch") {
    return "Mốc đặt lại tiến độ vừa thay đổi. Cache cũ đã bị loại và không thể dùng để mở bài.";
  }
  return "Chưa thể xác nhận projection học tập có thẩm quyền. Tiến độ, XP hoặc completion do trình duyệt giữ sẽ không được dùng để mở khóa.";
};

export function NormalizedLearningAuthorityGate({
  phase,
  reason,
  refresh,
}: {
  phase: NormalizedLearningProjectionPhase;
  reason: NormalizedLearningProjectionRuntimeReason | null;
  refresh: () => void;
}) {
  const loading = phase === "loading";
  return (
    <div className="lesson-state-screen" role="status" aria-live="polite">
      {loading ? <BrainCircuit size={44} /> : <ShieldAlert size={44} />}
      <h1>{loading ? "Đang xác nhận tiến độ máy chủ" : "Chưa thể cấp quyền học có thẩm quyền"}</h1>
      <p>{loading
        ? "Hệ thống đang đối chiếu tài khoản, owner generation và mốc đặt lại trước khi hiển thị lộ trình."
        : messageForReason(reason)}</p>
      {!loading && (
        <button className="primary-button" type="button" onClick={refresh}>
          <RefreshCw size={17} /> Thử xác nhận lại
        </button>
      )}
      <Link className="secondary-button" to="/profile">Kiểm tra tài khoản</Link>
    </div>
  );
}
