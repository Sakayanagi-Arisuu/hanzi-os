import { BrainCircuit } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";

const AuthenticatedMistakesPage = lazy(async () => ({
  default: (await import("./AuthenticatedMistakesPage"))
    .AuthenticatedMistakesPage,
}));

const LocalMistakesPage = lazy(async () => ({
  default: (await import("./LocalMistakesPage")).LocalMistakesPage,
}));

const pending = (
  <div className="lesson-state-screen" role="status" aria-live="polite">
    <BrainCircuit size={44} />
    <h1>Đang xác nhận tài khoản sửa lỗi</h1>
    <p>
      Danh tính phải được xác định trước khi chọn practice local hoặc
      remediation có thẩm quyền từ máy chủ.
    </p>
  </div>
);

export function MistakesPage() {
  const { sync } = useLearning();
  if (sync.session === null) return pending;
  return (
    <Suspense fallback={pending}>
      {sync.session.authenticated
        ? <AuthenticatedMistakesPage />
        : <LocalMistakesPage />}
    </Suspense>
  );
}
