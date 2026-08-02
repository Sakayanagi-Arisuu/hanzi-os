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
    <h1>Đang mở Khảo Nghiệm Căn Cơ</h1>
    <p>Hệ thống đang chọn đúng khảo nghiệm trên thiết bị hoặc từ tài khoản đã xác thực.</p>
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
