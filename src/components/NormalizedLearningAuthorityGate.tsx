import { BrainCircuit, RefreshCw, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import type {
  NormalizedLearningProjectionPhase,
  NormalizedLearningProjectionRuntimeReason,
} from "../store/NormalizedLearningProjectionStore";

const messageForReason = (
  reason: NormalizedLearningProjectionRuntimeReason | null,
) => {
  if (reason === "content-unavailable") {
    return "Kho bài học chưa được phát hành trên phiên bản web này. Người vận hành cần mở bản học đã kiểm duyệt; thử lại hoặc đăng nhập lại chưa thể khắc phục. Tiến độ của bạn vẫn được giữ nguyên.";
  }
  if (reason === "no-released-enrollment") {
    return "Tài khoản chưa được nối với lộ trình đã phát hành. Tiến độ trên máy vẫn được giữ nguyên.";
  }
  if (reason === "authentication-required" || reason === "owner-scope-mismatch") {
    return "Quyền sở hữu kho học đã thay đổi. Hãy chờ hệ thống xác nhận đúng tài khoản trước khi tiếp tục.";
  }
  if (reason === "reset-mismatch") {
    return "Tiến độ vừa được làm mới. Hãy tải lại để tiếp tục với trạng thái mới nhất.";
  }
  return "Chưa thể tải trạng thái học mới nhất. Hãy thử lại; tiến độ trên máy vẫn được bảo toàn.";
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
    <div className="lesson-state-screen learning-authority-gate" role="status" aria-live="polite">
      {loading ? <BrainCircuit size={44} /> : <ShieldAlert size={44} />}
      <h1>{loading ? "Đang khôi phục hành trình" : "Chưa thể mở kho học"}</h1>
      <p>{loading
        ? "Hệ thống đang nối tài khoản với tiến độ mới nhất."
        : messageForReason(reason)}</p>
      {!loading && reason !== "content-unavailable" && (
        <button className="primary-button" type="button" onClick={refresh}>
          <RefreshCw size={17} /> Thử xác nhận lại
        </button>
      )}
      <Link className="secondary-button" to="/profile">Kiểm tra tài khoản</Link>
    </div>
  );
}
