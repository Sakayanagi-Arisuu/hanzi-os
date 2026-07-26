import { BrainCircuit } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";

const AuthenticatedAssessmentPage = lazy(async () => ({
  default: (await import("./AuthenticatedAssessmentPage"))
    .AuthenticatedAssessmentPage,
}));

const LocalAssessmentPage = lazy(async () => ({
  default: (await import("./LocalAssessmentPage")).LocalAssessmentPage,
}));

const pending = (
  <div className="lesson-state-screen" role="status" aria-live="polite">
    <BrainCircuit size={44} />
    <h1>Đang xác nhận tài khoản khảo nghiệm</h1>
    <p>Danh tính phải được xác định trước khi chọn screening local hoặc server.</p>
  </div>
);

export function AssessmentPage() {
  const { sync } = useLearning();
  if (sync.session === null) return pending;
  return (
    <Suspense fallback={pending}>
      {sync.session.authenticated
        ? <AuthenticatedAssessmentPage />
        : <LocalAssessmentPage />}
    </Suspense>
  );
}
