import { BrainCircuit } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";
import "./MistakesPage.css";

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
    <h1>Đang mở Nghịch Cảnh Lục</h1>
    <p>Đang chuẩn bị lỗi cần luyện tiếp.</p>
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
