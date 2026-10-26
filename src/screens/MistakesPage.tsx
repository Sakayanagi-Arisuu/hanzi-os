import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { CURRENT_CONTENT_VERSION } from "../content/currentContentIdentity";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import "./QueueRoute.css";
import { BrainCircuit } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLearning } from "../store/LearningStore";
import "./MistakesPage.css";
import "./RemediationSessionLayout.css";
import "./RemediationCelestial.css";

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

function MistakesPageContent() {
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const accountKey = sync.session?.authenticated ? sync.session.accountKey : null;
  const scope = accountKey && authority.ownerGeneration?.ownerKey === accountKey
    && authority.resetEpoch !== null ? JSON.stringify([
      accountKey, authority.ownerGeneration.generation, authority.resetEpoch,
      authority.projection?.cursor, CURRENT_CONTENT_VERSION,
    ]) : null;
  if (sync.session === null) return pending;
  if (sync.session.authenticated && !scope) {
    return <NormalizedLearningAuthorityGate phase={authority.phase} reason={authority.reason} refresh={authority.refresh} />;
  }
  return (
    <Suspense fallback={pending}>
      {sync.session.authenticated
        ? <AuthenticatedMistakesPage key={scope ?? "pending"} scope={scope} resetEpoch={authority.resetEpoch} />
        : <LocalMistakesPage />}
    </Suspense>
  );
}

export function MistakesPage() {
  return <div className="queue-route"><MistakesPageContent /></div>;
}
