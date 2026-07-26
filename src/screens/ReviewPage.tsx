import { BrainCircuit } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";
import { LocalReviewPage } from "./LocalReviewPage";

const AuthenticatedReviewPage = lazy(async () => ({
  default: (await import("./AuthenticatedReviewPage"))
    .AuthenticatedReviewPage,
}));

const pending = (
  <div className="lesson-state-screen" role="status" aria-live="polite">
    <BrainCircuit size={44} />
    <h1>Đang xác nhận tài khoản ôn tập</h1>
    <p>Danh tính phải được xác định trước khi chọn hàng đợi local hoặc hàng đợi có thẩm quyền từ máy chủ.</p>
  </div>
);

export function ReviewPage() {
  const { sync } = useLearning();
  if (sync.session === null) return pending;
  if (!sync.session.authenticated) return <LocalReviewPage />;
  return (
    <Suspense fallback={pending}>
      <AuthenticatedReviewPage />
    </Suspense>
  );
}
