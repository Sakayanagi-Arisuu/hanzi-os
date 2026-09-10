import { BrainCircuit } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { useAudioEngine } from "../audio/AudioEngineProvider";
import { useLearning } from "../store/LearningStore";
import { LocalReviewPage } from "./LocalReviewPage";
import "./MemoryJadeLayout.css";

const AuthenticatedReviewPage = lazy(async () => ({
  default: (await import("./AuthenticatedReviewPage"))
    .AuthenticatedReviewPage,
}));

const pending = (
  <div className="lesson-state-screen" role="status" aria-live="polite">
    <BrainCircuit size={44} />
    <h1>Đang kết nối Ký Ức Trận</h1>
    <p>Hệ thống đang chọn đúng hàng đợi trên thiết bị hoặc từ tài khoản đã xác thực.</p>
  </div>
);

export function ReviewPage() {
  const { sync } = useLearning();
  const { prepareMandarinSpeech } = useAudioEngine();

  useEffect(() => {
    prepareMandarinSpeech();
  }, [prepareMandarinSpeech]);

  if (sync.session === null) return pending;
  if (!sync.session.authenticated) return <LocalReviewPage />;
  return (
    <Suspense fallback={pending}>
      <AuthenticatedReviewPage />
    </Suspense>
  );
}
