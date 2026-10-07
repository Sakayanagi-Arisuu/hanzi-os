import { useCallback, useEffect, useState } from "react";
import { listLessonResumes } from "../sync/indexedDb";
import { resolveLearningResumeOwnerScope } from "../sync/learningResumeStore";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";

export async function readPlacementContext(ownerKey: string) {
  const scope = await resolveLearningResumeOwnerScope(ownerKey);
  const records = (await listLessonResumes(scope)).filter((record) => record.entryKey.startsWith("lesson:" ) || record.entryKey.startsWith("lesson-reading:"));
  const observations = records.map((record) => {
    const value = record.value as Record<string, unknown> | null;
    return [record.entryKey, value?.index ?? null, value?.blockIndex ?? null, value?.drafts ?? null, value?.answers ?? null];
  }).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return { snapshot: JSON.stringify([scope.resetEpoch, observations]), hasProgress: records.length > 0 };
}

export function usePlacementContext() {
  const { state, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const [local, setLocal] = useState<{ owner: string; snapshot: string; hasProgress: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!sync.ownerKey) return;
    let cancelled = false;
    let sequence = 0;
    const refresh = async () => {
      const ticket = ++sequence;
      try {
        const context = await readPlacementContext(sync.ownerKey);
        if (!cancelled && ticket === sequence) { setLocal({ owner: sync.ownerKey, ...context }); setFailed(false); }
      } catch { if (!cancelled && ticket === sequence) { setLocal(null); setFailed(true); } }
    };
    const wake = () => { void refresh(); };
    wake();
    window.addEventListener("focus", wake);
    window.addEventListener("hanzi-reading-saved", wake);
    return () => { cancelled = true; window.removeEventListener("focus", wake); window.removeEventListener("hanzi-reading-saved", wake); };
  }, [sync.ownerKey, state.evidence, state.completedLessons, normalized.resetEpoch, revision]);
  const ready = local?.owner === sync.ownerKey && !failed;
  // Account progress may arrive separately from the compatibility snapshot.
  const serverProgress = (normalized.authoritativeProgress?.completedCount ?? 0) > 0
    || (normalized.projection?.activeLessonSessions.length ?? 0) > 0
    || (normalized.projection?.submittedLessons.length ?? 0) > 0;
  const serverSnapshot = JSON.stringify([normalized.resetEpoch, normalized.projection?.activeLessonSessions ?? [], normalized.projection?.submittedLessons ?? []]);
  return { ready, failed, retry, localSnapshot: ready ? local.snapshot : null, snapshot: ready ? JSON.stringify([local.snapshot, serverSnapshot]) : null,
    hasProgress: Boolean(local?.hasProgress || serverProgress), preservePath: (sync.session?.authenticated === true && normalized.phase !== "ready") || Boolean(local?.hasProgress || serverProgress) };
}
