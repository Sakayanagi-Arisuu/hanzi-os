import { BookOpenText } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";

const AuthenticatedReaderPage = lazy(async () => ({
  default: (await import("./AuthenticatedReaderPage"))
    .AuthenticatedReaderPage,
}));

const LocalReaderPage = lazy(async () => ({
  default: (await import("./LocalReaderPage")).LocalReaderPage,
}));

const pending = (
  <div className="lesson-state-screen" role="status" aria-live="polite">
    <BookOpenText size={44} />
    <h1>Đang xác nhận tài khoản đọc</h1>
    <p>Danh tính phải được xác định trước khi chọn Reader local hoặc server.</p>
  </div>
);

export function ReaderPage() {
  const { sync } = useLearning();
  if (sync.session === null) return pending;
  return (
    <Suspense fallback={pending}>
      {sync.session.authenticated
        ? <AuthenticatedReaderPage />
        : <LocalReaderPage />}
    </Suspense>
  );
}
