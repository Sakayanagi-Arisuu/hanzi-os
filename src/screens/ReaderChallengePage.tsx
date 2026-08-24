import { BookOpenText } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";

const AuthenticatedReaderPage = lazy(async () => ({
  default: (await import("./AuthenticatedReaderPage")).AuthenticatedReaderPage,
}));

const LocalReaderPage = lazy(async () => ({
  default: (await import("./LocalReaderPage")).LocalReaderPage,
}));

const pending = (
  <div className="lesson-state-screen" role="status" aria-live="polite">
    <BookOpenText size={44} aria-hidden="true" />
    <h1>Đang mở Khảo luyện đọc cũ</h1>
    <p>Phiên câu hỏi lịch sử đang được khôi phục mà không ảnh hưởng tới Thư Khố.</p>
  </div>
);

export function ReaderChallengePage() {
  const { sync } = useLearning();
  if (sync.session === null) return pending;
  return (
    <Suspense fallback={pending}>
      {sync.session.authenticated ? <AuthenticatedReaderPage /> : <LocalReaderPage />}
    </Suspense>
  );
}
